// PullRequest + code/commit/branch domain: read-only PR list/detail/forms,
// commit history, code browser and branch list scenarios.
//
// Domain module contract (see scenarios/index.mjs).
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { translateLegacy, translateYoram } from "../adapters.mjs";

const execGit = promisify(execFile);
const GIT_TIMEOUT_MS = 120_000;

async function git(args, options = {}) {
  return execGit("git", args, {
    timeout: GIT_TIMEOUT_MS,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    ...options,
  });
}

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
  // --- read-only extensions (R10–R12) ---
  {
    id: "R10-compare-and-file-views",
    title: "code compare range and per-rev file views (open/raw/image/download)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "code-compare", params: { owner: "admin", project: "sample", revA: "main", revB: "feature/ui" } },
      { actor: "admin", action: "view-code-file", params: { owner: "admin", project: "sample", rev: "main", path: "README.md" } },
      { actor: "admin", action: "fetch-raw-file", params: { owner: "admin", project: "sample", rev: "main", path: "README.md" } },
      { actor: "admin", action: "fetch-image-file", params: { owner: "admin", project: "sample", rev: "main", path: "README.md" } },
      { actor: "admin", action: "download-code-archive", params: { owner: "admin", project: "sample", branch: "main" } },
    ],
    behaviorMatcher: { action: /^(CompareApp\.compare|CodeApp\.(openFile|showRawFile|showImageFile|download))$/, route: /(compare|files|rawcode|image|download)/ },
  },
  {
    id: "R11-code-ajax-nobranch",
    title: "code browser ajax fragments without explicit branch",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "browse-code-ajax-nobranch", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "browse-code-ajax-nobranch-slash", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "browse-code-ajax-nobranch-path", params: { owner: "admin", project: "sample", path: "README.md" } },
    ],
    behaviorMatcher: { action: /^CodeApp\.ajaxRequest$/, route: /code\/!/ },
  },
  {
    id: "R12-newfork-reviews-attachments",
    title: "newFork page, review thread list, project attachment list",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-newfork-page", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "list-reviews", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "list-project-files", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^(PullRequestApp\.newFork|ReviewThreadApp\.reviewThreads|AttachmentApp\.getFileList)$/, route: /(newFork|reviews|files)$/ },
  },

  // --- mutation coverage (R13–R16): divergence-pattern proof wave. Every
  // mutation is error-tolerant: a one-sided >=400 or semantic mismatch pushes
  // an api violation and later steps degrade gracefully into entry.errors.
  {
    id: "R13-pr-lifecycle-mutation",
    title: "create/edit/comment/close/open/accept a pull request, then close it",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-pullrequest", params: { owner: "admin", project: "sample", fromBranch: "main", toBranch: "feature/ui" } },
      { actor: "admin", action: "edit-pullrequest", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "comment-pullrequest", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "close-pullrequest", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "open-pullrequest", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "accept-pullrequest", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "close-pullrequest", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^PullRequestApp\.(newPullRequest|editPullRequest|newComment|close|open|accept)$/, route: /pullRequest/ },
  },
  {
    id: "R14-commit-comment-lifecycle",
    title: "post a commit comment and delete it again",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "comment-commit", params: { owner: "admin", project: "sample", commitId: "HEAD" } },
      { actor: "admin", action: "delete-commit-comment", params: { owner: "admin", project: "sample", commitId: "HEAD" } },
    ],
    behaviorMatcher: { action: /^CodeHistoryApp\.(newComment|deleteComment)$/, route: /commit/ },
  },
  {
    id: "R15-branch-default-toggle",
    title: "toggle default branch to feature/ui and back to main",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "set-default-branch", params: { owner: "admin", project: "sample", branch: "feature/ui" } },
      { actor: "admin", action: "list-branches", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "set-default-branch", params: { owner: "admin", project: "sample", branch: "main" } },
    ],
    behaviorMatcher: { action: /^BranchApp\.setAsDefault$/, route: /setAsDefault/ },
  },
  {
    id: "R16-pr-review-points",
    title: "add and remove a review point on the seeded pull request",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "review-pullrequest", params: { owner: "admin", project: "sample", prId: 1 } },
      { actor: "admin", action: "unreview-pullrequest", params: { owner: "admin", project: "sample", prId: 1 } },
    ],
    behaviorMatcher: { action: /^ReviewApp\.(un)?review$/, route: /review$/ },
  },
  {
    id: "R17-git-client-pair",
    title: "git clone + push through smart-http on a throwaway project",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "git-pair-clone-push", params: { owner: "admin" } },
    ],
    behaviorMatcher: { action: /^GitApp\.serviceRpc$/ },
  },
  {
    id: "R18-throwaway-branch-thread-lifecycle",
    title: "merge a throwaway pull request, toggle its review thread, and delete only its source branch",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "throwaway-pr-branch-thread-lifecycle", params: { owner: "admin" } },
    ],
    behaviorMatcher: {
      action: /^(PullRequestApp\.deleteFromBranch|CommentThreadApp\.(close|open))$/,
      route: /^(DELETE \/:ownerName\/:project\/pullRequest\/:id\/deletefrombranch|POST \/threads\/:id\/(close|open))$/,
    },
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
    case "code-compare": return `${base}/compare/${p.revA}..${p.revB}`;
    case "view-code-file": return `${base}/files/${p.rev}/${p.path}`;
    case "fetch-raw-file": return `${base}/rawcode/${p.rev}/${p.path}`;
    case "fetch-image-file": return `${base}/image/${p.rev}/${p.path}`;
    case "download-code-archive": return `${base}/code/${p.branch}/download`;
    case "browse-code-ajax-nobranch": return `${base}/code/!`;
    case "browse-code-ajax-nobranch-slash": return `${base}/code/!/`;
    case "browse-code-ajax-nobranch-path": return `${base}/code/!/${p.path}`;
    case "view-newfork-page": return `${base}/newFork`;
    case "list-reviews": return `${base}/reviews`;
    case "list-project-files": return `${base}/files`;
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
  // R10–R12 read extensions
  "code-compare",
  "view-newfork-page",
  "list-reviews",
  "browse-code-ajax-nobranch",
  "browse-code-ajax-nobranch-slash",
  "browse-code-ajax-nobranch-path",
];

// Raw rev-path actions (rawcode/image/download, per-rev file view, project
// attachment list): responses are bytes or fragments rather than comparable
// pages, so they stop after the paired request — status failures land in
// entry.errors via requestBoth.
const rawGet = () => ({
  translateLegacy(step) {
    return { method: "GET", path: legacyPath(step) };
  },
  translateYoram(step) {
    return { method: "GET", path: legacyPath(step) };
  },
  async handler(ctx) {
    const { step, resolved } = ctx;
    await ctx.helpers.requestBoth(ctx, translateLegacy(step, resolved), translateYoram(step, resolved));
  },
});

const RAW_ACTIONS = [
  "view-code-file",
  "fetch-raw-file",
  "fetch-image-file",
  "download-code-archive",
  "list-project-files",
];

// --- mutation definitions (R13–R16) -----------------------------------------

import { violation } from "../report.mjs";
import { normalizeApiValue } from "../diff.mjs";

function prSuffixTitle(ctx, mark = "") {
  return `Differential sweep PR ${ctx.suffix}${mark}`;
}

// One-sided failure is the divergence signal for a mutation pair; both-side
// failures are environment/seed issues and stay in entry.errors only.
function ensureOutcomeParity(ctx, route, legacyResult, yoramResult) {
  const legacyFailed = legacyResult.status >= 400;
  const yoramFailed = yoramResult.status >= 400;
  if (legacyFailed !== yoramFailed) {
    ctx.entry.violations.push(
      violation({
        route,
        behaviorId: ctx.entry.behaviorIds[0] ?? null,
        kind: "api",
        expected: { status: legacyResult.status },
        actual: { status: yoramResult.status },
      }),
    );
    return false;
  }
  return !legacyFailed && !yoramFailed;
}

function requireCreatedPullRequest(ctx) {
  const { state, entry, suffix } = ctx;
  if (!state.prNumberLegacy || !state.prNumberYoram) {
    entry.errors.push(`${ctx.step.action} skipped [${suffix}]: no pull request created earlier in this scenario`);
    return false;
  }
  return true;
}

async function resolveProjectIds(ctx) {
  const { step, state, entry, suffix, legacySession, yoramSession } = ctx;
  if (state.projectIdLegacy && state.projectIdYoram) return true;
  const { owner, project } = step.params;
  const formPage = await legacySession.request({
    method: "GET",
    path: `/${owner}/${project}/newPullRequestForm`,
  });
  const optionMatch =
    formPage.status < 400
      ? new RegExp(`<option value="(\\d+)"[^>]*>\\s*${owner}\\s*/\\s*${project}`).exec(formPage.body ?? "")
      : null;
  if (optionMatch) state.projectIdLegacy = optionMatch[1];
  const options = await yoramSession.request({
    method: "GET",
    path: `/api/v1/owners/${owner}/projects/${project}/pull-requests/form-options`,
  });
  const yoramOption = (options.json?.toProjects ?? options.json?.to_projects ?? []).find(
    (option) => option.projectName === project || option.project_name === project,
  );
  if (yoramOption) state.projectIdYoram = String(yoramOption.id);
  if (!state.projectIdLegacy || !state.projectIdYoram) {
    entry.errors.push(
      `project id unresolved [${suffix}]: legacy=${state.projectIdLegacy ?? "none"} yoram=${state.projectIdYoram ?? "none"}`,
    );
    return false;
  }
  return true;
}

function firstCommitCommentId(json) {
  const queue = [json];
  while (queue.length > 0) {
    const node = queue.shift();
    if (Array.isArray(node)) {
      queue.push(...node);
    } else if (node && typeof node === "object") {
      if (Array.isArray(node.comments) && node.comments.length > 0 && Number(node.comments[0]?.id) > 0) {
        return Number(node.comments[0].id);
      }
      queue.push(...Object.values(node));
    }
  }
  return null;
}

const MUTATION_DEFINITIONS = {
  "create-pullrequest": {
    translateLegacy(step, resolved) {
      return {
        method: "POST",
        path: `/${step.params.owner}/${step.params.project}/pullRequests`,
        form: {
          title: resolved.title,
          body: resolved.body,
          fromProjectId: resolved.fromProjectId,
          fromBranch: resolved.fromBranch,
          toProjectId: resolved.toProjectId,
          toBranch: resolved.toBranch,
        },
      };
    },
    translateYoram(step, resolved) {
      return {
        method: "POST",
        path: `/api/v1/owners/${step.params.owner}/projects/${step.params.project}/pull-requests`,
        json: {
          title: resolved.title,
          bodyMarkdown: resolved.body,
          fromProjectId: Number(resolved.fromProjectId),
          fromBranch: resolved.fromBranch,
          toProjectId: Number(resolved.toProjectId),
          toBranch: resolved.toBranch,
          attachmentIds: [],
        },
      };
    },
    async handler(ctx) {
      const { step, state, entry, suffix, helpers } = ctx;
      if (!(await resolveProjectIds(ctx))) return;
      const shared = {
        title: prSuffixTitle(ctx),
        body: `Differential sweep PR body ${suffix}`,
        fromBranch: step.params.fromBranch,
        toBranch: step.params.toBranch,
        fromProjectId: state.projectIdLegacy,
        toProjectId: state.projectIdLegacy,
      };
      const legacyTranslation = translateLegacy(step, shared);
      const yoramTranslation = translateYoram(step, {
        ...shared,
        fromProjectId: state.projectIdYoram,
        toProjectId: state.projectIdYoram,
      });
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
      state.prNumberLegacy = Number((/\/pullRequest\/(\d+)/u.exec(legacyResult.location ?? "") ?? [])[1]) || null;
      state.prFromBranch = step.params.fromBranch;
      state.prToBranch = step.params.toBranch;
      const ok = ensureOutcomeParity(ctx, legacyTranslation.path, legacyResult, yoramResult);
      if (ok && state.prNumberLegacy && state.prNumberYoram) {
        const semantic = {
          legacy: { title: shared.title },
          yoram: { title: yoramResult.json?.title ?? null },
        };
        if (normalizeApiValue(semantic.legacy.title) !== normalizeApiValue(semantic.yoram.title)) {
          entry.violations.push(
            violation({ route: legacyTranslation.path, behaviorId: entry.behaviorIds[0] ?? null, kind: "api", expected: semantic.legacy, actual: semantic.yoram }),
          );
        }
        await helpers.renderDomTarget(ctx, {
          legacy: `${ctx.options.legacyUrl}/${step.params.owner}/${step.params.project}/pullRequest/${state.prNumberLegacy}`,
          yoram: `${ctx.yoramBaseUrl}/${step.params.owner}/${step.params.project}/pullRequest/${state.prNumberYoram}`,
          spa: true,
        });
      }
    },
  },

  "edit-pullrequest": {
    translateLegacy(step, resolved) {
      return {
        method: "POST",
        path: `/${step.params.owner}/${step.params.project}/pullRequest/${resolved.prId}/edit`,
        form: {
          title: resolved.title,
          body: resolved.body,
          fromProjectId: resolved.fromProjectId,
          fromBranch: resolved.fromBranch,
          toProjectId: resolved.toProjectId,
          toBranch: resolved.toBranch,
        },
      };
    },
    translateYoram(step, resolved) {
      return {
        method: "PATCH",
        path: `/api/v1/owners/${step.params.owner}/projects/${step.params.project}/pull-requests/${resolved.prId}`,
        json: { title: resolved.title, bodyMarkdown: resolved.body, attachmentIds: [] },
      };
    },
    async handler(ctx) {
      const { step, state, suffix, helpers } = ctx;
      if (!requireCreatedPullRequest(ctx)) return;
      const shared = {
        title: prSuffixTitle(ctx, " (edited)"),
        body: `Differential sweep PR body ${suffix} (edited)`,
        fromBranch: state.prFromBranch,
        toBranch: state.prToBranch,
      };
      const legacyTranslation = translateLegacy(step, {
        ...shared,
        prId: state.prNumberLegacy,
        fromProjectId: state.projectIdLegacy,
        toProjectId: state.projectIdLegacy,
      });
      const yoramTranslation = translateYoram(step, {
        ...shared,
        prId: state.prNumberYoram,
      });
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
      ensureOutcomeParity(ctx, legacyTranslation.path, legacyResult, yoramResult);
    },
  },

  "comment-pullrequest": {
    translateLegacy(step, resolved) {
      return {
        method: "POST",
        path: `/${step.params.owner}/${step.params.project}/pullRequest/${resolved.prId}/comments`,
        form: { body: resolved.body },
      };
    },
    translateYoram(step, resolved) {
      return {
        method: "POST",
        path: `/api/v1/owners/${step.params.owner}/projects/${step.params.project}/pull-requests/${resolved.prId}/comments`,
        json: { contentsMarkdown: resolved.body, attachmentIds: [] },
      };
    },
    async handler(ctx) {
      const { step, state, suffix, helpers } = ctx;
      if (!requireCreatedPullRequest(ctx)) return;
      const shared = { body: `Differential sweep PR comment ${suffix}` };
      const legacyTranslation = translateLegacy(step, { ...shared, prId: state.prNumberLegacy });
      const yoramTranslation = translateYoram(step, { ...shared, prId: state.prNumberYoram });
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
      ensureOutcomeParity(ctx, legacyTranslation.path, legacyResult, yoramResult);
    },
  },
};

// Simple state-toggle mutations on the scenario-created pull request; legacy
// uses its direct form route while Yoram exposes the same operation via REST.
function pullRequestStateMutation(name, yoramTail) {
  return {
    translateLegacy(step, resolved) {
      return {
        method: "POST",
        path: `/${step.params.owner}/${step.params.project}/pullRequest/${resolved.prId}/${name}`,
      };
    },
    translateYoram(step, resolved) {
      return {
        method: "POST",
        path: `/api/v1/owners/${step.params.owner}/projects/${step.params.project}/pull-requests/${resolved.prId}${yoramTail}`,
      };
    },
    async handler(ctx) {
      const { step, state, helpers } = ctx;
      if (!requireCreatedPullRequest(ctx)) return;
      const legacyTranslation = translateLegacy(step, { ...step.params, prId: state.prNumberLegacy });
      const yoramTranslation = translateYoram(step, { ...step.params, prId: state.prNumberYoram });
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
      ensureOutcomeParity(ctx, legacyTranslation.path, legacyResult, yoramResult);
    },
  };
}

const PR_STATE_MUTATIONS = {
  "close-pullrequest": pullRequestStateMutation("close", "/close"),
  "open-pullrequest": pullRequestStateMutation("open", "/open"),
  "accept-pullrequest": pullRequestStateMutation("accept", "/accept"),
};

const REVIEW_MUTATIONS = {
  // Targets the seeded pull request #1 (present on both sides); a review point
  // is added and then removed again so the sweep leaves no reviewer residue.
  "review-pullrequest": {
    translateLegacy(step) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/pullRequest/${step.params.prId}/review` };
    },
    translateYoram(step) {
      return { method: "POST", path: `/api/v1/owners/${step.params.owner}/projects/${step.params.project}/pull-requests/${step.params.prId}/review` };
    },
    async handler(ctx) {
      const { step, helpers } = ctx;
      const { legacyResult, yoramResult } = await helpers.requestBoth(
        ctx,
        translateLegacy(step, step.params),
        translateYoram(step, step.params),
      );
      ensureOutcomeParity(ctx, `/${step.params.owner}/${step.params.project}/pullRequest/${step.params.prId}/review`, legacyResult, yoramResult);
    },
  },
  "unreview-pullrequest": {
    translateLegacy(step) {
      return { method: "POST", path: `/${step.params.owner}/${step.params.project}/pullRequest/${step.params.prId}/unreview` };
    },
    translateYoram(step) {
      return { method: "POST", path: `/api/v1/owners/${step.params.owner}/projects/${step.params.project}/pull-requests/${step.params.prId}/unreview` };
    },
    async handler(ctx) {
      const { step, helpers } = ctx;
      const { legacyResult, yoramResult } = await helpers.requestBoth(
        ctx,
        translateLegacy(step, step.params),
        translateYoram(step, step.params),
      );
      ensureOutcomeParity(ctx, `/${step.params.owner}/${step.params.project}/pullRequest/${step.params.prId}/unreview`, legacyResult, yoramResult);
    },
  },
};

const COMMIT_COMMENT_MUTATIONS = {
  "comment-commit": {
    translateLegacy(step, resolved) {
      return {
        method: "POST",
        path: `/${step.params.owner}/${step.params.project}/commit/${resolved.commitId}/comments`,
        form: { contents: resolved.body },
      };
    },
    translateYoram(step, resolved) {
      return {
        method: "POST",
        path: `/api/v1/projects/${step.params.owner}/${step.params.project}/commit/${resolved.commitId}/comments`,
        json: { contentsMarkdown: resolved.body, attachmentIds: [] },
      };
    },
    async handler(ctx) {
      const { step, state, entry, suffix, helpers } = ctx;
      const shared = {
        commitId: step.params.commitId,
        body: `Differential sweep commit comment ${suffix}`,
      };
      const legacyTranslation = translateLegacy(step, shared);
      const yoramTranslation = translateYoram(step, shared);
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
      if (!ensureOutcomeParity(ctx, legacyTranslation.path, legacyResult, yoramResult)) return;
      state.commitCommentIdLegacy =
        Number((/#comment-(\d+)/u.exec(legacyResult.location ?? "") ?? [])[1]) || null;
      if (!state.commitCommentIdLegacy && legacyResult.status < 400) {
        const commitPage = await ctx.legacySession.request({
          method: "GET",
          path: `/${step.params.owner}/${step.params.project}/commit/${step.params.commitId}`,
        });
        state.commitCommentIdLegacy =
          Number((/comments\/(\d+)\/delete/u.exec(commitPage.body ?? "") ?? [])[1]) || null;
      }
      state.commitCommentIdYoram = firstCommitCommentId(yoramResult.json);
      if (!state.commitCommentIdLegacy || !state.commitCommentIdYoram) {
        entry.errors.push(
          `commit comment id unresolved [${suffix}]: legacy=${state.commitCommentIdLegacy ?? "none"} yoram=${state.commitCommentIdYoram ?? "none"}`,
        );
      }
    },
  },

  "delete-commit-comment": {
    translateLegacy(step, resolved) {
      return {
        method: "DELETE",
        path: `/${step.params.owner}/${step.params.project}/commit/${resolved.commitId}/comments/${resolved.commentId}/delete`,
      };
    },
    translateYoram(step, resolved) {
      return {
        method: "DELETE",
        path: `/api/v1/projects/${step.params.owner}/${step.params.project}/commit/${resolved.commitId}/comments/${resolved.commentId}`,
      };
    },
    async handler(ctx) {
      const { step, state, entry, suffix, helpers } = ctx;
      if (!state.commitCommentIdLegacy || !state.commitCommentIdYoram) {
        entry.errors.push(`delete-commit-comment skipped [${suffix}]: no commit comment recorded earlier in this scenario`);
        return;
      }
      const legacyTranslation = translateLegacy(step, {
        ...step.params,
        commentId: state.commitCommentIdLegacy,
      });
      const yoramTranslation = translateYoram(step, {
        ...step.params,
        commentId: state.commitCommentIdYoram,
      });
      const { legacyResult, yoramResult } = await helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
      ensureOutcomeParity(ctx, legacyTranslation.path, legacyResult, yoramResult);
      state.commitCommentIdLegacy = null;
      state.commitCommentIdYoram = null;
    },
  },
};

const BRANCH_MUTATIONS = {
  // Toggles the default branch and restores it within R15; Yoram exposes the
  // same operation as a REST default-branch POST instead of the legacy direct
  // form route. Legacy branch names are URL-encoded like the UI does.
  "set-default-branch": {
    translateLegacy(step) {
      return {
        method: "POST",
        path: `/${step.params.owner}/${step.params.project}/code/${encodeURIComponent(step.params.branch)}/setAsDefault`,
      };
    },
    translateYoram(step) {
      return {
        method: "POST",
        path: `/api/v1/projects/${step.params.owner}/${step.params.project}/branches/default`,
        json: { branchName: step.params.branch },
      };
    },
    async handler(ctx) {
      const { step, helpers } = ctx;
      const { legacyResult, yoramResult } = await helpers.requestBoth(
        ctx,
        translateLegacy(step, step.params),
        translateYoram(step, step.params),
      );
      ensureOutcomeParity(ctx, `/${step.params.owner}/${step.params.project}/code setAsDefault ${step.params.branch}`, legacyResult, yoramResult);
    },
  },
};

Object.assign(MUTATION_DEFINITIONS, PR_STATE_MUTATIONS, REVIEW_MUTATIONS, COMMIT_COMMENT_MUTATIONS, BRANCH_MUTATIONS);
// --- wave A: git smart-http client pair (B-0224) -----------------------------
//
// Drives a real git client against both servers inside a throwaway project:
// clone (upload-pack), identical commit on both clones, push (receive-pack),
// then compares ls-remote hashes. Throwaway project is deleted at both ends.
const GIT_PAIR_ACTIONS = {
  "git-pair-clone-push": {
    // Registry contract requires translator functions; execution is fully
    // client-side (real git against both servers), so these stay inert.
    translateLegacy: () => ({ method: "GET", path: "/__git-pair-client-side__" }),
    translateYoram: () => ({ method: "GET", path: "/__git-pair-client-side__" }),
    async handler(ctx) {
      const { step, entry, suffix, helpers } = ctx;
      const owner = step.params.owner;
      const name = `parity-git-${suffix}`;
      const legacyUrl = ctx.options.legacyUrl;
      const yoramUrl = ctx.yoramBaseUrl;

      // Create the throwaway project on both sides.
      await helpers.sendRaw(ctx, "legacy", {
        method: "POST",
        path: "/projects",
        form: { owner, name, overview: `parity git pair ${suffix}`, projectScope: "PUBLIC", vcs: "GIT", code: "true", issue: "true", pullRequest: "true", review: "true", milestone: "true", board: "true" },
      });
      await helpers.sendRaw(ctx, "yoram", {
        method: "POST",
        path: `/api/v1/owners/${owner}/projects`,
        json: { projectName: name, overview: `parity git pair ${suffix}`, projectScope: "PUBLIC", vcs: "GIT" },
      });

      const fail = (message) => entry.errors.push(`git-pair [${suffix}]: ${message}`);
      const remote = (baseUrl) => `${baseUrl.replace("//", "//admin:admin@")}/${owner}/${name}`;
      const remoteRefs = async (baseUrl) => {
        const output = await git(["ls-remote", remote(baseUrl)]).catch(() => ({ stdout: "" }));
        return output.stdout
          .split("\n")
          .filter((line) => line && !line.endsWith("\tHEAD"))
          .sort()
          .join("\n");
      };
      const cloneInto = async (baseUrl, dir) => {
        // Repo init can lag the project-create response; retry briefly.
        for (let attempt = 0; attempt < 5; attempt += 1) {
          try {
            await git(["clone", "--depth", "50", remote(baseUrl), dir]);
            return true;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 2_000));
          }
        }
        return false;
      };

      const workRoot = mkdtempSync(`${tmpdir()}/parity-git-`);
      try {
        const legacyDir = `${workRoot}/legacy`;
        const yoramDir = `${workRoot}/yoram`;
        if (!(await cloneInto(legacyUrl, legacyDir))) return fail("git clone failed against legacy");
        if (!(await cloneInto(yoramUrl, yoramDir))) return fail("git clone failed against yoram");

        // The parity seed repos may be empty on both sides; only disagreement
        // in the pre-push ref state is a finding.
        const preLegacy = await remoteRefs(legacyUrl);
        const preYoram = await remoteRefs(yoramUrl);
        if (preLegacy !== preYoram) {
          fail(`seed HEAD diverged after clone: ${preLegacy.slice(0, 12) || "<empty>"} vs ${preYoram.slice(0, 12) || "<empty>"}`);
        }

        // Identical commit on both clones: same tree, message, identity and
        // fixed dates -> identical SHA, so pushed refs must match exactly.
        const { writeFileSync } = await import("node:fs");
        for (const dir of [legacyDir, yoramDir]) {
          writeFileSync(`${dir}/parity-git-pair.txt`, `parity git pair payload ${suffix}\n`);
          const env = {
            GIT_AUTHOR_NAME: "parity",
            GIT_AUTHOR_EMAIL: "parity@example.com",
            GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
            GIT_COMMITTER_NAME: "parity",
            GIT_COMMITTER_EMAIL: "parity@example.com",
            GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
          };
          await git(["-C", dir, "add", "parity-git-pair.txt"]);
          await git(["-C", dir, "-c", "user.name=parity", "-c", "user.email=parity@example.com", "commit", "-m", `parity git pair ${suffix}`], { env });
          await git(["-C", dir, "push", "origin", "HEAD"]);
        }
        const pushedLegacy = await remoteRefs(legacyUrl);
        const pushedYoram = await remoteRefs(yoramUrl);
        if (!pushedLegacy || !pushedYoram) return fail("post-push ls-remote returned no ref");
        if (pushedLegacy !== pushedYoram) {
          fail(`post-push refs diverged (B-0224): ${pushedLegacy} vs ${pushedYoram}`);
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
  },
};
// --- throwaway destructive PR/review chain (B-0001, B-0295, B-0296) ---------
//
// This action is deliberately self-contained. It never reuses the seeded
// sample/feature/ui repository: both servers get a uniquely named project,
// branches are pushed with the real git client, and the project is deleted in
// finally even when one side cannot complete the chain.
const THROWAWAY_PR_ACTIONS = {
  "throwaway-pr-branch-thread-lifecycle": {
    // Registry matching is based on the direct routes exercised by the
    // handler; these requests are intentionally not sent.
    translateLegacy: () => ({ method: "GET", path: "/__throwaway-pr-client-side__" }),
    translateYoram: () => ({ method: "GET", path: "/__throwaway-pr-client-side__" }),
    async handler(ctx) {
      const { step, entry, suffix, helpers } = ctx;
      const owner = step.params.owner;
      const name = `parity-pr-${suffix}`;
      const sourceBranch = "parity-source";
      const targetBranch = "parity-target";
      const title = `Differential throwaway PR ${suffix}`;
      const legacyUrl = ctx.options.legacyUrl;
      const yoramUrl = ctx.yoramBaseUrl;
      const projectCreated = { legacy: false, yoram: false };
      let workRoot = null;

      const fail = (message) => entry.errors.push(`throwaway-pr [${suffix}]: ${message}`);
      const remote = (baseUrl) => `${baseUrl.replace("://", "://admin:admin@")}/${owner}/${name}`;
      const resultId = (result) => {
        const locationId = Number((/\/pullRequest\/(\d+)/u.exec(result.location ?? "") ?? [])[1]) || null;
        if (locationId) return locationId;
        const queue = [result.json];
        while (queue.length > 0) {
          const node = queue.shift();
          if (Array.isArray(node)) {
            queue.push(...node);
          } else if (node && typeof node === "object") {
            for (const key of ["pullRequestNumber", "pull_request_number", "number"]) {
              const value = Number(node[key]);
              if (value > 0) return value;
            }
            queue.push(...Object.values(node));
          }
        }
        return null;
      };
      const threadIdFromJson = (json) => {
        const queue = [json];
        while (queue.length > 0) {
          const node = queue.shift();
          if (Array.isArray(node)) {
            queue.push(...node);
          } else if (node && typeof node === "object") {
            if (Array.isArray(node.threads)) {
              for (const thread of node.threads) {
                const id = Number(thread?.id ?? thread?.threadId ?? thread?.thread_id);
                if (id > 0) return id;
              }
            }
            if (Array.isArray(node.comments) && (node.state || node.status)) {
              const id = Number(node.id ?? node.threadId ?? node.thread_id);
              if (id > 0) return id;
            }
            queue.push(...Object.values(node));
          }
        }
        return null;
      };
      const projectIdFromLegacy = (body) => {
        for (const match of body.matchAll(/<option value="(\d+)"[^>]*>([^<]*)/gu)) {
          if (match[2].includes(name)) return match[1];
        }
        return null;
      };
      const pushBranch = async (baseUrl, ref) => {
        const url = remote(baseUrl);
        for (let attempt = 0; attempt < 5; attempt += 1) {
          try {
            await git(["-C", workRoot, "push", url, `${ref}:refs/heads/${ref}`]);
            return true;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 1_000));
          }
        }
        return false;
      };
      const findLegacyPullRequest = async () => {
        const page = await helpers.sendRaw(ctx, "legacy", {
          method: "GET",
          path: `/${owner}/${name}/pullRequests`,
        });
        const ids = [...new Set([...String(page.body ?? "").matchAll(/pullRequest\/(\d+)/gu)].map((match) => Number(match[1])))]
          .sort((a, b) => b - a);
        for (const id of ids) {
          const detail = await helpers.sendRaw(ctx, "legacy", {
            method: "GET",
            path: `/${owner}/${name}/pullRequest/${id}`,
          });
          if (detail.status < 400 && String(detail.body ?? "").includes(title)) return id;
        }
        return null;
      };
      const findYoramPullRequest = async () => {
        const list = await helpers.sendRaw(ctx, "yoram", {
          method: "GET",
          path: `/api/v1/owners/${owner}/projects/${name}/pull-requests`,
        });
        const items = Array.isArray(list.json?.items) ? list.json.items : Array.isArray(list.json) ? list.json : [];
        const match = items.find((item) => (item.title ?? "") === title);
        return Number(match?.pullRequestNumber ?? match?.pull_request_number ?? match?.number ?? match?.id) || null;
      };

      try {
        const legacyCreate = await helpers.sendRaw(ctx, "legacy", {
          method: "POST",
          path: "/projects",
          form: {
            owner,
            name,
            overview: `parity throwaway PR ${suffix}`,
            projectScope: "PUBLIC",
            vcs: "GIT",
            code: "true",
            issue: "true",
            pullRequest: "true",
            review: "true",
          },
        });
        projectCreated.legacy = legacyCreate.status < 400;
        const yoramCreate = await helpers.sendRaw(ctx, "yoram", {
          method: "POST",
          path: `/api/v1/owners/${owner}/projects`,
          json: { projectName: name, overview: `parity throwaway PR ${suffix}`, projectScope: "PUBLIC", vcs: "GIT" },
        });
        projectCreated.yoram = yoramCreate.status < 400;
        if (!projectCreated.legacy || !projectCreated.yoram) {
          fail(`project creation failed: legacy=${legacyCreate.status} yoram=${yoramCreate.status}`);
          return;
        }

        workRoot = mkdtempSync(`${tmpdir()}/parity-pr-`);
        const { writeFileSync } = await import("node:fs");
        await git(["init", "-b", "main", workRoot]);
        await git(["-C", workRoot, "config", "user.name", "parity"]);
        await git(["-C", workRoot, "config", "user.email", "parity@example.com"]);
        writeFileSync(`${workRoot}/README.md`, `throwaway target ${suffix}\n`);
        await git(["-C", workRoot, "add", "README.md"]);
        await git(["-C", workRoot, "commit", "-m", `throwaway target ${suffix}`]);
        await git(["-C", workRoot, "branch", targetBranch]);
        await git(["-C", workRoot, "checkout", "-b", sourceBranch]);
        writeFileSync(`${workRoot}/source.txt`, `throwaway source ${suffix}\n`);
        await git(["-C", workRoot, "add", "source.txt"]);
        await git(["-C", workRoot, "commit", "-m", `throwaway source ${suffix}`]);
        if (!(await pushBranch(legacyUrl, "main")) || !(await pushBranch(yoramUrl, "main"))) throw new Error("git push main failed");
        if (!(await pushBranch(legacyUrl, targetBranch)) || !(await pushBranch(yoramUrl, targetBranch))) throw new Error("git push target branch failed");
        if (!(await pushBranch(legacyUrl, sourceBranch)) || !(await pushBranch(yoramUrl, sourceBranch))) throw new Error("git push source branch failed");

        const legacyForm = await helpers.sendRaw(ctx, "legacy", {
          method: "GET",
          path: `/${owner}/${name}/newPullRequestForm`,
        });
        const legacyProjectId = projectIdFromLegacy(String(legacyForm.body ?? ""));
        const yoramOptions = await helpers.sendRaw(ctx, "yoram", {
          method: "GET",
          path: `/api/v1/owners/${owner}/projects/${name}/pull-requests/form-options`,
        });
        const yoramProject = (yoramOptions.json?.toProjects ?? yoramOptions.json?.to_projects ?? []).find(
          (option) => option.projectName === name || option.project_name === name,
        );
        const yoramProjectId = Number(yoramProject?.id) || null;
        if (!legacyProjectId || !yoramProjectId) throw new Error(`project ids unresolved: legacy=${legacyProjectId ?? "none"} yoram=${yoramProjectId ?? "none"}`);

        const legacyPr = await helpers.sendRaw(ctx, "legacy", {
          method: "POST",
          path: `/${owner}/${name}/pullRequests`,
          form: {
            title,
            body: `throwaway review chain ${suffix}`,
            fromProjectId: legacyProjectId,
            fromBranch: `refs/heads/${sourceBranch}`,
            toProjectId: legacyProjectId,
            toBranch: `refs/heads/${targetBranch}`,
          },
        });
        const yoramPr = await helpers.sendRaw(ctx, "yoram", {
          method: "POST",
          path: `/api/v1/owners/${owner}/projects/${name}/pull-requests`,
          json: {
            title,
            bodyMarkdown: `throwaway review chain ${suffix}`,
            fromProjectId: yoramProjectId,
            fromBranch: sourceBranch,
            toProjectId: yoramProjectId,
            toBranch: targetBranch,
            attachmentIds: [],
          },
        });
        let legacyPrId = resultId(legacyPr) ?? await findLegacyPullRequest();
        let yoramPrId = resultId(yoramPr) ?? await findYoramPullRequest();
        if (!legacyPrId || !yoramPrId) throw new Error(`pull request id unresolved: legacy=${legacyPrId ?? "none"} yoram=${yoramPrId ?? "none"}`);

        const commentText = `throwaway review thread ${suffix}`;
        const legacyComment = await helpers.sendRaw(ctx, "legacy", {
          method: "POST",
          path: `/${owner}/${name}/pullRequest/${legacyPrId}/comments`,
          form: { contents: commentText },
        });
        const yoramComment = await helpers.sendRaw(ctx, "yoram", {
          method: "POST",
          path: `/api/v1/owners/${owner}/projects/${name}/pull-requests/${yoramPrId}/comments`,
          json: { contentsMarkdown: commentText, attachmentIds: [] },
        });
        const legacyDetail = await helpers.sendRaw(ctx, "legacy", {
          method: "GET",
          path: `/${owner}/${name}/pullRequest/${legacyPrId}/changes`,
        });
        const yoramDetail = yoramComment.status < 400
          ? yoramComment
          : await helpers.sendRaw(ctx, "yoram", {
            method: "GET",
            path: `/api/v1/owners/${owner}/projects/${name}/pull-requests/${yoramPrId}`,
          });
        let legacyThreadId = Number((/id="thread-(\d+)"/u.exec(legacyDetail.body ?? "") ?? [])[1])
          || Number((/name="thread\.id" value="(\d+)"/u.exec(legacyDetail.body ?? "") ?? [])[1])
          || null;
        if (!legacyThreadId) {
          const reviewList = await helpers.sendRaw(ctx, "legacy", {
            method: "GET",
            path: `/${owner}/${name}/reviews`,
          });
          const reviewBody = String(reviewList.body ?? "");
          const commentOffset = reviewBody.indexOf(commentText);
          const reviewIds = commentOffset < 0
            ? []
            : [...reviewBody.slice(0, commentOffset).matchAll(/<span class="post-id">(\d+)<\/span>/gu)];
          legacyThreadId = Number(reviewIds[reviewIds.length - 1]?.[1]) || null;
        }
        const yoramThreadId = threadIdFromJson(yoramDetail.json);

        for (const state of ["close", "open"]) {
          const legacyThread = await helpers.sendRaw(ctx, "legacy", { method: "POST", path: `/threads/${legacyThreadId}/${state}` });
          const yoramThread = await helpers.sendRaw(ctx, "yoram", { method: "POST", path: `/threads/${yoramThreadId}/${state}` });
          if (legacyThread.status >= 400 || yoramThread.status >= 400) {
            throw new Error(`thread ${state} failed: legacy=${legacyThread.status} yoram=${yoramThread.status}`);
          }
        }

        const legacyAccept = await helpers.sendRaw(ctx, "legacy", { method: "POST", path: `/${owner}/${name}/pullRequest/${legacyPrId}/accept` });
        const yoramAccept = await helpers.sendRaw(ctx, "yoram", { method: "POST", path: `/api/v1/owners/${owner}/projects/${name}/pull-requests/${yoramPrId}/accept` });
        if (legacyAccept.status >= 400 || yoramAccept.status >= 400) {
          throw new Error(`pull request merge failed: legacy=${legacyAccept.status} yoram=${yoramAccept.status}`);
        }

        const legacyDelete = await helpers.sendRaw(ctx, "legacy", {
          method: "DELETE",
          path: `/${owner}/${name}/pullRequest/${legacyPrId}/deletefrombranch`,
        });
        const yoramDelete = await helpers.sendRaw(ctx, "yoram", {
          method: "DELETE",
          path: `/${owner}/${name}/pullRequest/${yoramPrId}/deletefrombranch`,
        });
        if (legacyDelete.status >= 400 || yoramDelete.status >= 400) {
          throw new Error(`source branch delete failed: legacy=${legacyDelete.status} yoram=${yoramDelete.status}`);
        }
        for (const [label, baseUrl] of [["legacy", legacyUrl], ["yoram", yoramUrl]]) {
          const refs = await git(["ls-remote", remote(baseUrl), `refs/heads/${sourceBranch}`]);
          if (refs.stdout.trim()) throw new Error(`${label} source branch still exists after direct delete`);
        }
      } catch (error) {
        fail(error.message);
      } finally {
        if (workRoot) rmSync(workRoot, { recursive: true, force: true });
        if (projectCreated.legacy) {
          await helpers.sendRaw(ctx, "legacy", {
            method: "DELETE",
            path: `/${owner}/${name}/delete`,
            headers: { "x-requested-with": "XMLHttpRequest" },
          }).catch((error) => fail(`legacy project cleanup failed: ${error.message}`));
        }
        if (projectCreated.yoram) {
          await helpers.sendRaw(ctx, "yoram", {
            method: "DELETE",
            path: `/api/v1/owners/${owner}/projects/${name}`,
          }).catch((error) => fail(`yoram project cleanup failed: ${error.message}`));
        }
      }
    },
  },
};
Object.assign(MUTATION_DEFINITIONS, THROWAWAY_PR_ACTIONS);
Object.assign(MUTATION_DEFINITIONS, GIT_PAIR_ACTIONS);
export const actionDefinitions = Object.assign(
  Object.fromEntries(READ_ACTIONS.map((name) => [name, readGet()])),
  Object.fromEntries(RAW_ACTIONS.map((name) => [name, rawGet()])),
  MUTATION_DEFINITIONS,
);
