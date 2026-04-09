use sea_orm_migration::prelude::*;
use serde::Deserialize;

const MANIFEST_JSON: &str = include_str!("../legacy-final-schema-manifest.json");

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(Deserialize)]
struct LegacySchemaManifest {
    tables: Vec<LegacyTableManifest>,
}

#[derive(Deserialize)]
struct LegacyTableManifest {
    name: String,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        super::entity_schema::create_schema(manager).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        if matches!(manager.get_database_backend(), sea_orm::DbBackend::Sqlite) {
            manager
                .get_connection()
                .execute_unprepared("PRAGMA foreign_keys = OFF;")
                .await?;
        }

        let manifest: LegacySchemaManifest = serde_json::from_str(MANIFEST_JSON)
            .map_err(|error| DbErr::Custom(error.to_string()))?;
        for table in manifest.tables.into_iter().rev() {
            let statement = match manager.get_database_backend() {
                sea_orm::DbBackend::MySql => format!("DROP TABLE IF EXISTS `{}`;", table.name),
                sea_orm::DbBackend::Postgres => {
                    format!("DROP TABLE IF EXISTS \"{}\" CASCADE;", table.name)
                }
                sea_orm::DbBackend::Sqlite => format!("DROP TABLE IF EXISTS `{}`;", table.name),
            };
            manager
                .get_connection()
                .execute_unprepared(&statement)
                .await?;
        }

        if matches!(manager.get_database_backend(), sea_orm::DbBackend::Sqlite) {
            manager
                .get_connection()
                .execute_unprepared("PRAGMA foreign_keys = ON;")
                .await?;
        }

        Ok(())
    }
}
