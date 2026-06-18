use super::*;

impl AppRepository {
    pub(super) async fn create_notification_event_for_receivers(
        &self,
        sender_id: i64,
        resource_type: &str,
        resource_id: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
        receiver_ids: &[i64],
    ) -> Result<(), DbErr> {
        let mut unique_receiver_ids = receiver_ids.to_vec();
        unique_receiver_ids.sort_unstable();
        unique_receiver_ids.dedup();
        unique_receiver_ids.retain(|user_id| *user_id != sender_id);
        if unique_receiver_ids.is_empty() {
            return Ok(());
        }

        let now = current_datetime();
        let mut old_value_to_write = old_value.to_string();
        if notification_event_uses_draft_merge(event_type) {
            if let Some(previous) = self
                .recent_mergeable_notification_event(
                    sender_id,
                    resource_type,
                    resource_id,
                    event_type,
                    now,
                )
                .await?
            {
                old_value_to_write = self
                    .read_text_column("notification_event", "old_value", previous.id)
                    .await?;
                self.delete_notification_event_rows(previous.id).await?;
                if old_value_to_write == new_value {
                    return Ok(());
                }
            }
        }

        let created = notification_event::ActiveModel {
            id: NotSet,
            title: Set(None),
            sender_id: Set(Some(sender_id)),
            created: Set(Some(now)),
            resource_type: Set(Some(resource_type.to_string())),
            resource_id: Set(Some(resource_id.to_string())),
            event_type: Set(Some(event_type.to_string())),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "notification_event",
            "old_value",
            created.id,
            &old_value_to_write,
        )
        .await?;
        self.write_text_column("notification_event", "new_value", created.id, new_value)
            .await?;
        notification_mail::ActiveModel {
            id: NotSet,
            notification_event_id: Set(Some(created.id)),
        }
        .insert(&self.db)
        .await?;

        for receiver_id in unique_receiver_ids {
            notification_event_n4user::ActiveModel {
                notification_event_id: Set(created.id),
                n4user_id: Set(receiver_id),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(())
    }

    pub(super) async fn recent_mergeable_notification_event(
        &self,
        sender_id: i64,
        resource_type: &str,
        resource_id: &str,
        event_type: &str,
        now: DateTime,
    ) -> Result<Option<notification_event::Model>, DbErr> {
        let events = notification_event::Entity::find()
            .filter(notification_event::Column::SenderId.eq(Some(sender_id)))
            .filter(notification_event::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(notification_event::Column::ResourceId.eq(Some(resource_id.to_string())))
            .filter(notification_event::Column::EventType.eq(Some(event_type.to_string())))
            .order_by_desc(notification_event::Column::Id)
            .all(&self.db)
            .await?;
        Ok(events.into_iter().find(|event| {
            event.created.is_some_and(|created| {
                now.signed_duration_since(created).num_milliseconds()
                    < self.config.notification_draft_time_in_millis()
            })
        }))
    }

    pub(super) async fn delete_notification_event_rows(&self, event_id: i64) -> Result<(), DbErr> {
        notification_event_n4user::Entity::delete_many()
            .filter(notification_event_n4user::Column::NotificationEventId.eq(event_id))
            .exec(&self.db)
            .await?;
        notification_mail::Entity::delete_many()
            .filter(notification_mail::Column::NotificationEventId.eq(Some(event_id)))
            .exec(&self.db)
            .await?;
        notification_event::Entity::delete_by_id(event_id)
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub(super) async fn create_notification_event_for_commit_discussion(
        &self,
        sender_id: i64,
        resource_type: &str,
        resource_id: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
        receiver_ids: &[i64],
    ) -> Result<(), DbErr> {
        let mut unique_receiver_ids = receiver_ids.to_vec();
        unique_receiver_ids.sort_unstable();
        unique_receiver_ids.dedup();
        unique_receiver_ids.retain(|user_id| *user_id != sender_id);

        let created = notification_event::ActiveModel {
            id: NotSet,
            title: Set(None),
            sender_id: Set(Some(sender_id)),
            created: Set(Some(current_datetime())),
            resource_type: Set(Some(resource_type.to_string())),
            resource_id: Set(Some(resource_id.to_string())),
            event_type: Set(Some(event_type.to_string())),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("notification_event", "old_value", created.id, old_value)
            .await?;
        self.write_text_column("notification_event", "new_value", created.id, new_value)
            .await?;
        notification_mail::ActiveModel {
            id: NotSet,
            notification_event_id: Set(Some(created.id)),
        }
        .insert(&self.db)
        .await?;

        for receiver_id in unique_receiver_ids {
            notification_event_n4user::ActiveModel {
                notification_event_id: Set(created.id),
                n4user_id: Set(receiver_id),
            }
            .insert(&self.db)
            .await?;
        }

        Ok(())
    }
}
