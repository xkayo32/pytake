use sea_orm_migration::prelude::*;
use sea_orm_migration::prelude::extension::postgres::Type;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create user_role enum
        manager
            .create_type(
                Type::create()
                    .as_enum(UserRole::Table)
                    .values([UserRole::Admin, UserRole::User])
                    .to_owned(),
            )
            .await?;

        // Create user_status enum
        manager
            .create_type(
                Type::create()
                    .as_enum(UserStatus::Table)
                    .values([UserStatus::Active, UserStatus::Inactive, UserStatus::Suspended])
                    .to_owned(),
            )
            .await?;

        // Create users table
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
                    .col(
                        ColumnDef::new(Users::Email)
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Users::Name).string().not_null())
                    .col(
                        ColumnDef::new(Users::Role)
                            .enumeration(UserRole::Table, [UserRole::Admin, UserRole::User])
                            .not_null()
                            .default("user"),
                    )
                    .col(
                        ColumnDef::new(Users::Status)
                            .enumeration(UserStatus::Table, [UserStatus::Active, UserStatus::Inactive, UserStatus::Suspended])
                            .not_null()
                            .default("active"),
                    )
                    .col(
                        ColumnDef::new(Users::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Users::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on email
        manager
            .create_index(
                Index::create()
                    .name("idx_users_email")
                    .table(Users::Table)
                    .col(Users::Email)
                    .to_owned(),
            )
            .await?;

        // Create index on role
        manager
            .create_index(
                Index::create()
                    .name("idx_users_role")
                    .table(Users::Table)
                    .col(Users::Role)
                    .to_owned(),
            )
            .await?;

        // Create index on status
        manager
            .create_index(
                Index::create()
                    .name("idx_users_status")
                    .table(Users::Table)
                    .col(Users::Status)
                    .to_owned(),
            )
            .await?;

        // Create index on created_at
        manager
            .create_index(
                Index::create()
                    .name("idx_users_created_at")
                    .table(Users::Table)
                    .col(Users::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes
        manager
            .drop_index(Index::drop().name("idx_users_created_at").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_users_status").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_users_role").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_users_email").to_owned())
            .await?;

        // Drop table
        manager
            .drop_table(Table::drop().table(Users::Table).to_owned())
            .await?;

        // Drop enums
        manager
            .drop_type(Type::drop().name(UserStatus::Table).to_owned())
            .await?;
        manager
            .drop_type(Type::drop().name(UserRole::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
    Email,
    Name,
    Role,
    Status,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum UserRole {
    Table,
    Admin,
    User,
}

#[derive(Iden)]
enum UserStatus {
    Table,
    Active,
    Inactive,
    Suspended,
}