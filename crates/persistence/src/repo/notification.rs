use super::*;

#[derive(Debug, FromQueryResult)]
struct NotificationListRow {
    id: i64,
    title: Option<String>,
    created: Option<DateTime>,
    resource_type: Option<String>,
    resource_id: Option<String>,
    event_type: Option<String>,
    old_value: Option<String>,
    new_value: Option<String>,
    actor_display_name: Option<String>,
    actor_login_id: Option<String>,
    target_kind: Option<String>,
    target_owner: Option<String>,
    target_project: Option<String>,
    target_number: Option<i64>,
    target_resource_title: Option<String>,
    comment_id: Option<i64>,
    commit_id: Option<String>,
    reply_resource_type: Option<String>,
    reply_resource_id: Option<i64>,
}

fn notification_list_sql(backend: DatabaseBackend) -> String {
    let (user, size, from, resource_id_number) = match backend {
        DatabaseBackend::Postgres => (
            "$1",
            "$2",
            "$3",
            "CASE WHEN TRIM(ne.resource_id) ~ '^-?[0-9]+$' THEN CAST(ne.resource_id AS BIGINT) END",
        ),
        DatabaseBackend::MySql => ("?", "?", "?", "CAST(ne.resource_id AS SIGNED)"),
        DatabaseBackend::Sqlite => ("?", "?", "?", "CAST(ne.resource_id AS INTEGER)"),
    };
    format!(
        r#"
SELECT e.id, e.title, e.created, e.resource_type, e.resource_id, e.event_type,
       e.old_value, e.new_value,
       actor.name AS actor_display_name, actor.login_id AS actor_login_id,
       CASE
         WHEN e.normalized_resource_type = 'project' AND direct_project.id IS NOT NULL THEN 'project'
         WHEN e.normalized_resource_type IN ('issue', 'issue_post') AND issue_target.id IS NOT NULL THEN 'issue'
         WHEN e.normalized_resource_type = 'issue_comment' AND issue_target.id IS NOT NULL THEN 'issue'
         WHEN e.normalized_resource_type = 'posting' AND posting_target.id IS NOT NULL THEN 'posting'
         WHEN e.normalized_resource_type = 'posting_comment' AND posting_target.id IS NOT NULL THEN 'posting'
         WHEN e.normalized_resource_type IN ('pull_request', 'review_comment') AND pull_request_target.id IS NOT NULL THEN 'pull_request'
         WHEN e.normalized_resource_type = 'review_comment' AND commit_project.id IS NOT NULL THEN 'commit'
       END AS target_kind,
       COALESCE(direct_project.owner, issue_project.owner, posting_project.owner,
                pull_request_project.owner, commit_project.owner) AS target_owner,
       COALESCE(direct_project.name, issue_project.name, posting_project.name,
                pull_request_project.name, commit_project.name) AS target_project,
       COALESCE(issue_target.number, posting_target.number, pull_request_target.number) AS target_number,
       COALESCE(direct_project.name, issue_target.title, posting_target.title,
                pull_request_target.title, comment_thread.commit_id) AS target_resource_title,
       COALESCE(issue_comment.id, posting_comment.id, review_comment.id) AS comment_id,
       comment_thread.commit_id AS commit_id,
       CASE
         WHEN e.normalized_resource_type IN ('issue', 'issue_post', 'issue_comment') THEN 'issue_post'
         WHEN e.normalized_resource_type IN ('posting', 'board_post', 'posting_comment', 'nonissue_comment') THEN 'board_post'
         WHEN e.normalized_resource_type = 'review_comment' THEN 'comment_thread'
       END AS reply_resource_type,
       CASE
         WHEN e.normalized_resource_type IN ('issue', 'issue_post', 'posting', 'board_post') THEN e.resource_id_number
         WHEN e.normalized_resource_type = 'issue_comment' THEN issue_comment.issue_id
         WHEN e.normalized_resource_type IN ('posting_comment', 'nonissue_comment') THEN posting_comment.posting_id
         WHEN e.normalized_resource_type = 'review_comment' THEN review_comment.thread_id
       END AS reply_resource_id
FROM (
    SELECT ne.id, ne.title, ne.sender_id, ne.created, ne.resource_type, ne.resource_id,
           ne.event_type, ne.old_value, ne.new_value,
           LOWER(TRIM(COALESCE(ne.resource_type, ''))) AS normalized_resource_type,
           {resource_id_number} AS resource_id_number
    FROM notification_event_n4user receiver
    JOIN notification_event ne ON ne.id = receiver.notification_event_id
    WHERE receiver.n4user_id = {user}
    ORDER BY ne.created DESC, ne.id DESC
    LIMIT {size} OFFSET {from}
) e
LEFT JOIN n4user actor ON actor.id = e.sender_id
LEFT JOIN project direct_project
       ON e.normalized_resource_type = 'project' AND direct_project.id = e.resource_id_number
LEFT JOIN issue_comment
       ON e.normalized_resource_type = 'issue_comment' AND issue_comment.id = e.resource_id_number
LEFT JOIN issue issue_target
       ON issue_target.id = CASE
            WHEN e.normalized_resource_type IN ('issue', 'issue_post') THEN e.resource_id_number
            WHEN e.normalized_resource_type = 'issue_comment' THEN issue_comment.issue_id
          END
LEFT JOIN project issue_project ON issue_project.id = issue_target.project_id
LEFT JOIN posting_comment
       ON e.normalized_resource_type IN ('posting_comment', 'nonissue_comment')
      AND posting_comment.id = e.resource_id_number
LEFT JOIN posting posting_target
       ON posting_target.id = CASE
            WHEN e.normalized_resource_type = 'posting' THEN e.resource_id_number
            WHEN e.normalized_resource_type = 'posting_comment' THEN posting_comment.posting_id
          END
LEFT JOIN project posting_project ON posting_project.id = posting_target.project_id
LEFT JOIN review_comment
       ON e.normalized_resource_type = 'review_comment' AND review_comment.id = e.resource_id_number
LEFT JOIN comment_thread ON comment_thread.id = review_comment.thread_id
LEFT JOIN pull_request pull_request_target
       ON pull_request_target.id = CASE
            WHEN e.normalized_resource_type = 'pull_request' THEN e.resource_id_number
            WHEN e.normalized_resource_type = 'review_comment' THEN comment_thread.pull_request_id
          END
LEFT JOIN project pull_request_project ON pull_request_project.id = pull_request_target.to_project_id
LEFT JOIN project commit_project
       ON e.normalized_resource_type = 'review_comment'
      AND comment_thread.pull_request_id IS NULL
      AND commit_project.id = comment_thread.project_id
ORDER BY e.created DESC, e.id DESC
"#
    )
}

fn notification_list_item(row: NotificationListRow) -> NotificationItemRecord {
    let resource_type = row.resource_type.unwrap_or_default();
    let normalized_type = normalize_identity(&resource_type);
    let target_owner = row.target_owner.unwrap_or_default();
    let target_project = row.target_project.unwrap_or_default();
    let comment_anchor = row
        .comment_id
        .map(|comment_id| format!("#comment-{comment_id}"))
        .unwrap_or_default();
    let target_path = if target_owner.is_empty() || target_project.is_empty() {
        String::new()
    } else {
        match row.target_kind.as_deref() {
            Some("project") => format!("/{target_owner}/{target_project}"),
            Some("issue") => format!(
                "/{target_owner}/{target_project}/issue/{}{}",
                row.target_number.unwrap_or_default(),
                comment_anchor
            ),
            Some("posting") => format!(
                "/{target_owner}/{target_project}/post/{}{}",
                row.target_number.unwrap_or_default(),
                comment_anchor
            ),
            Some("pull_request") => format!(
                "/{target_owner}/{target_project}/pullRequest/{}{}",
                row.target_number.unwrap_or_default(),
                if normalized_type == "review_comment" {
                    format!("/changes{comment_anchor}")
                } else {
                    String::new()
                }
            ),
            Some("commit") => format!(
                "/{target_owner}/{target_project}/commit/{}{}",
                row.commit_id.unwrap_or_default(),
                comment_anchor
            ),
            _ => String::new(),
        }
    };
    let target_title = row
        .title
        .as_deref()
        .filter(|title| !title.trim().is_empty())
        .or_else(|| {
            (!target_path.is_empty())
                .then_some(row.target_resource_title.as_deref())
                .flatten()
        })
        .unwrap_or_default()
        .to_string();
    let event_type = row.event_type.unwrap_or_default();
    let old_value = row.old_value.unwrap_or_default();
    let new_value = row.new_value.unwrap_or_default();
    let reply_resource_type = if row.reply_resource_id.is_some() {
        row.reply_resource_type.unwrap_or_default()
    } else {
        String::new()
    };

    NotificationItemRecord {
        actor: NotificationActorRecord {
            avatar_url: String::new(),
            display_name: row.actor_display_name.unwrap_or_default(),
            login_id: row.actor_login_id.unwrap_or_default(),
        },
        created: row.created,
        event_type: event_type.clone(),
        id: row.id,
        message: notification_message(&event_type, &old_value, &new_value),
        reply_resource_id: row
            .reply_resource_id
            .map(|resource_id| resource_id.to_string())
            .unwrap_or_default(),
        reply_resource_type,
        resource_id: row.resource_id.unwrap_or_default(),
        resource_type,
        target_path,
        target_title,
        type_icon: notification_type_icon(&event_type, &new_value).to_string(),
    }
}

impl AppRepositoryImpl<'_> {
    pub async fn list_watched_project_notifications_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<WatchedProjectNotificationsRecord>, DbErr> {
        let watched_rows = watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .order_by_asc(watch::Column::Id)
            .all(&self.db)
            .await?;

        let mut watched_projects = Vec::new();
        for watch_row in watched_rows {
            let Some(project_id) = watch_row
                .resource_id
                .as_deref()
                .and_then(|value| value.parse::<i64>().ok())
            else {
                continue;
            };
            let Some(project_row) = project::Entity::find_by_id(project_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            let (Some(owner_name), Some(project_name)) =
                (project_row.owner.clone(), project_row.name.clone())
            else {
                continue;
            };

            let overrides = user_project_notification::Entity::find()
                .filter(user_project_notification::Column::UserId.eq(Some(user_id)))
                .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
                .all(&self.db)
                .await?;

            let notifications = WORKSPACE_NOTIFICATION_TYPES
                .iter()
                .map(|(event_type, label)| {
                    let enabled = overrides
                        .iter()
                        .find(|row| row.notification_type.as_deref() == Some(*event_type))
                        .map(|row| row.allowed.unwrap_or(1) != 0)
                        .unwrap_or_else(|| workspace_notification_enabled_by_default(event_type));

                    WorkspaceNotificationPreferenceRecord {
                        enabled,
                        event_type: (*event_type).to_string(),
                        label: (*label).to_string(),
                    }
                })
                .collect();

            watched_projects.push(WatchedProjectNotificationsRecord {
                notifications,
                owner_name,
                project_id: project_id.to_string(),
                project_name,
            });
        }

        Ok(watched_projects)
    }

    pub async fn toggle_workspace_notification_for_user(
        &self,
        user_id: i64,
        project_id: i64,
        event_type: &str,
    ) -> Result<(), DbErr> {
        let existing = user_project_notification::Entity::find()
            .filter(user_project_notification::Column::UserId.eq(Some(user_id)))
            .filter(user_project_notification::Column::ProjectId.eq(Some(project_id)))
            .filter(
                user_project_notification::Column::NotificationType
                    .eq(Some(event_type.to_string())),
            )
            .one(&self.db)
            .await?;

        match existing {
            Some(row) => {
                let current_allowed = row.allowed.unwrap_or(1) != 0;
                let next_allowed = !current_allowed;
                if next_allowed == workspace_notification_enabled_by_default(event_type) {
                    user_project_notification::Entity::delete_by_id(row.id)
                        .exec(&self.db)
                        .await?;
                } else {
                    let mut active = user_project_notification::ActiveModel::from(row);
                    active.allowed = Set(Some(if next_allowed { 1 } else { 0 }));
                    active.update(&self.db).await?;
                }
            }
            None => {
                let next_allowed = !workspace_notification_enabled_by_default(event_type);
                user_project_notification::ActiveModel {
                    id: NotSet,
                    user_id: Set(Some(user_id)),
                    project_id: Set(Some(project_id)),
                    notification_type: Set(Some(event_type.to_string())),
                    allowed: Set(Some(if next_allowed { 1 } else { 0 })),
                }
                .insert(&self.db)
                .await?;
            }
        }

        Ok(())
    }

    pub async fn list_notifications_for_user(
        &self,
        user_id: i64,
        from: u32,
        size: u32,
    ) -> Result<NotificationListRecord, DbErr> {
        let total = notification_event_n4user::Entity::find()
            .filter(notification_event_n4user::Column::N4userId.eq(user_id))
            .count(&self.db)
            .await? as u32;
        let size = size.clamp(1, 100);
        let backend = self.db.get_database_backend();
        let rows = NotificationListRow::find_by_statement(Statement::from_sql_and_values(
            backend,
            notification_list_sql(backend),
            vec![
                user_id.into(),
                i64::from(size).into(),
                i64::from(from).into(),
            ],
        ))
        .all(&self.db)
        .await?;
        let items = rows
            .into_iter()
            .map(notification_list_item)
            .collect::<Vec<_>>();
        let has_more = !items.is_empty();

        Ok(NotificationListRecord {
            has_more,
            items,
            total,
        })
    }

    pub async fn drain_due_notification_mails(
        &self,
        now: DateTime,
        delay_ms: i64,
    ) -> Result<Vec<i64>, DbErr> {
        let mails = notification_mail::Entity::find().all(&self.db).await?;
        let mut due = Vec::new();
        for mail in mails {
            let Some(event_id) = mail.notification_event_id else {
                continue;
            };
            let Some(event) = notification_event::Entity::find_by_id(event_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            if notification_mail_is_due(event.created, now, delay_ms) {
                due.push((event.created, event.id, mail.id));
            }
        }
        due.sort_by(|left, right| {
            left.0
                .cmp(&right.0)
                .then_with(|| left.1.cmp(&right.1))
                .then_with(|| left.2.cmp(&right.2))
        });
        let event_ids = due
            .iter()
            .map(|(_, event_id, _)| *event_id)
            .collect::<Vec<_>>();
        let mail_ids = due
            .iter()
            .map(|(_, _, mail_id)| *mail_id)
            .collect::<Vec<_>>();
        if !mail_ids.is_empty() {
            notification_mail::Entity::delete_many()
                .filter(notification_mail::Column::Id.is_in(mail_ids))
                .exec(&self.db)
                .await?;
        }
        Ok(event_ids)
    }

    pub async fn drain_due_notification_mail_deliveries(
        &self,
        now: DateTime,
        delay_ms: i64,
    ) -> Result<Vec<NotificationMailDeliveryRecord>, DbErr> {
        let mails = notification_mail::Entity::find().all(&self.db).await?;
        let mut due = Vec::new();
        for mail in mails {
            let Some(event_id) = mail.notification_event_id else {
                continue;
            };
            let Some(event) = notification_event::Entity::find_by_id(event_id)
                .one(&self.db)
                .await?
            else {
                continue;
            };
            let Some(created) = event.created else {
                continue;
            };
            if notification_mail_is_due(Some(created), now, delay_ms) {
                due.push((created, event.id, mail.id, event));
            }
        }
        due.sort_by(|left, right| {
            left.0
                .cmp(&right.0)
                .then_with(|| left.1.cmp(&right.1))
                .then_with(|| left.2.cmp(&right.2))
        });

        let mut deliveries = Vec::new();
        let mut mail_ids = Vec::new();
        for (_, _, mail_id, event) in due {
            mail_ids.push(mail_id);
            let item = self.notification_item_record(event.clone()).await?;
            if item.target_path.is_empty() {
                continue;
            }
            let receivers = notification_event_n4user::Entity::find()
                .filter(notification_event_n4user::Column::NotificationEventId.eq(event.id))
                .all(&self.db)
                .await?;
            let mut recipients = Vec::new();
            for receiver in receivers {
                if let Some(user) = self.find_user_model_by_id(receiver.n4user_id).await? {
                    let email = user.email.clone().unwrap_or_default().trim().to_string();
                    let language = user.lang.clone().unwrap_or_default().trim().to_string();
                    if n4user_is_active(&user) && !email.is_empty() {
                        recipients.push((user.login_id.unwrap_or_default(), email, language));
                    }
                }
            }
            recipients.sort_by(|left, right| {
                left.1
                    .cmp(&right.1)
                    .then_with(|| left.0.cmp(&right.0))
                    .then_with(|| left.2.cmp(&right.2))
            });
            recipients.dedup_by(|left, right| left.1 == right.1);
            for (recipient_login_id, recipient_email, recipient_language) in recipients {
                deliveries.push(NotificationMailDeliveryRecord {
                    item: item.clone(),
                    recipient_email,
                    recipient_language,
                    recipient_login_id,
                });
            }
        }

        if !mail_ids.is_empty() {
            notification_mail::Entity::delete_many()
                .filter(notification_mail::Column::Id.is_in(mail_ids))
                .exec(&self.db)
                .await?;
        }

        Ok(deliveries)
    }

    pub async fn read_default_landing_path(&self, user_id: i64) -> Result<Option<String>, DbErr> {
        let row = user_setting::Entity::find()
            .filter(user_setting::Column::UserId.eq(Some(user_id)))
            .order_by_desc(user_setting::Column::Id)
            .one(&self.db)
            .await?;
        Ok(row.and_then(|model| model.login_default_page))
    }

    pub async fn set_default_landing_path(
        &self,
        user_id: i64,
        path: Option<String>,
    ) -> Result<Option<String>, DbErr> {
        let existing = user_setting::Entity::find()
            .filter(user_setting::Column::UserId.eq(Some(user_id)))
            .all(&self.db)
            .await?;

        if let Some(path) = path {
            let normalized_path = path.trim().to_string();
            if let Some(current) = existing.into_iter().next() {
                let mut active = user_setting::ActiveModel::from(current);
                active.login_default_page = Set(Some(normalized_path.clone()));
                active.update(&self.db).await?;
            } else {
                user_setting::ActiveModel {
                    id: NotSet,
                    user_id: Set(Some(user_id)),
                    login_default_page: Set(Some(normalized_path.clone())),
                }
                .insert(&self.db)
                .await?;
            }

            Ok(Some(normalized_path))
        } else {
            for row in existing {
                user_setting::Entity::delete_by_id(row.id)
                    .exec(&self.db)
                    .await?;
            }
            Ok(None)
        }
    }
}
