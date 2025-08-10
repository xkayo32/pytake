use actix_web::{web, HttpResponse, Result};
use async_graphql::{
    Object, Schema, SimpleObject, InputObject,
    ID, FieldResult,
};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};
use chrono::{DateTime, Utc};
use tracing::info;
use uuid::Uuid;

// =============================================================================
// Simple GraphQL Types
// =============================================================================

#[derive(SimpleObject)]
pub struct SimpleHealth {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub version: String,
}

#[derive(SimpleObject)]
pub struct SimpleCustomer {
    pub id: ID,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
}

#[derive(SimpleObject)]
pub struct SimpleMessage {
    pub id: ID,
    pub content: String,
    pub sender: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(InputObject)]
pub struct SendMessageInput {
    pub phone: String,
    pub content: String,
}

#[derive(SimpleObject)]
pub struct SendMessageResult {
    pub success: bool,
    pub message_id: Option<ID>,
}

// =============================================================================
// Query Root
// =============================================================================

pub struct Query;

#[Object]
impl Query {
    async fn health(&self) -> FieldResult<SimpleHealth> {
        info!("GraphQL health check");
        
        Ok(SimpleHealth {
            status: "healthy".to_string(),
            timestamp: Utc::now(),
            version: "1.0.0".to_string(),
        })
    }

    async fn customers(&self) -> FieldResult<Vec<SimpleCustomer>> {
        info!("Fetching customers");
        
        Ok(vec![
            SimpleCustomer {
                id: ID::from("cust_1"),
                name: "João Silva".to_string(),
                email: Some("joao@example.com".to_string()),
                phone: Some("+5561994013828".to_string()),
            },
        ])
    }

    async fn messages(&self) -> FieldResult<Vec<SimpleMessage>> {
        info!("Fetching messages");
        
        Ok(vec![
            SimpleMessage {
                id: ID::from("msg_1"),
                content: "Olá! Como posso ajudar?".to_string(),
                sender: "+5561994013828".to_string(),
                timestamp: Utc::now(),
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
    async fn send_message(&self, input: SendMessageInput) -> FieldResult<SendMessageResult> {
        info!("Sending message to: {}", input.phone);
        
        Ok(SendMessageResult {
            success: true,
            message_id: Some(ID::from(format!("msg_{}", Uuid::new_v4()))),
        })
    }
}

// =============================================================================
// Schema and Handlers
// =============================================================================

pub type SimpleGraphQLSchema = Schema<Query, Mutation, async_graphql::EmptySubscription>;

pub async fn create_simple_schema() -> SimpleGraphQLSchema {
    Schema::build(Query, Mutation, async_graphql::EmptySubscription)
        .finish()
}

pub async fn graphql_handler(
    schema: web::Data<SimpleGraphQLSchema>,
    req: GraphQLRequest,
) -> GraphQLResponse {
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
                <title>PyTake GraphQL</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .container { max-width: 800px; }
                    .query-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    pre { background: #333; color: #fff; padding: 15px; border-radius: 5px; overflow-x: auto; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🔗 PyTake GraphQL API</h1>
                    <p>API GraphQL para automação WhatsApp Business</p>
                    
                    <div class="query-box">
                        <h3>🔍 Endpoint GraphQL</h3>
                        <p><strong>POST/GET:</strong> <code>/graphql</code></p>
                        <p>Use um cliente GraphQL como GraphiQL, Apollo Studio, ou Insomnia para testar as queries.</p>
                    </div>

                    <div class="query-box">
                        <h3>📊 Exemplo: Health Check</h3>
                        <pre>query {
  health {
    status
    timestamp
    version
  }
}</pre>
                    </div>

                    <div class="query-box">
                        <h3>👥 Exemplo: Listar Clientes</h3>
                        <pre>query {
  customers {
    id
    name
    email
    phone
  }
}</pre>
                    </div>

                    <div class="query-box">
                        <h3>💬 Exemplo: Listar Mensagens</h3>
                        <pre>query {
  messages {
    id
    content
    sender
    timestamp
  }
}</pre>
                    </div>

                    <div class="query-box">
                        <h3>📤 Exemplo: Enviar Mensagem</h3>
                        <pre>mutation {
  sendMessage(input: {
    phone: "+5561994013828"
    content: "Olá! Esta é uma mensagem via GraphQL."
  }) {
    success
    messageId
  }
}</pre>
                    </div>

                    <div class="query-box">
                        <h3>🔗 Recursos Disponíveis</h3>
                        <ul>
                            <li>✅ Health Check</li>
                            <li>✅ Gestão de Clientes</li>
                            <li>✅ Mensagens WhatsApp</li>
                            <li>🔄 Campanhas (em desenvolvimento)</li>
                            <li>🔄 Flows Automáticos (em desenvolvimento)</li>
                            <li>🔄 Analytics (em desenvolvimento)</li>
                        </ul>
                    </div>
                </div>
            </body>
            </html>
            "#,
        ))
}

pub fn configure_simple_graphql(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/graphql", web::post().to(graphql_handler))
        .route("/graphql", web::get().to(graphql_handler))
        .route("/graphql/playground", web::get().to(graphql_playground));
}