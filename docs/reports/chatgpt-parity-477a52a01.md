# Yoram parity baseline report

## Review target

- Commit: `477a52a01`
- Parent: `7f03d4facbdf0b81a8306f284c41bd5c079062af`
- Purpose: freeze the pre-existing uncommitted parity implementation as a separate commit.
- Source availability assumption: the external reviewer does **not** have the repository, golden fixture, database dump, YONA_DATA, legacy server, or screenshots. This report is self-contained evidence and does not claim that external reproduction is possible without those assets.

## Scope of the commit

This commit contains the accumulated product work that was already present before the report-only follow-up. It includes Rust persistence/server/VCS/migration changes, React parity work, WTR coverage, differential runner changes, CSS baseline changes, and the new attachment/tasklist/contract test surfaces.

The commit is intentionally broad because the worktree already contained 179 changed paths. It is not a clean single-finding patch. Reviewers should treat the commit as a baseline snapshot, not as proof that all parity is complete.

### Main behavioral areas

1. Attachment lifetime and ACL
   - Shared-hash attachment deletion preserves the physical blob until the last DB reference is removed.
   - Container-level read/update/delete authorization covers issue sharers and container editors.
   - Regression surface: `crates/server/tests/attachment_acl_contract.rs`.

2. Git and SVN protocol behavior
   - Smart HTTP subprocess I/O drains child streams without pipe deadlock.
   - SVN write activity handling preserves one logical commit and rollback semantics.
   - Regression surfaces: `crates/server/tests/smart_http_contract.rs`, `crates/server/tests/svn_protocol_contract.rs`, `crates/vcs/tests/smart_http_contract.rs`.

3. Issue/comment mutation and notification semantics
   - Issue mutation contracts carry notification intent.
   - Attachment replacement, comment updates, stale-content conflicts, mention synchronization, and webhook behavior are covered.
   - Comment notification rules follow the legacy author/non-author predicate.

4. React issue/detail/edit parity
   - Legacy markdown editor structure, five-tab DOM, preview rendering, temporary draft behavior, attachment insertion, upload controls, issue sidebar, issue timeline, comment actions, and modal ownership were restored or pinned.

5. Home/notification parity
   - The legacy guide-toggle border cascade was restored.
   - Notification desktop/mobile coordinates were re-pinned to measured legacy behavior.
   - Notification focused WTR tests cover list, empty state, pagination, and mobile geometry.

6. CSS parity
   - The semantic cascade baseline was regenerated after proven legacy-fallback/style ownership changes.
   - Current baseline: layers `homeb, legacy, theme, utilities`, 9,209 rules, 25 buckets, 2 font faces, 16 keyframes.

## Important implementation details for review

### Issue edit notification predicate

The effective predicate is:

```text
send_notification = checkbox_value_or_default_true
                    OR existing_issue_author_id != actor_id
```

Consequences:

- Original author + unchecked checkbox: suppresses body/assignee/milestone notification fan-out.
- Original author + checked checkbox: sends notification fan-out.
- Non-author: sends regardless of a forged false checkbox value.
- Draft save: remains non-notifying.
- Publish from draft: remains a new-issue notification path.

### Shared attachment lifetime invariant

For attachment rows `A` and `B` with the same `hash`:

```text
Delete(A) -> DB row A gone, upload/<hash> still exists, GET(B) returns original bytes
Delete(B) -> DB row B gone, upload/<hash> may be removed
```

Missing physical blobs do not panic during row deletion.

### Legacy uploader DOM contract

The issue uploader follows the shared legacy `uploadForm.scala.html` shape:

```html
<div id="upload" class="upload-wrap content-footer"
     data-resource-type="ISSUE_POST"
     data-resource-id="<issue-id>">
  <div class="attach-wrap">...</div>
  <ul class="attached-files unstyled"></ul>
  <p class="right-txt help">...</p>
</div>
```

The edit form preserves five markdown-editor tabs:

1. Edit
2. Preview
3. Add checklist
4. Clear Temporary
5. Notice label

## Evidence run against this commit

The commands were executed locally against the repository checkout:

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend check
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store test:dev-scripts
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store agent:cargo-test -- --outside-sandbox --workspace --tests
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store agent:cargo-test -- --outside-sandbox -p yoram-server --test attachment_acl_contract
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store agent:cargo-test -- --outside-sandbox -p yoram-server --test smart_http_contract
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store agent:cargo-test -- --outside-sandbox -p yoram-server --test svn_protocol_contract
```

Observed results:

- Frontend Vitest: `285 passed`.
- Workspace Rust test targets: passed.
- Node/dev gate: `302 passed, 0 failed`.
- CSS cascade: semantic equality passed.
- Attachment ACL contract: passed.
- Smart HTTP contract: passed.
- SVN protocol contract: passed.

## Commit-hook note

The normal pre-commit hook was attempted and failed before commit because React Doctor reported four diagnostics in already accumulated changes:

- `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx:938`: map/filter combination.
- `frontend/src/components/tasklist.tsx:29`: generic handler name.
- `frontend/src/routes/$ownerName/$projectName/post/$postNumber.tsx:2058`: effect used as event handler.
- Additional unused-import warnings in `project-issue-detail-4.e2e.ts`.

The commit was then created with `git commit --no-verify` at the user's explicit request to separate existing work. This is evidence of a hook failure, not a claim that the hook passed.

## Review boundaries

This commit is not a release candidate declaration. It includes substantial pre-existing work and unresolved parity inventory. External ChatGPT review should use this report plus the current-candidate report, and should classify findings as:

- verified behavior,
- implementation-only DOM/cascade difference,
- unverified differential evidence,
- real observable mismatch,
- infrastructure or fixture error.
