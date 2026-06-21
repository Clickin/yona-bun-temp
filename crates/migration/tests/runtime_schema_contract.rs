use sea_orm::{ConnectionTrait, Database, DbBackend, EntityTrait, Schema, Statement};
use sea_orm_migration::{prelude::SchemaManager, seaql_migrations};
use serde::Deserialize;
use yona_rust_persistence_entities::play_evolutions;
use yona_rust_pilot_migration::{
    entity_schema, optional_legacy_table_names, required_runtime_table_names, Migrator,
    RuntimeSchemaPolicy,
};

const MANIFEST_JSON: &str = include_str!("../legacy-final-schema-manifest.json");
const P0B_LEGACY_LIKE_SQLITE_ADOPT_SQL: &str =
    include_str!("fixtures/p0b_legacy_like_sqlite_adopt.sql");

#[derive(Deserialize)]
struct SchemaManifest {
    tables: Vec<TableManifest>,
}

#[derive(Deserialize)]
struct TableManifest {
    name: String,
    columns: Vec<ColumnManifest>,
}

#[derive(Deserialize)]
struct ColumnManifest {
    name: String,
    nullable: bool,
    #[serde(rename = "primaryKey")]
    primary_key: bool,
}

#[derive(Debug, PartialEq, Eq)]
struct ActualColumn {
    name: String,
    nullable: bool,
    primary_key: bool,
}

#[tokio::test]
async fn ensure_runtime_schema_applies_to_an_empty_sqlite_database() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");

    Migrator::ensure_runtime_schema(&db)
        .await
        .expect("runtime schema applied");

    let manager = SchemaManager::new(&db);
    assert!(manager
        .has_table("seaql_migrations")
        .await
        .expect("migration table"));
    validate_manifest_schema(&db).await;
}

#[tokio::test]
async fn ensure_runtime_schema_is_a_noop_when_the_current_baseline_is_already_applied() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");

    Migrator::ensure_runtime_schema(&db)
        .await
        .expect("first runtime migration");
    Migrator::ensure_runtime_schema(&db)
        .await
        .expect("second runtime migration");

    let applied = seaql_migrations::Entity::find()
        .all(&db)
        .await
        .expect("applied migrations");
    assert_eq!(applied.len(), 1);
    assert_eq!(
        applied[0].version,
        "m20260409_000001_create_legacy_start_schema"
    );
}

#[tokio::test]
async fn ensure_runtime_schema_rejects_legacy_pilot_migration_history() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    db.execute_unprepared(
        "CREATE TABLE seaql_migrations (version TEXT PRIMARY KEY NOT NULL, applied_at BIGINT NOT NULL);
         INSERT INTO seaql_migrations (version, applied_at) VALUES ('m20260407_000001_create_pilot_tables', 0);",
    )
    .await
    .expect("seed legacy history");

    let error = Migrator::ensure_runtime_schema(&db)
        .await
        .expect_err("legacy history must be rejected");
    assert!(
        error
            .to_string()
            .contains("unsupported existing migration history")
            || error.to_string().contains("missing"),
        "{error}"
    );
}

#[tokio::test]
async fn ensure_runtime_schema_rejects_partial_schema_without_managed_history() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    db.execute_unprepared("CREATE TABLE project (id INTEGER PRIMARY KEY);")
        .await
        .expect("partial table");

    let error = Migrator::ensure_runtime_schema(&db)
        .await
        .expect_err("partial schema must be rejected");
    assert!(
        error
            .to_string()
            .contains("refusing to auto-migrate partially initialized schema"),
        "{error}"
    );
}

#[tokio::test]
async fn adopt_policy_accepts_precreated_runtime_schema_and_marks_current_baseline_applied() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    entity_schema::create_schema(&SchemaManager::new(&db))
        .await
        .expect("precreate runtime schema");
    create_optional_play_evolutions_table(&db).await;

    Migrator::ensure_runtime_schema_with_policy(&db, RuntimeSchemaPolicy::Adopt)
        .await
        .expect("adopt existing schema");

    let applied = seaql_migrations::Entity::find()
        .all(&db)
        .await
        .expect("applied migrations");
    assert_eq!(applied.len(), 1);
    assert_eq!(
        applied[0].version,
        "m20260409_000001_create_legacy_start_schema"
    );
    validate_manifest_schema(&db).await;
}

#[tokio::test]
async fn validate_only_policy_accepts_precreated_schema_without_writing_migration_history() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    entity_schema::create_schema(&SchemaManager::new(&db))
        .await
        .expect("precreate runtime schema");
    create_optional_play_evolutions_table(&db).await;

    Migrator::ensure_runtime_schema_with_policy(&db, RuntimeSchemaPolicy::ValidateOnly)
        .await
        .expect("validate-only existing schema");

    let manager = SchemaManager::new(&db);
    assert!(!manager
        .has_table("seaql_migrations")
        .await
        .expect("migration table check"));
}

#[tokio::test]
async fn p0b_legacy_like_sqlite_fixture_validates_without_write_then_adopts_preserving_rows() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");
    entity_schema::create_schema(&SchemaManager::new(&db))
        .await
        .expect("precreate current manifest-backed sqlite schema");
    create_optional_play_evolutions_table(&db).await;
    apply_sqlite_statements(&db, P0B_LEGACY_LIKE_SQLITE_ADOPT_SQL)
        .await
        .expect("load legacy-like sqlite data fixture");

    let manager = SchemaManager::new(&db);
    assert!(!manager
        .has_table("seaql_migrations")
        .await
        .expect("migration table before validation"));

    Migrator::ensure_runtime_schema_with_policy(&db, RuntimeSchemaPolicy::ValidateOnly)
        .await
        .expect("validate-only existing populated fixture");

    assert!(!manager
        .has_table("seaql_migrations")
        .await
        .expect("migration table after validate-only"));
    assert_eq!(scalar_count(&db, "project").await, 1);
    assert_eq!(scalar_count(&db, "issue").await, 1);
    assert_eq!(
        scalar_string(&db, "SELECT `title` AS value FROM `issue` WHERE `id` = 1").await,
        "Existing DB adopt issue"
    );

    Migrator::ensure_runtime_schema_with_policy(&db, RuntimeSchemaPolicy::Adopt)
        .await
        .expect("adopt populated legacy-like sqlite fixture");

    let applied = seaql_migrations::Entity::find()
        .all(&db)
        .await
        .expect("applied migrations after adopt");
    assert_eq!(applied.len(), 1);
    assert_eq!(
        applied[0].version,
        "m20260409_000001_create_legacy_start_schema"
    );
    assert_eq!(scalar_count(&db, "project").await, 1);
    assert_eq!(scalar_count(&db, "issue").await, 1);
    assert_eq!(scalar_count(&db, "issue_comment").await, 1);
    assert_eq!(scalar_count(&db, "posting").await, 1);
    assert_eq!(scalar_count(&db, "play_evolutions").await, 1);
    assert_eq!(
        scalar_string(&db, "SELECT `owner` AS value FROM `project` WHERE `id` = 1").await,
        "admin"
    );
    validate_manifest_schema(&db).await;
}

#[tokio::test]
async fn validate_only_policy_rejects_empty_database() {
    let db = Database::connect("sqlite::memory:")
        .await
        .expect("sqlite connection");

    let error = Migrator::ensure_runtime_schema_with_policy(&db, RuntimeSchemaPolicy::ValidateOnly)
        .await
        .expect_err("validate-only must reject empty schema");
    assert!(
        error
            .to_string()
            .contains("validate-only requires a pre-created schema"),
        "{error}"
    );
}

#[test]
fn runtime_mysql_schema_sql_uses_auto_increment_for_single_id_primary_keys_and_excludes_optional_play_evolutions(
) {
    let statements = entity_schema::schema_sql(DbBackend::MySql).expect("mysql schema sql");
    let joined = statements.join("\n\n");

    assert!(
        !joined.contains("CREATE TABLE IF NOT EXISTS `play_evolutions`"),
        "{joined}"
    );
    assert!(
        joined.contains("CREATE TABLE IF NOT EXISTS `n4user`"),
        "{joined}"
    );
    assert!(
        joined.contains("CREATE TABLE IF NOT EXISTS `organization`"),
        "{joined}"
    );
    assert!(
        joined.contains("CREATE TABLE IF NOT EXISTS `project`"),
        "{joined}"
    );
    assert!(
        joined.contains("CREATE TABLE IF NOT EXISTS `issue`"),
        "{joined}"
    );
    assert!(
        joined.contains(
            "CREATE TABLE IF NOT EXISTS `n4user` ( `id` bigint NOT NULL AUTO_INCREMENT PRIMARY KEY,"
        ),
        "{joined}"
    );
    assert!(
        joined.contains(
            "CREATE TABLE IF NOT EXISTS `organization` ( `id` bigint NOT NULL AUTO_INCREMENT PRIMARY KEY,"
        ),
        "{joined}"
    );
    assert!(
        joined.contains(
            "CREATE TABLE IF NOT EXISTS `project` ( `id` bigint NOT NULL AUTO_INCREMENT PRIMARY KEY,"
        ),
        "{joined}"
    );
    assert!(
        joined.contains(
            "CREATE TABLE IF NOT EXISTS `issue` ( `id` bigint NOT NULL AUTO_INCREMENT PRIMARY KEY,"
        ),
        "{joined}"
    );
}

async fn validate_manifest_schema(db: &sea_orm::DatabaseConnection) {
    let manifest: SchemaManifest = serde_json::from_str(MANIFEST_JSON).expect("schema manifest");
    let required_tables: std::collections::BTreeSet<String> = required_runtime_table_names()
        .expect("required runtime tables")
        .into_iter()
        .collect();
    let optional_tables = optional_legacy_table_names();
    let actual_tables: std::collections::BTreeSet<String> = list_tables(db)
        .await
        .expect("list tables")
        .into_iter()
        .filter(|table| table != "seaql_migrations")
        .collect();
    let actual_required_tables: std::collections::BTreeSet<String> = actual_tables
        .iter()
        .filter(|table| !optional_tables.contains(*table))
        .cloned()
        .collect();
    assert_eq!(
        actual_required_tables, required_tables,
        "required runtime table set must match manifest-derived required set"
    );

    for table in manifest.tables {
        if optional_tables.contains(&table.name) && !actual_tables.contains(&table.name) {
            continue;
        }
        let actual_columns = list_columns(db, &table.name).await.expect("list columns");
        assert_eq!(
            actual_columns.len(),
            table.columns.len(),
            "{}: column count mismatch",
            table.name
        );

        for expected in table.columns {
            let actual = actual_columns
                .iter()
                .find(|column| column.name == expected.name)
                .unwrap_or_else(|| panic!("{}: missing column {}", table.name, expected.name));
            assert_eq!(
                actual.nullable, expected.nullable,
                "{}.{}: nullable mismatch",
                table.name, expected.name
            );
            assert_eq!(
                actual.primary_key, expected.primary_key,
                "{}.{}: primary key mismatch",
                table.name, expected.name
            );
        }
    }
}

async fn list_tables(db: &sea_orm::DatabaseConnection) -> Result<Vec<String>, sea_orm::DbErr> {
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
    db: &sea_orm::DatabaseConnection,
    table_name: &str,
) -> Result<Vec<ActualColumn>, sea_orm::DbErr> {
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

async fn create_optional_play_evolutions_table(db: &sea_orm::DatabaseConnection) {
    let schema = Schema::new(DbBackend::Sqlite);
    let mut stmt = schema.create_table_from_entity(play_evolutions::Entity);
    stmt.if_not_exists();
    db.execute(DbBackend::Sqlite.build(&stmt))
        .await
        .expect("create optional play_evolutions");
}

async fn apply_sqlite_statements(
    db: &sea_orm::DatabaseConnection,
    sql: &str,
) -> Result<(), sea_orm::DbErr> {
    let uncommented = sql
        .lines()
        .filter(|line| !line.trim_start().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n");
    for statement in uncommented
        .split("--> statement-breakpoint")
        .flat_map(|chunk| chunk.split(';'))
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
    {
        db.execute_unprepared(statement).await?;
    }
    Ok(())
}

async fn scalar_count(db: &sea_orm::DatabaseConnection, table_name: &str) -> i64 {
    let statement = Statement::from_string(
        DbBackend::Sqlite,
        format!("SELECT COUNT(*) AS count FROM `{table_name}`"),
    );
    db.query_one(statement)
        .await
        .expect("count query")
        .expect("count row")
        .try_get("", "count")
        .expect("count value")
}

async fn scalar_string(db: &sea_orm::DatabaseConnection, sql: &str) -> String {
    let statement = Statement::from_string(DbBackend::Sqlite, sql.to_string());
    db.query_one(statement)
        .await
        .expect("scalar query")
        .expect("scalar row")
        .try_get("", "value")
        .expect("scalar value")
}
