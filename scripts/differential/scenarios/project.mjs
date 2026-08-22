// Project domain: project home + labels scenarios and their action definitions.
//
// Domain module contract (see scenarios/index.mjs).
import { translateLegacy, translateYoram } from "../adapters.mjs";

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
    spa: false,
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
    case "fetch-mention-list-pull-request": return `${base}/mentionListAtPullRequest`;
    case "search-in-project": return `${base}/search?query=${encodeURIComponent(p.query ?? "")}`;
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
  });
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
];

export const actionDefinitions = {
  "view-project": {
    translateLegacy(step) {
      return { method: "GET", path: `/${step.params.owner}/${step.params.project}` };
    },
    translateYoram(step) {
      return {
        method: "GET",
        path: `/api/v1/projects/${step.params.owner}/${step.params.project}`,
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
      // Yoram serves the same screen via the SPA shell at the legacy direct
      // route; pagePath marks the DOM target for the runner.
      translateYoram(step) {
        const path = readPath(step);
        return { method: "GET", path, pagePath: path };
      },
      handler: spaReadHandler,
    },
  ])),
};
