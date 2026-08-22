import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeCoverage, aggregateViolations, buildVerdict, main } from './verdict.mjs';

const inventory = {
  version: 1,
  behaviors: [{ id: 'B-0001' }, { id: 'B-0002' }, { id: 'B-0003' }],
};
const coverage = {
  scenarios: [
    { scenarioId: 'S1', behaviorIds: ['B-0001', 'B-0002'] },
  ],
};
const report = {
  scenarios: [
    { id: 'S1', violations: [{ classification: 'needs-review' }] },
    { id: 'S2', violations: [{ classification: 'known-gap' }, {}] },
  ],
};

test('computeCoverage: ratio and uncovered list', () => {
  const c = computeCoverage(inventory, coverage);
  assert.equal(c.totalBehaviors, 3);
  assert.deepEqual(c.uncovered, ['B-0003']);
  assert.ok(Math.abs(c.ratio - 2 / 3) < 1e-9);
});

test('computeCoverage: full coverage and empty inventory edge case', () => {
  assert.deepEqual(computeCoverage(inventory, { scenarios: [{ behaviorIds: ['B-0001', 'B-0002', 'B-0003'] }] }).uncovered, []);
  assert.equal(computeCoverage({ behaviors: [] }, coverage).ratio, 1);
});

test('aggregateViolations: flatten and classify (missing -> needs-review)', () => {
  const s = aggregateViolations(report);
  assert.equal(s.total, 3);
  assert.deepEqual(s.byClassification, { 'needs-review': 2, 'known-gap': 1 });
});

test('buildVerdict: strict blocks all violations, non-strict only known-gap/infra', () => {
  const base = { inventory, coverage, report, skipFastLane: true };
  assert.equal(buildVerdict(base).checks.sweep.blocked, 3);
  assert.equal(buildVerdict({ ...base, strict: false }).checks.sweep.blocked, 1);
  // infra counts as blocker in non-strict too
  const withInfra = {
    ...base,
    report: { scenarios: [{ violations: [{ classification: 'infra' }] }] },
    strict: false,
  };
  assert.equal(buildVerdict(withInfra).checks.sweep.blocked, 1);
});

test('buildVerdict: ok requires coverage=100, no blockers, fast lane', () => {
  const full = { scenarios: [{ behaviorIds: ['B-0001', 'B-0002', 'B-0003'] }] };
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

test('CLI: end-to-end writes verdict.json with exit code 1 (violations present)', async () => {
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
  assert.deepEqual(v.checks.coverage.uncovered, ['B-0003']);

  // non-strict + fast lane pass still blocked by known-gap
  const out2 = join(dir, 'verdict2.json');
  const code2 = await main([
    'node', 'verdict.mjs', '--non-strict', '--fast-lane-pass', 'true',
    '--inventory', join(dir, 'inventory.json'),
    '--coverage', join(dir, 'coverage.json'),
    '--report', join(dir, 'report.json'),
    '--out', out2,
  ]);
  assert.equal(code2, 1);
  assert.equal(JSON.parse(readFileSync(out2, 'utf8')).checks.sweep.blocked, 1);

  // fully green run exits 0
  const covFull = join(dir, 'coverage-full.json');
  writeFileSync(covFull, JSON.stringify({ scenarios: [{ behaviorIds: ['B-0001', 'B-0002', 'B-0003'] }] }));
  const repClean = join(dir, 'report-clean.json');
  writeFileSync(repClean, JSON.stringify({ scenarios: [{ violations: [] }] }));
  const code3 = await main([
    'node', 'verdict.mjs', '--fast-lane-pass', 'true',
    '--inventory', join(dir, 'inventory.json'),
    '--coverage', covFull, '--report', repClean,
    '--out', join(dir, 'v3.json'),
  ]);
  assert.equal(code3, 0);

  // ponytail: direct invocation against real repo artifacts — expected to fail while violations exist
  try {
    execFileSync(process.execPath, [new URL('./verdict.mjs', import.meta.url).pathname, '--skip-fast-lane']);
    assert.fail('expected nonzero exit');
  } catch (err) {
    assert.equal(err.status, 1);
  }
});
