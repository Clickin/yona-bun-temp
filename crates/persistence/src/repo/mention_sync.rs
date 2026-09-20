use super::*;

impl AppRepositoryImpl<'_> {
    pub(super) async fn sync_posting_mentions_and_notify(
        &self,
        sender_id: i64,
        project_id: i64,
        posting_id: i64,
        posting_author_id: Option<i64>,
        resource_type: &str,
        resource_id: i64,
        text: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
        mention_mode: PostingMentionNotificationMode,
        send_notification: bool,
    ) -> Result<MentionSyncResult, DbErr> {
        let mentioned_user_ids = self.mentioned_active_user_ids(text).await?;
        let sync_result = self
            .sync_mentions_for_resource(resource_type, resource_id, mentioned_user_ids)
            .await?;
        if !send_notification {
            return Ok(sync_result);
        }
        let mut receiver_ids = self
            .posting_notification_receiver_ids(
                project_id,
                posting_id,
                posting_author_id,
                event_type,
            )
            .await?;
        match mention_mode {
            PostingMentionNotificationMode::All => {
                receiver_ids.extend(sync_result.mentioned_user_ids.iter().copied());
            }
            PostingMentionNotificationMode::NewOnly => {
                receiver_ids.extend(sync_result.newly_mentioned_user_ids.iter().copied());
            }
        }
        self.create_notification_event_for_receivers(
            sender_id,
            resource_type,
            &resource_id.to_string(),
            event_type,
            old_value,
            new_value,
            &receiver_ids,
        )
        .await?;
        Ok(sync_result)
    }

    pub(super) async fn sync_mentions_for_resource(
        &self,
        resource_type: &str,
        resource_id: i64,
        mentioned_user_ids: HashSet<i64>,
    ) -> Result<MentionSyncResult, DbErr> {
        let resource_id_string = resource_id.to_string();
        let existing = mention::Entity::find()
            .filter(mention::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(mention::Column::ResourceId.eq(Some(resource_id_string.clone())))
            .all(&self.db)
            .await?;
        let existing_user_ids = existing
            .iter()
            .filter_map(|row| row.user_id)
            .collect::<HashSet<_>>();

        for row in existing {
            if !row
                .user_id
                .is_some_and(|user_id| mentioned_user_ids.contains(&user_id))
            {
                mention::Entity::delete_by_id(row.id).exec(&self.db).await?;
            }
        }

        let mut newly_mentioned_user_ids = Vec::new();
        for user_id in mentioned_user_ids.iter().copied() {
            if existing_user_ids.contains(&user_id) {
                continue;
            }
            mention::ActiveModel {
                id: NotSet,
                resource_type: Set(Some(resource_type.to_string())),
                resource_id: Set(Some(resource_id_string.clone())),
                user_id: Set(Some(user_id)),
            }
            .insert(&self.db)
            .await?;
            newly_mentioned_user_ids.push(user_id);
        }

        let mut mentioned_user_ids = mentioned_user_ids.into_iter().collect::<Vec<_>>();
        mentioned_user_ids.sort_unstable();
        newly_mentioned_user_ids.sort_unstable();

        Ok(MentionSyncResult {
            mentioned_user_ids,
            newly_mentioned_user_ids,
        })
    }

    pub(super) async fn mentioned_active_user_ids(
        &self,
        text: &str,
    ) -> Result<HashSet<i64>, DbErr> {
        let mut user_ids = HashSet::new();
        for token in extract_mention_tokens(text) {
            if let Some((owner_name, project_name)) = token.split_once('/') {
                if let Some(project_record) = self
                    .read_project_by_owner_and_name(owner_name, project_name)
                    .await?
                {
                    for membership in project_user::Entity::find()
                        .filter(project_user::Column::ProjectId.eq(Some(project_record.id)))
                        .all(&self.db)
                        .await?
                    {
                        self.insert_active_mentioned_user_id(&mut user_ids, membership.user_id)
                            .await?;
                    }
                }
                continue;
            }

            if let Some(user) = n4user::Entity::find()
                .filter(n4user::Column::LoginId.eq(Some(normalize_identity(&token))))
                .one(&self.db)
                .await?
            {
                if n4user_is_active(&user) {
                    user_ids.insert(user.id);
                }
            }

            if let Some(organization_record) = self.read_organization_by_name(&token).await? {
                for membership in organization_user::Entity::find()
                    .filter(
                        organization_user::Column::OrganizationId.eq(Some(organization_record.id)),
                    )
                    .all(&self.db)
                    .await?
                {
                    self.insert_active_mentioned_user_id(&mut user_ids, membership.user_id)
                        .await?;
                }
            }
        }
        Ok(user_ids)
    }

    pub(super) async fn insert_active_mentioned_user_id(
        &self,
        user_ids: &mut HashSet<i64>,
        user_id: Option<i64>,
    ) -> Result<(), DbErr> {
        let Some(user_id) = user_id else {
            return Ok(());
        };
        if let Some(user) = self.find_user_model_by_id(user_id).await? {
            if n4user_is_active(&user) {
                user_ids.insert(user_id);
            }
        }
        Ok(())
    }

    pub(super) async fn sync_mentions_and_notify(
        &self,
        sender_id: i64,
        resource_type: &str,
        resource_id: i64,
        text: &str,
        event_type: &str,
        old_value: &str,
        new_value: &str,
    ) -> Result<MentionSyncResult, DbErr> {
        let mentioned_user_ids = self.mentioned_active_user_ids(text).await?;
        let sync_result = self
            .sync_mentions_for_resource(resource_type, resource_id, mentioned_user_ids)
            .await?;
        self.create_notification_event_for_receivers(
            sender_id,
            resource_type,
            &resource_id.to_string(),
            event_type,
            old_value,
            new_value,
            &sync_result.newly_mentioned_user_ids,
        )
        .await?;
        Ok(sync_result)
    }
}
