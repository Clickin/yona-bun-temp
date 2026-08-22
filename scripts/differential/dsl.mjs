// Scenario DSL for the differential parity sweep.
//
// A scenario is an abstract action list [{actor, action, params}] plus a
// matcher that ties it back to rows of docs/provenance/behavior-inventory.json.
// The inventory itself stays immutable; scenarioId back-fill is emitted as a
// separate coverage file by the runner.

import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";
// Smoke scenarios live in per-domain modules under scenarios/; this re-export
// keeps existing imports backward compatible.
export { scenarios as smokeScenarios } from "./scenarios/index.mjs";

// Validate shape; returns list of problems ([] when valid).
// knownActions defaults to the merged registry keys.
export function validateScenarios(scenarios, knownActions = Object.keys(ACTION_DEFINITIONS)) {
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
      if (!step.actor || !knownActions.includes(step.action)) {
        problems.push(`${scenario.id}: invalid action ${JSON.stringify(step.action)} (allowed: ${knownActions.join(", ")})`);
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
