# Advanced Authentication Features - Architecture & API Reference

**FASE 6**: Three sophisticated authentication methods (MFA, Passwordless, Social Login) for PyTake platform.  
**Status**: ✅ Production Ready  
**Version**: 1.0  
**Last Updated**: 2026-01-26  
**Author**: Kayo Carvalho Fernandes

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Models](#data-models)
3. [Security Model](#security-model)
4. [API Reference](#api-reference)
5. [OAuth Provider Setup](#oauth-provider-setup)
6. [Troubleshooting](#troubleshooting)
7. [Testing Guide](#testing-guide)

---

## Architecture Overview

### Three Complementary Auth Methods

#### 1. MFA (Multi-Factor Authentication)
**Purpose**: Add second factor to any login method (password, OAuth, passkey)

**Supported Methods**:
- **TOTP**: Time-based One-Time Password (Google Authenticator, Authy, Microsoft Authenticator)
- **SMS**: SMS code delivery (requires Twilio integration)
- **Backup Codes**: Emergency access codes (10 codes per MFA method)

**When to Use**:
- ✅ Password-based users → add TOTP as 2FA
- ✅ OAuth users → add TOTP for additional security
- ✅ Passkey users → optional second factor
- ❌ Never require both passkey AND MFA (too friction)

**Characteristics**:
- Short-lived codes (30 seconds for TOTP)
- Rate limited (max 3-5 attempts in 15 minutes)
- Backup codes single-use only
- Can be temporarily disabled for account recovery

#### 2. Passwordless (WebAuthn / FIDO2)
**Purpose**: Hardware-based cryptographic authentication

**Supported Authenticators**:
- **Security Keys**: USB-C/USB-A keys (YubiKey, Titan, Kensington)
- **Platform Authenticators**: Face ID, Touch ID, Windows Hello
- **Mobile Authenticators**: iOS Passkeys, Android Passkeys

**When to Use**:
- ✅ Primary authentication method (replaces password entirely)
- ✅ Multi-device setup (register on laptop + phone)
- ✅ Accounts with high-value access
- ❌ Not suitable for occasional users (recovery complex)

**Characteristics**:
- No shared secrets (public key cryptography)
- Counter-based replay attack prevention
- Device-specific (cannot transfer like passwords)
- Works across all modern browsers (FIDO2 compliant)

#### 3. Social Login (OAuth 2.0)
**Purpose**: Passwordless login via external identity provider

**Supported Providers**:
- **Google**: Gmail accounts, Google Workspace domains
- **GitHub**: Developer accounts, GitHub Enterprise
- **Microsoft**: Microsoft accounts, Azure AD / Microsoft Entra

**When to Use**:
- ✅ New account signup (fast onboarding)
- ✅ Existing users → link for passwordless access
- ✅ B2B integration (federated auth)
- ❌ Not suitable for anonymous/guest access

**Characteristics**:
- PKCE flow (authorization code interception protected)
- State token (CSRF protected)
- Email verified by provider
- No password to manage

---

## Data Models

### MFA Tables

#### `mfa_methods`
```sql
CREATE TABLE mfa_methods (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (FK users.id),
  organization_id UUID NOT NULL (FK organization.id),
  method_type VARCHAR(20) NOT NULL,           -- "totp" | "sms"
  secret VARCHAR(500) NOT NULL,               -- Encrypted TOTP secret or phone
  is_verified BOOLEAN DEFAULT FALSE,          -- User confirmed method works
  is_primary BOOLEAN DEFAULT FALSE,           -- Default method for account
  backup_codes_generated INT DEFAULT 0,       -- Count of backup codes
  last_used_at TIMESTAMP NULL,                -- Last successful verification
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP NULL                   -- Soft delete flag
);
CREATE INDEX idx_mfa_methods_user_org ON mfa_methods(user_id, organization_id);
```

#### `mfa_challenges`
```sql
CREATE TABLE mfa_challenges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (FK users.id),
  organization_id UUID NOT NULL (FK organization.id),
  mfa_method_id UUID NOT NULL (FK mfa_methods.id),
  code VARCHAR(255) NOT NULL,                 -- Encrypted code (TOTP or SMS)
  is_used BOOLEAN DEFAULT FALSE,              -- Prevents reuse
  expires_at TIMESTAMP NOT NULL,              -- Code expiration (30 sec for TOTP)
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_mfa_challenges_user_expires ON mfa_challenges(user_id, expires_at);
```

#### `mfa_backup_codes`
```sql
CREATE TABLE mfa_backup_codes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (FK users.id),
  organization_id UUID NOT NULL (FK organization.id),
  mfa_method_id UUID NOT NULL (FK mfa_methods.id),
  code VARCHAR(255) NOT NULL,                 -- Encrypted code
  is_used BOOLEAN DEFAULT FALSE,              -- Single-use enforcement
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_mfa_backup_codes_method ON mfa_backup_codes(mfa_method_id, is_used);
```

### Passkey Tables

#### `passkey_credentials`
```sql
CREATE TABLE passkey_credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (FK users.id),
  organization_id UUID NOT NULL (FK organization.id),
  credential_id VARCHAR(500) NOT NULL UNIQUE, -- FIDO2 credential ID
  public_key TEXT NOT NULL,                   -- FIDO2 public key
  counter INT DEFAULT 0,                      -- Replay attack prevention
  transports VARCHAR(100),                    -- "usb,nfc,ble,internal"
  device_name VARCHAR(255),                   -- User-friendly name
  is_primary BOOLEAN DEFAULT FALSE,           -- Primary method for org
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_passkey_creds_user_org ON passkey_credentials(user_id, organization_id);
CREATE INDEX idx_passkey_creds_credential_id ON passkey_credentials(credential_id);
```

#### `passkey_challenges`
```sql
CREATE TABLE passkey_challenges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (FK users.id),
  organization_id UUID NOT NULL (FK organization.id),
  challenge_type VARCHAR(20) NOT NULL,       -- "registration" | "authentication"
  challenge_data VARCHAR(500) NOT NULL,      -- Encrypted challenge
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,             -- Challenge lifetime (5 min)
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_passkey_challenges_expires ON passkey_challenges(user_id, expires_at);
```

### Social Identity Table

#### `social_identities`
```sql
CREATE TABLE social_identities (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (FK users.id),
  organization_id UUID NOT NULL (FK organization.id),
  provider VARCHAR(50) NOT NULL,             -- "google" | "github" | "microsoft"
  provider_user_id VARCHAR(255) NOT NULL,    -- OAuth sub / user ID
  email VARCHAR(255),
  full_name VARCHAR(255),
  profile_picture_url TEXT,
  access_token VARCHAR(2000),                -- Encrypted OAuth token
  refresh_token VARCHAR(2000),               -- Encrypted refresh token
  token_expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_social_identities_user_org ON social_identities(user_id, organization_id);
CREATE INDEX idx_social_identities_provider ON social_identities(provider, provider_user_id);
CREATE UNIQUE INDEX idx_social_identities_unique ON social_identities(provider, provider_user_id, organization_id);
```

---

## Security Model

### Encryption Strategy

| Data | Encryption | Key | Use Case |
|------|-----------|-----|----------|
| TOTP Secret | Fernet (AES128) | `ENCRYPTION_KEY` | Server-side only |
| MFA Code | Fernet | `ENCRYPTION_KEY` | Challenge storage |
| OAuth Token | Fernet | `ENCRYPTION_KEY` | Refresh capability |
| Backup Code | Fernet | `ENCRYPTION_KEY` | Recovery path |
| Passkey Public Key | Not encrypted | N/A | FIDO2 verification |

**Encryption Keys**: 
- Stored in: `ENCRYPTION_KEY` environment variable
- Rotation: Requires re-encryption (future feature)
- Backup: Store safely, never commit to git

### Multi-Tenancy Isolation

**Pattern**: All queries MUST filter by `organization_id`

```python
# ✅ CORRECT
await mfa_repo.get_by_id(id=mfa_id, organization_id=org_id)

# ❌ WRONG
await mfa_repo.get_by_id(id=mfa_id)  # Missing org_id!
```

**Enforcement**:
- Every repository method includes `organization_id` parameter
- Queries filter: `.where(Model.organization_id == org_id)`
- Routes extract org_id from JWT token (not user input)
- No way to bypass org_id filtering

### Token Lifecycle

#### Access Token (JWT)
- **Lifetime**: 15 minutes
- **Claims**: `{sub, org_id, iat, exp, mfa_verified, ...}`
- **Usage**: API authentication header
- **Expiration**: Checked on every request

#### Refresh Token (JWT)
- **Lifetime**: 7 days
- **Claims**: `{sub, org_id, type: "refresh"}`
- **Usage**: Obtain new access token
- **Expiration**: Independent from access token

#### TOTP Code
- **Lifetime**: 30 seconds
- **Generation**: Time-based (RFC 6238)
- **Validation**: ±1 window = 60 seconds total tolerance
- **Reuse**: Single-use per challenge

#### Backup Code
- **Lifetime**: Unlimited (until used)
- **Usage**: Emergency recovery
- **Reuse**: Single-use only
- **Count**: 10 codes per MFA method

### Replay Attack Prevention

| Attack | Prevention Mechanism | Details |
|--------|----------------------|---------|
| TOTP Reuse | Code expiration | 30 sec window, can't be reused after |
| Passkey Reuse | Counter validation | counter must increment, old counter rejected |
| OAuth Code | Code expiration | Valid for 10 minutes only |
| OAuth State | State mismatch | New state for each initiation |
| Backup Code | Single-use flag | is_used=True, never reset |

---

## API Reference

### MFA Endpoints

#### 1. Setup TOTP
```
POST /api/v1/mfa/totp/setup
Authorization: Bearer {access_token}

Response 200:
{
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "qr_code_url": "otpauth://totp/...",
  "backup_codes": ["BACKUP-001", ...]
}
```

#### 2. Verify TOTP
```
POST /api/v1/mfa/totp/verify
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "code": "123456"
}

Response 200:
{
  "verified": true,
  "backup_codes_remaining": 10
}
```

#### 3. List MFA Methods
```
GET /api/v1/mfa/methods
Authorization: Bearer {access_token}

Response 200:
[
  {
    "id": "uuid",
    "method_type": "totp",
    "is_verified": true,
    "is_primary": true,
    "created_at": "2026-01-26T...",
    "last_used_at": "2026-01-26T..."
  }
]
```

#### 4. Disable MFA
```
DELETE /api/v1/mfa/{method_id}
Authorization: Bearer {access_token}

Response 204: No Content
```

### Passkey Endpoints

#### 1. Start Registration
```
POST /api/v1/passkeys/registration/start
Authorization: Bearer {access_token}

Response 200:
{
  "challenge": "base64_encoded_challenge",
  "rp": {"name": "PyTake", "id": "api.pytake.net"},
  "user": {"id": "user_uuid", "name": "user@example.com"},
  "pubKeyCredParams": [{"type": "public-key", "alg": -7}]
}
```

#### 2. Complete Registration
```
POST /api/v1/passkeys/registration/complete
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "attestationObject": "base64",
  "clientDataJSON": "base64",
  "device_name": "MacBook Pro"
}

Response 201:
{
  "id": "credential_uuid",
  "device_name": "MacBook Pro",
  "is_primary": true,
  "created_at": "2026-01-26T..."
}
```

#### 3. Start Authentication
```
POST /api/v1/passkeys/authentication/start
Content-Type: application/json

{
  "email": "user@example.com"
}

Response 200:
{
  "challenge": "base64_encoded_challenge",
  "timeout": 60000,
  "userVerification": "preferred"
}
```

#### 4. Complete Authentication
```
POST /api/v1/passkeys/authentication/complete
Content-Type: application/json

{
  "id": "credential_id",
  "clientDataJSON": "base64",
  "authenticatorData": "base64",
  "signature": "base64"
}

Response 200:
{
  "access_token": "jwt_token",
  "refresh_token": "jwt_token"
}
```

#### 5. List Passkeys
```
GET /api/v1/passkeys
Authorization: Bearer {access_token}

Response 200:
[
  {
    "id": "credential_uuid",
    "device_name": "iPhone",
    "is_primary": true,
    "transports": "internal",
    "counter": 45,
    "created_at": "2026-01-26T..."
  }
]
```

#### 6. Rename Passkey
```
PUT /api/v1/passkeys/{credential_id}/rename
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "device_name": "iPhone 15 Pro"
}

Response 200: Updated credential
```

#### 7. Delete Passkey
```
DELETE /api/v1/passkeys/{credential_id}
Authorization: Bearer {access_token}

Response 204: No Content
```

### Social Login Endpoints

#### 1. Start Google OAuth
```
POST /api/v1/social/google/start
Content-Type: application/json

{
  "redirect_uri": "https://app.pytake.net/auth/callback"
}

Response 200:
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "state_token"
}
```

#### 2. Google Callback
```
GET /api/v1/social/callback?code=AUTH_CODE&state=STATE_TOKEN
(Browser redirect from Google)

Response 302 → Redirect to app with:
- Set-Cookie: access_token=...
- Set-Cookie: refresh_token=...
```

#### 3. List Social Identities
```
GET /api/v1/social/identities
Authorization: Bearer {access_token}

Response 200:
[
  {
    "id": "social_uuid",
    "provider": "google",
    "email": "user@gmail.com",
    "full_name": "Google User",
    "linked_at": "2026-01-26T..."
  }
]
```

#### 4. Unlink Social Account
```
DELETE /api/v1/social/{provider}/{provider_user_id}
Authorization: Bearer {access_token}

Response 204: No Content
```

#### 5. Social Health Check
```
GET /api/v1/social/health
Response 200: {"status": "ok"}
```

---

## OAuth Provider Setup

### Google Setup

1. **Create OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project
   - Enable Google+ API
   - Create OAuth 2.0 credentials (Web application)

2. **Configure Redirect URI**:
   ```
   https://api.pytake.net/api/v1/social/callback
   https://api-dev.pytake.net/api/v1/social/callback  (dev)
   ```

3. **Set Environment Variables**:
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=your_client_id
   GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
   ```

4. **Test Flow**:
   ```bash
   curl -X POST http://localhost:8002/api/v1/social/google/start
   # Returns authorization_url, open in browser
   ```

### GitHub Setup

1. **Create OAuth Application**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - New OAuth App
   - Fill in Application name, Homepage URL, callback URL

2. **Configure Callback URI**:
   ```
   https://api.pytake.net/api/v1/social/callback
   ```

3. **Set Environment Variables**:
   ```bash
   GITHUB_OAUTH_CLIENT_ID=your_client_id
   GITHUB_OAUTH_CLIENT_SECRET=your_client_secret
   ```

### Microsoft Setup

1. **Register Application**:
   - Go to [Azure Portal](https://portal.azure.com)
   - Register new application
   - Add platform: Web
   - Add redirect URI

2. **Configure Redirect URI**:
   ```
   https://api.pytake.net/api/v1/social/callback
   ```

3. **Set Environment Variables**:
   ```bash
   MICROSOFT_OAUTH_CLIENT_ID=your_client_id
   MICROSOFT_OAUTH_CLIENT_SECRET=your_client_secret
   MICROSOFT_OAUTH_TENANT=common  # or your tenant ID
   ```

---

## Troubleshooting

### MFA Troubleshooting

**Issue**: User cannot generate valid TOTP code
- **Cause**: Device time drift > 60 seconds
- **Solution**: Sync device time with NTP server

**Issue**: Backup code not working
- **Cause**: Code already used or typo
- **Solution**: Verify `is_used=False` in database, check code format

**Issue**: SMS not arriving
- **Cause**: Twilio not configured or phone number invalid
- **Solution**: Check Twilio credentials, verify phone in E.164 format

### Passkey Troubleshooting

**Issue**: "Credential ID already exists"
- **Cause**: Same device registered twice
- **Solution**: Delete old credential, re-register

**Issue**: Authentication fails with counter mismatch
- **Cause**: Attacker replayed old authentication
- **Solution**: Normal behavior, security working as intended

**Issue**: Browser doesn't support WebAuthn
- **Cause**: Older browser version
- **Solution**: Recommend Chrome 67+, Firefox 60+, Safari 13+

### OAuth Troubleshooting

**Issue**: "Invalid state token"
- **Cause**: CSRF attempt or token expired (>10 min)
- **Solution**: Start OAuth flow again

**Issue**: "Access token already used"
- **Cause**: PKCE code_verifier mismatch
- **Solution**: Verify code_verifier matches code_challenge

**Issue**: Email not received from provider
- **Cause**: Provider not returning email in user_info endpoint
- **Solution**: Check provider scopes (`email`, `profile`)

---

## Testing Guide

### Unit Tests
```bash
cd /home/administrator/pytake/backend
pytest tests/test_mfa.py -v  # MFA unit tests (Day 1)
pytest tests/test_passkey.py -v  # Passkey unit tests (Day 2)
pytest tests/test_social_login.py -v  # Social Login unit tests (Day 3)
```

### Integration Tests
```bash
pytest tests/test_advanced_auth_integration.py -v
# Tests:
# - Multi-tenancy isolation
# - Data persistence
# - Soft delete filtering
# - Challenge expiration
```

### E2E Scenario Tests
```bash
pytest tests/test_advanced_auth_e2e.py -v
# Tests:
# - Complete signup journey
# - Account recovery
# - Provider switching
# - Multi-device management
```

### Security Tests
```bash
pytest tests/test_advanced_auth_security.py -v
# Tests:
# - Replay attack prevention
# - CSRF protection
# - Token expiration
# - Data isolation
# - Rate limiting
```

### Run All Auth Tests
```bash
pytest tests/test_*auth*.py -v --cov=app/services/mfa_service --cov=app/services/passkey_service --cov=app/services/social_login_service
```

---

## References

- **TOTP (RFC 6238)**: https://tools.ietf.org/html/rfc6238
- **WebAuthn (FIDO2)**: https://www.w3.org/TR/webauthn-2/
- **OAuth 2.0 PKCE (RFC 7636)**: https://tools.ietf.org/html/rfc7636
- **JWT (RFC 7519)**: https://tools.ietf.org/html/rfc7519

---

**Last Updated**: 2026-01-26 by Kayo Carvalho Fernandes
