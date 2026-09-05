// Release verdict: inventory coverage + latest differential sweep + externally
// supplied fast-lane state -> .agent/differential/verdict.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CLASSIFICATIONS } from './report.mjs';

const DEFAULTS = {
  inventory: 'docs/provenance/behavior-inventory.json',
  coverage: '.agent/differential/behavior-coverage.json',
  report: '.agent/differential/report.json',
  out: '.agent/differential/verdict.json',
};

export function computeCoverage(inventory, coverage) {
  const all = new Set(inventory.behaviors.map((b) => b.id));
  const covered = new Set();
  // Execution-aware: a behavior is covered only when its runtime verification
  // record says verified (every required step executed or dispositioned).
  // Coverage files without behaviorVerification (pre-corrective-plan
  // artifacts) cover nothing: registered ids alone are not verification.
  for (const [behaviorId, record] of Object.entries(coverage.behaviorVerification ?? {})) {
    if (record?.verified === true) covered.add(behaviorId);
  }
  const uncovered = [...all].filter((id) => !covered.has(id)).sort();
  return {
    ratio: all.size === 0 ? 1 : (all.size - uncovered.length) / all.size,
    uncovered,
    totalBehaviors: all.size,
  };
}

// Strict step gate: FAILED/SKIPPED required steps block the verdict unless the
// producer already accounted them under an accepted non-product disposition
// (behaviorVerification counts those separately, never as failed/skipped).
export function aggregateRequiredSteps(coverage) {
  return Object.values(coverage.behaviorVerification ?? {}).reduce(
    (totals, record) => ({
      failedRequiredSteps: totals.failedRequiredSteps + (record?.failedSteps ?? 0),
      skippedRequiredSteps: totals.skippedRequiredSteps + (record?.skippedSteps ?? 0),
      acceptedStepDispositions: totals.acceptedStepDispositions + (record?.dispositionedSteps ?? 0),
    }),
    { failedRequiredSteps: 0, skippedRequiredSteps: 0, acceptedStepDispositions: 0 },
  );
}


const BLOCKING = new Set(['REAL_OBSERVABLE_MISMATCH', 'HARNESS_ERROR', 'INFRA_ERROR', 'UNVERIFIED']);

export function aggregateViolations(report) {
  const all = (report.scenarios ?? []).flatMap((s) => s.violations ?? []);
  const byClassification = {};
  for (const v of all) {
    const c = CLASSIFICATIONS.includes(v.classification) ? v.classification : 'UNVERIFIED';
    byClassification[c] = (byClassification[c] ?? 0) + 1;
  }
  return { total: all.length, byClassification, violations: all };
}

export function buildVerdict({
  inventory,
  coverage,
  report,
  fastLanePass,
  skipFastLane,
}) {
  const cov = computeCoverage(inventory, coverage);
  const sweep = aggregateViolations(report);
  const steps = aggregateRequiredSteps(coverage);

  const blocked = Object.entries(sweep.byClassification)
    .filter(([c]) => BLOCKING.has(c))
    .reduce((n, [, k]) => n + k, 0);

  const fastLane = skipFastLane ? { skipped: true, pass: null } : { skipped: false, pass: fastLanePass };
  const ok =
    cov.ratio === 1 &&
    blocked === 0 &&
    steps.failedRequiredSteps === 0 &&
    steps.skippedRequiredSteps === 0 &&
    (fastLane.skipped || fastLane.pass === true);

  return {
    ok,
    checks: {
      coverage: { ratio: cov.ratio, totalBehaviors: cov.totalBehaviors, uncovered: cov.uncovered },
      sweep: { total: sweep.total, byClassification: sweep.byClassification, blocked },
      steps,
      fastLane,
    },
    generatedAt: new Date().toISOString(),
  };
}

function loadJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`cannot read ${label}: ${path}\n${err.message}`);
  }
}

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skip-fast-lane') args.skipFastLane = true;
    else if (a === '--fast-lane-pass') args.fastLanePass = argv[++i] === 'true';
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      if (!(key in DEFAULTS)) throw new Error(`unknown option: ${a}`);
      args[key] = argv[++i];
    } else throw new Error(`unexpected argument: ${a}`);
  }
  return args;
}

export async function main(argv = process.argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(`verdict: ${err.message}`);
    console.error('usage: node scripts/differential/verdict.mjs (--fast-lane-pass true|false | --skip-fast-lane) [--inventory P] [--coverage P] [--report P] [--out P]');
    return 2;
  }
  if (!opts.skipFastLane && typeof opts.fastLanePass !== 'boolean') {
    console.error('verdict: fast lane state required — pass --fast-lane-pass true|false or --skip-fast-lane');
    return 2;
  }

  const inventory = loadJson(resolve(opts.inventory), 'behavior inventory');
  const coverage = loadJson(resolve(opts.coverage), 'behavior coverage');
  const report = loadJson(resolve(opts.report), 'differential report');

  const verdict = buildVerdict({
    inventory,
    coverage,
    report,
    fastLanePass: opts.fastLanePass,
    skipFastLane: opts.skipFastLane,
  });
  mkdirSync(dirname(resolve(opts.out)), { recursive: true });
  writeFileSync(resolve(opts.out), JSON.stringify(verdict, null, 2) + '\n');

  const c = verdict.checks;
  const pct = (c.coverage.ratio * 100).toFixed(1);
  console.log(`coverage : ${pct}% (${c.coverage.totalBehaviors - c.coverage.uncovered.length}/${c.coverage.totalBehaviors})`);
  if (c.coverage.uncovered.length > 0) {
    console.log(`uncovered: ${c.coverage.uncovered.join(', ')}`);
  }
  console.log(`sweep    : ${c.sweep.total} violation(s) -> ${c.sweep.blocked} blocking`);
  console.log(
    `steps    : failedRequired=${c.steps.failedRequiredSteps} skippedRequired=${c.steps.skippedRequiredSteps} dispositioned=${c.steps.acceptedStepDispositions}`,
  );
  console.log(
    `classes  : ` + CLASSIFICATIONS.map((k) => `${k}=${c.sweep.byClassification[k] ?? 0}`).join(' '),
  );
  console.log(`fastLane : ${c.fastLane.skipped ? 'skipped' : c.fastLane.pass ? 'pass' : 'FAIL'}`);
  console.log(`verdict  : ${verdict.ok ? 'OK' : 'NOT OK'} (${opts.out})`);
  return verdict.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
