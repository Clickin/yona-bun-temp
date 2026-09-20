//! Lossless schema-directed migration. The HTTP export is deliberately not the
//! database contract: it omits legacy relations, settings and audit history.
use std::collections::{BTreeMap, BTreeSet};
use std::io::Read;
use std::path::{Component, Path};
use std::process::Command;

use anyhow::{bail, ensure, Context, Result};
use sha2::{Digest, Sha256};
use sqlx::{Connection, MySqlConnection, Row};

const RECOVERY: &str = "Migration incomplete. Do not boot or reuse the partial target. Preserve the source snapshot; recreate ONLY the disposable target database and empty target data directory, then rerun the same command. No automatic deletion or partial-target resume is performed.";

#[derive(Debug)]
struct Column {
    name: String,
    data_type: String,
    key: bool,
}

pub fn run(args: &crate::Args) -> Result<()> {
    let source_url = args
        .from_db_url
        .as_deref()
        .context("--from-db-url is required")?;
    let target_url = args
        .to_db_url
        .as_deref()
        .context("direct DB migration requires --to-db-url")?;
    ensure!(
        source_url != target_url,
        "source and target databases must be separate"
    );
    let source_root = args
        .yona_data_dir
        .as_deref()
        .context("direct migration requires --yona-data-dir (immutable YONA_DATA snapshot)")?;
    let target_root = args
        .yoram_data_root
        .as_deref()
        .context("direct migration requires --yoram-data-root (empty disposable directory)")?;
    ensure!(
        args.source_snapshot,
        "--source-snapshot must acknowledge that DB and files are a matching write-frozen snapshot"
    );
    ensure!(
        args.batch_size > 0 && args.batch_size <= 1000,
        "--batch-size must be between 1 and 1000"
    );
    check_roots(source_root, target_root)?;
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    runtime
        .block_on(migrate(
            source_url,
            target_url,
            source_root,
            target_root,
            args.batch_size,
            args.with_repos,
            args.dry_run,
        ))
        .context(RECOVERY)
}

// Database messages can contain duplicate-key values (tokens/password hashes).
// Keep server codes for diagnosis, never connection strings or row values.
fn db_error(error: sqlx::Error) -> anyhow::Error {
    if let Some(db) = error.as_database_error() {
        let number = db
            .try_downcast_ref::<sqlx::mysql::MySqlDatabaseError>()
            .map(|error| error.number())
            .unwrap_or(0);
        anyhow::anyhow!(
            "database operation failed (MySQL {number}, SQLSTATE {})",
            db.code().as_deref().unwrap_or("unknown")
        )
    } else {
        anyhow::anyhow!("database connection, protocol or decoding operation failed")
    }
}

async fn connect(url: &str) -> Result<MySqlConnection> {
    let mut db = MySqlConnection::connect(url).await.map_err(db_error)?;
    sqlx::query("SET SESSION time_zone = '+00:00'")
        .execute(&mut db)
        .await
        .map_err(db_error)?;
    sqlx::query("SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_AUTO_VALUE_ON_ZERO,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'")
        .execute(&mut db).await.map_err(db_error)?;
    Ok(db)
}

async fn tables(db: &mut MySqlConnection) -> Result<BTreeSet<String>> {
    Ok(sqlx::query_scalar(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()",
    )
    .fetch_all(db)
    .await
    .map_err(db_error)?
    .into_iter()
    .collect())
}

async fn columns(db: &mut MySqlConnection, table: &str) -> Result<Vec<Column>> {
    let rows = sqlx::query("SELECT column_name, data_type, column_key FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position")
        .bind(table).fetch_all(db).await.map_err(db_error)?;
    rows.iter()
        .map(|row| {
            Ok(Column {
                name: row.try_get("column_name").map_err(db_error)?,
                data_type: row.try_get("data_type").map_err(db_error)?,
                key: row.try_get::<String, _>("column_key").map_err(db_error)? == "PRI",
            })
        })
        .collect()
}

fn ident(name: &str) -> String {
    format!("`{}`", name.replace('`', "``"))
}

fn projection(columns: &[Column]) -> String {
    columns
        .iter()
        .map(|column| {
            let name = ident(&column.name);
            if column.data_type == "bit" {
                format!("CAST(CAST({name} AS UNSIGNED) AS CHAR CHARACTER SET utf8mb4)")
            } else {
                format!("CAST({name} AS CHAR CHARACTER SET utf8mb4)")
            }
        })
        .collect::<Vec<_>>()
        .join(", ")
}

async fn migrate(
    source_url: &str,
    target_url: &str,
    source_root: &Path,
    target_root: &Path,
    batch_size: usize,
    with_repos: bool,
    dry_run: bool,
) -> Result<()> {
    let mut source = connect(source_url)
        .await
        .context("connecting read-only source")?;
    let mut target = connect(target_url)
        .await
        .context("connecting disposable target")?;
    // An alias of the source cannot pass this check: a valid source has tables.
    ensure!(
        tables(&mut target).await?.is_empty(),
        "target database must have no tables; recreate only the disposable target before retrying"
    );
    sqlx::raw_sql("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(&mut source)
        .await
        .map_err(db_error)?;
    sqlx::raw_sql("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY")
        .execute(&mut source)
        .await
        .map_err(db_error)?;
    let source_tables = tables(&mut source).await?;
    let mut allowed = yoram_migration::required_runtime_table_names()?
        .into_iter()
        .collect::<BTreeSet<_>>();
    for table in &allowed {
        ensure!(
            source_tables.contains(table),
            "required legacy table {table} is missing"
        );
    }
    allowed.extend(yoram_migration::optional_legacy_table_names());
    ensure!(
        source_tables.is_subset(&allowed),
        "unregistered source tables cannot be silently omitted: {:?}",
        source_tables.difference(&allowed).collect::<Vec<_>>()
    );
    if source_tables.contains("play_evolutions") {
        eprintln!("Legacy play_evolutions ledger is intentionally excluded; target uses its own canonical migration history");
    }
    let mut inventory = BTreeMap::new();
    for table in &source_tables {
        // Play's evolution ledger is not application data or a runtime entity.
        if table == "play_evolutions" {
            continue;
        }
        let engine: Option<String> = sqlx::query_scalar("SELECT engine FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?")
            .bind(table).fetch_one(&mut source).await.map_err(db_error)?;
        ensure!(
            engine.as_deref() == Some("InnoDB"),
            "{table} requires InnoDB for a consistent read-only snapshot"
        );
        let cols = columns(&mut source, table).await?;
        let mixed_collations: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name WHERE c.table_schema = DATABASE() AND c.table_name = ? AND c.collation_name <> t.table_collation")
            .bind(table).fetch_one(&mut source).await.map_err(db_error)?;
        ensure!(
            mixed_collations == 0,
            "{table} has mixed column collations; an explicit collation mapping is required"
        );
        ensure!(
            cols.iter().any(|c| c.key),
            "{table} has no primary key for bounded pagination"
        );
        for column in &cols {
            ensure!(
                [
                    "tinyint",
                    "smallint",
                    "mediumint",
                    "int",
                    "bigint",
                    "bit",
                    "char",
                    "varchar",
                    "tinytext",
                    "text",
                    "mediumtext",
                    "longtext",
                    "date",
                    "datetime",
                    "timestamp"
                ]
                .contains(&column.data_type.as_str()),
                "unsupported lossless mapping for {table}.{} ({})",
                column.name,
                column.data_type
            );
            if column.key {
                ensure!(
                    ["tinyint", "smallint", "mediumint", "int", "bigint"]
                        .contains(&column.data_type.as_str()),
                    "unsupported non-integer primary key in {table}"
                );
            }
        }
        inventory.insert(table.clone(), cols);
    }
    check_assets(&mut source, source_root, batch_size, with_repos, false).await?;
    if dry_run {
        sqlx::query("ROLLBACK")
            .execute(&mut source)
            .await
            .map_err(db_error)?;
        eprintln!(
            "DRY RUN: {} legacy application tables and source assets checked; target untouched",
            inventory.len()
        );
        return Ok(());
    }
    let mut options = sea_orm::ConnectOptions::new(target_url);
    options.max_connections(1).sqlx_logging(false);
    let schema_db = sea_orm::Database::connect(options)
        .await
        .map_err(|_| anyhow::anyhow!("connecting target schema manager failed"))?;
    yoram_migration::Migrator::ensure_runtime_schema(&schema_db)
        .await
        .map_err(|_| anyhow::anyhow!("initializing canonical target schema failed"))?;
    schema_db
        .close()
        .await
        .map_err(|_| anyhow::anyhow!("closing target schema manager failed"))?;
    // Cyclic/self-referential rows are preserved verbatim, not reordered or nulled.
    // Re-enabling FK checks does not validate existing rows; validate explicitly below.
    sqlx::query("SET SESSION FOREIGN_KEY_CHECKS = 0")
        .execute(&mut target)
        .await
        .map_err(db_error)?;
    for (table, cols) in &inventory {
        // Fresh schemas otherwise inherit server defaults (often latin1).
        // Preserve the legacy table collation before inserting user text.
        let collation: String = sqlx::query_scalar("SELECT table_collation FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?")
            .bind(table).fetch_one(&mut source).await.map_err(db_error)?;
        let charset: String = sqlx::query_scalar(
            "SELECT character_set_name FROM information_schema.collations WHERE collation_name = ?",
        )
        .bind(&collation)
        .fetch_one(&mut source)
        .await
        .map_err(db_error)?;
        sqlx::query(&format!(
            "ALTER TABLE {} CONVERT TO CHARACTER SET {} COLLATE {}",
            ident(table),
            ident(&charset),
            ident(&collation)
        ))
        .execute(&mut target)
        .await
        .map_err(db_error)?;
        let target_cols = columns(&mut target, table).await?;
        for column in cols {
            ensure!(
                target_cols.iter().any(|c| c.name == column.name),
                "unmapped source column {table}.{}; refusing data loss",
                column.name
            );
        }
        for column in &target_cols {
            if !cols.iter().any(|c| c.name == column.name) {
                let nullable: String = sqlx::query_scalar("SELECT is_nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?")
                    .bind(table).bind(&column.name).fetch_one(&mut target).await.map_err(db_error)?;
                ensure!(
                    nullable == "YES",
                    "new required target column {table}.{} needs an explicit transformation",
                    column.name
                );
            }
        }
        // Canonical entities use DATETIME without precision. Retain original
        // subsecond timestamps rather than silently letting MySQL truncate them.
        for column in cols
            .iter()
            .filter(|c| c.data_type == "datetime" || c.data_type == "timestamp")
        {
            let precision: Option<u32> = sqlx::query_scalar("SELECT datetime_precision FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?")
                .bind(table).bind(&column.name).fetch_one(&mut source).await.map_err(db_error)?;
            let precision = precision.unwrap_or(0);
            if precision > 0 {
                ensure!(
                    precision <= 6,
                    "unsupported timestamp precision in {table}.{}",
                    column.name
                );
                let nullable: String = sqlx::query_scalar("SELECT is_nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?")
                    .bind(table).bind(&column.name).fetch_one(&mut target).await.map_err(db_error)?;
                let null = if nullable == "YES" {
                    "NULL"
                } else {
                    "NOT NULL"
                };
                let sql = format!(
                    "ALTER TABLE {} MODIFY {} DATETIME({precision}) {null}",
                    ident(table),
                    ident(&column.name)
                );
                sqlx::query(&sql)
                    .execute(&mut target)
                    .await
                    .map_err(db_error)?;
            }
        }
        copy_table(&mut source, &mut target, table, cols, batch_size)
            .await
            .with_context(|| format!("copying {table}"))?;
        let next: Option<u64> = sqlx::query_scalar("SELECT auto_increment FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?")
            .bind(table).fetch_one(&mut source).await.map_err(db_error)?;
        if let Some(next) = next {
            sqlx::query(&format!(
                "ALTER TABLE {} AUTO_INCREMENT = {next}",
                ident(table)
            ))
            .execute(&mut target)
            .await
            .map_err(db_error)?;
        }
    }
    check_foreign_keys(&mut target).await?;
    sqlx::query("SET SESSION FOREIGN_KEY_CHECKS = 1")
        .execute(&mut target)
        .await
        .map_err(db_error)?;
    eprintln!("Database rows verified; transferring files separately");
    std::fs::create_dir_all(target_root)?;
    copy_tree(&source_root.join("uploads"), &target_root.join("uploads"))?;
    if with_repos {
        copy_tree(&source_root.join("repo"), &target_root.join("repo"))?;
    }
    check_assets(&mut source, target_root, batch_size, with_repos, true).await?;
    sqlx::query("ROLLBACK")
        .execute(&mut source)
        .await
        .map_err(db_error)?;
    eprintln!("Direct DB migration complete: {} tables, every copied row compared, attachments SHA-256 verified{}", inventory.len(), if with_repos { ", repositories verified" } else { "; repositories explicitly excluded (--with-repos=false)" });
    Ok(())
}

async fn copy_table(
    source: &mut MySqlConnection,
    target: &mut MySqlConnection,
    table: &str,
    columns: &[Column],
    batch_size: usize,
) -> Result<()> {
    let keys = columns
        .iter()
        .filter(|c| c.key)
        .map(|c| ident(&c.name))
        .collect::<Vec<_>>();
    let key_list = keys.join(", ");
    let placeholders = vec!["?"; keys.len()].join(", ");
    let select = format!("SELECT {} FROM {}", projection(columns), ident(table));
    let insert = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        ident(table),
        columns
            .iter()
            .map(|c| ident(&c.name))
            .collect::<Vec<_>>()
            .join(", "),
        vec!["?"; columns.len()].join(", ")
    );
    let mut cursor: Option<Vec<i64>> = None;
    let mut total = 0u64;
    loop {
        let where_clause = if cursor.is_some() {
            format!(" WHERE ({key_list}) > ({placeholders})")
        } else {
            String::new()
        };
        let sql = format!("{select}{where_clause} ORDER BY {key_list} LIMIT {batch_size}");
        let mut query = sqlx::query(&sql);
        if let Some(cursor) = &cursor {
            for key in cursor {
                query = query.bind(*key);
            }
        }
        let rows = query.fetch_all(&mut *source).await.map_err(db_error)?;
        if rows.is_empty() {
            break;
        }
        let key_values = |row: &sqlx::mysql::MySqlRow| -> Result<Vec<i64>> {
            columns
                .iter()
                .enumerate()
                .filter(|(_, c)| c.key)
                .map(|(i, _)| {
                    row.try_get::<&str, _>(i)
                        .map_err(db_error)?
                        .parse::<i64>()
                        .context("primary key exceeds signed 64-bit range")
                })
                .collect()
        };
        let first = key_values(&rows[0])?;
        let last = key_values(rows.last().context("empty batch")?)?;
        let mut tx = target.begin().await.map_err(db_error)?;
        for row in &rows {
            let mut query = sqlx::query(&insert);
            for i in 0..columns.len() {
                query = query.bind(row.try_get::<Option<&str>, _>(i).map_err(db_error)?);
            }
            query.execute(&mut *tx).await.map_err(db_error)?;
        }
        // Compare within the transaction, before committing even a truncated cell.
        let verify = format!("{select} WHERE ({key_list}) >= ({placeholders}) AND ({key_list}) <= ({placeholders}) ORDER BY {key_list}");
        let mut query = sqlx::query(&verify);
        for key in first.iter().chain(&last) {
            query = query.bind(*key);
        }
        let actual = query.fetch_all(&mut *tx).await.map_err(db_error)?;
        ensure!(
            actual.len() == rows.len(),
            "batch row-count mismatch in {table}"
        );
        for (expected, actual) in rows.iter().zip(actual) {
            for (i, column) in columns.iter().enumerate() {
                ensure!(
                    expected.try_get::<Option<&str>, _>(i).map_err(db_error)?
                        == actual.try_get::<Option<&str>, _>(i).map_err(db_error)?,
                    "lossy mapping in {table}.{}",
                    column.name
                );
            }
        }
        tx.commit().await.map_err(db_error)?;
        total += rows.len() as u64;
        cursor = Some(last);
    }
    let actual: i64 = sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {}", ident(table)))
        .fetch_one(&mut *target)
        .await
        .map_err(db_error)?;
    ensure!(
        actual as u64 == total,
        "target row-count mismatch in {table}"
    );
    eprintln!("  {table}: {total} rows preserved");
    Ok(())
}

async fn check_foreign_keys(target: &mut MySqlConnection) -> Result<()> {
    let rows = sqlx::query("SELECT table_name, constraint_name, column_name, referenced_table_name, referenced_column_name FROM information_schema.key_column_usage WHERE constraint_schema = DATABASE() AND referenced_table_name IS NOT NULL ORDER BY table_name, constraint_name, ordinal_position")
        .fetch_all(&mut *target).await.map_err(db_error)?;
    let mut groups: BTreeMap<(String, String, String), Vec<(String, String)>> = BTreeMap::new();
    for row in rows {
        groups
            .entry((
                row.try_get("table_name").map_err(db_error)?,
                row.try_get("constraint_name").map_err(db_error)?,
                row.try_get("referenced_table_name").map_err(db_error)?,
            ))
            .or_default()
            .push((
                row.try_get("column_name").map_err(db_error)?,
                row.try_get("referenced_column_name").map_err(db_error)?,
            ));
    }
    for ((table, constraint, parent), columns) in groups {
        let not_null = columns
            .iter()
            .map(|(child, _)| format!("c.{} IS NOT NULL", ident(child)))
            .collect::<Vec<_>>()
            .join(" AND ");
        let join = columns
            .iter()
            .map(|(child, parent)| format!("c.{} = p.{}", ident(child), ident(parent)))
            .collect::<Vec<_>>()
            .join(" AND ");
        let sql = format!("SELECT EXISTS(SELECT 1 FROM {} c WHERE {not_null} AND NOT EXISTS(SELECT 1 FROM {} p WHERE {join}))", ident(&table), ident(&parent));
        let orphan: i32 = sqlx::query_scalar(&sql)
            .fetch_one(&mut *target)
            .await
            .map_err(db_error)?;
        ensure!(
            orphan == 0,
            "unresolved target relation {table}.{constraint}"
        );
    }
    Ok(())
}

fn check_roots(source: &Path, target: &Path) -> Result<()> {
    let source = source
        .canonicalize()
        .context("source data snapshot does not exist")?;
    ensure!(source.is_dir(), "source data root is not a directory");
    let target = if target.exists() {
        target.canonicalize()?
    } else {
        target
            .parent()
            .filter(|p| !p.as_os_str().is_empty())
            .unwrap_or(Path::new("."))
            .canonicalize()?
            .join(
                target
                    .file_name()
                    .context("target data root needs a directory name")?,
            )
    };
    ensure!(
        !target.starts_with(&source) && !source.starts_with(&target),
        "source and target data roots must be disjoint"
    );
    if target.exists() {
        ensure!(
            std::fs::read_dir(&target)?.next().is_none(),
            "target data root must be empty"
        );
    }
    Ok(())
}

fn component(value: &str) -> Result<&str> {
    let mut parts = Path::new(value).components();
    ensure!(
        matches!(parts.next(), Some(Component::Normal(_)))
            && parts.next().is_none()
            && !value.contains('\\'),
        "unsafe asset path component"
    );
    Ok(value)
}

fn digest(path: &Path) -> Result<String> {
    ensure!(
        std::fs::symlink_metadata(path)?.file_type().is_file(),
        "asset must be a regular file: {}",
        path.display()
    );
    let mut file = std::fs::File::open(path)?;
    let mut hash = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buffer)?;
        if n == 0 {
            break;
        }
        hash.update(&buffer[..n]);
    }
    Ok(format!("{:x}", hash.finalize()))
}

fn copy_tree(source: &Path, target: &Path) -> Result<()> {
    ensure!(
        std::fs::symlink_metadata(source)?.file_type().is_dir(),
        "asset directory missing or symlinked: {}",
        source.display()
    );
    std::fs::create_dir(target)?;
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        let destination = target.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_tree(&entry.path(), &destination)?;
        } else {
            let before = digest(&entry.path())?;
            std::fs::copy(entry.path(), &destination)?;
            ensure!(
                digest(&destination)? == before,
                "file copy checksum mismatch: {}",
                entry.path().display()
            );
        }
    }
    Ok(())
}

fn checked_command(program: &str, args: &[&str], path: &Path) -> Result<()> {
    let status = Command::new(program)
        .args(args)
        .arg(path)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .with_context(|| format!("running {program}"))?;
    ensure!(
        status.success(),
        "{program} verification failed for {}",
        path.display()
    );
    Ok(())
}

async fn check_assets(
    db: &mut MySqlConnection,
    root: &Path,
    batch: usize,
    with_repos: bool,
    verify_repos: bool,
) -> Result<()> {
    let mut cursor = i64::MIN;
    loop {
        let rows =
            sqlx::query("SELECT id, hash, size FROM attachment WHERE id > ? ORDER BY id LIMIT ?")
                .bind(cursor)
                .bind(batch as u32)
                .fetch_all(&mut *db)
                .await
                .map_err(db_error)?;
        if rows.is_empty() {
            break;
        }
        for row in rows {
            cursor = row.try_get("id").map_err(db_error)?;
            let hash: Option<String> = row.try_get("hash").map_err(db_error)?;
            let hash = hash.context("attachment has no content hash")?;
            let size: Option<i64> = row.try_get("size").map_err(db_error)?;
            let path = root.join("uploads").join(component(&hash)?);
            ensure!(
                digest(&path)
                    .with_context(|| format!("attachment {cursor} missing or unreadable"))?
                    == hash.to_ascii_lowercase(),
                "attachment {cursor} SHA-256 mismatch"
            );
            if let Some(size) = size {
                ensure!(
                    size >= 0 && std::fs::metadata(&path)?.len() == size as u64,
                    "attachment {cursor} size mismatch"
                );
            }
        }
    }
    if !with_repos {
        return Ok(());
    }
    cursor = i64::MIN;
    loop {
        let rows = sqlx::query(
            "SELECT id, owner, name, vcs FROM project WHERE id > ? ORDER BY id LIMIT ?",
        )
        .bind(cursor)
        .bind(batch as u32)
        .fetch_all(&mut *db)
        .await
        .map_err(db_error)?;
        if rows.is_empty() {
            break;
        }
        for row in rows {
            cursor = row.try_get("id").map_err(db_error)?;
            let owner: Option<String> = row.try_get("owner").map_err(db_error)?;
            let name: Option<String> = row.try_get("name").map_err(db_error)?;
            let vcs: Option<String> = row.try_get("vcs").map_err(db_error)?;
            let owner = owner.context("project has no owner")?;
            let name = name.context("project has no name")?;
            let owner = component(&owner)?;
            let name = component(&name)?;
            match vcs.as_deref() {
                Some("Subversion") => {
                    let path = root.join("repo/svn").join(owner).join(name);
                    ensure!(
                        path.join("format").is_file(),
                        "project {cursor} SVN repository missing"
                    );
                    if verify_repos {
                        checked_command("svnadmin", &["verify", "--quiet"], &path)?;
                    }
                }
                Some("GIT") => {
                    let path = root
                        .join("repo/git")
                        .join(owner)
                        .join(format!("{name}.git"));
                    ensure!(
                        path.join("HEAD").is_file() && path.join("objects").is_dir(),
                        "project {cursor} Git repository missing"
                    );
                    if verify_repos {
                        let status = Command::new("git")
                            .arg("--git-dir")
                            .arg(&path)
                            .args(["fsck", "--full", "--no-dangling"])
                            .status()?;
                        ensure!(
                            status.success(),
                            "project {cursor} Git integrity check failed ({status})"
                        );
                    }
                }
                _ => bail!("project {cursor} has unsupported or missing VCS"),
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_overlapping_roots_and_unsafe_asset_names() {
        let root = tempfile::tempdir().unwrap();
        assert!(check_roots(root.path(), &root.path().join("target")).is_err());
        for name in [
            "",
            "..",
            "../secret",
            "/tmp/secret",
            "owner/project",
            "owner\\project",
        ] {
            assert!(component(name).is_err());
        }
    }

    #[test]
    fn copy_rejects_missing_files_and_preserves_nested_bytes() {
        let root = tempfile::tempdir().unwrap();
        assert!(digest(&root.path().join("missing")).is_err());
        let source = root.path().join("source");
        std::fs::create_dir_all(source.join("nested")).unwrap();
        std::fs::write(source.join("nested/blob"), [0, 255, 128, 42]).unwrap();
        let target = root.path().join("target");
        copy_tree(&source, &target).unwrap();
        assert_eq!(
            std::fs::read(target.join("nested/blob")).unwrap(),
            [0, 255, 128, 42]
        );
        assert!(copy_tree(&source, &target).is_err());
    }

    #[test]
    #[ignore = "requires read-only golden source and a separate empty disposable MySQL target"]
    fn preserves_every_legacy_row_across_single_row_batches() {
        let source = std::env::var("MIGRATION_TEST_SOURCE_URL").unwrap();
        let target = std::env::var("MIGRATION_TEST_TARGET_URL").unwrap();
        let source_root = std::env::var("MIGRATION_TEST_DATA_ROOT").unwrap();
        let target_root = tempfile::tempdir().unwrap();
        let runtime = tokio::runtime::Runtime::new().unwrap();
        runtime.block_on(async {
            migrate(
                &source,
                &target,
                Path::new(&source_root),
                target_root.path(),
                1,
                true,
                false,
            )
            .await
            .unwrap();
            let mut before = connect(&source).await.unwrap();
            let mut after = connect(&target).await.unwrap();
            for table in tables(&mut before).await.unwrap() {
                if table == "play_evolutions" {
                    continue;
                }
                let count = format!("SELECT COUNT(*) FROM {}", ident(&table));
                let expected: i64 = sqlx::query_scalar(&count)
                    .fetch_one(&mut before)
                    .await
                    .unwrap();
                let actual: i64 = sqlx::query_scalar(&count)
                    .fetch_one(&mut after)
                    .await
                    .unwrap();
                assert_eq!(actual, expected, "{table} lost rows");
                let cols = columns(&mut before, &table).await.unwrap();
                let keys = cols
                    .iter()
                    .filter(|c| c.key)
                    .map(|c| ident(&c.name))
                    .collect::<Vec<_>>()
                    .join(", ");
                let sample = format!(
                    "SELECT {} FROM {} ORDER BY {keys} LIMIT 1",
                    projection(&cols),
                    ident(&table)
                );
                let expected = sqlx::query(&sample)
                    .fetch_optional(&mut before)
                    .await
                    .unwrap();
                let actual = sqlx::query(&sample)
                    .fetch_optional(&mut after)
                    .await
                    .unwrap();
                if let Some(expected) = expected {
                    let actual = actual.unwrap();
                    for (i, column) in cols.iter().enumerate() {
                        assert_eq!(
                            actual.get::<Option<&str>, _>(i),
                            expected.get::<Option<&str>, _>(i),
                            "{table}.{} changed",
                            column.name
                        );
                    }
                }
            }
            // A retry must not silently skip rows or report partial-target success.
            assert!(migrate(
                &source,
                &target,
                Path::new(&source_root),
                target_root.path(),
                1,
                true,
                false
            )
            .await
            .is_err());
        });
    }
}
