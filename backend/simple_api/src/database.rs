use sea_orm::{Database, DatabaseConnection, ConnectOptions, DbErr, ConnectionTrait, Statement};
use std::time::Duration;
use tracing::info;

pub async fn establish_connection() -> Result<DatabaseConnection, DbErr> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://pytake:pytake123@localhost:5432/pytake".to_string());

    let masked_url = database_url
        .split("@")
        .enumerate()
        .map(|(i, part)| {
            if i == 0 {
                if let Some(idx) = part.rfind(":") {
                    format!("{}:****", &part[..idx])
                } else {
                    part.to_string()
                }
            } else {
                part.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("@");
    info!("Connecting to database: {}", masked_url);

    let mut opt = ConnectOptions::new(database_url);
    opt.max_connections(100)
        .min_connections(5)
        .connect_timeout(Duration::from_secs(8))
        .acquire_timeout(Duration::from_secs(8))
        .idle_timeout(Duration::from_secs(8))
        .max_lifetime(Duration::from_secs(8))
        .sqlx_logging(true)
        .sqlx_logging_level(log::LevelFilter::Info);

    Database::connect(opt).await
}

pub async fn test_connection(db: &DatabaseConnection) -> Result<(), DbErr> {
    let result = db.execute(Statement::from_string(
        sea_orm::DatabaseBackend::Postgres,
        "SELECT 1 as test".to_string(),
    )).await?;
    
    info!("Database connection test successful: {:?}", result);
    Ok(())
}

// User entity for authentication (simplified for simple_api)
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DbUser {
    pub id: uuid::Uuid,
    pub email: String,
    pub full_name: Option<String>,
    pub password_hash: String,
    pub role: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn find_user_by_email(
    db: &DatabaseConnection,
    email: &str,
) -> Result<Option<DbUser>, DbErr> {
    use sea_orm::{Statement, FromQueryResult};

    #[derive(FromQueryResult)]
    struct UserResult {
        id: uuid::Uuid,
        email: String,
        full_name: Option<String>,
        password_hash: String,
        role: String,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let result = UserResult::find_by_statement(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        "SELECT id, email, full_name, password_hash, role::text, created_at FROM users WHERE email = $1",
        vec![email.into()],
    ))
    .one(db)
    .await?;

    Ok(result.map(|user| DbUser {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        password_hash: user.password_hash,
        role: user.role,
        created_at: user.created_at,
    }))
}

pub async fn create_user(
    db: &DatabaseConnection,
    email: &str,
    password_hash: &str,
    full_name: &str,
    role: &str,
) -> Result<DbUser, DbErr> {
    use sea_orm::{Statement, FromQueryResult};

    #[derive(FromQueryResult)]
    struct UserResult {
        id: uuid::Uuid,
        email: String,
        full_name: Option<String>,
        password_hash: String,
        role: String,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let result = UserResult::find_by_statement(Statement::from_sql_and_values(
        sea_orm::DatabaseBackend::Postgres,
        r#"
        INSERT INTO users (organization_id, email, username, password_hash, full_name, role)
        VALUES ('00000000-0000-0000-0000-000000000001', $1, $2, $3, $4, $5::user_role)
        RETURNING id, email, full_name, password_hash, role::text, created_at
        "#,
        vec![
            email.into(),
            email.into(), // Using email as username for simplicity
            password_hash.into(),
            full_name.into(),
            role.into(),
        ],
    ))
    .one(db)
    .await?;

    result.map(|user| DbUser {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        password_hash: user.password_hash,
        role: user.role,
        created_at: user.created_at,
    }).ok_or(DbErr::Custom("Failed to create user".to_string()))
}