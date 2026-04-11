---
children_hash: c413f41ac8a860f034e5ade6a6ae2f484e7be79b53792a8276095660662bb046
compression_ratio: 0.32103939647946356
condensation_order: 1
covers: [context.md, pilot_rust_baseline.md]
covers_token_total: 1193
summary_level: d1
token_count: 383
type: summary
---
### pilot_rust_baseline (context.md / pilot_rust_baseline.md)
- **Release scope:** Documents the R0-3 Rust org/project baseline, tying PilotService gRPC, server/runtime helpers, persistence repo, frontend App.tsx workspace shell actions, and provenance mapping from legacy tests to current Rust targets.
- **API and runtime foundations:** `yona-rust/proto/yona/pilot/v1/pilot.proto` defines Connect RPC surface (workspace overview, org/project CRUD, enrollment, favorites/recents, issue flows); `yona-rust/crates/server/src/lib.rs` wires persistence, runtime_config, session/CSRF headers, routers, and helpers that translate persistence models into workspace DTOs.
- **Persistence responsibilities:** `yona-rust/crates/persistence/src/repo.rs` normalizes identities, handles CRUD for users/orgs/projects, memberships, enrollment requests, favorites, recents, and default landing paths, plus user/landing repository helpers.
- **Frontend orchestration:** `yona-rust/frontend/src/App.tsx` maintains workspace state (route, overview data, session/CSRF, loading/errors) and exposes actions for create, enroll/cancel, favorite toggles, and project detail flows before reloading the overview.
- **Provenance tracing:** `docs/provenance/phase-0b/project.md` lands legacy Java project/workspace tests into Rust targets, captures baseline semantics (visibility, enrollment, workspace favorites/recents/default landing), and enumerates remaining gaps (delete/transfer, enrollment management, settings UX, member/watchers/webhooks/statistics).