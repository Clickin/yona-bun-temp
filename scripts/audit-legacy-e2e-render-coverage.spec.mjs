import test from "node:test";
import assert from "node:assert/strict";
import {
  extractPageGotoNavigations,
  extractRenderedE2eEvidence,
  normalizePageGotoArgument,
  routeKey,
} from "./audit-legacy-e2e-render-coverage.mjs";

test("extractPageGotoNavigations reads static URLs from an executed Playwright test only", () => {
  globalThis.__e2eAuditMustNotRun = false;
  const source = [
    'test("renders", async ({ page }) => {',
    "  await page.goto(`${basePath}/users/loginform`);",
    "  await page.goto(`${basePath}/${ownerName}/${projectName}/issue/1`);",
    '  await page.goto("/yona/projects?filter=recent");',
    "  await page.goto(`${(() => { globalThis.__e2eAuditMustNotRun = true; })()}/unsafe`);",
    '  await expect(page.locator(".login-form-wrap")).toBeVisible();',
    "});",
  ].join("\n");

  assert.deepEqual(extractPageGotoNavigations(source), [
    "/users/loginform",
    "/$ownerName/$projectName/issue/1",
    "/yona/projects?filter=recent",
  ]);
  assert.equal(globalThis.__e2eAuditMustNotRun, false);
  delete globalThis.__e2eAuditMustNotRun;
});

test("render evidence rejects comments, skipped tests, skipped suites, and uncalled helpers", () => {
  const source = [
    '// test("comment", async ({ page }) => page.goto("/commented"));',
    'test.skip("skipped", async ({ page }) => {',
    '  await page.goto("/skipped");',
    '  await expect(page.locator(".skipped-signal")).toBeVisible();',
    "});",
    'test.describe.skip("suite", () => {',
    '  test("nested", async ({ page }) => {',
    '    await page.goto("/skipped-suite");',
    '    await expect(page.locator(".suite-signal")).toBeVisible();',
    "  });",
    "});",
    'test("runtime skipped", async ({ page }) => {',
    '  test.skip(true, "not executed");',
    '  await page.goto("/runtime-skipped");',
    '  await expect(page.locator(".runtime-skipped-signal")).toBeVisible();',
    "});",
    'test("active", async ({ page }) => {',
    '  const neverCalled = async () => page.goto("/uncalled");',
    '  await page.goto("/active");',
    '  await expect(page.locator(".active-signal")).toBeVisible();',
    "});",
  ].join("\n");

  assert.deepEqual(extractPageGotoNavigations(source), ["/active"]);
  assert.deepEqual(extractRenderedE2eEvidence(source), [
    { signals: [".active-signal"], url: "/active" },
  ]);
});

test("render evidence couples goto with DOM assertions and ignores unrelated fixture strings", () => {
  const source = [
    'const unrelatedFixture = `<div class="unrelated-signal"></div>`;',
    'const renderedFixture = `<div class="login-form-wrap"></div>`;',
    'test("active", async ({ page }) => {',
    '  await page.goto("/users/loginform");',
    '  const actual = await page.locator("main").innerHTML();',
    "  expect(actual).toContain(renderedFixture);",
    "});",
  ].join("\n");

  const [evidence] = extractRenderedE2eEvidence(source);
  assert.equal(evidence.url, "/users/loginform");
  assert.ok(evidence.signals.some((signal) => signal.includes("login-form-wrap")));
  assert.ok(!evidence.signals.some((signal) => signal.includes("unrelated-signal")));
});

test("non-DOM source and URL assertions do not count as rendered evidence", () => {
  const source = [
    'const routeSource = "login-form-wrap";',
    'test("source contract", async ({ page }) => {',
    '  await page.goto("/users/loginform");',
    '  expect(routeSource).toContain("login-form-wrap");',
    '  expect(page.url()).toContain("loginform");',
    "});",
  ].join("\n");

  assert.deepEqual(extractRenderedE2eEvidence(source), []);
});

test("normalizePageGotoArgument rejects dynamic roots but preserves simple path placeholders", () => {
  assert.equal(
    normalizePageGotoArgument("`${basePath}/search?keyword=yona`"),
    "/search?keyword=yona",
  );
  assert.equal(
    normalizePageGotoArgument("`${basePath}/admin/sample/changes/${commitId}`"),
    "/admin/sample/changes/$commitId",
  );
  assert.equal(normalizePageGotoArgument("`${origin}/projects`"), null);
  assert.equal(normalizePageGotoArgument("`/${getPath()}`"), null);
});

test("routeKey maps normalized base-path and project navigations to coverage routes", () => {
  assert.equal(routeKey("/yona/users/loginform"), "/users/loginform");
  assert.equal(routeKey("/search?keyword=yona"), "/search");
  assert.equal(
    routeKey("/$ownerName/$projectName/issue/1"),
    "/$ownerName/$projectName/issue/$issueNumber",
  );
});
