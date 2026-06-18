use super::*;

impl AppRepository {
    pub async fn list_project_webhooks(
        &self,
        project_id: i64,
    ) -> Result<ProjectWebhookListRecord, DbErr> {
        let rows = webhook::Entity::find()
            .filter(webhook::Column::ProjectId.eq(Some(project_id)))
            .order_by_asc(webhook::Column::Id)
            .all(&self.db)
            .await?;
        let webhooks = rows
            .into_iter()
            .map(project_webhook_record_from_model)
            .collect();
        Ok(ProjectWebhookListRecord { webhooks })
    }

    pub async fn create_project_webhook(
        &self,
        input: CreateProjectWebhookInput,
    ) -> Result<ProjectWebhookListRecord, DbErr> {
        webhook::ActiveModel {
            created_at: Set(Some(current_datetime())),
            git_push: Set(Some(if input.git_push { 1 } else { 0 })),
            payload_url: Set(Some(input.payload_url)),
            project_id: Set(Some(input.project_id)),
            secret: Set(Some(input.secret)),
            webhook_type: Set(Some(input.webhook_type)),
            ..Default::default()
        }
        .insert(&self.db)
        .await?;
        self.list_project_webhooks(input.project_id).await
    }

    pub async fn read_webhook_thread(
        &self,
        webhook_id: i64,
        resource_type: &str,
        resource_id: &str,
    ) -> Result<Option<WebhookThreadRecord>, DbErr> {
        let row = webhook_thread::Entity::find()
            .filter(webhook_thread::Column::WebhookId.eq(Some(webhook_id)))
            .filter(webhook_thread::Column::ResourceType.eq(Some(resource_type.to_string())))
            .filter(webhook_thread::Column::ResourceId.eq(Some(resource_id.to_string())))
            .one(&self.db)
            .await?;
        Ok(row.map(webhook_thread_record_from_model))
    }

    pub async fn create_webhook_thread(
        &self,
        input: CreateWebhookThreadInput,
    ) -> Result<WebhookThreadRecord, DbErr> {
        let row = webhook_thread::ActiveModel {
            created_at: Set(Some(current_datetime())),
            resource_id: Set(Some(input.resource_id)),
            resource_type: Set(Some(input.resource_type)),
            thread_id: Set(Some(input.thread_id)),
            webhook_id: Set(Some(input.webhook_id)),
            ..Default::default()
        }
        .insert(&self.db)
        .await?;
        Ok(webhook_thread_record_from_model(row))
    }

    pub async fn create_webhook_delivery(
        &self,
        input: CreateWebhookDeliveryInput,
    ) -> Result<(), DbErr> {
        webhook_delivery::ActiveModel {
            created_at: Set(Some(current_datetime())),
            error_message: Set(input.error_message),
            event_type: Set(Some(input.event_type)),
            payload_url: Set(Some(input.payload_url)),
            request_body: Set(Some(input.request_body)),
            response_body: Set(input.response_body),
            status: Set(Some(input.status)),
            webhook_id: Set(Some(input.webhook_id)),
            webhook_type: Set(Some(input.webhook_type)),
            ..Default::default()
        }
        .insert(&self.db)
        .await?;
        Ok(())
    }

    pub async fn list_project_webhook_deliveries(
        &self,
        project_id: i64,
        limit: u64,
    ) -> Result<Vec<ProjectWebhookDeliveryRecord>, DbErr> {
        let webhook_ids: Vec<i64> = webhook::Entity::find()
            .filter(webhook::Column::ProjectId.eq(Some(project_id)))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.id)
            .collect();
        if webhook_ids.is_empty() || limit == 0 {
            return Ok(Vec::new());
        }
        let rows = webhook_delivery::Entity::find()
            .filter(webhook_delivery::Column::WebhookId.is_in(webhook_ids.into_iter().map(Some)))
            .order_by_desc(webhook_delivery::Column::CreatedAt)
            .order_by_desc(webhook_delivery::Column::Id)
            .limit(limit)
            .all(&self.db)
            .await?;
        Ok(rows
            .into_iter()
            .map(project_webhook_delivery_record_from_model)
            .collect())
    }

    pub async fn delete_project_webhook(
        &self,
        project_id: i64,
        webhook_id: i64,
    ) -> Result<Option<ProjectWebhookListRecord>, DbErr> {
        let Some(row) = webhook::Entity::find_by_id(webhook_id)
            .filter(webhook::Column::ProjectId.eq(Some(project_id)))
            .one(&self.db)
            .await?
        else {
            return Ok(None);
        };
        webhook_delivery::Entity::delete_many()
            .filter(webhook_delivery::Column::WebhookId.eq(Some(row.id)))
            .exec(&self.db)
            .await?;
        webhook_thread::Entity::delete_many()
            .filter(webhook_thread::Column::WebhookId.eq(Some(row.id)))
            .exec(&self.db)
            .await?;
        webhook::Entity::delete_by_id(row.id).exec(&self.db).await?;
        Ok(Some(self.list_project_webhooks(project_id).await?))
    }
}
