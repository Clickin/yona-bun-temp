# Wave 2B Organization Follow-up

Status: historical; Wave 2B follow-up closed by later organization issue/board/PR list slices
Date: 2026-04-11

## Completed in Wave 2B

- organization home CTA matrix 복원
- organization settings 하위 `members` / `deleteForm` 실구현
- org member add/edit/delete 복원
- org enroll/cancel, org leave, org delete guard 복원
- direct-entry auth failure semantics 복원
  - anonymous -> login redirect with return path
  - authenticated forbidden -> forbidden shell
  - not found -> not-found shell

## Historical Follow-up Items

### Closed

1. organization issue listing body parity
2. organization board listing body parity
3. organization pull-request listing body parity

이 세 항목은 이후 구현으로 닫혔다. 현재 canonical 상태는 `docs/provenance/phase-0b/organization.md`, `organization_issue_contract`, `organization_board_contract`, `pull_request_read_contract`, and the corresponding React route parity tests에 있다.

### Deferred to later packet

1. project admin/watchers/webhooks/transfer/change VCS/statistics/delete
2. Phase 2 issue lifecycle entry

이 항목들은 Wave 2B 범위 밖이었고, 이후 project/issue provenance에서 구현 또는 migrator/deferred scope로 재분류되었다.

## Canonical Links

- root deferred scope snapshot: [`README.md`](/G:/programming/yona/README.md)
- provenance row: [`docs/provenance/core-parity-audit.md`](/G:/programming/yona/docs/provenance/core-parity-audit.md)
- organization provenance detail: [`docs/provenance/phase-0b/organization.md`](/G:/programming/yona/docs/provenance/phase-0b/organization.md)
