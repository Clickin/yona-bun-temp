2026-03-02: Category-based task delegation to Sisyphus-Junior is unreliable in this session (frequent 600s poll timeout). Use direct edits/tools as primary execution path.
2026-03-02: After moving app under apps/web, imports targeting root-level drizzle schema required updated relative paths and root-level drizzle-orm dependency to keep typecheck green.
2026-03-02: Workspace dependency wiring for `@yona/*` is stable with placeholder package manifests for api/infra and explicit `ssr.noExternal` in apps/web Vite config.
2026-03-02: For phased extraction, moving git implementation to `packages/infra` with compatibility shims in `apps/web/src/lib/server/git/*.ts` keeps existing spec paths green while route handlers switch to `@yona/infra`.
2026-03-02: Thin SvelteKit API forwarders need to tolerate partial test events; centralizing fallback request construction in `$lib/server/hono/forward-to-api.ts` preserves route-level tests while keeping adapters minimal.
2026-03-02: Hono wildcard param (`*`) can be empty for smart-http paths in some forwarded contexts; deriving gitPath from `c.req.path` as a fallback avoids false 404 responses.
2026-03-02: Session runtime now uses in-memory storage keyed by token hash with lazy expiry cleanup, reverse user index, bounded-cap eviction, and explicit test reset hook.
2026-03-02: Session integration contract coverage (create -> cookie -> handleSession -> /api/auth/session) catches expiry and restart behavior regressions early.
