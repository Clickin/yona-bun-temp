# WTR 637-failure reconciliation report

> Generated 2026-08-09 (suite-17: 2833 passed / 214 failed / 5 skipped)

## Task A — 47 unmapped triage rows

| spec | test | family | disposition | evidence |
|---|---|---|---|---|
| not-found.e2e.ts | unmatched route matches legacy error/notfound_de | F5 | copy-fix-dist-truth | projectPageWrapMarginTop 20->5px: legacy _responsive.less:553 @media all sets 5px at every width; pin stale (F5) |
| project-code-history.e2e.ts | project bare code history renders default branch | F7 | app-fix | commit href has ?branch=main: legacy commits URL drops branch on root history; app emits extra query (F7) |
| project-commits-svn-main.e2e.ts | svn main branch history reuses the legacy root h | F5 | copy-fix-dist-truth | historyTop 272->270, pageHeight 159->167: dist line metrics shifted; F5 |
| project-commits-svn-root-trailing-slash.e2e.ts | svn commits trailing slash replaces to the canon | F5 | copy-fix-dist-truth | historyTop 272->270: F5 |
| project-deleteform-svn.e2e.ts | SVN project delete form matches the legacy shell | F7 | app-fix | strict mode: .project-setting > .project-menu-nav > li = 2 (malformed legacy parse); pin needs owned selector (F7) |
| project-home-history.e2e.ts | project home History tab keeps legacy stream pro | F5 | copy-fix-dist-truth | toBe(20) actual 5 + geometry: legacy stream proportions; F5/F6 mix |
| project-home-history.e2e.ts | SVN project home History tab preserves the live  | F5 | copy-fix-dist-truth | toBe(20) actual 5 + geometry: legacy stream proportions; F5/F6 mix |
| project-issues-svn.e2e.ts | SVN issues keeps the canonical desktop shell and | F5 | copy-fix-dist-truth | toBe(139) actual 163: watcher .btn geometry legacy truth 163 (wave-8 fix); pin stale (F5) |
| project-settings-form.e2e.ts | Could not import your test module. Check the bro | F2 | harness-investigate | module import fails in browser; harness (F2) |
| restart.e2e.ts | restart notice matches legacy welcome/restart.sc | F5 | copy-fix-dist-truth | secretBoxWidth 640->630: dist scrollbar; F5 |
| stylex-auth-home-intro-guide.e2e.ts | authenticated Home intro guide preserves desktop | F5 | copy-fix-dist-truth | toBeCloseTo(18) actual 19: 1px line-box drift; F5 |
| stylex-auth-home-intro-guide.e2e.ts | authenticated Home intro guide preserves mobile  | F5 | copy-fix-dist-truth | toBeCloseTo(18) actual 19: 1px line-box drift; F5 |
| stylex-framed-site-shell.e2e.ts | frozen framed SiteLayout sources and generated f | F5 | copy-fix-dist-truth | fallback hash mismatch: generated fallback stale; F5/F6 |
| stylex-global-gnb-search-box.e2e.ts | search-box DOM order and legacy GET form behavio | F9 | flaky-green | Timeout: slow-mock artifact; F9 |
| stylex-global-gnb-search-form.e2e.ts | scoped search remains React-owned and submits th | F9 | flaky-green | Timeout: F9 |
| stylex-global-gnb-search-submit.e2e.ts | owned submit preserves the legacy GET payload | F9 | flaky-green | Timeout: F9 |
| stylex-org-directory-inline-residual.e2e.ts | organization directory private-card residual inl | F6 | copy-fix-current-dom | toContain(style opacity 0.3): route residual inline missing; F6 |
| stylex-organization-home-action-floats.e2e.ts | organization home action floats preserve exact l | F6 | copy-fix-current-dom | pull-right retained class pins (legacy copy); F6 |
| stylex-organization-home-action-floats.e2e.ts | organization home action floats preserve copy an | F6 | copy-fix-current-dom | pull-right retained class pins (legacy copy); F6 |
| stylex-project-code-branch-inline-residual.e2e.ts | moves code branch spinner and empty-folder alert | F6 | copy-fix-current-dom | toContain spinner inline: residual moved to route; F6 |
| stylex-organization-members-list.e2e.ts | organization enrollment request preserves avatar | F9 | flaky-green | Timeout + toBeAttached: slow mock; F9 |
| stylex-organization-members-list.e2e.ts | organization member list preserves populated and | F9 | flaky-green | Timeout + toBeAttached: slow mock; F9 |
| stylex-project-commit-detail.e2e.ts | records commit detail owners and responsive diff | F6 | copy-fix-current-dom | toContain(right-txt): canonicalizer strips; F6 |
| stylex-project-issue-detail-body-sidebar.e2e.ts | issue detail body/sidebar geometry stays contain | F6 | copy-fix-current-dom | toHaveCSS(padding-left) 10px: stale pin; F5/F6 |
| stylex-project-issues-action-floats.e2e.ts | project issue action owners preserve float, acti | F6 | copy-fix-current-dom | float owner runtime: false; F6 |
| stylex-project-labelsform-owners.e2e.ts | labels form source exposes residual StyleX owner | F6 | copy-fix-current-dom | toContain(center-txt): canonicalizer strip; F6 |
| stylex-project-members-error-wrap.e2e.ts | project members error-wrap preserves forbidden a | F7 | app-fix | toHaveURL loginform: 401 shell redirect differs; F7 |
| stylex-project-post-detail-disabled-comment-actions-mt10.e2e.ts | project post detail owns unauthorized comment ac | F6 | copy-fix-current-dom | toContain(className sx.commentActions): spread-order; F6 |
| stylex-project-post-detail-inline-residual.e2e.ts | moves board post detail static residuals to rout | F6 | copy-fix-current-dom | toContain(right-txt): F6 |
| stylex-project-post-detail-inline-residual.e2e.ts | post detail right alignment owners are route-loc | F6 | copy-fix-current-dom | toContain(right-txt): F6 |
| stylex-project-post-edit-form-paste.e2e.ts | post edit upload paste help uses conditional Sty | F6 | copy-fix-current-dom | toContain(pasteHelpStyleProps): conditional prop; F6 |
| stylex-project-posts-action-floats.e2e.ts | project posts action floats preserve legacy sour | F6 | copy-fix-current-dom | pull-left retained class; F6 |
| stylex-project-posts-action-floats.e2e.ts | project posts action floats preserve desktop/mob | F6 | copy-fix-current-dom | pull-left retained class; F6 |
| stylex-project-pull-request-detail-help-messages-mt10.e2e.ts | populated pull-request detail keeps help-message | F6 | copy-fix-current-dom | toBeLessThanOrEqual 595: help text overflow; F6/F7 |
| stylex-project-pull-request-detail-mr10.e2e.ts | pull request detail owns legacy mr10 on the head | F6 | copy-fix-current-dom | toContain(style={{): mt10 owner; F6 |
| stylex-project-pull-requests.e2e.ts | records project pull request list owners and res | F6 | copy-fix-current-dom | toContain(twoColumnPopover top:-74): stale source pin vs reverted bottom calc; F6 |
| stylex-project-pullrequest-detail-inline-residual.e2e.ts | pull request detail owns static author and revie | F6 | copy-fix-current-dom | toContain(style display inline-block): F6 |
| stylex-project-pullrequests-action-floats.e2e.ts | records the three project pull-request float own | F6 | copy-fix-current-dom | pull-right retained class; F6 |
| stylex-project-pullrequests-action-floats.e2e.ts | preserves populated project pull-request actions | F6 | copy-fix-current-dom | pull-right retained class; F6 |
| stylex-project-pullrequests-error-wrap.e2e.ts | project pull-request empty state owns the legacy | F6 | copy-fix-current-dom | toHaveCSS(display) inline: error-wrap; F6/F7 |
| stylex-projects-page-wrappers.e2e.ts | projects page wrappers preserve desktop direct n | F5 | copy-fix-dist-truth | bottom/height +3px: F5 |
| stylex-projects-page-wrappers.e2e.ts | projects page wrappers preserve mobile direct ne | F5 | copy-fix-dist-truth | bottom/height +3px: F5 |
| stylex-pull-request-detail-header-state-date-mt10.e2e.ts | pull request header state/date owns the legacy m | F6 | copy-fix-current-dom | toContain(style={{): F6 |
| stylex-site-issue-list-breadcrumb.e2e.ts | breadcrumb source owns exactly the frozen route- | F6 | copy-fix-current-dom | toContain(.site-breadcrumb-inner h3): route-local decl; F6 |
| stylex-user-files-search.e2e.ts | pins the empty-state search output and React nav | F5 | copy-fix-dist-truth | geometry keys action/input/root: F5 |
| stylex-user-profile-project-avatar-lock-fork-classes.e2e.ts | Projects pane retires only avatar, lock-size, an | F6 | copy-fix-current-dom | toMatch avatar-wrap.small: retained-class; F6 |
| user-issues.e2e.ts | current-user issues page matches legacy issue/my | F5 | copy-fix-dist-truth | leftMenuWidth 161->158 etc: dist; F5 |

## Task B — 20 sampled app-fix rows

All 20 sampled ledger rows with disposition `app-fix` still red at suite-17 confirmed as GENUINE F7 app gaps: the React route still differs from the cited legacy source (DOM classes, geometry, or interaction). No stale-pin reclassification warranted. Examples: project-board-create-form form.nm class, project-webhooks-form form-wrap, stylex-authenticated-sidenav-* geometry, site-admin-* shells.