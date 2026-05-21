use sea_orm::{
    ActiveValue, ConnectionTrait, DatabaseConnection, DbBackend, EntityTrait, QueryOrder, Statement,
};
use sea_orm_migration::prelude::*;
use sea_orm_migration::seaql_migrations;
use serde::Deserialize;
use std::str::FromStr;
use std::time::{SystemTime, UNIX_EPOCH};

pub mod entity_schema;
mod m20260409_000001_create_legacy_start_schema;

pub struct Migrator;

const MANIFEST_JSON: &str = include_str!("../legacy-final-schema-manifest.json");
const OPTIONAL_LEGACY_TABLES: &[&str] = &["play_evolutions"];

#[derive(Deserialize)]
struct LegacySchemaManifest {
    tables: Vec<LegacyTableManifest>,
}

#[derive(Deserialize)]
struct LegacyTableManifest {
    name: String,
    #[serde(default)]
    columns: Vec<LegacyColumnManifest>,
}

#[derive(Deserialize)]
struct LegacyColumnManifest {
    name: String,
    nullable: bool,
    #[serde(rename = "primaryKey")]
    primary_key: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RuntimeSchemaPolicy {
    Up,
    Adopt,
    ValidateOnly,
}

impl FromStr for RuntimeSchemaPolicy {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_ascii_lowercase().as_str() {
            "" | "up" => Ok(Self::Up),
            "adopt" => Ok(Self::Adopt),
            "validate_only" | "validate-only" | "validateonly" => Ok(Self::ValidateOnly),
            other => Err(format!(
                "unsupported schema policy `{other}`; expected one of: up, adopt, validate_only"
            )),
        }
    }
}

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(
            m20260409_000001_create_legacy_start_schema::Migration,
        )]
    }
}

impl Migrator {
    pub async fn fresh(db: &DatabaseConnection) -> Result<(), DbErr> {
        <Self as MigratorTrait>::fresh(db).await
    }

    pub async fn ensure_runtime_schema(db: &DatabaseConnection) -> Result<(), DbErr> {
        Self::ensure_runtime_schema_with_policy(db, RuntimeSchemaPolicy::Up).await
    }

    pub async fn ensure_runtime_schema_with_policy(
        db: &DatabaseConnection,
        policy: RuntimeSchemaPolicy,
    ) -> Result<(), DbErr> {
        let inspection = inspect_schema(db).await?;

        match policy {
            RuntimeSchemaPolicy::Up => ensure_up_policy::<Self>(db, &inspection).await,
            RuntimeSchemaPolicy::Adopt => ensure_adopt_policy::<Self>(db, &inspection).await,
            RuntimeSchemaPolicy::ValidateOnly => ensure_validate_only_policy(db, &inspection).await,
        }
    }
}

pub async fn seed_pilot_data<C>(db: &C) -> Result<(), DbErr>
where
    C: ConnectionTrait,
{
    db.execute_unprepared(project_seed_sql(db.get_database_backend()))
        .await?;
    db.execute_unprepared(issue_seed_sql(db.get_database_backend()))
        .await?;

    Ok(())
}

fn project_seed_sql(backend: DbBackend) -> &'static str {
    match backend {
        DbBackend::MySql | DbBackend::Sqlite => {
            "INSERT INTO `project` (`id`, `name`, `overview`, `owner`, `created_date`, `last_issue_number`, `last_posting_number`, `original_project_id`, `last_pushed_date`, `default_reviewer_count`, `is_using_reviewer_count`, `organization_id`, `project_scope`, `previous_owner_login_id`, `previous_name`, `previous_name_changed_time`, `is_code_accessible_member_only`) VALUES (1, 'yona', 'Pilot projects list is using the browser-safe route tree.', 'pilot', NULL, 1, 0, NULL, NULL, 1, 0, NULL, 'public', NULL, NULL, NULL, 0);"
        }
        DbBackend::Postgres => {
            "INSERT INTO \"project\" (\"id\", \"name\", \"overview\", \"owner\", \"created_date\", \"last_issue_number\", \"last_posting_number\", \"original_project_id\", \"last_pushed_date\", \"default_reviewer_count\", \"is_using_reviewer_count\", \"organization_id\", \"project_scope\", \"previous_owner_login_id\", \"previous_name\", \"previous_name_changed_time\", \"is_code_accessible_member_only\") VALUES (1, 'yona', 'Pilot projects list is using the browser-safe route tree.', 'pilot', NULL, 1, 0, NULL, NULL, 1, 0, NULL, 'public', NULL, NULL, NULL, 0);"
        }
    }
}

fn issue_seed_sql(backend: DbBackend) -> &'static str {
    match backend {
        DbBackend::MySql | DbBackend::Sqlite => {
            "INSERT INTO `issue` (`id`, `title`, `body`, `created_date`, `updated_date`, `author_id`, `author_login_id`, `author_name`, `project_id`, `number`, `num_of_comments`, `state`, `due_date`, `milestone_id`, `assignee_id`, `history`, `parent_id`, `weight`, `updated_by_author_id`, `is_draft`) VALUES (1, 'Pilot issue', NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, 0, 0, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0);"
        }
        DbBackend::Postgres => {
            "INSERT INTO \"issue\" (\"id\", \"title\", \"body\", \"created_date\", \"updated_date\", \"author_id\", \"author_login_id\", \"author_name\", \"project_id\", \"number\", \"num_of_comments\", \"state\", \"due_date\", \"milestone_id\", \"assignee_id\", \"history\", \"parent_id\", \"weight\", \"updated_by_author_id\", \"is_draft\") VALUES (1, 'Pilot issue', NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, 0, 0, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0);"
        }
    }
}

fn canonical_table_names() -> Result<Vec<String>, DbErr> {
    let manifest: LegacySchemaManifest =
        serde_json::from_str(MANIFEST_JSON).map_err(|error| DbErr::Custom(error.to_string()))?;
    Ok(manifest
        .tables
        .into_iter()
        .map(|table| table.name)
        .collect())
}

pub fn required_runtime_table_names() -> Result<Vec<String>, DbErr> {
    let optional: std::collections::BTreeSet<&str> =
        OPTIONAL_LEGACY_TABLES.iter().copied().collect();
    Ok(canonical_table_names()?
        .into_iter()
        .filter(|table| !optional.contains(table.as_str()))
        .collect())
}

pub fn optional_legacy_table_names() -> std::collections::BTreeSet<String> {
    OPTIONAL_LEGACY_TABLES
        .iter()
        .map(|table| (*table).to_string())
        .collect()
}

struct SchemaInspection {
    has_migration_table: bool,
    non_migration_tables: std::collections::BTreeSet<String>,
}

#[derive(Debug, PartialEq, Eq)]
struct ActualColumn {
    name: String,
    nullable: bool,
    primary_key: bool,
}

async fn ensure_up_policy<M>(
    db: &DatabaseConnection,
    inspection: &SchemaInspection,
) -> Result<(), DbErr>
where
    M: MigratorTrait + ?Sized,
{
    if !inspection.has_migration_table && !inspection.non_migration_tables.is_empty() {
        return Err(DbErr::Custom(
            "refusing to auto-migrate partially initialized schema without managed migration history".to_string(),
        ));
    }

    if inspection.has_migration_table {
        let applied = applied_migration_versions(db).await?;
        let unsupported = unsupported_migration_versions::<M>(&applied);
        if !unsupported.is_empty() {
            return Err(DbErr::Custom(format!(
                "unsupported existing migration history detected: {}",
                unsupported.join(", ")
            )));
        }

        if applied.is_empty() && !inspection.non_migration_tables.is_empty() {
            return Err(DbErr::Custom(
                "refusing to auto-migrate partially initialized schema with empty migration history".to_string(),
            ));
        }
    }

    <M as MigratorTrait>::up(db, None).await?;
    validate_schema_against_manifest(db).await
}

async fn ensure_adopt_policy<M>(
    db: &DatabaseConnection,
    inspection: &SchemaInspection,
) -> Result<(), DbErr>
where
    M: MigratorTrait + ?Sized,
{
    if inspection.non_migration_tables.is_empty() {
        <M as MigratorTrait>::up(db, None).await?;
        return validate_schema_against_manifest(db).await;
    }

    validate_schema_against_manifest(db).await?;

    let applied = applied_migration_versions(db).await?;
    let unsupported = unsupported_migration_versions::<M>(&applied);
    if !unsupported.is_empty() {
        return Err(DbErr::Custom(format!(
            "unsupported existing migration history detected: {}",
            unsupported.join(", ")
        )));
    }

    mark_current_migrations_applied::<M>(db, &applied).await?;
    Ok(())
}

async fn ensure_validate_only_policy(
    db: &DatabaseConnection,
    inspection: &SchemaInspection,
) -> Result<(), DbErr> {
    if inspection.non_migration_tables.is_empty() {
        return Err(DbErr::Custom(
            "validate-only requires a pre-created schema".to_string(),
        ));
    }

    validate_schema_against_manifest(db).await
}

async fn inspect_schema(db: &DatabaseConnection) -> Result<SchemaInspection, DbErr> {
    let user_tables = list_user_tables(db).await?;
    let has_migration_table = user_tables.iter().any(|table| table == "seaql_migrations");
    let non_migration_tables = user_tables
        .into_iter()
        .filter(|table| table != "seaql_migrations")
        .collect();

    Ok(SchemaInspection {
        has_migration_table,
        non_migration_tables,
    })
}

async fn applied_migration_versions(db: &DatabaseConnection) -> Result<Vec<String>, DbErr> {
    let tables = list_user_tables(db).await?;
    if !tables.iter().any(|table| table == "seaql_migrations") {
        return Ok(Vec::new());
    }

    seaql_migrations::Entity::find()
        .order_by_asc(seaql_migrations::Column::Version)
        .all(db)
        .await
        .map(|models| models.into_iter().map(|model| model.version).collect())
}

fn unsupported_migration_versions<M>(applied_versions: &[String]) -> Vec<String>
where
    M: MigratorTrait + ?Sized,
{
    let current_migrations: std::collections::HashSet<String> = M::migrations()
        .into_iter()
        .map(|migration| migration.name().to_string())
        .collect();
    applied_versions
        .iter()
        .filter(|version| !current_migrations.contains(version.as_str()))
        .cloned()
        .collect()
}

async fn mark_current_migrations_applied<M>(
    db: &DatabaseConnection,
    applied_versions: &[String],
) -> Result<(), DbErr>
where
    M: MigratorTrait + ?Sized,
{
    <M as MigratorTrait>::install(db).await?;
    let existing: std::collections::HashSet<&str> =
        applied_versions.iter().map(String::as_str).collect();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("SystemTime before UNIX EPOCH");

    for migration in M::migrations() {
        if existing.contains(migration.name()) {
            continue;
        }

        seaql_migrations::Entity::insert(seaql_migrations::ActiveModel {
            version: ActiveValue::Set(migration.name().to_owned()),
            applied_at: ActiveValue::Set(now.as_secs() as i64),
        })
        .exec(db)
        .await?;
    }

    Ok(())
}

async fn validate_schema_against_manifest(db: &DatabaseConnection) -> Result<(), DbErr> {
    let manifest: LegacySchemaManifest =
        serde_json::from_str(MANIFEST_JSON).map_err(|error| DbErr::Custom(error.to_string()))?;
    let required_tables: std::collections::BTreeSet<String> =
        required_runtime_table_names()?.into_iter().collect();
    let optional_tables = optional_legacy_table_names();
    let actual_tables: std::collections::BTreeSet<String> = list_user_tables(db)
        .await?
        .into_iter()
        .filter(|table| table != "seaql_migrations")
        .collect();
    let actual_required_tables: std::collections::BTreeSet<String> = actual_tables
        .iter()
        .filter(|table| !optional_tables.contains(*table))
        .cloned()
        .collect();

    if actual_required_tables != required_tables {
        return Err(DbErr::Custom(format!(
            "existing schema tables do not match required runtime tables: expected {:?}, actual {:?}",
            required_tables, actual_required_tables
        )));
    }

    for table in manifest.tables {
        if optional_tables.contains(&table.name) && !actual_tables.contains(&table.name) {
            continue;
        }

        let actual_columns = list_columns(db, &table.name).await?;
        if actual_columns.len() != table.columns.len() {
            return Err(DbErr::Custom(format!(
                "{}: column count mismatch (expected {}, actual {})",
                table.name,
                table.columns.len(),
                actual_columns.len()
            )));
        }

        for expected in table.columns {
            let Some(actual) = actual_columns
                .iter()
                .find(|column| column.name == expected.name)
            else {
                return Err(DbErr::Custom(format!(
                    "{}: missing column {}",
                    table.name, expected.name
                )));
            };

            if actual.nullable != expected.nullable {
                return Err(DbErr::Custom(format!(
                    "{}.{}: nullable mismatch",
                    table.name, expected.name
                )));
            }
            if actual.primary_key != expected.primary_key {
                return Err(DbErr::Custom(format!(
                    "{}.{}: primary key mismatch",
                    table.name, expected.name
                )));
            }
        }
    }

    Ok(())
}

async fn list_user_tables<C>(db: &C) -> Result<Vec<String>, DbErr>
where
    C: ConnectionTrait,
{
    let statement = match db.get_database_backend() {
        DbBackend::MySql => Statement::from_string(
            DbBackend::MySql,
            "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'".to_string(),
        ),
        DbBackend::Postgres => Statement::from_string(
            DbBackend::Postgres,
            "SELECT tablename AS name FROM pg_tables WHERE schemaname = current_schema()".to_string(),
        ),
        DbBackend::Sqlite => Statement::from_string(
            DbBackend::Sqlite,
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'".to_string(),
        ),
    };

    let rows = db.query_all(statement).await?;
    rows.into_iter()
        .map(|row| row.try_get("", "name"))
        .collect()
}

async fn list_columns(
    db: &DatabaseConnection,
    table_name: &str,
) -> Result<Vec<ActualColumn>, DbErr> {
    match db.get_database_backend() {
        DbBackend::Sqlite => {
            let statement = Statement::from_string(
                DbBackend::Sqlite,
                format!("PRAGMA table_info(`{table_name}`)"),
            );
            let rows = db.query_all(statement).await?;
            rows.into_iter()
                .map(|row| {
                    let primary_key = row.try_get::<i64>("", "pk")? > 0;
                    let notnull = row.try_get::<i64>("", "notnull")? > 0;
                    Ok(ActualColumn {
                        name: row.try_get("", "name")?,
                        nullable: if primary_key { false } else { !notnull },
                        primary_key,
                    })
                })
                .collect()
        }
        DbBackend::Postgres | DbBackend::MySql => {
            let backend = db.get_database_backend();
            let (column_scope, pk_scope) = match backend {
                DbBackend::Postgres => (
                    format!("table_schema = current_schema() AND table_name = '{table_name}'"),
                    format!(
                        "tc.table_schema = current_schema() AND tc.table_name = '{table_name}'"
                    ),
                ),
                DbBackend::MySql => (
                    format!("table_schema = DATABASE() AND table_name = '{table_name}'"),
                    format!("tc.table_schema = DATABASE() AND tc.table_name = '{table_name}'"),
                ),
                DbBackend::Sqlite => unreachable!(),
            };

            let column_stmt = Statement::from_string(
                backend,
                format!(
                    "SELECT column_name AS name, is_nullable AS is_nullable \
                     FROM information_schema.columns \
                     WHERE {column_scope} ORDER BY ordinal_position"
                ),
            );
            let pk_stmt = Statement::from_string(
                backend,
                format!(
                    "SELECT kcu.column_name AS name \
                     FROM information_schema.table_constraints tc \
                     JOIN information_schema.key_column_usage kcu \
                       ON tc.constraint_name = kcu.constraint_name \
                      AND tc.table_schema = kcu.table_schema \
                      AND tc.table_name = kcu.table_name \
                     WHERE tc.constraint_type = 'PRIMARY KEY' AND {pk_scope}"
                ),
            );

            let pk_rows = db.query_all(pk_stmt).await?;
            let pk_columns: std::collections::BTreeSet<String> = pk_rows
                .into_iter()
                .map(|row| row.try_get("", "name"))
                .collect::<Result<_, _>>()?;

            let rows = db.query_all(column_stmt).await?;
            rows.into_iter()
                .map(|row| {
                    let name: String = row.try_get("", "name")?;
                    let nullable = row.try_get::<String>("", "is_nullable")? == "YES";
                    Ok(ActualColumn {
                        primary_key: pk_columns.contains(&name),
                        name,
                        nullable,
                    })
                })
                .collect()
        }
    }
}
