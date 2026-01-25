"""
Passkey Service
Business logic for WebAuthn / FIDO2 passwordless authentication.
Handles registration and authentication flows with challenge management.
"""

import base64
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from uuid import UUID
import secrets

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.passkey import PasskeyCredential, PasskeyChallenge
from app.models.user import User
from app.repositories.passkey_repository import PasskeyCredentialRepository, PasskeyChallengeRepository
from app.core.exceptions import HTTPException


class PasskeyService:
    """
    Service for WebAuthn passwordless authentication.
    Implements FIDO2 protocol for secure credential-less login.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.credential_repo = PasskeyCredentialRepository(db)
        self.challenge_repo = PasskeyChallengeRepository(db)
        self.challenge_timeout = 600  # 10 minutes
    
    async def initiate_registration(self, user_id: UUID, organization_id: UUID) -> Dict[str, Any]:
        """
        Start WebAuthn registration flow.
        Generates challenge for client to sign.
        
        Returns:
            Dict with challenge, user info, and RP (Relying Party) config
        """
        # Generate challenge (32 bytes random)
        challenge_bytes = secrets.token_bytes(32)
        challenge_b64 = base64.b64encode(challenge_bytes).decode("utf-8")
        
        # Create challenge record
        expires_at = datetime.utcnow() + timedelta(seconds=self.challenge_timeout)
        challenge_obj = await self.challenge_repo.create({
            "user_id": user_id,
            "organization_id": organization_id,
            "challenge": challenge_b64,
            "challenge_type": "registration",
            "expires_at": expires_at,
        })
        
        return {
            "challenge": challenge_b64,
            "challenge_id": str(challenge_obj.id),
            "rp": {
                "name": "PyTake",
                "id": "pytake.com",
            },
            "user": {
                "id": base64.b64encode(user_id.bytes).decode("utf-8"),
                "name": f"user_{user_id}",
                "displayName": f"User {user_id}",
            },
            "pubKeyCredParams": [
                {"alg": -7, "type": "public-key"},  # ES256
                {"alg": -257, "type": "public-key"},  # RS256
            ],
            "attestation": "direct",
            "timeout": self.challenge_timeout * 1000,
        }
    
    async def complete_registration(
        self,
        user_id: UUID,
        organization_id: UUID,
        challenge_id: UUID,
        credential_id_b64: str,
        public_key_b64: str,
        transports: Optional[str],
        device_name: str,
        attestation_object: Optional[str] = None,
    ) -> PasskeyCredential:
        """
        Complete WebAuthn registration.
        Verifies challenge, stores public key.
        
        Args:
            user_id: User performing registration
            organization_id: Organization context
            challenge_id: Challenge UUID from initiate_registration
            credential_id_b64: Credential ID from authenticator
            public_key_b64: Public key from authenticator
            transports: Supported transports (usb,nfc,ble,internal)
            device_name: User-friendly device name
            attestation_object: Optional attestation data
        
        Returns:
            PasskeyCredential object
        """
        # Verify challenge exists and hasn't expired
        from sqlalchemy import select, and_
        stmt = select(PasskeyChallenge).where(
            and_(
                PasskeyChallenge.id == challenge_id,
                PasskeyChallenge.user_id == user_id,
                PasskeyChallenge.organization_id == organization_id,
                PasskeyChallenge.challenge_type == "registration",
                PasskeyChallenge.expires_at > datetime.utcnow(),
            )
        )
        result = await self.db.execute(stmt)
        challenge = result.scalars().first()
        
        if not challenge:
            raise HTTPException(status_code=400, detail="Invalid or expired challenge")
        
        # Mark challenge as used
        await self.challenge_repo.mark_used(challenge_id, organization_id)
        
        # Store credential
        credential = await self.credential_repo.create({
            "user_id": user_id,
            "organization_id": organization_id,
            "credential_id": credential_id_b64,
            "public_key": public_key_b64,
            "counter": 0,
            "transports": transports,
            "device_name": device_name,
            "is_primary": False,  # User can set as primary later
        })
        
        return credential
    
    async def initiate_authentication(self, organization_id: UUID) -> Dict[str, Any]:
        """
        Start WebAuthn authentication (login) flow.
        Generates challenge for client.
        
        Returns:
            Dict with challenge and RP config
        """
        challenge_bytes = secrets.token_bytes(32)
        challenge_b64 = base64.b64encode(challenge_bytes).decode("utf-8")
        
        expires_at = datetime.utcnow() + timedelta(seconds=self.challenge_timeout)
        challenge_obj = await self.challenge_repo.create({
            "user_id": None,  # Unknown until authenticated
            "organization_id": organization_id,
            "challenge": challenge_b64,
            "challenge_type": "authentication",
            "expires_at": expires_at,
        })
        
        return {
            "challenge": challenge_b64,
            "challenge_id": str(challenge_obj.id),
            "rp": {
                "id": "pytake.com",
            },
            "timeout": self.challenge_timeout * 1000,
            "userVerification": "preferred",
        }
    
    async def complete_authentication(
        self,
        organization_id: UUID,
        credential_id_b64: str,
        counter: int,
        signature: Optional[str] = None,
    ) -> tuple[PasskeyCredential, User]:
        """
        Complete WebAuthn authentication.
        Verifies credential exists, counter incremented (replay prevention).
        
        Returns:
            Tuple of (PasskeyCredential, User)
        """
        # Find credential by credential_id
        credential = await self.credential_repo.get_by_credential_id(credential_id_b64, organization_id)
        
        if not credential or credential.deleted_at:
            raise HTTPException(status_code=400, detail="Invalid credential")
        
        # Verify counter increased (replay prevention)
        if counter <= credential.counter:
            raise HTTPException(status_code=400, detail="Counter validation failed - possible replay attack")
        
        # Get user
        stmt = select(User).where(User.id == credential.user_id)
        result = await self.db.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        
        # Update counter and last_used_at
        await self.credential_repo.increment_counter(credential_id_b64, organization_id)
        
        return credential, user
    
    async def list_credentials(self, user_id: UUID, organization_id: UUID) -> List[Dict[str, Any]]:
        """List all passkeys for user."""
        credentials = await self.credential_repo.get_by_user(user_id, organization_id)
        
        return [
            {
                "id": str(c.id),
                "device_name": c.device_name,
                "transports": c.transports,
                "is_primary": c.is_primary,
                "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None,
                "created_at": c.created_at.isoformat(),
            }
            for c in credentials
        ]
    
    async def rename_credential(
        self,
        credential_id: UUID,
        user_id: UUID,
        organization_id: UUID,
        new_name: str,
    ) -> PasskeyCredential:
        """Rename a passkey (device name)."""
        credential = await self.credential_repo.get_by_id(credential_id, organization_id)
        
        if not credential or credential.user_id != user_id:
            raise HTTPException(status_code=404, detail="Credential not found")
        
        return await self.credential_repo.update(
            credential_id,
            organization_id,
            {"device_name": new_name}
        )
    
    async def delete_credential(
        self,
        credential_id: UUID,
        user_id: UUID,
        organization_id: UUID,
    ) -> bool:
        """Delete a passkey."""
        credential = await self.credential_repo.get_by_id(credential_id, organization_id)
        
        if not credential or credential.user_id != user_id:
            raise HTTPException(status_code=404, detail="Credential not found")
        
        return await self.credential_repo.delete(credential_id, organization_id)
    
    async def set_primary_credential(
        self,
        credential_id: UUID,
        user_id: UUID,
        organization_id: UUID,
    ) -> PasskeyCredential:
        """Set credential as primary passkey."""
        # Get all credentials for user
        credentials = await self.credential_repo.get_by_user(user_id, organization_id)
        
        # Unset all as primary
        for cred in credentials:
            if cred.is_primary:
                await self.credential_repo.update(cred.id, organization_id, {"is_primary": False})
        
        # Set new one as primary
        return await self.credential_repo.update(
            credential_id,
            organization_id,
            {"is_primary": True}
        )
    
    async def cleanup_expired_challenges(self, organization_id: UUID) -> int:
        """Clean up expired challenges (call periodically)."""
        return await self.challenge_repo.cleanup_expired(organization_id)
