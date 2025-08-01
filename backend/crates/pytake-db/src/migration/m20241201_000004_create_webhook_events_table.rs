use sea_orm_migration::prelude::*;
use sea_orm_migration::prelude::extension::postgres::Type;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create webhook_event_type enum
        manager
            .create_type(
                Type::create()
                    .as_enum(WebhookEventType::Table)
                    .values([
                        WebhookEventType::MessageReceived,
                        WebhookEventType::MessageStatus,
                        WebhookEventType::AccountUpdate,
                        WebhookEventType::Error,
                    ])
                    .to_owned(),
            )
            .await?;

        // Create webhook_events table
        manager
            .create_table(
                Table::create()
                    .table(WebhookEvents::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(WebhookEvents::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::EventType)
                            .enumeration(
                                WebhookEventType::Table,
                                [
                                    WebhookEventType::MessageReceived,
                                    WebhookEventType::MessageStatus,
                                    WebhookEventType::AccountUpdate,
                                    WebhookEventType::Error,
                                ]
                            )
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::MessageId)
                            .uuid(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::PhoneNumber)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::Payload)
                            .json()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::Processed)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::ProcessedAt)
                            .timestamp_with_time_zone(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::ErrorMessage)
                            .text(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::RetryCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_webhook_events_message_id")
                            .from(WebhookEvents::Table, WebhookEvents::MessageId)
                            .to(WhatsappMessages::Table, WhatsappMessages::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on event_type
        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_event_type")
                    .table(WebhookEvents::Table)
                    .col(WebhookEvents::EventType)
                    .to_owned(),
            )
            .await?;

        // Create index on message_id
        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_message_id")
                    .table(WebhookEvents::Table)
                    .col(WebhookEvents::MessageId)
                    .to_owned(),
            )
            .await?;

        // Create index on phone_number
        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_phone_number")
                    .table(WebhookEvents::Table)
                    .col(WebhookEvents::PhoneNumber)
                    .to_owned(),
            )
            .await?;

        // Create index on processed
        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_processed")
                    .table(WebhookEvents::Table)
                    .col(WebhookEvents::Processed)
                    .to_owned(),
            )
            .await?;

        // Create index on created_at
        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_created_at")
                    .table(WebhookEvents::Table)
                    .col(WebhookEvents::CreatedAt)
                    .to_owned(),
            )
            .await?;

        // Create index on processed_at
        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_processed_at")
                    .table(WebhookEvents::Table)
                    .col(WebhookEvents::ProcessedAt)
                    .to_owned(),
            )
            .await?;

        // Create composite index for unprocessed events
        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_unprocessed")
                    .table(WebhookEvents::Table)
                    .col(WebhookEvents::Processed)
                    .col(WebhookEvents::CreatedAt)
                    .to_owned(),
            )
            .await?;

        // Create composite index for retry logic
        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_retry")
                    .table(WebhookEvents::Table)
                    .col(WebhookEvents::Processed)
                    .col(WebhookEvents::RetryCount)
                    .col(WebhookEvents::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes
        manager
            .drop_index(Index::drop().name("idx_webhook_events_retry").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_webhook_events_unprocessed").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_webhook_events_processed_at").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_webhook_events_created_at").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_webhook_events_processed").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_webhook_events_phone_number").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_webhook_events_message_id").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_webhook_events_event_type").to_owned())
            .await?;

        // Drop table
        manager
            .drop_table(Table::drop().table(WebhookEvents::Table).to_owned())
            .await?;

        // Drop enum
        manager
            .drop_type(Type::drop().name(WebhookEventType::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum WebhookEvents {
    Table,
    Id,
    EventType,
    MessageId,
    PhoneNumber,
    Payload,
    Processed,
    CreatedAt,
    ProcessedAt,
    ErrorMessage,
    RetryCount,
}

#[derive(Iden)]
enum WebhookEventType {
    Table,
    MessageReceived,
    MessageStatus,
    AccountUpdate,
    Error,
}

#[derive(Iden)]
enum WhatsappMessages {
    Table,
    Id,
}