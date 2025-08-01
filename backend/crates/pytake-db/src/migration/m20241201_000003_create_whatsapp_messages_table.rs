use sea_orm_migration::prelude::*;
use sea_orm_migration::prelude::extension::postgres::Type;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create message_type enum
        manager
            .create_type(
                Type::create()
                    .as_enum(MessageType::Table)
                    .values([
                        MessageType::Text,
                        MessageType::Image,
                        MessageType::Document,
                        MessageType::Audio,
                        MessageType::Video,
                        MessageType::Location,
                        MessageType::Contact,
                        MessageType::Template,
                    ])
                    .to_owned(),
            )
            .await?;

        // Create message_status enum
        manager
            .create_type(
                Type::create()
                    .as_enum(MessageStatus::Table)
                    .values([
                        MessageStatus::Pending,
                        MessageStatus::Sent,
                        MessageStatus::Delivered,
                        MessageStatus::Read,
                        MessageStatus::Failed,
                    ])
                    .to_owned(),
            )
            .await?;

        // Create message_direction enum
        manager
            .create_type(
                Type::create()
                    .as_enum(MessageDirection::Table)
                    .values([MessageDirection::Inbound, MessageDirection::Outbound])
                    .to_owned(),
            )
            .await?;

        // Create whatsapp_messages table
        manager
            .create_table(
                Table::create()
                    .table(WhatsappMessages::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(WhatsappMessages::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::FlowId)
                            .uuid(),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::FromNumber)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::ToNumber)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::MessageType)
                            .enumeration(
                                MessageType::Table,
                                [
                                    MessageType::Text,
                                    MessageType::Image,
                                    MessageType::Document,
                                    MessageType::Audio,
                                    MessageType::Video,
                                    MessageType::Location,
                                    MessageType::Contact,
                                    MessageType::Template,
                                ]
                            )
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::Content)
                            .json()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::Status)
                            .enumeration(
                                MessageStatus::Table,
                                [
                                    MessageStatus::Pending,
                                    MessageStatus::Sent,
                                    MessageStatus::Delivered,
                                    MessageStatus::Read,
                                    MessageStatus::Failed,
                                ]
                            )
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::Direction)
                            .enumeration(
                                MessageDirection::Table,
                                [MessageDirection::Inbound, MessageDirection::Outbound]
                            )
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::Metadata)
                            .json()
                            .not_null()
                            .default("{}"),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(WhatsappMessages::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_whatsapp_messages_user_id")
                            .from(WhatsappMessages::Table, WhatsappMessages::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_whatsapp_messages_flow_id")
                            .from(WhatsappMessages::Table, WhatsappMessages::FlowId)
                            .to(Flows::Table, Flows::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on user_id
        manager
            .create_index(
                Index::create()
                    .name("idx_whatsapp_messages_user_id")
                    .table(WhatsappMessages::Table)
                    .col(WhatsappMessages::UserId)
                    .to_owned(),
            )
            .await?;

        // Create index on flow_id
        manager
            .create_index(
                Index::create()
                    .name("idx_whatsapp_messages_flow_id")
                    .table(WhatsappMessages::Table)
                    .col(WhatsappMessages::FlowId)
                    .to_owned(),
            )
            .await?;

        // Create index on from_number
        manager
            .create_index(
                Index::create()
                    .name("idx_whatsapp_messages_from_number")
                    .table(WhatsappMessages::Table)
                    .col(WhatsappMessages::FromNumber)
                    .to_owned(),
            )
            .await?;

        // Create index on to_number
        manager
            .create_index(
                Index::create()
                    .name("idx_whatsapp_messages_to_number")
                    .table(WhatsappMessages::Table)
                    .col(WhatsappMessages::ToNumber)
                    .to_owned(),
            )
            .await?;

        // Create index on status
        manager
            .create_index(
                Index::create()
                    .name("idx_whatsapp_messages_status")
                    .table(WhatsappMessages::Table)
                    .col(WhatsappMessages::Status)
                    .to_owned(),
            )
            .await?;

        // Create index on direction
        manager
            .create_index(
                Index::create()
                    .name("idx_whatsapp_messages_direction")
                    .table(WhatsappMessages::Table)
                    .col(WhatsappMessages::Direction)
                    .to_owned(),
            )
            .await?;

        // Create index on created_at
        manager
            .create_index(
                Index::create()
                    .name("idx_whatsapp_messages_created_at")
                    .table(WhatsappMessages::Table)
                    .col(WhatsappMessages::CreatedAt)
                    .to_owned(),
            )
            .await?;

        // Create composite index for conversation queries
        manager
            .create_index(
                Index::create()
                    .name("idx_whatsapp_messages_conversation")
                    .table(WhatsappMessages::Table)
                    .col(WhatsappMessages::FromNumber)
                    .col(WhatsappMessages::ToNumber)
                    .col(WhatsappMessages::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes
        manager
            .drop_index(Index::drop().name("idx_whatsapp_messages_conversation").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_whatsapp_messages_created_at").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_whatsapp_messages_direction").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_whatsapp_messages_status").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_whatsapp_messages_to_number").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_whatsapp_messages_from_number").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_whatsapp_messages_flow_id").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_whatsapp_messages_user_id").to_owned())
            .await?;

        // Drop table
        manager
            .drop_table(Table::drop().table(WhatsappMessages::Table).to_owned())
            .await?;

        // Drop enums
        manager
            .drop_type(Type::drop().name(MessageDirection::Table).to_owned())
            .await?;
        manager
            .drop_type(Type::drop().name(MessageStatus::Table).to_owned())
            .await?;
        manager
            .drop_type(Type::drop().name(MessageType::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum WhatsappMessages {
    Table,
    Id,
    UserId,
    FlowId,
    FromNumber,
    ToNumber,
    MessageType,
    Content,
    Status,
    Direction,
    Metadata,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum MessageType {
    Table,
    Text,
    Image,
    Document,
    Audio,
    Video,
    Location,
    Contact,
    Template,
}

#[derive(Iden)]
enum MessageStatus {
    Table,
    Pending,
    Sent,
    Delivered,
    Read,
    Failed,
}

#[derive(Iden)]
enum MessageDirection {
    Table,
    Inbound,
    Outbound,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}

#[derive(Iden)]
enum Flows {
    Table,
    Id,
}