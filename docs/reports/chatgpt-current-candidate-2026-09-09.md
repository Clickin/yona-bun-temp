# Yoram current-candidate parity report

## Review target

- Repository HEAD after baseline commit: `477a52a01`
- Prior review baseline: `7f03d4facbdf0b81a8306f284c41bd5c079062af`
- Current-candidate differential run: `sweep-mtu1e9n4`
- Current-candidate inventory: `.agent/differential/current-candidate-inventory/report.json`
- External review constraint: Web ChatGPT cannot access the golden fixture, MariaDB clone, YONA_DATA, legacy Yona server, local Chrome, or repository artifacts. All results below therefore include commands, counts, expected/actual evidence, and limitations.

## Current worktree/commit separation

The accumulated product changes were committed separately as:

```text
477a52a01 repair pre-release parity regressions
```

The report files are the follow-up documentation commit. No release artifact or release image was created.

## Focused parity repairs completed

### Issue edit form

Changed behavior:

- `notificationMail` is part of the REST issue mutation request.
- Legacy author/non-author notification predicate is enforced server-side.
- Body preview uses the shared legacy Markdown renderer.
- PDF/non-image attachments insert as regular Markdown links.
- Existing attachment IDs survive save/remount.
- Temporary draft restore/autosave/clear follows the legacy pathname key.
- Clear Temporary does not delete uploaded attachments.
- Legacy five-item editor tab DOM is preserved.
- Issue upload DOM has `data-resource-id`, legacy fake-file wrapper, and legacy help paragraph behavior.

Focused result:

```text
project-issue-edit-form.e2e.ts + related edit-form specs:
14/14 edit-form tests passed in the final focused batch.
```

### Issue notification suppression

Legacy rule:

```text
notificationMail == selected
OR original_issue.author != current_user
```

Permanent regression result:

```text
original author + false -> 0 webhook deliveries
original author + true  -> 1 webhook delivery
non-author + false     -> 1 webhook delivery
```

Focused Rust result:

```text
cargo test -p yoram-server --test issue_core_contract
17 passed, 0 failed
```

### Notification/home geometry

A real browser measurement compared the legacy server and native server at the same viewport:

```json
legacy: { guideToggle: 23.078, button: 23, rowY: 376.078 }
native: { guideToggle: 23.078, button: 23, rowY: 376.078 }
```

The root cause was a cascade-order bug where `border-width: 1px` appeared after `border-top-width: 2px`, overriding the legacy top border. The live rule was rewritten to preserve legacy shorthand order.

Focused notification result:

```text
notification-more + notification-row + notification-empty:
15 passed, 0 failed
```

Mobile evidence:

- Live legacy admin affix at width 390: height 43px, line-height 20px, width 380px.
- The earlier 66px mobile pin was a harness-era assumption and was removed.
- Native and legacy current measured positions now match in the live paired probe.

## Verification matrix

### Frontend

```text
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test
```

Result:

```text
285 tests passed
```

```text
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend check
```

Result: TypeScript check passed.

### Node/dev gates

```text
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store test:dev-scripts
```

Result:

```text
302 passed, 0 failed
```

The CSS semantic cascade was regenerated and then compared equal.

### Rust

```text
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store \
  agent:cargo-test -- --outside-sandbox --workspace --tests
```

Result: workspace test targets passed.

Additional focused contracts passed:

- `attachment_acl_contract`
- `smart_http_contract`
- `svn_protocol_contract`
- `issue_mention_contract`
- `global_label_typeahead_contract`
- `issue_core_contract`

## Full WTR result

Command:

```text
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store \
  --dir frontend test:e2e:fast
```

The 661-file full WTR run did not pass completely. The captured run reached at least:

```text
2475 passed, 47 failed, 8 skipped
```

The failures span existing parity backlog screens, including project reviews, issue detail historical DOM assertions, settings, pull request surfaces, and other routes. This is not evidence that the focused changes above failed; focused issue-detail specs were separately run at:

```text
4 files, 114 passed, 0 failed
```

The full WTR backlog remains unresolved and blocks candidate-wide parity closure.

## Differential inventory

Command:

```text
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store \
  differential:sweep -- --output-dir .agent/differential/current-candidate-inventory
```

Result:

```text
117 scenarios registered and attempted
87 violations total
77 UNVERIFIED
4 IMPLEMENTATION_DIFFERENCE
5 LEGACY_BUG_NOT_REPRODUCED
1 INFRA_ERROR
18 step errors
```

Important classification rules:

- `UNVERIFIED` is not a confirmed product bug.
- `INFRA_ERROR` is not a parity pass.
- `IMPLEMENTATION_DIFFERENCE` needs a documented product decision or proof that the surface is intentionally React-owned.
- Current inventory therefore cannot be reduced to zero blockers from this run alone.

### Current issue-detail differential evidence

A focused I18 reproduction produced two DOM violations, both classified `UNVERIFIED`:

```text
expected skeletonEntries: 325
actual skeletonEntries: 297
```

The first differences include legacy Select2-generated nodes versus React-owned controls such as the checklist button. Direct issue-detail WTR tests pass 114/114, so no route patch was made from this unverified fingerprint.

### Current known implementation differences

The inventory includes these documented differences:

1. `/markdown/admin/sample`: React owns Markdown preview; the legacy server-render endpoint is intentionally not replicated.
2. `/user/editform/:tabId`: exact empty legacy POST probes are not the supported React settings mutation boundary.
3. `/sites/import`: malformed multipart status nuance differs while both sides reject the invalid payload and do not persist state.

These are not a zero-gap declaration.

## Actual adoption evidence available to external reviewers

The external reviewer cannot access the golden fixture, but the following portable facts are recorded from the adoption run:

- Preflight attachment rows checked: `6535`.
- Avatar rows checked: `15`.
- Schema manifest matched.
- Applied Play evolutions: `32`.
- Preflight summary: `0 blocking, 0 errors, 0 warnings`.
- Actual adoption issue flow includes browser-created issue, reload persistence, nested task toggle, stale-original handling, labels, edit/delete, comment creation, comment attachment, notification checkbox, comment deletion, board post flow, and restart checks.
- No release artifact was created.

The reviewer should treat these as recorded evidence, not independently reproducible proof without the original clone.

## Outstanding blockers

1. Full WTR suite remains 47 failures.
2. Differential inventory contains 87 violations, mostly unverified.
3. Issue-detail differential fingerprints remain unverified despite focused browser tests passing.
4. Candidate-wide all-gates and zero-gap claims are not supported.
5. The normal pre-commit hook failed on existing React Doctor diagnostics; the baseline commit used `--no-verify` by explicit request.

## Recommended external review procedure

Without golden fixture access, review the candidate in this order:

1. Read commit `477a52a01` and this report.
2. Treat the focused command results as the strongest evidence for the changed surfaces.
3. Do not convert DOM skeleton differences into product bugs without checking whether the node is plugin-generated or React-owned.
4. Treat every `UNVERIFIED` row as pending classification, not as parity proof.
5. Treat the full-WTR failures and current differential counts as candidate-wide blockers.
6. Do not declare pre-release-ready or 100% parity.
