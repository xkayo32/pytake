"""
MFA Service
Handles Multi-Factor Authentication (TOTP + SMS) operations.
"""

import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from uuid import UUID

import pyotp
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import MFAMethod, MFAChallenge, MFABackupCode, User
from app.repositories.mfa_repository import (
    MFAMethodRepository,
    MFAChallengeRepository,
    MFABackupCodeRepository,
)
from app.repositories.user import UserRepository
from app.core.security import encrypt_string, decrypt_string
from app.core.exceptions import BadRequestException, UnauthorizedException, NotFoundException


class MFAService:
    """Service for managing MFA operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.mfa_method_repo = MFAMethodRepository(db)
        self.mfa_challenge_repo = MFAChallengeRepository(db)
        self.backup_code_repo = MFABackupCodeRepository(db)
        self.user_repo = UserRepository(db)
    
    async def setup_totp_mfa(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> Tuple[str, str]:
        """
        Initialize TOTP MFA setup for user.
        
        Returns:
            (secret, qr_code_url) - TOTP secret and QR code URL for scanning
        """
        # Generate TOTP secret
        secret = pyotp.random_base32()
        
        # Create user for QR code
        user = await self.user_repo.get_by_id(user_id, organization_id)
        if not user:
            raise NotFoundException(f"User {user_id} not found")
        
        # Generate QR code URL
        totp = pyotp.TOTP(secret)
        qr_code_url = totp.provisioning_uri(
            name=user.email,
            issuer_name="PyTake"
        )
        
        # Store unverified method (secret is encrypted)
        encrypted_secret = encrypt_string(secret)
        method = await self.mfa_method_repo.create({
            "user_id": user_id,
            "organization_id": organization_id,
            "method_type": "totp",
            "secret": encrypted_secret,
            "is_verified": False,
            "is_primary": False,
        })
        
        return secret, qr_code_url
    
    async def verify_totp_mfa(
        self,
        organization_id: UUID,
        user_id: UUID,
        code: str,
        set_as_primary: bool = True,
    ) -> bool:
        """
        Verify TOTP code and mark method as verified.
        
        Args:
            code: 6-digit TOTP code
            set_as_primary: If True, set as primary MFA method
        
        Returns:
            True if code is valid and MFA verified
        """
        # Get unverified TOTP method
        methods = await self.mfa_method_repo.get_by_user(user_id, organization_id)
        totp_method = next((m for m in methods if m.method_type == "totp" and not m.is_verified), None)
        
        if not totp_method:
            raise BadRequestException("No TOTP method found to verify")
        
        # Verify code
        decrypted_secret = decrypt_string(totp_method.secret)
        totp = pyotp.TOTP(decrypted_secret)
        
        if not totp.verify(code):
            raise UnauthorizedException("Invalid TOTP code")
        
        # Mark as verified
        await self.mfa_method_repo.update(
            totp_method.id,
            organization_id,
            {
                "is_verified": True,
                "is_primary": set_as_primary,
                "last_used_at": datetime.utcnow(),
            }
        )
        
        # If set as primary, unset other primary methods
        if set_as_primary:
            methods = await self.mfa_method_repo.get_by_user(user_id, organization_id)
            for method in methods:
                if method.id != totp_method.id and method.is_primary:
                    await self.mfa_method_repo.update(
                        method.id,
                        organization_id,
                        {"is_primary": False}
                    )
        
        # Generate backup codes
        await self._generate_backup_codes(user_id, organization_id)
        
        return True
    
    async def setup_sms_mfa(
        self,
        organization_id: UUID,
        user_id: UUID,
        phone_number: str,
    ) -> str:
        """
        Initialize SMS MFA setup for user.
        
        Returns:
            Challenge token for SMS verification
        """
        # Validate phone number format (basic)
        if not phone_number or len(phone_number) < 10:
            raise BadRequestException("Invalid phone number")
        
        # Generate SMS code
        code = "".join(secrets.choice(string.digits) for _ in range(6))
        encrypted_code = encrypt_string(code)
        
        # Create unverified SMS method
        method = await self.mfa_method_repo.create({
            "user_id": user_id,
            "organization_id": organization_id,
            "method_type": "sms",
            "secret": encrypt_string(phone_number),  # Phone number is encrypted
            "is_verified": False,
            "is_primary": False,
        })
        
        # Create challenge
        challenge_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(minutes=5)  # 5 min expiry
        
        challenge = await self.mfa_challenge_repo.create({
            "user_id": user_id,
            "organization_id": organization_id,
            "mfa_method_id": method.id,
            "challenge_token": challenge_token,
            "code": encrypted_code,
            "method_type": "sms",
            "expires_at": expires_at,
            "attempt_count": 0,
            "max_attempts": 3,
            "is_used": False,
        })
        
        # TODO: Send SMS via Twilio or similar
        # await self._send_sms(phone_number, code)
        
        return challenge_token
    
    async def verify_sms_code(
        self,
        organization_id: UUID,
        challenge_token: str,
        code: str,
        set_as_primary: bool = True,
    ) -> bool:
        """
        Verify SMS code and mark method as verified.
        
        Args:
            challenge_token: Challenge token from setup
            code: SMS code sent to user
            set_as_primary: If True, set as primary MFA method
        
        Returns:
            True if code is valid and SMS verified
        """
        # Get challenge
        challenge = await self.mfa_challenge_repo.get_by_token(challenge_token, organization_id)
        if not challenge:
            raise NotFoundException("Invalid challenge token")
        
        # Check expiration
        if challenge.expires_at < datetime.utcnow():
            raise BadRequestException("Challenge expired")
        
        # Check attempts
        if challenge.attempt_count >= challenge.max_attempts:
            raise BadRequestException("Too many failed attempts. Challenge expired.")
        
        # Verify code
        decrypted_code = decrypt_string(challenge.code)
        if code != decrypted_code:
            await self.mfa_challenge_repo.increment_attempt(challenge.id, organization_id)
            raise UnauthorizedException("Invalid SMS code")
        
        # Mark challenge as used
        await self.mfa_challenge_repo.mark_used(challenge.id, organization_id)
        
        # Mark SMS method as verified
        method = await self.mfa_method_repo.get_by_id(challenge.mfa_method_id, organization_id)
        if method:
            await self.mfa_method_repo.update(
                method.id,
                organization_id,
                {
                    "is_verified": True,
                    "is_primary": set_as_primary,
                    "last_used_at": datetime.utcnow(),
                }
            )
            
            # If set as primary, unset other primary methods
            if set_as_primary:
                user_id = method.user_id
                methods = await self.mfa_method_repo.get_by_user(user_id, organization_id)
                for m in methods:
                    if m.id != method.id and m.is_primary:
                        await self.mfa_method_repo.update(
                            m.id,
                            organization_id,
                            {"is_primary": False}
                        )
            
            # Generate backup codes
            await self._generate_backup_codes(method.user_id, organization_id)
        
        return True
    
    async def validate_mfa_challenge(
        self,
        organization_id: UUID,
        user_id: UUID,
        mfa_method_id: UUID,
        code: str,
    ) -> str:
        """
        Validate MFA code (TOTP or SMS) during login.
        
        Returns:
            MFA challenge token if valid (for JWT claim)
        """
        # Get MFA method
        method = await self.mfa_method_repo.get_by_id(mfa_method_id, organization_id)
        if not method or method.user_id != user_id or not method.is_verified:
            raise NotFoundException("MFA method not found")
        
        if method.method_type == "totp":
            # Verify TOTP
            decrypted_secret = decrypt_string(method.secret)
            totp = pyotp.TOTP(decrypted_secret)
            
            if not totp.verify(code):
                raise UnauthorizedException("Invalid TOTP code")
        
        elif method.method_type == "sms":
            # Verify SMS code against active challenge
            # TODO: Implement SMS challenge validation
            raise BadRequestException("SMS validation not yet implemented")
        
        # Update last used time
        await self.mfa_method_repo.update(
            method.id,
            organization_id,
            {"last_used_at": datetime.utcnow()}
        )
        
        # Return MFA challenge token for JWT claim
        mfa_token = secrets.token_urlsafe(32)
        return mfa_token
    
    async def disable_mfa(
        self,
        organization_id: UUID,
        user_id: UUID,
        mfa_method_id: UUID,
    ) -> bool:
        """Disable MFA method for user."""
        # Delete MFA method
        deleted = await self.mfa_method_repo.delete(mfa_method_id, organization_id)
        
        if deleted:
            # If this was the only method, delete all backup codes too
            remaining = await self.mfa_method_repo.get_verified_methods(user_id, organization_id)
            if not remaining:
                await self.backup_code_repo.delete_by_user(user_id, organization_id)
        
        return deleted
    
    async def get_backup_codes(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> List[str]:
        """Get unused backup codes for user."""
        codes = await self.backup_code_repo.get_by_user(user_id, organization_id)
        unused = [decrypt_string(c.code) for c in codes if not c.is_used]
        return unused
    
    async def validate_backup_code(
        self,
        organization_id: UUID,
        user_id: UUID,
        code: str,
    ) -> bool:
        """
        Validate and use backup code for login when MFA unavailable.
        
        Returns:
            True if backup code is valid and marked as used
        """
        codes = await self.backup_code_repo.get_by_user(user_id, organization_id)
        
        for backup_code in codes:
            if not backup_code.is_used:
                decrypted = decrypt_string(backup_code.code)
                if decrypted == code:
                    # Mark as used
                    await self.backup_code_repo.mark_used(backup_code.id, organization_id)
                    return True
        
        return False
    
    # Private helper methods
    
    async def _generate_backup_codes(
        self,
        user_id: UUID,
        organization_id: UUID,
        count: int = 10,
    ) -> List[str]:
        """Generate backup codes for account recovery."""
        codes = []
        for _ in range(count):
            code = "-".join("".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4)) for _ in range(3))
            codes.append(code)
        
        # Delete old backup codes
        await self.backup_code_repo.delete_by_user(user_id, organization_id)
        
        # Create new backup codes (encrypted)
        backup_codes_data = [
            {
                "user_id": user_id,
                "organization_id": organization_id,
                "code": encrypt_string(code),
                "is_used": False,
            }
            for code in codes
        ]
        
        await self.backup_code_repo.create_batch(backup_codes_data)
        
        return codes
    
    async def _send_sms(self, phone_number: str, code: str) -> bool:
        """Send SMS code (placeholder for Twilio integration)."""
        # TODO: Implement Twilio SMS sending
        # from twilio.rest import Client
        # client = Client(account_sid, auth_token)
        # client.messages.create(to=phone_number, from_=twilio_phone, body=f"Your MFA code is: {code}")
        return True
