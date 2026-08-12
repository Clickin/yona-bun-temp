# Yona e2e 잔여 문제점 전체 인벤토리 (2026-08-11, HEAD f2f30a90e)

> 이 문서는 현존하는 **모든** 문제점을 하나로 정리한 인벤토리다. deepseek v4 pro 가
> 이 파일 + 아래 링크된 분류 원본을 입력으로 **한 번에 전체 해결 계획**을 세운다.
> 실행은 plan runner(현재 세션)가 담당한다.

## 0. 상태 요약

| 항목 | 값 |
|---|---|
| 브랜치 | `codex/yoram-fullstack-rebrand` |
| HEAD | `f2f30a90e` (이 세션 15번째 커밋) |
| 마지막 전체 게이트 | `1273 passed / 142 failed / 1 skipped` (430 files, WTR_SHARDS=2, `/tmp/e2e-full-current.log`) |
| 분류 파일 (per-failure prescription 원본) | `local://e2e-residual-classification.md` (242 스펙 / 491 실패) |
| 실행 계획 파일 | `local://e2e-residual-closure-plan.md` |
| 이 세션 해결 (solo-GREEN 확정) | 아래 §1 |
| 미해결 triage 후보 (게이트 79 파일 중) | 아래 §2 |
| SVN 전용 스펙 (deferred, AGENTS.md 2순위) | 15 파일 |
| HARNESS_ENV (문서화 대상, 수정 금지) | 103 실패 / 40 스펙 HARNESS_ENV-only |
| 로드맵 (e2e 밖) | §4 |

## 1. 이 세션에서 이미 해결 (재계획 불필요)

### 1.1 커밋 목록 (HEAD f2f30a90e 기준 최근 20)
```
f2f30a90e e2e+route: site user-list delete action class-free ownership
8ecbe4d56 e2e+route: issue-form subtask hide + 390px/upload metric re-pins
c033a5a5a e2e+route: site mail/diagnostic breadcrumb ownership restoration
0f3af3dc1 e2e: project-issues-real-instance-parity probe the live legacy origin
bb6a0c6ed e2e+app.css: fix project-page-wrap margin (legacy 5px), members/org-home/boards re-pins
0b28c92b8 e2e: user-public-profile strip React-owned data-overdue attr
32f321e3f e2e: restore ownership contracts for user-settings/user-files/site-user-list
d378418e2 e2e: verify-user re-pin to F5 dist-truth
6f836689f e2e: spa-shell-transition fix the request listener facade crash
2c94bbb2f e2e: restricted re-pin to F5 dist-truth
0d2e8b949 e2e+route: reset-password re-pin to F5 dist-truth
4e3c11329 e2e: signupform re-pin to F5 dist-truth
bd3fe71e2 e2e: search-global + search-project re-pin to F5 dist-truth
37b6040cb e2e+route: user-issues re-pin to F5 dist-truth
0101a1d3e e2e+route: user-files re-pin to F5 dist-truth
869a144f2 e2e: user-token-settings re-pin to F5 dist-truth
9eda237b6 e2e+route: user-password-settings re-pin to F5 dist-truth
f63b69e57 e2e+route: user-email-settings re-pin to F5 dist-truth
5fbdb37d6 e2e+route: user-profile-settings re-pin to F5 dist-truth
12e242130 e2e+route: site-admin-issue-list re-pin to F5 dist-truth
```

### 1.2 solo-GREEN 확정 스펙 (재실행 시 반드시 GREEN)
- user-profile-settings 5/5, user-email-settings 4/4, user-password-settings 3/3, user-token-settings 3/3
- user-files 6/6, user-issues 21/21, user-public-profile 11/11
- search-global 21/21, search-project 14/14
- signupform 8/8, reset-password 5/5, restricted 8/8, verify-user 4/4, spa-shell-transition 2/2
- project-members-form 24/24, project-home-readme 30/31(SVN 1 defer), project-home-history 5/5, project-home-dashboard 10/10
- organization-boards 17/17, organization-home 19/19
- project-issue-form 15/15 + 1 skipped (HARNESS_ENV 문서화)
- site-admin-mail 10/10, site-admin-diagnostic 4/4, site-admin-user-list 16/16
- ownership: user-email-add-form 3/3, user-email-primary-identity 2/2, user-email-secondary-row 3/3,
  user-email-table-shell 3/3, user-password-form 4/4, user-password-actions 4/4,
  user-files-screen 2/2, user-files-search 2/2, user-settings-page-shell 6/6,
  user-editform-profile-fields-mt10 1/1, user-editform-avatar-upload-mt10 2/2,
  user-editform-inline-residual 2/2, user-editform-emails-inline-residual 2/2,
  site-user-list-breadcrumb 2/2, site-user-list-row-actions 2/2,
  site-mail-breadcrumb 3/3, site-diagnostic-breadcrumb 3/3,
  project-issueform-inline-residual 1/1, project-issueform-subtask 1/1

### 1.3 이 세션의 핵심 패턴 (재발 시 즉시 적용)
- **hasAttribute 함정**: canonicalizer의 owner-mapped class 주입은 `current.hasAttribute("class")`
  일 때만 발동 → classless 요소는 route가 class를 소유하거나 filter bypass 필요
  (`(name === "class" && ownerClassName(current) !== null)`).
- **wtr request facade crash**: `page.on("request")`에서 `isNavigationRequest()` 호출 금지
  (`resourceType() === "document"` 필터 사용).
- **frozen bootstrap `.row-fluid [class*="span"] { display: block }`** 가 UA `[hidden]` 를 덮음 →
  jQuery `.hide()` 대응은 inline `style={{ display: "none" }}`.
- **TanStack active-class branch** 는 별도 token-strip 목록 보유 (search-project).
- **`@media all` (무조건) 응답 규칙**이 `_page.less`보다 나중 로드 → `.project-page-wrap` margin 5px.
- **probe truth > legacy pin**: mock이 실제 PNG(1:1)를 서빙하면 avatar box는 40x40 (64 pin은 404 probe artifact).
- mock-hit probe는 `window.parent.__wtrMockHits/__wtrMockLast` (top realm).

## 2. 미해결 triage 후보 (게이트 실패 79 파일 중 이 세션 미검증)

> 주의: 게이트(`/tmp/e2e-full-current.log`)는 `d378418e2` 시점 실행이라 이 세션
> 수정이 반영 안 됨. 아래 파일 중 다수는 이미 §1에서 해결됐거나 batch artifact.
> **fresh full run 재측정(Step 0) 후 확정 필요.** 아래는 게이트에서 실패한
> 파일 목록 중 이 세션에서 solo 검증하지 않은 것 (그룹별).

### 2.1 ownership-* 계열 (site-admin/project/organization — 높은 우선순위)
- ownership-site-project-list-* : search 5, row 3, page-management-shell 3, listhead 2, pagination 2
- ownership-site-issue-list-metadata 3
- ownership-site-post-list-management-grid 2, ownership-site-post-list-page-row-shell 2
- ownership-site-diagnostic-no-error-title 3, ownership-site-diagnostic-error-title 2,
  ownership-site-diagnostic-page-grid-columns 2
- ownership-site-update-sidebar 1
- ownership-project-reviews-sidebar-count-floats 5, ownership-project-reviews-batch6 2
- ownership-project-settingform-batch6 5, ownership-project-setting-default-branch-control 4
- ownership-global-gnb-search-scope-menu 3
- ownership-left-sidebar-project-subtabs 3, ownership-left-sidebar-recent-issue-rows 2,
  ownership-left-sidebar-project-shell 2
- ownership-authenticated-sidenav-project-subtabs 3, ownership-authenticated-sidenav-recent-issue-rows 2,
  ownership-authenticated-sidenav-content-frame 1
- ownership-organization-member-panel-mt10 1
- ownership-pull-request-detail-header-state-date-mt10 1
- ownership-reset-password-validation-popover 1

### 2.2 project-* 계열 (비-SVN)
- project-code-commit-detail 6, project-code-view-folder 2, project-code-history-file 2,
  project-code-nohead 2 (CSS_GAP 5/ROUTE_DOM 3/… per 분류)
- project-milestone-edit-form 2
- legacy-fallback-off 2 (SOURCE_PIN 3 + ROUTE_DOM 1 per 분류)
- organization-delete-form 2
- public-landing-parity 2
- authenticated-home-empty-notifications 1 (HARNESS_ENV per 분류)

### 2.3 분류 파일 기준 상위 fixable 스펙 (fresh run에서 재확인 대상)
| 실패 | 분류 |
|---|---|
| project-settings-form 11 | HARNESS_ENV 4, CANONICALIZER 2, CSS_GAP 3, FIXTURE 2 |
| project-pullrequests 10 | CANONICALIZER 8, HARNESS_ENV 2 |
| ui-kit 6 | CSS_GAP 4, SOURCE_PIN 1, ROUTE_DOM 1 |
| project-labels-form 6 | ROUTE_DOM 2, FIXTURE 1, CANONICALIZER 1, SOURCE_PIN 1 |
| project-pullrequest-overview 6 | CSS_GAP 3, CANONICALIZER 2, ROUTE_DOM 1 |
| ownership-global-gnb-feedback-link 6 | CSS_GAP 6 |
| project-delete-form 5 | FIXTURE 3, CSS_GAP 1 |
| organization-pullrequests 5 | CANONICALIZER 3, ROUTE_DOM 1, SOURCE_PIN 1 |
| project-code-commit-detail 5 | CSS_GAP 5 |
| global-shell-geometry 4 | CSS_GAP 1, HARNESS_ENV 2, SOURCE_PIN 1 |
| ownership-framed-site-shell 4 | SOURCE_PIN 2, ROUTE_DOM 2 |
| project-create 4 | FIXTURE 1, ROUTE_DOM 2, CSS_GAP 1 |
| project-fork-form 4 | CANONICALIZER 4 |
| project-transfer-form 4 | CSS_GAP 1, FIXTURE 1, HARNESS_ENV 1, SOURCE_PIN 1 |
| project-pullrequest-changes 4 | CSS_GAP 1, ROUTE_DOM 3 |
| organization-members-form 4 | SOURCE_PIN 2, ROUTE_DOM 2 |
| ownership-global-gnb-search-scope-menu 4 | CSS_GAP 3, ROUTE_DOM 1 |
| project-code-view-folder 4 | ROUTE_DOM 3, CSS_GAP 1 |

## 3. SVN 전용 스펙 (deferred — 2순위, AGENTS.md)
15개 파일 (게이트에서 전부 실패, solo 검증 자체를 보류):
project-code-compare-svn, project-code-nohead-svn, project-commits-svn-main,
project-commits-svn-root-trailing-slash, project-labelsform-svn, project-milestone-svn-detail,
project-issues-svn, project-home-readme(SVN 테스트 1개), project-pullrequests(SVN 테스트 1개) 등.

## 4. HARNESS_ENV (수정 금지 — 문서화만, 103 실패 / 40 스펙)
분류 파일에서 `HARNESS_ENV`로 분류된 항목 (WTR iframe/font-metric/실서버 의존):
- font-metric 핀 (ko-KR GNB 폭 +10px drift 등) → F5 측정 re-pin
- WTR facade 한계: create-dropdown click, iframe reload aria-pressed, hover-shim popover,
  scrollWidth overflow, 60s timeout → 인라인 ledger 주석
- 실서버 의존: project-issues-real-instance-parity (mirror probe skip, 이 세션에서 probe를
  live legacy origin으로 수정 — 8개 skip 확정)
- 이 세션 추가: project-issue-form anonymous-401 redirect (mocked-401 query가 wtr facade에서
  pending — skip 문서화)

## 5. 로드맵 (e2e 밖 — 이 계획의 목표 아님, 참고)
| 우선순위 | 항목 | 상태 |
|---|---|---|
| 1 | e2e 안전화 (본 문서) | 진행 중 |
| 2 | attachment streaming API (data 파티션 직접 + yoram API 수신 절충) | 미착수 |
| 3 | SVN DAV 쓰기 처리 | 미착수 |
| 4 | H2 마이그레이션 지원 (--from-h2-url/--from-h2-jar) | H2 Shell CSVWRITE 기반 커밋 있음 |
| 5 | "Yona 100% 호환" 타깃 | 계속 |

## 6. e2e 가속 (새 요구사항 — pro 에게 해결책 요청)
현재 성능 실측:
- focused run 1개: ~18–45s (항상 rebuild, WTR Chrome launcher)
- 전체 게이트: 430 files, WTR_SHARDS=2, ~30분+ (`/tmp/e2e-full-current.log`)
- WTR은 **직렬 전용** (포트 8128/8129 공유 — 병렬 실행 시 결과 오염, 실측됨)
- 매 실행 `vite build`(dist 재생성) + Chrome 부팅 포함

가속 후보 (pro가 검증·구체화):
- rebuild 스킵: 소스/스펙 변경 없으면 dist 재사용 (incremental build, vite watch reuse)
- shard 확장: WTR_SHARDS=2 → 4/8 (포트 격리, 캐시 warm)
- warm Chrome: launcher 재사용, headless 유지, viewport 재설정만
- mock fetch 캐시: 동일 fixture 재서빙 (registry memo)
- 병렬 안전 검증: 같은 페이지 상태 격리 (prior-page DOM 누수 방지) 후 병렬화
- 테스트 단위 축소: 60s timeout 테스트 스플릿
