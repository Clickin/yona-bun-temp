# Wave 2B Organization Follow-up

Status: active follow-up after Wave 2B
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

## Remaining Follow-up Items

### Active gap

1. organization issue listing body parity
2. organization board listing body parity
3. organization pull-request listing body parity

이 세 항목은 deep-link route는 유지되지만, 현재는 placeholder body이므로 active `gap`으로 남긴다.

### Deferred to later packet

1. project admin/watchers/webhooks/transfer/change VCS/statistics/delete
2. Phase 2 issue lifecycle entry

이 항목들은 Wave 2B 범위 밖이므로 `deferred`로 유지한다.

## Canonical Links

- root deferred scope snapshot: [`README.md`](/G:/programming/yona/README.md)
- provenance row: [`docs/provenance/core-parity-audit.md`](/G:/programming/yona/docs/provenance/core-parity-audit.md)
- organization provenance detail: [`docs/provenance/phase-0b/organization.md`](/G:/programming/yona/docs/provenance/phase-0b/organization.md)
