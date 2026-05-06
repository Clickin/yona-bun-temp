# Yona Axum + SeaORM + React Port SPEC

This SPEC decomposes the current Play Framework Yona repository into feature
units for a rewrite on:

- Backend: Rust, Axum, SeaORM, Tokio
- Frontend: React, TypeScript, TanStack Query
- Markdown: React markdown rendering with remark/rehype plugins

The existing `docs/porting-plan.md` is a Bun + Drizzle plan. This document
supersedes it for the Axum + SeaORM + React target stack.

## Evidence Map

Repository evidence used for this SPEC lives under the checked-in legacy tree
`yona-original/`:

- Current backend framework and dependencies: `yona-original/build.sbt`
- Route contract: `yona-original/conf/routes`
- Baseline schema and final schema deltas:
  `yona-original/conf/evolutions/default/1.sql` through
  `yona-original/conf/evolutions/default/32.sql`
- Java domain model source: `yona-original/app/models/**`
- Java controller source: `yona-original/app/controllers/**`
- Scala template source: `yona-original/app/views/**`
- Legacy browser behavior: `yona-original/public/javascripts/common/**` and
  `yona-original/public/javascripts/service/**`
- Markdown behavior: `yona-original/app/utils/Markdown.java`,
  `yona-original/app/utils/AutoLinkRenderer.java`,
  `yona-original/app/controllers/MarkdownApp.java`,
  `yona-original/public/javascripts/common/yobi.Markdown.js`
- Attachment behavior: `yona-original/app/models/Attachment.java`,
  `yona-original/app/controllers/AttachmentApp.java`,
  `yona-original/public/javascripts/common/yobi.Files.js`,
  `yona-original/public/javascripts/common/yobi.Attachments.js`
- View hierarchy reference:
  `yona-original/docs/ko/technical/view-hierarchy.md`

External stack assumptions were checked against official or primary docs:

- Axum docs: https://docs.rs/axum/latest/axum/
- SeaORM docs: https://www.sea-ql.org/SeaORM/docs/
- TanStack Query React docs: https://tanstack.com/query/latest/docs/framework/react/overview
- react-markdown docs: https://github.com/remarkjs/react-markdown
- Bulletproof Rust Web guide: https://github.com/gruberb/bulletproof-rust-web
- Bulletproof React guide: https://github.com/alan2207/bulletproof-react
- shadcn/ui docs: https://ui.shadcn.com/docs
- Testcontainers for Rust docs: https://rust.testcontainers.org/
- testcontainers-modules docs: https://docs.rs/testcontainers-modules/latest/testcontainers_modules/
- Java SE 8 JDBC docs: https://docs.oracle.com/javase/8/docs/technotes/guides/jdbc/index.html
- H2 database repository/docs: https://github.com/h2database/h2database
- SQLite JDBC driver docs: https://github.com/xerial/sqlite-jdbc

## Guideline Application Matrix

| Source guideline | SPEC application |
| --- | --- |
| Bulletproof Rust Web: use layer boundaries and dependency direction | Cargo workspace with `yona-domain`, `yona-web`, `yona-infra`, `yona-entity`, adapters, and forbidden dependencies. |
| Bulletproof Rust Web: keep handlers thin | Axum handlers only extract request data, call services, and convert responses. |
| Bulletproof Rust Web: keep domain independent | `yona-domain` cannot depend on Axum, SeaORM, native command adapters, storage, mail, or HTTP response types. |
| Bulletproof Rust Web: use trait-based ports/adapters | Repository, VCS, storage, mail, search, and markdown resolver boundaries are modeled as ports with infrastructure adapters. |
| Bulletproof Rust Web: typed errors and HTTP edge conversion | Domain errors stay typed; HTTP response conversion happens in `yona-web`. |
| Bulletproof Rust Web: state/config/observability/security/testing | AppState, typed config, tracing, security middleware, production router tests, and background jobs are explicit requirements. |
| Multi-database support | Runtime database targets are MariaDB, MySQL, PostgreSQL, and SQLite; H2 is only a legacy migration input. |
| Database test strategy | Fast tests use in-memory SQLite; DB-specific contract tests use Testcontainers only for domain persistence boundaries on MariaDB, MySQL, and PostgreSQL. |
| Bulletproof React: feature-based structure | `frontend/src/features/*` owns feature-specific API, components, hooks, stores, types, and utils. |
| Bulletproof React: unidirectional imports | Shared -> features -> app flow enforced with ESLint restricted paths. |
| Bulletproof React: API declarations | Each feature API has types/schema, fetcher, TanStack Query hook, and query key. |
| Bulletproof React: state categorization | Component/application/server-cache/form/URL state rules are explicit. |
| Bulletproof React: components and styling | Colocation, small components, composition, shared UI ownership, and zero-runtime styling preference are explicit. |
| Bulletproof React: security/performance/testing | HttpOnly token preference, markdown sanitization, route-level code splitting, prefetching, Playwright/Vitest/MSW-style verification are explicit. |
| shadcn/ui: open-code component ownership | shadcn primitives are copied into `src/components/ui`, treated as Yona-owned code, and wrapped for repeated Yona-specific patterns. |

## Porting Goal

Produce a behavior-compatible Yona rewrite whose first milestone can read and
operate on existing Yona data without requiring users to migrate content by
hand.

Compatibility means:

- Preserve current database table and column names in Phase 1.
- Support MariaDB, MySQL, PostgreSQL, and SQLite as runtime database targets.
- Preserve `YONA_DATA` filesystem layout, especially uploads and repositories.
- Replace the old H2 embedded distribution with SQLite for portable/local
  deployments, with a separate Java 8 JDBC migration tool for existing H2
  database users.
- Preserve existing public URL paths as compatibility routes.
- Replace server-rendered Scala templates with React pages/components.
- Replace manual DOM modules with React state, hooks, and controlled
  components.
- Move markdown rendering semantics to a React markdown pipeline with Yona
  plugins for issue, commit, user, project, and attachment links.
- Keep access control semantics equivalent to `utils.AccessControl`.

## Non-goals For Phase 1

- Do not redesign the schema.
- Do not remove Git or SVN support by default.
- Do not keep H2 as a runtime database target. SQLite is the replacement for
  embedded/local use; H2 support exists only in the one-shot legacy migration
  tool.
- Do not render trusted HTML through `dangerouslySetInnerHTML` as the primary
  markdown path.
- Do not introduce S3/object storage as the default storage backend.
- Do not rewrite business rules inside Axum handlers. Handlers stay thin.
- Do not implement SVN WebDAV transport (SVNKit replacement). SVN support uses
  native CLI commands behind the `VcsBackend` interface.

## Target Repository Shape

Recommended target structure:

```text
backend/
  Cargo.toml
  crates/
    yona-server/          # binary entrypoints and process lifecycle
    yona-web/             # Axum handlers, extractors, response types
    yona-entity/          # SeaORM entities generated from final legacy schema
    yona-domain/          # use cases, validation, access control
    yona-infra/           # composition root for DB/storage/VCS/mail/cache/session/search adapters
    yona-shared/          # config (TOML), observability, time, cache trait, session trait, common primitives
frontend/
  package.json
  src/
    app/                  # router, providers, layout shell
    api/                  # fetch client and generated/typed API calls
    features/             # issue, board, project, code, pull-request, etc.
    components/           # shared UI components
    markdown/             # react-markdown plugins and renderer components
    query/                # query key factories and invalidation helpers
```

This layout separates transport, business rules, persistence, repository
storage, and UI state. It also makes it possible to port one feature at a time
without recreating the Play controller/template coupling.

### Crate Evolution Strategy

Start with 6 core crates and split incrementally when a clear boundary emerges:

```text
Phase 1 (initial):
  yona-server, yona-web, yona-domain, yona-entity, yona-infra, yona-shared

Split candidates (when the boundary justifies a separate crate):
  yona-vcs       <- from yona-infra, when Git/SVN adapter complexity grows
  yona-storage   <- from yona-infra, when storage backend variants grow
  yona-mail      <- from yona-infra, when mail pipeline complexity grows
  yona-search    <- from yona-infra, when search engine integration lands
  yona-markdown  <- from yona-domain, when remark plugin types need sharing
  yona-jobs      <- from yona-server, when background worker count grows
  yona-cli       <- new, when admin/migration utilities are needed
```

Splitting criteria: a module becomes a separate crate when it has more than one
consumer, a stable public trait surface, and independent test/CI value. Do not
split prematurely.

### Rust Workspace Rules

The workspace follows the Bulletproof Rust Web principle that crate dependency
direction should enforce architectural boundaries. The domain crate must not
depend on Axum, SeaORM, native command adapters, mail clients, or filesystem
storage. Those implementations live outside the domain and are wired together
at startup.

Root `backend/Cargo.toml`:

```toml
[workspace]
members = ["crates/*"]
resolver = "2"

[workspace.dependencies]
anyhow = "1"
async-trait = "0.1"
axum = "0.8"
chrono = { version = "0.4", features = ["serde"] }
moka = { version = "0.12", features = ["sync"] }
redis = { version = "0.27", features = ["tokio-comp", "connection-manager"] }
sea-orm = { version = "1", features = ["sqlx-mysql", "sqlx-postgres", "sqlx-sqlite", "runtime-tokio-rustls", "macros"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tantivy = "0.22"
thiserror = "2"
tokio = { version = "1", features = ["full"] }
toml = "0.8"
tower = "0.5"
tower-http = "0.6"
tracing = "0.1"
tracing-subscriber = "0.3"
uuid = { version = "1", features = ["v4", "serde"] }

[workspace.dev-dependencies]
testcontainers-modules = { version = "0.15", features = ["mariadb", "mysql", "postgres"] }
```

Initial allowed dependency direction:

```text
yona-server  -> yona-web, yona-infra, yona-shared
yona-web     -> yona-domain, yona-shared
yona-infra   -> yona-domain, yona-entity, yona-shared
yona-domain  -> yona-shared
yona-entity  -> yona-shared
yona-shared  -> external foundational crates only
```

Forbidden dependencies:

- `yona-domain` must not depend on `axum`, `sea-orm`, `tokio::process`, native
  VCS command adapters, storage adapters, mail adapters, cache implementations,
  session implementations, or HTTP response types.
- `yona-entity` must not depend on `yona-web` or feature services.
- `yona-web` must not call SeaORM entities or native commands directly.
- `yona-shared` defines trait boundaries only; concrete implementations
  (moka cache, Redis session, etc.) live in `yona-infra`.
- `yona-server` must keep `main.rs` thin: load config, initialize tracing,
  build dependencies, assemble router/workers, start serving, and coordinate
  shutdown.

Each crate inherits common versions with `.workspace = true` rather than
declaring independent dependency versions.

Example crate dependency shape:

```toml
# crates/yona-domain/Cargo.toml
[package]
name = "yona-domain"

[dependencies]
yona-shared = { path = "../yona-shared" }
chrono.workspace = true
serde.workspace = true
thiserror.workspace = true
uuid.workspace = true

# No axum. No sea-orm. No tokio::process adapter. No cache impl. No session impl.
```

```toml
# crates/yona-web/Cargo.toml
[package]
name = "yona-web"

[dependencies]
yona-domain = { path = "../yona-domain" }
yona-shared = { path = "../yona-shared" }
axum.workspace = true
serde.workspace = true
thiserror.workspace = true
tower.workspace = true
tower-http.workspace = true
```

```toml
# crates/yona-infra/Cargo.toml
[package]
name = "yona-infra"

[dependencies]
yona-domain = { path = "../yona-domain" }
yona-entity = { path = "../yona-entity" }
yona-storage = { path = "../yona-storage" }
yona-vcs = { path = "../yona-vcs" }
yona-mail = { path = "../yona-mail" }
yona-search = { path = "../yona-search" }
yona-shared = { path = "../yona-shared" }
sea-orm.workspace = true
tokio.workspace = true
tracing.workspace = true
```

## Global Porting Rules

### Java to Rust

| Legacy evidence artifact | Target artifact | Rule |
| --- | --- | --- |
| `yona-original/conf/routes` | `yona-web::router::*` | Design clean RESTful API. Legacy paths serve as SPA routing only. |
| `controllers.*App` | Axum handler module | Handler extracts request data, calls use case, returns typed response. |
| `controllers.annotation.*` | Axum middleware/extractors | Use `CurrentUser`, `RequireLogin`, and `Authorize<Resource>` extractors. |
| `models.* extends Model` | SeaORM entity + domain model | Generate entity for DB shape; write domain structs only when behavior needs them. |
| `Model.Finder` static queries | repository/query module | Keep queries named by use case, not by generic finder. |
| `@Transactional` | SeaORM transaction boundary | Put transaction in use case, not handler. |
| `Resource`/`ResourceType` | `ResourceRef` enum + resolver | Keep polymorphic resource access explicit and testable. |
| Akka actors | Tokio background tasks or queue workers | Preserve retry/notification semantics. |
| `yona-original/conf/application.conf.default` (HOCON) | `config.toml` | TOML format for K8s ConfigMap compatibility. Secrets moved to DB. |

### Scala Templates and jQuery to React

| Legacy evidence artifact | Target artifact | Rule |
| --- | --- | --- |
| `yona-original/app/views/layout*.scala.html` | `AppShell`, `SiteLayout`, `ProjectLayout` | One React route shell, nested layouts for site/project/org/admin. |
| `yona-original/app/views/**/list.scala.html` | feature list page | Data comes from TanStack Query; filters live in URL/search state. |
| `yona-original/app/views/**/partial_*.scala.html` | reusable component | No partial template ports as string fragments. Create components. |
| `yona-original/app/views/common/editor.scala.html` | `MarkdownEditor` | Controlled textarea/editor with preview tab and upload hooks. |
| `yona-original/app/views/common/fileUploader.scala.html` | `AttachmentUploadZone` | Drag, paste, progress, deletion, and temp attachment state. |
| `yona-original/public/javascripts/common/*.js` | shared hooks/components | Replace DOM mutation with React state and effects. |
| `yona-original/public/javascripts/service/*.js` | feature page hooks | Replace page bootstrapping with route-level components and query hooks. |

## Backend Architecture

### Configuration and Secrets

Replace `yona-original/conf/application.conf.default` (HOCON) with `config.toml`. TOML is a better
fit for K8s ConfigMap mounts because it is plain key-value, has no execution
semantics, and can be mounted read-only without triggering init-detection
confusion.

The legacy system detects first-run by checking whether
`application.secret` still holds its hardcoded default value. This couples
init state to the config file, which breaks when Docker or K8s mounts a
read-only config file — every pod restart looks like a fresh setup.

Target approach:

- **Config file** (`config.toml`): non-secret settings only (database URL,
  host, port, mail host, feature flags, YONA_DATA path). Mountable read-only.
- **Secret table** (`secret`): secrets stored in the database, loaded at
  startup. Includes `application_secret`, OAuth client secrets, SMTP
  credentials, IMAP credentials, and any LDAP bind passwords.
- **Init detection**: the server considers initialization complete when the
  `secret` table contains a non-default `application_secret` row and the site
  admin user exists. No config-file-based detection.

Secret table schema:

```sql
CREATE TABLE secret (
    key   VARCHAR(128) PRIMARY KEY,
    value TEXT NOT NULL,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Config loading order:

```text
1. config.toml (file, required)
2. environment variable overrides (YONA_DB_URL, YONA_DATA, etc.)
3. database secret table (loaded after DB connection established)
4. validate: application_secret must exist and be non-default before serving
```

TOML config shape:

```toml
[server]
host = "0.0.0.0"
port = 9000

[database]
url = "sqlite://./yona.db"
max_connections = 10

[application]
data_path = "/var/yona"
anonymous_access = false
max_file_size = 2_147_483_454

[mail]
host = "smtp.gmail.com"
port = 465
ssl = true
user = ""        # secret: stored in DB

[imap]
enabled = false  # secret: stored in DB

[oauth]
providers = ["github", "google"]  # secrets: stored in DB

[ldap]
enabled = false  # secret: stored in DB

[search]
engine = "tantivy"  # or "meilisearch"
```

### Cache Abstraction

Define a cache trait in `yona-shared` so the default implementation (moka) can
be swapped to Redis for multi-instance deployments without changing domain or
web code.

```rust
#[async_trait]
trait YonaCache: Send + Sync {
    async fn get(&self, key: &str) -> Option<Vec<u8>>;
    async fn set(&self, key: &str, value: Vec<u8>, ttl: Option<Duration>);
    async fn remove(&self, key: &str);
    async fn contains(&self, key: &str) -> bool;
}

struct MokaCache { /* moka::SyncCache */ }
struct RedisCache { /* redis::aio::ConnectionManager */ }
```

Rules:

- `yona-shared` defines the trait only.
- `yona-infra` provides `MokaCache` (default, single-process) and `RedisCache`
  (multi-instance).
- Domain services depend on `Arc<dyn YonaCache>`, injected at startup.
- Configuration selects the backend: `cache.engine = "moka"` or
  `cache.engine = "redis"`.

### Session Abstraction

Define a session trait in `yona-shared` so the default cookie-based
implementation can be swapped to Redis-backed sessions for multi-instance
deployments.

```rust
#[async_trait]
trait SessionStore: Send + Sync {
    async fn create(&self, user_id: i64, data: SessionData) -> Result<SessionId, SessionError>;
    async fn get(&self, id: &SessionId) -> Result<Option<SessionData>, SessionError>;
    async fn destroy(&self, id: &SessionId) -> Result<(), SessionError>;
    async fn renew(&self, id: &SessionId) -> Result<SessionId, SessionError>;
}

struct CookieSessionStore { /* signed HttpOnly cookie */ }
struct RedisSessionStore { /* Redis hash with TTL */ }
```

Rules:

- `yona-shared` defines the trait only.
- `yona-infra` provides both implementations.
- Sessions use HttpOnly, Secure, SameSite=Lax cookies regardless of backend.
- Auth tokens are never stored in `localStorage`.

### App State

```rust
struct AppState {
    db: DatabaseConnection,
    config: Arc<YonaConfig>,
    cache: Arc<dyn YonaCache>,
    session: Arc<dyn SessionStore>,
    storage: AttachmentStorageService,
    vcs: RepositoryService,
    mailer: Mailer,
    clock: Clock,
}
```

Handlers use Axum `State<AppState>` or substates. The Axum docs recommend
state extractors for shared state; this fits DB pools, storage, VCS, mail,
cache, session, and configuration.

### Auth and Access Control

Current access logic lives in `utils.AccessControl.java` and is driven by
`User`, `Project`, `OrganizationUser`, `ProjectUser`, `ResourceType`, and
`Operation`.

Target types:

```rust
enum Operation {
    Read,
    Update,
    Delete,
    Accept,
    Reopen,
    Close,
    Watch,
    Leave,
    AssignIssue,
}

enum ResourceRef {
    Issue { id: i64 },
    IssueComment { id: i64 },
    BoardPost { id: i64 },
    BoardComment { id: i64 },
    Project { id: i64 },
    Organization { id: i64 },
    PullRequest { id: i64 },
    Commit { project_id: i64, sha: String },
    Attachment { id: i64 },
    User { id: i64 },
    Webhook { id: i64 },
}

async fn authorize(
    db: &DatabaseConnection,
    user: &CurrentUser,
    resource: ResourceRef,
    op: Operation,
) -> Result<(), AccessError>;
```

Compatibility rules to preserve:

- Site managers bypass most resource checks.
- Anonymous access depends on `application.allowsAnonymousAccess`.
- Public projects are readable by non-guest users.
- Protected group projects are readable/writable by organization members
  according to current rules.
- Project members can update most project resources.
- Authors can update/delete authored issues/posts/comments where the current
  Java resource rules allow it.
- Issue assignees and sharers have special issue access.
- Temporary attachment resources owned by `ResourceType.USER` are only visible
  to the uploading user.
- Code deletion has stricter rules than other project resource deletion.

### Authentication Providers

Support multiple authentication backends behind a common trait. The current
system supports password login, GitHub OAuth, Google OAuth, and LDAP.

```rust
#[async_trait]
trait AuthProvider: Send + Sync {
    fn kind(&self) -> AuthProviderKind;
    async fn authenticate(&self, credentials: AuthCredentials) -> Result<AuthUser, AuthError>;
}

enum AuthProviderKind {
    Password,
    OAuth(OAuthConfig),
    Ldap(LdapConfig),
}
```

Rules:

- Password authentication is always available.
- OAuth providers (GitHub, Google) are loaded from the `secret` table and
  enabled by `oauth.providers` config.
- LDAP is enabled by `ldap.enabled` config with connection details from the
  `secret` table.
- Social-login-only mode (`application.use.social.login.only`) is preserved.
- LDAP property mapping (`loginProperty`, `displayNameProperty`,
  `emailProperty`) is configurable.

### Thin Handler Pattern

Every handler should follow this shape:

```rust
async fn update_issue(
    State(app): State<AppState>,
    user: CurrentUser,
    Path(path): Path<ProjectIssuePath>,
    Json(input): Json<UpdateIssueRequest>,
) -> Result<Json<IssueDto>, AppError> {
    let cmd = UpdateIssueCommand::from_path_and_input(path, input)?;
    let issue = issue_service::update_issue(&app, &user, cmd).await?;
    Ok(Json(issue.into()))
}
```

Do not put SeaORM query chains or notification side effects directly in
handlers. Put them in use cases.

### Bulletproof Rust Web Rules

Apply the Bulletproof Rust Web guidance as enforceable backend rules:

- `main.rs` stays thin: load configuration, initialize tracing, build
  dependencies, assemble the app, start the server, and coordinate graceful
  shutdown.
- HTTP handlers stay thin: extract request data, call domain/application
  services, and convert results into responses.
- Request/response DTOs belong to `yona-web`, not `yona-domain`.
- Domain models, value objects, service functions, and port traits belong to
  `yona-domain`.
- SeaORM entities and DB-specific query translation belong outside the domain,
  in `yona-entity` and `yona-infra`.
- Infrastructure adapters translate external errors into domain errors before
  crossing into service logic.
- Application state is built once in the composition root and passed through
  Axum state/extractors.
- Configuration is strongly typed and validates required secrets and paths at
  startup.
- Errors use typed domain errors plus response conversion at the HTTP edge.
- Observability uses structured tracing, request IDs, and consistent error
  spans around DB, VCS command, mail, and storage operations.
- Security middleware covers CORS, CSRF/session policy, security headers,
  request body limits, timeouts, and rate limits for login/upload endpoints.
- Integration tests call the same router construction path as production so
  test wiring cannot drift from runtime wiring.
- Background jobs live in `yona-jobs` and share domain services through ports;
  they do not import HTTP handlers.

## SeaORM Data SPEC

### Baseline Source

Use `yona-original/conf/evolutions/default/1.sql` plus all up migrations through
`yona-original/conf/evolutions/default/32.sql` as the compatibility schema. The Java models
are the behavior source, but the final SQL schema is the database source of
truth for table and column names.

Database targets:

- MariaDB remains the primary compatibility target for existing server
  deployments.
- MySQL is a first-class runtime target, not only a MariaDB-compatible fallback.
- PostgreSQL is a first-class runtime target. Existing Play configuration
  already documents a PostgreSQL JDBC shape, but the Rust port must verify
  schema, queries, transactions, and pagination explicitly instead of assuming
  compatibility from H2 PostgreSQL mode.
- SQLite replaces the legacy H2 embedded distribution for portable/local
  deployments.
- H2 data should be migrated through an explicit export/import or one-shot
  conversion tool; do not carry H2-specific behavior into the Rust runtime.
- SeaORM entities must use field types that can be mapped to MariaDB, MySQL,
  PostgreSQL, and SQLite without renaming columns.
- Database-specific SQL belongs in adapter/query modules with dialect tests;
  it must not leak into domain services or Axum handlers.

Phase 1 entity generation flow:

```text
1. Create an empty MariaDB test database from the final legacy schema.
2. Apply Yona evolutions 1..32 in order.
3. Introspect the resulting schema as the legacy compatibility baseline.
4. Generate SeaORM entities into `backend/crates/yona-entity`.
5. Normalize generated relation names manually where needed.
6. Add tests that compare generated entity metadata to the legacy schema.
7. Build equivalent schema creation/migration output for MariaDB, MySQL,
   PostgreSQL, and SQLite.
8. Diff every target schema against the normalized compatibility metadata.
```

Do not generate a new baseline schema that renames columns.

### Multi-Database Contract

Supported runtime targets:

| Target | Purpose | Driver/features | Required proof |
| --- | --- | --- | --- |
| MariaDB | Existing production compatibility | SeaORM `sqlx-mysql` | Legacy schema import, domain persistence contract tests, production smoke tests. |
| MySQL | Operational choice for MySQL-only environments | SeaORM `sqlx-mysql` | Same schema and domain persistence contract suite as MariaDB, with MySQL container image. |
| PostgreSQL | New first-class server target | SeaORM `sqlx-postgres` | Schema diff, query contract tests, transaction behavior, pagination/order behavior, case-sensitivity checks. |
| SQLite | Portable/local runtime and fast test backend | SeaORM `sqlx-sqlite` | File-backed runtime smoke tests plus in-memory unit/integration test default. |

Rules:

- Domain services depend on repository traits and transaction traits, not on
  database-specific SeaORM code.
- `yona-infra` owns SeaORM adapters and dialect differences.
- `yona-entity` owns generated entities only; if a target needs a custom SQL
  expression, put it in `yona-infra` and cover it in the DB matrix.
- Prefer SeaQuery/SeaORM portable expressions. Raw SQL requires an explicit
  dialect enum branch and a contract test for every runtime target.
- Migrations must be idempotent per target and must not rely on H2 compatibility
  modes.
- SQLite runtime must enable foreign keys and any required pragmas during
  connection initialization, because SQLite does not enforce all constraints by
  default in the same way as server databases.

### H2 To SQLite Migration Tool

Existing H2 users need a separate Java 8 migration utility because H2 is not a
runtime target for the Rust server.

Target location:

```text
tools/h2-to-sqlite-jdbc/
  build.gradle or pom.xml
  src/main/java/io/yona/migration/H2ToSqlite.java
  README.md
```

Requirements:

- Build and run on Java 8.
- Use JDBC only for database access. Java SE 8 includes `java.sql` and
  `javax.sql`; database access still requires H2 and SQLite JDBC driver jars.
- Default H2 driver compatibility should match the legacy dependency in this
  repository (`com.h2database:h2:1.3.176` in `yona-original/build.sbt`), but the tool must
  allow `--h2-driver-jar` or an equivalent override because H2 file formats can
  be version-sensitive.
- Use SQLite JDBC for the destination database.
- Inputs: H2 JDBC URL, user, password, destination SQLite file path, optional
  H2 driver jar, optional batch size, and output report path.
- Never mutate the source H2 database. Prefer read-only source connection
  options where supported.
- Create the destination SQLite schema from the new SQLite migration output,
  not by copying H2 DDL verbatim.
- Copy data table-by-table in dependency order, preserving primary keys,
  nullable fields, booleans, timestamps, text encodings, and binary/blob data.
- Preserve or recalculate sequence/autoincrement state so newly created rows do
  not collide after migration.
- Disable destination foreign-key checks only inside the import transaction when
  needed, then re-enable and verify constraints before success.
- Produce a JSON report with table row counts, failed rows, warnings, source
  and destination metadata, elapsed time, and checksum/hash samples for large
  tables.
- Support `--dry-run` and `--verify-only`.
- Require an explicit backup confirmation in the README and CLI help.

Verification:

- Java 8 compilation test for the tool.
- Fixture migration from a small H2 1.3.176 Yona database to SQLite.
- Fixture migration covering non-ASCII text, nullable foreign keys, booleans,
  timestamps, attachments metadata, issue/comment records, and sequence values.
- Row-count and referential-integrity verification must fail the command on
  mismatch.

### Database Test Strategy

The test pyramid must keep local iteration fast while still proving the
multi-database contract:

| Tier | Default command | Database | Scope | Runs by default |
| --- | --- | --- | --- | --- |
| Pure unit | `cargo test --workspace` | none | Domain value objects, access control, markdown parsing, permission decisions. | yes |
| Fast persistence | `cargo test --workspace` | SQLite in-memory | Main unit/integration tests for repository-backed use cases. | yes |
| DB matrix | `cargo test -p yona-infra --test db_matrix --features db-matrix` | Testcontainers MariaDB, MySQL, PostgreSQL | Domain persistence contracts through repository ports and SeaORM adapters. | CI/merge gate, optional locally |
| Runtime smoke | release smoke script | MariaDB, MySQL, PostgreSQL, SQLite file | Server boot, migrations, health, login/session, core read/write flows. | CI/nightly/release |

Rules:

- Most tests must use pure domain logic or in-memory SQLite.
- Testcontainers are limited to the domain persistence boundary: repositories,
  transactions, query filters, ordering/pagination, constraint behavior, and
  migration/schema compatibility.
- Do not multiply Axum handler, React, markdown, VCS, or mail tests across
  every database unless a failure is database-specific.
- The DB matrix must run the same contract tests against MariaDB, MySQL, and
  PostgreSQL by swapping only the database fixture/connection factory.
- SQLite is the default for fast tests, but SQLite success is not accepted as
  proof that MariaDB/MySQL/PostgreSQL behavior is correct.
- DB-specific skips require an issue link and a documented compatibility
  decision.

### Aggregate Map

Model and controller files in this map resolve under `yona-original/app/**`
unless the path is already fully qualified.

| Aggregate | Root/current files | Core tables/entities |
| --- | --- | --- |
| Identity and access | `User.java`, `ProjectUser.java`, `OrganizationUser.java`, `Role.java` | `n4user`, `email`, `user_credential`, `linked_account`, `user_verification`, `user_setting`, `site_admin`, `role`, `project_user`, `organization_user` |
| Organization | `Organization.java` | `organization`, `organization_user`, `user_enrolled_organization` |
| Project/workspace | `Project.java`, `ProjectMenuSetting.java`, `ProjectTransfer.java`, `PushedBranch.java`, `TitleHead.java` | `project`, `project_menu_setting`, `project_transfer`, `project_pushed_branch`, `title_head`, `recent_project`, `recently_visited_projects` |
| Labels and milestones | `Label.java`, `IssueLabel.java`, `IssueLabelCategory.java`, `Milestone.java` | `label`, `project_label`, `issue_label`, `issue_label_category`, `milestone` |
| Issues | `Issue.java`, `IssueComment.java`, `IssueEvent.java`, `IssueSharer.java` | `issue`, `issue_comment`, `issue_event`, `issue_sharer`, `issue_voter`, `issue_comment_voter`, `issue_issue_label`, `favorite_issue`, `recent_issue` |
| Boards/posts | `Posting.java`, `PostingComment.java` | `posting`, `posting_comment`, `posting_issue_label` |
| Pull requests/review | `PullRequest.java`, `PullRequestCommit.java`, `PullRequestEvent.java`, `CommentThread.java`, `ReviewComment.java` | `pull_request`, `pull_request_commit`, `pull_request_event`, `pull_request_reviewers`, `comment_thread`, `comment_thread_n4user`, `review_comment` |
| Code comments | `CodeComment.java`, `CommitComment.java`, `CodeCommentThread.java`, `NonRangedCodeCommentThread.java` | `commit_comment`, `comment_thread` |
| Notifications/watch | `NotificationEvent.java`, `NotificationMail.java`, `Watch.java`, `Unwatch.java`, `UserProjectNotification.java` | `notification_event`, `notification_event_n4user`, `notification_mail`, `watch`, `unwatch`, `user_project_notification` |
| Attachments | `Attachment.java` | `attachment` |
| Webhooks | `Webhook.java`, `WebhookThread.java` | `webhook`, `webhook_thread` |
| Mailbox/import/export | `yona-original/app/mailbox/**`, `yona-original/app/data/**` | `original_email`, import/export exchanger DTOs |

### Join Tables

SeaORM must model these explicitly because they have composite primary keys or
domain-specific relationships:

- `comment_thread_n4user`
- `issue_issue_label`
- `issue_voter`
- `issue_comment_voter`
- `notification_event_n4user`
- `posting_issue_label`
- `project_label`
- `pull_request_reviewers`
- `user_enrolled_project`
- `user_enrolled_organization`

### Enum Compatibility

Current enums live in `yona-original/app/models/enumeration/**`.
`yona-original/conf/evolutions/default/20.sql`
drops many legacy check constraints, so the Rust layer must validate enum
values even if the database no longer does.

Rules:

- Preserve stored representation by column. Do not assume all enum columns are
  strings.
- Create Rust enums for domain logic.
- Use SeaORM `DeriveActiveEnum` only when the stored representation is stable
  and known.
- For polymorphic columns such as `resource_type`, `container_type`, and
  `event_type`, add conversion tests against the Java enum names and database
  values.
- Keep unknown-value handling explicit for old databases: return a typed
  compatibility error, do not silently coerce except where Java currently does
  so, such as `State.getValue` falling back to `OPEN`.

### Schema Invariants

Preserve:

- `issue(project_id, number)` uniqueness.
- `posting(project_id, number)` uniqueness.
- `n4user.login_id` uniqueness.
- Composite primary keys in join tables.
- `issue.assignee_id` delete behavior from migration 25: set null.
- `issue.project_id` delete behavior from migration 25: cascade.
- Attachment columns: `name`, `hash`, `container_type`, `mime_type`, `size`,
  `container_id`, `created_date`, `owner_login_id`.

## Feature Decomposition

### 1. Identity, Login, User Settings

Legacy evidence sources:

- `yona-original/app/controllers/UserApp.java`
- `yona-original/app/controllers/PasswordResetApp.java`
- `yona-original/app/controllers/Application.java`
- `yona-original/app/models/User.java`,
  `yona-original/app/models/Email.java`,
  `yona-original/app/models/UserCredential.java`,
  `yona-original/app/models/LinkedAccount.java`,
  `yona-original/app/models/UserVerification.java`
- `yona-original/app/views/user/**`
- `yona-original/public/javascripts/service/yobi.user.*.js`

Rust use cases:

```rust
async fn login_with_password(db, login_id_or_email, password) -> AuthSession;
async fn logout(session) -> ();
async fn signup(db, SignupCommand) -> UserDto;
async fn request_password_reset(db, mailer, email) -> ();
async fn reset_password(db, token, new_password) -> ();
async fn update_user_profile(db, user, UpdateProfileCommand) -> UserDto;
async fn add_user_email(db, user, email) -> EmailDto;
async fn confirm_user_email(db, user, email_id, token) -> EmailDto;
```

React pages/components:

- `LoginPage`
- `SignupPage`
- `UserProfilePage`
- `UserSettingsPage`
- `EmailSettingsPanel`
- `PasswordResetPage`
- `UserMenu`

TanStack Query keys:

```ts
sessionKeys.current()
userKeys.profile(loginId)
userKeys.settings()
userKeys.files({ page, filter })
```

### 2. Organizations

Legacy evidence sources:

- `yona-original/app/controllers/OrganizationApp.java`
- `yona-original/app/controllers/EnrollOrganizationApp.java`
- `yona-original/app/models/Organization.java`,
  `yona-original/app/models/OrganizationUser.java`
- `yona-original/app/views/organization/**`
- `yona-original/public/javascripts/service/yobi.organization.*.js`

Rust use cases:

```rust
async fn create_organization(db, user, CreateOrganization) -> OrganizationDto;
async fn update_organization(db, user, org_name, UpdateOrganization) -> OrganizationDto;
async fn delete_organization(db, user, org_name) -> ();
async fn add_organization_member(db, user, org_name, member_login, role) -> MemberDto;
async fn update_organization_member_role(db, user, org_name, member_id, role) -> MemberDto;
async fn remove_organization_member(db, user, org_name, member_id) -> ();
async fn enroll_organization(db, user, org_name) -> ();
```

React pages/components:

- `OrganizationListPage`
- `OrganizationHomePage`
- `OrganizationMembersPage`
- `OrganizationSettingsPage`
- `OrganizationProjectList`
- `OrganizationIssueList`
- `OrganizationBoardList`

### 3. Projects

Legacy evidence sources:

- `yona-original/app/controllers/ProjectApp.java`
- `yona-original/app/controllers/EnrollProjectApp.java`
- `yona-original/app/models/Project.java`,
  `yona-original/app/models/ProjectUser.java`,
  `yona-original/app/models/ProjectMenuSetting.java`,
  `yona-original/app/models/ProjectTransfer.java`,
  `yona-original/app/models/Webhook.java`,
  `yona-original/app/models/PushedBranch.java`
- `yona-original/app/views/project/**`
- `yona-original/public/javascripts/service/yobi.project.*.js`

Rust use cases:

```rust
async fn list_projects(db, user, filter, page) -> Page<ProjectSummary>;
async fn get_project(db, user, owner, project_name) -> ProjectDto;
async fn create_project(db, user, CreateProject) -> ProjectDto;
async fn update_project_overview(db, user, owner, project, markdown) -> ProjectDto;
async fn update_project_settings(db, user, owner, project, UpdateProject) -> ProjectDto;
async fn delete_project(db, user, owner, project) -> ();
async fn add_project_member(db, user, owner, project, member, role) -> MemberDto;
async fn transfer_project(db, user, owner, project, destination) -> TransferDto;
async fn accept_project_transfer(db, user, transfer_id, key) -> ProjectDto;
async fn change_project_vcs(db, user, owner, project, vcs) -> ProjectDto;
```

React pages/components:

- `ProjectListPage`
- `ProjectCreatePage`
- `ProjectLayout`
- `ProjectHeader`
- `ProjectMenu`
- `ProjectOverviewPage`
- `ProjectSettingsPage`
- `ProjectMembersPage`
- `ProjectTransferPage`
- `ProjectWebhooksPage`

### 4. Issues

Legacy evidence sources:

- `yona-original/app/controllers/IssueApp.java`
- `yona-original/app/controllers/api/IssueApi.java`
- `yona-original/app/controllers/IssueLabelApp.java`
- `yona-original/app/controllers/MilestoneApp.java`
- `yona-original/app/controllers/VoteApp.java`
- `yona-original/app/models/Issue.java`,
  `yona-original/app/models/IssueComment.java`,
  `yona-original/app/models/IssueEvent.java`,
  `yona-original/app/models/IssueSharer.java`,
  `yona-original/app/models/Assignee.java`,
  `yona-original/app/models/Milestone.java`,
  `yona-original/app/models/IssueLabel.java`
- `yona-original/app/views/issue/**`
- `yona-original/public/javascripts/service/yobi.issue.*.js`
- `yona-original/public/javascripts/common/yona.Subtask.js`,
  `yona.SubComment.js`, `yona.Tasklist.js`,
  `yona.CommentAttachmentsUpdate.js`

Rust use cases:

```rust
async fn list_project_issues(db, user, project_ref, filter, page) -> Page<IssueSummary>;
async fn get_issue(db, user, project_ref, number) -> IssueDetail;
async fn create_issue(db, user, project_ref, CreateIssue) -> IssueDetail;
async fn update_issue(db, user, project_ref, number, UpdateIssue) -> IssueDetail;
async fn transition_issue_state(db, user, project_ref, number, next_state) -> IssueDetail;
async fn delete_issue(db, user, project_ref, number) -> ();
async fn mass_update_issues(db, user, project_ref, MassUpdateIssues) -> MassUpdateResult;
async fn add_issue_comment(db, user, project_ref, number, AddComment) -> IssueCommentDto;
async fn update_issue_comment(db, user, project_ref, number, comment_id, UpdateComment) -> IssueCommentDto;
async fn delete_issue_comment(db, user, project_ref, number, comment_id) -> ();
async fn vote_issue(db, user, project_ref, number) -> VoteState;
async fn share_issue(db, user, project_ref, number, sharers) -> IssueDetail;
```

Important behavior to preserve:

- Issue numbers are per project.
- Issue create/update calls update title-head keywords and mention records.
- Issue move to another project transfers labels where possible.
- Parent issue/subtask relationships must survive project moves.
- Draft issues use `is_draft`.
- Comment update can preserve previous content in history.
- Attachment temporary files move from user resource to issue/comment resource.
- Notification events are created for state, assignee, body, move, sharer,
  label, milestone, and comment changes.

React pages/components:

- `IssueListPage`
- `IssueDetailPage`
- `IssueCreatePage`
- `IssueEditPage`
- `IssueTimeline`
- `IssueCommentList`
- `IssueCommentForm`
- `IssueLabelPicker`
- `IssueAssigneePicker`
- `IssueMilestonePicker`
- `IssueSharerDialog`
- `IssueMassUpdateToolbar`
- `SubtaskList`
- `TaskListEditor`

TanStack Query keys:

```ts
issueKeys.list(owner, project, filters)
issueKeys.detail(owner, project, number)
issueKeys.timeline(owner, project, number)
issueKeys.assignableUsers(owner, project, number, query)
issueKeys.sharableUsers(owner, project, number, query)
issueKeys.labels(owner, project)
issueKeys.milestones(owner, project)
```

Mutation invalidation:

- Issue update invalidates detail, timeline, project issue list, user issue
  list, organization issue list, and notification badge queries.
- Comment mutation invalidates detail, timeline, attachments for that comment,
  and notification badge queries.

### 5. Boards and Posts

Legacy evidence sources:

- `yona-original/app/controllers/BoardApp.java`
- `yona-original/app/controllers/api/BoardApi.java`
- `yona-original/app/models/Posting.java`,
  `yona-original/app/models/PostingComment.java`
- `yona-original/app/views/board/**`
- `yona-original/public/javascripts/service/yobi.board.*.js`

Rust use cases:

```rust
async fn list_posts(db, user, project_ref, page) -> Page<PostSummary>;
async fn get_post(db, user, project_ref, number) -> PostDetail;
async fn create_post(db, user, project_ref, CreatePost) -> PostDetail;
async fn update_post(db, user, project_ref, number, UpdatePost) -> PostDetail;
async fn delete_post(db, user, project_ref, number) -> ();
async fn add_post_comment(db, user, project_ref, number, AddComment) -> PostingCommentDto;
async fn update_post_comment(db, user, project_ref, number, comment_id, UpdateComment) -> PostingCommentDto;
async fn delete_post_comment(db, user, project_ref, number, comment_id) -> ();
```

React pages/components:

- `BoardListPage`
- `PostDetailPage`
- `PostEditorPage`
- `PostCommentList`
- `PostCommentForm`
- Shared `MarkdownEditor`, `AttachmentUploadZone`, and label components.

### 6. Labels and Milestones

Legacy evidence sources:

- `yona-original/app/controllers/IssueLabelApp.java`
- `yona-original/app/controllers/LabelApp.java`
- `yona-original/app/controllers/MilestoneApp.java`
- `yona-original/app/models/IssueLabel.java`,
  `yona-original/app/models/IssueLabelCategory.java`,
  `yona-original/app/models/Label.java`,
  `yona-original/app/models/Milestone.java`
- `yona-original/app/views/milestone/**`
- `yona-original/public/javascripts/service/yobi.milestone.*.js`,
  `yobi.issue.LabelEditor.js`

Rust use cases:

```rust
async fn list_issue_labels(db, user, project_ref) -> Vec<IssueLabelDto>;
async fn create_issue_label(db, user, project_ref, CreateIssueLabel) -> IssueLabelDto;
async fn update_issue_label(db, user, project_ref, label_id, UpdateIssueLabel) -> IssueLabelDto;
async fn delete_issue_label(db, user, project_ref, label_id) -> ();
async fn copy_labels(db, user, from_project, to_project) -> CopyLabelResult;
async fn list_milestones(db, user, project_ref) -> Vec<MilestoneDto>;
async fn create_milestone(db, user, project_ref, CreateMilestone) -> MilestoneDto;
async fn update_milestone(db, user, project_ref, milestone_id, UpdateMilestone) -> MilestoneDto;
async fn transition_milestone(db, user, project_ref, milestone_id, state) -> MilestoneDto;
```

React components:

- `LabelManagerPage`
- `LabelCategoryEditor`
- `IssueLabelBadge`
- `MilestoneListPage`
- `MilestoneEditorPage`
- `MilestoneProgress`

### 7. Attachments and Uploads

Legacy evidence sources:

- `yona-original/app/controllers/AttachmentApp.java`
- `yona-original/app/models/Attachment.java`
- `yona-original/app/views/common/fileUploader.scala.html`,
  `yona-original/app/views/common/attachmentFile.scala.html`
- `yona-original/public/javascripts/common/yobi.Files.js`
- `yona-original/public/javascripts/common/yobi.Attachments.js`

Current API contract:

- `POST /files` multipart with field `filePath`
- `GET /files/:id`
- `POST /files/:id` with `_method=delete`
- `GET /files?containerType=...&containerId=...`
- Upload response fields: `id`, `name`, `url`, `mimeType`, `size`

Rust storage interface:

```rust
trait AttachmentStorage {
    async fn put_temp_and_hash(&self, stream: ByteStream) -> Result<StoredBlob, StorageError>;
    async fn open(&self, hash: &str) -> Result<BlobReader, StorageError>;
    async fn exists(&self, hash: &str) -> Result<bool, StorageError>;
    async fn delete_if_unreferenced(&self, hash: &str) -> Result<(), StorageError>;
}
```

Attachment use cases:

```rust
async fn upload_attachment(app, user, file) -> UploadResponse {
    require_authenticated(user)?;
    let blob = storage.put_temp_and_hash(file.stream).await?;
    let name = normalize_nfc(file.filename);
    let metadata = detect_mime_and_size(&blob, name)?;
    let container = ResourceRef::User { id: user.id };
    let attachment = attachment_repo::insert_or_find_same(
        db, name, blob.sha256, metadata, container, user.login_id
    ).await?;
    return UploadResponse::from(attachment);
}

async fn move_temporary_attachments(db, user, ids, target: ResourceRef) {
    for attachment in attachment_repo::find_by_ids(ids).await? {
        authorize(user, attachment.as_resource(), Operation::Update).await?;
        ensure_attachment_container_is_user_or_site_manager(user, attachment)?;
        attachment_repo::move_to(attachment.id, target).await?;
    }
}

async fn delete_attachment(app, user, id) {
    let attachment = attachment_repo::get(id).await?;
    authorize(user, attachment.as_resource(), Operation::Delete).await?;
    attachment_repo::delete_metadata(id).await?;
    storage.delete_if_unreferenced(&attachment.hash).await?;
}
```

Compatibility requirements:

- Store files under `YONA_DATA/uploads/{sha256}`.
- Compute SHA-256 from file contents.
- Normalize uploaded filenames with NFC.
- Return `201 Created` only when a new attachment row is created; return
  `200 OK` when the same attachment metadata already exists.
- Preserve ETag shape based on hash and inline/download disposition.
- Preserve `?action=download` behavior.
- Preserve temporary upload cleanup behavior: instead of the legacy 30-minute
  polling scheduler, assign a TTL to temporary uploads at creation time (e.g.,
  1 hour). Check expiry lazily on access and enforce cleanup in a lightweight
  background task. This avoids scheduler overhead and is more predictable.
- Preserve file deletion behavior: only delete the blob when no attachment row
  still references that hash.

React replacement:

- `attachmentService.upload(file)`
- `attachmentService.list(containerType, containerId)`
- `attachmentService.delete(id)`
- `useAttachmentUploader`
- `AttachmentUploadZone`
- `AttachmentList`
- `useMarkdownAttachments`

Editor behavior to preserve:

- On paste/drop, insert `<!--_{submitId}_-->` placeholder.
- On upload success, replace placeholder with:
  - image: `![name](/files/id) `
  - non-image: `[name](/files/id) `
  - HTML5 video: `<video ...><source src="/files/id" type="..."></video>[name](/files/id) `
- Track hidden `temporaryUploadFiles` equivalent in React form state.
- Remove inserted markdown when a temporary file is deleted.
- Convert pasted spreadsheet/table text into markdown table text.

### 8. Markdown, Mentions, and Yona Links

Legacy evidence sources:

- `yona-original/app/controllers/MarkdownApp.java`
- `yona-original/app/utils/Markdown.java`
- `yona-original/app/utils/AutoLinkRenderer.java`
- `yona-original/app/views/common/markdown.scala.html`
- `yona-original/app/views/common/editor.scala.html`
- `yona-original/public/javascripts/common/yobi.Markdown.js`
- `yona-original/public/javascripts/common/yobi.Mention.js`
- `yona-original/public/javascripts/yona-lib.js`
- `yona-original/app/controllers/ProjectApp.java` `mentionList*`

Current behavior:

- `yobi.Markdown` detects `[markdown]` textareas/viewers.
- Preview posts `{ body, breaks }` to `/markdown/:user/:project` when a
  project-specific renderer URL exists.
- Server rendering uses marked.js through Java `ScriptEngine`.
- Server sanitizes HTML with OWASP Java HTML Sanitizer.
- `Markdown.transformIssueLink` rewrites local issue URLs into issue labels
  with state spans if the current user can read the issue.
- `AutoLinkRenderer` rewrites references outside `CODE` and `A` tags:
  - `#123`
  - `owner/project#123`
  - `owner#123`
  - `@sha` and `owner/project@sha`
  - `@user`
  - `@owner/project`
- README/code markdown rewrites relative links to code browser or file routes.

Target rendering strategy:

Use `react-markdown` with remark/rehype plugins instead of server-rendered
HTML. `react-markdown` supports remark/rehype plugins and renders syntax tree
output as React elements; this is a better fit than carrying forward server
HTML strings.

Recommended pipeline:

```tsx
<Markdown
  remarkPlugins={[
    remarkGfm,
    remarkYonaReferenceTokens(referenceResolution),
    remarkYonaReadmeRelativeLinks(projectContext),
    remarkYonaAttachmentLinks(attachmentPolicy),
  ]}
  rehypePlugins={[
    rehypeSanitize(yonaSanitizeSchema),
    rehypeYonaLinkAttributes(sitePolicy),
  ]}
  components={{
    a: YonaLink,
    img: YonaImage,
    code: CodeBlock,
    input: TaskListCheckbox,
  }}
>
  {body}
</Markdown>
```

Reference resolution is the only part that needs server data. Do it in two
steps:

```ts
const refs = extractYonaReferences(markdown);
const resolution = useQuery({
  queryKey: markdownKeys.references(projectKey, refs),
  queryFn: () => markdownApi.resolveReferences(projectKey, refs),
  enabled: refs.length > 0,
});
return <YonaMarkdown body={markdown} referenceResolution={resolution.data} />;
```

Backend resolver API:

```http
POST /-_-api/v1/owners/:owner/projects/:projectName/markdown/references
Content-Type: application/json

{
  "references": [
    { "kind": "issue", "text": "#123" },
    { "kind": "issue", "text": "owner/project#123" },
    { "kind": "commit", "text": "@abcdef1" },
    { "kind": "user", "text": "@alice" },
    { "kind": "project", "text": "@owner/project" },
    { "kind": "attachment", "href": "/files/42" }
  ]
}
```

Response:

```json
{
  "issues": {
    "#123": {
      "href": "/owner/project/issue/123",
      "text": "#123.Issue title",
      "state": "open",
      "readable": true
    }
  },
  "commits": {
    "@abcdef1": {
      "href": "/owner/project/commit/abcdef1234",
      "shortId": "abcdef1",
      "readable": true
    }
  },
  "users": {
    "@alice": {
      "href": "/alice",
      "displayName": "Alice",
      "avatarUrl": "/assets/images/default-avatar.png"
    }
  },
  "projects": {},
  "attachments": {
    "/files/42": {
      "href": "/files/42",
      "downloadHref": "/files/42?action=download",
      "mimeType": "image/png",
      "name": "screenshot.png",
      "readable": true
    }
  }
}
```

Plugin requirements:

- Never rewrite inside code nodes or existing link nodes.
- Preserve GFM tables and task lists.
- Add issue state display equivalent to current `issue-state` span.
- Apply `rel="noreferrer"` for external links when configured.
- Block `javascript:` and unsafe protocols.
- Support `file:` and `zpl:` only if the deployment explicitly keeps the
  existing sanitizer policy.
- Resolve attachment links through the same access rules as `AttachmentApp`.
- Keep README relative image links pointing to `/files/:rev/*path`.
- Keep README relative normal links pointing to `/code/:branch/*path`.
- Provide parity snapshot tests against representative legacy markdown:
  issue link, commit link, user mention, project mention, attachment image,
  video upload, task list, table, unsafe HTML, external link, README relative
  link.

Mention/autocomplete target:

- `mentionService.searchUsers(projectKey, query)`
- `mentionService.searchIssues(projectKey, query)`
- `MentionAutocomplete` integrated with `MarkdownEditor`
- Preserve triggers: `@`, `#`, `:`
- Preserve remote query parameters: `query`, `mentionType`
- Preserve emoji shortcode behavior as local client data.

### 9. Code Browser, Git, SVN

Legacy evidence sources:

- `yona-original/app/controllers/GitApp.java`
- `yona-original/app/controllers/SvnApp.java`
- `yona-original/app/controllers/CodeApp.java`
- `yona-original/app/controllers/CodeHistoryApp.java`
- `yona-original/app/controllers/BranchApp.java`
- `yona-original/app/controllers/CompareApp.java`
- `yona-original/app/playRepository/**`
- `yona-original/app/views/code/**`, `yona-original/app/views/git/**`
- `yona-original/public/javascripts/service/yobi.code.*.js`,
  `yona-original/public/javascripts/service/yobi.git.*.js`

Rust backend modules:

```rust
trait RepositoryService {
    async fn open_project_repo(&self, project: &Project) -> Result<Box<dyn VcsBackend>, VcsError>;
}

trait VcsBackend {
    fn kind(&self) -> VcsKind;
    fn capabilities(&self) -> VcsCapabilities;
    async fn branches(&self) -> Result<Vec<BranchDto>, VcsError>;
    async fn tree(&self, rev: &str, path: &str) -> Result<TreeDto, VcsError>;
    async fn blob(&self, rev: &str, path: &str) -> Result<BlobDto, VcsError>;
    async fn history(&self, rev: &str, path: Option<&str>, page: PageParam) -> Result<Page<CommitDto>, VcsError>;
    async fn diff(&self, base: &str, head: &str) -> Result<DiffDto, VcsError>;
}

struct GitCliBackend {
    repo_path: PathBuf,
    runner: CommandRunner,
}

struct SvnCliBackend {
    repo_path: PathBuf,
    runner: CommandRunner,
}
```

VCS backend rules:

- Design `yona-vcs` around an interface from the first implementation slice.
  Feature code must depend on `RepositoryService` and `VcsBackend`, not on a
  concrete Git or SVN implementation.
- Git is implemented through native executable calls, matching the selected
  Gitea/Forgejo-style direction.
- SVN should also use native executable calls if the required behavior can be
  covered by `svn`, `svnadmin`, `svnlook`, and related command-line tools.
- Keep a single `CommandRunner` abstraction for Git and SVN so command
  allowlists, timeouts, environment cleanup, path validation, output limits,
  and per-repository locks are enforced consistently.
- Keep Git smart HTTP and SVN WebDAV as service routers, not normal JSON
  handlers. They have transport-specific request and response rules.
- If one SVN operation cannot be implemented safely through native commands,
  isolate only that operation behind the same `SvnCliBackend` interface instead
  of leaking implementation details into handlers or React APIs.

React pages/components:

- `CodeBrowserPage`
- `FileTree`
- `FileViewer`
- `CommitHistoryPage`
- `CommitDetailPage`
- `DiffViewer`
- `DiffLineCommentThread`
- `BranchListPage`
- `ComparePage`

### 10. Pull Requests and Review

Legacy evidence sources:

- `yona-original/app/controllers/PullRequestApp.java`
- `yona-original/app/controllers/ReviewApp.java`
- `yona-original/app/controllers/ReviewThreadApp.java`
- `yona-original/app/models/PullRequest.java`,
  `yona-original/app/models/PullRequestCommit.java`,
  `yona-original/app/models/PullRequestEvent.java`,
  `yona-original/app/models/CommentThread.java`,
  `yona-original/app/models/ReviewComment.java`
- `yona-original/app/views/git/**`,
  `yona-original/app/views/reviewthread/**`
- `yona-original/public/javascripts/service/yobi.git.*.js`,
  `yona-original/public/javascripts/service/yobi.review.List.js`

Rust use cases:

```rust
async fn create_pull_request(db, vcs, user, project_ref, CreatePullRequest) -> PullRequestDto;
async fn list_pull_requests(db, user, project_ref, category) -> Page<PullRequestSummary>;
async fn get_pull_request(db, user, project_ref, number) -> PullRequestDetail;
async fn get_pull_request_changes(db, vcs, user, project_ref, number, commit) -> DiffDto;
async fn accept_pull_request(db, vcs, user, project_ref, number) -> MergeResultDto;
async fn close_pull_request(db, user, project_ref, number) -> PullRequestDto;
async fn reopen_pull_request(db, user, project_ref, number) -> PullRequestDto;
async fn add_review_comment(db, user, thread_ref, AddReviewComment) -> ReviewCommentDto;
async fn close_comment_thread(db, user, thread_id) -> CommentThreadDto;
async fn open_comment_thread(db, user, thread_id) -> CommentThreadDto;
```

React components:

- `PullRequestListPage`
- `PullRequestDetailPage`
- `PullRequestCreatePage`
- `PullRequestStateBadge`
- `ReviewThreadList`
- `ReviewThreadPanel`
- `ReviewCommentForm`
- Shared `DiffViewer`

### 11. Notifications, Watch, Mail

Legacy evidence sources:

- `yona-original/app/controllers/NotificationApp.java`
- `yona-original/app/controllers/WatchApp.java`
- `yona-original/app/controllers/WatchProjectApp.java`
- `yona-original/app/models/NotificationEvent.java`,
  `yona-original/app/models/NotificationMail.java`,
  `yona-original/app/models/Watch.java`,
  `yona-original/app/models/Unwatch.java`,
  `yona-original/app/models/UserProjectNotification.java`
- `yona-original/app/notification/**`
- `yona-original/app/actors/*Notification*`
- `yona-original/app/mailbox/**`

Rust use cases:

```rust
async fn create_notification_event(tx, event: NotificationCommand) -> NotificationEventDto;
async fn list_notifications(db, user, from, limit) -> Vec<NotificationDto>;
async fn watch_resource(db, user, resource) -> WatchState;
async fn unwatch_resource(db, user, resource) -> WatchState;
async fn update_project_notification(db, user, project_id, noti_type) -> NotificationSetting;
async fn enqueue_notification_mail(queue, event_id) -> ();
```

Background workers (converted from Akka actors):

- Notification mail sender (was: scheduled every 60s in `Global.onStart`)
- Validation email sender (was: `ValidationEmailSender` actor)
- Post-receive commit processor (was: `CommitsNotificationActor`)
- Post-receive issue reference processor (was: `IssueReferredFromCommitEventActor`)
- Pull request merge processor (was: `PullRequestMergingActor`,
  `RelatedPullRequestMergingActor`)
- Temporary attachment TTL cleanup (TTL-based expiry with lazy eviction on
  access; background sweep as fallback, replacing the legacy 30-minute
  scheduler)
- Mailbox ingestion (was: `MailboxService` with IMAP IDLE/polling)
- Search index updater (re-indexes after write operations, consistency repair)

### 12. Search, Admin, Migration, Import/Export

Legacy evidence sources:

- `yona-original/app/controllers/SearchApp.java`
- `yona-original/app/controllers/SiteApp.java`
- `yona-original/app/controllers/MigrationApp.java`
- `yona-original/app/controllers/ImportApp.java`
- `yona-original/app/data/**` (48 table-specific DataExchanger classes)
- `yona-original/app/views/search/**`,
  `yona-original/app/views/site/**`,
  `yona-original/app/views/migration/**`

Target modules:

- `search_service`
- `admin_service`
- `migration_export_service`
- `project_import_service`

Porting rule:

- Keep admin pages behind site-manager authorization.
- Convert admin tables to React pages backed by paginated JSON APIs.
- Treat import/export formats as compatibility contracts; do not "clean up"
  their field names without a separate migration design.
- Replace the 48 individual DataExchanger classes with a generic
  serialization/deserialization pipeline that reads table metadata from
  SeaORM entities.

### 13. Search Engine Integration

The legacy search uses Ebean `icontains()` (SQL LIKE) queries against
`title`/`body`/`contents` fields across issues, posts, users, projects,
milestones, and comments. This has no stemming, relevance ranking, fuzzy
matching, or boolean operators.

Target: integrate full-text search behind an interface so the backend can be
swapped depending on deployment scale.

```rust
#[async_trait]
trait SearchBackend: Send + Sync {
    async fn index_document(&self, index: SearchIndex, doc: SearchDocument) -> Result<(), SearchError>;
    async fn remove_document(&self, index: SearchIndex, id: &str) -> Result<(), SearchError>;
    async fn search(&self, query: SearchQuery) -> Result<SearchResults, SearchError>;
}

enum SearchIndex {
    Issues,
    Posts,
    Users,
    Projects,
    Milestones,
    Comments,
}
```

Search backend implementations, in priority order:

1. **Database-native FTS** (default, zero external dependencies):
   - PostgreSQL: `tsvector`/`tsquery` with `pg_trgm` for fuzzy matching.
     Create GIN indexes on generated columns. Use `plainto_tsquery` and
     `ts_rank` for relevance ordering. Supports dictionary-based stemming.
   - MySQL: `FULLTEXT` indexes with `MATCH ... AGAINST ... IN BOOLEAN MODE`.
     Supports word stemming and stop words. Requires `ngram` parser for
     CJK text.
   - SQLite: FTS5 virtual tables with `tokenize="unicode61"` or external
     tokenizers. Use `bm25()` for relevance ranking.
   - MariaDB: same `FULLTEXT` approach as MySQL.
   - Implementation lives in `yona-infra` and emits dialect-specific DDL
     during schema creation. Query construction uses SeaQuery expressions
     with dialect branches, covered by the DB matrix contract tests.

2. **Tantivy** (embedded Rust, optional): better relevance, no external
   service. Useful when database-native FTS is insufficient (complex
   cross-entity ranking, faceted search).

3. **Meilisearch** (external service, optional): for deployments that prefer
   a dedicated search service with built-in typographic tolerance.

Rules:

- Default is database-native FTS. No external dependency required.
- Index updates happen synchronously after write operations.
- Background re-index job available for initial load or consistency repair.
- Search results respect access control: filter by project visibility and
   user membership before returning.
- Dialect-specific FTS DDL is tested in the DB matrix alongside other
   persistence contracts.

Searchable entities and fields:

| Entity | Indexed fields | Scope |
| --- | --- | --- |
| Issue | title, body | project |
| IssueComment | contents | project |
| Post | title, body | project |
| PostComment | contents | project |
| User | name, login_id | global |
| Project | name, overview | global (filtered by access) |
| Milestone | title, contents | project |
| ReviewComment | contents | project |

React components:

- `SearchPage` (global, organization, project scopes)
- `SearchInput` (autocomplete suggestion box)
- `SearchResultList`
- `SearchFilterPanel`

### 14. Statistics

Legacy evidence source: `yona-original/app/controllers/StatisticsApp.java`

Rust use case:

```rust
async fn get_project_statistics(db, vcs, user, project_ref) -> ProjectStatistics;
```

Statistics include commit counts, contributor counts, code volume changes over
time, and project activity summaries. VCS statistics come through the
`VcsBackend` interface.

React component:

- `ProjectStatisticsPage`

### 15. Favorites

Legacy evidence sources: `yona-original/app/models/FavoriteIssue.java`,
`yona-original/app/models/FavoriteProject.java`, and
`yona-original/app/models/FavoriteOrganization.java` models. API routes under
`/-_-api/v1/favorite*`.

Rust use cases:

```rust
async fn list_favorite_projects(db, user) -> Vec<ProjectSummary>;
async fn toggle_favorite_project(db, user, project_id) -> FavoriteState;
async fn list_favorite_organizations(db, user) -> Vec<OrganizationSummary>;
async fn toggle_favorite_organization(db, user, org_id) -> FavoriteState;
async fn list_favorite_issues(db, user) -> Vec<IssueSummary>;
async fn toggle_favorite_issue(db, user, issue_id) -> FavoriteState;
```

### 16. Error Pages and Dashboard

Legacy evidence sources:

- `yona-original/app/views/error/` (badrequest, forbidden, notfound,
  internalServerError)
- `yona-original/app/views/index/` (14 templates for dashboard,
  notifications, project lists)

React pages:

- `ErrorPage` (400, 403, 404, 500 with appropriate messages)
- `DashboardPage` (user's recent activity, favorite projects, notifications)
- `IndexPage` (public landing page with project list)

## Router SPEC

Use three top-level routers: JSON API, file/transport, and SPA fallback.

```rust
fn app_router(state: AppState) -> Router {
    Router::new()
        .nest("/api/v1", api_router())
        .merge(file_router())           // /files, /raw, /image
        .merge(git_transport_router())  // Git smart HTTP
        .merge(svn_transport_router())  // SVN CLI-backed service
        .fallback(spa_shell)            // all other paths -> React index.html
        .with_state(state)
}
```

### JSON API Router

Design clean RESTful APIs instead of preserving the verbose legacy URL
patterns. The legacy Play routes are inconsistent (`POST .../issues/latest` to
create, `POST .../issues` to batch-update, `_method=delete` hack) and do not
follow REST conventions.

```text
# Session
POST   /api/v1/session                    # login
DELETE /api/v1/session                    # logout
GET    /api/v1/session                    # current user info

# Users
GET    /api/v1/users                      # list (admin)
POST   /api/v1/users                      # create (signup)
GET    /api/v1/users/:loginId             # profile
PATCH  /api/v1/users/:loginId             # update
POST   /api/v1/users/:loginId/reset-password  # admin reset
GET    /api/v1/user/settings              # current user settings
PATCH  /api/v1/user/settings              # update settings
GET    /api/v1/user/emails                # list emails
POST   /api/v1/user/emails                # add email
DELETE /api/v1/user/emails/:id            # remove email
POST   /api/v1/user/emails/:id/verify     # send verification
GET    /api/v1/user/emails/:id/verify/:token  # confirm

# Password reset
POST   /api/v1/password-reset             # request
POST   /api/v1/password-reset/confirm     # confirm

# Organizations
GET    /api/v1/organizations              # list
POST   /api/v1/organizations              # create
GET    /api/v1/organizations/:name        # detail
PATCH  /api/v1/organizations/:name        # update
DELETE /api/v1/organizations/:name        # delete
GET    /api/v1/organizations/:name/members       # list members
POST   /api/v1/organizations/:name/members       # add member
PATCH  /api/v1/organizations/:name/members/:id   # update role
DELETE /api/v1/organizations/:name/members/:id   # remove member
POST   /api/v1/organizations/:name/enroll        # enroll
DELETE /api/v1/organizations/:name/enroll        # cancel enrollment

# Projects
GET    /api/v1/projects                   # list (with filters)
POST   /api/v1/projects                   # create
GET    /api/v1/projects/:id               # detail (by ID or owner/name)
PATCH  /api/v1/projects/:id               # update settings
DELETE /api/v1/projects/:id               # delete
PUT    /api/v1/projects/:id/overview      # update overview markdown
GET    /api/v1/projects/:id/members       # list members
POST   /api/v1/projects/:id/members       # add member
PATCH  /api/v1/projects/:id/members/:uid  # update role
DELETE /api/v1/projects/:id/members/:uid  # remove member
POST   /api/v1/projects/:id/transfer      # request transfer
POST   /api/v1/projects/:id/transfer/:key # accept transfer
PATCH  /api/v1/projects/:id/vcs           # change VCS
GET    /api/v1/projects/:id/webhooks      # list webhooks
POST   /api/v1/projects/:id/webhooks      # create webhook
DELETE /api/v1/projects/:id/webhooks/:wid # delete webhook
POST   /api/v1/projects/:id/enroll        # enroll
DELETE /api/v1/projects/:id/enroll        # cancel enrollment

# Issues
GET    /api/v1/projects/:id/issues       # list (with filters)
POST   /api/v1/projects/:id/issues       # create
GET    /api/v1/projects/:id/issues/:num  # detail
PATCH  /api/v1/projects/:id/issues/:num  # update
DELETE /api/v1/projects/:id/issues/:num  # delete
PATCH  /api/v1/projects/:id/issues/:num/state  # state transition
POST   /api/v1/projects/:id/issues/batch       # mass update
GET    /api/v1/projects/:id/issues/:num/timeline  # issue events
POST   /api/v1/projects/:id/issues/:num/comments  # add comment
PATCH  /api/v1/projects/:id/issues/:num/comments/:cid  # update comment
DELETE /api/v1/projects/:id/issues/:num/comments/:cid  # delete comment
POST   /api/v1/projects/:id/issues/:num/vote   # vote
DELETE /api/v1/projects/:id/issues/:num/vote   # unvote
POST   /api/v1/projects/:id/issues/:num/comments/:cid/vote
DELETE /api/v1/projects/:id/issues/:num/comments/:cid/vote

# Boards / Posts
GET    /api/v1/projects/:id/posts        # list
POST   /api/v1/projects/:id/posts        # create
GET    /api/v1/projects/:id/posts/:num   # detail
PATCH  /api/v1/projects/:id/posts/:num   # update
DELETE /api/v1/projects/:id/posts/:num   # delete
POST   /api/v1/projects/:id/posts/:num/comments
PATCH  /api/v1/projects/:id/posts/:num/comments/:cid
DELETE /api/v1/projects/:id/posts/:num/comments/:cid

# Labels
GET    /api/v1/projects/:id/labels       # list project labels
POST   /api/v1/projects/:id/labels       # create label
PATCH  /api/v1/projects/:id/labels/:lid  # update label
DELETE /api/v1/projects/:id/labels/:lid  # delete label
GET    /api/v1/projects/:id/labels/categories
POST   /api/v1/projects/:id/labels/categories
PATCH  /api/v1/projects/:id/labels/categories/:cid
DELETE /api/v1/projects/:id/labels/categories/:cid
POST   /api/v1/projects/:id/labels/copy  # copy from another project
GET    /api/v1/labels                    # global labels
GET    /api/v1/labels/categories         # global categories

# Milestones
GET    /api/v1/projects/:id/milestones
POST   /api/v1/projects/:id/milestones
GET    /api/v1/projects/:id/milestones/:mid
PATCH  /api/v1/projects/:id/milestones/:mid
DELETE /api/v1/projects/:id/milestones/:mid
PATCH  /api/v1/projects/:id/milestones/:mid/state  # open/close

# Pull Requests
GET    /api/v1/projects/:id/pull-requests
POST   /api/v1/projects/:id/pull-requests
GET    /api/v1/projects/:id/pull-requests/:num
PATCH  /api/v1/projects/:id/pull-requests/:num
GET    /api/v1/projects/:id/pull-requests/:num/changes
GET    /api/v1/projects/:id/pull-requests/:num/changes/:commit
POST   /api/v1/projects/:id/pull-requests/:num/accept
POST   /api/v1/projects/:id/pull-requests/:num/close
POST   /api/v1/projects/:id/pull-requests/:num/reopen
DELETE /api/v1/projects/:id/pull-requests/:num/from-branch
POST   /api/v1/projects/:id/pull-requests/:num/restore-branch
POST   /api/v1/projects/:id/pull-requests/:num/review
DELETE /api/v1/projects/:id/pull-requests/:num/review

# Review Comments
POST   /api/v1/projects/:id/pull-requests/:num/comments
PATCH  /api/v1/threads/:id
POST   /api/v1/threads/:id/open
POST   /api/v1/threads/:id/close

# Code / VCS
GET    /api/v1/projects/:id/branches
DELETE /api/v1/projects/:id/branches/:branch
POST   /api/v1/projects/:id/branches/:branch/default
GET    /api/v1/projects/:id/tree/:rev/*path    # directory listing
GET    /api/v1/projects/:id/blob/:rev/*path    # file content
GET    /api/v1/projects/:id/commits/:rev/*path # commit history
GET    /api/v1/projects/:id/commits/:id        # commit detail
POST   /api/v1/projects/:id/commits/:cid/comments
DELETE /api/v1/projects/:id/commits/:cid/comments/:ccid
GET    /api/v1/projects/:id/compare/:a..:b     # diff

# Files / Attachments
POST   /api/v1/attachments              # multipart upload
GET    /api/v1/attachments/:id          # download/inline
DELETE /api/v1/attachments/:id          # delete

# Markdown
POST   /api/v1/projects/:id/markdown/references

# Notifications
GET    /api/v1/notifications
POST   /api/v1/projects/:id/watch
DELETE /api/v1/projects/:id/watch
POST   /api/v1/watch
DELETE /api/v1/watch
POST   /api/v1/projects/:id/notifications/:type/toggle

# Favorites
GET    /api/v1/favorites/projects
POST   /api/v1/favorites/projects/:id
DELETE /api/v1/favorites/projects/:id
GET    /api/v1/favorites/organizations
POST   /api/v1/favorites/organizations/:id
DELETE /api/v1/favorites/organizations/:id
GET    /api/v1/favorites/issues
POST   /api/v1/favorites/issues/:id
DELETE /api/v1/favorites/issues/:id

# Search
GET    /api/v1/search                    # global
GET    /api/v1/organizations/:name/search
GET    /api/v1/projects/:id/search

# Statistics
GET    /api/v1/projects/:id/statistics

# Mentions
GET    /api/v1/projects/:id/mentions?query=&type=
GET    /api/v1/projects/:id/mentions/commit-diff?query=
GET    /api/v1/projects/:id/mentions/pull-request?query=

# Admin
GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/:loginId
DELETE /api/v1/admin/users/:loginId
POST   /api/v1/admin/users/:loginId/toggle-admin
POST   /api/v1/admin/users/:loginId/toggle-lock
GET    /api/v1/admin/projects
DELETE /api/v1/admin/projects/:id
POST   /api/v1/admin/guest-mode/toggle
GET    /api/v1/admin/posts
GET    /api/v1/admin/issues

# Migration / Export
GET    /api/v1/export/projects                      # list exportable
GET    /api/v1/export/projects/:id                  # project export
GET    /api/v1/export/projects/:id/labels
GET    /api/v1/export/projects/:id/issue-labels
GET    /api/v1/export/projects/:id/milestones
GET    /api/v1/export/projects/:id/issues
GET    /api/v1/export/projects/:id/posts
POST   /api/v1/import                               # import project

# Site data
GET    /api/v1/admin/export                         # full site export
POST   /api/v1/admin/import                         # full site import
POST   /api/v1/admin/mail                           # send mail
GET    /api/v1/admin/diagnostic

# OAuth callbacks
GET    /auth/:provider/callback
GET    /auth/:provider/denied
```

### File and Transport Router

Non-JSON endpoints that serve binary content or handle VCS protocols:

```text
GET    /files/:id                        # file download/inline (legacy path preserved)
GET    /raw/:owner/:project/:rev/*path   # raw file from VCS
GET    /image/:owner/:project/:rev/*path # image from VCS

# Git smart HTTP (protocol-level, not JSON)
GET    /:owner/:project/info/refs
POST   /:owner/:project/git-upload-pack
POST   /:owner/:project/git-receive-pack

# SVN service (backed by SVN executable, not WebDAV/SVNKit)
# Routes are handled through the same VcsBackend interface as Git
```

SVN WebDAV (`PlayDAVConfig`, SVNKit) is dropped in favor of SVN CLI commands
behind the `VcsBackend` interface. If a future need arises for SVN HTTP
transport, it can be added as another adapter behind the same interface.

### SPA Fallback

All non-API, non-file, non-transport paths serve the React SPA shell. The
React router handles URL interpretation for page navigation. Legacy Play
Framework URL patterns (e.g., `/users/loginform`, `/:user/:project/issues`)
become React routes, not backend routes.

## Frontend Architecture

Apply Bulletproof React as the frontend structural baseline. Most code should
live under `frontend/src`, with shared modules flowing into features and
features composed only at the app/route layer.

Recommended `frontend/src` shape:

```text
src/
  app/
    routes/
    app.tsx
    provider.tsx
    router.tsx
  assets/
  components/
    ui/
    layout/
    forms/
  config/
  features/
    auth/
    users/
    organizations/
    projects/
    issues/
    boards/
    labels/
    milestones/
    markdown/
    attachments/
    code/
    pull-requests/
    notifications/
    admin/
    migration/
  hooks/
  lib/
    api-client.ts
    auth.ts
    authorization.ts
    query-client.ts
  stores/
  testing/
    mocks/
    test-utils.tsx
  types/
  utils/
```

Each feature may contain only the folders it needs:

```text
src/features/issues/
  api/
  assets/
  components/
  hooks/
  routes/
  stores/
  types/
  utils/
```

Frontend dependency rules:

- Shared modules (`components`, `hooks`, `lib`, `types`, `utils`, `config`)
  may not import from `features` or `app`.
- Feature modules may import from shared modules and from their own feature
  folder only.
- Feature-to-feature imports are forbidden. Compose features in `app/routes`
  or a page-level route module.
- `app` may import shared modules and feature route/page entry points.
- Prefer direct imports over barrel files to keep Vite tree-shaking predictable.
- Enforce the dependency rules with ESLint `import/no-restricted-paths`.
- Route-level code splitting is allowed; avoid excessive component-level code
  splitting.

Example restricted-import rule:

```js
'import/no-restricted-paths': [
  'error',
  {
    zones: [
      { target: './src/features/issues', from: './src/features', except: ['./issues'] },
      { target: './src/features/boards', from: './src/features', except: ['./boards'] },
      { target: './src/features/code', from: './src/features', except: ['./code'] },
      { target: './src/features/pull-requests', from: './src/features', except: ['./pull-requests'] },
      { target: './src/features', from: './src/app' },
      {
        target: ['./src/components', './src/hooks', './src/lib', './src/types', './src/utils'],
        from: ['./src/features', './src/app'],
      },
    ],
  },
]
```

### App Providers

```tsx
function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <YonaConfigProvider>
            {children}
          </YonaConfigProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### API Layer

Use one preconfigured API client in `src/lib/api-client.ts`. Do not create
ad hoc `fetch` calls inside components.

Every feature API declaration contains:

- request/response types
- runtime validation schema where useful
- fetcher function using the shared API client
- TanStack Query hook wrapping the fetcher
- query key from the feature key factory

Example shape:

```text
src/features/issues/api/
  get-issue.ts
  get-issues.ts
  create-issue.ts
  update-issue.ts
  add-issue-comment.ts
```

### State Management

Classify React state before choosing storage:

- Component state: local tab, dialog, drag, textarea cursor, optimistic upload
  placeholder state. Keep with `useState` or `useReducer`.
- Application state: current user shell, global notifications, theme, modal
  registry. Keep small and colocated; use context or a small store only when
  genuinely shared.
- Server cache state: project lists, issue detail, comments, attachments,
  notifications, markdown reference resolution. Use TanStack Query.
- Form state: issue/post/comment/user settings forms. Use an abstracted form
  component and schema validation.
- URL state: filters, search text, sort order, pagination, selected tabs where
  shareable. Keep in route params/search params.

Do not put server cache state into a global client store.

### Query Key Factories

Use key factories instead of ad hoc arrays:

```ts
export const projectKeys = {
  all: ['projects'] as const,
  list: (filter: ProjectFilter) => [...projectKeys.all, 'list', filter] as const,
  detail: (owner: string, project: string) =>
    [...projectKeys.all, owner, project] as const,
};

export const issueKeys = {
  all: (owner: string, project: string) => ['issues', owner, project] as const,
  list: (owner: string, project: string, filter: IssueFilter) =>
    [...issueKeys.all(owner, project), 'list', filter] as const,
  detail: (owner: string, project: string, number: number) =>
    [...issueKeys.all(owner, project), 'detail', number] as const,
};
```

TanStack Query should own server state: lists, detail records, counts,
notifications, autocomplete results, attachment lists, and markdown reference
resolution. React local state should own only local UI state: selected tab,
open dialog, draft form values, drag state, selection/cursor state, and
optimistic pending uploads.

### Components And Styling

Component rules:

- Colocate feature-specific components, hooks, and utilities inside the feature
  folder.
- Shared UI components go under `src/components/ui` only after repetition is
  proven.
- Avoid large components with nested render functions; extract coherent UI
  units into components.
- Limit prop counts. Prefer composition with `children` or slots for complex
  shared UI.
- Wrap third-party UI primitives behind Yona components before broad use.
- Keep naming consistent and enforce with lint/format tooling.

Styling rules:

- Prefer a zero-runtime styling strategy for dense Yona screens.
- If a headless component library is adopted, wrap it in shared Yona UI
  components and keep domain behavior in feature components.
- Use Storybook or equivalent isolated component previews for shared UI and
  dense editor/diff components.

#### shadcn/ui Decision

Use `shadcn/ui` as the baseline shared UI primitive source for the React
rewrite.

Rationale:

- It is not consumed as a black-box component package; it gives the project
  owned component code. That fits Yona's need to adapt dense legacy workflows.
- It provides accessible, composable defaults for common controls Yona needs:
  dialog, sheet, dropdown, select, command/combobox, tabs, tooltip, popover,
  checkbox, switch, table, pagination, textarea, toast/sonner, calendar/date
  picker, progress, resizable panels, and data table patterns.
- It works well with the Bulletproof React rule that shared UI belongs in
  `src/components`, while domain behavior stays inside feature modules.

Rules:

- Install/copy shadcn components into `src/components/ui`.
- Treat copied shadcn files as Yona-owned code. Review and adapt them instead
  of assuming upstream behavior is fixed.
- Feature modules may import Yona UI primitives from `src/components/ui`, but
  `src/components/ui` must never import from `src/features`.
- Domain-specific components such as `IssueLabelPicker`,
  `PullRequestStateBadge`, `MarkdownEditor`, `DiffViewer`, and
  `AttachmentUploadZone` stay in their feature folders unless they are proven
  cross-feature primitives.
- Wrap complex shadcn primitives behind Yona-specific shared components when
  repeated across features, for example `YonaDialog`, `YonaDataTable`,
  `YonaCombobox`, and `YonaDatePicker`.
- Do not use card-heavy marketing layouts for operational Yona screens. Use
  shadcn primitives to build dense, scannable project management UI.
- Prefer shadcn + Tailwind CSS for the initial styling baseline unless a later
  design-system decision selects another zero-runtime styling strategy.

Recommended initial shadcn components:

```text
button, badge, avatar, breadcrumb, dialog, alert-dialog, sheet, dropdown-menu,
select, command, popover, tabs, tooltip, table, pagination, textarea, input,
checkbox, radio-group, switch, calendar, toast/sonner, progress, skeleton,
scroll-area, resizable
```

### Frontend Security

- Store auth/session tokens in HttpOnly cookies when token-based auth is used.
- Do not store long-lived auth tokens in `localStorage`.
- Keep authorization checks server-authoritative; frontend authorization only
  hides or disables UI affordances.
- Sanitize markdown and user-rendered HTML through the Yona markdown pipeline.
- Avoid `dangerouslySetInnerHTML` except for audited compatibility islands.
- Use PBAC-style policy helpers for resource-specific UI checks, matching
  backend `ResourceRef` and `Operation`.

### Frontend Performance

- Code split at route boundaries.
- Prefetch likely next-route queries with `queryClient.prefetchQuery` for
  issue list/detail, project navigation, and code browser transitions.
- Keep context low-velocity. Do not place high-frequency editor/diff state in
  broad providers.
- Keep image/file previews lazy-loaded where possible.
- Preserve Web Vitals budgets for first route load and project/issue list
  navigation.

### Manual DOM Replacement Priority

Replace these first because they contain stateful DOM behavior:

| Legacy JS | React replacement |
| --- | --- |
| `yobi.CommentForm.js` | `CommentForm`, `useCommentMutation` |
| `yobi.Comment.js` | `CommentList`, `CommentItem`, `useCommentActions` |
| `yobi.CodeCommentBox.js` | `DiffCommentForm` |
| `yobi.CodeCommentBlock.js` | `DiffCommentThread` |
| `yobi.Files.js` | `attachmentService`, `useAttachmentUploader` |
| `yobi.Attachments.js` | `AttachmentUploadZone`, `useMarkdownAttachments` |
| `yobi.Markdown.js` | `MarkdownEditor`, `MarkdownPreview`, `YonaMarkdown` |
| `yobi.Mention.js` | `MentionAutocomplete` |
| `yobi.ui.Select2.js` | typed combobox/select components |
| `yobi.ui.Calendar.js` | date picker component |
| `yobi.ui.Dialog.js` | modal/dialog component |
| `yobi.issue.List.js` | `IssueListPage` state and query hooks |
| `yobi.issue.Write.js` | `IssueEditorPage` |
| `yobi.issue.View.js` | `IssueDetailPage` |
| `yobi.board.*.js` | board list/detail/editor pages |
| `yobi.code.*.js` | code browser and diff pages |
| `yobi.project.*.js` | project pages and settings forms |

### Page Routes

React router should mirror product concepts rather than Scala template
locations:

```text
/
/login
/signup
/users/:loginId
/user/settings
/projects
/organizations
/organizations/:orgName
/:owner/:project
/:owner/:project/issues
/:owner/:project/issues/new
/:owner/:project/issue/:number
/:owner/:project/posts
/:owner/:project/post/:number
/:owner/:project/code/:branch?/*
/:owner/:project/commits/:branch?/*
/:owner/:project/pullRequests
/:owner/:project/pullRequest/:number
/:owner/:project/milestones
/:owner/:project/settings
/sites/*
```

Legacy URL aliases can redirect or route to the same page components.

## Phase Plan

### Phase 0: Compatibility Inventory

Deliverables:

- Route inventory generated from `yona-original/conf/routes`, mapped to new
  REST API design.
- Final schema dump after applying evolutions 1..32.
- Secret/config inventory from `application.conf` (identify all secrets to
  migrate to DB, all non-secret settings for TOML config).
- Golden API fixtures for key endpoints and issue/board comment mutations.
- Markdown parity fixture set.
- Access-control test matrix from `docs/technical/access-control.md` and
  `utils.AccessControl`.

Exit criteria:

- Every route is classified as REST API, file/transport route, Git/SVN
  transport route, or SPA fallback route.
- Every table is assigned to an aggregate.
- Every secret key in `application.conf` is identified and mapped to the
  `secret` DB table.
- Non-secret config keys are mapped to `config.toml` structure.

### Phase 1: Rust Baseline

Deliverables:

- Cargo workspace with `resolver = "2"`, shared `[workspace.dependencies]`,
  and 6 initial crates (yona-server, yona-web, yona-domain, yona-entity,
  yona-infra, yona-shared).
- TOML config loading (`config.toml`) with environment variable overrides.
- Secret table in database; init detection based on DB state, not config file.
- Axum server booting with typed config.
- SeaORM connection configuration for MariaDB, MySQL, PostgreSQL, and SQLite.
- SQLite database target for the H2 replacement distribution and default fast
  test backend.
- Generated SeaORM entities.
- Cross-target schema creation/migration output for MariaDB, MySQL,
  PostgreSQL, and SQLite.
- Cache trait (`YonaCache`) with moka implementation.
- Session trait (`SessionStore`) with cookie-based implementation.
- Auth provider trait with password login implementation.
- Session/current-user extraction.
- Access-control module with tests.
- `RepositoryService`, `VcsBackend`, and `CommandRunner` interfaces with Git
  native executable adapter skeleton and SVN CLI adapter skeleton.
- Local attachment storage preserving `YONA_DATA/uploads`.
- Attachment upload/list/download/delete endpoints with TTL-based temporary
  file expiry.
- Default Rust test path using SQLite in-memory for repository-backed unit and
  integration tests.
- Testcontainers DB matrix skeleton for MariaDB, MySQL, and PostgreSQL, scoped
  to domain persistence contracts.

Exit criteria:

- `cargo metadata` and `cargo check --workspace` prove the intended crate graph:
  `yona-domain` has no Axum/SeaORM/native-command/cache/session dependencies,
  and `yona-web` has no direct SeaORM/native-command dependencies.
- Server boots with `config.toml`, connects to DB, loads secrets from DB, and
  confirms initialization state without checking config file contents.
- Can connect to an existing MariaDB Yona database without schema mutation.
- Can create and migrate equivalent empty schemas for MariaDB, MySQL,
  PostgreSQL, and SQLite.
- `cargo test --workspace` uses pure unit tests and SQLite in-memory tests
  without requiring Docker.
- The DB matrix runs the same domain persistence contract suite against
  Testcontainers MariaDB, MySQL, and PostgreSQL.
- Can upload and download an attachment with TTL-based temporary file handling.
- Access-control tests pass for public/private/protected projects, site
  manager, project member, organization admin/member, author, assignee, sharer,
  anonymous, and guest.

### Phase 2: React Shell and Core APIs

Deliverables:

- React app shell with TanStack Query provider.
- Bulletproof React folder structure under `frontend/src`.
- ESLint restricted-import rules enforcing shared -> features -> app flow.
- Initial shadcn/ui primitives copied into `src/components/ui` and adapted as
  Yona-owned shared components.
- Login/signup/session.
- Dashboard page, index page, error pages.
- Project/organization/user list and detail pages.
- Favorites for projects, organizations, and issues.
- Shared layout, user menu, pagination, dialogs, forms.
- Typed API client targeting `/api/v1` REST endpoints.

Exit criteria:

- Legacy page URL patterns load the React shell via SPA fallback.
- Core pages fetch data through clean REST APIs.
- No jQuery is required for migrated pages.
- Feature modules do not import from other feature modules.
- Components in `src/components/ui` do not import from `src/features`.

### Phase 3: Issues, Boards, Markdown, Attachments

Deliverables:

- Issue list/detail/create/edit.
- Board list/detail/create/edit.
- Comments, subtasks, labels, milestones, assignees, sharers.
- `MarkdownEditor`, `YonaMarkdown`, Yona remark/rehype plugins.
- Attachment upload/list/delete integrated into markdown editor.

Exit criteria:

- Representative issue and board workflows match legacy behavior.
- Markdown parity fixtures pass.
- Temporary attachment movement works for issue, issue comment, post, and post
  comment flows.

### Phase 4: Code, Git/SVN, Pull Requests, Review

Deliverables:

- Git smart HTTP service backed by the Git native executable adapter.
- SVN support through the SVN native executable adapter behind the same
  `VcsBackend` interface (no WebDAV/SVNKit dependency).
- Code browser, commit history, raw file/image routes.
- Pull request list/detail/create/merge/close/reopen.
- Diff viewer and review comments.
- Project statistics.

Exit criteria:

- Existing Git clone/fetch/push paths work for authorized users.
- SVN operations work through the CLI adapter.
- Pull request merge and review workflows pass integration tests.

### Phase 5: Notifications, Admin, Migration, Mailbox, Search

Deliverables:

- Notification event creation and listing.
- Notification mail worker.
- Watch/unwatch.
- Admin site pages.
- Migration export/import compatibility (generic serialization pipeline
  replacing 48 individual DataExchanger classes).
- Java 8 JDBC H2-to-SQLite migration CLI for existing embedded H2 users.
- Mailbox ingestion (IMAP with IDLE/polling).
- Full-text search integration using database-native FTS (PostgreSQL tsvector,
  MySQL FULLTEXT, SQLite FTS5) as the default backend.
- OAuth providers (GitHub, Google) loaded from secret table.
- LDAP authentication loaded from secret table.

Exit criteria:

- Notification events are created for the same domain transitions as legacy
  Yona.
- Admin-only pages enforce site-manager permissions.
- Existing migration export consumers can read the new output.
- H2-to-SQLite migration CLI can migrate and verify fixture H2 databases
  without mutating the source file.
- Search returns ranked results across issues, posts, users, projects,
  milestones, and comments, filtered by access control.
- FTS DDL is tested in the DB matrix for all four database targets.

### Phase 6: Compatibility Burn-down

Deliverables:

- Feature parity report.
- Performance and security review.
- Operational migration guide.
- H2-to-SQLite migration guide for legacy embedded users.
- Config migration guide (application.conf -> config.toml + secret table).

Exit criteria:

- Production smoke tests pass on a copy of real Yona data.
- The old Play application can be replaced by the Rust/React server for the
  agreed feature scope.

## Verification Matrix

| Area | Required proof |
| --- | --- |
| Workspace | `cargo metadata` or a dependency graph check proves the allowed dependency direction and forbidden dependencies. |
| Config | Server boots from `config.toml`, loads secrets from DB, detects init state from DB. K8s ConfigMap mount (read-only) does not trigger init. |
| Secrets | Secret table contains non-default `application_secret` after init. Config file has zero secrets. |
| Schema | Diff final legacy schema against SeaORM entity metadata and migration output for MariaDB, MySQL, PostgreSQL, and SQLite. |
| DB matrix | Testcontainers-backed domain persistence contract tests pass on MariaDB, MySQL, and PostgreSQL; default tests pass on SQLite in-memory without Docker. |
| H2 migration | Java 8 JDBC H2-to-SQLite tool compiles, migrates fixture H2 databases, preserves row counts/IDs/sequences, verifies referential integrity, and leaves the source DB untouched. |
| Access control | Table-driven tests for every `Operation` and major `ResourceType`. |
| Routes | REST API design covers all legacy functionality. SPA fallback serves React shell for all non-API/non-file paths. |
| Cache | Domain services use `Arc<dyn YonaCache>`. Moka and Redis implementations both pass the cache contract test suite. |
| Session | Domain services use `Arc<dyn SessionStore>`. Cookie and Redis implementations both pass the session contract test suite. |
| Auth providers | Password, OAuth (GitHub/Google), and LDAP authentication all pass through `AuthProvider` trait. |
| Attachments | Multipart upload, duplicate upload, download inline, download attachment, ETag, range request, TTL-based temp expiry, delete unreferenced, preserve referenced blob. |
| Markdown | Snapshot tests for issue/user/project/commit/attachment links, task lists, tables, unsafe HTML, external links, README relative links. |
| Search | FTS queries return ranked results across all searchable entities. Dialect-specific DDL tested in DB matrix for PostgreSQL, MySQL, SQLite, and MariaDB. |
| Issues | Create, edit, close/reopen, move project, labels, milestone, assignee, sharer, subtask, comments, votes, history, notifications. |
| Boards | Create, edit, delete, comments, labels, attachments, notifications. |
| Project | Create, settings, members, transfer, webhooks, watch, VCS change. |
| VCS | Git clone/fetch/push, SVN CLI operations, code browser, raw file/image, history, compare, plus tests proving feature code depends on `VcsBackend` rather than concrete Git/SVN adapters. |
| Pull request | Create, diff, review comment, close/open, merge success, merge conflict. |
| Favorites | Toggle and list for projects, organizations, and issues. |
| Statistics | Project statistics page with commit/contributor data from VCS backend. |
| React UI | Playwright coverage for core flows and viewport checks for dense pages. |
| React architecture | ESLint restricted-import rules enforce shared -> features -> app flow, no cross-feature imports, and no feature imports from shared UI. |
| React API layer | Each feature API declaration has request/response types, validation where useful, a fetcher using the shared API client, and a TanStack Query hook. |
| shadcn/ui | Copied shadcn primitives live under `src/components/ui`, are treated as Yona-owned code, and have isolated component tests or stories for shared variants. |
| Query state | Mutation invalidation tests for issue/comment/project/notification updates. |
| Frontend state | Tests or review checklist prove server cache uses TanStack Query, URL state uses route/search params, form state uses the form abstraction, and local UI state is not globalized unnecessarily. |
| Security | XSS markdown tests, auth bypass tests, path traversal tests for uploads/repos, CSRF/session policy review. |

## Product Decision Gates

Default recommendation is to preserve behavior unless a decision is made
explicitly:

1. Database support: runtime targets are MariaDB, MySQL, PostgreSQL, and
   SQLite. MariaDB remains the primary existing-server compatibility target,
   MySQL and PostgreSQL are first-class server targets, and SQLite is the
   portable/local target.
2. H2 embedded distribution: replace with SQLite. H2 is supported only as a
   legacy input to the Java 8 JDBC H2-to-SQLite migration tool.
3. Configuration: replace `application.conf` (HOCON) with `config.toml`.
   Secrets are stored in a database table, not the config file. Init detection
   is database-based, not config-file-based.
4. API design: design clean RESTful APIs under `/api/v1`. Do not preserve
   legacy `/-_-api/v1` URL patterns. Legacy URL paths serve as SPA routing
   only.
5. Authentication: support password, OAuth (GitHub, Google), and LDAP behind
   a common `AuthProvider` trait. Secrets loaded from database.
6. SVN support: preserve through a modular VCS backend using native CLI
   commands. No SVNKit or WebDAV dependency.
7. Search: default to database-native FTS (PostgreSQL tsvector, MySQL FULLTEXT,
   SQLite FTS5). Tantivy or Meilisearch available as optional backends.
8. Cache: default to moka (single-process). Redis available for
   multi-instance through `YonaCache` trait.
9. Session: default to signed HttpOnly cookies. Redis available for
   multi-instance through `SessionStore` trait.
10. Server markdown endpoint: replaced by client-side `react-markdown` with
   server-side reference resolver API.

## First Implementation Slice

The safest first slice is:

```text
1. Create the Cargo workspace with 6 initial crates (yona-server, yona-web,
   yona-domain, yona-entity, yona-infra, yona-shared), shared workspace
   dependencies, and dependency-boundary checks.
2. Implement TOML config loading with environment variable overrides.
3. Generate final schema and SeaORM entities. Add secret table.
4. Build Axum AppState, config, cache trait (moka), session trait (cookie),
   auth provider trait (password), and session/current-user extraction.
5. Implement DB-based init detection (secret table + admin user check).
6. Add MariaDB, MySQL, PostgreSQL, and SQLite database targets, with SQLite
   replacing H2 embedded.
7. Port ResourceRef and AccessControl.
8. Define RepositoryService, VcsBackend, and CommandRunner; add Git CLI adapter
   skeleton and SVN CLI adapter skeleton behind the same interface.
9. Add SQLite in-memory default tests and Testcontainers DB matrix scaffolding
   for MariaDB, MySQL, and PostgreSQL domain persistence contracts.
10. Port Attachment storage with TTL-based temporary file expiry.
11. Build React shell plus AttachmentUploadZone and MarkdownEditor skeleton.
12. Add markdown reference resolver API and plugin fixture tests.
13. Scaffold the separate Java 8 JDBC H2-to-SQLite migration tool and fixture
    verification path.
```

This slice validates the most cross-cutting contracts: TOML config, DB secrets,
init detection, DB compatibility, filesystem compatibility, cache/session
trait boundaries, auth/resource permissions, TTL-based attachment handling,
React component replacement, TanStack Query service state, and markdown plugin
direction.

## Completion Checklist For This SPEC

- The current repository has been decomposed by backend route/domain modules.
- Java models and evolutions have been mapped to SeaORM aggregate boundaries.
- Scala templates and legacy browser modules have been mapped to React pages,
  components, hooks, and query boundaries.
- Markdown behavior has a React markdown plugin strategy, including Yona issue
  links and upload file links.
- Template engine and manual DOM behavior have explicit React replacement
  rules.
- Java/Scala-to-Rust/TypeScript equivalence rules are included.
- H2 embedded is replaced by SQLite.
- Runtime database support covers MariaDB, MySQL, PostgreSQL, and SQLite.
- Existing H2 users have a separate Java 8 JDBC H2-to-SQLite migration tool
  specification.
- Configuration uses TOML with K8s ConfigMap compatibility. Secrets are stored
  in a database table, not the config file. Init detection is database-based.
- Cache is abstracted behind `YonaCache` trait with moka (default) and Redis
  (multi-instance) implementations.
- Session is abstracted behind `SessionStore` trait with cookie (default) and
  Redis (multi-instance) implementations.
- Authentication supports password, OAuth (GitHub, Google), and LDAP behind a
  common `AuthProvider` trait.
- Full-text search uses database-native FTS (PostgreSQL tsvector, MySQL
  FULLTEXT, SQLite FTS5) as the default, with Tantivy and Meilisearch as
  optional backends.
- Legacy Play Framework URLs are replaced by clean RESTful APIs under `/api/v1`.
  Legacy URL paths serve as SPA routing only.
- SVN uses native CLI commands behind the `VcsBackend` interface. No SVNKit or
  WebDAV dependency.
- Temporary attachments use TTL-based expiry instead of polling scheduler.
- Missing features are covered: statistics, favorites (project/organization/
  issue), global labels, error pages, dashboard, LDAP authentication.
- Background workers are mapped from Akka actors with explicit naming.
- Data export uses a generic serialization pipeline instead of 48 individual
  DataExchanger classes.
- Test strategy separates fast SQLite in-memory default tests from
  Testcontainers DB-matrix tests for MariaDB, MySQL, and PostgreSQL domain
  persistence contracts.
- Git and SVN are specified as interface-based VCS backends, with native
  executable adapters preferred for both.
- Rust backend crates start with 6 core crates and evolve incrementally.
- Bulletproof Rust Web rules are applied as backend crate, handler,
  config/state/error, observability, security, and testing constraints.
- Bulletproof React rules are applied as frontend feature-folder, import,
  API, state, component, security, performance, and testing constraints.
- shadcn/ui is selected as the shared React UI primitive source and treated as
  Yona-owned component code under `src/components/ui`.
- The SPEC includes phases, pseudocode use cases, API boundaries, and
  verification gates.
