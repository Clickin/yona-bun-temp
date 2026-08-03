use sea_orm_migration::prelude::*;
use yoram_persistence_entities::pull_request;

/// Mirrors the legacy `uq_issue_1`/`uq_posting_1` guarantees for
/// `pull_request(to_project_id, number)`, which the legacy schema never had.
/// The number-allocation path (next_pull_request_number) relies on this unique
/// index to resolve concurrent-allocation conflicts via retry.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_index(
                Index::create()
                    .name("uq_pull_request_1")
                    .table(pull_request::Entity)
                    .col(pull_request::Column::ToProjectId)
                    .col(pull_request::Column::Number)
                    .unique()
                    .if_not_exists()
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("uq_pull_request_1")
                    .table(pull_request::Entity)
                    .to_owned(),
            )
            .await
    }
}
