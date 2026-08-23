// Issues domain: issue creation/commenting + browser hover-popover scenarios
// and their action definitions.
//
// Domain module contract (see scenarios/index.mjs).
import { translateLegacy, translateYoram } from "../adapters.mjs";
import { diffSkeletons, normalizeApiValue } from "../diff.mjs";
import { violation } from "../report.mjs";

export const scenarios = [
  {
    id: "S3-create-issue",
    title: "create issue",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      // params.title/body are filled per-run with a unique sweep suffix.
      { actor: "admin", action: "create-issue", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueApp\.newIssue$|^IssueApi\.newIssues$/ },
  },
  {
    id: "S4-issue-comment",
    title: "comment on created issue",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "create-issue-comment", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueApp\.newComment$|^IssueApi\.newIssueComment$/ },
  },
  {
    id: "S6-hover-popover",
    title: "hover popover on issue list (show subtasks)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      // Browser-only interaction: identical in-page hover trigger on both
      // sides; the revealed popover is compared as a skeleton by the runner.
      {
        actor: "admin",
        action: "hover-popover",
        params: { owner: "admin", project: "sample", path: "/issues", selector: "#two-column-mode-checkbox" },
      },
    ],
    behaviorMatcher: { action: /^IssueApp\.issues$/ },
  },

  // --- read-only coverage (I1–I18) ---
  {
    id: "I1-issue-detail",
    title: "view seeded issue detail (watcher/voter lists render here)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-detail", params: { owner: "admin", project: "sample", number: 1 } },
    ],
    behaviorMatcher: { action: /^IssueApp\.issue$/, route: /issue\/\$number/ },
  },
  {
    id: "I2-issue-edit-form",
    title: "reveal issue edit form",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-edit-form", params: { owner: "admin", project: "sample", number: 1 } },
    ],
    behaviorMatcher: { action: /^IssueApp\.editIssueForm$/ },
  },
  {
    id: "I3-issue-timeline",
    title: "read issue timeline",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-timeline", params: { owner: "admin", project: "sample", number: 1 } },
    ],
    behaviorMatcher: { action: /^IssueApp\.timeline$/ },
  },
  {
    id: "I4-issue-next-state",
    title: "read issue next-state transition target",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-next-state", params: { owner: "admin", project: "sample", number: 1 } },
    ],
    behaviorMatcher: { action: /^IssueApp\.nextState$/ },
  },
  {
    id: "I5-new-issue-form",
    title: "view new issue form",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "new-issue-form", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueApp\.newIssueForm$/ },
  },
  {
    id: "I6-issue-list-tabs-and-filters",
    title: "issue list per state tab + label/milestone/search filter params",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "list-issues", params: { owner: "admin", project: "sample", state: "open" } },
      { actor: "admin", action: "list-issues", params: { owner: "admin", project: "sample", state: "closed" } },
      { actor: "admin", action: "list-issues", params: { owner: "admin", project: "sample", state: "open", milestoneId: 1 } },
      { actor: "admin", action: "list-issues", params: { owner: "admin", project: "sample", search: "parity" } },
    ],
    behaviorMatcher: { action: /^IssueApp\.issues$/, route: /\/issues$/ },
  },
  {
    id: "I7-issue-labels",
    title: "list project issue labels (issue-scoped screen)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-labels", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueLabelApp\.labels$/, route: /issue\/labels$/ },
  },
  {
    id: "I8-issue-label-styles",
    title: "read issue label stylesheet",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-label-styles", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueLabelApp\.labelStyles$/ },
  },
  {
    id: "I9-issue-labels-form",
    title: "view issue label management form",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-labels-form", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueLabelApp\.labelsForm$/ },
  },
  {
    id: "I10-issue-label-categories",
    title: "read issue label categories + first category detail",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-label-categories", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueLabelApp\.(categories|category)$/ },
  },
  {
    id: "I11-issue-api-detail",
    title: "read legacy-compat issue API",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" } },
    ],
    behaviorMatcher: { action: /^IssueApi\.getIssue$/ },
  },
  {
    id: "I12-issue-api-assignees",
    title: "read assignable-users APIs (issue + project scope)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1/assignableUsers" } },
      { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/owners/admin/projects/sample/assignableUsers" } },
    ],
    behaviorMatcher: { action: /^IssueApi\.findAssignableUsers(OfProject)?$/, route: /assignableUsers$/ },
  },
  {
    id: "I13-issue-api-sharing",
    title: "read issue sharer/sharable-users APIs",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1/findSharer" } },
      { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1/sharableUsers" } },
    ],
    behaviorMatcher: { action: /^IssueApi\.(findSharerByloginIds|findSharableUsers)$/ },
  },
  {
    id: "I14-issue-api-favorites",
    title: "read favorite-issues API",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/favoriteIssues" } },
    ],
    behaviorMatcher: { action: /^UserApi\.getFoveriteIssues$/ },
  },
  {
    id: "I15-org-issue-list",
    title: "view organization issue list",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "org-issues", params: { organization: "weblabs", state: "open" } },
    ],
    behaviorMatcher: { action: /^IssueApp\.organizationIssues$/ },
  },
  {
    id: "I16-site-issue-list",
    title: "view site-admin issue list",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "site-issue-list", params: {} },
    ],
    behaviorMatcher: { action: /^SiteApp\.issueList$/ },
  },
  {
    id: "I17-comment-edit-reveal",
    title: "reveal comment edit form in browser (both sides)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "reveal-comment-editform", params: { owner: "admin", project: "sample", number: 1 } },
    ],
    behaviorMatcher: { action: /^IssueApp\.issue$/ },
  },

  // --- mutation coverage (I18–I23): create → mutate → verify → delete chains.
  // Every created label/category is deleted by scenario end; issues/comments
  // are deleted; votes/watch/favorite toggles restore their initial state
  // within the same scenario (the db-labels projection is not tag-filtered).
  {
    id: "I18-issue-edit-state",
    title: "edit issue title/body, patch content, change state/assignee, delete issue",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "edit-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "patch-issue-content", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "resolve-issue-pk", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "change-issue-state", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "update-issue-assignees", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "probe-issue-imports", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-issue", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: {
      action: /^(IssueApp\.editIssue|IssueApi\.updateIssue|IssueApi\.updateIssueContent|IssueApi\.updateIssueState|IssueApp\.massUpdate|IssueApi\.updateAssginees|IssueApi\.imports|IssueApp\.deleteIssue)$/,
    },
  },
  {
    id: "I19-comment-lifecycle",
    title: "edit/put/patch comment, comment votes, delete comment (direct + compat), delete issue",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-issue-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "edit-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "put-issue-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "patch-issue-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "vote-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "unvote-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "create-issue-comment", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-comment-compat", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-issue", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: {
      action: /^(IssueApp\.updateComment|IssueApi\.updateIssueComment|VoteApp\.voteComment|VoteApp\.unvoteComment|IssueApp\.deleteComment|CommentApp\.delete)$/,
    },
  },
  {
    id: "I20-issue-engagement",
    title: "issue vote/unvote, watch/unwatch, favorite toggle, weight votes, sharer, noti receivers, detectChange",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "resolve-issue-pk", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "vote-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "unvote-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "watch-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "unwatch-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "unwatch-issue-get", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "toggle-favorite-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "issue-weight-votes", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "update-sharer", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "comment-noti-receivers", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "detect-issue-change", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-issue", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: {
      action: /^(VoteApp\.vote|VoteApp\.unvote|WatchApp\.watch|WatchApp\.unwatch|UserApi\.toggleFoveriteIssue|IssueApi\.upvoteWeight|IssueApi\.downvoteWeight|IssueApi\.updateSharer|IssueApi\.commentNotiRecivers|IssueApi\.detectChange)$/,
    },
  },
  {
    id: "I21-issue-label-crud",
    title: "create label, attach to issue, update, delete + category cleanup",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "create-issue-label", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "issue-label-ids", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "attach-issue-labels", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "update-issue-label", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-issue-label", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-label-category", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-issue", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: {
      action: /^(IssueLabelApp\.newLabel|IssueApi\.updateIssueLabel|IssueLabelApp\.update|IssueLabelApp\.delete)$/,
    },
  },
  {
    id: "I22-label-category-crud",
    title: "label category create → update → delete",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-label-category", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "issue-label-ids", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "update-label-category", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "delete-label-category", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: {
      action: /^(IssueLabelApp\.newCategory|IssueLabelApp\.updateCategory|IssueLabelApp\.deleteCategory)$/,
    },
  },
  {
    id: "I23-markdown-and-export-reads",
    title: "markdown render probe, migration exports (issues/labels/pairs), global labels page",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "render-markdown", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "migration-export-issues", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "migration-export-labels", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "migration-export-issuelabel-pairs", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "global-labels", params: {} },
    ],
    behaviorMatcher: {
      action: /^(MarkdownApp\.render|MigrationApp\.exportIssues|MigrationApp\.exportLabels|MigrationApp\.exportIssueLabelPairs|LabelApp\.labels)$/,
    },
  },
];

// --- read-only action helpers (I-scenarios) ---

// Both sides serve these screens through the legacy-direct path (Yoram via its
// SPA shell), so both translators share the legacy route and DOM comparison
// re-uses the runner's renderDomTarget.
function getAction(pathFor, { dom = false, spa = true } = {}) {
  return {
    translateLegacy(step) {
      return { method: "GET", path: pathFor(step) };
    },
    translateYoram(step) {
      return { method: "GET", path: pathFor(step) };
    },
    async handler(ctx) {
      const { step, resolved, options, yoramBaseUrl, helpers } = ctx;
      const target = pathFor(step);
      await helpers.requestBoth(ctx, translateLegacy(step, resolved), translateYoram(step, resolved));
      if (!dom) return;
      await helpers.renderDomTarget(ctx, {
        legacy: `${options.legacyUrl}${target}`,
        yoram: `${yoramBaseUrl}${target}`,
        spa,
      });
    },
  };
}

const ownerPath = (step, suffix) => `/${step.params.owner}/${step.params.project}${suffix}`;

function listIssuesPath(step) {
  const query = new URLSearchParams();
  if (step.params.state) query.set("state", step.params.state);
  if (step.params.milestoneId) query.set("milestoneId", String(step.params.milestoneId));
  if (step.params.search) query.set("search", step.params.search);
  const qs = query.toString();
  return ownerPath(step, `/issues${qs ? `?${qs}` : ""}`);
}

// First numeric category id from either side's categories payload.
function firstCategoryId(json) {
  const list = Array.isArray(json) ? json : Array.isArray(json?.categories) ? json.categories : [];
  const row = list.find((category) => Number(category?.id) > 0);
  return row ? Number(row.id) : null;
}

// Visible edit affordances revealed inside the comments region after a click
// (legacy swaps the comment body for a form; Yoram renders its own editor).
const COMMENT_EDIT_EXTRACT = () => {
  const region = document.querySelector("ul.comments") ?? document.body;
  return [...region.querySelectorAll("textarea, .comment-edit-form, .write-comment-box")]
    .filter((el) => el.getClientRects().length > 0)
    .map((el) => `${el.tagName} ${el.className}`.trim())
    .sort();

};

// --- mutation support helpers (I18–I23) -------------------------------------

const apiCompatBase = (step) => `/-_-api/v1/owners/${step.params.owner}/projects/${step.params.project}`;
const spaRestBase = (step) => `/api/v1/projects/${step.params.owner}/${step.params.project}`;

// Per-side issue DB pk keyed watch/favorite resource param.
function watchTranslation(method, route) {
  return (step, v) => ({ method, path: `${route}?resource.type=issue&resource.id=${v.issuePk}` });
}
const favoriteTranslation = (step, v) => ({ method: "POST", path: `/-_-api/v1/favoriteIssues/${v.issuePk}` });
const downvoteTranslation = (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/downvoteWeight` });
const sharerTranslation = (step, v, action) => ({
  method: "POST",
  path: `${apiCompatBase(step)}/issues/${v.issueNumber}/share`,
  json: { sharer: ["admin"], action },
});
const deleteCategoryTranslation = (step, v) => ({
  method: "DELETE",
  path: `/${step.params.owner}/${step.params.project}/issue/label/category/${v.categoryId}`,
});
// mutationPair accepts either a plain vars object or a (resolved, suffix)
// function so suffix-tagged names can be injected per run.
const editIssueLegacy = (step, v) => ({
  method: "POST",
  path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/edit`,
  form: { title: v.title, body: v.body, assigneeLoginId: "" },
});
const editIssueYoram = (step, v) => ({
  method: "PUT",
  path: `${apiCompatBase(step)}/issues/${v.issueNumber}`,
  json: { title: v.title, body: v.body },
});

// Run one mutation pair and classify the outcome: a violation is pushed when
// either side returns >=400 or both JSON bodies diverge semantically.
async function mutationPair(ctx, legacyBuild, yoramBuild, extraVars = {}) {
  const { state, entry, helpers } = ctx;
  const extra = typeof extraVars === "function" ? extraVars(ctx.resolved, ctx.suffix) : extraVars;
  const vars = { ...ctx.resolved, ...state, ...extra };
  const legacyTranslation = legacyBuild(ctx.step, vars);
  const yoramTranslation = yoramBuild(ctx.step, vars);
  const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
  const behaviorId = entry.behaviorIds[0] ?? null;
  if (legacyResult.status >= 400 || yoramResult.status >= 400) {
    entry.violations.push(
      violation({
        route: legacyTranslation.path,
        behaviorId,
        kind: "api",
        expected: { status: "<400" },
        actual: { legacyStatus: legacyResult.status, yoramStatus: yoramResult.status },
      }),
    );
    return { legacyResult, yoramResult };
  }
  if (legacyResult.json != null && yoramResult.json != null) {
    const expected = normalizeApiValue(legacyResult.json);
    const actual = normalizeApiValue(yoramResult.json);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      entry.violations.push(
        violation({ route: legacyTranslation.path, behaviorId, kind: "api", expected, actual }),
      );
    }
  }
  return { legacyResult, yoramResult };
}

// Graceful degradation: skip an id-dependent step when a prior discovery step
// could not resolve the ids on both sides (already recorded in entry.errors).
function whenIds(keys) {
  return async (ctx, run) => {
    if (!keys.every((key) => Number(ctx.state[key]) > 0)) return;
    await run(ctx);
  };
}

// Factory for mutation actions: independent per-side translations plus an
// optional follow-up (DOM verify / second toggle half) and an id guard.
function pairMutation(legacyBuild, yoramBuild, followUp = null, guard = null) {
  return {
    translateLegacy(step, resolved) {
      return legacyBuild(step, resolved);
    },
    translateYoram(step, resolved) {
      return yoramBuild(step, resolved);
    },
    async handler(ctx) {
      const run = async (context) => {
        await mutationPair(context, legacyBuild, yoramBuild);
        if (followUp) await followUp(context);
      };
      if (guard) await guard(ctx, run);
      else await run(ctx);
    },
  };
}

// Depth-first search for the numeric `id` of the object named `name`.
function findIdByName(node, name) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findIdByName(child, name);
      if (found !== null) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    if (node.name === name && Number(node.id) > 0) return Number(node.id);
    for (const value of Object.values(node)) {
      const found = findIdByName(value, name);
      if (found !== null) return found;
    }
  }
  return null;
}

// Migration export probes: identical read on both sides, JSON compared with
// volatile fields normalized when both respond with parseable bodies.
function exportReadAction(name, pathFor) {
  return {
    [name]: {
      translateLegacy(step) {
        return { method: "GET", path: `/migration${pathFor(step)}` };
      },
      translateYoram(step) {
        return { method: "GET", path: `/migration${pathFor(step)}` };
      },
      async handler(ctx) {
        const { step, entry, helpers } = ctx;
        const { legacyResult, yoramResult } = await helpers.requestBoth(
          ctx,
          translateLegacy(step),
          translateYoram(step),
        );
        if (legacyResult.status >= 400 || yoramResult.status >= 400) return;
        let legacyJson = null;
        try {
          legacyJson = JSON.parse(legacyResult.body);
        } catch {
          // non-JSON export body: status parity is all we compare
        }
        if (legacyJson === null || yoramResult.json === null) return;
        const expected = normalizeApiValue(legacyJson);
        const actual = normalizeApiValue(yoramResult.json);
        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
          entry.violations.push(
            violation({ route: translateLegacy(step).path, behaviorId: entry.behaviorIds[0] ?? null, kind: "api", expected, actual }),
          );
        }
      },
    },
  };
}

export const actionDefinitions = {
  "create-issue": {
    translateLegacy(step, resolved) {
      return {
        method: "POST",
        path: `/${step.params.owner}/${step.params.project}/issues/latest`,
        form: { title: resolved.title, body: resolved.body },
      };
    },
    translateYoram(step, resolved) {
      return {
        method: "POST",
        path: `/api/v1/projects/${step.params.owner}/${step.params.project}/issues`,
        json: {
          title: resolved.title,
          bodyMarkdown: resolved.body,
          assigneeLoginId: "",
          attachmentIds: [],
          labelIds: [],
          dueDate: "",
          isDraft: false,
          isPublish: true,
        },
        // legacy lands on the new issue page; render the same target for DOM diff
        pagePath: null, // filled after creation with the returned issue number
      };
    },
    async handler(ctx) {
      const { step, resolved, state, entry, options, yoramBaseUrl, helpers } = ctx;
      const legacyTranslation = translateLegacy(step, resolved);
      const yoramTranslation = translateYoram(step, resolved);
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);

      state.issueNumberLegacy = helpers.issueNumberFromLocation(legacyResult?.location ?? "");
      const yoramJson = yoramResult?.json ?? {};
      state.issueNumberYoram = Number(yoramJson.number ?? yoramJson.issue?.number ?? 0) || null;
      const semantic = {
        legacy: { title: legacyTranslation.form.title, body: legacyTranslation.form.body },
        yoram: {
          title: yoramJson.title ?? yoramJson.issue?.title ?? null,
          body: yoramJson.bodyMarkdown ?? yoramJson.issue?.bodyMarkdown ?? null,
        },
      };
      const route = step.params.owner && step.params.project ? `/${step.params.owner}/${step.params.project}` : "/";
      if (
        semantic.yoram.title === null ||
        normalizeApiValue(semantic.legacy.title) !== normalizeApiValue(semantic.yoram.title)
      ) {
        entry.violations.push(
          violation({
            route,
            behaviorId: entry.behaviorIds[0] ?? null,
            kind: "api",
            expected: semantic.legacy,
            actual: semantic.yoram,
          }),
        );
      }

      if (state.issueNumberLegacy && state.issueNumberYoram) {
        await helpers.renderDomTarget(ctx, {
          legacy: `${options.legacyUrl}/${step.params.owner}/${step.params.project}/issue/${state.issueNumberLegacy}`,
          yoram: `${yoramBaseUrl}/${step.params.owner}/${step.params.project}/issue/${state.issueNumberYoram}`,
          spa: true,
        });
      }
    },
  },

  "create-issue-comment": {
    translateLegacy(step, resolved) {
      return {
        method: "POST",
        path: `/${step.params.owner}/${step.params.project}/issue/${resolved.issueNumber}/comments`,
        form: { body: resolved.body },
      };
    },
    translateYoram(step, resolved) {
      return {
        method: "POST",
        path: `/api/v1/projects/${step.params.owner}/${step.params.project}/issues/${resolved.issueNumber}/comments`,
        json: { body: resolved.body },
        pagePath: null,
      };
    },
    async handler(ctx) {
      const { step, resolved, state, options, yoramBaseUrl, helpers } = ctx;
      const legacyTranslation = translateLegacy(step, { ...resolved, issueNumber: state.issueNumberLegacy });
      const yoramTranslation = translateYoram(step, { ...resolved, issueNumber: state.issueNumberYoram });
      await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);

      // Capture the created comment id per side (legacy redirect anchor,
      // Yoram final-page anchor) so later edit/delete/vote steps can chain.
      const anchor = (value) => {
        const match = /["'#]comment-(\d+)/u.exec(value ?? "");
        return match ? Number(match[1]) : null;
      };
      state.commentIdLegacy = anchor(legacyResult?.location) ?? state.commentIdLegacy;
      state.commentIdYoram = anchor(yoramResult?.body) ?? state.commentIdYoram;
      if (state.issueNumberLegacy && state.issueNumberYoram) {
        await helpers.renderDomTarget(ctx, {
          legacy: `${options.legacyUrl}/${step.params.owner}/${step.params.project}/issue/${state.issueNumberLegacy}`,
          yoram: `${yoramBaseUrl}/${step.params.owner}/${step.params.project}/issue/${state.issueNumberYoram}`,
          spa: true,
        });
      }
    },
  },

  // Browser-driven interaction: hover popovers never render over plain HTTP, so
  // both sides get the identical in-page trigger and the revealed popover is
  // compared as a skeleton. Any side failure lands in entry.errors with a
  // reason; a one-sided popover is a violation, not a crash.
  "hover-popover": {
    async handler(ctx) {
      const { step, suffix, entry, legacySession, yoramSession, legacyPage, yoramPage, options, yoramBaseUrl, helpers } = ctx;
      const { owner, project, path: pagePath = "/issues", selector } = step.params;
      const pages = { legacy: legacyPage, yoram: yoramPage };
      const sessions = { legacy: legacySession, yoram: yoramSession };
      const skeletons = {};
      for (const side of ["legacy", "yoram"]) {
        const url = `${side === "legacy" ? options.legacyUrl : yoramBaseUrl}/${owner}/${project}${pagePath}`;
        try {
          await helpers.setCookiesFromHeader(pages[side], url, sessions[side].cookies);
          await pages[side].goto(url, { waitUntil: "load", timeout: 30_000 });
          const method = await helpers.hoverAnchor(pages[side], selector);
          if (process.env.DIFF_HOVER_DEBUG) console.error(`[hover-debug] ${side}: trigger=${method}`);
          skeletons[side] = await helpers.raceTimeout(pages[side].evaluate(helpers.popoverExtract), `${side} popover extract`);
        } catch (error) {
          entry.errors.push(`browser ${side} (${step.action}) [${suffix}]: ${error.message}`);
          skeletons[side] = null;
        }
      }
      if (skeletons.legacy === null || skeletons.yoram === null) return;
      const route = `/${owner}${pagePath} hover ${selector}`;
      if (skeletons.legacy.length === 0 || skeletons.yoram.length === 0) {
        entry.violations.push(
          violation({
            route,
            behaviorId: entry.behaviorIds[0] ?? null,
            kind: "browser",
            expected: { visiblePopovers: skeletons.legacy.length },
            actual: { visiblePopovers: skeletons.yoram.length },
          }),
        );
        return;
      }
      const diffs = diffSkeletons(skeletons.legacy, skeletons.yoram);
      if (diffs.length > 0) {
        entry.violations.push(
          violation({ route, behaviorId: entry.behaviorIds[0] ?? null, kind: "browser", expected: skeletons.legacy, actual: skeletons.yoram }),
        );
      }
    },
  },

  // --- read-only actions (I-scenarios) ---

  "issue-detail": getAction((step) => ownerPath(step, `/issue/${step.params.number}`)),

  "issue-edit-form": getAction((step) => ownerPath(step, `/issue/${step.params.number}/editform`)),

  "issue-timeline": getAction((step) => ownerPath(step, `/issue/${step.params.number}/timeline`), { dom: false }),

  "issue-next-state": getAction((step) => ownerPath(step, `/issue/${step.params.number}/nextstate`), { dom: false }),

  "new-issue-form": getAction((step) => ownerPath(step, "/issueform")),

  "list-issues": getAction(listIssuesPath),

  "issue-labels": getAction((step) => ownerPath(step, "/issue/labels")),

  "issue-label-styles": getAction((step) => ownerPath(step, "/issue/labels.css"), { dom: false }),

  "issue-labels-form": getAction((step) => ownerPath(step, "/issue/labelsform")),

  // Categories first; then compare the detail of the first category found so
  // no hard-coded category id is needed.
  "issue-label-categories": {
    translateLegacy(step) {
      return { method: "GET", path: ownerPath(step, "/issue/label/categories") };
    },
    translateYoram(step) {
      return { method: "GET", path: ownerPath(step, "/issue/label/categories") };
    },
    async handler(ctx) {
      const { step, resolved, helpers } = ctx;
      const legacyTranslation = translateLegacy(step, resolved);
      const yoramTranslation = translateYoram(step, resolved);
      const { legacyResult } = await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
      const categoryId = firstCategoryId(JSON.parse(legacyResult.body || "null"));
      if (!categoryId) return;
      await helpers.requestBoth(
        ctx,
        { method: "GET", path: ownerPath(step, `/issue/label/category/${categoryId}`) },
        { method: "GET", path: ownerPath(step, `/issue/label/category/${categoryId}`) },
      );
    },
  },

  // Legacy-compat REST probe: Yoram mirrors the /-_-api/v1 paths verbatim, so
  // both sides get the same path and JSON payloads are compared semantically
  // (volatile fields normalized).
  "issue-api-probe": {
    translateLegacy(step) {
      return { method: "GET", path: step.params.api };
    },
    translateYoram(step) {
      return { method: "GET", path: step.params.api };
    },
    async handler(ctx) {
      const { step, entry, helpers } = ctx;
      const legacyTranslation = translateLegacy(step);
      const yoramTranslation = translateYoram(step);
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
      if (legacyResult.status >= 400 || yoramResult.status >= 400) return;
      let legacyJson = null;
      try {
        legacyJson = JSON.parse(legacyResult.body);
      } catch {
        // non-JSON legacy body: status parity is all we can compare
      }
      if (legacyJson === null || yoramResult.json === null) return;
      const expected = normalizeApiValue(legacyJson);
      const actual = normalizeApiValue(yoramResult.json);
      if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        entry.violations.push(
          violation({ route: step.params.api, behaviorId: entry.behaviorIds[0] ?? null, kind: "api", expected, actual }),
        );
      }
    },
  },

  "org-issues": getAction((step) => `/${step.params.organization}/issues?state=${step.params.state ?? ""}`),

  "site-issue-list": getAction(() => "/sites/issueList"),

  // Browser-driven interaction modeled on hover-popover: click each side's
  // comment-edit trigger on the seeded issue and skeleton-diff what the click
  // reveals. A side without a working trigger lands in entry.errors.
  "reveal-comment-editform": {
    async handler(ctx) {
      const { step, suffix, entry, legacySession, yoramSession, legacyPage, yoramPage, options, yoramBaseUrl, helpers } = ctx;
      const { owner, project, number } = step.params;
      const selectors = step.params.selectors ?? [
        '[data-toggle="comment-edit"]',
        ".comment-actions button[aria-label*='edit' i]",
        "button[data-testid='comment-edit-button']",
      ];
      const pages = { legacy: legacyPage, yoram: yoramPage };
      const sessions = { legacy: legacySession, yoram: yoramSession };
      const revealed = {};
      for (const side of ["legacy", "yoram"]) {
        const url = `${side === "legacy" ? options.legacyUrl : yoramBaseUrl}/${owner}/${project}/issue/${number}`;
        try {
          await helpers.setCookiesFromHeader(pages[side], url, sessions[side].cookies);
          await pages[side].goto(url, { waitUntil: "load", timeout: 30_000 });
          const handle = await pages[side].evaluateHandle((candidates) => {
            for (const selector of candidates) {
              const el = [...document.querySelectorAll(selector)].find((node) => node.getClientRects().length > 0);
              if (el) return el;
            }
            return null;
          }, selectors);
          const element = handle.asElement();
          if (!element) throw new Error(`no comment-edit trigger matched: ${selectors.join(", ")}`);
          await element.click();
          await new Promise((resolve) => setTimeout(resolve, 600));
          revealed[side] = await pages[side].evaluate(COMMENT_EDIT_EXTRACT);
        } catch (error) {
          entry.errors.push(`browser ${side} (${step.action}) [${suffix}]: ${error.message}`);
          revealed[side] = null;
        }
      }
      if (revealed.legacy === null || revealed.yoram === null) return;
      const route = `/${owner}/${project}/issue/${number} comment-edit-reveal`;
      if (revealed.legacy.length === 0 || revealed.yoram.length === 0) {
        entry.violations.push(
          violation({
            route,
            behaviorId: entry.behaviorIds[0] ?? null,
            kind: "browser",
            expected: { revealedForms: revealed.legacy.length },
            actual: { revealedForms: revealed.yoram.length },
          }),
        );
        return;
      }
      const diffs = diffSkeletons(revealed.legacy, revealed.yoram);
      if (diffs.length > 0) {
        entry.violations.push(
          violation({ route, behaviorId: entry.behaviorIds[0] ?? null, kind: "browser", expected: revealed.legacy, actual: revealed.yoram }),
        );
      }
    },
  },
  // --- mutation actions (I18–I23) -------------------------------------------
  //
  // Legacy keeps its direct form routes from yona-original conf/routes;
  // Yoram either mirrors the same route or takes the closest REST equivalent.
  // mutationPair pushes a violation when either side returns >=400 or both
  // JSON bodies diverge semantically, then lets the chain continue so later
  // steps degrade gracefully into entry.errors.

  // Resolves each side's DB pk for the created issue (watch/favorite/mass-update
  // resource params key on the pk, not the issue number).
  "resolve-issue-pk": {
    translateLegacy(step, resolved) {
      return { method: "GET", path: ownerPath(step, `/issue/${resolved.issueNumber}`) };
    },
    translateYoram(step, resolved) {
      return { method: "GET", path: `${spaRestBase(step)}/issues/${resolved.issueNumber}` };
    },
    async handler(ctx) {
      const { step, state, entry, suffix, helpers } = ctx;
      const { legacyResult, yoramResult } = await helpers.requestBoth(
        ctx,
        translateLegacy(step, { issueNumber: state.issueNumberLegacy }),
        translateYoram(step, { issueNumber: state.issueNumberYoram }),
      );
      // Legacy exposes the pk through the watch form's hidden resource.id input.
      const formMatch = /resource\.id"\s+value="(\d+)/u.exec(legacyResult.body ?? "");
      state.issuePkLegacy = formMatch ? Number(formMatch[1]) : null;
      const json = yoramResult.json ?? {};
      const candidate = Number(json.id ?? json.issue?.id ?? 0);
      state.issuePkYoram = candidate > 0 ? candidate : null;
      if (!state.issuePkLegacy || !state.issuePkYoram) {
        entry.errors.push(`issue pk unresolved (${step.action}) [${suffix}]: legacy=${state.issuePkLegacy} yoram=${state.issuePkYoram}`);
      }
    },
  },

  // Legacy POST /issue/:n/edit (full form bind) vs Yoram compat PUT issue.
  "edit-issue": pairMutation(editIssueLegacy, editIssueYoram, async (ctx) => {
    if (ctx.state.issueNumberLegacy && ctx.state.issueNumberYoram) {
      await ctx.helpers.renderDomTarget(ctx, {
        legacy: `${ctx.options.legacyUrl}/${ctx.step.params.owner}/${ctx.step.params.project}/issue/${ctx.state.issueNumberLegacy}`,
        yoram: `${ctx.yoramBaseUrl}/${ctx.step.params.owner}/${ctx.step.params.project}/issue/${ctx.state.issueNumberYoram}`,
        spa: true,
      });
    }
  }),

  "patch-issue-content": pairMutation(
    (step, v) => ({ method: "PATCH", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/content`, json: { content: `${v.body} patched`, original: v.body } }),
    (step, v) => ({ method: "PATCH", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/content`, json: { content: `${v.body} patched`, original: v.body } }),
  ),

  // Legacy mass-update form (cookie auth, keyed on DB pk) vs Yoram compat PATCH.
  "change-issue-state": pairMutation(
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issues`, form: { "issues[0].id": String(v.issuePk ?? ""), state: "closed" } }),
    (step, v) => ({ method: "PATCH", path: `${apiCompatBase(step)}/issues/${v.issueNumber}`, json: { state: "closed" } }),
    null,
    whenIds(["issuePkLegacy", "issuePkYoram"]),
  ),

  "update-issue-assignees": pairMutation(
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/assignees`, json: { assignees: [{ loginId: "admin" }] } }),
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/assignees`, json: { assignees: [{ loginId: "admin" }] } }),
  ),

  "delete-issue": pairMutation(
    (step, v) => ({ method: "DELETE", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/delete` }),
    (step, v) => ({ method: "DELETE", path: `${spaRestBase(step)}/issues/${v.issueNumber}` }),
  ),

  // Failing-import probe: no real upstream repo is referenced, so both sides
  // reject the request without writing anything — the pair is compared as-is.
  "probe-issue-imports": pairMutation(
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/imports`, json: { owner: "parity-sweep", repoName: `nonexistent-${v.title}`, token: "" } }),
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/imports`, json: { owner: "parity-sweep", repoName: `nonexistent-${v.title}`, token: "" } }),
  ),


  "edit-comment": pairMutation(
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/comments/${v.commentId}`, form: { body: `${v.body} edited` } }),
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/comments/${v.commentId}`, form: { body: `${v.body} edited` } }),
    null,
    whenIds(["commentIdLegacy", "commentIdYoram"]),
  ),

  "put-issue-comment": pairMutation(
    (step, v) => ({ method: "PUT", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/comments/${v.commentId}`, json: { body: `${v.body} put` } }),
    (step, v) => ({ method: "PUT", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/comments/${v.commentId}`, json: { body: `${v.body} put` } }),
    null,
    whenIds(["commentIdLegacy", "commentIdYoram"]),
  ),

  "patch-issue-comment": pairMutation(
    (step, v) => ({ method: "PATCH", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/comments/${v.commentId}`, json: { body: `${v.body} patched` } }),
    (step, v) => ({ method: "PATCH", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/comments/${v.commentId}`, json: { body: `${v.body} patched` } }),
    null,
    whenIds(["commentIdLegacy", "commentIdYoram"]),
  ),

  "delete-comment": pairMutation(
    (step, v) => ({ method: "DELETE", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/comment/${v.commentId}/delete` }),
    (step, v) => ({ method: "DELETE", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/comment/${v.commentId}/delete` }),
    null,
    whenIds(["commentIdLegacy", "commentIdYoram"]),
  ),

  "delete-comment-compat": pairMutation(
    (step, v) => ({ method: "DELETE", path: `/comments/issue/${v.commentId}` }),
    (step, v) => ({ method: "DELETE", path: `/comments/issue/${v.commentId}` }),
    null,
    whenIds(["commentIdLegacy", "commentIdYoram"]),
  ),

  "vote-issue": pairMutation(
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/vote` }),
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/vote` }),
  ),

  "unvote-issue": pairMutation(
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/unvote` }),
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/unvote` }),
  ),

  "vote-comment": pairMutation(
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/comment/${v.commentId}/vote` }),
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/comment/${v.commentId}/vote` }),
    null,
    whenIds(["commentIdLegacy", "commentIdYoram"]),
  ),

  "unvote-comment": pairMutation(
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/comment/${v.commentId}/unvote` }),
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/${v.issueNumber}/comment/${v.commentId}/unvote` }),
    null,
    whenIds(["commentIdLegacy", "commentIdYoram"]),
  ),

  "watch-issue": pairMutation(
    watchTranslation("POST", "/watch"),
    watchTranslation("POST", "/watch"),
    null,
    whenIds(["issuePkLegacy", "issuePkYoram"]),
  ),

  "unwatch-issue": pairMutation(
    watchTranslation("POST", "/unwatch"),
    watchTranslation("POST", "/unwatch"),
    null,
    whenIds(["issuePkLegacy", "issuePkYoram"]),
  ),

  "unwatch-issue-get": pairMutation(
    watchTranslation("GET", "/unwatch"),
    watchTranslation("GET", "/unwatch"),
    null,
    whenIds(["issuePkLegacy", "issuePkYoram"]),
  ),

  // Toggle on then toggle back off — favorite state restored by scenario end.
  "toggle-favorite-issue": pairMutation(
    (step, v) => ({ method: "POST", path: `/-_-api/v1/favoriteIssues/${v.issuePk}` }),
    (step, v) => ({ method: "POST", path: `/-_-api/v1/favoriteIssues/${v.issuePk}` }),
    async (ctx) => {
      await mutationPair(ctx, favoriteTranslation, favoriteTranslation);
    },
    whenIds(["issuePkLegacy", "issuePkYoram"]),
  ),

  // +1 then -1 — weight restored by scenario end.
  "issue-weight-votes": pairMutation(
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/upvoteWeight` }),
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/upvoteWeight` }),
    async (ctx) => {
      await mutationPair(ctx, downvoteTranslation, downvoteTranslation);
    },
  ),

  "update-sharer": pairMutation(
    (step, v) => sharerTranslation(step, v, "add"),
    (step, v) => sharerTranslation(step, v, "add"),
    async (ctx) => {
      await mutationPair(ctx, (step, v) => sharerTranslation(step, v, "remove"), (step, v) => sharerTranslation(step, v, "remove"));
    },
  ),

  "comment-noti-receivers": pairMutation(
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/commentNotiReceivers`, json: { comment: v.body, parentCommentId: "" } }),
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/commentNotiReceivers`, json: { comment: v.body, parentCommentId: "" } }),
  ),

  "detect-issue-change": pairMutation(
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/detectChange`, json: { issueBodyChecksum: "differential-sweep-checksum", numOfComments: 0 } }),
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issues/${v.issueNumber}/detectChange`, json: { issueBodyChecksum: "differential-sweep-checksum", numOfComments: 0 } }),
  ),

  // Label CRUD. Created names embed the sweep suffix so discovery is exact and
  // cleanup deletes exactly what was created.
  "create-issue-label": pairMutation(
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/labels`, form: { labelName: v.labelName, categoryName: v.categoryName, labelColor: "#123456" } }),
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/labels`, form: { labelName: v.labelName, categoryName: v.categoryName, labelColor: "#123456" } }),
    (resolved, suffix) => ({ ...resolved, labelName: `parity-label-${suffix}`, categoryName: `parity-cat-${suffix}` }),
  ),

  "issue-label-ids": {
    translateLegacy(step) {
      return { method: "GET", path: ownerPath(step, "/issue/label/categories") };
    },
    translateYoram(step) {
      return { method: "GET", path: ownerPath(step, "/issue/label/categories") };
    },
    async handler(ctx) {
      const { step, state, entry, suffix, helpers } = ctx;
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, translateLegacy(step), translateYoram(step));
      let legacyJson = null;
      try {
        legacyJson = JSON.parse(legacyResult.body || "null");
      } catch {
        // non-JSON categories body: discovery falls through to the error below
      }
      state.categoryIdLegacy = findIdByName(legacyJson, `parity-cat-${suffix}`);
      state.categoryIdYoram = findIdByName(yoramResult.json, `parity-cat-${suffix}`);
      state.labelIdLegacy = findIdByName(legacyJson, `parity-label-${suffix}`);
      state.labelIdYoram = findIdByName(yoramResult.json, `parity-label-${suffix}`);
      if (!state.labelIdLegacy && !state.labelIdYoram && !state.categoryIdLegacy && !state.categoryIdYoram) {
        entry.errors.push(`label/category ids unresolved (${step.action}) [${suffix}]: nothing matched the sweep-suffixed names`);
      }
    },
  },

  // Attach replaces the issue's whole label set; sending [] detaches again.
  "attach-issue-labels": pairMutation(
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issuelabel/${v.issueNumber}`, json: [String(v.labelId)] }),
    (step, v) => ({ method: "POST", path: `${apiCompatBase(step)}/issuelabel/${v.issueNumber}`, json: [String(v.labelId)] }),
    null,
    whenIds(["labelIdLegacy", "labelIdYoram", "issueNumberLegacy", "issueNumberYoram"]),
  ),

  "update-issue-label": pairMutation(
    (step, v) => ({ method: "PUT", path: `/${step.params.owner}/${step.params.project}/issue/label/${v.labelId}`, form: { name: `${v.labelName}-renamed`, color: "#654321" } }),
    (step, v) => ({ method: "PUT", path: `/${step.params.owner}/${step.params.project}/issue/label/${v.labelId}`, form: { name: `${v.labelName}-renamed`, color: "#654321" } }),
    null,
    whenIds(["labelIdLegacy", "labelIdYoram"]),
  ),

  "delete-issue-label": pairMutation(
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/label/${v.labelId}/delete`, form: { _method: "delete" } }),
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/label/${v.labelId}/delete`, form: { _method: "delete" } }),
    null,
    whenIds(["labelIdLegacy", "labelIdYoram"]),
  ),

  "create-label-category": pairMutation(
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/label/categories`, form: { name: v.categoryName } }),
    (step, v) => ({ method: "POST", path: `/${step.params.owner}/${step.params.project}/issue/label/categories`, form: { name: v.categoryName } }),
    (resolved, suffix) => ({ ...resolved, categoryName: `parity-cat-${suffix}` }),
  ),

  "update-label-category": pairMutation(
    (step, v) => ({ method: "PUT", path: `/${step.params.owner}/${step.params.project}/issue/label/category/${v.categoryId}`, form: { name: `${v.categoryName}-renamed` } }),
    (step, v) => ({ method: "PUT", path: `/${step.params.owner}/${step.params.project}/issue/label/category/${v.categoryId}`, form: { name: `${v.categoryName}-renamed` } }),
    null,
    whenIds(["categoryIdLegacy", "categoryIdYoram"]),
  ),

  "delete-label-category": pairMutation(
    deleteCategoryTranslation,
    deleteCategoryTranslation,
    null,
    whenIds(["categoryIdLegacy", "categoryIdYoram"]),
  ),

  // Markdown preview endpoint: legacy renders; a Yoram without the route is a
  // divergence finding, not an infra failure.
  "render-markdown": pairMutation(
    (step, v) => ({ method: "POST", path: `/markdown/${step.params.owner}/${step.params.project}`, form: { body: v.body } }),
    (step, v) => ({ method: "POST", path: `/markdown/${step.params.owner}/${step.params.project}`, form: { body: v.body } }),
  ),

  ...exportReadAction("migration-export-issues", (step) => `/${step.params.owner}/projects/${step.params.project}/issues`),
  ...exportReadAction("migration-export-labels", (step) => `/${step.params.owner}/projects/${step.params.project}/labels`),
  ...exportReadAction("migration-export-issuelabel-pairs", (step) => `/${step.params.owner}/projects/${step.params.project}/issuelabel`),

  "global-labels": getAction(() => "/labels"),
};
