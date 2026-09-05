import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeCoverage, aggregateViolations, buildVerdict, main } from './verdict.mjs';
import { CLASSIFICATIONS, BLOCKING_CLASSIFICATIONS } from './report.mjs';

const inventory = {
  version: 1,
  behaviors: [{ id: 'B-0001' }, { id: 'B-0002' }, { id: 'B-0003' }],
};
const coverage = {
  scenarios: [
    { scenarioId: 'S1', behaviorIds: ['B-0001', 'B-0002'] },
  ],
  behaviorVerification: {
    'B-0001': { verified: true, failedSteps: 0, skippedSteps: 0 },
    'B-0002': { verified: true, failedSteps: 0, skippedSteps: 0 },
  },
};
const report = {
  scenarios: [
    // missing classification -> UNVERIFIED (blocking)
    { id: 'S1', violations: [{ classification: 'UNVERIFIED' }] },
    // accepted divergence + legacy bug are NON-blocking
    { id: 'S2', violations: [{ classification: 'IMPLEMENTATION_DIFFERENCE' }, { classification: 'LEGACY_BUG_NOT_REPRODUCED' }] },
  ],
};

test('computeCoverage: ratio and uncovered list', () => {
  const c = computeCoverage(inventory, coverage);
  assert.equal(c.totalBehaviors, 3);
  assert.deepEqual(c.uncovered, ['B-0003']);
  assert.ok(Math.abs(c.ratio - 2 / 3) < 1e-9);
});

test('computeCoverage: full coverage and empty inventory edge case', () => {
  assert.deepEqual(computeCoverage(inventory, {
    behaviorVerification: {
      'B-0001': { verified: true },
      'B-0002': { verified: true },
      'B-0003': { verified: true },
    },
  }).uncovered, []);
  assert.equal(computeCoverage({ behaviors: [] }, coverage).ratio, 1);
});

test('aggregateViolations: flatten and classify (missing -> UNVERIFIED)', () => {
  const s = aggregateViolations({ scenarios: [{ violations: [{}] }] });
  assert.equal(s.total, 1);
  assert.deepEqual(s.byClassification, { UNVERIFIED: 1 });
});

test('aggregateViolations: counts every class independently', () => {
  const s = aggregateViolations(report);
  assert.equal(s.total, 3);
  assert.deepEqual(s.byClassification, { UNVERIFIED: 1, IMPLEMENTATION_DIFFERENCE: 1, LEGACY_BUG_NOT_REPRODUCED: 1 });
});

test('buildVerdict gate: only REAL_OBSERVABLE_MISMATCH/HARNESS_ERROR/INFRA_ERROR/UNVERIFIED block', () => {
  const base = { inventory, coverage, report, skipFastLane: true };
  const v = buildVerdict(base);
  // IMPLEMENTATION_DIFFERENCE + LEGACY_BUG_NOT_REPRODUCED are non-blocking; UNVERIFIED blocks.
  assert.equal(v.checks.sweep.blocked, 1);
  assert.equal(v.ok, false);

  const acceptedOnly = {
    ...base,
    report: { scenarios: [{ violations: [{ classification: 'IMPLEMENTATION_DIFFERENCE', reason: 'r', rationale: 'doc' }] }] },
  };
  const v2 = buildVerdict(acceptedOnly);
  assert.equal(v2.checks.sweep.blocked, 0);

  for (const c of ['REAL_OBSERVABLE_MISMATCH', 'HARNESS_ERROR', 'INFRA_ERROR', 'UNVERIFIED']) {
    const v3 = buildVerdict({ ...base, report: { scenarios: [{ violations: [{ classification: c }] }] } });
    assert.equal(v3.checks.sweep.blocked, 1, `${c} must block`);
  }
});

test('classification enum is the unified model', () => {
  assert.deepEqual(CLASSIFICATIONS, [
    'PASS',
    'REAL_OBSERVABLE_MISMATCH',
    'IMPLEMENTATION_DIFFERENCE',
    'LEGACY_BUG_NOT_REPRODUCED',
    'HARNESS_ERROR',
    'INFRA_ERROR',
    'UNVERIFIED',
  ]);
  assert.deepEqual(
    [...BLOCKING_CLASSIFICATIONS].sort(),
    ['HARNESS_ERROR', 'INFRA_ERROR', 'REAL_OBSERVABLE_MISMATCH', 'UNVERIFIED'],
  );
});

test('buildVerdict: ok requires coverage=100, no blockers, fast lane', () => {
  const full = {
    scenarios: [{ behaviorIds: ['B-0001', 'B-0002', 'B-0003'] }],
    behaviorVerification: {
      'B-0001': { verified: true },
      'B-0002': { verified: true },
      'B-0003': { verified: true },
    },
  };
  const clean = { scenarios: [{ violations: [] }] };

  const good = buildVerdict({
    inventory, coverage: full, report: clean,
    fastLanePass: true, skipFastLane: false,
  });
  assert.equal(good.ok, true);
  assert.deepEqual(good.checks.fastLane, { skipped: false, pass: true });

  assert.equal(buildVerdict({
    inventory, coverage: full, report: clean,
    fastLanePass: false, skipFastLane: false,
  }).ok, false);

  assert.equal(buildVerdict({
    inventory, coverage, report: clean, skipFastLane: true,
  }).ok, false); // coverage < 1

  assert.equal(typeof good.generatedAt, 'string');
});

test('buildVerdict blocks required FAILED and SKIPPED steps', () => {
  const cleanReport = { scenarios: [{ violations: [] }] };
  for (const field of ['failedSteps', 'skippedSteps']) {
    const blockedCoverage = {
      behaviorVerification: {
        'B-0001': { verified: true, [field]: 1 },
        'B-0002': { verified: true },
        'B-0003': { verified: true },
      },
    };
    const verdict = buildVerdict({
      inventory,
      coverage: blockedCoverage,
      report: cleanReport,
      fastLanePass: true,
      skipFastLane: false,
    });
    assert.equal(verdict.ok, false, `${field} must block`);
    assert.equal(verdict.checks.steps[field === 'failedSteps' ? 'failedRequiredSteps' : 'skippedRequiredSteps'], 1);
  }
});

function writeFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
  writeFileSync(join(dir, 'inventory.json'), JSON.stringify(inventory));
  writeFileSync(join(dir, 'coverage.json'), JSON.stringify(coverage));
  writeFileSync(join(dir, 'report.json'), JSON.stringify(report));
  return dir;
}

test('CLI: missing artifact gives clear error and nonzero exit', async () => {
  await assert.rejects(
    () => main(['node', 'verdict.mjs', '--inventory', '/nope/missing.json', '--skip-fast-lane']),
    /cannot read behavior inventory/,
  );
  // usage error: no fast-lane input
  const code = await main(['node', 'verdict.mjs']);
  assert.equal(code, 2);
});

test('CLI: end-to-end writes verdict.json with exit code 1 (blockers present)', async () => {
  const dir = writeFixtures();
  const out = join(dir, 'verdict.json');
  const code = await main([
    'node', 'verdict.mjs',
    '--inventory', join(dir, 'inventory.json'),
    '--coverage', join(dir, 'coverage.json'),
    '--report', join(dir, 'report.json'),
    '--out', out,
    '--skip-fast-lane',
  ]);
  assert.equal(code, 1);
  const v = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(v.ok, false);
  assert.equal(v.checks.sweep.total, 3);
  assert.equal(v.checks.sweep.blocked, 1);
  assert.deepEqual(v.checks.coverage.uncovered, ['B-0003']);

  // accepted divergences alone never block: fully green run exits 0
  const repAccepted = join(dir, 'report-accepted.json');
  writeFileSync(repAccepted, JSON.stringify({
    scenarios: [{ violations: [{ classification: 'IMPLEMENTATION_DIFFERENCE', reason: 'r', rationale: 'docs/x.md' }] }],
  }));
  const covFull = join(dir, 'coverage-full.json');
  writeFileSync(covFull, JSON.stringify({
    behaviorVerification: {
      'B-0001': { verified: true },
      'B-0002': { verified: true },
      'B-0003': { verified: true },
    },
  }));
  const code3 = await main([
    'node', 'verdict.mjs', '--fast-lane-pass', 'true',
    '--inventory', join(dir, 'inventory.json'),
    '--coverage', covFull, '--report', repAccepted,
    '--out', join(dir, 'v3.json'),
  ]);
  assert.equal(code3, 0);

  // ponytail: direct invocation against real repo artifacts — expected to fail while blockers exist
  try {
    execFileSync(process.execPath, [new URL('./verdict.mjs', import.meta.url).pathname, '--skip-fast-lane']);
    assert.fail('expected nonzero exit');
  } catch (err) {
    assert.equal(err.status, 1);
  }
});
