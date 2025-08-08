//! Multi-Tenant System Usage Examples
//! 
//! This file demonstrates how to use the comprehensive multi-tenancy system
//! that provides complete data isolation, billing management, and user roles.

use simple_api::multi_tenant::*;
use uuid::Uuid;
use chrono::Utc;
use std::collections::HashMap;

/// Example: Create a new tenant with Free plan
async fn example_create_free_tenant() -> Result<TenantResponse, TenantError> {
    let tenant_service = TenantService;
    
    let request = CreateTenantRequest {
        name: "Acme Corp".to_string(),
        subdomain: "acme".to_string(),
        plan: TenantPlan::Free,
        owner_email: "owner@acme.com".to_string(),
        owner_name: "John Doe".to_string(),
        company_size: Some("10-50".to_string()),
        use_case: Some("Customer Support".to_string()),
    };
    
    let response = tenant_service.create_tenant(request).await?;
    
    println!("✅ Created tenant: {}", response.tenant.name);
    println!("📊 Plan: {:?}", response.tenant.plan);
    println!("📝 Subdomain: {}", response.tenant.subdomain);
    println!("👥 Users: {}", response.users_count);
    
    Ok(response)
}

/// Example: Upgrade tenant to Pro plan
async fn example_upgrade_tenant(tenant_id: Uuid) -> Result<TenantResponse, TenantError> {
    let tenant_service = TenantService;
    
    let upgrade_request = UpgradePlanRequest {
        new_plan: TenantPlan::Pro,
        billing_cycle: BillingCycle::Monthly,
        payment_method: "card_1234567890".to_string(),
    };
    
    let response = tenant_service.upgrade_plan(tenant_id, upgrade_request).await?;
    
    println!("🚀 Upgraded to {:?} plan", response.tenant.plan);
    println!("💰 New price: ${}/month", response.tenant.billing_info.plan_price);
    println!("📈 New limits: {} messages/month", response.tenant.limits.max_messages_per_month);
    
    Ok(response)
}

/// Example: Add a new user to tenant with specific role and permissions
async fn example_add_tenant_user(tenant_id: Uuid) -> Result<TenantUser, TenantError> {
    let tenant_service = TenantService;
    
    let user_request = AddUserRequest {
        email: "manager@acme.com".to_string(),
        name: "Jane Smith".to_string(),
        role: TenantRole::Manager,
        permissions: vec![
            Permission::ManageWhatsApp,
            Permission::ViewAnalytics,
            Permission::ManageAutomations,
        ],
        send_invite: true,
    };
    
    let user = tenant_service.add_user(tenant_id, user_request).await?;
    
    println!("👤 Added user: {}", user.email);
    println!("🔐 Role: {:?}", user.role);
    println!("✅ Permissions: {:?}", user.permissions);
    
    Ok(user)
}

/// Example: Create API key for external integrations
async fn example_create_api_key(tenant_id: Uuid) -> Result<ApiKeyResponse, TenantError> {
    let tenant_service = TenantService;
    
    let key_request = CreateApiKeyRequest {
        name: "WhatsApp Integration".to_string(),
        permissions: vec![
            "whatsapp.send".to_string(),
            "whatsapp.receive".to_string(),
            "contacts.read".to_string(),
        ],
        rate_limit: 1000, // requests per minute
        expires_in_days: Some(365), // 1 year
    };
    
    let api_key = tenant_service.create_api_key(tenant_id, key_request).await?;
    
    println!("🔑 Created API key: {}", api_key.name);
    println!("🆔 Key ID: {}", api_key.id);
    println!("⚠️  API Key (store securely): {}", api_key.key);
    println!("📝 Permissions: {:?}", api_key.permissions);
    
    Ok(api_key)
}

/// Example: Get usage metrics for billing
async fn example_get_usage_metrics(tenant_id: Uuid) -> Result<UsageMetrics, TenantError> {
    let tenant_service = TenantService;
    
    let metrics = tenant_service.get_usage_metrics(tenant_id, 30).await?; // Last 30 days
    
    println!("📊 Usage Metrics for last 30 days:");
    println!("📱 Messages sent: {}", metrics.messages_sent);
    println!("🔗 API calls: {}", metrics.api_calls);
    println!("💾 Storage used: {} MB", metrics.storage_used_mb);
    println!("👥 Active users: {}", metrics.active_users);
    println!("🔔 Webhook calls: {}", metrics.webhook_calls);
    
    Ok(metrics)
}

/// Example: Get billing information
async fn example_get_billing_info(tenant_id: Uuid) -> Result<BillingInfo, TenantError> {
    let tenant_service = TenantService;
    
    let billing = tenant_service.get_billing_info(tenant_id).await?;
    
    println!("💳 Billing Information:");
    println!("💰 Plan price: ${}", billing.plan_price);
    println!("🔄 Billing cycle: {:?}", billing.billing_cycle);
    println!("📅 Next billing date: {}", billing.next_billing_date.format("%Y-%m-%d"));
    println!("🎫 Discount: {}%", billing.discount_percent);
    
    if let Some(trial_end) = billing.trial_end_date {
        println!("🆓 Trial ends: {}", trial_end.format("%Y-%m-%d"));
    }
    
    Ok(billing)
}

/// Example: Working with tenant context and permissions
fn example_tenant_context_usage() {
    let tenant_context = TenantContext {
        tenant_id: Uuid::new_v4(),
        tenant: Tenant {
            id: Uuid::new_v4(),
            name: "Example Tenant".to_string(),
            subdomain: "example".to_string(),
            plan: TenantPlan::Pro,
            status: TenantStatus::Active,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            limits: TenantLimits {
                max_messages_per_month: 100000,
                max_contacts: 10000,
                max_users: 20,
                max_api_calls_per_minute: 1000,
                max_webhook_endpoints: 10,
                max_storage_mb: 10000,
                max_automations: 50,
            },
            settings: TenantSettings {
                timezone: "UTC".to_string(),
                language: "en".to_string(),
                webhook_secret: "webhook_secret".to_string(),
                custom_domain: None,
                sso_enabled: false,
                two_factor_required: false,
                ip_whitelist: vec![],
                data_retention_days: 365,
                encryption_key: "encryption_key".to_string(),
            },
            billing_info: BillingInfo {
                plan_price: 99.0,
                billing_cycle: BillingCycle::Monthly,
                next_billing_date: Utc::now() + chrono::Duration::days(30),
                payment_method: Some("card_1234".to_string()),
                discount_percent: 0.0,
                trial_end_date: None,
                usage_overage: 0.0,
            },
        },
        user_id: Some(Uuid::new_v4()),
        user_role: Some(TenantRole::Admin),
        api_key_id: None,
        permissions: vec![
            Permission::ManageUsers,
            Permission::ManageBilling,
            Permission::ManageWhatsApp,
        ],
    };
    
    // Check permissions
    if tenant_context.can_manage_users() {
        println!("✅ User can manage other users");
    }
    
    if tenant_context.can_manage_billing() {
        println!("✅ User can manage billing");
    }
    
    if tenant_context.has_permission(&Permission::ManageWhatsApp) {
        println!("✅ User can manage WhatsApp");
    }
    
    if tenant_context.is_admin() {
        println!("✅ User is an admin");
    }
}

/// Example: Multi-tenant middleware usage (pseudo-code)
async fn example_middleware_usage() {
    println!("🔒 Multi-Tenant Middleware Examples:");
    
    // 1. Subdomain-based tenant resolution
    println!("1. Subdomain: acme.api.pytake.com -> Tenant: acme");
    
    // 2. API key-based tenant resolution
    println!("2. API Key: pk_1234567890abcdef -> Tenant extracted from key");
    
    // 3. JWT-based tenant resolution
    println!("3. JWT Token -> User + Tenant extracted from claims");
    
    // 4. Header-based tenant resolution
    println!("4. X-Tenant-ID header -> Direct tenant lookup");
}

/// Example: Plan limits and features comparison
fn example_plan_comparison() {
    println!("📋 Plan Comparison:");
    
    let free_limits = TenantLimits {
        max_messages_per_month: 1000,
        max_contacts: 100,
        max_users: 2,
        max_api_calls_per_minute: 10,
        max_webhook_endpoints: 1,
        max_storage_mb: 100,
        max_automations: 3,
    };
    
    let pro_limits = TenantLimits {
        max_messages_per_month: 100000,
        max_contacts: 10000,
        max_users: 20,
        max_api_calls_per_minute: 1000,
        max_webhook_endpoints: 10,
        max_storage_mb: 10000,
        max_automations: 50,
    };
    
    println!("🆓 Free Plan:");
    println!("  - Messages: {} per month", free_limits.max_messages_per_month);
    println!("  - Contacts: {}", free_limits.max_contacts);
    println!("  - Users: {}", free_limits.max_users);
    
    println!("⭐ Pro Plan:");
    println!("  - Messages: {} per month", pro_limits.max_messages_per_month);
    println!("  - Contacts: {}", pro_limits.max_contacts);
    println!("  - Users: {}", pro_limits.max_users);
}

/// Example: Security features demonstration
fn example_security_features() {
    println!("🔐 Security Features:");
    
    // 1. Data isolation per tenant
    println!("1. ✅ Complete data isolation per tenant");
    
    // 2. Role-based access control
    println!("2. ✅ Role-based permissions (Owner, Admin, Manager, User, ReadOnly)");
    
    // 3. API key management
    println!("3. ✅ Secure API keys with expiration and permissions");
    
    // 4. IP whitelisting
    println!("4. ✅ IP address whitelisting per tenant");
    
    // 5. Data encryption
    println!("5. ✅ Per-tenant encryption keys");
    
    // 6. Webhook security
    println!("6. ✅ Unique webhook secrets per tenant");
    
    // 7. Rate limiting
    println!("7. ✅ Rate limiting per tenant based on plan");
}

/// Main example function - demonstrates the complete workflow
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 PyTake Multi-Tenant System Examples\n");
    
    // 1. Create a new tenant
    println!("=== Creating New Tenant ===");
    let tenant_response = example_create_free_tenant().await?;
    let tenant_id = tenant_response.tenant.id;
    
    // 2. Add users to tenant
    println!("\n=== Adding Users ===");
    let _user = example_add_tenant_user(tenant_id).await?;
    
    // 3. Create API keys
    println!("\n=== Creating API Keys ===");
    let _api_key = example_create_api_key(tenant_id).await?;
    
    // 4. Check usage metrics
    println!("\n=== Usage Metrics ===");
    let _metrics = example_get_usage_metrics(tenant_id).await?;
    
    // 5. Get billing information
    println!("\n=== Billing Information ===");
    let _billing = example_get_billing_info(tenant_id).await?;
    
    // 6. Upgrade plan
    println!("\n=== Upgrading Plan ===");
    let _upgraded = example_upgrade_tenant(tenant_id).await?;
    
    // 7. Demonstrate context usage
    println!("\n=== Tenant Context Usage ===");
    example_tenant_context_usage();
    
    // 8. Show middleware examples
    println!("\n=== Middleware Usage ===");
    example_middleware_usage().await;
    
    // 9. Plan comparison
    println!("\n=== Plan Comparison ===");
    example_plan_comparison();
    
    // 10. Security features
    println!("\n=== Security Features ===");
    example_security_features();
    
    println!("\n✅ All examples completed successfully!");
    
    Ok(())
}

/// HTTP Client Examples for API endpoints
mod http_examples {
    use serde_json::json;
    
    /// Example HTTP requests for the multi-tenant API endpoints
    pub fn example_http_requests() {
        println!("📡 HTTP API Examples:");
        
        println!("1. Create Tenant:");
        println!("POST /api/v1/tenants");
        println!("{}", json!({
            "name": "Acme Corp",
            "subdomain": "acme",
            "plan": "Pro",
            "owner_email": "owner@acme.com",
            "owner_name": "John Doe",
            "company_size": "10-50",
            "use_case": "Customer Support"
        }));
        
        println!("\n2. Add User to Tenant:");
        println!("POST /api/v1/tenants/{tenant_id}/users");
        println!("{}", json!({
            "email": "manager@acme.com",
            "name": "Jane Smith",
            "role": "Manager",
            "permissions": ["ManageWhatsApp", "ViewAnalytics"],
            "send_invite": true
        }));
        
        println!("\n3. Create API Key:");
        println!("POST /api/v1/tenants/{tenant_id}/api-keys");
        println!("{}", json!({
            "name": "WhatsApp Integration",
            "permissions": ["whatsapp.send", "whatsapp.receive"],
            "rate_limit": 1000,
            "expires_in_days": 365
        }));
        
        println!("\n4. Upgrade Plan:");
        println!("POST /api/v1/tenants/{tenant_id}/upgrade");
        println!("{}", json!({
            "new_plan": "Enterprise",
            "billing_cycle": "Yearly",
            "payment_method": "card_1234567890"
        }));
        
        println!("\n5. Get Usage Metrics:");
        println!("GET /api/v1/tenants/{tenant_id}/usage?period_days=30");
        
        println!("\n6. Get Billing Info:");
        println!("GET /api/v1/tenants/{tenant_id}/billing");
    }
}

/// cURL Examples for testing the API
mod curl_examples {
    pub fn example_curl_commands() {
        println!("🌐 cURL Examples:");
        
        println!("1. Create Tenant:");
        println!(r#"curl -X POST http://localhost:8080/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{{
    "name": "Acme Corp",
    "subdomain": "acme",
    "plan": "Pro",
    "owner_email": "owner@acme.com",
    "owner_name": "John Doe"
  }}'"#);
        
        println!("\n2. Get Tenant (with auth):");
        println!(r#"curl -X GET http://localhost:8080/api/v1/tenants/{tenant_id} \
  -H "Authorization: Bearer {jwt_token}" \
  -H "X-Tenant-ID: {tenant_id}""#);
        
        println!("\n3. API Key Request:");
        println!(r#"curl -X GET http://localhost:8080/api/v1/whatsapp/send \
  -H "Authorization: Bearer pk_1234567890abcdef" \
  -H "Content-Type: application/json""#);
        
        println!("\n4. Subdomain Request:");
        println!("curl -X GET http://acme.api.pytake.com/api/v1/dashboard");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_tenant_context_permissions() {
        let context = TenantContext {
            tenant_id: Uuid::new_v4(),
            tenant: create_test_tenant(),
            user_id: Some(Uuid::new_v4()),
            user_role: Some(TenantRole::Admin),
            api_key_id: None,
            permissions: vec![Permission::ManageUsers, Permission::ManageBilling],
        };
        
        assert!(context.is_admin());
        assert!(context.can_manage_users());
        assert!(context.can_manage_billing());
        assert!(context.has_permission(&Permission::ManageUsers));
    }
    
    #[tokio::test]
    async fn test_plan_limits() {
        let tenant_service = TenantService;
        let free_limits = tenant_service.get_plan_limits(&TenantPlan::Free);
        let pro_limits = tenant_service.get_plan_limits(&TenantPlan::Pro);
        
        assert!(pro_limits.max_messages_per_month > free_limits.max_messages_per_month);
        assert!(pro_limits.max_users > free_limits.max_users);
        assert!(pro_limits.max_api_calls_per_minute > free_limits.max_api_calls_per_minute);
    }
    
    fn create_test_tenant() -> Tenant {
        Tenant {
            id: Uuid::new_v4(),
            name: "Test Tenant".to_string(),
            subdomain: "test".to_string(),
            plan: TenantPlan::Pro,
            status: TenantStatus::Active,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            limits: TenantLimits {
                max_messages_per_month: 100000,
                max_contacts: 10000,
                max_users: 20,
                max_api_calls_per_minute: 1000,
                max_webhook_endpoints: 10,
                max_storage_mb: 10000,
                max_automations: 50,
            },
            settings: TenantSettings {
                timezone: "UTC".to_string(),
                language: "en".to_string(),
                webhook_secret: "test_secret".to_string(),
                custom_domain: None,
                sso_enabled: false,
                two_factor_required: false,
                ip_whitelist: vec![],
                data_retention_days: 365,
                encryption_key: "test_key".to_string(),
            },
            billing_info: BillingInfo {
                plan_price: 99.0,
                billing_cycle: BillingCycle::Monthly,
                next_billing_date: Utc::now() + chrono::Duration::days(30),
                payment_method: Some("test_payment".to_string()),
                discount_percent: 0.0,
                trial_end_date: None,
                usage_overage: 0.0,
            },
        }
    }
}