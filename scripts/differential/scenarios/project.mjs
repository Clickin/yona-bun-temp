// Project domain: project home + labels scenarios and their action definitions.
//
// Domain module contract (see scenarios/index.mjs).
import { translateLegacy, translateYoram } from "../adapters.mjs";
import { HarnessError, violation } from "../report.mjs";

export const scenarios = [
  {
    id: "S2-view-project",
    title: "view project home",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-project", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^(ProjectApp\.project|Application\.index)$/ },
  },
  {
    id: "S5-list-labels",
    title: "list project labels",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "list-labels", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^ProjectApp\.labels$/, route: /labels/ },
  },
  {
    id: "P1-issue-labels",
    title: "issue label pages: list, form, categories, styles",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "list-issue-labels", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-issue-labels-form", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "list-issue-label-categories", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-issue-label-category", params: { owner: "admin", project: "sample", categoryId: 1 } },
      { actor: "admin", action: "fetch-issue-label-styles", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueLabelApp\.(labels|labelsForm|categories|category|labelStyles)$/ },
  },
  {
    id: "P2-global-label-catalog",
    title: "site-wide label catalog pages",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-site-labels", params: {} },
      { actor: "admin", action: "view-site-label-categories", params: {} },
    ],
    behaviorMatcher: { action: /^LabelApp\.(labels|categories)$/ },
  },
  {
    id: "P3-milestones",
    title: "milestone list, detail, edit form, new form",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "list-milestones", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-milestone", params: { owner: "admin", project: "sample", milestoneId: 1 } },
      { actor: "admin", action: "view-milestone-editform", params: { owner: "admin", project: "sample", milestoneId: 1 } },
      { actor: "admin", action: "view-new-milestone-form", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^MilestoneApp\.(milestone|editMilestoneForm|milestones|newMilestoneForm)$/ },
  },
  {
    id: "P4-posts-and-board",
    title: "board posts list, post detail, forms, watchers api",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "list-posts", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-post-form", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-post", params: { owner: "admin", project: "sample", postNumber: 1 } },
      { actor: "admin", action: "view-post-editform", params: { owner: "admin", project: "sample", postNumber: 1 } },
      { actor: "admin", action: "list-post-watchers", params: { owner: "admin", project: "sample", postNumber: 1 } },
    ],
    behaviorMatcher: { action: /^(BoardApp\.(posts|post|newPostForm|editPostForm)|WatcherApi\.getWatchers)$/ },
  },
  {
    id: "P5-project-home-subpages",
    title: "project home sub-pages: members/watchers/settings/webhooks/statistics",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-project-members", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-project-watchers", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-project-setting-form", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-project-delete-form", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-project-transfer-form", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-project-webhooks", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-project-statistics", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-project-go-menu", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-change-vcs-form", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^(ProjectApp\.(members|watchers|settingForm|deleteForm|transferForm|webhooks|goConventionMenu|changeVCSForm)|StatisticsApp\.statistics)$/ },
  },
  {
    id: "P6-mention-lists",
    title: "mention list fragments (plain, commit diff, pull request)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "fetch-mention-list", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "fetch-mention-list-commit-diff", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "fetch-mention-list-pull-request", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^ProjectApp\.mentionList/ },
  },
  {
    id: "P7-project-search",
    title: "in-project search results page",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "search-in-project", params: { owner: "admin", project: "sample", query: "welcome" } },
    ],
    behaviorMatcher: { action: /^SearchApp\.searchInAProject$/, route: /\/search$/ },
  },
  {
    id: "P8-milestone-crud",
    title: "milestone CRUD chain: create, edit, close, open, api-create, delete",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-milestone", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "edit-milestone", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "close-milestone", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "open-milestone", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "create-milestone-api", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-milestone", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^(MilestoneApp\.(newMilestone|editMilestone|close|open|deleteMilestone)|MilestoneApi\.newMilestone)$/ },
  },
  {
    id: "P9-board-post-crud",
    title: "board post CRUD chain incl. legacy external API probes and comment lifecycle",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-post", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "edit-post", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "patch-post-content-api", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "set-post-labels-api", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "create-post-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "update-post-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "patch-post-comment-api", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-post-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "create-post-api", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-post", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^(BoardApp\.(newPost|editPost|deletePost|newComment|updateComment|deleteComment)|BoardApi\.(newPostings|updatePostingContent|newPostingComment|updatePostingComment|updatePostLabel))$/ },
  },
  {
    id: "P10-webhook-crud",
    title: "webhook create then delete",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-webhook", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-webhook", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^ProjectApp\.(newWebhook|deleteWebhook)$/ },
  },
  {
    id: "P11-watch-toggle-watchers",
    title: "project watch toggle with watchers page verification",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "watch-project", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-project-watchers", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "unwatch-project", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^WatchProjectApp\.(watch|unwatch)$/ },
  },
  {
    id: "P12-project-label-mutations",
    title: "project label attach, detach, api-create",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-label-api", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "attach-project-label", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "detach-project-label", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^(ProjectApp\.(attachLabel|detachLabel)|ProjectApi\.newLabel)$/ },
  },
  {
    id: "P13-member-add-remove",
    title: "project member add bob then remove",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "add-project-member", params: { owner: "admin", project: "sample", loginId: "bob" } },
      { actor: "admin", action: "remove-project-member", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^ProjectApp\.(newMember|deleteMember)$/ },
  },
  {
    id: "P14-overview-and-markdown-preview",
    title: "project overview update (restored) + markdown preview render",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "update-project-overview", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "render-markdown-preview", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^(ProjectApp\.projectOverviewUpdate|MarkdownApp\.render)$/ },
  },
  {
    id: "P15-project-data-surfaces",
    title: "read-only data surfaces: exports, reviews, leave info, migration exports, attachments, catch-all, git advertise",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "fetch-project-exports", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "list-review-threads", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-project-leave-info", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-migration-hub", params: {} },
      { actor: "admin", action: "export-migration-project", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "export-migration-issue-label-pairs", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "export-migration-issues", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "export-migration-labels", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "export-migration-milestones", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "export-migration-posts", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "export-migration-projects-list", params: {} },
      { actor: "admin", action: "fetch-attachment-list", params: {} },
      { actor: "admin", action: "fetch-git-info-refs", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^(MigrationApp\.|ProjectApi\.exports$|ReviewThreadApp\.reviewThreads$|UserApp\.leave$|AttachmentApp\.getFileList$|Application\.removeTrailer$|GitApp\.advertise$)/ },
  },
  {
    id: "P16-enroll-cancel",
    title: "project enroll then cancel enrollment",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "enroll-project", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "cancel-enroll-project", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^EnrollProjectApp\.(enroll|cancelEnroll)$/ },
  },
  {
    id: "P17-issue-labels-api-probe",
    title: "issue label set via legacy external API on a fresh suffix-tagged issue",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "set-issue-labels-api", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueApi\.updateIssueLabel$/ },
  },
];

// Shared handler shape for read actions: translate both sides, request both
// sides (status errors land in entry.errors), then DOM-skeleton diff the page.
async function readPageHandler(ctx) {
  const { step, resolved, options, yoramBaseUrl, helpers } = ctx;
  await helpers.requestBoth(ctx, translateLegacy(step, resolved), translateYoram(step, resolved));
  const leaf = step.action === "view-project" ? "" : "/labels";
  await helpers.renderDomTarget(ctx, {
    legacy: `${options.legacyUrl}/${step.params.owner}/${step.params.project}${leaf}`,
    yoram: `${yoramBaseUrl}/${step.params.owner}/${step.params.project}${leaf}`,
    // The project home route is React-rendered; capture after hydration.
    spa: true,
  });
}

// --- read-only expansion: labels, milestones, posts/board, home sub-pages ---

function readPath(step) {
  const p = step.params;
  const base = `/${p.owner}/${p.project}`;
  switch (step.action) {
    case "list-issue-labels": return `${base}/issue/labels`;
    case "view-issue-labels-form": return `${base}/issue/labelsform`;
    case "list-issue-label-categories": return `${base}/issue/label/categories`;
    case "view-issue-label-category": return `${base}/issue/label/category/${p.categoryId}`;
    case "fetch-issue-label-styles": return `${base}/issue/labels.css`;
    case "view-site-labels": return "/labels";
    case "view-site-label-categories": return "/categories";
    case "list-milestones": return `${base}/milestones`;
    case "view-milestone": return `${base}/milestone/${p.milestoneId}`;
    case "view-milestone-editform": return `${base}/milestone/${p.milestoneId}/editform`;
    case "view-new-milestone-form": return `${base}/newMilestoneForm`;
    case "list-posts": return `${base}/posts`;
    case "view-post-form": return `${base}/postform`;
    case "view-post": return `${base}/post/${p.postNumber}`;
    case "view-post-editform": return `${base}/post/${p.postNumber}/editform`;
    case "list-post-watchers": return `/-_-api/v1/owners/${p.owner}/projects/${p.project}/posts/${p.postNumber}/watchers`;
    case "view-project-members": return `${base}/members`;
    case "view-project-watchers": return `${base}/watchers`;
    case "view-project-setting-form": return `${base}/settingform`;
    case "view-project-delete-form": return `${base}/deleteform`;
    case "view-project-transfer-form": return `${base}/transfer`;
    case "view-project-webhooks": return `${base}/webhooks`;
    case "view-project-statistics": return `${base}/statistics`;
    case "view-project-go-menu": return `${base}/go`;
    case "view-change-vcs-form": return `${base}/changeVCS`;
    case "fetch-mention-list": return `${base}/mentionList`;
    case "fetch-mention-list-commit-diff": return `${base}/mentionListAtCommitDiff`;
    // Legacy's route binds pullRequestId:Long with no default; omitting it is
    // a legacy 400, so the probe pins the seeded main->feature/ui PR.
    case "fetch-mention-list-pull-request": return `${base}/mentionListAtPullRequest?pullRequestId=1`;
    case "fetch-project-exports": return `/-_-api/v1/owners/${p.owner}/projects/${p.project}/exports`;
    case "list-review-threads": return `${base}/reviews`;
    case "view-project-leave-info": return `/info/leave/${p.owner}/${p.project}`;
    case "view-migration-hub": return "/migration";
    case "export-migration-project": return `/migration/${p.owner}/projects/${p.project}`;
    case "export-migration-issue-label-pairs": return `/migration/${p.owner}/projects/${p.project}/issuelabel`;
    case "export-migration-issues": return `/migration/${p.owner}/projects/${p.project}/issues`;
    case "export-migration-labels": return `/migration/${p.owner}/projects/${p.project}/labels`;
    case "export-migration-milestones": return `/migration/${p.owner}/projects/${p.project}/milestones`;
    case "export-migration-posts": return `/migration/${p.owner}/projects/${p.project}/posts`;
    case "export-migration-projects-list": return "/migration/projects";
    case "fetch-attachment-list": return "/files";
    case "fetch-git-info-refs": return `${base}/info/refs`;
    // Legacy SearchApp binds keyword + searchType (both required, 400
    // otherwise); `query` alone is not the legacy contract.
    case "search-in-project": return `${base}/search?keyword=${encodeURIComponent(p.query ?? "")}&searchType=${encodeURIComponent(p.searchType ?? "issue")}`;
    default: throw new Error(`unmapped action path: ${step.action}`);
  }
}
// Fragment/API payloads (JSON, CSS): verified via status parity only — a
// skeleton diff of raw JSON/CSS is noise, not signal.
const API_ONLY_ACTIONS = new Set([
  "fetch-issue-label-styles",
  "list-post-watchers",
  "fetch-mention-list",
  "fetch-mention-list-commit-diff",
  "fetch-mention-list-pull-request",
  "fetch-project-exports",
  "export-migration-project",
  "export-migration-issue-label-pairs",
  "export-migration-issues",
  "export-migration-labels",
  "export-migration-milestones",
  "export-migration-posts",
  "export-migration-projects-list",
  "fetch-attachment-list",
  "fetch-git-info-refs",
]);

// Same contract as readPageHandler above, for SPA-shell pages: skip DOM
// comparison when either side answered >=400 (a one-sided 404 — missing seed
// row, absent page — is already visible in entry.errors).
async function spaReadHandler(ctx) {
  const { step, resolved, options, yoramBaseUrl, helpers } = ctx;
  const { legacyResult, yoramResult } = await helpers.requestBoth(
    ctx,
    translateLegacy(step, resolved),
    translateYoram(step, resolved),
  );
  if (legacyResult.status >= 400 || yoramResult.status >= 400) return;
  if (API_ONLY_ACTIONS.has(step.action)) return;
  const path = readPath(step);
  await helpers.renderDomTarget(ctx, {
    legacy: `${options.legacyUrl}${path}`,
    yoram: `${yoramBaseUrl}${path}`,
    spa: true,
    ...(step.action === "list-review-threads" ? { selector: ".project-page-wrap" } : {}),
  });
}

// `/info/leave/:owner/:project` is an action redirect, not a page. Keep both
// responses manual so the comparison observes the status and Location header
// without following into an unrelated screen.
async function redirectReadHandler(ctx) {
  const { step, options, yoramBaseUrl, helpers } = ctx;
  const path = readPath(step);
  const [legacyResult, yoramResult] = await Promise.all([
    helpers.sendRaw(ctx, "legacy", { method: "GET", path, redirect: "manual" }),
    helpers.sendRaw(ctx, "yoram", { method: "GET", path, redirect: "manual" }),
  ]);
  const canonicalLocation = (location, baseUrl) => {
    if (!location) return "";
    try {
      const url = new URL(location, baseUrl);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return location;
    }
  };
  const legacy = {
    status: legacyResult.status,
    location: canonicalLocation(legacyResult.location, options.legacyUrl),
  };
  const yoram = {
    status: yoramResult.status,
    location: canonicalLocation(yoramResult.location, yoramBaseUrl),
  };
  if (legacy.status !== yoram.status || legacy.location !== yoram.location) {
    pushApiViolation(ctx, path, legacy, yoram);
  }
}

const READ_ACTION_NAMES = [
  "list-issue-labels",
  "view-issue-labels-form",
  "list-issue-label-categories",
  "view-issue-label-category",
  "fetch-issue-label-styles",
  "view-site-labels",
  "view-site-label-categories",
  "list-milestones",
  "view-milestone",
  "view-milestone-editform",
  "view-new-milestone-form",
  "list-posts",
  "view-post-form",
  "view-post",
  "view-post-editform",
  "list-post-watchers",
  "view-project-members",
  "view-project-watchers",
  "view-project-setting-form",
  "view-project-delete-form",
  "view-project-transfer-form",
  "view-project-webhooks",
  "view-project-statistics",
  "view-project-go-menu",
  "view-change-vcs-form",
  "fetch-mention-list",
  "fetch-mention-list-commit-diff",
  "fetch-mention-list-pull-request",
  "search-in-project",
  "fetch-project-exports",
  "list-review-threads",
  "view-project-leave-info",
  "view-migration-hub",
  "export-migration-project",
  "export-migration-issue-label-pairs",
  "export-migration-issues",
  "export-migration-labels",
  "export-migration-milestones",
  "export-migration-posts",
  "export-migration-projects-list",
  "fetch-attachment-list",
  "fetch-git-info-refs",
];

export const actionDefinitions = {
  "view-project": {
    translateLegacy(step) {
      return { method: "GET", path: `/${step.params.owner}/${step.params.project}` };
    },
    translateYoram(step) {
      return {
        method: "GET",
        path: `/api/v1/owners/${step.params.owner}/projects/${step.params.project}`,
        pagePath: `/${step.params.owner}/${step.params.project}`,
      };
    },
    handler: readPageHandler,
  },
  "list-labels": {
    translateLegacy(step) {
      return { method: "GET", path: `/${step.params.owner}/${step.params.project}/labels` };
    },
    translateYoram(step) {
      return {
        method: "GET",
        path: `/api/v1/owners/${step.params.owner}/projects/${step.params.project}/labels`,
        pagePath: `/${step.params.owner}/${step.params.project}/labels`,
      };
    },
    handler: readPageHandler,
  },
  ...Object.fromEntries(READ_ACTION_NAMES.map((name) => [
    name,
    {
      translateLegacy(step) {
        return { method: "GET", path: readPath(step) };
      },
      // Yoram serves pages via the SPA shell at the legacy direct route;
      // compat /-_-api/v1 reads go to the migrated RESTful path. pagePath
      // marks the DOM target for the runner.
      translateYoram(step) {
        const legacyPath = readPath(step);
        const path = legacyPath.startsWith("/-_-api/v1") ? compatToRest(legacyPath) : legacyPath;
        return { method: "GET", path, pagePath: path };
      },
      handler: spaReadHandler,
    },
  ])),
  "view-project-leave-info": {
    translateLegacy(step) {
      return { method: "GET", path: readPath(step), redirect: "manual" };
    },
    translateYoram(step) {
      return { method: "GET", path: readPath(step), redirect: "manual" };
    },
    handler: redirectReadHandler,
  },
  "view-site-labels": {
    translateLegacy() {
      return { method: "GET", path: "/labels?limit=1000", headers: { Accept: "application/json" } };
    },
    translateYoram() {
      return { method: "GET", path: "/labels?limit=1000", headers: { Accept: "application/json" } };
    },
    async handler(ctx) {
      await ctx.helpers.requestBoth(ctx, translateLegacy(ctx.step), translateYoram(ctx.step));
    },
  },
  "view-site-label-categories": {
    translateLegacy() {
      return { method: "GET", path: "/categories?limit=1000", headers: { Accept: "application/json" } };
    },
    translateYoram() {
      return { method: "GET", path: "/categories?limit=1000", headers: { Accept: "application/json" } };
    },
    async handler(ctx) {
      await ctx.helpers.requestBoth(ctx, translateLegacy(ctx.step), translateYoram(ctx.step));
    },
  },
};

// --- mutation wave -----------------------------------------------------------
//
// Divergence rule: pairRequest pushes an api violation when either side fails
// (>=400) or the status classes diverge, then later steps degrade into entry
// errors — a scenario never throws on a mutation mismatch.



function statusClass(status) {
  return Math.floor(status / 100);
}

function pushApiViolation(ctx, route, expected, actual) {
  ctx.entry.violations.push(
    violation({ route, behaviorId: ctx.step.behaviorId ?? null, kind: "api", expected, actual }),
  );
}

async function pairRequest(ctx, legacyTranslation, yoramTranslation, route) {
  const legacyResult = await ctx.helpers.sendRaw(ctx, "legacy", legacyTranslation);
  const yoramResult = await ctx.helpers.sendRaw(ctx, "yoram", yoramTranslation);
  // Same agreement rule as helpers.pairLenient: identical statuses (including
  // agreed errors) are parity; only divergence is reported.
  if (
    statusClass(legacyResult.status) !== statusClass(yoramResult.status) ||
    (legacyResult.status >= 400) !== (yoramResult.status >= 400)
  ) {
    pushApiViolation(ctx, route, { status: legacyResult.status }, { status: yoramResult.status });
  }
  return { legacyResult, yoramResult };
}

function numberFrom(pattern, value) {
  const match = pattern.exec(value ?? "");
  return (match && Number(match[1])) || null;
}

function idFromJson(json) {
  // Post payloads key routes on `postNumber`; the DB `id` is not route-addressable.
  return Number(json?.postNumber ?? json?.number ?? json?.milestone?.id ?? json?.comment?.id ?? json?.id) || null;
}

function findUserId(node, loginId) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findUserId(item, loginId);
      if (hit !== null) return hit;
    }
    return null;
  }
  if (node && typeof node === "object") {
    if (node.loginId === loginId) {
      return Number(node.userId ?? node.user?.id ?? node.id) || null;
    }
    for (const value of Object.values(node)) {
      const hit = findUserId(value, loginId);
      if (hit !== null) return hit;
    }
  }
  return null;
}

function baseParams(step) {
  return { owner: step.params.owner, project: step.params.project };
}

function restBase(step) {
  return `/api/v1/owners/${step.params.owner}/projects/${step.params.project}`;
}

function legacyApiBase(step) {
  return `/-_-api/v1/owners/${step.params.owner}/projects/${step.params.project}`;
}

// Yoram's migrated owner-scoped compat family keeps the /api/v1/owners/{o}/
// projects/{p} prefix while legacy keeps its external /-_-api/v1 spelling
// (restful-uri-mapping v1).
const yoramApiBase = (step) => `/api/v1/owners/${step.params.owner}/projects/${step.params.project}`;

// Legacy /-_-api/v1 path → its RESTful /api/v1 counterpart (renamed rows of
// restful-uri-mapping v1); unchanged spellings only need the prefix swap.
function compatToRest(path) {
  return `/api/v1${path.slice("/-_-api/v1".length)}`
    .replace(/^\/favorite(Issues|Projects|Organizations)(?=\/|$)/u, (_, kind) => `/user/favorites/${kind.toLowerCase()}`)
    .replace(/\/issuelabel\/([^/?]+)/u, "/issues/$1/labels")
    .replace(/\/postlabel\/([^/?]+)/u, "/posts/$1/labels")
    .replace(/\/assignableUsers(?=\/|\?|$)/u, "/assignable-users/find")
    .replace(/\/findSharer(?=\/|\?|$)/u, "/sharers/find")
    .replace(/\/sharableUsers(?=\/|\?|$)/u, "/sharable-users/find")
    .replace(/\/titleHeads(?=\/|\?|$)/u, "/title-heads/find")
    .replace(/\/upvoteWeight(?=\/|\?|$)/u, "/weight/upvote")
    .replace(/\/downvoteWeight(?=\/|\?|$)/u, "/weight/downvote")
    .replace(/\/detectChange(?=\/|\?|$)/u, "/detect-change")
    .replace(/\/commentNotiReceivers(?=\/|\?|$)/u, "/comments/notification-receivers")
    .replace(/\/share(?=\/|\?|$)/u, "/sharers");
}

const SEED_OVERVIEW = "Parity seed project for the admin workspace";

function milestonePlan(suffix, edited = false) {
  const title = `parity-milestone-${suffix}${edited ? "-edited" : ""}`;
  // Legacy Play binds java Date via request locale — ISO strings fail binding
  // and re-render the form; empty string binds null on both sides.
  return { title, content: `parity milestone body ${suffix}`, dueDate: "" };
}

function postPlan(suffix, edited = false) {
  const title = `parity-post-${suffix}${edited ? "-edited" : ""}`;
  const body = `parity post body ${suffix}${edited ? " (edited)" : ""}`;
  return { title, body };
}

async function deletePairs(ctx, pairs, routeFor, legacyPathFor, yoramPathFor) {
  for (const [legacyId, yoramId] of pairs) {
    if (!legacyId && !yoramId) continue;
    await ctx.helpers.pairLenient(
      ctx,
      { method: "DELETE", path: legacyPathFor(legacyId) },
      { method: "DELETE", path: yoramPathFor(yoramId) },
      routeFor,
    );
  }
}

const MUTATION_ACTIONS = {
  "create-milestone": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/milestones`, form: { title: resolved.title, contents: resolved.content, state: "OPEN", dueDate: resolved.dueDate } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `${restBase(step)}/milestones`, json: { title: resolved.title, contentsMarkdown: resolved.content, dueDate: resolved.dueDate, state: "open", attachmentIds: [] } };
    },
    async handler(ctx) {
      const { step, state, suffix } = ctx;
      const plan = milestonePlan(suffix);
      const { legacyResult, yoramResult } = await ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, plan),
        this.translateYoram(step, plan),
        `${step.params.owner}/${step.params.project}/milestones (create)`,
      );
      state.pmL = numberFrom(/\/milestone\/(\d+)/, legacyResult.location);
      state.pmY = idFromJson(yoramResult.json);
      if ((state.pmL === null) !== (state.pmY === null)) {
        pushApiViolation(ctx, `${step.params.owner}/${step.params.project}/milestones (create id)`, { id: state.pmL }, { id: state.pmY });
      }
    },
  },

  "edit-milestone": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/milestone/${resolved.milestoneId}/edit`, form: { title: resolved.title, contents: resolved.content, state: "OPEN", dueDate: resolved.dueDate } };
    },
    translateYoram(step, resolved) {
      return { method: "PATCH", path: `${restBase(step)}/milestones/${resolved.milestoneId}`, json: { title: resolved.title, contentsMarkdown: resolved.content, dueDate: resolved.dueDate, state: "open", attachmentIds: [] } };
    },
    async handler(ctx) {
      const { step, state } = ctx;
      if (!state.pmL || !state.pmY) return;
      const plan = milestonePlan(ctx.suffix, true);
      await ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, { ...plan, milestoneId: state.pmL }),
        this.translateYoram(step, { ...plan, milestoneId: state.pmY }),
        `${step.params.owner}/${step.params.project}/milestone (edit)`,
      );
    },
  },

  "close-milestone": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/milestone/${resolved.milestoneId}/close` };
    },
    translateYoram(step, resolved) {
      return { method: "PATCH", path: `${restBase(step)}/milestones/${resolved.milestoneId}/state`, json: { state: "closed" } };
    },
    handler(ctx) {
      const { step, state } = ctx;
      if (!state.pmL || !state.pmY) return;
      return ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, { milestoneId: state.pmL }),
        this.translateYoram(step, { milestoneId: state.pmY }),
        `${step.params.owner}/${step.params.project}/milestone (close)`,
      );
    },
  },

  "open-milestone": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/milestone/${resolved.milestoneId}/open` };
    },
    translateYoram(step, resolved) {
      return { method: "PATCH", path: `${restBase(step)}/milestones/${resolved.milestoneId}/state`, json: { state: "open" } };
    },
    handler(ctx) {
      const { step, state } = ctx;
      if (!state.pmL || !state.pmY) return;
      return ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, { milestoneId: state.pmL }),
        this.translateYoram(step, { milestoneId: state.pmY }),
        `${step.params.owner}/${step.params.project}/milestone (open)`,
      );
    },
  },

  "create-milestone-api": {
    // Legacy external API shape: {"milestones":[...]} — same path on both sides.
    translateLegacy(step, resolved) {
      return { method: "POST", path: `${legacyApiBase(step)}/milestones`, json: { milestones: [{ title: resolved.title, contents: resolved.content, dueDate: resolved.dueDate, state: "open" }] } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `${yoramApiBase(step)}/milestones/bulk`, json: { milestones: [{ title: resolved.title, contents: resolved.content, dueDate: resolved.dueDate, state: "open" }] } };
    },
    async handler(ctx) {
      const { step, state, suffix } = ctx;
      const plan = { title: `parity-milestone-api-${suffix}`, content: `parity milestone api body ${suffix}`, dueDate: "2026-12-31" };
      const translation = this.translateLegacy(step, plan);
      const { legacyResult, yoramResult } = await pairRequest(ctx, translation, this.translateYoram(step, plan), `${legacyApiBase(step)}/milestones`);
      state.pmApiL = Number(legacyResult.json?.[0]?.id) || null;
      state.pmApiY = Number(yoramResult.json?.[0]?.id) || null;
      if ((state.pmApiL === null) !== (state.pmApiY === null)) {
        pushApiViolation(ctx, `${legacyApiBase(step)}/milestones (create id)`, { id: state.pmApiL }, { id: state.pmApiY });
      }
    },
  },

  "delete-milestone": {
    translateLegacy(step, resolved) {
      return { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/milestone/${resolved.milestoneId}/delete` };
    },
    translateYoram(step, resolved) {
      return { method: "DELETE", path: `${restBase(step)}/milestones/${resolved.milestoneId}` };
    },
    async handler(ctx) {
      const { step, state } = ctx;
      await deletePairs(
        ctx,
        [
          [state.pmL, state.pmY],
          [state.pmApiL, state.pmApiY],
        ],
        `${step.params.owner}/${step.params.project}/milestone (delete)`,
        (id) => this.translateLegacy(step, { milestoneId: id }).path,
        (id) => this.translateYoram(step, { milestoneId: id }).path,
      );
      state.pmL = state.pmY = state.pmApiL = state.pmApiY = null;
    },
  },

  "create-post": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/posts`, form: { title: resolved.title, body: resolved.body, issueTemplate: "", branch: "", path: "" } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/api/v1/projects/${step.params.owner}/${step.params.project}/posts`, json: { title: resolved.title, bodyMarkdown: resolved.body, edit: false } };
    },
    async handler(ctx) {
      const { step, state, suffix } = ctx;
      const plan = postPlan(suffix);
      const { legacyResult, yoramResult } = await ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, plan),
        this.translateYoram(step, plan),
        `${step.params.owner}/${step.params.project}/posts (create)`,
      );
      state.postL = numberFrom(/\/post\/(\d+)/, legacyResult.location);
      state.postY = idFromJson(yoramResult.json);
      if ((state.postL === null) !== (state.postY === null)) {
        pushApiViolation(ctx, `${step.params.owner}/${step.params.project}/posts (create id)`, { number: state.postL }, { number: state.postY });
      }
    },
  },

  "edit-post": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/post/${resolved.postNumber}/edit`, form: { title: resolved.title, body: resolved.body, issueTemplate: "", branch: "", path: "" } };
    },
    translateYoram(step, resolved) {
      return { method: "PATCH", path: `/api/v1/projects/${step.params.owner}/${step.params.project}/posts/${resolved.postNumber}`, json: { title: resolved.title, bodyMarkdown: resolved.body, edit: true } };
    },
    async handler(ctx) {
      const { step, state } = ctx;
      if (!state.postL || !state.postY) return;
      const plan = postPlan(ctx.suffix, true);
      await ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, { ...plan, postNumber: state.postL }),
        this.translateYoram(step, { ...plan, postNumber: state.postY }),
        `${step.params.owner}/${step.params.project}/post (edit)`,
      );
    },
  },

  "patch-post-content-api": {
    // Legacy external API: PATCH content with optimistic-concurrency original.
    translateLegacy(step, resolved) {
      return { method: "PATCH", path: `${legacyApiBase(step)}/posts/${resolved.postNumber}/content`, json: { content: resolved.content, original: resolved.original } };
    },
    translateYoram(step, resolved) {
      return { method: "PATCH", path: `${yoramApiBase(step)}/posts/${resolved.postNumber}/content`, json: { content: resolved.content, original: resolved.original } };
    },
    async handler(ctx) {
      const { step, state, suffix } = ctx;
      if (!state.postL || !state.postY) return;
      const plan = { content: `parity api content ${suffix}`, original: postPlan(suffix, true).body };
      await pairRequest(
        ctx,
        this.translateLegacy(step, { ...plan, postNumber: state.postL }),
        this.translateYoram(step, { ...plan, postNumber: state.postY }),
        `${legacyApiBase(step)}/posts/:number/content`,
      );
    },
  },

  "set-post-labels-api": {
    translateLegacy(step) {
      return { method: "POST", path: `${legacyApiBase(step)}/postlabel/${step.params.postNumber ?? 0}`, json: [] };
    },
    translateYoram(step) {
      return { method: "POST", path: `${yoramApiBase(step)}/posts/${step.params.postNumber ?? 0}/labels`, json: [] };
    },
    async handler(ctx) {
      const { step, state } = ctx;
      if (!state.postL || !state.postY) return;
      await pairRequest(
        ctx,
        this.translateLegacy(step, { postNumber: state.postL }),
        this.translateYoram(step, { postNumber: state.postY }),
        `${legacyApiBase(step)}/postlabel/:number`,
      );
    },
  },

  "create-post-comment": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/post/${resolved.postNumber}/comment`, form: { contents: resolved.body } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/api/v1/projects/${step.params.owner}/${step.params.project}/posts/${resolved.postNumber}/comments`, json: { contentsMarkdown: resolved.body } };
    },
    async handler(ctx) {
      const { step, state, suffix } = ctx;
      if (!state.postL || !state.postY) return;
      const plan = { body: `parity-comment-${suffix}` };
      const { legacyResult, yoramResult } = await ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, { ...plan, postNumber: state.postL }),
        this.translateYoram(step, { ...plan, postNumber: state.postY }),
        `${step.params.owner}/${step.params.project}/post comment (create)`,
      );
      state.commentL = numberFrom(/#comment-(\d+)/, legacyResult.location);
      // Yoram create returns the whole post detail; the new comment is the
      // max comment id (the sweep actor authored every comment on this fresh post).
      state.commentY =
        (yoramResult.json?.comments ?? []).reduce(
          (max, comment) => Math.max(max, Number(comment?.id) || 0),
          0,
        ) || null;
      if ((state.commentL === null) !== (state.commentY === null)) {
        pushApiViolation(ctx, `${step.params.owner}/${step.params.project}/post comment (create id)`, { id: state.commentL }, { id: state.commentY });
      }
    },
  },

  "update-post-comment": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/post/${resolved.postNumber}/comment/${resolved.commentId}`, form: { contents: resolved.body } };
    },
    translateYoram(step, resolved) {
      return { method: "PATCH", path: `/api/v1/projects/${step.params.owner}/${step.params.project}/posts/${resolved.postNumber}/comments/${resolved.commentId}`, json: { contentsMarkdown: resolved.body } };
    },
    async handler(ctx) {
      const { step, state, suffix } = ctx;
      if (!state.commentL || !state.commentY) return;
      const plan = { body: `parity-comment-${suffix}-edited` };
      // Legacy BoardApp.updateComment reuses newComment's PostingComment bind:
      // the edit form carries the hidden `id` field, without which legacy
      // CREATES a new comment instead of updating.
      const legacyTranslation = {
        ...this.translateLegacy(step, { ...plan, postNumber: state.postL, commentId: state.commentL }),
        form: { id: String(state.commentL), contents: plan.body },
      };
      const yoramTranslation = {
        ...this.translateYoram(step, { ...plan, postNumber: state.postY, commentId: state.commentY }),
        json: { contentsMarkdown: plan.body },
      };
      const { legacyResult, yoramResult } = await ctx.helpers.pairLenient(
        ctx,
        legacyTranslation,
        yoramTranslation,
        `${step.params.owner}/${step.params.project}/post comment (update)`,
      );
      // Downstream PATCH pairs are only measurable when the update verifiably
      // applied on BOTH sides; keep the raw statuses for the skip reason.
      state.postUpdateStatusLegacy = legacyResult.status;
      state.postUpdateStatusYoram = yoramResult.status;
    },
  },

  "patch-post-comment-api": {
    // Legacy direct PATCH route (no -_-api prefix): {"content","original"}.
    translateLegacy(step, resolved) {
      return { method: "PATCH", path: `/${step.params.owner}/${step.params.project}/post/${resolved.postNumber}/comment/${resolved.commentId}`, json: { content: resolved.content, original: resolved.original } };
    },
    translateYoram(step, resolved) {
      return { method: "PATCH", path: `/${step.params.owner}/${step.params.project}/post/${resolved.postNumber}/comment/${resolved.commentId}`, json: { content: resolved.content, original: resolved.original } };
    },
    async handler(ctx) {
      const { step, state, entry, suffix } = ctx;
      if (!state.commentL || !state.commentY) return;
      if (
        !state.postUpdateStatusLegacy ||
        state.postUpdateStatusLegacy >= 400 ||
        !state.postUpdateStatusYoram ||
        state.postUpdateStatusYoram >= 400
      ) {
        throw new HarnessError(
          `patch-post-comment-api: post-update did not verifiably apply on both sides (legacy=${state.postUpdateStatusLegacy ?? "n/a"} yoram=${state.postUpdateStatusYoram ?? "n/a"}) — PATCH pair skipped`,
        );
      }
      const plan = { content: `parity-comment-${suffix}-api`, original: `parity-comment-${suffix}-edited` };
      const route = `${step.params.owner}/${step.params.project}/post/:number/comment/:commentId (PATCH)`;
      const legacyResult = await ctx.helpers.sendRaw(ctx, "legacy", this.translateLegacy(step, { ...plan, postNumber: state.postL, commentId: state.commentL }));
      const yoramResult = await ctx.helpers.sendRaw(ctx, "yoram", this.translateYoram(step, { ...plan, postNumber: state.postY, commentId: state.commentY }));
      const diverged =
        statusClass(legacyResult.status) !== statusClass(yoramResult.status) ||
        (legacyResult.status >= 400) !== (yoramResult.status >= 400);
      if (diverged) {
        pushApiViolation(ctx, route, { status: legacyResult.status, originalSent: plan.original }, { status: yoramResult.status, originalSent: plan.original });
      }
    },
  },

  "delete-post-comment": {
    translateLegacy(step, resolved) {
      return { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/post/${resolved.postNumber}/comment/${resolved.commentId}/delete` };
    },
    translateYoram(step, resolved) {
      return { method: "DELETE", path: `/api/v1/projects/${step.params.owner}/${step.params.project}/posts/${resolved.postNumber}/comments/${resolved.commentId}` };
    },
    async handler(ctx) {
      const { step, state } = ctx;
      if (!state.commentL || !state.commentY) return;
      await ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, { postNumber: state.postL, commentId: state.commentL }),
        this.translateYoram(step, { postNumber: state.postY, commentId: state.commentY }),
        `${step.params.owner}/${step.params.project}/post comment (delete)`,
      );
      state.commentL = state.commentY = null;
    },
  },

  "create-post-api": {
    // Legacy external API shape: {"posts":[...]} — same path on both sides.
    translateLegacy(step, resolved) {
      return { method: "POST", path: `${legacyApiBase(step)}/posts`, json: { posts: [{ title: resolved.title, body: resolved.body }] } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `${yoramApiBase(step)}/posts`, json: { posts: [{ title: resolved.title, body: resolved.body }] } };
    },
    async handler(ctx) {
      const { step, state, suffix } = ctx;
      const plan = { title: `parity-post-api-${suffix}`, body: `parity api post body ${suffix}` };
      const { legacyResult, yoramResult } = await pairRequest(ctx, this.translateLegacy(step, plan), this.translateYoram(step, plan), `${legacyApiBase(step)}/posts`);
      state.postApiL = numberFrom(/\/post\/(\d+)/, legacyResult.json?.[0]?.location);
      state.postApiY = numberFrom(/\/post\/(\d+)/, yoramResult.json?.[0]?.location);
      if ((state.postApiL === null) !== (state.postApiY === null)) {
        pushApiViolation(ctx, `${legacyApiBase(step)}/posts (create id)`, { number: state.postApiL }, { number: state.postApiY });
      }
    },
  },

  "delete-post": {
    translateLegacy(step, resolved) {
      return { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/post/${resolved.postNumber}/delete` };
    },
    translateYoram(step, resolved) {
      return { method: "DELETE", path: `/api/v1/projects/${step.params.owner}/${step.params.project}/posts/${resolved.postNumber}` };
    },
    async handler(ctx) {
      const { step, state } = ctx;
      await deletePairs(
        ctx,
        [
          [state.postL, state.postY],
          [state.postApiL, state.postApiY],
        ],
        `${step.params.owner}/${step.params.project}/post (delete)`,
        (id) => this.translateLegacy(step, { postNumber: id }).path,
        (id) => this.translateYoram(step, { postNumber: id }).path,
      );
      state.postL = state.postY = state.postApiL = state.postApiY = null;
    },
  },

  "create-webhook": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/webhooks`, form: { payloadUrl: resolved.payloadUrl, secret: "parity-secret", webhookType: "SIMPLE" } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `${yoramApiBase(step)}/webhooks`, json: { payloadUrl: resolved.payloadUrl, secret: "parity-secret", webhookType: "SIMPLE", gitPush: true } };
    },
    async handler(ctx) {
      const { step, state, suffix, options, yoramBaseUrl } = ctx;
      const plan = { payloadUrl: `https://parity.example/${suffix}` };
      const { legacyResult, yoramResult } = await ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, plan),
        this.translateYoram(step, plan),
        `${step.params.owner}/${step.params.project}/webhooks (create)`,
      );
      // Create/list return the project webhooks envelope; match this run's
      // suffix-tagged payload URL.
      const hooks = Array.isArray(yoramResult.json) ? yoramResult.json : yoramResult.json?.webhooks ?? [];
      state.webhookY =
        Number(hooks.find((hook) => String(hook.payloadUrl ?? "").includes(suffix))?.id) || null;
      if (state.webhookY === null) {
        const list = await ctx.helpers.sendRaw(ctx, "yoram", { method: "GET", path: `${yoramApiBase(step)}/webhooks` });
        const mine = ((Array.isArray(list.json) ? list.json : list.json?.webhooks) ?? []).filter((hook) => String(hook.payloadUrl ?? "").includes(suffix));
        state.webhookY = Number(mine[0]?.id) || null;
      }
      if (legacyResult.status < 400) {
        const page = await ctx.helpers.sendRaw(ctx, "legacy", { method: "GET", path: `/${step.params.owner}/${step.params.project}/webhooks` });
        // Rows carry data-webhook-id followed by the payload URL; pick the
        // row whose URL matches this run's suffix (max-id breaks once earlier
        // sweeps leave webhooks behind).
        const mine = page.body
          .split(/data-webhook-id="/u)
          .slice(1)
          .find((chunk) => chunk.includes(suffix));
        state.webhookL = mine ? Number((/(\d+)/.exec(mine) ?? [])[1]) || null : null;
      }
    },
  },

  "delete-webhook": {
    translateLegacy(step, resolved) {
      return { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/webhooks/${resolved.webhookId}` };
    },
    translateYoram(step, resolved) {
      return { method: "DELETE", path: `${yoramApiBase(step)}/webhooks/${resolved.webhookId}` };
    },
    async handler(ctx) {
      const { step, state } = ctx;
      if (!state.webhookL && !state.webhookY) return;
      await ctx.helpers.pairLenient(
        ctx,
        { method: "DELETE", path: this.translateLegacy(step, { webhookId: state.webhookL ?? 0 }).path },
        { method: "DELETE", path: this.translateYoram(step, { webhookId: state.webhookY ?? 0 }).path },
        `${step.params.owner}/${step.params.project}/webhooks (delete)`,
      );
      state.webhookL = state.webhookY = null;
    },
  },

  "watch-project": {
    translateLegacy(step) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/watch` };
    },
    translateYoram(step) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/watch` };
    },
    handler(ctx) {
      const { step } = ctx;
      return ctx.helpers.pairLenient(ctx, this.translateLegacy(step), this.translateYoram(step), `${step.params.owner}/${step.params.project}/watch`);
    },
  },

  "unwatch-project": {
    translateLegacy(step) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/unwatch` };
    },
    translateYoram(step) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/unwatch` };
    },
    handler(ctx) {
      const { step } = ctx;
      return ctx.helpers.pairLenient(ctx, this.translateLegacy(step), this.translateYoram(step), `${step.params.owner}/${step.params.project}/unwatch`);
    },
  },

  "create-label-api": {
    // Legacy external API label create — same path on both sides. The label
    // row remains in both DBs with identical suffix-tagged content (no legacy
    // delete route for project labels); the db projection sees equal rows.
    translateLegacy(step, resolved) {
      return { method: "POST", path: `${legacyApiBase(step)}/labels`, json: { name: resolved.name, category: resolved.category } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `${yoramApiBase(step)}/labels/bulk`, json: { name: resolved.name, category: resolved.category } };
    },
    async handler(ctx) {
      const { step, suffix } = ctx;
      const plan = { name: `parity-apilabel-${suffix}`, category: "parity" };
      await pairRequest(ctx, this.translateLegacy(step, plan), this.translateYoram(step, plan), `${legacyApiBase(step)}/labels`);
    },
  },

  "attach-project-label": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/labels`, form: { category: resolved.category, name: resolved.name }, headers: { "content-type": "application/x-www-form-urlencoded" } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/labels`, form: { category: resolved.category, name: resolved.name } };
    },
    async handler(ctx) {
      const { step, state, suffix } = ctx;
      const plan = { category: "parity", name: `parity-label-${suffix}` };
      const { legacyResult, yoramResult } = await pairRequest(ctx, this.translateLegacy(step, plan), this.translateYoram(step, plan), `${step.params.owner}/${step.params.project}/labels (attach)`);
      state.labelL = Number(Object.keys(legacyResult.json ?? {})[0]) || null;
      state.labelY = Number(Object.keys(yoramResult.json ?? {})[0]) || null;
      if ((state.labelL === null) !== (state.labelY === null)) {
        pushApiViolation(ctx, `${step.params.owner}/${step.params.project}/labels (attach id)`, { id: state.labelL }, { id: state.labelY });
      }
    },
  },

  "detach-project-label": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/labels/${resolved.labelId}`, form: { _method: "detach" }, headers: { "content-type": "application/x-www-form-urlencoded" } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/labels/${resolved.labelId}`, form: { _method: "detach" } };
    },
    async handler(ctx) {
      const { step, state } = ctx;
      if (!state.labelL && !state.labelY) return;
      await pairRequest(
        ctx,
        this.translateLegacy(step, { labelId: state.labelL ?? 0 }),
        this.translateYoram(step, { labelId: state.labelY ?? 0 }),
        `${step.params.owner}/${step.params.project}/labels (detach)`,
      );
      state.labelL = state.labelY = null;
    },
  },

  "add-project-member": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/members`, form: { loginId: resolved.loginId } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/members`, form: { loginId: resolved.loginId } };
    },
    async handler(ctx) {
      const { step, state, entry, options, yoramBaseUrl } = ctx;
      const loginId = step.params.loginId ?? "bob";
      // Idempotent pre-clean: a leftover membership from an aborted earlier
      // run makes the add diverge (legacy re-adds with 303 while yoram
      // rejects the duplicate with 400), so drop it on both sides first.
      const preLegacy = await ctx.helpers.sendRaw(ctx, "legacy", { method: "GET", path: `/${step.params.owner}/${step.params.project}/members` });
      const preLegacyUid = numberFrom(new RegExp(`member\\/(\\d+)\\/edit"[^>]*data-loginId="${loginId}"`, "u"), preLegacy.body);
      if (preLegacyUid) {
        await ctx.helpers.sendRaw(ctx, "legacy", { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/member/${preLegacyUid}/delete` });
      }
      const preYoram = await ctx.helpers.sendRaw(ctx, "yoram", { method: "GET", path: `${restBase(step)}/members` });
      const preYoramUid = findUserId(preYoram.json, loginId);
      if (preYoramUid) {
        await ctx.helpers.sendRaw(ctx, "yoram", { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/member/${preYoramUid}/delete` });
      }
      const { legacyResult, yoramResult } = await ctx.helpers.pairLenient(ctx, this.translateLegacy(step, { loginId }), this.translateYoram(step, { loginId }), `${step.params.owner}/${step.params.project}/members (add)`);
      if (legacyResult.status < 400) {
        const page = await ctx.helpers.sendRaw(ctx, "legacy", { method: "GET", path: `/${step.params.owner}/${step.params.project}/members` });
        state.memberUidL = numberFrom(new RegExp(`member\\/(\\d+)\\/edit"[^>]*data-loginId="${loginId}"`, "u"), page.body);
      }
      if (yoramResult.status < 400) {
        const list = await ctx.helpers.sendRaw(ctx, "yoram", { method: "GET", path: `${restBase(step)}/members` });
        state.memberUidY = findUserId(list.json, loginId);
      }
      if ((state.memberUidL === null) !== (state.memberUidY === null)) {
        entry.errors.push(`member id discovery diverged: legacy=${state.memberUidL} yoram=${state.memberUidY}`);
      }
    },
  },

  "remove-project-member": {
    translateLegacy(step, resolved) {
      return { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/member/${resolved.userId}/delete` };
    },
    translateYoram(step, resolved) {
      return { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/member/${resolved.userId}/delete` };
    },
    async handler(ctx) {
      const { step, state } = ctx;
      if (!state.memberUidL && !state.memberUidY) return;
      await ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, { userId: state.memberUidL ?? 0 }),
        this.translateYoram(step, { userId: state.memberUidY ?? 0 }),
        `${step.params.owner}/${step.params.project}/member (delete)`,
      );
      state.memberUidL = state.memberUidY = null;
    },
  },

  "update-project-overview": {
    translateLegacy(step, resolved) {
      return { method: "PUT", path: `/${step.params.owner}/${step.params.project}`, json: { overview: resolved.overview } };
    },
    translateYoram(step, resolved) {
      return { method: "PUT", path: `/${step.params.owner}/${step.params.project}`, json: { overview: resolved.overview } };
    },
    async handler(ctx) {
      const { step, suffix } = ctx;
      const base = `${step.params.owner}/${step.params.project} (overview)`;
      const set = await pairRequest(ctx, this.translateLegacy(step, { overview: `parity-overview-${suffix}` }), this.translateYoram(step, { overview: `parity-overview-${suffix}` }), base);
      if (set.legacyResult.status < 400 && set.yoramResult.status < 400) {
        // restore the parity seed overview so later sweeps see unchanged state
        await pairRequest(ctx, this.translateLegacy(step, { overview: SEED_OVERVIEW }), this.translateYoram(step, { overview: SEED_OVERVIEW }), `${base} restore`);
      }
    },
  },

  "render-markdown-preview": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/markdown/${step.params.owner}/${step.params.project}`, json: { body: resolved.body, breaks: true } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/markdown/${step.params.owner}/${step.params.project}`, json: { body: resolved.body, breaks: true } };
    },
    async handler(ctx) {
      const { step, suffix } = ctx;
      const plan = { body: `**parity-markdown-${suffix}**` };
      await pairRequest(ctx, this.translateLegacy(step, plan), this.translateYoram(step, plan), `/markdown/${step.params.owner}/${step.params.project}`);
    },
  },

  "enroll-project": {
    translateLegacy(step) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/enroll`, form: { _method: "enroll" } };
    },
    translateYoram(step) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/enroll`, form: { _method: "enroll" } };
    },
    handler(ctx) {
      const { step } = ctx;
      return ctx.helpers.pairLenient(ctx, this.translateLegacy(step), this.translateYoram(step), `${step.params.owner}/${step.params.project}/enroll`);
    },
  },

  "cancel-enroll-project": {
    translateLegacy(step) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/cancel/enroll`, form: { _method: "cancel" } };
    },
    translateYoram(step) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/cancel/enroll`, form: { _method: "cancel" } };
    },
    handler(ctx) {
      const { step } = ctx;
      return ctx.helpers.pairLenient(ctx, this.translateLegacy(step), this.translateYoram(step), `${step.params.owner}/${step.params.project}/cancel/enroll`);
    },
  },

  "set-issue-labels-api": {
    // Creates a suffix-tagged issue on each side (title-tagged rows are
    // tag-filtered out of the db-issues projection), then clears its label
    // set through the legacy external API — same path on both sides.
    translateLegacy(step, resolved) {
      if (resolved.phase === "issue") {
        return { method: "POST", path: `/${step.params.owner}/${step.params.project}/issues/latest`, form: { title: resolved.title, body: resolved.body } };
      }
      return { method: "POST", path: `${legacyApiBase(step)}/issuelabel/${resolved.issueNumber}`, json: [] };
    },
    translateYoram(step, resolved) {
      if (resolved.phase === "issue") {
        return { method: "POST", path: `/api/v1/projects/${step.params.owner}/${step.params.project}/issues`, json: { title: resolved.title, bodyMarkdown: resolved.body, assigneeLoginId: "", attachmentIds: [], labelIds: [], dueDate: "", isDraft: false, isPublish: true } };
      }
      return { method: "POST", path: `${yoramApiBase(step)}/issues/${resolved.issueNumber}/labels`, json: [] };
    },
    async handler(ctx) {
      const { step, state, suffix } = ctx;
      const plan = { phase: "issue", title: `parity-ilabel-${suffix}`, body: `parity issue label probe ${suffix}` };
      const { legacyResult, yoramResult } = await ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, plan),
        this.translateYoram(step, plan),
        `${step.params.owner}/${step.params.project}/issues (label probe create)`,
      );
      state.issueLabelProbeL = numberFrom(/\/issue\/(\d+)/, legacyResult.location);
      state.issueLabelProbeY = idFromJson(yoramResult.json);
      if (!state.issueLabelProbeL || !state.issueLabelProbeY) return;
      await pairRequest(
        ctx,
        this.translateLegacy(step, { issueNumber: state.issueLabelProbeL }),
        this.translateYoram(step, { issueNumber: state.issueLabelProbeY }),
        `${legacyApiBase(step)}/issuelabel/:number`,
      );
      // Delete the probe issue on both sides so the db-issues projection sees
      // no yoram-only residue from this scenario.
      await ctx.helpers.pairLenient(
        ctx,
        { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/issue/${state.issueLabelProbeL}/delete` },
        { method: "DELETE", path: `/api/v1/projects/${step.params.owner}/${step.params.project}/issues/${state.issueLabelProbeY}` },
        `${step.params.owner}/${step.params.project}/issue (label probe delete)`,
      );
      state.issueLabelProbeL = state.issueLabelProbeY = null;
    },
  },
};

// --- wave 3: throwaway-entity lifecycles -------------------------------------
//
// Every mutation here targets entities created (and destroyed) inside the
// scenario itself — a suffix-tagged project, user-scope attachments, and a
// closed PR restored then re-closed. Nothing below mutates seeded state.
//
// Status conventions verified against both sources:
//   legacy Play form POSTs redirect (303) unless XHR (204); yoram REST returns
//   200/204. pairLenient accepts any <400 on both sides for such mixed pairs.

const XHR_HEADER = { "x-requested-with": "XMLHttpRequest" };

function multipartBody(fields = {}, file = null) {
  const boundary = `parity-${Math.random().toString(16).slice(2)}`;
  const encoder = new TextEncoder();
  const chunks = [];
  let total = 0;
  const push = (text) => {
    const chunk = encoder.encode(text);
    chunks.push(chunk);
    total += chunk.length;
  };
  for (const [name, value] of Object.entries(fields)) {
    push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  }
  if (file) {
    push(`--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: text/plain\r\n\r\n`);
    push(file.content);
    push("\r\n");
  }
  push(`--${boundary}--\r\n`);
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return { contentType: `multipart/form-data; boundary=${boundary}`, body };
}

// The throwaway project name lives in scenario state (created by
// create-project with the run-unique suffix); translators fall back to
// step.params.project only so static translator tests stay expressible.
function projectNameOf(step, resolved) {
  return resolved.projectName ?? step.params.project;
}

function attachmentPlan(suffix) {
  return { filename: `parity-${suffix}.txt`, content: `parity attachment payload ${suffix}\n` };
}

// Locate a closed main->feature/ui pull request per side (the residue R13
// leaves behind). Legacy discovery parses the closed-list page HTML; yoram
// uses its REST list. Returns per-side numbers or null.
async function discoverClosedRestorePr(ctx, owner, project) {
  const { options, yoramBaseUrl } = ctx;
  const yoramList = await ctx.helpers.sendRaw(ctx, "yoram", {
    method: "GET",
    path: `/api/v1/owners/${owner}/projects/${project}/pull-requests?category=closed`,
  });
  const items = Array.isArray(yoramList.json?.items) ? yoramList.json.items : [];
  const yoramNumber = items
    .filter((item) => (item.fromBranch ?? item.from_branch) === "main" && (item.toBranch ?? item.to_branch) === "feature/ui")
    .map((item) => Number(item.pullRequestNumber ?? item.pull_request_number ?? item.number))
    .filter(Boolean)
    .sort((a, b) => b - a)[0] ?? null;

  const page = await ctx.helpers.sendRaw(ctx, "legacy", {
    method: "GET",
    path: `/${owner}/${project}/closedPullRequests`,
  });
  const ids = [...new Set([...page.body.matchAll(/pullRequest\/(\d+)/gu)].map((match) => Number(match[1])))]
    .sort((a, b) => b - a);
  let legacyNumber = null;
  for (const id of ids) {
    const detail = await ctx.helpers.sendRaw(ctx, "legacy", {
      method: "GET",
      path: `/${owner}/${project}/pullRequest/${id}`,
    });
    if (detail.status < 400 && detail.body.includes("feature/ui")) {
      legacyNumber = id;
      break;
    }
  }
  return { legacyNumber, yoramNumber };
}

const LIFECYCLE_ACTIONS = {
  // Creates the throwaway project: legacy binds its Project form from
  // /projects (owner/name/overview/projectScope/vcs/menu flags), yoram takes
  // the REST create body. Same name both sides -> later steps share paths.
  "create-project": {
    translateLegacy(step, resolved) {
      const name = projectNameOf(step, resolved);
      return {
        method: "POST",
        path: "/projects",
        form: {
          owner: step.params.owner,
          name,
          overview: resolved.overview,
          projectScope: "PUBLIC",
          vcs: "GIT",
          code: "true",
          issue: "true",
          pullRequest: "true",
          review: "true",
          milestone: "true",
          board: "true",
        },
      };
    },
    translateYoram(step, resolved) {
      const name = projectNameOf(step, resolved);
      return {
        method: "POST",
        path: `/api/v1/owners/${step.params.owner}/projects`,
        json: { projectName: name, overview: resolved.overview, projectScope: "PUBLIC", vcs: "GIT" },
      };
    },
    async handler(ctx) {
      const { step, state, entry, suffix } = ctx;
      const name = `parity-lc-${suffix}`;
      const plan = { projectName: name, owner: step.params.owner, overview: `parity throwaway project ${suffix}` };
      const route = `${step.params.owner} (create project ${name})`;
      const { legacyResult, yoramResult } = await ctx.helpers.pairLenient(ctx, this.translateLegacy(step, plan), this.translateYoram(step, plan), route);
      const legacyOk = numberFrom(new RegExp(`/${step.params.owner}/${name}\\/?$`), legacyResult.location) !== null || legacyResult.status === 303;
      const yoramOk = (yoramResult.json?.projectName ?? yoramResult.json?.project_name) === name;
      if (!legacyOk || !yoramOk) {
        entry.errors.push(`create-project incomplete [${suffix}]: legacy=${legacyResult.status} yoram=${yoramResult.status}`);
        return;
      }
      state.projectName = name;
    },
  },

  // IssueLabelApp.copyLabels: copies sample's issue labels into the
  // throwaway project; identical direct form route on both sides.
  "copy-labels": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${projectNameOf(step, resolved)}/copyLabels`, form: { owner: step.params.owner, projectName: step.params.sourceProject } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${projectNameOf(step, resolved)}/copyLabels`, form: { owner: step.params.owner, projectName: step.params.sourceProject } };
    },
    handler(ctx) {
      const { step, state } = ctx;
      if (!state.projectName) return;
      return ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, { projectName: state.projectName }),
        this.translateYoram(step, { projectName: state.projectName }),
        `${step.params.owner}/${state.projectName}/copyLabels`,
      );
    },
  },

  // Adds bob to the throwaway project and discovers his member id per side
  // (same probes as P13 but against the state-created project).
  "add-created-member": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${projectNameOf(step, resolved)}/members`, form: { loginId: resolved.loginId } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${projectNameOf(step, resolved)}/members`, form: { loginId: resolved.loginId } };
    },
    async handler(ctx) {
      const { step, state, entry, options, yoramBaseUrl, suffix } = ctx;
      if (!state.projectName) return;
      const loginId = "bob";
      const plan = { projectName: state.projectName, loginId };
      const { legacyResult, yoramResult } = await ctx.helpers.pairLenient(ctx, this.translateLegacy(step, plan), this.translateYoram(step, plan), `${step.params.owner}/${state.projectName}/members (add)`);
      if (legacyResult.status < 400) {
        const page = await ctx.helpers.sendRaw(ctx, "legacy", { method: "GET", path: `/${step.params.owner}/${state.projectName}/members` });
        state.memberUidL = numberFrom(new RegExp(`member\\/(\\d+)\\/edit"[^>]*data-loginId="${loginId}"`, "u"), page.body);
      }
      if (yoramResult.status < 400) {
        const list = await ctx.helpers.sendRaw(ctx, "yoram", { method: "GET", path: `/api/v1/owners/${step.params.owner}/projects/${state.projectName}/members` });
        state.memberUidY = findUserId(list.json, loginId);
      }
      if ((state.memberUidL === null) !== (state.memberUidY === null)) {
        entry.errors.push(`member id discovery diverged [${suffix}]: legacy=${state.memberUidL} yoram=${state.memberUidY}`);
      }
    },
  },

  // ProjectApp.editMember role change on the throwaway member; identical
  // direct route + form on both sides (role id 1 = manager).
  "edit-created-member": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${projectNameOf(step, resolved)}/member/${resolved.userId}/edit`, form: { id: resolved.roleId } };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${projectNameOf(step, resolved)}/member/${resolved.userId}/edit`, form: { id: resolved.roleId } };
    },
    handler(ctx) {
      const { step, state } = ctx;
      if (!state.projectName || (!state.memberUidL && !state.memberUidY)) return;
      return ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, { projectName: state.projectName, userId: state.memberUidL ?? 0, roleId: "1" }),
        this.translateYoram(step, { projectName: state.projectName, userId: state.memberUidY ?? 0, roleId: "1" }),
        `${step.params.owner}/${state.projectName}/member/:userId/edit`,
      );
    },
  },

  // ProjectApp.settingProject is multipart-only on legacy (asMultipartFormData);
  // yoram exposes the same operation via REST PATCH. Runs ONLY on the
  // throwaway project so setting drift dies with it.
  "update-created-setting": {
    translateLegacy(step, resolved) {
      const name = projectNameOf(step, resolved);
      return {
        method: "POST",
        path: `/${step.params.owner}/${name}/setting`,
        multipart: multipartBody({ name, overview: resolved.overview, projectScope: "PUBLIC" }),
      };
    },
    translateYoram(step, resolved) {
      const name = projectNameOf(step, resolved);
      return {
        method: "PATCH",
        path: `/api/v1/owners/${step.params.owner}/projects/${name}`,
        json: { projectName: name, overview: resolved.overview, projectScope: "PUBLIC" },
      };
    },
    handler(ctx) {
      const { step, state, suffix } = ctx;
      if (!state.projectName) return;
      const plan = { projectName: state.projectName, overview: `parity throwaway setting ${suffix}` };
      return pairRequest(ctx, this.translateLegacy(step, plan), this.translateYoram(step, plan), `${step.params.owner}/${state.projectName}/setting`);
    },
  },

  // Initiates a transfer request toward alice on the throwaway project only;
  // ownership never changes without acceptance, and the pending-transfer row
  // dies with the project delete below.
  "request-project-transfer": {
    translateLegacy(step, resolved) {
      return {
        method: "PUT",
        path: `/${step.params.owner}/${projectNameOf(step, resolved)}/transfer?owner=${resolved.destination}`,
        headers: XHR_HEADER,
      };
    },
    translateYoram(step, resolved) {
      return {
        method: "PUT",
        path: `/${step.params.owner}/${projectNameOf(step, resolved)}/transfer?owner=${resolved.destination}`,
        headers: XHR_HEADER,
      };
    },
    handler(ctx) {
      const { step, state } = ctx;
      if (!state.projectName) return;
      return ctx.helpers.pairLenient(
        ctx,
        this.translateLegacy(step, { projectName: state.projectName, destination: "alice" }),
        this.translateYoram(step, { projectName: state.projectName, destination: "alice" }),
        `${step.params.owner}/${state.projectName}/transfer (request)`,
      );
    },
  },

  // Deletes the throwaway project on both sides (XHR -> 204 legacy, REST 200
  // yoram) and verifies absence afterwards — the scenario's cleanup proof.
  "delete-project": {
    translateLegacy(step, resolved) {
      return { method: "DELETE", path: `/${step.params.owner}/${projectNameOf(step, resolved)}/delete`, headers: XHR_HEADER };
    },
    translateYoram(step, resolved) {
      return { method: "DELETE", path: `/api/v1/owners/${step.params.owner}/projects/${projectNameOf(step, resolved)}` };
    },
    async handler(ctx) {
      const { step, state, entry, options, yoramBaseUrl, suffix } = ctx;
      if (!state.projectName) return;
      await pairRequest(
        ctx,
        this.translateLegacy(step, { projectName: state.projectName }),
        this.translateYoram(step, { projectName: state.projectName }),
        `${step.params.owner}/${state.projectName} (delete)`,
      );
      const goneL = await ctx.helpers.sendRaw(ctx, "legacy", { method: "GET", path: `/${step.params.owner}/${state.projectName}` });
      const goneY = await ctx.helpers.sendRaw(ctx, "yoram", { method: "GET", path: `/api/v1/owners/${step.params.owner}/projects/${state.projectName}` });
      if ((goneL.status < 400 && goneL.status !== 404) || goneY.status < 400) {
        entry.errors.push(`throwaway residue [${suffix}]: ${state.projectName} still reachable (legacy=${goneL.status} yoram=${goneY.status})`);
      }
      state.projectName = null;
    },
  },

  // No-op parity probe: neither instance has pushed-branch row 999999999, and
  // both handlers treat missing ids as success without touching data.
  "delete-missing-pushed-branch": {
    translateLegacy(step) {
      return { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/pushedBranch/999999999/delete` };
    },
    translateYoram(step) {
      return { method: "DELETE", path: `/${step.params.owner}/${step.params.project}/pushedBranch/999999999/delete` };
    },
    handler(ctx) {
      const { step } = ctx;
      return pairRequest(ctx, this.translateLegacy(step), this.translateYoram(step), `${step.params.owner}/${step.params.project}/pushedBranch/:id/delete`);
    },
  },

  // Missing-transfer-id probe: legacy renders notFound, yoram answers 404.
  "probe-transfer-accept-missing": {
    translateLegacy() {
      return { method: "GET", path: "/project/transfer/999999999/deadbeef" };
    },
    translateYoram() {
      return { method: "GET", path: "/project/transfer/999999999/deadbeef" };
    },
    handler(ctx) {
      return pairRequest(ctx, this.translateLegacy(), this.translateYoram(), "/project/transfer/:id/:key");
    },
  },

  // AttachmentApp.uploadFile: multipart field filePath on both sides; legacy
  // answers 201 + Location /files/:id, yoram 201 + JSON {id}.
  "upload-attachment": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: "/files", multipart: multipartBody({}, { name: "filePath", filename: resolved.filename, content: resolved.content }) };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: "/files", multipart: multipartBody({}, { name: "filePath", filename: resolved.filename, content: resolved.content }) };
    },
    async handler(ctx) {
      const { step, state, suffix } = ctx;
      const plan = attachmentPlan(suffix);
      const { legacyResult, yoramResult } = await pairRequest(
        ctx,
        this.translateLegacy(step, plan),
        this.translateYoram(step, plan),
        "/files (upload)",
      );
      state.attachmentL = numberFrom(/\/files\/(\d+)/, legacyResult.location);
      state.attachmentY = Number(yoramResult.json?.id ?? yoramResult.json?.url?.match(/files\/(\d+)/)?.[1]) || null;
      if ((state.attachmentL === null) !== (state.attachmentY === null)) {
        pushApiViolation(ctx, "/files (upload id)", { id: state.attachmentL }, { id: state.attachmentY });
      }
    },
  },

  // AttachmentApp.getFile byte source probe (plain and trailing-slash routes).
  "get-attachment": getAttachmentAction("get-attachment", false),
  "get-attachment-trailing": getAttachmentAction("get-attachment-trailing", true),

  // AttachmentApp.deleteFile: multipart _method=delete on both sides.
  "delete-attachment": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/files/${resolved.attachmentId}`, multipart: multipartBody({ _method: "delete" }) };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/files/${resolved.attachmentId}`, multipart: multipartBody({ _method: "delete" }) };
    },
    async handler(ctx) {
      const { step, state } = ctx;
      if (!state.attachmentL && !state.attachmentY) return;
      await pairRequest(
        ctx,
        this.translateLegacy(step, { attachmentId: state.attachmentL ?? 0 }),
        this.translateYoram(step, { attachmentId: state.attachmentY ?? 0 }),
        "/files/:id (delete)",
      );
      state.attachmentL = state.attachmentY = null;
    },
  },

  // UserApp.isUsed signup-validation fragment (query param `name`).
  "probe-user-isused": {
    translateLegacy(step, resolved) {
      return { method: "GET", path: `/user/isUsed?name=${encodeURIComponent(resolved.probeName)}` };
    },
    translateYoram(step, resolved) {
      return { method: "GET", path: `/user/isUsed?name=${encodeURIComponent(resolved.probeName)}` };
    },
    handler(ctx) {
      const { suffix } = ctx;
      const result = pairRequest(ctx, this.translateLegacy({}, { probeName: `parity-probe-${suffix}` }), this.translateYoram({}, { probeName: `parity-probe-${suffix}` }), "/user/isUsed");
      return result.then(({ legacyResult, yoramResult }) => {
        if (legacyResult.json && yoramResult.json && JSON.stringify(legacyResult.json) !== JSON.stringify(yoramResult.json)) {
          pushApiViolation(ctx, "/user/isUsed (payload)", legacyResult.json, yoramResult.json);
        }
      });
    },
  },

  // Site-admin user listing via the legacy-compat external API (read-only).
  "probe-admin-users": {
    translateLegacy() {
      return { method: "GET", path: "/-_-api/v1/admin/users" };
    },
    translateYoram() {
      return { method: "GET", path: "/api/v1/admin/users" };
    },
    handler(ctx) {
      return pairRequest(ctx, this.translateLegacy(), this.translateYoram(), this.translateLegacy().path);
    },
  },

  // PullRequestApp.restoreFromBranch on R13's closed main->feature/ui PR;
  // identical direct route on both sides. Skips cleanly when the PR does not
  // exist (first sweep ordering, pruned repo, ...).
  "restore-closed-pullrequest": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/pullRequest/${resolved.prId}/restorefrombranch` };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/pullRequest/${resolved.prId}/restorefrombranch` };
    },
    async handler(ctx) {
      const { step, state, entry } = ctx;
      const found = await discoverClosedRestorePr(ctx, step.params.owner, step.params.project);
      if (!found.legacyNumber || !found.yoramNumber) {
        entry.errors.push(`pr-restore skip: closed main->feature/ui PR not found on both sides (legacy=${found.legacyNumber} yoram=${found.yoramNumber})`);
        return;
      }
      state.restoredPrL = found.legacyNumber;
      state.restoredPrY = found.yoramNumber;
      await pairRequest(
        ctx,
        this.translateLegacy(step, { prId: state.restoredPrL }),
        this.translateYoram(step, { prId: state.restoredPrY }),
        `${step.params.owner}/${step.params.project}/pullRequest/:id/restorefrombranch`,
      );
    },
  },

  // Re-closes the restored PR so the sweep leaves the same residue it found.
  "close-restored-pullrequest": {
    translateLegacy(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/pullRequest/${resolved.prId}/close` };
    },
    translateYoram(step, resolved) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/pullRequest/${resolved.prId}/close` };
    },
    handler(ctx) {
      const { step, state } = ctx;
      if (!state.restoredPrL && !state.restoredPrY) return;
      return pairRequest(
        ctx,
        this.translateLegacy(step, { prId: state.restoredPrL ?? 0 }),
        this.translateYoram(step, { prId: state.restoredPrY ?? 0 }),
        `${step.params.owner}/${step.params.project}/pullRequest/:id/close`,
      );
    },
  },
};

// Shared shape for the two getFile route variants (plain + trailing slash).
function getAttachmentAction(name, trailing) {
  return {
    translateLegacy(step, resolved) {
      return { method: "GET", path: `/files/${resolved.attachmentId}${trailing ? "/" : ""}` };
    },
    translateYoram(step, resolved) {
      return { method: "GET", path: `/files/${resolved.attachmentId}${trailing ? "/" : ""}` };
    },
    handler(ctx) {
      const { step, state } = ctx;
      if (!state.attachmentL && !state.attachmentY) return;
      return pairRequest(
        ctx,
        this.translateLegacy(step, { attachmentId: state.attachmentL ?? 0 }),
        this.translateYoram(step, { attachmentId: state.attachmentY ?? 0 }),
        `/files/:id${trailing ? "/" : ""}`,
      );
    },
  };
}

Object.assign(actionDefinitions, LIFECYCLE_ACTIONS);

// --- wave B: svn client pair (B-0021/B-0170/B-0294/B-0314/B-0271) ------------
//
// Drives a real svn client against both servers inside an SVN-vcs throwaway
// project: checkout, add + commit, then compares the server-side log state.
LIFECYCLE_ACTIONS["svn-pair-commit"] = {
  // Registry contract requires translator functions; execution is fully
  // client-side (real svn against both servers), so these stay inert.
  translateLegacy: () => ({ method: "GET", path: "/__svn-pair-client-side__" }),
  translateYoram: () => ({ method: "GET", path: "/__svn-pair-client-side__" }),
  async handler(ctx) {
    const { execFile } = await import("node:child_process");
    const { mkdtempSync, rmSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { promisify } = await import("node:util");
    const svn = promisify(execFile);
    const runSvn = (args, options = {}) =>
      svn("svn", ["--non-interactive", "--username", "admin", "--password", "admin", ...args], {
        timeout: 120_000,
        ...options,
      });

    const { step, entry, suffix, helpers } = ctx;
    const owner = step.params.owner;
    const name = `parity-svn-${suffix}`;
    const fail = (message) => entry.errors.push(`svn-pair [${suffix}]: ${message}`);

    // Create the SVN-vcs throwaway project on both sides.
    await helpers.sendRaw(ctx, "legacy", {
      method: "POST",
      path: "/projects",
      form: { owner, name, overview: `parity svn pair ${suffix}`, projectScope: "PUBLIC", vcs: "Subversion", code: "true", issue: "true", pullRequest: "true", review: "true", milestone: "true", board: "true" },
    });
    await helpers.sendRaw(ctx, "yoram", {
      method: "POST",
      path: `/api/v1/owners/${owner}/projects`,
      json: { projectName: name, overview: `parity svn pair ${suffix}`, projectScope: "PUBLIC", vcs: "Subversion" },
    });

    const svnUrl = (baseUrl) => `${baseUrl}/svn/${owner}/${name}`;
    const workRoot = mkdtempSync(`${tmpdir()}/parity-svn-`);
    try {
      const checkout = async (baseUrl, dir) => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          try {
            await runSvn(["co", "-q", svnUrl(baseUrl), dir]);
            return true;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 2_000));
          }
        }
        return false;
      };

      const legacyDir = `${workRoot}/legacy`;
      const yoramDir = `${workRoot}/yoram`;
      if (!(await checkout(ctx.options.legacyUrl, legacyDir))) return fail("svn checkout failed against legacy");
      if (!(await checkout(ctx.yoramBaseUrl, yoramDir))) return fail("svn checkout failed against yoram");

      // Same file content + message on both sides; a fresh project starts at
      // r0, so the resulting server-side log state must match exactly.
      for (const dir of [legacyDir, yoramDir]) {
        writeFileSync(`${dir}/parity-svn-pair.txt`, `parity svn pair payload ${suffix}\n`);
        await runSvn(["add", `${dir}/parity-svn-pair.txt`]);
        await runSvn(["commit", `${dir}/parity-svn-pair.txt`, "-m", `parity svn pair ${suffix}`]);
      }

      const logState = async (baseUrl) => {
        // XML is stable across svn clients; revision numbers are per-server so
        // only message pairs are compared. Known divergence recorded separately:
        // yoram's svn log XML omits <author>. Query the repo URL — the committed
        // working copy can stay at r0 when MERGE skips the wc bump.
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const output = await runSvn(["log", "--xml", svnUrl(baseUrl)]).catch((error) => {
            fail(`svn log query failed: ${String(error.stderr ?? error.message).slice(0, 200)}`);
            return { stdout: "" };
          });
          const entries = [...output.stdout.matchAll(/<logentry[^>]*>([\s\S]*?)<\/logentry>/gu)]
            .map(([, body]) => (/<msg>([^<]*)<\/msg>/u.exec(body)?.[1] ?? "").trim())
            .filter((line) => line !== "" && line !== "|")
            .sort()
            .join("\n");
          if (entries) return entries;
          if (attempt === 5) fail(`svn log empty; raw=${JSON.stringify(output.stdout.slice(0, 200))}`);
          await new Promise((resolve) => setTimeout(resolve, 1_500));
        }
        return "";
      };
      const legacyLog = await logState(ctx.options.legacyUrl);
      const yoramLog = await logState(ctx.yoramBaseUrl);
      if (!legacyLog || !yoramLog) return fail("svn log returned no entries after commit");
      if (legacyLog !== yoramLog) {
        fail(`svn log state diverged: ${JSON.stringify(legacyLog)} vs ${JSON.stringify(yoramLog)}`);
      }
    } catch (error) {
      fail(error.message);
    } finally {
      rmSync(workRoot, { recursive: true, force: true });
    }

    // Delete the throwaway projects.
    await helpers.sendRaw(ctx, "legacy", { method: "DELETE", path: `/${owner}/${name}/delete`, headers: { "x-requested-with": "XMLHttpRequest" } });
    await helpers.sendRaw(ctx, "yoram", { method: "DELETE", path: `/api/v1/owners/${owner}/projects/${name}` });
  },
};
Object.assign(actionDefinitions, LIFECYCLE_ACTIONS);
scenarios.push(
  {
    id: "P18-throwaway-project-lifecycle",
    title: "throwaway project lifecycle: create, copyLabels, member edit, setting, transfer request, delete",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-project", params: { owner: "admin" } },
      { actor: "admin", action: "copy-labels", params: { owner: "admin", sourceProject: "sample" } },
      { actor: "admin", action: "add-created-member", params: { owner: "admin" } },
      { actor: "admin", action: "edit-created-member", params: { owner: "admin" } },
      {
        actor: "admin",
        action: "update-created-setting",
        params: { owner: "admin" },
        behaviorId: "B-0267",
        disposition: {
          classification: "LEGACY_BUG_NOT_REPRODUCED",
          evidence: "yona-original/app/controllers/ProjectApp.java:427-448",
        },
      },
      { actor: "admin", action: "request-project-transfer", params: { owner: "admin" } },
      { actor: "admin", action: "delete-project", params: { owner: "admin" } },
    ],
    behaviorMatcher: {
      action: /^(ProjectApp\.(newProject|deleteProject|settingProject|editMember|transferProject)|IssueLabelApp\.copyLabels|ProjectApi\.newProject)$/,
    },
  },
  {
    id: "P19-missing-entity-probes",
    title: "missing-entity no-op probes: pushed branch delete, transfer accept",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "delete-missing-pushed-branch", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "probe-transfer-accept-missing", params: {} },
    ],
    behaviorMatcher: { action: /^(ProjectApp\.(deletePushedBranch|acceptTransfer))$/ },
  },
  {
    id: "P20-attachment-file-lifecycle",
    title: "user attachment upload, fetch (both routes), delete",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "upload-attachment", params: {} },
      { actor: "admin", action: "get-attachment", params: {} },
      { actor: "admin", action: "get-attachment-trailing", params: {} },
      { actor: "admin", action: "delete-attachment", params: {} },
    ],
    behaviorMatcher: { action: /^AttachmentApp\.(uploadFile|getFile|deleteFile)$/ },
  },
  {
    id: "P21-user-compat-api-probes",
    title: "compat API probes: user-name validation, admin user list",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "probe-user-isused", params: {} },
      { actor: "admin", action: "probe-admin-users", params: {} },
    ],
    behaviorMatcher: { action: /^(UserApp\.isUsed|UserApi\.users)$/ },
  },
  {
    id: "T1-pr-restore-cycle",
    title: "restore R13's closed main->feature/ui pull request, then close again",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "restore-closed-pullrequest", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "close-restored-pullrequest", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^PullRequestApp\.restoreFromBranch$/, route: /pullRequest/ },
  },
  {
    id: "P22-svn-client-pair",
    title: "svn checkout + commit through the svn protocol on a throwaway SVN project",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "svn-pair-commit", params: { owner: "admin" } },
    ],
    behaviorMatcher: { action: /^SvnApp\.(serviceWithPath|service)$/ },
  },
);

Object.assign(actionDefinitions, MUTATION_ACTIONS);
// --- wave D: throwaway destructive operations + misc probes -----------------

LIFECYCLE_ACTIONS["fork-created-project"] = {
  translateLegacy(step, resolved) {
    const source = resolved.sourceProject ?? projectNameOf(step, resolved);
    return {
      method: "POST",
      path: `/${step.params.owner}/${source}/fork`,
      form: { name: resolved.name, owner: step.params.owner, projectScope: "PUBLIC" },
    };
  },
  translateYoram(step, resolved) {
    const source = resolved.sourceProject ?? projectNameOf(step, resolved);
    return {
      method: "POST",
      path: `/api/v1/owners/${step.params.owner}/projects/${source}/fork`,
      json: { name: resolved.name, owner: step.params.owner, projectScope: "PUBLIC" },
    };
  },
  async handler(ctx) {
    const { step, state, entry, suffix } = ctx;
    if (!state.projectName) return;
    const name = `parity-fork-${suffix}`;
    const result = await pairRequest(
      ctx,
      this.translateLegacy(step, { sourceProject: state.projectName, name }),
      this.translateYoram(step, { sourceProject: state.projectName, name }),
      `${step.params.owner}/${state.projectName}/fork`,
    );
    if (result.legacyResult.status < 400 || result.yoramResult.status < 400) {
      state.forkProjectName = name;
    }
    if (result.legacyResult.status >= 400 || result.yoramResult.status >= 400) {
      entry.errors.push(`fork-created-project incomplete [${suffix}]: legacy=${result.legacyResult.status} yoram=${result.yoramResult.status}`);
    }
  },
};

LIFECYCLE_ACTIONS["clone-created-project"] = {
  translateLegacy(step, resolved) {
    const source = resolved.sourceProject ?? projectNameOf(step, resolved);
    return {
      method: "POST",
      path: `/${step.params.owner}/${source}/clone`,
      form: { name: resolved.name, owner: step.params.owner, projectScope: "PUBLIC" },
    };
  },
  translateYoram(step, resolved) {
    const source = resolved.sourceProject ?? projectNameOf(step, resolved);
    return {
      method: "POST",
      path: `/${step.params.owner}/${source}/clone`,
      form: { name: resolved.name, owner: step.params.owner, projectScope: "PUBLIC" },
    };
  },
  async handler(ctx) {
    const { step, state, entry, suffix } = ctx;
    if (!state.projectName) return;
    const name = `parity-clone-${suffix}`;
    const result = await pairRequest(
      ctx,
      this.translateLegacy(step, { sourceProject: state.projectName, name }),
      this.translateYoram(step, { sourceProject: state.projectName, name }),
      `${step.params.owner}/${state.projectName}/clone`,
    );
    if (result.legacyResult.status < 400 || result.yoramResult.status < 400) {
      state.cloneProjectName = name;
    }
    if (result.legacyResult.status >= 400 || result.yoramResult.status >= 400) {
      entry.errors.push(`clone-created-project incomplete [${suffix}]: legacy=${result.legacyResult.status} yoram=${result.yoramResult.status}`);
    }
  },
};
LIFECYCLE_ACTIONS["change-created-project-vcs"] = {
  translateLegacy(step, resolved) {
    return { method: "POST", path: `/${step.params.owner}/${resolved.projectName ?? projectNameOf(step, resolved)}/changeVCS` };
  },
  translateYoram(step, resolved) {
    return { method: "POST", path: `/api/v1/owners/${step.params.owner}/projects/${resolved.projectName ?? projectNameOf(step, resolved)}/change-vcs` };
  },
  async handler(ctx) {
    const { step, state } = ctx;
    if (!state.projectName) return;
    return pairRequest(
      ctx,
      this.translateLegacy(step, { projectName: state.projectName }),
      this.translateYoram(step, { projectName: state.projectName }),
      `${step.params.owner}/${state.projectName}/changeVCS`,
    );
  },
};

LIFECYCLE_ACTIONS["cleanup-created-projects"] = {
  translateLegacy(step, resolved) {
    return {
      method: "DELETE",
      path: `/${step.params.owner}/${resolved.projectName ?? projectNameOf(step, resolved)}/delete`,
      headers: XHR_HEADER,
    };
  },
  translateYoram(step, resolved) {
    return {
      method: "DELETE",
      path: `/api/v1/owners/${step.params.owner}/projects/${resolved.projectName ?? projectNameOf(step, resolved)}`,
    };
  },
  async handler(ctx) {
    const { step, state, entry, suffix, helpers } = ctx;
    const names = [...new Set([state.forkProjectName, state.cloneProjectName, state.projectName].filter(Boolean))];
    for (const projectName of names) {
      const deletedLegacy = await helpers.sendRaw(ctx, "legacy", {
        method: "DELETE",
        path: `/${step.params.owner}/${projectName}/delete`,
        headers: XHR_HEADER,
      });
      const deletedYoram = await helpers.sendRaw(ctx, "yoram", {
        method: "DELETE",
        path: `/api/v1/owners/${step.params.owner}/projects/${projectName}`,
      });
      if (deletedLegacy.status >= 400 || deletedYoram.status >= 400) {
        entry.errors.push(
          `cleanup-created-project delete failed [${suffix}]: ${projectName} legacy=${deletedLegacy.status} yoram=${deletedYoram.status}`,
        );
      }
      const goneLegacy = await helpers.sendRaw(ctx, "legacy", { method: "GET", path: `/${step.params.owner}/${projectName}` });
      const goneYoram = await helpers.sendRaw(ctx, "yoram", { method: "GET", path: `/api/v1/owners/${step.params.owner}/projects/${projectName}` });
      if (goneLegacy.status < 400) {
        await helpers.sendRaw(ctx, "legacy", { method: "DELETE", path: `/${step.params.owner}/${projectName}/delete`, headers: XHR_HEADER });
      }
      if (goneYoram.status < 400) {
        await helpers.sendRaw(ctx, "yoram", { method: "DELETE", path: `/api/v1/owners/${step.params.owner}/projects/${projectName}` });
      }
      if (goneLegacy.status < 400 || goneYoram.status < 400) {
        entry.errors.push(`cleanup-created-project residue [${suffix}]: ${projectName} legacy=${goneLegacy.status} yoram=${goneYoram.status}`);
      }
    }
    state.forkProjectName = null;
    state.cloneProjectName = null;
    state.projectName = null;
  },
};

LIFECYCLE_ACTIONS["site-purge-created-project"] = {
  translateLegacy(step, resolved) {
    return { method: "DELETE", path: `/sites/project/delete/${resolved.projectId}` };
  },
  translateYoram(step, resolved) {
    return { method: "DELETE", path: `/sites/project/delete/${resolved.projectId}` };
  },
  async handler(ctx) {
    const { step, state, entry, suffix, helpers } = ctx;
    if (!state.projectName) return;
    const owner = step.params.owner;
    const name = state.projectName;
    const legacyDetail = await helpers.sendRaw(ctx, "legacy", { method: "GET", path: `/${owner}/${name}` });
    const yoramDetail = await helpers.sendRaw(ctx, "yoram", { method: "GET", path: `/api/v1/owners/${owner}/projects/${name}` });
    const legacyId = Number(/data-project-id="(\d+)"/u.exec(legacyDetail.body ?? "")?.[1]) || null;
    const yoramId = Number(yoramDetail.json?.projectId ?? yoramDetail.json?.project_id ?? 0) || null;
    if (!legacyId || !yoramId) {
      entry.errors.push(`site-purge-created-project skip [${suffix}]: project id unavailable (legacy=${legacyId} yoram=${yoramId})`);
      await pairRequest(
        ctx,
        { method: "DELETE", path: `/${owner}/${name}/delete`, headers: XHR_HEADER },
        { method: "DELETE", path: `/api/v1/owners/${owner}/projects/${name}` },
        `${owner}/${name} (site purge fallback)`,
      );
      state.projectName = null;
      return;
    }
    await pairRequest(
      ctx,
      this.translateLegacy(step, { projectId: legacyId }),
      this.translateYoram(step, { projectId: yoramId }),
      "/sites/project/delete/:projectId",
    );
    const goneLegacy = await helpers.sendRaw(ctx, "legacy", { method: "GET", path: `/${owner}/${name}` });
    const goneYoram = await helpers.sendRaw(ctx, "yoram", { method: "GET", path: `/api/v1/owners/${owner}/projects/${name}` });
    if (goneLegacy.status < 400) {
      await helpers.sendRaw(ctx, "legacy", { method: "DELETE", path: `/${owner}/${name}/delete`, headers: XHR_HEADER });
    }
    if (goneYoram.status < 400) {
      await helpers.sendRaw(ctx, "yoram", { method: "DELETE", path: `/api/v1/owners/${owner}/projects/${name}` });
    }
    if (goneLegacy.status < 400 || goneYoram.status < 400) {
      entry.errors.push(`site-purge-created-project residue [${suffix}]: legacy=${goneLegacy.status} yoram=${goneYoram.status}`);
    }
    state.projectName = null;
  },
};

LIFECYCLE_ACTIONS["probe-empty-post-root"] = {
  translateLegacy() {
    return { method: "POST", path: "/" };
  },
  translateYoram() {
    return { method: "POST", path: "/" };
  },
  handler(ctx) {
    return pairRequest(ctx, this.translateLegacy(), this.translateYoram(), "POST /");
  },
};

Object.assign(actionDefinitions, LIFECYCLE_ACTIONS);

scenarios.push(
  {
    id: "P23-wave-d-project-destructive",
    title: "throwaway fork, clone, VCS change, and generated-project cleanup",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-project", params: { owner: "admin" } },
      { actor: "admin", action: "fork-created-project", params: { owner: "admin" }, behaviorId: "B-0226" },
      { actor: "admin", action: "clone-created-project", params: { owner: "admin" }, behaviorId: "B-0225" },
      { actor: "admin", action: "change-created-project-vcs", params: { owner: "admin" }, behaviorId: "B-0236" },
      { actor: "admin", action: "cleanup-created-projects", params: { owner: "admin" } },
    ],
    behaviorMatcher: {
      action: /^(PullRequestApp\.(fork|doClone)|ProjectApp\.changeVCS)$/,
      route: /^(POST \/:ownerName\/:project\/(fork|clone)|POST \/:user\/:project\/changeVCS)$/,
    },
  },
  {
    id: "P24-site-project-purge",
    title: "site-admin purge of a throwaway project",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-project", params: { owner: "admin" } },
      { actor: "admin", action: "site-purge-created-project", params: { owner: "admin" }, behaviorId: "B-0019" },
    ],
    behaviorMatcher: { action: /^SiteApp\.deleteProject$/, route: /^DELETE \/sites\/project\/delete\/:projectId$/ },
  },
  {
    id: "P25-empty-root-post",
    title: "empty root POST status probe",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "probe-empty-post-root", params: {} },
    ],
    behaviorMatcher: { action: /^Application\.fake$/, route: /^POST \/$/ },
  },
);
// --- residual read/invalid probes --------------------------------------------
//
// These routes are intentionally exercised with a missing branch or empty
// payloads. requestBoth records expected 4xx responses in entry.errors while
// the status-class check still catches a real parity mismatch.
async function residualStatusProbe(ctx, legacyTranslation, yoramTranslation, route) {
  const { legacyResult, yoramResult } = await ctx.helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
  if ((legacyResult.status >= 400) !== (yoramResult.status >= 400)) {
    pushApiViolation(ctx, route, `legacy HTTP ${legacyResult.status}`, `yoram HTTP ${yoramResult.status}`);
  }
}

const RESIDUAL_PROBE_ACTIONS = {
  "probe-delete-branch-missing": {
    translateLegacy(step) {
      return { method: "DELETE", path: `/${step.params.user}/${step.params.project}/code/${step.params.branch}/` };
    },
    translateYoram(step) {
      return { method: "DELETE", path: `/${step.params.user}/${step.params.project}/code/${step.params.branch}/` };
    },
    handler(ctx) {
      const { step } = ctx;
      const legacy = this.translateLegacy(step);
      return residualStatusProbe(ctx, legacy, this.translateYoram(step), legacy.path);
    },
  },
  "probe-import-form": {
    translateLegacy() {
      return { method: "GET", path: "/_import" };
    },
    translateYoram() {
      return { method: "GET", path: "/_import" };
    },
    handler(ctx) {
      const legacy = this.translateLegacy();
      return residualStatusProbe(ctx, legacy, this.translateYoram(), legacy.path);
    },
  },
  "probe-import-project-invalid": {
    translateLegacy() {
      return { method: "POST", path: "/_import", form: {} };
    },
    translateYoram() {
      return { method: "POST", path: "/_import", form: {} };
    },
    handler(ctx) {
      const legacy = this.translateLegacy();
      return residualStatusProbe(ctx, legacy, this.translateYoram(), legacy.path);
    },
  },
};

Object.assign(actionDefinitions, RESIDUAL_PROBE_ACTIONS);

scenarios.push({
  id: "P26-residual-branch-import-probes",
  title: "missing branch and invalid import probes",
  actions: [
    { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
    {
      actor: "admin",
      action: "probe-delete-branch-missing",
      params: { user: "admin", project: "sample", branch: "__parity_missing_branch__" },
      behaviorId: "B-0002",
      disposition: {
        classification: "LEGACY_BUG_NOT_REPRODUCED",
        evidence: "yona-original/app/controllers/BranchApp.java:71-79; yona-original/app/playRepository/GitRepository.java:1230-1236",
      },
    },
    { actor: "admin", action: "probe-import-form", params: {} },
    { actor: "admin", action: "probe-import-project-invalid", params: {} },
  ],
  behaviorMatcher: {
    action: /^(BranchApp\.deleteBranch|ImportApp\.(importForm|newProject))$/,
    route: /^(DELETE \/:user\/:project\/code\/:branch\/|GET \/_import|POST \/_import)$/,
  },
});
