use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Projects::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Projects::OwnerName).string().not_null())
                    .col(ColumnDef::new(Projects::ProjectName).string().not_null())
                    .col(ColumnDef::new(Projects::Overview).text().not_null())
                    .col(ColumnDef::new(Projects::ProjectScope).string().not_null())
                    .primary_key(
                        Index::create()
                            .name("pk-projects")
                            .col(Projects::OwnerName)
                            .col(Projects::ProjectName),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Issues::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Issues::OwnerName).string().not_null())
                    .col(ColumnDef::new(Issues::ProjectName).string().not_null())
                    .col(ColumnDef::new(Issues::IssueNumber).big_integer().not_null())
                    .col(ColumnDef::new(Issues::Title).string().not_null())
                    .col(ColumnDef::new(Issues::State).string().not_null())
                    .primary_key(
                        Index::create()
                            .name("pk-issues")
                            .col(Issues::OwnerName)
                            .col(Issues::ProjectName)
                            .col(Issues::IssueNumber),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Issues::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Projects::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Projects {
    Table,
    OwnerName,
    ProjectName,
    Overview,
    ProjectScope,
}

#[derive(DeriveIden)]
enum Issues {
    Table,
    OwnerName,
    ProjectName,
    IssueNumber,
    Title,
    State,
}
