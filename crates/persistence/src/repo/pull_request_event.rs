use super::*;

impl AppRepositoryImpl<'_> {
    pub(super) async fn create_pull_request_event(
        &self,
        pull_request_id: i64,
        sender_login_id: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
    ) -> Result<(), DbErr> {
        let created = pull_request_event::ActiveModel {
            id: NotSet,
            created: Set(Some(current_datetime())),
            sender_login_id: Set(empty_to_none(Some(sender_login_id.to_string()))),
            pull_request_id: Set(Some(pull_request_id)),
            event_type: Set(Some(event_type.to_string())),
        }
        .insert(&self.db)
        .await?;
        self.write_text_column("pull_request_event", "old_value", created.id, old_value)
            .await?;
        self.write_text_column("pull_request_event", "new_value", created.id, new_value)
            .await?;
        Ok(())
    }
}
