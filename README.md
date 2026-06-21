# Yona

Yona는 legacy Yona의 기능과 UX parity를 목표로 재구성 중인 워크스페이스다.

현재 canonical 구현 경로는 repo root다. 이 workspace가 `frontend/`, `crates/*`, REST JSON API, TanStack Query 기반 React client를 포함하는 Rust + React 기준선이다.

## Canonical Order

1. [`yona-original/`](/G:/programming/yona/yona-original): 기능/UX parity의 1차 source of truth
2. [repo root](/G:/programming/yona): current canonical implementation baseline
3. `reference/mixed-code/**`: reference-only migration material
4. `reference/spikes/**`: historical spike archive

## Workspace Landmarks

- [`frontend/`](/G:/programming/yona/frontend): REST API client, TanStack Query state, and canonical React SPA ownership
- [`DESIGN.md`](/G:/programming/yona/DESIGN.md): legacy Yona UI baseline and component design harness contract
- [`proto/`](/G:/programming/yona/proto): REST pivot 이전 message schema snapshot. runtime RPC surface나 새 application contract의 source가 아니다.
- [`crates/server/`](/G:/programming/yona/crates/server): runtime bootstrap, HTTP/REST, asset delivery, session/auth bootstrap
- [`crates/domain/`](/G:/programming/yona/crates/domain): domain behavior, ACL, invariant
- [`crates/persistence/`](/G:/programming/yona/crates/persistence): DB access and repositories
- [`crates/migration/`](/G:/programming/yona/crates/migration): schema, seed, migration
- [`docs/agents/`](/G:/programming/yona/docs/agents): 실행 mirror 문서
- [`docs/provenance/`](/G:/programming/yona/docs/provenance): legacy source, gap, deviation, deferred scope 근거

## Working Rules

- canonical execution rules는 [`AGENTS.md`](/G:/programming/yona/AGENTS.md)와 [`SPEC.md`](/G:/programming/yona/SPEC.md)에 있다.
- 구현 전에는 `yona-original/`에서 대응 legacy route/test/model을 먼저 식별한다.
- frontend component design 또는 화면 styling 작업 전에는 `DESIGN.md`와 legacy LESS/view 근거를 확인한다.
- `reference/mixed-code/**`는 reference-only migration material로 읽고, 새 canonical ownership은 repo root에 둔다.
- 일부 기능 누락은 허용되지만 반드시 `deferred`, `gap`, `deviation`으로 기록한다.

## Current Deferred Scope Snapshot

- `Phase -1 refactor temp development`는 기존 임시 구현을 `/api/v1` REST JSON + TanStack Query + typed frontend API client 기준으로 재기준화했다.
- runtime ConnectRPC registration과 frontend ConnectRPC client/dependency는 제거되었다. `proto/`는 historical schema snapshot으로만 남는다.
- Current first-priority app-runtime parity is tracked by [`docs/provenance/first-priority-completion-review.md`](/G:/programming/yona/docs/provenance/first-priority-completion-review.md) and [`docs/provenance/core-parity-audit.md`](/G:/programming/yona/docs/provenance/core-parity-audit.md). The old Phase -1 active-gap list has been closed or reclassified into narrower provenance files.
- Remaining non-first-priority or hardening boundaries are explicit deferred/follow-up scope: broader external-directory/OAuth edge behavior beyond the bounded LDAP and configured GitHub/Google OAuth runtime slices, dynamic i18n switching, optional webhook signature compatibility if external evidence requires it, and production migration/import hardening.

## Live-reload Dev Startup

- prerequisites:
  - `cargo install cargo-watch`
  - `pnpm install` from repo root (`frontend/` is included through the root workspace)
- default local dev from repo root:
  - `pnpm dev`
- default manual test entrypoints:
  - frontend: `http://127.0.0.1:3101/`
  - backend session bootstrap: `http://127.0.0.1:8089/api/auth/session`
- optional mounted-base-path smoke run:
  - `pnpm dev:mounted`
  - entrypoints: `http://127.0.0.1:3101/yona/`, `http://127.0.0.1:8089/yona/api/auth/session`
- legacy Yona supported configurable context roots via `application.context`; mounted mode stays available for parity smoke coverage, but root mount is the default local dev path.
- dev startup persists data in `.yona-data/dev.db` and only seeds pilot data on the first boot.
