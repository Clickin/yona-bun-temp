# Phase 0B Provenance Home

> **Status: historical provenance.** This directory preserves early porting
> evidence, including the stale Bun-era PR #3 review history. PR #3 is not a
> Rust implementation candidate and must not be merged or restored; its
> historical record remains traceable in GitHub.

이 디렉터리는 legacy intent와 초기 parity slice 근거를 보존하는 provenance home이다.

## 현재 해석 규칙

- canonical execution rules는 `AGENTS.md`와 `SPEC.md`에 있다.
- canonical implementation path는 [repo root](/G:/programming/yona)다.
- 이 디렉터리에서 언급하는 root mixed-code 경로는 obsolete pre-Rust residual path이며 parity reference가 아니다.
- legacy source와 Rust target layer를 함께 남기는 것이 이 디렉터리의 목적이다.

## Contents

- [`../core-parity-audit.md`](/G:/programming/yona/docs/provenance/core-parity-audit.md): current gap/deviation audit
- [`legacy-test-inventory.md`](/G:/programming/yona/docs/provenance/phase-0b/legacy-test-inventory.md): capability별 legacy source와 Rust target layer inventory
- [`organization.md`](/G:/programming/yona/docs/provenance/phase-0b/organization.md): organization create/read/update provenance
- [`user-workspace.md`](/G:/programming/yona/docs/provenance/phase-0b/user-workspace.md): user workspace and public profile provenance
- [`project.md`](/G:/programming/yona/docs/provenance/phase-0b/project.md): project, enrollment, workspace provenance
- [`issue.md`](/G:/programming/yona/docs/provenance/phase-0b/issue.md): bounded issue authorization exemplar
- [`code-browser.md`](/G:/programming/yona/docs/provenance/phase-0b/code-browser.md): read-only Git code browser provenance
- [`pull-request-review.md`](/G:/programming/yona/docs/provenance/phase-0b/pull-request-review.md): bounded PR/review exemplar
- [`search.md`](/G:/programming/yona/docs/provenance/phase-0b/search.md): bounded internal search exemplar
- [`fixture-strategy.md`](/G:/programming/yona/docs/provenance/phase-0b/fixture-strategy.md): legacy fixture naming and modern fixture policy

## Batch Boundary

- 이 디렉터리는 full parity claim이 아니라 bounded provenance evidence다.
- full product parity는 `repo root` 기준의 후속 vertical slice 구현이 완료되어야 한다.
- 여기의 미구현 항목은 `gap` 또는 `deferred`로 읽어야 하며, root canonical 문서와 plan docs의 follow-up item과 대응되어야 한다.
- 이 historical evidence의 `deferred`/`gap`/`deviation` 분류는 최종 scope
  제외나 일반적인 observable divergence 승인으로 읽지 않는다.
