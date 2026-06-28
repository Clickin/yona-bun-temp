import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildVisualComparison,
  summarizeVisualComparison,
} from "./visual-parity-comparison.mjs";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

test("buildVisualComparison flags legacy-normal to local-error pages", () => {
  const comparison = buildVisualComparison({
    legacyResults: [
      {
        path: "/projects",
        ok: true,
        status: 200,
        metrics: { bodyTextLength: 100, isErrorPage: false },
      },
    ],
    localResults: [
      {
        path: "/projects",
        ok: true,
        status: 404,
        errors: [],
        metrics: { bodyTextLength: 50, isErrorPage: true, stylesheetRules: 399 },
      },
    ],
  });

  assert.equal(comparison[0].statusDelta, "200->404");
  assert.deepEqual(comparison[0].diffErrors, [
    "legacy renders a normal page but local renders an error page",
  ]);
});

test("summarizeVisualComparison records status deltas without treating legacy-missing as a delta", () => {
  const summary = summarizeVisualComparison([
    {
      path: "/a",
      legacyOk: true,
      localOk: true,
      localErrors: [],
      diffErrors: [],
      statusDelta: "200->200",
      textLengthDelta: 0,
      localStylesheetRules: 1,
    },
    {
      path: "/b",
      legacyOk: true,
      localOk: true,
      localErrors: [],
      diffErrors: [],
      statusDelta: "404->200",
      textLengthDelta: 10,
      localStylesheetRules: 1,
    },
    {
      path: "/c",
      legacyOk: null,
      localOk: true,
      localErrors: [],
      diffErrors: [],
      statusDelta: "legacy-missing",
      textLengthDelta: null,
      localStylesheetRules: 1,
    },
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.compared, 2);
  assert.equal(summary.legacyMissing, 1);
  assert.equal(summary.statusDeltas.length, 1);
  assert.deepEqual(summary.statusDeltas[0], {
    path: "/b",
    statusDelta: "404->200",
    legacyOk: true,
    localOk: true,
  });
});

test("visual sweep scans chrome text and attributes for visible raw legacy keys", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /cloneChromeWithoutUserMarkdown/u);
  assert.match(source, /\.markdown-wrap/u);
  assert.match(source, /textarea/u);
  assert.match(
    source,
    /const names = \["aria-label", "data-content", "data-original-title", "placeholder", "title"\]/u,
  );
  assert.match(
    source,
    /const i18nScanText = `\$\{metrics\.title\}\\n\$\{metrics\.chromeText\}\\n\$\{metrics\.chromeAttributes\}`/u,
  );
  assert.match(source, /raw i18n key visible/u);
});

test("visual sweep records P0 global shell computed-style metrics", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /const requestedSweepPaths = parseRequestedSweepPaths/u);
  assert.match(source, /process\.env\.YORAM_SWEEP_PATHS/u);
  assert.match(source, /const viewportProfile = parseViewportProfile/u);
  assert.match(source, /process\.env\.YORAM_SWEEP_VIEWPORT/u);
  assert.match(source, /latest-\$\{viewportProfile\.name\}\.json/u);
  assert.match(source, /name: "mobile", width: 390, height: 844/u);
  assert.match(source, /viewport: \{ width: viewportProfile\.width, height: viewportProfile\.height \}/u);
  assert.match(source, /viewportProfile: viewportProfile\.name/u);
  assert.match(source, /const screenshotLabel =/u);
  assert.match(source, /function localSettledSelectorForPath/u);
  assert.match(source, /label === "local" && loggedIn && !useRequestedPaths/u);
  assert.match(source, /waitUntil: "domcontentloaded"/u);
  assert.match(
    source,
    /page\.goto\(urlFor\(baseUrl, "\/users\/loginform"\), \{ waitUntil: "domcontentloaded" \}\)/u,
  );
  assert.match(source, /loginField\.waitFor\(\{ timeout: 10_000 \}\)/u);
  assert.match(
    source,
    /page\.goto\(urlFor\(baseUrl, "\/projects"\), \{ waitUntil: "domcontentloaded" \}\)/u,
  );
  assert.match(source, /page\.waitForSelector\("a\[href\]", \{ timeout: 10_000 \}\)/u);
  assert.match(source, /await page\.waitForSelector\(localSettledSelector/u);
  assert.match(source, /gnbInner: selectorState\("\.gnb-inner"\)/u);
  assert.match(source, /gnbUsermenu: selectorState\("\.gnb-usermenu"\)/u);
  assert.match(source, /sidenav: selectorState\("#mySidenav"\)/u);
  assert.match(source, /footer: selectorState\("footer\.page-footer-outer"\)/u);
  assert.match(source, /"\/admin\/sample\/settingform"/u);
  assert.match(source, /"\/admin\/sample\/issue\/1"/u);
  assert.match(source, /#issue-body-\$\{issueDetailMatch\[1\]\} \.content\.markdown-wrap`/u);
  assert.match(source, /const selectorTextLength = \(selector\)/u);
  assert.match(source, /issueBodyTextLength: selectorTextLength/u);
  assert.match(source, /commentBodyTextLength: selectorTextLength/u);
  assert.match(source, /const isFramedShell = path === "\/sidebar"/u);
  assert.match(source, /missing global navigation inner container/u);
  assert.match(source, /missing global user menu container/u);
});

test("visual sweep records P2 and P3 template verifier metrics", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  for (const selector of [
    "projectHeaderAvatar",
    "projectBreadcrumbWrap",
    "projectUtilWrap",
    "projectMenuNav",
    "projectPageWrap",
    "bubbleWrapGray",
    "boxWrap",
    "cuLabel",
    "cuDesc",
    "issueListWrap",
    "leftMenu",
    "postListWrap",
    "postItemTitle",
    "contentFormWrap",
    "markdownEditor",
    "markdownPreview",
    "uploadWrap",
    "issueUpdateForm",
    "comments",
    "commentBody",
    "commentDeleteModal",
  ]) {
    assert.match(source, new RegExp(`${selector}: selectorState`, "u"));
    assert.match(source, new RegExp(`${selector}: metrics\\.${selector}`, "u"));
  }
});
