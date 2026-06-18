use super::*;

impl AppRepository {
    pub(super) async fn create_issue_event(
        &self,
        issue_id: i64,
        sender_login_id: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
    ) -> Result<(), DbErr> {
        let mut old_value_to_write = old_value.to_string();
        if issue_event_uses_draft_merge(event_type) {
            if let Some(previous) = self
                .recent_mergeable_issue_event(issue_id, sender_login_id, event_type)
                .await?
            {
                old_value_to_write = self
                    .read_text_column("issue_event", "old_value", previous.id)
                    .await?;
                issue_event::Entity::delete_by_id(previous.id)
                    .exec(&self.db)
                    .await?;
                if old_value_to_write == new_value {
                    return Ok(());
                }
            }
        }

        let created = issue_event::ActiveModel {
            id: NotSet,
            created: Set(Some(current_datetime())),
            sender_login_id: Set(empty_to_none(Some(sender_login_id.to_string()))),
            sender_email: Set(None),
            issue_id: Set(Some(issue_id)),
            event_type: Set(Some(event_type.to_string())),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("issue_event", "old_value", created.id, &old_value_to_write)
            .await?;
        self.write_text_column("issue_event", "new_value", created.id, new_value)
            .await?;
        Ok(())
    }

    pub(super) async fn recent_mergeable_issue_event(
        &self,
        issue_id: i64,
        sender_login_id: &str,
        event_type: &str,
    ) -> Result<Option<issue_event::Model>, DbErr> {
        let now = current_datetime();
        let events = issue_event::Entity::find()
            .filter(issue_event::Column::IssueId.eq(Some(issue_id)))
            .filter(issue_event::Column::SenderLoginId.eq(Some(sender_login_id.to_string())))
            .filter(issue_event::Column::EventType.eq(Some(event_type.to_string())))
            .order_by_desc(issue_event::Column::Id)
            .all(&self.db)
            .await?;
        Ok(events.into_iter().find(|event| {
            event.created.is_some_and(|created| {
                now.signed_duration_since(created).num_milliseconds()
                    < issue_event_draft_time_in_millis()
            })
        }))
    }
}
