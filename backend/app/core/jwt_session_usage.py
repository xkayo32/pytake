"""
JWT Session Validation Dependency for Protected Endpoints

This module shows how to integrate JWT token validation with session blacklist
checking for protected SAML/SSO endpoints.

Usage Example:

    from app.core.security import validate_token_not_blacklisted
    from app.models import User
    from app.api.deps import get_current_user
    
    @router.get("/protected-endpoint")
    async def protected_endpoint(
        current_user: User = Depends(get_current_user),
        token: str = Depends(get_token_from_header),
    ):
        # Validate token is not blacklisted
        is_valid = await validate_token_not_blacklisted(
            user_id=str(current_user.id),
            token=token,
        )
        
        if not is_valid:
            raise UnauthorizedException("Token has been revoked (logged out)")
        
        # Token is valid, proceed with endpoint logic
        return {"message": f"Hello {current_user.email}"}

Integration Points:

1. Login Endpoint (SAML ACS)
   - Generate access_token via create_access_token()
   - Token is NOT blacklisted (fresh login)
   - Return token to client

2. Protected Endpoints
   - Validate token with get_current_user() dependency
   - Additionally validate against blacklist with validate_token_not_blacklisted()
   - Raise UnauthorizedException if blacklisted

3. Logout Endpoint (SAML SLO)
   - Extract token from Authorization header
   - Add to blacklist via SessionManager.blacklist_token()
   - TTL = token expiration time
   - Redirect to IdP for SLO

4. Token Refresh Endpoint (TODO)
   - Validate refresh_token is not blacklisted
   - Generate new access_token
   - Return new pair

Session Blacklist Strategy:

- Redis key: `session:blacklist:{user_id}:{token}`
- Value: "1" (just a marker)
- TTL: Matches token expiration (usually 15 min for access token)
- Lookup: O(1) per request (Redis GET)
- Cleanup: Automatic via TTL (Redis expiration)

Security Considerations:

1. Token Revocation
   - Logout immediately blacklists token
   - Token remains blacklisted until natural expiration
   - No way to "unblacklist" a token

2. Multi-Device Logout
   - Can revoke all user sessions via SessionManager.invalidate_user_sessions()
   - Use when user resets password or security concern

3. Performance
   - Redis blacklist is fast (O(1))
   - Only hit for protected endpoints, not public ones
   - No database queries needed for validation

4. Edge Cases
   - Expired tokens: JWT decode fails before blacklist check
   - Refresh tokens: Separate TTL, can be blacklisted separately
   - Browser tabs: Multiple requests may hit rate limits

Future Enhancements:

1. Token Rotation
   - Implement refresh token rotation on each use
   - Revoke old refresh tokens to prevent replay

2. Session Management UI
   - Show active sessions to user
   - Allow logout from specific devices
   - Display device type, IP, location

3. Anomaly Detection
   - Alert on concurrent logins from different IPs
   - Require re-auth for high-risk operations
   - Track failed auth attempts
"""
