// Scenario DSL for the differential parity sweep.
//
// A scenario is an abstract action list [{actor, action, params}] plus a
// matcher that ties it back to rows of docs/provenance/behavior-inventory.json.
// The inventory itself stays immutable; scenarioId back-fill is emitted as a
// separate coverage file by the runner.

export const ACTIONS = ["login", "view-project", "create-issue", "create-issue-comment", "list-labels", "hover-popover"];

export const smokeScenarios = [
  {
    id: "S1-login",
    title: "admin login",
    actions: [{ actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } }],
    behaviorMatcher: { action: /^UserApp\.login$/ },
  },
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
    id: "S5-list-labels",
    title: "list project labels",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "list-labels", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: { action: /^ProjectApp\.labels$/, route: /labels/ },
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
];

// Validate shape; returns list of problems ([] when valid).
export function validateScenarios(scenarios) {
  const problems = [];
  const seenIds = new Set();
  for (const scenario of scenarios) {
    if (!scenario.id || seenIds.has(scenario.id)) {
      problems.push(`scenario id missing or duplicated: ${String(scenario.id)}`);
    }
    seenIds.add(scenario.id);
    if (!Array.isArray(scenario.actions) || scenario.actions.length === 0) {
      problems.push(`${scenario.id}: actions must be a non-empty array`);
      continue;
    }
    for (const step of scenario.actions) {
      if (!step.actor || !ACTIONS.includes(step.action)) {
        problems.push(`${scenario.id}: invalid action ${JSON.stringify(step.action)} (allowed: ${ACTIONS.join(", ")})`);
      }
    }
  }
  return problems;
}

// Match one scenario against inventory behaviors; returns covered B-ids.
export function matchBehaviors(scenario, inventoryBehaviors) {
  return inventoryBehaviors
    .filter((behavior) => {
      if (scenario.behaviorMatcher.action && !scenario.behaviorMatcher.action.test(behavior.action ?? "")) {
        return false;
      }
      if (scenario.behaviorMatcher.route && !scenario.behaviorMatcher.route.test(behavior.route ?? "")) {
        return false;
      }
      if (!scenario.behaviorMatcher.action && !scenario.behaviorMatcher.route) {
        return false;
      }
      return true;
    })
    .map((behavior) => behavior.id);
}

// Coverage report consumed to back-fill scenarioId onto inventory entries
// downstream (the original JSON is never rewritten here).
export function buildCoverage(scenarios, inventoryBehaviors, runId) {
  return {
    runId,
    version: 1,
    scenarios: scenarios.map((scenario) => ({
      scenarioId: scenario.id,
      title: scenario.title,
      behaviorIds: matchBehaviors(scenario, inventoryBehaviors),
    })),
  };
}
