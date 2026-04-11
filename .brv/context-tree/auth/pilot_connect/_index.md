---
children_hash: 4c32a0a96b67b05bffea8419fa3959b32063117e57ca3cdd899f7294998912e6
compression_ratio: 0.547945205479452
condensation_order: 1
covers: [context.md, go_connect_pilot_hardening.md]
covers_token_total: 803
summary_level: d1
token_count: 440
type: summary
---
# pilot_connect Structural Summary

## Domain Overview
- **pilot_connect/context.md** frames the topic as the pilot Connect entry point adjustments: aligning the router base path, establishing anonymous session bootstrapping, and front-end CSRF initialization before proxying commands through the Connect RPC layer. Key drill-downs: `auth/account_ui_wave2/wave_2_account_ui_flows.md`.

## Go Connect Pilot Hardening
- **go_connect_pilot_hardening.md**
  - **Task & Changes**: Re-align RPC endpoints to runtime `YONA_BASE_PATH`, relocate anonymous session bootstrap to `YONA_BASE_PATH/api/auth/session`, issue `yona_session`/`yona_csrf_token` cookies plus `X-CSRF-Token`, and force frontend mutations to fetch CSRF via `readPilotSessionBootstrap`.
  - **Flow**: Normalize runtime base path → mount `/rpc` service handler + `/api/auth/session` bootstrap → create anonymous sessions with cookies/CSRF header → frontend validates tokens before hitting Connect RPCs.
  - **Structure and Dependencies**: `NewRouter` handles BasePath normalization, mounts the pilot handler and bootstrap endpoint; relies on `internal/auth/session.go` session manager, Connect interceptors, and `sessionRoutePayloadSchema` on the frontend.
  - **Highlights**: Eliminates hardcoded CSRF values, aligns RPC/bootstrap paths with runtime base, and guarantees fresh CSRF acquisition before pilot issue mutations.
  - **Facts**:
    - `pilot_rpc_mount`: Connect RPC handlers now mount under `YONA_BASE_PATH/rpc`.
    - `pilot_session_bootstrap`: Anonymous bootstrap at `YONA_BASE_PATH/api/auth/session` issues the CSRF cookies/header alongside an empty payload.
    - `pilot_frontend_bootstrap`: `readPilotSessionBootstrap` enforces CSRF token presence before allowing pilot issue mutations.