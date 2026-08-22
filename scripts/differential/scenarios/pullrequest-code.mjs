// PullRequest + code/commit/branch domain: read-only PR list/detail/forms,
// commit history, code browser and branch list scenarios.
//
// Domain module contract (see scenarios/index.mjs).
import { translateLegacy, translateYoram } from "../adapters.mjs";

export const scenarios = [
  {
    id: "R1-pr-lists",
    title: "list open/closed/sent pull requests",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "list-pullrequests", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "list-closed-pullrequests", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "list-sent-pullrequests", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^PullRequestApp\./, route: /^GET \/:ownerName\/:project\/(closed|sent)?pullRequests$/i },
  },
  {
    id: "R2-pr-detail",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-pullrequest", params: { owner: "admin", project: "sample", prId: 1 } },
      { actor: "admin", action: "view-pullrequest-state", params: { owner: "admin", project: "sample", prId: 1 } },
      { actor: "admin", action: "view-pullrequest-changes", params: { owner: "admin", project: "sample", prId: 1 } },
      { actor: "admin", action: "view-specific-change", params: { owner: "admin", project: "sample", prId: 1, commitId: "HEAD" } },
    ],
    behaviorMatcher: { action: /^PullRequestApp\.(pullRequest(State|Changes)?|specificChange)$/, route: /pullRequest\/:id/ },
  },
  {
    id: "R3-pr-forms",
    title: "new pull request form, edit form, merge result probe",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "new-pullrequest-form", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "view-pullrequest-editform", params: { owner: "admin", project: "sample", prId: 1 } },
      { actor: "admin", action: "merge-result", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^PullRequestApp\.(newPullRequestForm|editPullRequestForm|mergeResult)$/, route: /(newPullRequestForm|editform|mergeResult)/ },
  },
  {
    id: "R4-commits-list",
    title: "commit history until head, per branch, per path",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "list-commits", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "list-commits-branch", params: { owner: "admin", project: "sample", branch: "main" } },
      { actor: "admin", action: "list-commits-path", params: { owner: "admin", project: "sample", branch: "main", path: "README.md" } },
    ],
    behaviorMatcher: { action: /^CodeHistoryApp\.(historyUntilHead|history)$/, route: /^GET \/:user\/:project\/commits/ },
  },
  {
    id: "R5-commit-detail",
    title: "view single commit detail",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-commit", params: { owner: "admin", project: "sample", commitId: "HEAD" } },
    ],
    behaviorMatcher: { action: /^CodeHistoryApp\.show$/, route: /commit\/:id$/ },
  },
  {
    id: "R6-code-browser",
    title: "code browser default branch and named branch",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "browse-code", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "browse-code-branch", params: { owner: "admin", project: "sample", branch: "main" } },
    ],
    behaviorMatcher: { action: /^CodeApp\.codeBrowser(WithBranch)?$/, route: /\/code(\/:branch)?$/ },
  },
  {
    id: "R7-code-tree-entry",
    title: "code browser tree/blob entry under a branch",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "browse-code-tree-entry", params: { owner: "admin", project: "sample", branch: "main", path: "README.md" } },
    ],
    behaviorMatcher: { action: /^CodeApp\.codeBrowserWithBranch$/, route: /\*path$/ },
  },
  {
    id: "R8-code-ajax",
    title: "code browser ajax fragments with branch root/slash/path",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "browse-code-ajax-root", params: { owner: "admin", project: "sample", branch: "main" } },
      { actor: "admin", action: "browse-code-ajax-slash", params: { owner: "admin", project: "sample", branch: "main" } },
      { actor: "admin", action: "browse-code-ajax-path", params: { owner: "admin", project: "sample", branch: "main", path: "README.md" } },
    ],
    behaviorMatcher: { action: /^CodeApp\.ajaxRequestWithBranch$/, route: /code\/:branch\/!/ },
  },
  {
    id: "R9-branches",
    title: "list project branches",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "list-branches", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^BranchApp\.branches$/, route: /branches$/ },
  },
];

// Shared read handler: translate both sides, request both (>=400 lands in
// entry.errors), then DOM-skeleton diff the page — but only when both sides
// answered <400; a one-sided 404 (empty repo, missing PR) makes skeleton
// diffing meaningless and would be noise, not parity signal.
async function readPageHandler(ctx) {
  const { step, resolved, options, yoramBaseUrl, helpers } = ctx;
  const { legacyResult, yoramResult } = await helpers.requestBoth(
    ctx,
    translateLegacy(step, resolved),
    translateYoram(step, resolved),
  );
  if (legacyResult.status >= 400 || yoramResult.status >= 400) return;
  await helpers.renderDomTarget(ctx, {
    legacy: `${options.legacyUrl}${legacyPath(step)}`,
    yoram: `${yoramBaseUrl}${legacyPath(step)}`,
    spa: true,
  });
}

function legacyPath(step) {
  const p = step.params;
  const base = `/${p.owner}/${p.project}`;
  const pr = `${base}/pullRequest/${p.prId}`;
  switch (step.action) {
    case "list-pullrequests": return `${base}/pullRequests`;
    case "list-closed-pullrequests": return `${base}/closedPullRequests`;
    case "list-sent-pullrequests": return `${base}/sentPullRequests`;
    case "new-pullrequest-form": return `${base}/newPullRequestForm`;
    case "merge-result": return `${base}/newPullRequest/mergeResult`;
    case "view-pullrequest": return pr;
    case "view-pullrequest-state": return `${pr}/state`;
    case "view-pullrequest-changes": return `${pr}/changes`;
    case "view-specific-change": return `${pr}/changes/${p.commitId}`;
    case "view-pullrequest-editform": return `${pr}/editform`;
    case "list-commits": return `${base}/commits`;
    case "list-commits-branch": return `${base}/commits/${p.branch}/`;
    case "list-commits-path": return `${base}/commits/${p.branch}/${p.path}`;
    case "view-commit": return `${base}/commit/${p.commitId}`;
    case "browse-code": return `${base}/code`;
    case "browse-code-branch": return `${base}/code/${p.branch}`;
    case "browse-code-tree-entry": return `${base}/code/${p.branch}/${p.path}`;
    case "browse-code-ajax-root": return `${base}/code/${p.branch}/!`;
    case "browse-code-ajax-slash": return `${base}/code/${p.branch}/!/`;
    case "browse-code-ajax-path": return `${base}/code/${p.branch}/!/${p.path}`;
    case "list-branches": return `${base}/branches`;
    default: throw new Error(`unmapped action path: ${step.action}`);
  }
}

// Every action in this domain is a plain GET whose Yoram side serves the same
// screen via the SPA shell at the legacy direct route, so one definition
// factory covers them all: identical translator paths, pagePath marks the DOM
// target.
const readGet = () => ({
  translateLegacy(step) {
    return { method: "GET", path: legacyPath(step) };
  },
  translateYoram(step) {
    const path = legacyPath(step);
    return { method: "GET", path, pagePath: path };
  },
  handler: readPageHandler,
});

const READ_ACTIONS = [
  "list-pullrequests",
  "list-closed-pullrequests",
  "list-sent-pullrequests",
  "new-pullrequest-form",
  "merge-result",
  "view-pullrequest",
  "view-pullrequest-state",
  "view-pullrequest-changes",
  "view-specific-change",
  "view-pullrequest-editform",
  "list-commits",
  "list-commits-branch",
  "list-commits-path",
  "view-commit",
  "browse-code",
  "browse-code-branch",
  "browse-code-tree-entry",
  "browse-code-ajax-root",
  "browse-code-ajax-slash",
  "browse-code-ajax-path",
  "list-branches",
];

export const actionDefinitions = Object.fromEntries(READ_ACTIONS.map((name) => [name, readGet()]));
