use super::*;

impl AppRepository {
    pub async fn list_watched_project_notifications_for_user(
        &self,
        user_id: i64,
    ) -> Result<Vec<WatchedProjectNotificationsRecord>, DbErr> {
        let watched_rows = watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("PROJECT".to_string())))
            .order_by_desc(watch::Column::Id)
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
        let receivers = notification_event_n4user::Entity::find()
            .filter(notification_event_n4user::Column::N4userId.eq(user_id))
            .all(&self.db)
            .await?;
        let mut events = Vec::new();
        for receiver in receivers {
            let event = notification_event::Entity::find_by_id(receiver.notification_event_id)
                .one(&self.db)
                .await?;
            if let Some(event) = event {
                events.push(event);
            }
        }
        events.sort_by(|left, right| {
            right
                .created
                .cmp(&left.created)
                .then_with(|| right.id.cmp(&left.id))
        });

        let total = events.len() as u32;
        let from = from as usize;
        let size = size.clamp(1, 100) as usize;
        let has_more = from.saturating_add(size) < events.len();
        let page = events.into_iter().skip(from).take(size);
        let mut items = Vec::new();
        for event in page {
            items.push(self.notification_item_record(event).await?);
        }

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
