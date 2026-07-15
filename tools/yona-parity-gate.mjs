import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

const GLOBAL_PROVENANCE_FILES = new Set([
  "docs/provenance/core-parity-audit.md",
  "docs/provenance/legacy-html-page-audit.md",
  "docs/provenance/legacy-porting-progress.md",
  "docs/provenance/phase-0b/legacy-test-inventory.md",
  "docs/agents/10-legacy-provenance-baseline.md",
]);

const NON_IMPLEMENTATION_PREFIXES = [
  ".agents/",
  ".codex/",
  ".github/",
  ".husky/",
  ".omx/",
  ".brv/",
  ".sisyphus/",
  ".playwright-mcp/",
  ".pnpm-store/",
  ".tmp/",
  "%TEMP%/",
  "docs/",
  "tests/",
  "tools/",
  "bin/",
  "drizzle/",
  "reports/",
  "reference/spikes/",
  "scripts/",
  "crates/protocol/src/generated/",
  "crates/server/src/generated/",
  "frontend/src/gen/",
  "frontend/public/legacy-assets/",
];

const NON_IMPLEMENTATION_FILES = new Set([
  ".gitignore",
  ".dockerignore",
  "AGENTS.md",
  "Cargo.lock",
  "Cargo.toml",
  "CLAUDE.md",
  "DESIGN.md",
  "Dockerfile",
  "NOTICE",
  "README.md",
  "SPEC.md",
  "buf.yaml",
  "buf.gen.yaml",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "react-doctor.config.json",
  "frontend/README.md",
  "frontend/index.html",
  "frontend/package.json",
  "frontend/playwright.config.ts",
  "frontend/pnpm-lock.yaml",
  "frontend/tsconfig.json",
  "frontend/vite.config.ts",
]);

const TEST_FILE_PATTERN = /(^tests\/)|(\/tests\/)|(\.spec\.)|(\.test\.)|(\.test-helpers\.)/i;
const LEGACY_REFERENCE_PATTERN = /yona-original\//;

const PARITY_SLICES = [
  {
    id: "public-landing",
    label: "Public landing and global navigation",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/theme\.stylex\.ts$/i,
      /^frontend\/src\/routes\/-home-route-screen\.tsx$/i,
      /^frontend\/src\/routes\/-last-outlet-transition\.tsx$/i,
      /^frontend\/src\/routes\/index\.tsx$/i,
      /^frontend\/src\/routes\/-home-view\.tsx$/i,
      /^frontend\/src\/routes\/__root\.tsx$/i,
    ],
    testKeywords: ["authenticated-home", "public-landing", "home-route", "layout-parity"],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/template-first-p1-auth-public-home.md",
      "docs/provenance/ui-parity-reports/template-first-p0-global-shell.md",
    ],
  },
  {
    id: "public-project-directory",
    label: "Public project directory",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/routes\/\[_\]import\.tsx$/i,
      /^frontend\/src\/routes\/projectform\.tsx$/i,
      /^frontend\/src\/routes\/projects\.tsx$/i,
      /^frontend\/src\/routes\/projects\/route\.tsx$/i,
      /^frontend\/src\/app\.css$/i,
    ],
    testKeywords: ["project-import", "project-directory-route", "projects", "directory-parity"],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/template-first-p2-project-shell.md",
      "docs/provenance/ui-parity-reports/2026-06-28-rendered-evidence-execution-manifest.md",
    ],
  },
  {
    id: "public-organization-directory",
    label: "Public organization directory",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/routes\/organizations\/new\.tsx$/i,
      /^frontend\/src\/routes\/organizations\/\$organizationName\/deleteForm\.tsx$/i,
      /^frontend\/src\/routes\/orgs\.tsx$/i,
      /^frontend\/src\/routes\/orgs\/route\.tsx$/i,
      /^frontend\/src\/app\.css$/i,
    ],
    testKeywords: ["organization", "organizations-new", "organization-directory-route", "orgs", "directory-parity"],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/template-first-p6-organization-directory-workspace.md",
      "docs/provenance/ui-parity-reports/2026-06-28-rendered-evidence-execution-manifest.md",
    ],
  },
  {
    id: "anonymous-help-route",
    label: "Anonymous help route",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/routes\/-help-views\.tsx$/i,
      /^frontend\/src\/routes\/\[_\]help\/route\.tsx$/i,
      /^frontend\/src\/routes\/\[_\]help\.tsx$/i,
    ],
    testKeywords: ["help-route", "help-toc", "help", "route-parity"],
    provenanceDocs: ["docs/agents/06-phase-plan.md", "docs/provenance/legacy-porting-progress.md"],
  },
  {
    id: "workspace-user-files",
    label: "Workspace user files",
    status: "parity",
    implementationPatterns: [/^frontend\/src\/routes\/user\/files\.tsx$/i],
    testKeywords: ["user-files", "workspace/files", "attachment-files"],
    provenanceDocs: [
      "docs/provenance/ui-parity-reports/ui-parity-user-workspace-profile.md",
      "docs/provenance/ui-parity-reports/template-first-p6-organization-directory-workspace.md",
      "docs/provenance/ui-parity-reports/2026-06-28-rendered-evidence-execution-manifest.md",
    ],
  },
  {
    id: "issue-lifecycle",
    label: "Issue lifecycle",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/api\/project-labels\.ts$/i,
      /^frontend\/src\/routes\/-legacy-markdown-help\.tsx$/i,
      /^frontend\/src\/routes\/-milestone-views\.tsx$/i,
      /^frontend\/.*issues?/i,
      /^crates\/(?:domain|persistence|server)\/.*(?:issue|label|milestone)/i,
    ],
    testKeywords: ["issue", "issues", "label", "milestone", "route-parity"],
    provenanceDocs: [
      "docs/provenance/phase-0b/issue.md",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/ui-parity-board-milestone.md",
      "docs/provenance/ui-parity-reports/ui-parity-issues.md",
      "docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md",
      "docs/provenance/ui-parity-reports/template-first-p4-board-milestone-post.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
    ],
  },
];

const DOMAIN_BUCKETS = [
  {
    id: "project-markdown-rendering",
    label: "Project Markdown rendering",
    status: "parity",
    implementationPatterns: [
      /^crates\/server\/src\/lib\.rs$/i,
      /^crates\/server\/src\/markdown\.rs$/i,
      /^frontend\/src\/routes\/-markdown-renderer\.tsx$/i,
      /^frontend\/src\/routes\/-syntax-highlighting\.tsx$/i,
    ],
    testKeywords: [
      "markdown",
      "issue_core_contract",
      "pull_request_read_contract",
      "pull_request_mutation_contract",
      "code_browser_contract",
      "project-home",
      "wave2a",
      "container-parity",
      "board",
      "posting",
      "route-parity",
    ],
    provenanceDocs: [
      "docs/provenance/phase-0b/issue.md",
      "docs/provenance/phase-0b/pull-request-review.md",
      "docs/provenance/phase-0b/code-browser.md",
      "docs/provenance/legacy-porting-progress.md",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/ui-parity-board-milestone.md",
      "docs/provenance/ui-parity-reports/ui-parity-issues.md",
      "docs/provenance/ui-parity-reports/ui-parity-code-vcs.md",
      "docs/provenance/ui-parity-reports/ui-parity-fragment-security-db.md",
      "docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md",
      "docs/provenance/ui-parity-reports/template-first-p4-board-milestone-post.md",
      "docs/provenance/ui-parity-reports/2026-06-28-exhaustive-page-rebuild-audit.md",
      "docs/provenance/ui-parity-reports/2026-06-28-rendered-evidence-execution-manifest.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
    ],
  },
  {
    id: "shared-frontend-view-models",
    label: "Shared frontend view models",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/app-view-models\.ts$/i,
      /^frontend\/src\/routes\/-view-models\.ts$/i,
    ],
    testKeywords: [
      "api-query",
      "auth",
      "board",
      "code",
      "issue",
      "milestone",
      "organization",
      "project",
      "pull-request",
      "review",
      "route-parity",
      "search",
      "site-admin",
      "user-profile",
      "workspace",
    ],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/phase-0b/issue.md",
      "docs/provenance/phase-0b/pull-request-review.md",
      "docs/provenance/phase-0b/user-workspace.md",
      "docs/provenance/ui-parity-reports/ui-parity-board-milestone.md",
      "docs/provenance/ui-parity-reports/ui-parity-issues.md",
      "docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md",
      "docs/provenance/ui-parity-reports/template-first-p2-project-shell.md",
      "docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md",
      "docs/provenance/ui-parity-reports/ui-parity-directory-organization.md",
      "docs/provenance/ui-parity-reports/ui-parity-user-workspace-profile.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
    ],
  },
  {
    id: "frontend-api-query-boundary",
    label: "Frontend API query boundary",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/api\/(?:milestones|session|translation|types)\.ts$/i,
      /^frontend\/src\/api\/org-project\.ts$/i,
      /^frontend\/src\/api\/query-keys\.ts$/i,
      /^frontend\/src\/auth-workspace-client\.ts$/i,
      /^frontend\/src\/query-client\.tsx$/i,
    ],
    testKeywords: [
      "api-query",
      "query",
      "issue",
      "milestone",
      "pull-request",
      "review",
      "project",
      "organization",
      "user-profile",
      "site-admin",
      "site_admin",
      "user-list",
    ],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/phase-0b/user-workspace.md",
      "docs/provenance/phase-0b/issue.md",
      "docs/provenance/phase-0b/pull-request-review.md",
      "docs/provenance/ui-parity-reports/ui-parity-board-milestone.md",
      "docs/provenance/ui-parity-reports/ui-parity-issues.md",
      "docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md",
      "docs/provenance/ui-parity-reports/ui-parity-auth-public-entry.md",
      "docs/provenance/ui-parity-reports/ui-parity-directory-organization.md",
      "docs/provenance/ui-parity-reports/ui-parity-search-notification.md",
      "docs/provenance/ui-parity-reports/ui-parity-user-account-settings.md",
      "docs/provenance/ui-parity-reports/ui-parity-user-workspace-profile.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
    ],
  },
  {
    id: "board-posting-core",
    label: "Board posting core",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/api\/boards\.ts$/i,
      /^frontend\/src\/routes\/-board-views\.tsx$/i,
      /^frontend\/src\/routes\/\$owner\/\$projectName\/posts\/route\.tsx$/i,
      /^frontend\/src\/routes\/\$owner\/\$projectName\/post(?:form|\/)/i,
      /^frontend\/src\/routes\/organizations\/\$organizationName\/boards\/route\.tsx$/i,
      /^crates\/(?:persistence|server)\/.*(?:posting|board)/i,
    ],
    testKeywords: ["board", "posting", "post", "route-parity"],
    provenanceDocs: ["docs/provenance/core-parity-audit.md"],
  },
  {
    id: "canonical-schema-and-persistence-foundation",
    label: "Canonical schema and persistence foundation",
    status: "partial",
    implementationPatterns: [
      /^crates\/migration\//i,
      /^crates\/persistence-entities\//i,
      /^crates\/persistence\//i,
      /^proto\//i,
      /^crates\/integrations\//i,
    ],
    testKeywords: [
      "migration",
      "repo",
      "repository",
      "contract",
      "sqlite",
      "matrix",
      "auth",
      "project",
      "organization",
    ],
    provenanceDocs: [
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/provenance/phase-0b/milestone.md",
      "docs/provenance/phase-0b/yona-export.md",
      "docs/provenance/auth-deferred-oauth-ldap.md",
      "docs/plans/2026-06-21-deferred-parity-goal-directive.md",
      "docs/provenance/ui-parity-reports/ui-parity-board-milestone.md",
      "docs/provenance/ui-parity-reports/ui-parity-issues.md",
      "docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
      "docs/agents/10-legacy-provenance-baseline.md",
    ],
  },
  {
    id: "auth-account-lifecycle",
    label: "Auth and account lifecycle",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/app-runtime-context\.tsx$/i,
      /^frontend\/src\/routes\/-shared\.tsx$/i,
      /^frontend\/src\/routes\/-(?:restricted-view|ui-kit-views)\.tsx$/i,
      /^frontend\/src\/routes\/\[_\]UIKit\/route\.tsx$/i,
      /^frontend\/src\/routes\/\[_\]UIKit\.tsx$/i,
      /^frontend\/src\/routes\/-restricted\.stylex\.ts$/i,
      /^frontend\/src\/routes\/restricted\.tsx$/i,
      /^frontend\/src\/routes\/restricted\/route\.tsx$/i,
      /^frontend\/src\/routes\/-restart\.stylex\.ts$/i,
      /^frontend\/src\/routes\/restart\.tsx$/i,
      /^frontend\/src\/routes\/-secret\.stylex\.ts$/i,
      /^frontend\/src\/routes\/secret\.tsx$/i,
      /^frontend\/src\/routes\/(?:secret|restart)\/route\.tsx$/i,
      /^frontend\/src\/routes\/(?:login|register|forgot-password)\.tsx$/i,
      /^frontend\/src\/routes\/(?:lostPassword|resetPassword)\.tsx$/i,
      /^frontend\/src\/routes\/-lostPassword\.stylex\.ts$/i,
      /^frontend\/src\/routes\/-resetPassword\.stylex\.ts$/i,
      /^frontend\/src\/routes\/(?:lostPassword|resetPassword|forgot-password)\/route\.tsx$/i,
      /^frontend\/src\/routes\/\(legacy-auth\)\/reset-password\/route\.tsx$/i,
      /^frontend\/src\/routes\/users\/(?:login|loginform|signupform)\.tsx$/i,
      /^frontend\/src\/routes\/users\/(?:login|loginform|signupform)\/route\.tsx$/i,
      /^frontend\/src\/routes\/verify\/\$loginId\/\$verificationCode\.tsx$/i,
      /^frontend\/src\/routes\/verify\/\$loginId\/-verification\.stylex\.ts$/i,
      /^frontend\/src\/routes\/verify\/\$loginId\/\$verificationCode\/route\.tsx$/i,
      /^frontend\/src\/i18n\.tsx$/i,
      /^frontend\/.*auth/i,
      /^crates\/(?:server|domain)\/.*(auth|session|password|account)/i,
      /^crates\/persistence\/.*(auth|user|session|workspace)/i,
    ],
    testKeywords: [
      "auth",
      "login",
      "register",
      "password",
      "restricted",
      "restart",
      "secret",
      "secret-setup",
      "session",
      "ui-kit",
      "verify-user",
      "route-parity",
    ],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/legacy-porting-progress.md",
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/provenance/auth-deferred-oauth-ldap.md",
      "docs/provenance/ui-parity-reports/ui-parity-auth-public-entry.md",
      "docs/provenance/ui-parity-reports/template-first-p1-auth-public-home.md",
      "docs/plans/2026-06-21-deferred-parity-goal-directive.md",
      "docs/provenance/ui-parity-reports/ui-parity-site-admin-setup.md",
      "docs/provenance/ui-parity-reports/template-first-p0-global-shell.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
    ],
  },
  {
    id: "public-user-profile",
    label: "Public user profile",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/api\/users\.ts$/i,
      /^frontend\/src\/routes\/\$user\.tsx$/i,
      /^frontend\/src\/routes\/\$user\/route\.tsx$/i,
      /^frontend\/src\/routes\/-workspace-views\.tsx$/i,
      /^crates\/persistence\/src\/repo\/project_activity\.rs$/i,
      /^crates\/persistence\/src\/repo_types\.rs$/i,
      /^crates\/server\/src\/api_types\.rs$/i,
      /^crates\/server\/src\/routes\/(?:users|workspace)\.rs$/i,
    ],
    testKeywords: [
      "user-profile",
      "profile",
      "workspace",
      "route-parity",
      "api-query",
      "rest_public_user_profile",
    ],
    provenanceDocs: [
      "docs/provenance/phase-0b/user-workspace.md",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/ui-parity-user-workspace-profile.md",
      "docs/provenance/ui-parity-reports/template-first-p6-organization-directory-workspace.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
    ],
  },
  {
    id: "acl-baseline",
    label: "ACL baseline",
    status: "gap",
    implementationPatterns: [
      /^crates\/domain\/.*(authorization|access-control|role|acl|policy)/i,
      /^crates\/server\/.*(authorization|access-control|acl|policy)/i,
    ],
    testKeywords: ["authorization", "access-control", "role", "acl"],
    provenanceDocs: [
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/agents/10-legacy-provenance-baseline.md",
    ],
  },
  {
    id: "pull-request-and-review",
    label: "Pull request and review",
    status: "parity",
    implementationPatterns: [
      /^frontend\/.*(pulls|pull-requests?|pullrequests?|pull-request|reviews?)/i,
      /^frontend\/public\/images\/fork-pull\/fork\.jpg$/i,
      /^crates\/(?:domain|server)\/.*(pull-requests?|pull_request|review)/i,
    ],
    testKeywords: [
      "fork",
      "project-fork",
      "pull-request",
      "pull_request",
      "pullrequests",
      "pulls",
      "review",
      "reviews",
      "route-parity",
    ],
    provenanceDocs: [
      "docs/provenance/phase-0b/pull-request-review.md",
      "docs/provenance/core-parity-audit.md",
      "docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md",
      "docs/provenance/ui-parity-reports/ui-parity-pull-request-review.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
    ],
  },
  {
    id: "organization-core-cru",
    label: "Organization core CRU",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/routes\/-directory-views\.tsx$/i,
      /^frontend\/.*organization/i,
      /^crates\/(?:domain|persistence|server)\/.*organization/i,
    ],
    testKeywords: ["organization", "org", "route-parity"],
    provenanceDocs: [
      "docs/provenance/phase-0b/organization.md",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/ui-parity-directory-organization.md",
      "docs/provenance/ui-parity-reports/template-first-p6-organization-directory-workspace.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
    ],
  },
  {
    id: "project-core-cru-and-enrollment",
    label: "Project core CRU and enrollment",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/routes\/-directory-views\.tsx$/i,
      /^frontend\/src\/routes\/\[_\]import\/route\.tsx$/i,
      /^frontend\/.*project/i,
      /^crates\/(?:domain|persistence|server)\/.*(project|enrollment)/i,
    ],
    testKeywords: [
      "project",
      "projects",
      "enroll",
      "enrollment",
      "keymap",
      "milestone",
      "mention",
      "route-parity",
      "wave2a",
      "container-parity",
    ],
    provenanceDocs: [
      "docs/provenance/phase-0b/project.md",
      "docs/provenance/phase-0b/milestone.md",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/ui-parity-board-milestone.md",
      "docs/provenance/ui-parity-reports/ui-parity-issues.md",
      "docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md",
      "docs/provenance/ui-parity-reports/template-first-p2-project-shell.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
    ],
  },
  {
    id: "workspace-recent-favorite-default-landing",
    label: "Workspace recent/favorite/default landing",
    status: "parity",
    implementationPatterns: [
      /^frontend\/.*\/me/i,
      /^frontend\/src\/api\/workspace\.ts$/i,
      /^frontend\/src\/app\.css$/i,
      /^frontend\/src\/routes\/-workspace-settings-view\.tsx$/i,
      /^frontend\/src\/routes\/user\/editform\.tsx$/i,
      /^frontend\/src\/routes\/user\/editform\/(?:emails|notifications|password|token)?\/?route\.tsx$/i,
      /^frontend\/src\/routes\/user\/editform\/emails\.tsx$/i,
      /^frontend\/src\/routes\/user\/editform\/notifications\.tsx$/i,
      /^frontend\/src\/routes\/user\/editform\/password\.tsx$/i,
      /^frontend\/src\/routes\/user\/editform\/token\.tsx$/i,
      /^frontend\/src\/routes\/user\/editform\/index\.tsx$/i,
      /^frontend\/src\/routes\/user\/files\/route\.tsx$/i,
      /^crates\/(?:domain|persistence|server)\/.*(workspace|default-landing|favorite|recent)/i,
    ],
    testKeywords: [
      "workspace",
      "default-landing",
      "favorite",
      "recent",
      "me",
      "user-files",
      "user-profile-settings",
      "user-password-settings",
      "user-email-settings",
      "user-notification-settings",
      "user-token-settings",
      "avatar-wrap",
      "api-token",
      "token-generate",
    ],
    provenanceDocs: [
      "docs/provenance/phase-0b/user-workspace.md",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/ui-parity-user-account-settings.md",
      "docs/provenance/ui-parity-reports/ui-parity-root-navigation-shell.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
      "docs/plans/2026-06-27-ui-parity-coordination.md",
    ],
  },
  {
    id: "notification-inbox-and-mail-staging",
    label: "Notification inbox and mail staging",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/api\/notifications\.ts$/i,
      /^frontend\/src\/routes\/notifications?\.tsx$/i,
      /^frontend\/src\/routes\/notifications?\/route\.tsx$/i,
      /^crates\/(?:server|persistence|integrations)\/.*notification/i,
    ],
    testKeywords: ["notification", "mail", "watch", "route-parity"],
    provenanceDocs: [
      "docs/provenance/phase-0b/issue.md",
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/ui-parity-search-notification.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
    ],
  },
  {
    id: "issue-lifecycle",
    label: "Issue lifecycle",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/api\/project-labels\.ts$/i,
      /^frontend\/src\/routes\/-milestone-views\.tsx$/i,
      /^frontend\/.*issues?/i,
      /^crates\/(?:domain|persistence|server)\/.*(?:issue|label|milestone)/i,
    ],
    testKeywords: ["issue", "issues", "label", "milestone", "route-parity"],
    provenanceDocs: [
      "docs/provenance/phase-0b/issue.md",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/ui-parity-issues.md",
      "docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md",
    ],
  },
  {
    id: "search",
    label: "Search",
    status: "parity",
    implementationPatterns: [
      /^frontend\/.*search/i,
      /^crates\/(?:search|persistence|server|domain)\/.*search/i,
    ],
    testKeywords: ["search", "snippet"],
    provenanceDocs: [
      "docs/provenance/phase-0b/search.md",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
  },
  {
    id: "site-admin-core",
    label: "Site admin core surface",
    status: "parity",
    implementationPatterns: [
      /^frontend\/src\/api\/site-admin\.ts$/i,
      /^frontend\/src\/routes\/-migration\.stylex\.ts$/i,
      /^frontend\/src\/routes\/migration\.tsx$/i,
      /^frontend\/src\/routes\/sites\/data\.tsx$/i,
      /^frontend\/src\/routes\/sites\/diagnostic\.tsx$/i,
      /^frontend\/src\/routes\/sites\/issueList\.tsx$/i,
      /^frontend\/src\/routes\/sites\/mail\.tsx$/i,
      /^frontend\/src\/routes\/sites\/massmail\.tsx$/i,
      /^frontend\/src\/routes\/sites\/postList\.tsx$/i,
      /^frontend\/src\/routes\/sites\/projectList\.tsx$/i,
      /^frontend\/src\/routes\/sites\/-pagination\.tsx$/i,
      /^frontend\/src\/routes\/sites\/update\.tsx$/i,
      /^frontend\/src\/routes\/sites\/userList\.tsx$/i,
      /^frontend\/src\/routes\/sites\/\$pageName\/route\.tsx$/i,
      /^crates\/(?:persistence|server)\/.*(?:site|admin|user)/i,
    ],
    testKeywords: ["site-admin", "site_admin", "site/users", "user-list", "migration"],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/ui-parity-site-admin-setup.md",
      "docs/provenance/ui-parity-reports/template-first-p7-site-admin-error-security.md",
    ],
  },
  {
    id: "repository-and-smart-http",
    label: "Repository and smart HTTP",
    status: "parity",
    implementationPatterns: [
      /^frontend\/.*(repo|code|branches|commit)/i,
      /^crates\/vcs\//i,
      /^crates\/(?:vcs|server|domain)\/.*(repo|code|branch|commit|smart[_-]http|inline-edit)/i,
    ],
    testKeywords: [
      "repo",
      "code",
      "branch",
      "commit",
      "smart-http",
      "smart_http",
      "inline-edit",
      "svn_protocol",
    ],
    provenanceDocs: [
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/provenance/core-parity-audit.md",
    ],
  },
  {
    id: "attachment-and-asset-acl",
    label: "Attachment and asset ACL",
    status: "parity",
    implementationPatterns: [
      /^frontend\/(?!public\/legacy-assets\/).*(asset|upload|attachment|resource)/i,
      /^crates\/(?:server|persistence|domain)\/.*(asset|upload|attachment|resource)/i,
    ],
    testKeywords: ["asset", "upload", "attachment", "resource"],
    provenanceDocs: [
      "docs/provenance/phase-0b/legacy-test-inventory.md",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/ui-parity-reports/template-first-p0-global-shell.md",
      "docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md",
      "docs/provenance/ui-parity-reports/template-first-p6-organization-directory-workspace.md",
      "docs/provenance/ui-parity-reports/ui-parity-user-account-settings.md",
    ],
  },
  {
    id: "second-priority-deferred",
    label: "SVN, LDAP, import/export follow-up scope",
    status: "partial",
    implementationPatterns: [/(\/|^)(svn|ldap|import|export|migration)(\/|\.|$)/i],
    testKeywords: ["svn", "ldap", "import", "export", "migration"],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/auth-deferred-oauth-ldap.md",
      "docs/provenance/phase-0b/yona-export.md",
      "docs/plans/2026-06-21-deferred-parity-goal-directive.md",
    ],
  },
  {
    id: "rust-foundation-and-runtime-bootstrap",
    label: "Rust foundation and runtime bootstrap",
    status: "partial",
    implementationPatterns: [
      /^(?:\.gitignore|Cargo\.lock|Cargo\.toml|buf(?:\.gen)?\.yaml)$/i,
      /^frontend\/(?:README\.md|package\.json|pnpm-lock\.yaml|index\.html|tsconfig\.json|vite\.config\.ts)$/i,
      /^crates\/(?:server|domain|search|vcs)\//i,
      /^frontend\/src\/(?:main|router|runtime-config)\.tsx?$/i,
      /^frontend\/src\/routes\/sidebar\/route\.tsx$/i,
      /^frontend\/scripts\//i,
      /^reports\//i,
      /^scripts\//i,
    ],
    testKeywords: [
      "runtime_config",
      "runtime-config",
      "main",
      "auth",
      "project",
      "sqlite",
      "matrix",
      "contract",
      "foundation",
      "legacy-rendered",
      "migration",
      "svn",
      "vcs",
    ],
    provenanceDocs: [
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/legacy-porting-progress.md",
      "docs/provenance/auth-deferred-oauth-ldap.md",
      "docs/provenance/phase-0b/milestone.md",
      "docs/provenance/phase-0b/yona-export.md",
      "docs/plans/2026-06-21-deferred-parity-goal-directive.md",
      "docs/provenance/ui-parity-reports/ui-parity-board-milestone.md",
      "docs/provenance/ui-parity-reports/ui-parity-issues.md",
      "docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md",
      "docs/provenance/ui-parity-reports/template-first-p0-global-shell.md",
      "docs/plans/2026-06-26-full-ui-parity-subagent-phase.md",
      "docs/agents/06-phase-plan.md",
      "docs/agents/10-legacy-provenance-baseline.md",
    ],
  },
];

const MARKDOWN_SURFACE_OPT_IN_PATTERNS = [
  /^frontend\/src\/routes\/-board-views\.tsx$/i,
  /^frontend\/src\/routes\/-issue-views\.tsx$/i,
];

function normalizePath(inputPath) {
  return inputPath.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function isNonImplementationFile(filePath) {
  if (TEST_FILE_PATTERN.test(filePath)) {
    return true;
  }

  if (/^crates\/[^/]+\/Cargo\.toml$/i.test(filePath) || filePath === "crates/server/build.rs") {
    return true;
  }

  if (filePath === "crates/protocol/src/lib.rs") {
    return true;
  }

  if (NON_IMPLEMENTATION_FILES.has(filePath)) {
    return true;
  }

  return NON_IMPLEMENTATION_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function isImplementationFile(filePath) {
  return !isNonImplementationFile(filePath);
}

function isMarkdownSurfaceOptIn(filePath, changedFiles) {
  if (!matchesAnyPattern(filePath, MARKDOWN_SURFACE_OPT_IN_PATTERNS)) {
    return false;
  }

  return changedFiles.some((changedFile) =>
    /^frontend\/src\/(?:markdown-renderer\.spec\.tsx|routes\/-markdown-renderer\.tsx)$/i.test(
      changedFile,
    ),
  );
}

function hasLegacyRoot(repoRoot) {
  return existsSync(path.join(repoRoot, "yona-original"));
}

function readTextFileIfPresent(repoRoot, filePath) {
  const absolutePath = path.join(repoRoot, filePath);
  if (!existsSync(absolutePath)) {
    return "";
  }

  try {
    return readFileSync(absolutePath, "utf8");
  } catch {
    return "";
  }
}

function hasLegacyReference(repoRoot, changedFiles) {
  for (const filePath of changedFiles) {
    const fileText = readTextFileIfPresent(repoRoot, filePath);
    if (fileText && LEGACY_REFERENCE_PATTERN.test(fileText)) {
      return true;
    }
  }

  return false;
}

function matchesAnyPattern(filePath, patterns) {
  return patterns.some((pattern) => pattern.test(filePath));
}

function matchesKeyword(filePath, keywords) {
  const lowered = filePath.toLowerCase();
  return keywords.some((keyword) => lowered.includes(keyword.toLowerCase()));
}

function matchesKeywordInPathOrContent(repoRoot, filePath, keywords) {
  if (matchesKeyword(filePath, keywords)) {
    return true;
  }

  const fileText = readTextFileIfPresent(repoRoot, filePath).toLowerCase();
  return keywords.some((keyword) => fileText.includes(keyword.toLowerCase()));
}

function classifyCapability(filePath, changedFiles = [], repoRoot = DEFAULT_REPO_ROOT) {
  if (filePath === "frontend/src/i18n.tsx") {
    const contextualBucket = [...PARITY_SLICES, ...DOMAIN_BUCKETS].find(
      (bucket) =>
        bucket.id !== "auth-account-lifecycle" &&
        capabilityHasTestEvidence(bucket, changedFiles, repoRoot) &&
        capabilityHasProvenanceEvidence(bucket, changedFiles),
    );
    if (contextualBucket) {
      return contextualBucket;
    }
  }

  const publicUserProfileBucket = [...PARITY_SLICES, ...DOMAIN_BUCKETS].find(
    (bucket) => bucket.id === "public-user-profile",
  );
  if (
    publicUserProfileBucket &&
    isPublicUserProfileBackendSurface(filePath) &&
    capabilityHasTestEvidence(publicUserProfileBucket, changedFiles, repoRoot) &&
    capabilityHasProvenanceEvidence(publicUserProfileBucket, changedFiles)
  ) {
    return publicUserProfileBucket;
  }

  const pullRequestReviewBucket = [...PARITY_SLICES, ...DOMAIN_BUCKETS].find(
    (bucket) => bucket.id === "pull-request-and-review",
  );
  if (
    pullRequestReviewBucket &&
    isPullRequestReviewBackendSurface(filePath) &&
    capabilityHasTestEvidence(pullRequestReviewBucket, changedFiles, repoRoot) &&
    capabilityHasProvenanceEvidence(pullRequestReviewBucket, changedFiles)
  ) {
    return pullRequestReviewBucket;
  }

  const searchBucket = [...PARITY_SLICES, ...DOMAIN_BUCKETS].find(
    (bucket) => bucket.id === "search",
  );
  if (
    searchBucket &&
    isSearchBackendSurface(filePath, changedFiles) &&
    capabilityHasTestEvidence(searchBucket, changedFiles, repoRoot) &&
    capabilityHasProvenanceEvidence(searchBucket, changedFiles)
  ) {
    return searchBucket;
  }

  const markdownBucket = DOMAIN_BUCKETS.find(
    (bucket) => bucket.id === "project-markdown-rendering",
  );
  if (
    markdownBucket &&
    isMarkdownSurfaceOptIn(filePath, changedFiles) &&
    capabilityHasTestEvidence(markdownBucket, changedFiles, repoRoot) &&
    capabilityHasProvenanceEvidence(markdownBucket, changedFiles)
  ) {
    return markdownBucket;
  }

  for (const slice of PARITY_SLICES) {
    if (matchesAnyPattern(filePath, slice.implementationPatterns)) {
      return slice;
    }
  }

  for (const bucket of DOMAIN_BUCKETS) {
    if (
      bucket.id === "project-markdown-rendering" &&
      matchesAnyPattern(filePath, bucket.implementationPatterns) &&
      capabilityHasTestEvidence(bucket, changedFiles, repoRoot) &&
      capabilityHasProvenanceEvidence(bucket, changedFiles)
    ) {
      return bucket;
    }
  }

  for (const bucket of DOMAIN_BUCKETS) {
    if (bucket.id === "project-markdown-rendering") {
      continue;
    }
    if (matchesAnyPattern(filePath, bucket.implementationPatterns)) {
      return bucket;
    }
  }

  return null;
}

function isPublicUserProfileBackendSurface(filePath) {
  return [
    "crates/persistence/src/repo/common.rs",
    "crates/persistence/src/repo/project_activity.rs",
    "crates/persistence/src/repo_types.rs",
    "crates/server/src/api_types.rs",
    "crates/server/src/routes/users.rs",
    "crates/server/src/routes/workspace.rs",
  ].includes(filePath);
}

function isPullRequestReviewBackendSurface(filePath) {
  return [
    "crates/persistence/src/repo/record_helpers.rs",
    "crates/persistence/src/repo/pull_request.rs",
    "crates/persistence/src/repo_types.rs",
  ].includes(filePath);
}

function isSearchBackendSurface(filePath, changedFiles) {
  if (filePath === "crates/persistence/src/repo/search.rs") {
    return true;
  }
  return (
    filePath === "crates/persistence/src/repo_types.rs" &&
    changedFiles.includes("crates/persistence/src/repo/search.rs")
  );
}

function capabilityHasTestEvidence(capability, changedFiles, repoRoot) {
  return changedFiles.some(
    (filePath) =>
      TEST_FILE_PATTERN.test(filePath) &&
      matchesKeywordInPathOrContent(repoRoot, filePath, capability.testKeywords),
  );
}

function capabilityHasProvenanceEvidence(capability, changedFiles) {
  return changedFiles.some(
    (filePath) =>
      GLOBAL_PROVENANCE_FILES.has(filePath) || capability.provenanceDocs.includes(filePath),
  );
}

function evaluateCapability(capability, changedFiles, implementationFiles, repoRoot) {
  const matchedFiles = implementationFiles.filter((filePath) =>
    matchesAnyPattern(filePath, capability.implementationPatterns),
  );
  const evidence = {
    tests: capabilityHasTestEvidence(capability, changedFiles, repoRoot),
    provenance: capabilityHasProvenanceEvidence(capability, changedFiles),
    legacyReference: hasLegacyReference(repoRoot, changedFiles),
  };

  let verdict = "pass";
  let reason = `${capability.label} remains adequately evidenced for legacy parity.`;

  if (capability.status === "deferred") {
    verdict = "block";
    reason = `${capability.label} is explicitly deferred scope in this repository.`;
  } else if (capability.status === "parity") {
    if (!(evidence.tests || evidence.provenance || evidence.legacyReference)) {
      verdict = "block";
      reason = `${capability.label} is an already-parity slice, but this change lacks updated parity evidence.`;
    }
  } else if (evidence.tests && evidence.provenance) {
    verdict = "pass";
    reason = `${capability.label} has both verification and provenance updates for this parity change.`;
  } else if (evidence.tests || evidence.provenance || evidence.legacyReference) {
    verdict = "expected-nonparity";
    reason = `${capability.label} still tracks a legacy gap or partial slice and has not yet landed a full parity closure.`;
  } else {
    verdict = "block";
    reason = `${capability.label} changed without tests, provenance updates, or explicit legacy references.`;
  }

  return {
    id: capability.id,
    label: capability.label,
    status: capability.status,
    matchedFiles,
    evidence,
    verdict,
    reason,
  };
}

function isDeletedMixedCodeResidual(repoRoot, filePath) {
  return filePath.startsWith("reference/mixed-code/") && !existsSync(path.join(repoRoot, filePath));
}

function collectImplementationChanges(changedFiles, repoRoot = DEFAULT_REPO_ROOT) {
  const implementationFiles = [];
  const nonImplementationFiles = [];

  for (const filePath of changedFiles) {
    if (isDeletedMixedCodeResidual(repoRoot, filePath)) {
      nonImplementationFiles.push(filePath);
      continue;
    }

    if (isImplementationFile(filePath)) {
      implementationFiles.push(filePath);
      continue;
    }

    nonImplementationFiles.push(filePath);
  }

  return { implementationFiles, nonImplementationFiles };
}

export function evaluateParityGate({ changedFiles = [], repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const normalizedFiles = [...new Set(changedFiles.map(normalizePath).filter(Boolean))];

  if (!hasLegacyRoot(repoRoot)) {
    return {
      verdict: "block",
      summary: "Legacy parity gate could not find yona-original/ at the repository root.",
      changedFiles: normalizedFiles,
      implementationFiles: [],
      skippedFiles: normalizedFiles,
      capabilities: [],
      unmappedImplementationFiles: [],
    };
  }

  const { implementationFiles, nonImplementationFiles } = collectImplementationChanges(
    normalizedFiles,
    repoRoot,
  );

  if (implementationFiles.length === 0) {
    return {
      verdict: "pass",
      summary: "No implementation files changed; legacy parity gate passed.",
      changedFiles: normalizedFiles,
      implementationFiles,
      skippedFiles: nonImplementationFiles,
      capabilities: [],
      unmappedImplementationFiles: [],
    };
  }

  const capabilitiesById = new Map();
  const unmappedImplementationFiles = [];

  for (const filePath of implementationFiles) {
    const capability = classifyCapability(filePath, normalizedFiles, repoRoot);
    if (!capability) {
      unmappedImplementationFiles.push(filePath);
      continue;
    }

    capabilitiesById.set(capability.id, capability);
  }

  const evaluatedCapabilities = [...capabilitiesById.values()].map((capability) =>
    evaluateCapability(capability, normalizedFiles, implementationFiles, repoRoot),
  );

  if (unmappedImplementationFiles.length > 0) {
    evaluatedCapabilities.push({
      id: "unmapped-implementation",
      label: "Unmapped implementation surface",
      status: "unknown",
      matchedFiles: unmappedImplementationFiles,
      evidence: {
        tests: false,
        provenance: false,
        legacyReference: false,
      },
      verdict: "block",
      reason: `No legacy parity mapping exists for: ${unmappedImplementationFiles.join(", ")}`,
    });
  }

  let verdict = "pass";
  if (evaluatedCapabilities.some((entry) => entry.verdict === "block")) {
    verdict = "block";
  } else if (evaluatedCapabilities.some((entry) => entry.verdict === "expected-nonparity")) {
    verdict = "expected-nonparity";
  }

  const blockingEntry = evaluatedCapabilities.find((entry) => entry.verdict === "block");
  const expectedEntry = evaluatedCapabilities.find(
    (entry) => entry.verdict === "expected-nonparity",
  );

  const summary =
    blockingEntry?.reason ??
    expectedEntry?.reason ??
    "All changed implementation files have legacy parity evidence.";

  return {
    verdict,
    summary,
    changedFiles: normalizedFiles,
    implementationFiles,
    skippedFiles: nonImplementationFiles,
    capabilities: evaluatedCapabilities,
    unmappedImplementationFiles,
  };
}

export function shouldBlockForStrictGate(result) {
  return result.verdict !== "pass";
}

export function formatParitySummary(result) {
  const prefix =
    result.verdict === "pass"
      ? "PASS"
      : result.verdict === "expected-nonparity"
        ? "EXPECTED-NONPARITY"
        : "BLOCK";

  return `[yona-legacy-parity] ${prefix}: ${result.summary}`;
}

export function collectGitChangedFiles(repoRoot, { staged = false } = {}) {
  const args = staged
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]
    : ["diff", "--name-only", "--diff-filter=ACMR"];
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "Failed to collect changed files from git.");
  }

  return result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseCliArgs(argv) {
  const options = {
    staged: false,
    json: false,
    requirePass: false,
    files: [],
  };

  for (const arg of argv) {
    if (arg === "--staged") {
      options.staged = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--require-pass") {
      options.requirePass = true;
      continue;
    }

    options.files.push(arg);
  }

  return options;
}

function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  const changedFiles =
    cli.files.length > 0
      ? cli.files
      : collectGitChangedFiles(DEFAULT_REPO_ROOT, { staged: cli.staged });
  const result = evaluateParityGate({
    changedFiles,
    repoRoot: DEFAULT_REPO_ROOT,
  });

  if (cli.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatParitySummary(result)}\n`);
  }

  if (cli.requirePass) {
    process.exitCode = shouldBlockForStrictGate(result) ? 1 : 0;
    return;
  }

  process.exitCode = result.verdict === "block" ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main();
}
