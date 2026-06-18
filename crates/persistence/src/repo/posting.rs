impl AppRepository {
    pub async fn list_project_postings_filtered(
        &self,
        owner_name: &str,
        project_name: &str,
        filter: PostingListFilter,
        viewer_id: Option<i64>,
    ) -> Result<ProjectPostingListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        let page_num = filter.page_num.max(1);
        let Some(project) = self
            .read_project_by_owner_and_name(owner_name, project_name)
            .await?
        else {
            return Ok(ProjectPostingListRecord {
                items: Vec::new(),
                notices: Vec::new(),
                page_num,
                page_size: PAGE_SIZE,
                readme: None,
                total_count: 0,
            });
        };

        let rows = posting::Entity::find()
            .filter(posting::Column::ProjectId.eq(Some(project.id)))
            .all(&self.db)
            .await?;
        let mut normal_matches = Vec::new();
        let mut notice_matches = Vec::new();
        let mut readme_row = None;
        for row in rows {
            if row.readme.unwrap_or_default() != 0
                && readme_row
                    .as_ref()
                    .is_none_or(|existing: &posting::Model| row.id > existing.id)
            {
                readme_row = Some(row.clone());
            }
            if row.notice.unwrap_or_default() != 0 {
                notice_matches.push((row, project.clone()));
                continue;
            }
            if let Some(text_filter) = filter.filter.as_deref() {
                if !self
                    .posting_model_matches_text_filter(&row, text_filter)
                    .await?
                {
                    continue;
                }
            }
            let labels = self.list_posting_labels(row.id).await?;
            if !filter.label_ids.is_empty()
                && !filter
                    .label_ids
                    .iter()
                    .all(|id| labels.iter().any(|label| label.id == *id))
            {
                continue;
            }
            normal_matches.push((row, project.clone()));
        }

        sort_posting_models(&mut normal_matches, &filter.order_by, &filter.order_dir);
        sort_posting_models(&mut notice_matches, "updatedDate", "desc");

        let total_count = normal_matches.len() as u32;
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let page_models = normal_matches
            .into_iter()
            .skip(offset)
            .take(PAGE_SIZE as usize)
            .collect::<Vec<_>>();
        let mut items = Vec::new();
        for (row, project) in page_models {
            items.push(
                self.project_posting_list_item_from_model(row, &project)
                    .await?,
            );
        }
        let mut notices = Vec::new();
        for (row, project) in notice_matches {
            notices.push(
                self.project_posting_list_item_from_model(row, &project)
                    .await?,
            );
        }
        let readme = match readme_row {
            Some(row) => Some(
                self.posting_record_from_model(row, &project, viewer_id)
                    .await?,
            ),
            None => None,
        };

        Ok(ProjectPostingListRecord {
            items,
            notices,
            page_num,
            page_size: PAGE_SIZE,
            readme,
            total_count,
        })
    }

    pub async fn list_organization_postings_filtered(
        &self,
        organization_name: &str,
        visible_projects: Vec<ProjectRecord>,
        filter: OrganizationPostingListFilter,
    ) -> Result<OrganizationPostingListRecord, DbErr> {
        const PAGE_SIZE: u32 = 15;
        let page_num = filter.page_num.max(1);
        let visible_projects = {
            let mut projects = visible_projects;
            projects.sort_by(|left, right| left.project_name.cmp(&right.project_name));
            projects
        };
        let visible_project_options = visible_projects
            .iter()
            .map(|project| OrganizationPostingProjectOptionRecord {
                owner_name: project.owner_name.clone(),
                project_name: project.project_name.clone(),
            })
            .collect::<Vec<_>>();
        let project_by_id = visible_projects
            .iter()
            .cloned()
            .map(|project| (project.id, project))
            .collect::<HashMap<_, _>>();
        if project_by_id.is_empty() {
            return Ok(OrganizationPostingListRecord {
                items: Vec::new(),
                notices: Vec::new(),
                organization_name: organization_name.to_string(),
                page_num,
                page_size: PAGE_SIZE,
                total_count: 0,
                visible_projects: visible_project_options,
            });
        }

        let project_name_filter = filter
            .project_names
            .iter()
            .map(|name| normalize_identity(name))
            .filter(|name| !name.is_empty())
            .collect::<HashSet<_>>();
        let rows = posting::Entity::find()
            .filter(posting::Column::ProjectId.is_in(project_by_id.keys().copied().map(Some)))
            .all(&self.db)
            .await?;
        let mut matches = Vec::new();
        for row in rows {
            let Some(project_id) = row.project_id else {
                continue;
            };
            let Some(project) = project_by_id.get(&project_id) else {
                continue;
            };
            if !project_name_filter.is_empty()
                && !project_name_filter.contains(&normalize_identity(&project.project_name))
            {
                continue;
            }
            if let Some(text_filter) = filter.filter.as_deref() {
                if !self
                    .posting_model_matches_text_filter(&row, text_filter)
                    .await?
                {
                    continue;
                }
            }
            matches.push((row, project.clone()));
        }

        sort_posting_models(&mut matches, &filter.order_by, &filter.order_dir);
        let total_count = matches.len() as u32;
        let offset = ((page_num - 1) * PAGE_SIZE) as usize;
        let page_models = matches
            .into_iter()
            .skip(offset)
            .take(PAGE_SIZE as usize)
            .collect::<Vec<_>>();
        let mut items = Vec::new();
        for (row, project) in page_models {
            items.push(
                self.project_posting_list_item_from_model(row, &project)
                    .await?,
            );
        }

        Ok(OrganizationPostingListRecord {
            items,
            notices: Vec::new(),
            organization_name: organization_name.to_string(),
            page_num,
            page_size: PAGE_SIZE,
            total_count,
            visible_projects: visible_project_options,
        })
    }

    pub async fn read_posting_detail_for_viewer(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
        viewer_id: Option<i64>,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((project, model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(None);
        };
        self.posting_record_from_model(model, &project, viewer_id)
            .await
            .map(Some)
    }

    pub async fn restore_posting_history(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
        history_markdown: &str,
    ) -> Result<bool, DbErr> {
        let Some((_project_record, posting_model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(false);
        };
        self.write_text_column("posting", "history", posting_model.id, history_markdown)
            .await?;
        Ok(true)
    }

    pub async fn create_posting(
        &self,
        input: CreatePostingInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        for _attempt in 0..32 {
            let post_number = self.next_posting_number(project_record.id).await?;
            let now = current_datetime();
            let insert_result = posting::ActiveModel {
                id: NotSet,
                title: Set(Some(input.values.title.trim().to_string())),
                created_date: Set(Some(now)),
                updated_date: Set(Some(now)),
                author_id: Set(Some(input.actor_id)),
                author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
                author_name: Set(Some(input.actor_display_name.clone())),
                project_id: Set(Some(project_record.id)),
                number: Set(Some(post_number)),
                num_of_comments: Set(Some(0)),
                notice: Set(Some(bool_to_i16(input.values.notice))),
                readme: Set(Some(bool_to_i16(input.values.readme))),
                parent_id: Set(None),
                updated_by_author_id: Set(Some(input.actor_id)),
                ..Default::default()
            }
            .insert(&self.db)
            .await;

            let created = match insert_result {
                Ok(created) => created,
                Err(error) if is_unique_posting_number_conflict(&error) => continue,
                Err(error) => return Err(error),
            };

            let mut project_active = project::ActiveModel {
                id: Set(project_record.id),
                ..Default::default()
            };
            project_active.last_posting_number = Set(Some(post_number));
            project_active.update(&self.db).await?;

            self.write_text_column("posting", "body", created.id, &input.values.body_markdown)
                .await?;
            if input.values.readme {
                self.clear_other_readme_postings(project_record.id, created.id)
                    .await?;
            }
            self.sync_posting_mentions_and_notify(
                input.actor_id,
                project_record.id,
                created.id,
                created.author_id,
                "posting",
                created.id,
                &input.values.body_markdown,
                "NEW_POSTING",
                "",
                &input.values.body_markdown,
                PostingMentionNotificationMode::All,
            )
            .await?;

            self.replace_posting_labels(created.id, project_record.id, &input.values.label_ids)
                .await?;
            self.bind_attachments(
                BOARD_POST_ATTACHMENT_CONTAINER,
                created.id,
                &input.values.attachment_ids,
                Some(input.actor_id),
            )
            .await?;
            self.watch_posting(created.id, input.actor_id).await?;
            return self
                .posting_record_from_model(created, &project_record, Some(input.actor_id))
                .await
                .map(Some);
        }

        Err(DbErr::Custom(
            "posting number allocation conflicted after retries".to_string(),
        ))
    }

    pub async fn create_legacy_external_posting(
        &self,
        input: CreateLegacyExternalPostingInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some(project_record) = self
            .read_project_by_owner_and_name(&input.owner_name, &input.project_name)
            .await?
        else {
            return Ok(None);
        };
        let post_number = match input.post_number {
            Some(number) if number > 0 => number,
            _ => self.next_posting_number(project_record.id).await?,
        };
        let now = current_datetime();
        let created_at = input.created_at.unwrap_or(now);
        let updated_at = input.updated_at.unwrap_or(created_at);
        let created = posting::ActiveModel {
            id: NotSet,
            title: Set(Some(input.values.title.trim().to_string())),
            created_date: Set(Some(created_at)),
            updated_date: Set(Some(updated_at)),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
            author_name: Set(Some(input.actor_display_name.clone())),
            project_id: Set(Some(project_record.id)),
            number: Set(Some(post_number)),
            num_of_comments: Set(Some(0)),
            notice: Set(Some(bool_to_i16(input.values.notice))),
            readme: Set(Some(bool_to_i16(input.values.readme))),
            parent_id: Set(None),
            updated_by_author_id: Set(Some(input.actor_id)),
            ..Default::default()
        }
        .insert(&self.db)
        .await?;

        let Some(project_model) = project::Entity::find_by_id(project_record.id)
            .one(&self.db)
            .await?
        else {
            return Err(DbErr::Custom(
                "project missing after posting insert".to_string(),
            ));
        };
        if project_model.last_posting_number.unwrap_or_default() < post_number {
            let mut project_active = project::ActiveModel {
                id: Set(project_record.id),
                ..Default::default()
            };
            project_active.last_posting_number = Set(Some(post_number));
            project_active.update(&self.db).await?;
        }

        self.write_text_column("posting", "body", created.id, &input.values.body_markdown)
            .await?;
        if input.values.readme {
            self.clear_other_readme_postings(project_record.id, created.id)
                .await?;
        }
        self.sync_posting_mentions_and_notify(
            input.actor_id,
            project_record.id,
            created.id,
            created.author_id,
            "posting",
            created.id,
            &input.values.body_markdown,
            "NEW_POSTING",
            "",
            &input.values.body_markdown,
            PostingMentionNotificationMode::All,
        )
        .await?;

        self.replace_posting_labels(created.id, project_record.id, &input.values.label_ids)
            .await?;
        self.bind_attachments(
            BOARD_POST_ATTACHMENT_CONTAINER,
            created.id,
            &input.values.attachment_ids,
            Some(input.attachment_actor_id.unwrap_or(input.actor_id)),
        )
        .await?;
        self.watch_posting(created.id, input.actor_id).await?;
        self.posting_record_from_model(created, &project_record, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn update_posting(
        &self,
        input: UpdatePostingInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_posting_model(&input.owner_name, &input.project_name, input.post_number)
            .await?
        else {
            return Ok(None);
        };
        let old_body = self.read_text_column("posting", "body", model.id).await?;
        let next_history = append_posting_history(
            model.history.as_deref(),
            &old_body,
            &input.values.body_markdown,
        );
        let mut active = posting::ActiveModel::from(model);
        active.title = Set(Some(input.values.title.trim().to_string()));
        active.updated_date = Set(Some(current_datetime()));
        active.updated_by_author_id = Set(Some(input.actor_id));
        active.notice = Set(Some(bool_to_i16(input.values.notice)));
        active.readme = Set(Some(bool_to_i16(input.values.readme)));
        let mut updated = active.update(&self.db).await?;
        self.write_text_column("posting", "body", updated.id, &input.values.body_markdown)
            .await?;
        self.write_text_column(
            "posting",
            "history",
            updated.id,
            next_history.as_deref().unwrap_or(""),
        )
        .await?;
        updated.history = next_history;
        if input.values.readme {
            self.clear_other_readme_postings(project_record.id, updated.id)
                .await?;
        }
        self.sync_posting_mentions_and_notify(
            input.actor_id,
            project_record.id,
            updated.id,
            updated.author_id,
            "posting",
            updated.id,
            &input.values.body_markdown,
            "POSTING_BODY_CHANGED",
            &old_body,
            &input.values.body_markdown,
            PostingMentionNotificationMode::NewOnly,
        )
        .await?;
        self.replace_posting_labels(updated.id, project_record.id, &input.values.label_ids)
            .await?;
        self.sync_attachments(
            BOARD_POST_ATTACHMENT_CONTAINER,
            updated.id,
            &input.values.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.posting_record_from_model(updated, &project_record, Some(input.actor_id))
            .await
            .map(Some)
    }

    pub async fn update_posting_labels(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
        label_ids: &[i64],
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(None);
        };
        let mut active = posting::ActiveModel {
            id: Set(model.id),
            ..Default::default()
        };
        active.updated_date = Set(Some(current_datetime()));
        active.update(&self.db).await?;
        self.replace_posting_labels(model.id, project_record.id, label_ids)
            .await?;
        self.read_posting_detail_for_viewer(owner_name, project_name, post_number, None)
            .await
    }

    pub async fn update_issue_labels(
        &self,
        owner_name: &str,
        project_name: &str,
        issue_number: i64,
        label_ids: &[i64],
    ) -> Result<Option<IssueRecord>, DbErr> {
        let Some((project_record, model)) = self
            .read_project_issue_model(owner_name, project_name, issue_number)
            .await?
        else {
            return Ok(None);
        };
        let mut active = issue::ActiveModel {
            id: Set(model.id),
            ..Default::default()
        };
        active.updated_date = Set(Some(current_datetime()));
        active.update(&self.db).await?;
        self.replace_issue_labels(model.id, project_record.id, label_ids)
            .await?;
        self.read_issue_detail_for_viewer(owner_name, project_name, issue_number, None)
            .await
    }

    pub async fn delete_posting(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
        actor_id: i64,
        actor_login_id: &str,
    ) -> Result<bool, DbErr> {
        let Some((project_record, model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(false);
        };
        let old_body = self.read_text_column("posting", "body", model.id).await?;
        let mut receiver_ids = self
            .posting_notification_receiver_ids(
                project_record.id,
                model.id,
                model.author_id,
                "RESOURCE_DELETED",
            )
            .await?;
        receiver_ids.extend(self.mentioned_active_user_ids(&old_body).await?);
        self.create_notification_event_for_receivers(
            actor_id,
            "project",
            &project_record.id.to_string(),
            "RESOURCE_DELETED",
            &old_body,
            actor_login_id,
            &receiver_ids,
        )
        .await?;
        posting_issue_label::Entity::delete_many()
            .filter(posting_issue_label::Column::PostingId.eq(model.id))
            .exec(&self.db)
            .await?;
        for comment in posting_comment::Entity::find()
            .filter(posting_comment::Column::PostingId.eq(Some(model.id)))
            .all(&self.db)
            .await?
        {
            attachment::Entity::delete_many()
                .filter(
                    attachment::Column::ContainerType.is_in(
                        attachment_container_aliases(BOARD_COMMENT_ATTACHMENT_CONTAINER)
                            .into_iter()
                            .map(Some),
                    ),
                )
                .filter(attachment::Column::ContainerId.eq(comment.id))
                .exec(&self.db)
                .await?;
            mention::Entity::delete_many()
                .filter(mention::Column::ResourceType.eq(Some("posting_comment".to_string())))
                .filter(mention::Column::ResourceId.eq(Some(comment.id.to_string())))
                .exec(&self.db)
                .await?;
        }
        posting_comment::Entity::delete_many()
            .filter(posting_comment::Column::PostingId.eq(Some(model.id)))
            .exec(&self.db)
            .await?;
        watch::Entity::delete_many()
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(model.id.to_string())))
            .exec(&self.db)
            .await?;
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType
                    .eq(Some(BOARD_POST_ATTACHMENT_CONTAINER.to_string())),
            )
            .filter(attachment::Column::ContainerId.eq(model.id))
            .exec(&self.db)
            .await?;
        mention::Entity::delete_many()
            .filter(mention::Column::ResourceType.eq(Some("posting".to_string())))
            .filter(mention::Column::ResourceId.eq(Some(model.id.to_string())))
            .exec(&self.db)
            .await?;
        posting::Entity::delete_by_id(model.id)
            .exec(&self.db)
            .await?;
        Ok(true)
    }

    pub async fn create_posting_comment(
        &self,
        input: CreatePostingCommentInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((project_record, posting_model)) = self
            .read_project_posting_model(&input.owner_name, &input.project_name, input.post_number)
            .await?
        else {
            return Ok(None);
        };
        let created = posting_comment::ActiveModel {
            id: NotSet,
            created_date: Set(Some(input.created_at.unwrap_or_else(current_datetime))),
            author_id: Set(Some(input.actor_id)),
            author_login_id: Set(Some(normalize_identity(&input.actor_login_id))),
            author_name: Set(Some(input.actor_display_name)),
            posting_id: Set(Some(posting_model.id)),
            project_id: Set(project_record.id),
            parent_comment_id: Set(input.parent_comment_id),
            ..Default::default()
        }
        .insert(&self.db)
        .await?;
        self.write_text_column(
            "posting_comment",
            "contents",
            created.id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_posting_mentions_and_notify(
            input.actor_id,
            project_record.id,
            posting_model.id,
            posting_model.author_id,
            "posting_comment",
            created.id,
            &input.contents_markdown,
            "NEW_COMMENT",
            "",
            &input.contents_markdown,
            PostingMentionNotificationMode::All,
        )
        .await?;
        self.bind_attachments(
            BOARD_COMMENT_ATTACHMENT_CONTAINER,
            created.id,
            &input.attachment_ids,
            Some(input.attachment_actor_id.unwrap_or(input.actor_id)),
        )
        .await?;
        self.recount_posting_comments(posting_model.id).await?;
        self.read_posting_detail_for_viewer(
            &input.owner_name,
            &input.project_name,
            input.post_number,
            Some(input.actor_id),
        )
        .await
    }

    pub async fn create_posting_comment_via_email(
        &self,
        input: CreatePostingCommentViaEmailInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let posting = self
            .create_posting_comment(CreatePostingCommentInput {
                actor_display_name: input.actor_display_name,
                actor_id: input.actor_id,
                actor_login_id: input.actor_login_id,
                attachment_actor_id: None,
                attachment_ids: Vec::new(),
                contents_markdown: input.contents_markdown.clone(),
                created_at: None,
                owner_name: input.owner_name.clone(),
                parent_comment_id: None,
                post_number: input.post_number,
                project_name: input.project_name.clone(),
            })
            .await?;
        let Some(posting) = posting else {
            return Ok(None);
        };
        let Some(comment) = posting
            .comments
            .iter()
            .filter(|comment| {
                comment.author_id == Some(input.actor_id)
                    && comment.contents_markdown == input.contents_markdown
            })
            .max_by_key(|comment| comment.id)
        else {
            return Ok(Some(posting));
        };
        self.record_original_email(
            BOARD_COMMENT_ATTACHMENT_CONTAINER,
            comment.id,
            &input.message_id,
        )
        .await?;
        self.read_posting_detail_for_viewer(
            &input.owner_name,
            &input.project_name,
            input.post_number,
            Some(input.actor_id),
        )
        .await
    }

    pub async fn update_posting_comment(
        &self,
        input: UpdatePostingCommentInput,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((project_record, posting_model)) = self
            .read_project_posting_model(&input.owner_name, &input.project_name, input.post_number)
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = posting_comment::Entity::find_by_id(input.comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if comment.posting_id != Some(posting_model.id) {
            return Ok(None);
        }
        let old_contents = self
            .read_text_column("posting_comment", "contents", comment.id)
            .await?;
        let active = posting_comment::ActiveModel::from(comment);
        let updated = active.update(&self.db).await?;
        self.write_text_column(
            "posting_comment",
            "contents",
            updated.id,
            &input.contents_markdown,
        )
        .await?;
        self.sync_posting_mentions_and_notify(
            input.actor_id,
            project_record.id,
            posting_model.id,
            posting_model.author_id,
            "posting_comment",
            updated.id,
            &input.contents_markdown,
            "COMMENT_UPDATED",
            &old_contents,
            &input.contents_markdown,
            PostingMentionNotificationMode::All,
        )
        .await?;
        self.sync_attachments(
            BOARD_COMMENT_ATTACHMENT_CONTAINER,
            updated.id,
            &input.attachment_ids,
            Some(input.actor_id),
        )
        .await?;
        self.read_posting_detail_for_viewer(
            &input.owner_name,
            &input.project_name,
            input.post_number,
            Some(input.actor_id),
        )
        .await
    }

    pub async fn delete_posting_comment(
        &self,
        owner_name: &str,
        project_name: &str,
        post_number: i64,
        comment_id: i64,
        viewer_id: Option<i64>,
    ) -> Result<Option<PostingRecord>, DbErr> {
        let Some((_project_record, posting_model)) = self
            .read_project_posting_model(owner_name, project_name, post_number)
            .await?
        else {
            return Ok(None);
        };
        let Some(comment) = posting_comment::Entity::find_by_id(comment_id)
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        if comment.posting_id != Some(posting_model.id) {
            return Ok(None);
        }
        attachment::Entity::delete_many()
            .filter(
                attachment::Column::ContainerType.is_in(
                    attachment_container_aliases(BOARD_COMMENT_ATTACHMENT_CONTAINER)
                        .into_iter()
                        .map(Some),
                ),
            )
            .filter(attachment::Column::ContainerId.eq(comment_id))
            .exec(&self.db)
            .await?;
        mention::Entity::delete_many()
            .filter(mention::Column::ResourceType.eq(Some("posting_comment".to_string())))
            .filter(mention::Column::ResourceId.eq(Some(comment_id.to_string())))
            .exec(&self.db)
            .await?;
        posting_comment::Entity::delete_by_id(comment_id)
            .exec(&self.db)
            .await?;
        self.recount_posting_comments(posting_model.id).await?;
        self.read_posting_detail_for_viewer(owner_name, project_name, post_number, viewer_id)
            .await
    }

    pub async fn watch_posting(&self, posting_id: i64, user_id: i64) -> Result<(), DbErr> {
        if watch::Entity::find()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(posting_id.to_string())))
            .one(&self.db)
            .await?
            .is_none()
        {
            watch::ActiveModel {
                id: NotSet,
                user_id: Set(Some(user_id)),
                resource_type: Set(Some("POSTING".to_string())),
                resource_id: Set(Some(posting_id.to_string())),
            }
            .insert(&self.db)
            .await?;
        }
        Ok(())
    }

    pub async fn unwatch_posting(&self, posting_id: i64, user_id: i64) -> Result<(), DbErr> {
        watch::Entity::delete_many()
            .filter(watch::Column::UserId.eq(Some(user_id)))
            .filter(watch::Column::ResourceType.eq(Some("POSTING".to_string())))
            .filter(watch::Column::ResourceId.eq(Some(posting_id.to_string())))
            .exec(&self.db)
            .await?;
        Ok(())
    }
}
