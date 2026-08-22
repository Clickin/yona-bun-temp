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
    behaviorMatcher: { action: /^IssueApp\.newIssue$/, route: /issues\/latest/ },
  },
  {
    id: "S4-issue-comment",
    title: "comment on created issue",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-issue", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "create-issue-comment", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^IssueApp\.newComment$/, route: /comments/ },
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
 };
