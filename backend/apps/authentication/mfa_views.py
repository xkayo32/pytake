"""
Multi-Factor Authentication views
"""
import pyotp
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import MFA


class MFAViewSet(viewsets.ViewSet):
    """
    API endpoints for Multi-Factor Authentication (MFA)
    GET /api/v1/auth/mfa/ - Get MFA status
    POST /api/v1/auth/mfa/enable/ - Enable MFA
    POST /api/v1/auth/mfa/disable/ - Disable MFA
    POST /api/v1/auth/mfa/verify/ - Verify TOTP code
    POST /api/v1/auth/mfa/backup-codes/ - Generate backup codes
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get MFA status for current user"""
        try:
            mfa = MFA.objects.get(user=request.user)
            return Response({
                'is_enabled': mfa.is_enabled,
                'backup_codes_count': len([c for c in (mfa.backup_codes or []) if not c.get('used')]),
                'last_used_at': mfa.last_used_at
            })
        except MFA.DoesNotExist:
            return Response({
                'is_enabled': False,
                'backup_codes_count': 0,
                'last_used_at': None
            })
    
    @action(detail=False, methods=['post'])
    def enable(self, request):
        """Enable MFA for current user"""
        mfa, created = MFA.objects.get_or_create(user=request.user)
        
        # Generate new secret if not already set
        if not mfa.secret:
            mfa.secret = pyotp.random_base32()
            mfa.save()
        
        # Generate QR code
        totp = pyotp.TOTP(mfa.secret)
        provisioning_uri = totp.provisioning_uri(
            name=request.user.email,
            issuer_name='PyTake'
        )
        
        return Response({
            'secret': mfa.secret,
            'qr_code_uri': provisioning_uri,
            'message': 'Scan the QR code with your authenticator app, then provide the 6-digit code'
        })
    
    @action(detail=False, methods=['post'])
    def verify(self, request):
        """Verify MFA TOTP code"""
        code = request.data.get('code')
        
        if not code:
            return Response(
                {'error': 'TOTP code required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            mfa = MFA.objects.get(user=request.user)
        except MFA.DoesNotExist:
            return Response(
                {'error': 'MFA not configured'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify TOTP code
        totp = pyotp.TOTP(mfa.secret)
        if not totp.verify(code, valid_window=1):
            return Response(
                {'error': 'Invalid TOTP code'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Enable MFA
        mfa.is_enabled = True
        mfa.backup_codes = [{'code': pyotp.random_base32()[:8], 'used': False} for _ in range(10)]
        mfa.save()
        
        return Response({
            'message': 'MFA enabled successfully',
            'backup_codes': mfa.backup_codes
        })
    
    @action(detail=False, methods=['post'])
    def disable(self, request):
        """Disable MFA for current user"""
        password = request.data.get('password')
        
        if not password:
            return Response(
                {'error': 'Password required to disable MFA'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not request.user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            mfa = MFA.objects.get(user=request.user)
            mfa.is_enabled = False
            mfa.save()
            
            return Response({'message': 'MFA disabled successfully'})
        except MFA.DoesNotExist:
            return Response(
                {'error': 'MFA not configured'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def verify_backup_code(self, request):
        """Verify backup code during login"""
        backup_code = request.data.get('backup_code')
        
        if not backup_code:
            return Response(
                {'error': 'Backup code required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            mfa = MFA.objects.get(user=request.user)
        except MFA.DoesNotExist:
            return Response(
                {'error': 'MFA not configured'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find and mark backup code as used
        for code in (mfa.backup_codes or []):
            if code.get('code') == backup_code and not code.get('used'):
                code['used'] = True
                mfa.save()
                return Response({'message': 'Backup code verified'})
        
        return Response(
            {'error': 'Invalid or already used backup code'},
            status=status.HTTP_400_BAD_REQUEST
        )
