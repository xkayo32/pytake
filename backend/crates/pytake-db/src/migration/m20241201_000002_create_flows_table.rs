use sea_orm_migration::prelude::*;
use sea_orm_migration::prelude::extension::postgres::Type;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create flow_status enum
        manager
            .create_type(
                Type::create()
                    .as_enum(FlowStatus::Table)
                    .values([FlowStatus::Draft, FlowStatus::Active, FlowStatus::Paused, FlowStatus::Archived])
                    .to_owned(),
            )
            .await?;

        // Create flows table
        manager
            .create_table(
                Table::create()
                    .table(Flows::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Flows::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Flows::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Flows::Name).string().not_null())
                    .col(ColumnDef::new(Flows::Description).text())
                    .col(
                        ColumnDef::new(Flows::Status)
                            .enumeration(FlowStatus::Table, [FlowStatus::Draft, FlowStatus::Active, FlowStatus::Paused, FlowStatus::Archived])
                            .not_null()
                            .default("draft"),
                    )
                    .col(
                        ColumnDef::new(Flows::Trigger)
                            .json()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Flows::Actions)
                            .json()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Flows::Metadata)
                            .json()
                            .not_null()
                            .default("{}"),
                    )
                    .col(
                        ColumnDef::new(Flows::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Flows::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_flows_user_id")
                            .from(Flows::Table, Flows::UserId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on user_id
        manager
            .create_index(
                Index::create()
                    .name("idx_flows_user_id")
                    .table(Flows::Table)
                    .col(Flows::UserId)
                    .to_owned(),
            )
            .await?;

        // Create index on status
        manager
            .create_index(
                Index::create()
                    .name("idx_flows_status")
                    .table(Flows::Table)
                    .col(Flows::Status)
                    .to_owned(),
            )
            .await?;

        // Create index on name for searching
        manager
            .create_index(
                Index::create()
                    .name("idx_flows_name")
                    .table(Flows::Table)
                    .col(Flows::Name)
                    .to_owned(),
            )
            .await?;

        // Create composite index on user_id and status
        manager
            .create_index(
                Index::create()
                    .name("idx_flows_user_id_status")
                    .table(Flows::Table)
                    .col(Flows::UserId)
                    .col(Flows::Status)
                    .to_owned(),
            )
            .await?;

        // Create index on created_at
        manager
            .create_index(
                Index::create()
                    .name("idx_flows_created_at")
                    .table(Flows::Table)
                    .col(Flows::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes
        manager
            .drop_index(Index::drop().name("idx_flows_created_at").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_flows_user_id_status").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_flows_name").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_flows_status").to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_flows_user_id").to_owned())
            .await?;

        // Drop table
        manager
            .drop_table(Table::drop().table(Flows::Table).to_owned())
            .await?;

        // Drop enum
        manager
            .drop_type(Type::drop().name(FlowStatus::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Flows {
    Table,
    Id,
    UserId,
    Name,
    Description,
    Status,
    Trigger,
    Actions,
    Metadata,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum FlowStatus {
    Table,
    Draft,
    Active,
    Paused,
    Archived,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}