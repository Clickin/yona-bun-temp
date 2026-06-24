use sea_orm::{ConnectionTrait, Database, DbBackend, Statement};
use serde::Deserialize;
use testcontainers_modules::{mariadb, postgres, testcontainers::runners::AsyncRunner};
use yona_rust_persistence::{AppRepository, SearchRepositoryInput, SearchScope};
use yona_rust_pilot_migration::{
    Migrator, optional_legacy_table_names, required_runtime_table_names, seed_pilot_data,
};
use yona_rust_pilot_server::persistence::PilotRepository;

const MANIFEST_JSON: &str = include_str!("../../migration/legacy-final-schema-manifest.json");

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
async fn testcontainers_db_matrix_smokes_runtime_migration_and_repository_flow() {
    run_case("sqlite", "sqlite::memory:").await;
    run_postgres_case().await;
    run_mariadb_case().await;
}

async fn run_postgres_case() {
    let container = postgres::Postgres::default()
        .start()
        .await
        .expect("postgres container");
    let host = container.get_host().await.expect("postgres host");
    let port = container
        .get_host_port_ipv4(5432)
        .await
        .expect("postgres port");
    let url = format!("postgres://postgres:postgres@{host}:{port}/postgres");

    run_case("postgres", &url).await;
}

async fn run_mariadb_case() {
    let container = mariadb::Mariadb::default()
        .start()
        .await
        .expect("mariadb container");
    let host = container.get_host().await.expect("mariadb host");
    let port = container
        .get_host_port_ipv4(3306)
        .await
        .expect("mariadb port");
    let url = format!("mysql://root@{host}:{port}/test");

    run_case("mariadb", &url).await;
}

async fn run_case(name: &str, url: &str) {
    let db = connect_with_retry(name, url).await;
    Migrator::ensure_runtime_schema(&db)
        .await
        .unwrap_or_else(|error| panic!("{name}: runtime migration failed: {error}"));
    Migrator::ensure_runtime_schema(&db)
        .await
        .unwrap_or_else(|error| panic!("{name}: second runtime migration failed: {error}"));
    validate_manifest_schema(name, &db).await;
    validate_identity_columns(name, &db).await;
    seed_pilot_data(&db)
        .await
        .unwrap_or_else(|error| panic!("{name}: seeding failed: {error}"));

    let app_repo = AppRepository::new(db.clone());
    let search = app_repo
        .search_app(SearchRepositoryInput {
            actor_id: None,
            keyword: "Pilot".to_string(),
            organization_name: None,
            owner_name: None,
            page_num: 1,
            project_name: None,
            requested_search_type: "issue".to_string(),
            search_type: "issue".to_string(),
            scope: SearchScope::Global,
        })
        .await
        .unwrap_or_else(|error| panic!("{name}: issue search failed: {error}"))
        .unwrap_or_else(|| panic!("{name}: issue search context missing"));
    assert_eq!(search.counts.issues, 1, "{name}: issue search count");
    assert!(
        search.items.iter().any(|item| item.owner_name == "pilot"
            && item.project_name == "yona"
            && item.title == "Pilot issue"),
        "{name}: expected seeded issue in search results"
    );

    let repo = PilotRepository::new(db);
    let projects = repo
        .list_projects()
        .await
        .unwrap_or_else(|error| panic!("{name}: list_projects failed: {error}"));
    assert!(
        projects
            .iter()
            .any(|project| project.owner_name == "pilot" && project.project_name == "yona"),
        "{name}: expected seeded pilot/yona project"
    );

    let issue = repo
        .read_issue_detail("pilot", "yona", 1)
        .await
        .unwrap_or_else(|error| panic!("{name}: read_issue_detail failed: {error}"))
        .unwrap_or_else(|| panic!("{name}: seeded issue missing"));
    assert_eq!(issue.state, "open", "{name}: seeded issue state");

    let updated = repo
        .update_issue_state("pilot", "yona", 1, "closed")
        .await
        .unwrap_or_else(|error| panic!("{name}: update_issue_state failed: {error}"))
        .unwrap_or_else(|| panic!("{name}: updated issue missing"));
    assert_eq!(updated.state, "closed", "{name}: updated issue state");
}

async fn connect_with_retry(name: &str, url: &str) -> sea_orm::DatabaseConnection {
    let mut last_error = None;

    for _ in 0..60 {
        match Database::connect(url).await {
            Ok(db) => return db,
            Err(error) => {
                last_error = Some(error.to_string());
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }
        }
    }

    panic!(
        "{name}: failed to connect after retries: {}",
        last_error.unwrap_or_else(|| "unknown error".to_string())
    );
}

async fn validate_manifest_schema(name: &str, db: &sea_orm::DatabaseConnection) {
    let manifest: SchemaManifest = serde_json::from_str(MANIFEST_JSON).expect("schema manifest");
    let required_tables: std::collections::BTreeSet<String> = required_runtime_table_names()
        .expect("required runtime tables")
        .into_iter()
        .collect();
    let optional_tables = optional_legacy_table_names();
    let actual_tables: std::collections::BTreeSet<String> = list_tables(db)
        .await
        .unwrap_or_else(|error| panic!("{name}: list_tables failed: {error}"))
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
        "{name}: required runtime table set must match manifest-derived required set"
    );

    for table in manifest.tables {
        if optional_tables.contains(&table.name) && !actual_tables.contains(&table.name) {
            continue;
        }
        let actual_columns = list_columns(db, &table.name)
            .await
            .unwrap_or_else(|error| panic!("{name}: list_columns({}) failed: {error}", table.name));
        assert_eq!(
            actual_columns.len(),
            table.columns.len(),
            "{name}: {} column count mismatch",
            table.name
        );

        for expected in table.columns {
            let actual = actual_columns
                .iter()
                .find(|column| column.name == expected.name)
                .unwrap_or_else(|| {
                    panic!("{name}: {} missing column {}", table.name, expected.name)
                });
            assert_eq!(
                actual.nullable, expected.nullable,
                "{name}: {}.{} nullable mismatch",
                table.name, expected.name
            );
            assert_eq!(
                actual.primary_key, expected.primary_key,
                "{name}: {}.{} primary key mismatch",
                table.name, expected.name
            );
        }
    }
}

async fn validate_identity_columns(name: &str, db: &sea_orm::DatabaseConnection) {
    match db.get_database_backend() {
        DbBackend::MySql => {
            for table in ["n4user", "organization", "project", "issue"] {
                let statement = Statement::from_string(
                    DbBackend::MySql,
                    format!(
                        "SELECT extra FROM information_schema.columns \
                         WHERE table_schema = DATABASE() AND table_name = '{table}' AND column_name = 'id'"
                    ),
                );
                let row = db
                    .query_one(statement)
                    .await
                    .unwrap_or_else(|error| {
                        panic!("{name}: identity query failed for {table}: {error}")
                    })
                    .unwrap_or_else(|| panic!("{name}: identity column missing for {table}.id"));
                let extra: String = row.try_get("", "extra").unwrap_or_else(|error| {
                    panic!("{name}: decode identity extra failed for {table}: {error}")
                });
                assert!(
                    extra.to_ascii_lowercase().contains("auto_increment"),
                    "{name}: expected AUTO_INCREMENT on {table}.id but got `{extra}`"
                );
            }
        }
        DbBackend::Postgres | DbBackend::Sqlite => {}
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
