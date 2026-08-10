use super::*;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// TTL is app policy: the typed layer decides per-list freshness and passes it
/// on every `put`; stores only honor it.
const LABELS_TTL: Duration = Duration::from_secs(60);
const MILESTONE_OPTIONS_TTL: Duration = Duration::from_secs(60);
const USER_LIST_TTL: Duration = Duration::from_secs(30);

/// Value-agnostic read/write/invalidate boundary for the stable lists. A
/// process-local moka store is the default; a shared redis/valkey-compatible
/// store ships behind `cache-redis` for multi-replica deployments.
#[async_trait::async_trait]
pub trait StableListStore: Send + Sync {
    async fn get(&self, key: &str) -> Option<Vec<u8>>;
    async fn put(&self, key: &str, value: Vec<u8>, ttl: Duration);
    /// Evict every key starting with `prefix`.
    async fn invalidate(&self, prefix: &str);
    async fn invalidate_all(&self);
}

/// In-process default store. moka caches have a per-instance `time_to_live`,
/// so buckets are keyed by TTL (the app uses two values: 30s and 60s).
pub struct MokaCacheStore {
    caches: Mutex<HashMap<Duration, moka::future::Cache<String, Vec<u8>>>>,
}

impl MokaCacheStore {
    pub fn new() -> Self {
        Self {
            caches: Mutex::new(HashMap::new()),
        }
    }
}

#[async_trait::async_trait]
impl StableListStore for MokaCacheStore {
    async fn get(&self, key: &str) -> Option<Vec<u8>> {
        // moka's future-cache get is async, so drop the map guard first.
        let caches = self
            .caches
            .lock()
            .expect("moka cache map lock")
            .values()
            .cloned()
            .collect::<Vec<_>>();
        for cache in caches {
            if let Some(value) = cache.get(key).await {
                return Some(value);
            }
        }
        None
    }

    async fn put(&self, key: &str, value: Vec<u8>, ttl: Duration) {
        // moka's future-cache insert is async, so drop the map guard first.
        let cache = {
            let mut caches = self.caches.lock().expect("moka cache map lock");
            caches
                .entry(ttl)
                .or_insert_with(|| {
                    moka::future::Cache::builder()
                        .time_to_live(ttl)
                        .support_invalidation_closures()
                        .build()
                })
                .clone()
        };
        cache.insert(key.to_string(), value).await;
    }

    async fn invalidate(&self, prefix: &str) {
        let caches = self.caches.lock().expect("moka cache map lock");
        for cache in caches.values() {
            let prefix = prefix.to_string();
            let _ = cache.invalidate_entries_if(move |key, _| key.starts_with(&prefix));
        }
    }

    async fn invalidate_all(&self) {
        let caches = self.caches.lock().expect("moka cache map lock");
        for cache in caches.values() {
            cache.invalidate_all();
        }
    }
}

/// Shared redis/valkey-compatible store for multi-replica deployments. If the
/// connection is down the store degrades to cache misses (DB reads) and logs
/// once — it never blocks or fails a request.
#[cfg(feature = "cache-redis")]
pub struct RedisCacheStore {
    client: redis::Client,
    manager: tokio::sync::OnceCell<Result<redis::aio::ConnectionManager, redis::RedisError>>,
}

#[cfg(feature = "cache-redis")]
impl RedisCacheStore {
    pub fn new(url: &str) -> Self {
        let client = match redis::Client::open(url) {
            Ok(client) => client,
            Err(err) => {
                tracing::warn!(
                    error = %err,
                    "YONA_STABLE_LIST_CACHE url is invalid; stable list cache disabled"
                );
                // Unreachable dummy: every op fails and degrades to a miss.
                redis::Client::open("redis://127.0.0.1:1").expect("statically valid redis url")
            }
        };
        Self {
            client,
            manager: tokio::sync::OnceCell::new(),
        }
    }

    async fn connection(&self) -> Option<redis::aio::ConnectionManager> {
        let manager = self
            .manager
            .get_or_init(|| async { self.client.get_connection_manager().await })
            .await;
        match manager {
            Ok(manager) => Some(manager.clone()),
            Err(_) => {
                log_redis_unavailable();
                None
            }
        }
    }
}

#[cfg(feature = "cache-redis")]
fn log_redis_unavailable() {
    use std::sync::Once;
    static ONCE: Once = Once::new();
    ONCE.call_once(|| {
        tracing::warn!("stable list cache: redis unavailable; serving from DB");
    });
}

#[cfg(feature = "cache-redis")]
#[async_trait::async_trait]
impl StableListStore for RedisCacheStore {
    async fn get(&self, key: &str) -> Option<Vec<u8>> {
        let mut connection = self.connection().await?;
        use redis::AsyncCommands;
        connection.get(key).await.ok().flatten()
    }

    async fn put(&self, key: &str, value: Vec<u8>, ttl: Duration) {
        let Some(mut connection) = self.connection().await else {
            return;
        };
        use redis::AsyncCommands;
        let _ = connection
            .set_ex::<_, _, ()>(key, value, ttl.as_secs())
            .await;
    }

    async fn invalidate(&self, prefix: &str) {
        let Some(mut connection) = self.connection().await else {
            return;
        };
        use redis::AsyncCommands;
        let mut cursor = 0u64;
        loop {
            let scanned: Option<(u64, Vec<String>)> = redis::cmd("SCAN")
                .cursor_arg(cursor)
                .arg("MATCH")
                .arg(format!("{prefix}*"))
                .arg("COUNT")
                .arg(100)
                .query_async(&mut connection)
                .await
                .ok();
            let Some((next, keys)) = scanned else {
                return;
            };
            for key in keys {
                let _ = connection.del::<_, ()>(&key).await;
            }
            cursor = next;
            if cursor == 0 {
                break;
            }
        }
    }

    async fn invalidate_all(&self) {
        // Scoped to our own key space; the shared store may serve other apps.
        self.invalidate("stable:").await;
    }
}

/// Typed layer owning the app TTL policy and the key format:
/// `stable:{kind}:{owner}:{project}[:{state|role|actor}]`.
#[derive(Clone)]
pub(super) struct StableLists {
    store: Arc<dyn StableListStore>,
}

impl StableLists {
    pub fn new(store: Arc<dyn StableListStore>) -> Self {
        Self { store }
    }

    fn key(parts: &[&str]) -> String {
        let mut key = String::from("stable:");
        for (index, part) in parts.iter().enumerate() {
            if index > 0 {
                key.push(':');
            }
            key.push_str(part);
        }
        key
    }

    pub async fn labels(
        &self,
        owner_name: &str,
        project_name: &str,
    ) -> Option<Vec<IssueLabelRecord>> {
        let key = Self::key(&["labels", owner_name, project_name]);
        self.store
            .get(&key)
            .await
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
    }

    pub async fn insert_labels(
        &self,
        owner_name: &str,
        project_name: &str,
        records: &[IssueLabelRecord],
    ) {
        let key = Self::key(&["labels", owner_name, project_name]);
        if let Ok(bytes) = serde_json::to_vec(records) {
            self.store.put(&key, bytes, LABELS_TTL).await;
        }
    }

    pub async fn invalidate_labels(&self, owner_name: &str, project_name: &str) {
        self.store
            .invalidate(&Self::key(&["labels", owner_name, project_name]))
            .await;
    }

    pub async fn milestone_options(
        &self,
        owner_name: &str,
        project_name: &str,
        state: &str,
        order_by: &str,
        order_dir: &str,
    ) -> Option<Vec<IssueMilestoneRecord>> {
        let key = Self::key(&[
            "milestones",
            owner_name,
            project_name,
            &normalize_identity(state),
            &normalize_identity(order_by),
            &normalize_identity(order_dir),
        ]);
        self.store
            .get(&key)
            .await
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
    }

    pub async fn insert_milestone_options(
        &self,
        owner_name: &str,
        project_name: &str,
        state: &str,
        order_by: &str,
        order_dir: &str,
        records: &[IssueMilestoneRecord],
    ) {
        let key = Self::key(&[
            "milestones",
            owner_name,
            project_name,
            &normalize_identity(state),
            &normalize_identity(order_by),
            &normalize_identity(order_dir),
        ]);
        if let Ok(bytes) = serde_json::to_vec(records) {
            self.store.put(&key, bytes, MILESTONE_OPTIONS_TTL).await;
        }
    }

    pub async fn invalidate_milestones(&self, owner_name: &str, project_name: &str) {
        self.store
            .invalidate(&Self::key(&["milestones", owner_name, project_name]))
            .await;
    }

    pub async fn issue_search_users(
        &self,
        owner_name: &str,
        project_name: &str,
        role: &str,
        actor_id: Option<i64>,
    ) -> Option<ProjectIssueSearchUserListRecord> {
        let key = Self::key(&[
            "search-users",
            owner_name,
            project_name,
            &normalize_identity(role),
            &actor_id_key_part(actor_id),
        ]);
        self.store
            .get(&key)
            .await
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
    }

    pub async fn insert_issue_search_users(
        &self,
        owner_name: &str,
        project_name: &str,
        role: &str,
        actor_id: Option<i64>,
        records: &ProjectIssueSearchUserListRecord,
    ) {
        let key = Self::key(&[
            "search-users",
            owner_name,
            project_name,
            &normalize_identity(role),
            &actor_id_key_part(actor_id),
        ]);
        if let Ok(bytes) = serde_json::to_vec(records) {
            self.store.put(&key, bytes, USER_LIST_TTL).await;
        }
    }

    pub async fn assignable_users(
        &self,
        owner_name: &str,
        project_name: &str,
        actor_id: Option<i64>,
    ) -> Option<IssueAssignableUserSearchRecord> {
        let key = Self::key(&[
            "assignable",
            owner_name,
            project_name,
            &actor_id_key_part(actor_id),
        ]);
        self.store
            .get(&key)
            .await
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
    }

    pub async fn insert_assignable_users(
        &self,
        owner_name: &str,
        project_name: &str,
        actor_id: Option<i64>,
        records: &IssueAssignableUserSearchRecord,
    ) {
        let key = Self::key(&[
            "assignable",
            owner_name,
            project_name,
            &actor_id_key_part(actor_id),
        ]);
        if let Ok(bytes) = serde_json::to_vec(records) {
            self.store.put(&key, bytes, USER_LIST_TTL).await;
        }
    }

    pub async fn invalidate_users(&self, owner_name: &str, project_name: &str) {
        self.store
            .invalidate(&Self::key(&["search-users", owner_name, project_name]))
            .await;
        self.store
            .invalidate(&Self::key(&["assignable", owner_name, project_name]))
            .await;
    }

    pub async fn invalidate_users_all(&self) {
        self.store.invalidate("stable:search-users:").await;
        self.store.invalidate("stable:assignable:").await;
    }
}

fn actor_id_key_part(actor_id: Option<i64>) -> String {
    actor_id
        .map(|actor_id| actor_id.to_string())
        .unwrap_or_else(|| "none".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn moka_store_round_trips_and_invalidates_by_prefix() {
        let store = MokaCacheStore::new();
        store
            .put(
                "stable:labels:owner:proj",
                b"value".to_vec(),
                Duration::from_secs(60),
            )
            .await;
        assert_eq!(
            store.get("stable:labels:owner:proj").await,
            Some(b"value".to_vec())
        );
        store.invalidate("stable:labels:owner:proj").await;
        assert_eq!(store.get("stable:labels:owner:proj").await, None);
    }

    #[tokio::test]
    async fn typed_layer_round_trips_issue_label_records() {
        let lists = StableLists::new(Arc::new(MokaCacheStore::new()));
        let records = vec![IssueLabelRecord {
            category_id: Some(1),
            category_is_exclusive: false,
            category_name: "Category".to_string(),
            color: "#f00".to_string(),
            id: 7,
            name: "bug".to_string(),
        }];
        assert!(lists.labels("owner", "proj").await.is_none());
        lists.insert_labels("owner", "proj", &records).await;
        assert_eq!(lists.labels("owner", "proj").await, Some(records));
        lists.invalidate_labels("owner", "proj").await;
        assert!(lists.labels("owner", "proj").await.is_none());
    }
}
