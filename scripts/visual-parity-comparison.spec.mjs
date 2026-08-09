import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildVisualComparison, summarizeVisualComparison } from "./visual-parity-comparison.mjs";

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

test("buildVisualComparison rejects the authenticated root structural loss", () => {
  const comparison = buildVisualComparison({
    legacyResults: [
      {
        path: "/",
        ok: true,
        status: 200,
        metrics: {
          bodyTextLength: 1072,
          isErrorPage: false,
          pageWrap: { display: "block", height: 834, width: 1366 },
        },
      },
    ],
    localResults: [
      {
        path: "/",
        ok: true,
        status: 200,
        errors: [],
        metrics: {
          bodyTextLength: 225,
          isErrorPage: false,
          pageWrap: null,
          stylesheetRules: 6322,
        },
      },
    ],
  });

  assert.deepEqual(comparison[0].diffErrors, [
    "major visible text loss: 1072->225 (79% loss)",
    "visible selector missing or hidden locally: pageWrap",
  ]);
});

test("buildVisualComparison flags severe visible geometry drift and new overflow", () => {
  const legacyPin = {
    x: 0,
    y: 40,
    right: 1000,
    bottom: 640,
    width: 1000,
    height: 600,
    visible: true,
    hasHorizontalOverflow: false,
  };
  const localPin = {
    x: 180,
    y: 40,
    right: 1380,
    bottom: 640,
    width: 1200,
    height: 600,
    visible: true,
    hasHorizontalOverflow: true,
  };
  const comparison = buildVisualComparison({
    legacyResults: [
      {
        path: "/projects",
        ok: true,
        status: 200,
        metrics: {
          bodyTextLength: 500,
          isErrorPage: false,
          gnbPin: legacyPin,
          scrollWidth: 1000,
          viewportWidth: 1000,
        },
      },
    ],
    localResults: [
      {
        path: "/projects",
        ok: true,
        status: 200,
        errors: [],
        metrics: {
          bodyTextLength: 500,
          isErrorPage: false,
          gnbPin: localPin,
          scrollWidth: 1380,
          viewportWidth: 1000,
        },
      },
    ],
  });

  assert.deepEqual(comparison[0].diffErrors, [
    "new document horizontal overflow: 1380/1000",
    "visible selector has new horizontal overflow: gnbPin",
    "visible selector geometry drift: gnbPin (x 0->180 (>=24px), right 1000->1380 (>=24px), width 1000->1200 (>=24px))",
  ]);
});

test("content-driven selectors ignore vertical content growth but reject horizontal drift", () => {
  const legacyPageWrap = {
    x: 20,
    y: 80,
    right: 1020,
    bottom: 680,
    width: 1000,
    height: 600,
    visible: true,
  };
  const verticalGrowth = {
    ...legacyPageWrap,
    y: 180,
    bottom: 1480,
    height: 1300,
  };
  const horizontalDrift = {
    ...verticalGrowth,
    x: 52,
    right: 956,
    width: 904,
  };
  const baseResult = {
    path: "/projects",
    ok: true,
    status: 200,
    errors: [],
    metrics: { bodyTextLength: 500, isErrorPage: false },
  };

  for (const selectorName of ["pageWrap", "issueListWrap", "comments", "footer"]) {
    const verticalComparison = buildVisualComparison({
      legacyResults: [
        {
          ...baseResult,
          metrics: { ...baseResult.metrics, [selectorName]: legacyPageWrap },
        },
      ],
      localResults: [
        {
          ...baseResult,
          metrics: { ...baseResult.metrics, [selectorName]: verticalGrowth },
        },
      ],
    });
    const horizontalComparison = buildVisualComparison({
      legacyResults: [
        {
          ...baseResult,
          metrics: { ...baseResult.metrics, [selectorName]: legacyPageWrap },
        },
      ],
      localResults: [
        {
          ...baseResult,
          metrics: { ...baseResult.metrics, [selectorName]: horizontalDrift },
        },
      ],
    });

    assert.deepEqual(verticalComparison[0].diffErrors, [], selectorName);
    assert.deepEqual(
      horizontalComparison[0].diffErrors,
      [
        `visible selector geometry drift: ${selectorName} (x 20->52 (>=24px), right 1020->956 (>=24px), width 1000->904 (>=24px))`,
      ],
      selectorName,
    );
  }
});

test("approved missing navbar contact does not report its natural search shift", () => {
  const comparison = buildVisualComparison({
    legacyResults: [
      {
        path: "/admin/sample",
        ok: true,
        status: 200,
        metrics: {
          bodyTextLength: 500,
          isErrorPage: false,
          gnbFeedback: { visible: true, width: 83, height: 40 },
          gnbSearchForm: { visible: true, x: 267, right: 498, width: 231, y: 48, bottom: 78 },
          gnbUsermenu: {
            visible: true,
            x: 1133,
            right: 1352,
            y: 83,
            bottom: 123,
            width: 220,
            height: 40,
          },
        },
      },
    ],
    localResults: [
      {
        path: "/admin/sample",
        ok: true,
        status: 200,
        errors: [],
        metrics: {
          bodyTextLength: 500,
          isErrorPage: false,
          gnbFeedback: null,
          gnbSearchForm: { visible: true, x: 134, right: 365, width: 231, y: 48, bottom: 78 },
          gnbUsermenu: {
            visible: true,
            x: 1133,
            right: 1352,
            y: 43,
            bottom: 83,
            width: 220,
            height: 40,
          },
        },
      },
    ],
  });

  assert.deepEqual(comparison[0].diffErrors, []);
});

test("fixed selectors reject a 32px move and a 96px shrink", () => {
  const legacyHeading = {
    x: 200,
    y: 100,
    right: 1000,
    bottom: 200,
    width: 800,
    height: 100,
    visible: true,
  };
  const localHeading = {
    ...legacyHeading,
    x: 232,
    right: 936,
    width: 704,
  };
  const comparison = buildVisualComparison({
    legacyResults: [
      {
        path: "/",
        ok: true,
        status: 200,
        metrics: { bodyTextLength: 500, isErrorPage: false, siteHeading: legacyHeading },
      },
    ],
    localResults: [
      {
        path: "/",
        ok: true,
        status: 200,
        errors: [],
        metrics: { bodyTextLength: 500, isErrorPage: false, siteHeading: localHeading },
      },
    ],
  });

  assert.deepEqual(comparison[0].diffErrors, [
    "visible selector geometry drift: siteHeading (x 200->232 (>=24px), right 1000->936 (>=24px), width 800->704 (>=24px))",
  ]);
});

test("geometry tolerance fails at its boundary", () => {
  const legacyPin = {
    x: 10,
    y: 10,
    right: 30,
    bottom: 30,
    width: 20,
    height: 20,
    visible: true,
  };
  const comparison = buildVisualComparison({
    legacyResults: [
      {
        path: "/",
        ok: true,
        status: 200,
        metrics: { bodyTextLength: 500, isErrorPage: false, gnbPin: legacyPin },
      },
    ],
    localResults: [
      {
        path: "/",
        ok: true,
        status: 200,
        errors: [],
        metrics: {
          bodyTextLength: 500,
          isErrorPage: false,
          gnbPin: { ...legacyPin, x: 16, right: 36 },
        },
      },
    ],
  });

  assert.deepEqual(comparison[0].diffErrors, [
    "visible selector geometry drift: gnbPin (x 10->16 (>=6px), right 30->36 (>=6px))",
  ]);
});

test("buildVisualComparison ignores absent and invisible selectors plus small geometry variance", () => {
  const comparison = buildVisualComparison({
    legacyResults: [
      {
        path: "/users/loginform",
        ok: true,
        status: 200,
        metrics: {
          bodyTextLength: 400,
          isErrorPage: false,
          pageWrap: {
            x: 10,
            y: 40,
            right: 990,
            bottom: 640,
            width: 980,
            height: 600,
            visible: true,
          },
          loginDialog: { display: "none", height: 0, width: 0, visible: false },
        },
      },
    ],
    localResults: [
      {
        path: "/users/loginform",
        ok: true,
        status: 200,
        errors: [],
        metrics: {
          bodyTextLength: 250,
          isErrorPage: false,
          pageWrap: {
            x: 20,
            y: 50,
            right: 1000,
            bottom: 650,
            width: 980,
            height: 600,
            visible: true,
          },
          loginDialog: null,
        },
      },
    ],
  });

  assert.deepEqual(comparison[0].diffErrors, []);
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
  assert.match(source, /script/u);
  assert.match(source, /template/u);
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

test("visual sweep fixes both browser targets to the Korean legacy locale", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");
  const browserSource = readFileSync(resolve(repoRoot, "scripts/wtr-browser.mjs"), "utf8");

  assert.match(source, /const sweepLocale = "ko-KR";/u);
  assert.match(source, /locale: sweepLocale,/u);
  assert.match(browserSource, /www\.gravatar\.com\/avatar\//u);
  assert.match(source, /src\/assets\/legacy\/default-avatar-128\.png/u);
});

test("visual sweep bootstraps local parity data before browser-form login", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /async function bootstrapLocalAccount\(page, baseUrl\)/u);
  assert.match(source, /async function readLocalCsrfToken\(page, baseUrl\)/u);
  assert.match(source, /async function postLocalJson\(page, baseUrl, path, data\)/u);
  assert.match(source, /async function patchLocalJson\(page, baseUrl, path, data\)/u);
  assert.match(source, /Parity seed project for the admin workspace/u);
  assert.match(source, /\/api\/v1\/projects\/admin\/sample\/posts\/1/u);
  assert.match(source, /title: "Sample board post"/u);
  assert.match(source, /Batch 814 nested parity/u);
  assert.match(
    source,
    /async function signInLocalAccount\(page, baseUrl, identifier, accountPassword\)/u,
  );
  assert.match(source, /async function signOutLocalAccount\(page, baseUrl\)/u);
  assert.match(
    source,
    /async function registerLocalAccount\(page, baseUrl, \{ emailAddress, loginId, name, password \}\)/u,
  );
  assert.match(source, /async function loginLocal\(page, baseUrl\)/u);
  assert.match(source, /return bootstrapLocalAccount\(page, baseUrl\);/u);
  assert.match(source, /await postLocalJson\(page, baseUrl, "\/api\/v1\/organizations"/u);
  assert.match(source, /organizationName: "weblabs"/u);
  assert.match(
    source,
    /await postLocalJson\(page, baseUrl, "\/api\/v1\/owners\/weblabs\/projects"/u,
  );
  assert.match(source, /projectName: "portal"/u);
  assert.match(source, /name: "Site Admin"/u);
  assert.match(source, /loginId: "carol"/u);
  assert.match(source, /name: "Carol Lee"/u);
  assert.match(
    source,
    /async function patchLocalWorkspaceProfile\(page, baseUrl, \{ emailAddress, name \}\)/u,
  );
  assert.match(source, /page\.request\.patch\(`\$\{baseUrl\}\/api\/v1\/workspace\/profile`/u);
  assert.match(source, /await patchLocalWorkspaceProfile\(page, baseUrl, adminAccount\);/u);
  assert.match(
    source,
    /await postLocalJson\(page, baseUrl, "\/api\/v1\/organizations\/weblabs\/members"/u,
  );
  assert.match(
    source,
    /await postLocalJson\(page, baseUrl, "\/api\/v1\/owners\/weblabs\/projects\/portal\/members"/u,
  );
  assert.match(
    source,
    /await postLocalJson\(page, baseUrl, "\/api\/v1\/owners\/weblabs\/projects\/portal\/watch"/u,
  );
  assert.match(
    source,
    /const signedInAdminAgain[\s\S]+?"\/api\/v1\/workspace\/recent-projects"[\s\S]+?ownerName: "alice"[\s\S]+?projectName: "sample"/u,
  );
  assert.match(source, /function sessionPrimerPathForPath\(path\)/u);
  assert.match(source, /pathname === "\/user\/issues\/new" \? "\/alice\/sample" : null/u);
  assert.match(
    source,
    /async function primeSessionProjectVisit\(page, baseUrl, projectPath, label\)/u,
  );
  assert.match(
    source,
    /await page\.goto\(urlFor\(baseUrl, projectPath\), \{ waitUntil: "domcontentloaded" \}\)/u,
  );
  assert.match(source, /if \(label === "legacy"\) \{[\s\S]+?await page\.waitForTimeout\(500\);/u);
  assert.match(
    source,
    /await postLocalJson\(page, baseUrl, "\/api\/v1\/workspace\/recent-projects", \{[\s\S]+?ownerName: "alice",[\s\S]+?projectName: "sample"/u,
  );
  assert.match(source, /await primeSessionProjectVisit\(page, baseUrl, primerPath, label\)/u);
  assert.match(source, /projectName: "svnplayground"/u);
  assert.match(source, /"\/admin\/svnplayground"/u);
  assert.match(source, /vcs: "svn"/u);
  assert.match(
    source,
    /await patchLocalJson\(\s*page,\s*baseUrl,\s*"\/api\/v1\/owners\/admin\/projects\/svnplayground\/overview"/u,
  );
  assert.match(
    source,
    /await postLocalJson\(\s*page,\s*baseUrl,\s*"\/api\/v1\/owners\/admin\/projects\/svnplayground\/watch"/u,
  );
  assert.match(source, /loginId: "alice"/u);
  assert.match(
    source,
    /await postLocalJson\(page, baseUrl, "\/api\/v1\/owners\/admin\/projects\/sample\/fork"/u,
  );
  assert.match(source, /owner: "alice"/u);
  assert.match(
    source,
    /const loginPath = new URL\(urlFor\(baseUrl, "\/users\/loginform"\)\)\.pathname;/u,
  );
  assert.match(source, /const currentPath = new URL\(page\.url\(\)\)\.pathname;/u);
  assert.match(source, /return currentPath !== loginPath && !loginFieldVisible;/u);
  assert.match(
    source,
    /const loggedIn =\s*label === "local" \?\s*await loginLocal\(page, baseUrl\) :\s*await login\(page, baseUrl\);/u,
  );
});

test("visual sweep records P0 global shell computed-style metrics", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /const requestedSweepPaths = parseRequestedSweepPaths/u);
  assert.match(source, /process\.env\.YORAM_SWEEP_PATHS/u);
  assert.match(source, /const viewportProfile = parseViewportProfile/u);
  assert.match(source, /process\.env\.YORAM_SWEEP_VIEWPORT/u);
  assert.match(
    source,
    /const sweepScope = requestedSweepPaths\.length > 0 \? "focused" : sweepIsBatched \? "batch" : "full";/u,
  );
  assert.match(source, /const outputPrefix =/u);
  assert.match(source, /sweepScope === "batch"/u);
  assert.match(source, /`\$\{outputPrefix\}-\$\{viewportProfile\.name\}\.json`/u);
  assert.match(source, /scope: sweepScope/u);
  assert.match(source, /name: "mobile", width: 390, height: 844/u);
  assert.match(source, /height: viewportProfile\.height,/u);
  assert.match(source, /width: viewportProfile\.width,/u);
  assert.match(source, /viewportProfile: viewportProfile\.name/u);
  assert.match(source, /const screenshotLabel =/u);
  assert.match(source, /function localSettledSelectorForPath/u);
  assert.match(source, /pathname\.endsWith\("\/issues"\)/u);
  assert.match(source, /data-stylex-content-ready="true"/u);
  assert.match(source, /if \(\/\\\/code\(\?:\\\/\|\$\)\/u\.test\(pathname\)\)/u);
  assert.match(source, /return "\.code-browse-wrap, \.project-page-wrap \.alert";/u);
  assert.match(source, /if \(\/\\\/commits\\\/\?\$\/u\.test\(pathname\)\)/u);
  assert.match(source, /return "\.page-wrap-outer \.project-page-wrap #history";/u);
  assert.match(source, /if \(pathname\.endsWith\("\/branches"\)\)/u);
  assert.match(source, /return "\.page-wrap-outer \.branch-list-wrap tbody tr";/u);
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
  assert.match(
    source,
    /\.waitForSelector\(`\$\{localSettledSelector\}, \.project-page-wrap > \.error-wrap`/u,
  );
  assert.match(
    source,
    /gnbInner: selectorState\("\.gnb-inner, \[data-stylex-owner='global-gnb-inner'\]"\)/u,
  );
  assert.match(source, /gnbPin: selectorState\(/u);
  assert.match(source, /global-sidebar-open-pin/u);
  assert.match(
    source,
    /gnbLogoLetter: selectorState\("\.logo-letter, \[data-stylex-owner='global-gnb-brand-link'\]"\)/u,
  );
  assert.match(source, /gnbSearchForm: selectorState\("\.gnb-search-form"\)/u);
  assert.match(source, /gnbPin: metrics\.gnbPin/u);
  assert.match(source, /gnbLogoLetter: metrics\.gnbLogoLetter/u);
  assert.match(source, /gnbSearchForm: metrics\.gnbSearchForm/u);
  assert.match(source, /gnbUsermenu: selectorState\("\.gnb-usermenu"\)/u);
  assert.match(source, /x: Math\.round\(rect\.x\)/u);
  assert.match(source, /bottom: Math\.round\(rect\.bottom\)/u);
  assert.match(source, /hasHorizontalOverflow: element\.scrollWidth > element\.clientWidth \+ 1/u);
  assert.match(source, /escapesViewportHorizontally/u);
  assert.match(source, /sidenav: selectorState\("#mySidenav"\)/u);
  assert.match(source, /siteintroCover: selectorState\("\.siteintro-cover"\)/u);
  assert.match(source, /siteHeading: selectorState\("\.site-heading"\)/u);
  assert.match(source, /signupButton: selectorState\("\.signup-btn"\)/u);
  assert.match(source, /siteintroCover: metrics\.siteintroCover/u);
  assert.match(source, /siteHeading: metrics\.siteHeading/u);
  assert.match(source, /signupButton: metrics\.signupButton/u);
  assert.match(
    source,
    /footer: selectorState\("footer\.page-footer-outer, \[data-stylex-owner='site-footer'\]"\)/u,
  );
  assert.match(source, /"\/admin\/sample\/settingform"/u);
  assert.match(source, /"\/admin\/sample\/"/u);
  assert.match(source, /"\/sample\/sample\/"/u);
  assert.match(source, /"\/admin\/sample\/issue\/1"/u);
  assert.match(source, /#issue-body-\$\{issueDetailMatch\[1\]\} \.content\.markdown-wrap`/u);
  assert.match(source, /const selectorTextLength = \(selector\)/u);
  assert.match(source, /issueBodyTextLength: selectorTextLength/u);
  assert.match(source, /commentBodyTextLength: selectorTextLength/u);
  assert.match(source, /const isFramedShell = path === "\/sidebar"/u);
  assert.match(source, /missing global navigation inner container/u);
  assert.match(source, /missing global user menu container/u);
});

test("visual sweep waits for local session resolution before measuring the root", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /function waitForNavigationSessionResponse\(page, baseUrl\)/u);
  assert.match(
    source,
    /label === "local" && path === "\/" \? waitForNavigationSessionResponse\(page, baseUrl\) : null/u,
  );
  assert.match(source, /return Promise\.race\(\[/u);
  assert.match(source, /responseUrl\.pathname === sessionUrl\.pathname/u);
  assert.match(source, /page\.request\.get\(sessionUrl\.toString\(\)\)/u);
  assert.match(source, /async function waitForLocalSessionResolution/u);
  assert.match(source, /session\?\.isAnonymous === false/u);
  assert.match(source, /#required-logged-in/u);
  assert.match(source, /#sidebar-open-btn, \.gnb-usermenu \.avatar-wrap/u);
  assert.match(
    source,
    /await waitForLocalSessionResolution\(page, path, localSessionResponsePromise\)/u,
  );
  assert.match(source, /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolveFrame\)\)/u);
});

test("visual sweep passes browser wait timeouts in the facade options position", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /return text\.length > 0;[\s\S]*undefined,\s*\{ timeout: 5_000 \}/u);
  assert.doesNotMatch(source, /document\.body\.innerText[\s\S]{0,300}includes\("Loading"\)/u);
  assert.match(source, /sheet\.cssRules\.length > 0[\s\S]*undefined,\s*\{ timeout: 10_000 \}/u);
});

test("visual sweep waits for loaded assets and a committed paint before screenshots", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /async function waitForRenderedPaint\(page\)/u);
  assert.match(source, /page\.waitForLoadState\("load"/u);
  assert.match(source, /await waitBounded\(document\.fonts\.ready, "document fonts"\)/u);
  assert.match(source, /image\.decode\?\.\(\)\.catch/u);
  assert.match(source, /void sheet\.cssRules\.length/u);
  assert.match(source, /document\s*\.getAnimations\(\{ subtree: true \}\)/u);
  assert.match(source, /animation\.finished\.catch/u);
  assert.match(source, /did not settle within 2000ms/u);
  assert.match(source, /errors\.push\(\.\.\.paintErrors\)/u);
  assert.match(source, /async function closePageSafely/u);
  assert.doesNotMatch(source, /await context\.close\(\)/u);
  assert.match(source, /await waitForRenderedPaint\(page\)/u);
});

test("visual sweep records P2 and P3 template verifier metrics", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /markdownEditor: selectorState\("\.textarea-box"\)/u);
  assert.doesNotMatch(source, /data-toggle=markdown-editor/u);

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
    "selectedFilterLabel",
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

test("visual sweep maps the StyleX-owned help page shell to pageWrap", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /data-stylex-owner='help-shell-page-wrap-outer'/u);
});

test("visual sweep maps site management page and post selectors to StyleX owners", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /site-post-list-page-wrap-outer/u);
  assert.match(source, /site-issue-list-page-wrap-outer/u);
  assert.match(source, /site-post-list-container/u);
  assert.match(source, /site-issue-list-container/u);
  assert.match(source, /site-post-list-title-link/u);
  assert.match(source, /site-issue-list-title-link/u);
  assert.match(source, /site-project-list-page-wrap-outer/u);
  assert.match(source, /site-mail-page/u);
  assert.match(source, /site-massmail-page/u);
  assert.match(source, /site-update-page/u);
  assert.match(source, /site-diagnostic-page/u);
  assert.match(source, /project-milestones-shell/u);
  assert.match(source, /milestone-detail-shell/u);
});

test("visual sweep waits for form routes with query state", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /const pathname = path\.split\("\?", 1\)\[0\];/u);
  assert.match(source, /pathname\.endsWith\("\/issueform"\)/u);
  assert.match(source, /\\\/\(\?:issue\|post\)\\\/\\d\+\\\/editform\$/u);
  assert.doesNotMatch(source, /pathname\.endsWith\("\/editform"\)/u);
  assert.match(source, /return "\.project-page-wrap";/u);
  assert.match(source, /pathname\.endsWith\("\/newFork"\)/u);
  assert.match(source, /pathname\.endsWith\("\/newPullRequestForm"\)/u);
  assert.match(source, /\/\\\/post\\\/\\d\+\$\/u\.test\(pathname\)/u);
  assert.match(source, /return "#comment-form \.upload-wrap"/u);
  assert.match(source, /\$\{localSettledSelector\}, \.project-page-wrap > \.error-wrap/u);
  assert.match(source, /!localErrorVisible/u);
  assert.match(source, /Number\(item\.issueNumber\) === 1/u);
  assert.match(
    source,
    /navigationPath = `\/admin\/sample\/issueform\?parentIssueId=\$\{encodeURIComponent\(parent\.id\)\}`/u,
  );
});

test("visual sweep captures queued route states with query strings", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /alwaysScreenshotPaths\.has\(path\.split\("\?", 1\)\[0\]\)/u);
  assert.match(source, /"\/admin\/sample\/milestone\/1\/editform"/u);
  assert.match(source, /"\/admin\/sample\/newFork"/u);
  assert.match(source, /"\/admin\/sample\/newMilestoneForm"/u);
  assert.match(source, /"\/admin\/sample\/newPullRequestForm"/u);
  assert.match(source, /"\/admin\/sample\/post\/1"/u);
  assert.match(source, /"\/admin\/sample\/post\/1\/editform"/u);
  assert.match(source, /"\/admin\/sample\/postform"/u);
  assert.match(source, /"\/admin\/sample\/postform\?issueTemplate=true"/u);
  assert.match(source, /"\/admin\/sample\/postform\?readme=true"/u);
});

test("focused pull request sweep aligns the compared repository refs", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /synchronizePullRequestRepositoryFixture/u);
  assert.match(source, /\+refs\/heads\/main:refs\/heads\/main/u);
  assert.match(source, /\+refs\/heads\/feature\/ui:refs\/heads\/feature\/ui/u);
});

test("visual sweep keeps target sessions independent and serializes real-data discovery", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(
    source,
    /if \(sweepTarget === "both"\) synchronizePullRequestRepositoryFixture\(\);/u,
  );
  assert.match(source, /if \(realDataMode && sweepTarget === "both"\)/u);
  assert.match(source, /\[legacy, local\] = await Promise\.all\(\[/u);
  assert.match(source, /runTargetSafely\("legacy", legacyBaseUrl\)/u);
  assert.match(source, /runTargetSafely\("local", localBaseUrl\)/u);
});

test("visual sweep bounds and reports each route inspection", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /async function inspectPageSafely/u);
  assert.match(source, /Route inspection timed out after 60000ms/u);
  assert.match(source, /errors: \[message\]/u);
  assert.match(
    source,
    /\[visual-sweep\] \$\{label\} \$\{index \+ 1\}\/\$\{paths\.length\} \$\{path\}/u,
  );
  assert.match(
    source,
    /const result = await inspectPageSafely\(routePage, baseUrl, path, label\)/u,
  );
  assert.match(source, /results\.push\(result\)/u);
});

test("visual sweep does not require project chrome from redirect-only leave actions", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(
    source,
    /const isRedirectOnlyProjectAction = path\.startsWith\("\/info\/leave\/"\)/u,
  );
  assert.match(source, /!isRedirectOnlyProjectAction/u);
  assert.match(source, /if \(isProjectPage && !metrics\.isErrorPage && !metrics\.projectHeader\)/u);
  assert.match(source, /if \(isProjectPage && !metrics\.isErrorPage && !metrics\.projectMenu\)/u);
});

test("visual sweep supports bounded full-corpus batches", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");
  assert.match(source, /YORAM_SWEEP_BATCH_SIZE/u);
  assert.match(source, /YORAM_SWEEP_BATCH_INDEX/u);
  assert.match(source, /allPaths\.slice\(sweepBatchIndex \* sweepBatchSize/u);
  assert.match(source, /scope: sweepScope,/u);
  assert.match(source, /batch: sweepIsBatched/u);
});

test("visual sweep uses the WTR system-Chrome launcher and reports bounded page teardown", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /launchWtrBrowser/u);
  assert.doesNotMatch(source, /@playwright\/test|PW_CHANNEL/u);
  assert.match(source, /const closeTimeoutMs = 5_000;/u);
  assert.match(source, /page close timed out after \$\{closeTimeoutMs\}ms/u);
  assert.match(source, /closePageSafely\(routePage, `\$\{label\} \$\{path\}`\)/u);
});

test("visual sweep waits for dynamic project label styles before measuring issue lists", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/visual-parity-sweep.mjs"), "utf8");

  assert.match(source, /sheet\.href\?\.includes\("\/issue\/labels\.css"\)/u);
  assert.match(source, /sheet\.cssRules\.length > 0/u);
  assert.match(source, /getComputedStyle\(element\)\.backgroundColor/u);
  assert.match(source, /expected\.style\.backgroundColor/u);
});

test("legacy CSS build preserves Less 1.x division semantics", () => {
  const buildSource = readFileSync(
    resolve(repoRoot, "frontend/scripts/build-legacy-css.mjs"),
    "utf8",
  );
  const legacyCss = readFileSync(
    resolve(repoRoot, "frontend/public/legacy-assets/stylesheets/yobi.css"),
    "utf8",
  );

  assert.match(buildSource, /math: "always"/u);
  assert.doesNotMatch(legacyCss, /opacity:\s*\d+\s*\/\s*100/u);
  assert.match(
    legacyCss,
    /\.select2-container-multi\.issue-labels \.select2-choices \.select2-search-choice-close \{[^}]*opacity: 0;/su,
  );
  assert.match(
    legacyCss,
    /\.select2-container-multi\.issue-labels:hover \.select2-choices \.select2-search-choice-close,[^{]+\{[^}]*opacity: 1;/su,
  );
});

test("React tab translations leave Bootstrap's frozen nav margin in control", () => {
  const source = readFileSync(resolve(repoRoot, "frontend/src/app.css"), "utf8");
  const navTabsRule = source.match(/\.nav-tabs\s*\{(?<body>[^}]*)\}/u)?.groups?.body ?? "";
  assert.doesNotMatch(navTabsRule, /margin\s*:/u);
});
