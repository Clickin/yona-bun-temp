use super::*;

impl DefaultLandingRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            inner: AppRepository::new(db),
        }
    }

    pub async fn read_default_landing_path(&self, user_id: i64) -> Result<Option<String>, DbErr> {
        self.inner.read_default_landing_path(user_id).await
    }

    pub async fn set_default_landing_path(&self, user_id: i64, path: &str) -> Result<(), DbErr> {
        self.inner
            .set_default_landing_path(user_id, Some(path.to_string()))
            .await
            .map(|_| ())
    }
}
