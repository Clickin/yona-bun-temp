---
children_hash: a63462baae581cb011a2934da5f253b56e36ee1d78c5827fe2dcde0374956244
compression_ratio: 0.3337612323491656
condensation_order: 1
covers: [wave_0_canonical_routing_update.md, wave_0_route_foundation.md]
covers_token_total: 1558
summary_level: d1
token_count: 520
type: summary
---
## Wave 0 Routing Summary

- **Canonical route table (wave_0_canonical_routing_update.md)**  
  - Yona-rust frontend now owns a single canonical route table that remaps legacy home, auth, public directory, search, and deep project URLs to their designated handlers, preserving pagination and workspace shell behavior.
  - PilotService exposes `/orgs` additively so legacy directory navigation continues to resolve organization listings through the established directory data flow.
  - Flow: incoming requests hit the canonical router, reserved prefixes map to legacy handlers, and PilotService RPC registration delivers the `/orgs` organization listing response.

- **Route foundation and runtime (wave_0_route_foundation.md)**  
  - Frontend route utilities (route-table.ts) define AppRoute enums, reserved prefixes, canonical href builders, and project route matching; AuthWorkspaceShell renders route-specific UI (login/register/home/directory/placeholder views) with redirect, pagination, CSRF helpers.
  - PilotService gRPC surface (prototype in `yona/pilot/v1/pilot.proto`) covers session/auth, workspace overview, organization/project CRUD, issue operations, listing, and enrollment/favorite toggles, backed by persistence normalization.
  - Server router (Axum + ConnectRPC) wires API/session bootstrap, asset handlers (fs/embedded/none modes), base-path-aware index fallbacks, and serialization of BrowserRuntimeConfig.
  - Persistence repository centralizes AppUser/Organization/Project/Issue normalization, authorization scope checks, membership/enrollment/favorite tracking, and default landing metadata refresh.

### Structural Relationships
- Canonical routing utilities (route-table) feed into the AuthWorkspaceShell render logic, ensuring legacy navigation (home/auth/directory/project) flows through consistent UI and redirect helpers.
- PilotService RPCs and persistence repositories jointly power `/orgs` listings, project/org lifecycle controls, and workspace/session state, enabling the canonical router to surface legacy pathways without branching removal.