# Yoram

Yoram is an independent Rust + React port of legacy
[Yona](https://github.com/yona-projects/yona). It aims to preserve Yona's
functionality and UX at **100% legacy-product parity**: an administrator must be
able to replace a legacy Yona deployment without users noticing route, copy,
layout, workflow, or other user-visible behavior differences. This workspace is
not parity-complete yet.

Yoram is developed from Yona under the Apache License, Version 2.0. The
upstream copyright and attribution are preserved in `NOTICE` and `LICENSE`.

Yoram is not affiliated with NAVER, NAVER LABS, or the Yona project. The `Yona`
name remains in compatibility settings, legacy route references, test fixtures,
and attribution text where that is required to describe the upstream project or
preserve migration behavior.

Current canonical implementation lives at the repo root. This workspace includes
`frontend/`, `crates/*`, a REST JSON API, and a TanStack Query based React
client.

## Canonical Order

1. `yona-original/`: legacy Yona reference source for functional and UX parity.
   It is reference-only and must not provide public Yoram release assets.
2. Repo root: current canonical implementation baseline.
3. `reference/spikes/**`: historical spike archive

`reference/mixed-code/**`, if present in a working tree, is obsolete pre-Rust
Bun/TanStack/tRPC/Drizzle code. It is not legacy Yona reference material and
must not be used as parity evidence.

## Workspace Landmarks

- `frontend/`: REST API client, TanStack Query state, and canonical React SPA
  ownership
- `DESIGN.md`: legacy Yona UI baseline and component design harness contract
- `crates/server/`: runtime bootstrap, HTTP/REST, asset delivery,
  session/auth bootstrap
- `crates/domain/`: domain behavior, ACL, invariant
- `crates/persistence/`: DB access and repositories
- `crates/migration/`: schema, seed, migration
- `docs/agents/`: execution mirror docs
- `docs/provenance/`: legacy source, gap, deviation, deferred scope evidence

## Working Rules

- canonical execution rules는 `AGENTS.md`와 `SPEC.md`에 있다.
- 구현 전에는 `yona-original/`에서 대응 legacy route/test/model을 먼저 식별한다.
- frontend component design 또는 화면 styling 작업 전에는 `DESIGN.md`와 legacy LESS/view 근거를 확인한다.
- `reference/mixed-code/**`는 legacy reference가 아니므로 구현 근거나 parity evidence로 읽지 않는다.
- 진행 중인 누락은 `deferred`, `gap`, `deviation`으로 기록한다. 이는 최종
  제외 승인이 아니며, final closure에서는 user-visible `deferred`/`gap`과
  일반적인 observable divergence가 0이어야 한다.

## Current Parity Closure Contract

- `Phase -1 refactor temp development`는 기존 임시 구현을 `/api/v1` REST JSON + TanStack Query + typed frontend API client 기준으로 재기준화했다.
- runtime ConnectRPC registration과 frontend ConnectRPC client/dependency는 제거되었다. `proto/`는 historical schema snapshot으로만 남는다.
- First-priority/second-priority labels define implementation order only; every
  legacy user-visible feature remains final scope.
- Current implementation and provenance documents are evidence snapshots, not a
  100% parity or release-completion claim. `deferred` is an interim status and
  must reach zero at final closure.
- Ordinary `accepted observable divergence` is not a final disposition. A
  remaining difference needs evidence that it is implementation-only or a
  reproducible legacy bug.
- JaCoCo is discovery evidence only: no coverage percentage target or KPI.
  Existing validation gates remain the validation surface; no new validation or
  reconciliation framework is introduced.
- This repository is not a release repository. No RC/public release is made
  here; after human acceptance of 100% parity, the source and required
  documentation move to a new canonical repository for the first release.

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
