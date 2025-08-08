# Multi-Tenant System - PyTake Backend

## Overview

The PyTake backend includes a comprehensive multi-tenancy system that provides complete data isolation, billing management, user roles, and API key management. This system is designed for SaaS applications that need to serve multiple organizations with strict data separation.

## Features

### 🏢 Tenant Management
- **Complete Data Isolation**: Each tenant has separate data storage with no cross-tenant data access
- **Subdomain Support**: Access via custom subdomains (e.g., `acme.api.pytake.com`)
- **Custom Domains**: Support for tenant-specific custom domains
- **Flexible Configuration**: Per-tenant settings, limits, and preferences

### 💳 Billing & Plans
- **Multiple Plans**: Free, Starter, Pro, and Enterprise tiers
- **Usage-Based Billing**: Track messages, API calls, storage, and user count
- **Flexible Billing Cycles**: Monthly, yearly, or pay-as-you-go
- **Trial Support**: Free trial periods with automatic conversion
- **Invoice Generation**: Automated billing with detailed line items
- **Upgrade/Downgrade**: Seamless plan changes with prorated billing

### 👥 User Management
- **Role-Based Access Control**: Owner, Admin, Manager, User, and ReadOnly roles
- **Granular Permissions**: Fine-grained control over feature access
- **User Invitations**: Email-based user onboarding
- **SSO Support**: Single sign-on integration ready
- **2FA**: Two-factor authentication per tenant
- **Audit Logging**: Complete user activity tracking

### 🔐 Security & API Keys
- **Tenant-Specific API Keys**: Secure API access with custom permissions
- **Rate Limiting**: Per-tenant API rate limits based on plan
- **IP Whitelisting**: Restrict access by IP address
- **Webhook Security**: Unique webhook secrets per tenant
- **Data Encryption**: Per-tenant encryption keys for sensitive data
- **JWT Integration**: Secure authentication with tenant context

## Quick Start

### 1. Create a New Tenant

```bash
curl -X POST http://localhost:8080/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "subdomain": "acme",
    "plan": "Pro",
    "owner_email": "owner@acme.com",
    "owner_name": "John Doe",
    "company_size": "10-50",
    "use_case": "Customer Support"
  }'
```

### 2. Add Users to Tenant

```bash
curl -X POST http://localhost:8080/api/v1/tenants/{tenant_id}/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {jwt_token}" \
  -d '{
    "email": "manager@acme.com",
    "name": "Jane Smith",
    "role": "Manager",
    "permissions": ["ManageWhatsApp", "ViewAnalytics"],
    "send_invite": true
  }'
```

### 3. Create API Key

```bash
curl -X POST http://localhost:8080/api/v1/tenants/{tenant_id}/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {jwt_token}" \
  -d '{
    "name": "WhatsApp Integration",
    "permissions": ["whatsapp.send", "whatsapp.receive"],
    "rate_limit": 1000,
    "expires_in_days": 365
  }'
```

### 4. Upgrade Plan

```bash
curl -X POST http://localhost:8080/api/v1/tenants/{tenant_id}/upgrade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {jwt_token}" \
  -d '{
    "new_plan": "Enterprise",
    "billing_cycle": "Yearly",
    "payment_method": "card_1234567890"
  }'
```

## API Endpoints

### Tenant Management
- `POST /api/v1/tenants` - Create a new tenant
- `GET /api/v1/tenants/{tenant_id}` - Get tenant details
- `PUT /api/v1/tenants/{tenant_id}` - Update tenant settings

### User Management
- `POST /api/v1/tenants/{tenant_id}/users` - Add user to tenant
- `GET /api/v1/tenants/{tenant_id}/users` - List tenant users

### Billing
- `GET /api/v1/tenants/{tenant_id}/billing` - Get billing information
- `POST /api/v1/tenants/{tenant_id}/upgrade` - Upgrade/downgrade plan
- `GET /api/v1/tenants/{tenant_id}/invoices` - List invoices

### Usage & Analytics
- `GET /api/v1/tenants/{tenant_id}/usage` - Get usage metrics

### API Key Management
- `POST /api/v1/tenants/{tenant_id}/api-keys` - Create API key
- `GET /api/v1/tenants/{tenant_id}/api-keys` - List API keys
- `DELETE /api/v1/tenants/{tenant_id}/api-keys/{key_id}` - Delete API key

## Plans & Pricing

### Free Plan ($0/month)
- 1,000 messages per month
- 100 contacts
- 2 users
- 10 API calls per minute
- 1 webhook endpoint
- 100 MB storage
- 3 automations

### Starter Plan ($29/month)
- 10,000 messages per month
- 1,000 contacts
- 5 users
- 100 API calls per minute
- 3 webhook endpoints
- 1 GB storage
- 10 automations

### Pro Plan ($99/month)
- 100,000 messages per month
- 10,000 contacts
- 20 users
- 1,000 API calls per minute
- 10 webhook endpoints
- 10 GB storage
- 50 automations

### Enterprise Plan ($299/month)
- Unlimited messages
- Unlimited contacts
- 100 users
- 10,000 API calls per minute
- 50 webhook endpoints
- 100 GB storage
- 200 automations

## User Roles & Permissions

### Owner
- Full access to all tenant features
- Can manage billing and subscription
- Can add/remove users and assign roles
- Cannot be removed from tenant

### Admin
- Can manage users and their roles
- Can configure WhatsApp and integrations
- Can view all analytics and reports
- Cannot manage billing

### Manager
- Can manage WhatsApp configurations
- Can create and manage automations
- Can view analytics for their areas
- Limited user management

### User
- Can send messages and manage contacts
- Can view basic analytics
- Limited configuration access
- No user management

### ReadOnly
- View-only access to data and reports
- Cannot make changes or send messages
- Suitable for reporting and monitoring

## Authentication Methods

### 1. Subdomain-Based
Access your tenant via subdomain:
```
https://acme.api.pytake.com/api/v1/dashboard
```

### 2. API Key Authentication
Use tenant-specific API keys:
```bash
curl -H "Authorization: Bearer pk_1234567890abcdef" \
     https://api.pytake.com/api/v1/whatsapp/send
```

### 3. JWT Token + Tenant Header
Use JWT with explicit tenant ID:
```bash
curl -H "Authorization: Bearer {jwt_token}" \
     -H "X-Tenant-ID: {tenant_id}" \
     https://api.pytake.com/api/v1/dashboard
```

## Data Isolation

### Database Level
- Each tenant's data is logically separated
- All queries include tenant_id filtering
- No cross-tenant data leakage possible

### API Level
- All endpoints validate tenant context
- Middleware ensures proper tenant isolation
- Rate limiting applied per tenant

### File Storage
- Tenant-specific storage buckets
- Separate encryption keys per tenant
- Isolated backup and restore

## Usage Tracking

The system tracks the following metrics per tenant:
- **Messages Sent**: WhatsApp messages sent per month
- **API Calls**: REST API requests per minute/month
- **Storage Used**: File and media storage in MB
- **Active Users**: Monthly active users
- **Webhook Calls**: Webhook deliveries
- **Automation Runs**: Automated workflow executions

## Billing Integration

### Supported Payment Methods
- Credit/Debit Cards (via Stripe)
- Bank Transfers
- PayPal
- Cryptocurrency (Enterprise)

### Billing Features
- Prorated charges for upgrades/downgrades
- Usage overage billing
- Automatic payment retry
- Dunning management
- Tax calculation support
- Multi-currency support

## Security Features

### Data Protection
- **Encryption at Rest**: Per-tenant encryption keys
- **Encryption in Transit**: TLS 1.3 for all communications
- **Data Residency**: Choose data storage location
- **Backup Encryption**: Encrypted backup storage

### Access Control
- **IP Whitelisting**: Restrict access by IP address
- **2FA Enforcement**: Require two-factor authentication
- **Session Management**: Secure session handling
- **API Key Rotation**: Regular key rotation policies

### Compliance
- **GDPR Compliance**: Data privacy and right to deletion
- **SOC 2 Ready**: Security controls and monitoring
- **HIPAA Compatible**: Healthcare data protection
- **Audit Trails**: Complete activity logging

## Development & Integration

### Rust Code Example

```rust
use simple_api::multi_tenant::*;

// Create tenant service
let tenant_service = TenantService;

// Create new tenant
let request = CreateTenantRequest {
    name: "My Company".to_string(),
    subdomain: "mycompany".to_string(),
    plan: TenantPlan::Pro,
    owner_email: "owner@mycompany.com".to_string(),
    owner_name: "John Doe".to_string(),
    company_size: Some("50-100".to_string()),
    use_case: Some("Customer Support".to_string()),
};

let tenant = tenant_service.create_tenant(request).await?;

// Add user with specific permissions
let user_request = AddUserRequest {
    email: "user@mycompany.com".to_string(),
    name: "Jane Smith".to_string(),
    role: TenantRole::Manager,
    permissions: vec![
        Permission::ManageWhatsApp,
        Permission::ViewAnalytics,
    ],
    send_invite: true,
};

let user = tenant_service.add_user(tenant.tenant.id, user_request).await?;
```

### Middleware Usage

```rust
use simple_api::multi_tenant::TenantMiddleware;

// Extract tenant context from request
let tenant_context = TenantMiddleware::extract_tenant_context(&req, auth).await?;

// Check permissions
if tenant_context.has_permission(&Permission::ManageWhatsApp) {
    // User can manage WhatsApp
}

if tenant_context.is_admin() {
    // User is admin
}
```

## Monitoring & Observability

### Metrics Collected
- Tenant creation and churn rates
- Revenue per tenant and plan
- API usage patterns
- Error rates by tenant
- Performance metrics per tenant

### Logging
- All tenant operations are logged
- User activities tracked with audit trail
- API access logs with tenant context
- Billing events and payment status

### Alerts
- Usage limit warnings
- Payment failures
- Security violations
- Performance degradation

## Support & Maintenance

### Tenant Self-Service
- Usage dashboard with real-time metrics
- Billing history and invoice downloads
- User management interface
- API key management

### Admin Tools
- Tenant management dashboard
- Bulk operations on tenants
- Revenue and usage analytics
- Support ticket integration

### Backup & Recovery
- Per-tenant backup schedules
- Point-in-time recovery
- Automated disaster recovery
- Cross-region replication

## Migration & Scaling

### Database Scaling
- Read replicas per region
- Automatic sharding by tenant size
- Connection pooling optimization
- Query performance monitoring

### Application Scaling
- Horizontal pod autoscaling
- Load balancing with tenant affinity
- CDN integration for static assets
- Redis clustering for sessions

### Data Migration
- Tenant data export tools
- Import from other platforms
- Zero-downtime migrations
- Data validation and integrity checks

## Troubleshooting

### Common Issues

#### Tenant Not Found
- Check subdomain spelling
- Verify tenant is active
- Confirm API key belongs to tenant

#### Permission Denied
- Verify user role and permissions
- Check if user is active
- Confirm API key has required permissions

#### Rate Limit Exceeded
- Check tenant's plan limits
- Monitor API usage patterns
- Consider upgrading plan

#### Billing Issues
- Verify payment method is valid
- Check if plan allows the action
- Review usage against limits

### Support Channels
- Email: support@pytake.com
- Documentation: https://docs.pytake.com
- Status Page: https://status.pytake.com
- Community: https://community.pytake.com

---

For more examples and detailed API documentation, see the [examples](examples/multi_tenant_usage.rs) and [API documentation](http://localhost:8080/docs).