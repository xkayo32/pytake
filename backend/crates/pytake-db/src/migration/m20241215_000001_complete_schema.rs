use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create custom types (Note: SeaORM doesn't directly support ENUM creation, we'll use strings)
        
        // Organizations table
        manager
            .create_table(
                Table::create()
                    .table(Organizations::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Organizations::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Organizations::Name).string().not_null())
                    .col(
                        ColumnDef::new(Organizations::Slug)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Organizations::Settings).json().default("{}"))
                    .col(ColumnDef::new(Organizations::IsActive).boolean().default(true))
                    .col(
                        ColumnDef::new(Organizations::CreatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Organizations::UpdatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Users table with organization reference
        manager
            .create_table(
                Table::create()
                    .table(Users::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Users::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Users::OrganizationId).uuid())
                    .col(
                        ColumnDef::new(Users::Email)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(Users::Username)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Users::PasswordHash).string().not_null())
                    .col(ColumnDef::new(Users::FullName).string())
                    .col(ColumnDef::new(Users::Role).string().not_null().default("agent"))
                    .col(ColumnDef::new(Users::Status).string().not_null().default("active"))
                    .col(ColumnDef::new(Users::AvatarUrl).string())
                    .col(ColumnDef::new(Users::LastLoginAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(Users::Settings).json().default("{}"))
                    .col(
                        ColumnDef::new(Users::CreatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Users::UpdatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_users_organization")
                            .from(Users::Table, Users::OrganizationId)
                            .to(Organizations::Table, Organizations::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for users
        manager
            .create_index(
                Index::create()
                    .name("idx_users_organization")
                    .table(Users::Table)
                    .col(Users::OrganizationId)
                    .to_owned(),
            )
            .await?;

        // Contacts table
        manager
            .create_table(
                Table::create()
                    .table(Contacts::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Contacts::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Contacts::OrganizationId).uuid().not_null())
                    .col(ColumnDef::new(Contacts::PhoneNumber).string().not_null())
                    .col(ColumnDef::new(Contacts::Name).string())
                    .col(ColumnDef::new(Contacts::Email).string())
                    .col(ColumnDef::new(Contacts::AvatarUrl).string())
                    .col(ColumnDef::new(Contacts::Platform).string().not_null().default("whatsapp"))
                    .col(ColumnDef::new(Contacts::PlatformId).string())
                    .col(ColumnDef::new(Contacts::Tags).array(ColumnType::String(None)))
                    .col(ColumnDef::new(Contacts::CustomFields).json().default("{}"))
                    .col(ColumnDef::new(Contacts::Notes).text())
                    .col(ColumnDef::new(Contacts::IsBlocked).boolean().default(false))
                    .col(ColumnDef::new(Contacts::LastMessageAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Contacts::CreatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Contacts::UpdatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_contacts_organization")
                            .from(Contacts::Table, Contacts::OrganizationId)
                            .to(Organizations::Table, Organizations::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Add unique constraint for contacts
        manager
            .create_index(
                Index::create()
                    .unique()
                    .name("idx_contacts_unique")
                    .table(Contacts::Table)
                    .col(Contacts::OrganizationId)
                    .col(Contacts::PhoneNumber)
                    .col(Contacts::Platform)
                    .to_owned(),
            )
            .await?;

        // Conversations table
        manager
            .create_table(
                Table::create()
                    .table(Conversations::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Conversations::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Conversations::OrganizationId).uuid().not_null())
                    .col(ColumnDef::new(Conversations::ContactId).uuid().not_null())
                    .col(ColumnDef::new(Conversations::AssignedUserId).uuid())
                    .col(ColumnDef::new(Conversations::Status).string().not_null().default("active"))
                    .col(ColumnDef::new(Conversations::Platform).string().not_null())
                    .col(ColumnDef::new(Conversations::PlatformConversationId).string())
                    .col(ColumnDef::new(Conversations::UnreadCount).integer().default(0))
                    .col(ColumnDef::new(Conversations::Tags).array(ColumnType::String(None)))
                    .col(ColumnDef::new(Conversations::Metadata).json().default("{}"))
                    .col(ColumnDef::new(Conversations::LastMessageAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(Conversations::ResolvedAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Conversations::CreatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Conversations::UpdatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_conversations_organization")
                            .from(Conversations::Table, Conversations::OrganizationId)
                            .to(Organizations::Table, Organizations::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_conversations_contact")
                            .from(Conversations::Table, Conversations::ContactId)
                            .to(Contacts::Table, Contacts::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_conversations_assigned_user")
                            .from(Conversations::Table, Conversations::AssignedUserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Messages table
        manager
            .create_table(
                Table::create()
                    .table(Messages::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Messages::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Messages::ConversationId).uuid().not_null())
                    .col(ColumnDef::new(Messages::ContactId).uuid().not_null())
                    .col(ColumnDef::new(Messages::UserId).uuid())
                    .col(ColumnDef::new(Messages::PlatformMessageId).string().unique_key())
                    .col(ColumnDef::new(Messages::Direction).string().not_null())
                    .col(ColumnDef::new(Messages::Status).string().not_null().default("pending"))
                    .col(ColumnDef::new(Messages::Content).text())
                    .col(ColumnDef::new(Messages::MediaType).string())
                    .col(ColumnDef::new(Messages::MediaUrl).text())
                    .col(ColumnDef::new(Messages::ReplyToMessageId).uuid())
                    .col(ColumnDef::new(Messages::Metadata).json().default("{}"))
                    .col(ColumnDef::new(Messages::ErrorMessage).text())
                    .col(ColumnDef::new(Messages::SentAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(Messages::DeliveredAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(Messages::ReadAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Messages::CreatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_messages_conversation")
                            .from(Messages::Table, Messages::ConversationId)
                            .to(Conversations::Table, Conversations::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_messages_contact")
                            .from(Messages::Table, Messages::ContactId)
                            .to(Contacts::Table, Contacts::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_messages_user")
                            .from(Messages::Table, Messages::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Media files table
        manager
            .create_table(
                Table::create()
                    .table(MediaFiles::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(MediaFiles::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(MediaFiles::OrganizationId).uuid().not_null())
                    .col(ColumnDef::new(MediaFiles::UploadedBy).uuid().not_null())
                    .col(ColumnDef::new(MediaFiles::FileName).string().not_null())
                    .col(ColumnDef::new(MediaFiles::OriginalName).string().not_null())
                    .col(ColumnDef::new(MediaFiles::FilePath).string().not_null())
                    .col(ColumnDef::new(MediaFiles::PublicUrl).string())
                    .col(ColumnDef::new(MediaFiles::ThumbnailUrl).string())
                    .col(ColumnDef::new(MediaFiles::MimeType).string().not_null())
                    .col(ColumnDef::new(MediaFiles::FileSize).big_integer().not_null())
                    .col(ColumnDef::new(MediaFiles::FileHash).string().not_null())
                    .col(ColumnDef::new(MediaFiles::MediaType).string().not_null())
                    .col(ColumnDef::new(MediaFiles::FolderPath).string())
                    .col(ColumnDef::new(MediaFiles::Tags).array(ColumnType::String(None)))
                    .col(ColumnDef::new(MediaFiles::Description).text())
                    .col(ColumnDef::new(MediaFiles::Metadata).json().default("{}"))
                    .col(ColumnDef::new(MediaFiles::UsageCount).integer().default(0))
                    .col(ColumnDef::new(MediaFiles::LastUsedAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(MediaFiles::CreatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(MediaFiles::UpdatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_media_files_organization")
                            .from(MediaFiles::Table, MediaFiles::OrganizationId)
                            .to(Organizations::Table, Organizations::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_media_files_uploaded_by")
                            .from(MediaFiles::Table, MediaFiles::UploadedBy)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Templates table
        manager
            .create_table(
                Table::create()
                    .table(Templates::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Templates::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Templates::OrganizationId).uuid().not_null())
                    .col(ColumnDef::new(Templates::CreatedBy).uuid().not_null())
                    .col(ColumnDef::new(Templates::Name).string().not_null())
                    .col(ColumnDef::new(Templates::Content).text().not_null())
                    .col(ColumnDef::new(Templates::Category).string().not_null().default("general"))
                    .col(ColumnDef::new(Templates::Shortcut).string())
                    .col(ColumnDef::new(Templates::Language).string().default("pt-BR"))
                    .col(ColumnDef::new(Templates::Variables).json().default("[]"))
                    .col(ColumnDef::new(Templates::IsActive).boolean().default(true))
                    .col(ColumnDef::new(Templates::UsageCount).integer().default(0))
                    .col(ColumnDef::new(Templates::Tags).array(ColumnType::String(None)))
                    .col(ColumnDef::new(Templates::Attachments).array(ColumnType::String(None)))
                    .col(
                        ColumnDef::new(Templates::CreatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Templates::UpdatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_templates_organization")
                            .from(Templates::Table, Templates::OrganizationId)
                            .to(Organizations::Table, Organizations::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_templates_created_by")
                            .from(Templates::Table, Templates::CreatedBy)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Add unique constraint for template shortcuts
        manager
            .create_index(
                Index::create()
                    .unique()
                    .name("idx_templates_shortcut_unique")
                    .table(Templates::Table)
                    .col(Templates::OrganizationId)
                    .col(Templates::Shortcut)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order of dependencies
        manager.drop_table(Table::drop().table(Templates::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(MediaFiles::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Messages::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Conversations::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Contacts::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Users::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Organizations::Table).to_owned()).await?;
        
        Ok(())
    }
}

// Define table identifiers
#[derive(Iden)]
enum Organizations {
    Table,
    Id,
    Name,
    Slug,
    Settings,
    IsActive,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
    OrganizationId,
    Email,
    Username,
    PasswordHash,
    FullName,
    Role,
    Status,
    AvatarUrl,
    LastLoginAt,
    Settings,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Contacts {
    Table,
    Id,
    OrganizationId,
    PhoneNumber,
    Name,
    Email,
    AvatarUrl,
    Platform,
    PlatformId,
    Tags,
    CustomFields,
    Notes,
    IsBlocked,
    LastMessageAt,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Conversations {
    Table,
    Id,
    OrganizationId,
    ContactId,
    AssignedUserId,
    Status,
    Platform,
    PlatformConversationId,
    UnreadCount,
    Tags,
    Metadata,
    LastMessageAt,
    ResolvedAt,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Messages {
    Table,
    Id,
    ConversationId,
    ContactId,
    UserId,
    PlatformMessageId,
    Direction,
    Status,
    Content,
    MediaType,
    MediaUrl,
    ReplyToMessageId,
    Metadata,
    ErrorMessage,
    SentAt,
    DeliveredAt,
    ReadAt,
    CreatedAt,
}

#[derive(Iden)]
enum MediaFiles {
    Table,
    Id,
    OrganizationId,
    UploadedBy,
    FileName,
    OriginalName,
    FilePath,
    PublicUrl,
    ThumbnailUrl,
    MimeType,
    FileSize,
    FileHash,
    MediaType,
    FolderPath,
    Tags,
    Description,
    Metadata,
    UsageCount,
    LastUsedAt,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Templates {
    Table,
    Id,
    OrganizationId,
    CreatedBy,
    Name,
    Content,
    Category,
    Shortcut,
    Language,
    Variables,
    IsActive,
    UsageCount,
    Tags,
    Attachments,
    CreatedAt,
    UpdatedAt,
}