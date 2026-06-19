use sea_orm::{DbBackend, EntityName, EntityTrait, Iterable, RelationTrait, Schema};
use sea_orm_migration::prelude::*;
use sea_query::{
    Alias, ColumnDef, Index, IndexCreateStatement, Table, TableAlterStatement,
    TableCreateStatement, TableRef,
};
use serde::Deserialize;
use yona_rust_persistence_entities::{
    assignee, attachment, comment_thread, comment_thread_n4user, commit_comment, email,
    favorite_issue, favorite_organization, favorite_project, issue, issue_comment,
    issue_comment_voter, issue_event, issue_issue_label, issue_label, issue_label_category,
    issue_sharer, issue_voter, label, linked_account, mention, milestone, n4user,
    notification_event, notification_event_n4user, notification_mail, organization,
    organization_user, original_email, posting, posting_comment, posting_issue_label, project,
    project_label, project_menu_setting, project_pushed_branch, project_transfer, project_user,
    project_visitation, property, pull_request, pull_request_commit, pull_request_event,
    pull_request_reviewers, recent_issue, recent_project, recently_visited_projects,
    review_comment, role, site_admin, title_head, unwatch, user_credential,
    user_enrolled_organization, user_enrolled_project, user_project_notification, user_setting,
    user_verification, watch, webhook, webhook_delivery, webhook_thread,
};

const MANIFEST_JSON: &str = include_str!("../legacy-final-schema-manifest.json");

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
    #[serde(rename = "type")]
    column_type: String,
    nullable: bool,
    ignored: bool,
    attributes: Vec<String>,
}

struct EntityRegistration {
    table_name: String,
    dependencies: fn() -> Vec<String>,
    table_stmt: fn(DbBackend) -> TableCreateStatement,
}

macro_rules! with_entities {
    ($macro:ident) => {
        $macro!(assignee::Entity);
        $macro!(attachment::Entity);
        $macro!(comment_thread::Entity);
        $macro!(comment_thread_n4user::Entity);
        $macro!(commit_comment::Entity);
        $macro!(email::Entity);
        $macro!(favorite_issue::Entity);
        $macro!(favorite_organization::Entity);
        $macro!(favorite_project::Entity);
        $macro!(issue::Entity);
        $macro!(issue_comment::Entity);
        $macro!(issue_comment_voter::Entity);
        $macro!(issue_event::Entity);
        $macro!(issue_issue_label::Entity);
        $macro!(issue_label::Entity);
        $macro!(issue_label_category::Entity);
        $macro!(issue_sharer::Entity);
        $macro!(issue_voter::Entity);
        $macro!(label::Entity);
        $macro!(linked_account::Entity);
        $macro!(mention::Entity);
        $macro!(milestone::Entity);
        $macro!(n4user::Entity);
        $macro!(notification_event::Entity);
        $macro!(notification_event_n4user::Entity);
        $macro!(notification_mail::Entity);
        $macro!(organization::Entity);
        $macro!(organization_user::Entity);
        $macro!(original_email::Entity);
        $macro!(posting::Entity);
        $macro!(posting_comment::Entity);
        $macro!(posting_issue_label::Entity);
        $macro!(project::Entity);
        $macro!(project_label::Entity);
        $macro!(project_menu_setting::Entity);
        $macro!(project_pushed_branch::Entity);
        $macro!(project_transfer::Entity);
        $macro!(project_user::Entity);
        $macro!(project_visitation::Entity);
        $macro!(property::Entity);
        $macro!(pull_request::Entity);
        $macro!(pull_request_commit::Entity);
        $macro!(pull_request_event::Entity);
        $macro!(pull_request_reviewers::Entity);
        $macro!(recent_issue::Entity);
        $macro!(recent_project::Entity);
        $macro!(recently_visited_projects::Entity);
        $macro!(review_comment::Entity);
        $macro!(role::Entity);
        $macro!(site_admin::Entity);
        $macro!(title_head::Entity);
        $macro!(unwatch::Entity);
        $macro!(user_credential::Entity);
        $macro!(user_enrolled_organization::Entity);
        $macro!(user_enrolled_project::Entity);
        $macro!(user_project_notification::Entity);
        $macro!(user_setting::Entity);
        $macro!(user_verification::Entity);
        $macro!(watch::Entity);
        $macro!(webhook::Entity);
        $macro!(webhook_delivery::Entity);
        $macro!(webhook_thread::Entity);
    };
}

macro_rules! build_registrations {
    ($entity:path) => {
        EntityRegistration {
            table_name: <$entity as Default>::default().table_name().to_string(),
            dependencies: dependencies_for::<$entity>,
            table_stmt: table_stmt_for::<$entity>,
        }
    };
}

macro_rules! extend_indexes {
    ($batches:ident, $backend:expr, $entity:path) => {
        $batches.extend(create_entity_indexes::<$entity>($backend)?);
    };
}

macro_rules! entity_registrations {
    () => {
        vec![
            build_registrations!(assignee::Entity),
            build_registrations!(attachment::Entity),
            build_registrations!(comment_thread::Entity),
            build_registrations!(comment_thread_n4user::Entity),
            build_registrations!(commit_comment::Entity),
            build_registrations!(email::Entity),
            build_registrations!(favorite_issue::Entity),
            build_registrations!(favorite_organization::Entity),
            build_registrations!(favorite_project::Entity),
            build_registrations!(issue::Entity),
            build_registrations!(issue_comment::Entity),
            build_registrations!(issue_comment_voter::Entity),
            build_registrations!(issue_event::Entity),
            build_registrations!(issue_issue_label::Entity),
            build_registrations!(issue_label::Entity),
            build_registrations!(issue_label_category::Entity),
            build_registrations!(issue_sharer::Entity),
            build_registrations!(issue_voter::Entity),
            build_registrations!(label::Entity),
            build_registrations!(linked_account::Entity),
            build_registrations!(mention::Entity),
            build_registrations!(milestone::Entity),
            build_registrations!(n4user::Entity),
            build_registrations!(notification_event::Entity),
            build_registrations!(notification_event_n4user::Entity),
            build_registrations!(notification_mail::Entity),
            build_registrations!(organization::Entity),
            build_registrations!(organization_user::Entity),
            build_registrations!(original_email::Entity),
            build_registrations!(posting::Entity),
            build_registrations!(posting_comment::Entity),
            build_registrations!(posting_issue_label::Entity),
            build_registrations!(project::Entity),
            build_registrations!(project_label::Entity),
            build_registrations!(project_menu_setting::Entity),
            build_registrations!(project_pushed_branch::Entity),
            build_registrations!(project_transfer::Entity),
            build_registrations!(project_user::Entity),
            build_registrations!(project_visitation::Entity),
            build_registrations!(property::Entity),
            build_registrations!(pull_request::Entity),
            build_registrations!(pull_request_commit::Entity),
            build_registrations!(pull_request_event::Entity),
            build_registrations!(pull_request_reviewers::Entity),
            build_registrations!(recent_issue::Entity),
            build_registrations!(recent_project::Entity),
            build_registrations!(recently_visited_projects::Entity),
            build_registrations!(review_comment::Entity),
            build_registrations!(role::Entity),
            build_registrations!(site_admin::Entity),
            build_registrations!(title_head::Entity),
            build_registrations!(unwatch::Entity),
            build_registrations!(user_credential::Entity),
            build_registrations!(user_enrolled_organization::Entity),
            build_registrations!(user_enrolled_project::Entity),
            build_registrations!(user_project_notification::Entity),
            build_registrations!(user_setting::Entity),
            build_registrations!(user_verification::Entity),
            build_registrations!(watch::Entity),
            build_registrations!(webhook::Entity),
            build_registrations!(webhook_delivery::Entity),
            build_registrations!(webhook_thread::Entity),
        ]
    };
}

pub async fn create_schema(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    let backend = manager.get_database_backend();
    for registration in sorted_registrations()? {
        manager
            .create_table((registration.table_stmt)(backend))
            .await?;
    }

    for statement in create_ignored_column_alters(backend)? {
        manager.alter_table(statement).await?;
    }

    for stmt in create_all_indexes(backend)? {
        manager.create_index(stmt).await?;
    }

    Ok(())
}

pub fn schema_sql(backend: DbBackend) -> Result<Vec<String>, DbErr> {
    let mut statements = Vec::new();

    for registration in sorted_registrations()? {
        statements.push(
            backend
                .build(&(registration.table_stmt)(backend))
                .to_string(),
        );
    }

    for statement in create_ignored_column_alters(backend)? {
        statements.push(backend.build(&statement).to_string());
    }

    for statement in create_all_indexes(backend)? {
        statements.push(backend.build(&statement).to_string());
    }

    Ok(statements)
}

fn sorted_registrations() -> Result<Vec<EntityRegistration>, DbErr> {
    let mut registrations = entity_registrations!();

    let mut ordered = Vec::new();
    let mut resolved = std::collections::BTreeSet::new();

    while !registrations.is_empty() {
        let mut progress = false;
        let mut next_round = Vec::new();

        for registration in registrations {
            if (registration.dependencies)()
                .into_iter()
                .all(|dependency| resolved.contains(&dependency))
            {
                resolved.insert(registration.table_name.to_string());
                ordered.push(registration);
                progress = true;
            } else {
                next_round.push(registration);
            }
        }

        if !progress {
            let blocked: Vec<String> = next_round
                .iter()
                .map(|registration| registration.table_name.to_string())
                .collect();
            return Err(DbErr::Custom(format!(
                "failed to resolve entity migration order for: {}",
                blocked.join(", ")
            )));
        }

        registrations = next_round;
    }

    Ok(ordered)
}

fn dependencies_for<E>() -> Vec<String>
where
    E: EntityTrait,
    E::Relation: RelationTrait,
{
    let self_name = E::default().table_name().to_string();
    let mut deps = Vec::new();

    for relation in E::Relation::iter() {
        let definition = relation.def();
        if definition.is_owner {
            continue;
        }
        let dependency = table_ref_name(&definition.to_tbl);
        if dependency != self_name {
            deps.push(dependency);
        }
    }

    deps.sort();
    deps.dedup();
    deps
}

fn table_stmt_for<E>(backend: DbBackend) -> TableCreateStatement
where
    E: EntityTrait,
{
    let schema = Schema::new(backend);
    let mut stmt = schema.create_table_from_entity(E::default());
    stmt.if_not_exists();
    stmt
}

fn table_ref_name(table_ref: &TableRef) -> String {
    match table_ref {
        TableRef::Table(table) | TableRef::TableAlias(table, _) => table.to_string(),
        TableRef::SchemaTable(_, table) | TableRef::SchemaTableAlias(_, table, _) => {
            table.to_string()
        }
        TableRef::DatabaseSchemaTable(_, _, table)
        | TableRef::DatabaseSchemaTableAlias(_, _, table, _) => table.to_string(),
        _ => panic!("unsupported table reference in migration builder: {table_ref:?}"),
    }
}

fn create_all_indexes(backend: DbBackend) -> Result<Vec<IndexCreateStatement>, DbErr> {
    let mut batches = Vec::new();
    macro_rules! collect_index_batch {
        ($entity:path) => {
            extend_indexes!(batches, backend, $entity);
        };
    }
    with_entities!(collect_index_batch);
    batches.extend(create_manifest_unique_indexes()?);
    Ok(dedup_indexes(batches, backend))
}

fn create_entity_indexes<E>(backend: DbBackend) -> Result<Vec<IndexCreateStatement>, DbErr>
where
    E: EntityTrait,
{
    let schema = Schema::new(backend);
    Ok(schema.create_index_from_entity(E::default()))
}

fn create_manifest_unique_indexes() -> Result<Vec<IndexCreateStatement>, DbErr> {
    let manifest: SchemaManifest =
        serde_json::from_str(MANIFEST_JSON).map_err(|error| DbErr::Custom(error.to_string()))?;
    let mut indexes = Vec::new();

    for table in manifest.tables {
        let mut groups: std::collections::BTreeMap<String, Vec<String>> =
            std::collections::BTreeMap::new();
        for column in table.columns {
            if column.ignored {
                continue;
            }
            for attribute in column.attributes {
                if let Some(group) = attribute
                    .strip_prefix("unique_key = \"")
                    .and_then(|value| value.strip_suffix('"'))
                {
                    groups
                        .entry(group.to_string())
                        .or_default()
                        .push(column.name.clone());
                }
            }
        }

        for (name, columns) in groups {
            if columns.len() <= 1 {
                continue;
            }
            let mut stmt = Index::create();
            stmt.name(name)
                .table(Alias::new(table.name.clone()))
                .unique();
            for column in columns {
                stmt.col(Alias::new(column));
            }
            indexes.push(stmt.to_owned());
        }
    }

    Ok(indexes)
}

fn create_ignored_column_alters(backend: DbBackend) -> Result<Vec<TableAlterStatement>, DbErr> {
    let manifest: SchemaManifest =
        serde_json::from_str(MANIFEST_JSON).map_err(|error| DbErr::Custom(error.to_string()))?;
    let mut alters = Vec::new();

    for table in manifest.tables {
        for column in table.columns {
            if !column.ignored {
                continue;
            }
            let mut definition = ignored_column_def(&column, backend)?;
            let statement = Table::alter()
                .table(Alias::new(table.name.clone()))
                .add_column(&mut definition)
                .to_owned();
            alters.push(statement);
        }
    }

    Ok(alters)
}

fn ignored_column_def(column: &ColumnManifest, backend: DbBackend) -> Result<ColumnDef, DbErr> {
    let mut definition = ColumnDef::new(Alias::new(column.name.clone()));

    if column
        .attributes
        .iter()
        .any(|attribute| attribute.contains("column_type = \"custom(\\\"LONGTEXT\\\")\""))
    {
        match backend {
            DbBackend::MySql => {
                definition.custom(Alias::new("LONGTEXT"));
            }
            DbBackend::Postgres | DbBackend::Sqlite => {
                definition.text();
            }
        }
    } else if column.column_type.contains("DateTime") {
        definition.date_time();
    } else if column.column_type.contains("String") {
        definition.string();
    } else {
        return Err(DbErr::Custom(format!(
            "unsupported ignored column definition for {} ({})",
            column.name, column.column_type
        )));
    }

    if column.nullable {
        definition.null();
    } else {
        definition.not_null();
    }

    Ok(definition)
}

fn dedup_indexes(
    indexes: Vec<IndexCreateStatement>,
    backend: DbBackend,
) -> Vec<IndexCreateStatement> {
    let mut unique = Vec::new();
    let mut seen = std::collections::BTreeSet::new();

    for index in indexes {
        let sql = backend.build(&index).to_string();
        if seen.insert(sql) {
            unique.push(index);
        }
    }

    unique
}
