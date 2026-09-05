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

// A step disposition pre-classifies an agent-unresolvable, non-product step
// failure/skip (closure contract: only these two classes are non-blocking).
// Anything else must stay an unqualified FAILED/SKIPPED so the strict gate
// blocks it.
export const STEP_DISPOSITION_CLASSIFICATIONS = new Set([
  "IMPLEMENTATION_DIFFERENCE",
  "LEGACY_BUG_NOT_REPRODUCED",
]);

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
      const disposition = step.disposition;
      if (disposition !== undefined) {
        if (
          !disposition ||
          typeof disposition !== "object" ||
          !STEP_DISPOSITION_CLASSIFICATIONS.has(disposition.classification) ||
          typeof disposition.evidence !== "string" ||
          disposition.evidence.trim().length === 0
        ) {
          problems.push(
            `${scenario.id}: step ${JSON.stringify(step.action)} disposition requires a non-blocking classification (${[...STEP_DISPOSITION_CLASSIFICATIONS].join(" | ")}) and an evidence string`,
          );
        }
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

// Runtime verification accounting per inventory behavior: a behavior counts as
// covered only when every required step of its scenarios actually executed, or
// carries an explicit non-product disposition. Derived from the sweep's
// runtime step outcomes (entry.stepResults), never from registered ids alone.
export function buildBehaviorVerification(scenarioEntries) {
  const verification = {};
  const touch = (behaviorId) => {
    verification[behaviorId] ??= {
      requiredScenarios: 0,
      requiredSteps: 0,
      executedSteps: 0,
      failedSteps: 0,
      skippedSteps: 0,
      dispositionedSteps: 0,
      verified: false,
    };
    return verification[behaviorId];
  };
  for (const entry of scenarioEntries) {
    const behaviorIds = entry.behaviorIds ?? [];
    if (behaviorIds.length === 0) continue;
    const steps = entry.stepResults ?? [];
    for (const behaviorId of behaviorIds) {
      const record = touch(behaviorId);
      record.requiredScenarios += 1;
      record.requiredSteps += steps.length;
      for (const step of steps) {
        if (step.status === "EXECUTED") {
          record.executedSteps += 1;
        } else if (step.disposition && STEP_DISPOSITION_CLASSIFICATIONS.has(step.disposition.classification)) {
          record.dispositionedSteps += 1;
        } else if (step.status === "FAILED") {
          record.failedSteps += 1;
        } else if (step.status === "SKIPPED") {
          record.skippedSteps += 1;
        }
      }
      record.verified =
        record.requiredSteps > 0 && record.failedSteps === 0 && record.skippedSteps === 0;
    }
  }
  return verification;
}
