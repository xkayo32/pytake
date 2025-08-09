use actix_web::{web, HttpResponse, Result};
use async_graphql::{
    Context, Object, Subscription, Schema, SimpleObject, InputObject, Enum,
    ID, FieldResult,
};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use chrono::{DateTime, Utc};
use futures::stream::Stream;
use async_stream;
use tracing::info;
use uuid::Uuid;

// =============================================================================
// Basic GraphQL Types
// =============================================================================

type DateTimeUtc = DateTime<Utc>;

#[derive(SimpleObject)]
pub struct BasicCustomer {
    pub id: ID,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub status: String,
    pub created_at: DateTimeUtc,
}

#[derive(SimpleObject)]
pub struct BasicMessage {
    pub id: ID,
    pub conversation_id: ID,
    pub content: String,
    pub sender_phone: String,
    pub created_at: DateTimeUtc,
    pub status: String,
}

#[derive(SimpleObject)]
pub struct BasicConversation {
    pub id: ID,
    pub customer_phone: String,
    pub customer_name: Option<String>,
    pub status: String,
    pub created_at: DateTimeUtc,
    pub last_message_at: Option<DateTimeUtc>,
    pub unread_count: i32,
}

#[derive(SimpleObject)]
pub struct BasicCampaign {
    pub id: ID,
    pub name: String,
    pub status: String,
    pub created_at: DateTimeUtc,
    pub sent_count: i32,
    pub delivered_count: i32,
}

#[derive(SimpleObject)]
pub struct SystemHealth {
    pub status: String,
    pub timestamp: DateTimeUtc,
    pub uptime_seconds: i64,
    pub active_connections: i32,
}

// Input types
#[derive(InputObject)]
pub struct SendMessageInput {
    pub conversation_id: ID,
    pub content: String,
}

#[derive(SimpleObject)]
pub struct SendMessageResult {
    pub success: bool,
    pub message_id: Option<ID>,
    pub error: Option<String>,
}

// =============================================================================
// Query Root
// =============================================================================

pub struct Query;

#[Object]
impl Query {
    /// Get basic system health information
    async fn health(&self, ctx: &Context<'_>) -> FieldResult<SystemHealth> {
        info!("GraphQL health check requested");
        
        Ok(SystemHealth {
            status: "healthy".to_string(),
            timestamp: Utc::now(),
            uptime_seconds: 3600, // 1 hour
            active_connections: 150,
        })
    }

    /// Get a customer by ID
    async fn customer(&self, ctx: &Context<'_>, id: ID) -> FieldResult<Option<BasicCustomer>> {
        info!("Fetching customer: {}", id);
        
        // Simulate customer lookup
        Ok(Some(BasicCustomer {
            id,
            name: "João Silva".to_string(),
            email: Some("joao@example.com".to_string()),
            phone: Some("+5561994013828".to_string()),
            status: "active".to_string(),
            created_at: Utc::now(),
        }))
    }

    /// Get all customers
    async fn customers(&self, ctx: &Context<'_>) -> FieldResult<Vec<BasicCustomer>> {
        info!("Fetching all customers");
        
        Ok(vec![
            BasicCustomer {
                id: ID::from("cust_1"),
                name: "João Silva".to_string(),
                email: Some("joao@example.com".to_string()),
                phone: Some("+5561994013828".to_string()),
                status: "active".to_string(),
                created_at: Utc::now(),
            },
            BasicCustomer {
                id: ID::from("cust_2"),
                name: "Maria Santos".to_string(),
                email: Some("maria@example.com".to_string()),
                phone: Some("+5561994013829".to_string()),
                status: "active".to_string(),
                created_at: Utc::now(),
            },
        ])
    }

    /// Get a conversation by ID
    async fn conversation(&self, ctx: &Context<'_>, id: ID) -> FieldResult<Option<BasicConversation>> {
        info!("Fetching conversation: {}", id);
        
        Ok(Some(BasicConversation {
            id,
            customer_phone: "+5561994013828".to_string(),
            customer_name: Some("João Silva".to_string()),
            status: "active".to_string(),
            created_at: Utc::now(),
            last_message_at: Some(Utc::now()),
            unread_count: 2,
        }))
    }

    /// Get all conversations
    async fn conversations(&self, ctx: &Context<'_>) -> FieldResult<Vec<BasicConversation>> {
        info!("Fetching all conversations");
        
        Ok(vec![
            BasicConversation {
                id: ID::from("conv_1"),
                customer_phone: "+5561994013828".to_string(),
                customer_name: Some("João Silva".to_string()),
                status: "active".to_string(),
                created_at: Utc::now(),
                last_message_at: Some(Utc::now()),
                unread_count: 2,
            },
        ])
    }

    /// Get messages for a conversation
    async fn messages(&self, ctx: &Context<'_>, conversation_id: ID) -> FieldResult<Vec<BasicMessage>> {
        info!("Fetching messages for conversation: {}", conversation_id);
        
        Ok(vec![
            BasicMessage {
                id: ID::from("msg_1"),
                conversation_id,
                content: "Olá! Como posso ajudar?".to_string(),
                sender_phone: "+5561994013828".to_string(),
                created_at: Utc::now(),
                status: "delivered".to_string(),
            },
        ])
    }

    /// Get campaigns
    async fn campaigns(&self, ctx: &Context<'_>) -> FieldResult<Vec<BasicCampaign>> {
        info!("Fetching campaigns");
        
        Ok(vec![
            BasicCampaign {
                id: ID::from("campaign_1"),
                name: "Welcome Campaign".to_string(),
                status: "running".to_string(),
                created_at: Utc::now(),
                sent_count: 1000,
                delivered_count: 980,
            },
        ])
    }
}

// =============================================================================
// Mutation Root
// =============================================================================

pub struct Mutation;

#[Object]
impl Mutation {
    /// Send a message to a conversation
    async fn send_message(&self, ctx: &Context<'_>, input: SendMessageInput) -> FieldResult<SendMessageResult> {
        info!("Sending message to conversation: {}", input.conversation_id);
        
        let message_id = ID::from(format!("msg_{}", Uuid::new_v4()));
        
        Ok(SendMessageResult {
            success: true,
            message_id: Some(message_id),
            error: None,
        })
    }
}

// =============================================================================
// Subscription Root
// =============================================================================

pub struct Subscription;

#[Subscription]
impl Subscription {
    /// Subscribe to new messages
    async fn message_received(&self, ctx: &Context<'_>) -> impl Stream<Item = BasicMessage> {
        info!("Starting message subscription");
        
        async_stream::stream! {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(10));
            
            loop {
                interval.tick().await;
                
                yield BasicMessage {
                    id: ID::from(format!("msg_{}", Uuid::new_v4())),
                    conversation_id: ID::from("conv_1"),
                    content: "Nova mensagem recebida!".to_string(),
                    sender_phone: "+5561994013828".to_string(),
                    created_at: Utc::now(),
                    status: "delivered".to_string(),
                };
            }
        }
    }

    /// Subscribe to system health updates
    async fn health_updates(&self, ctx: &Context<'_>) -> impl Stream<Item = SystemHealth> {
        info!("Starting health updates subscription");
        
        async_stream::stream! {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            
            loop {
                interval.tick().await;
                
                yield SystemHealth {
                    status: "healthy".to_string(),
                    timestamp: Utc::now(),
                    uptime_seconds: 3600,
                    active_connections: 150 + (rand::random::<i32>() % 50),
                };
            }
        }
    }
}

// =============================================================================
// Schema and HTTP Handlers
// =============================================================================

pub type MinimalGraphQLSchema = Schema<Query, Mutation, Subscription>;

pub async fn create_minimal_schema() -> MinimalGraphQLSchema {
    Schema::build(Query, Mutation, Subscription)
        .limit_depth(10)
        .limit_complexity(1000)
        .finish()
}

pub async fn graphql_handler(
    schema: web::Data<MinimalGraphQLSchema>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    info!("Processing GraphQL request");
    schema.execute(req.into_inner()).await.into()
}

pub async fn graphql_playground() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(
            r#"
            <!DOCTYPE html>
            <html>
            <head>
                <title>PyTake GraphQL Playground</title>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>
                    body { margin: 0; }
                </style>
                <script src="https://unpkg.com/graphql-playground-react/build/static/js/middleware.js"></script>
            </head>
            <body>
                <div id="root"></div>
                <script>
                    window.addEventListener('load', function (event) {
                        GraphQLPlayground.init(document.getElementById('root'), {
                            endpoint: '/graphql',
                            subscriptionEndpoint: '/graphql/ws',
                            settings: {
                                'request.credentials': 'same-origin',
                            },
                            tabs: [
                                {
                                    endpoint: '/graphql',
                                    query: `# Bem-vindo ao PyTake GraphQL API!
# Este é um sistema GraphQL para automação WhatsApp Business.

# 1. Verificar saúde do sistema
query SystemHealth {
  health {
    status
    timestamp
    uptimeSeconds
    activeConnections
  }
}

# 2. Buscar clientes
query GetCustomers {
  customers {
    id
    name
    email
    phone
    status
    createdAt
  }
}

# 3. Buscar conversas
query GetConversations {
  conversations {
    id
    customerPhone
    customerName
    status
    unreadCount
    lastMessageAt
  }
}

# 4. Buscar mensagens de uma conversa
query GetMessages {
  messages(conversationId: "conv_1") {
    id
    content
    senderPhone
    createdAt
    status
  }
}

# 5. Buscar campanhas
query GetCampaigns {
  campaigns {
    id
    name
    status
    sentCount
    deliveredCount
  }
}`,
                                },
                                {
                                    endpoint: '/graphql',
                                    query: `# Mutations - Operações de escrita

# Enviar mensagem
mutation SendMessage {
  sendMessage(input: {
    conversationId: "conv_1"
    content: "Olá! Esta é uma mensagem enviada via GraphQL."
  }) {
    success
    messageId
    error
  }
}`,
                                },
                                {
                                    endpoint: '/graphql',
                                    query: `# Subscriptions - Tempo real
# Nota: Funciona apenas com WebSocket habilitado

# Escutar novas mensagens
subscription NewMessages {
  messageReceived {
    id
    content
    senderPhone
    createdAt
  }
}

# Monitorar saúde do sistema
subscription HealthMonitor {
  healthUpdates {
    status
    timestamp
    activeConnections
  }
}`,
                                }
                            ]
                        })
                    })
                </script>
            </body>
            </html>
            "#,
        ))
}

pub async fn graphql_subscription_handler(
    schema: web::Data<MinimalGraphQLSchema>,
    req: actix_web::HttpRequest,
    payload: web::Payload,
) -> Result<HttpResponse> {
    GraphQLSubscription::new(Schema::clone(&*schema))
        .start(&req, payload)
}

pub fn configure_minimal_graphql(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/graphql", web::post().to(graphql_handler))
        .route("/graphql", web::get().to(graphql_handler))
        .route("/graphql/playground", web::get().to(graphql_playground))
        .route("/graphql/ws", web::get().to(graphql_subscription_handler));
}

// Example queries for testing
pub mod examples {
    pub const HEALTH_QUERY: &str = r#"
        query SystemHealth {
            health {
                status
                timestamp
                uptimeSeconds
                activeConnections
            }
        }
    "#;

    pub const CUSTOMERS_QUERY: &str = r#"
        query GetCustomers {
            customers {
                id
                name
                email
                phone
                status
                createdAt
            }
        }
    "#;

    pub const SEND_MESSAGE_MUTATION: &str = r#"
        mutation SendMessage($input: SendMessageInput!) {
            sendMessage(input: $input) {
                success
                messageId
                error
            }
        }
    "#;

    pub const MESSAGE_SUBSCRIPTION: &str = r#"
        subscription NewMessages {
            messageReceived {
                id
                content
                senderPhone
                createdAt
            }
        }
    "#;
}