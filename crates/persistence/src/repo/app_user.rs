use super::*;

impl AppUserRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            inner: AppRepository::new(db),
        }
    }

    pub async fn create_user(&self, input: AppUserInput) -> Result<AppUserRecord, DbErr> {
        self.inner.create_user(input).await
    }

    pub async fn find_by_identifier(
        &self,
        identifier: &str,
    ) -> Result<Option<AppUserRecord>, DbErr> {
        self.inner.find_user_by_identifier(identifier).await
    }
}
