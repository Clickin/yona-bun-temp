import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const generatedFallbackHref = "legacy-assets/stylesheets/legacy-fallback.css";

async function expectClassFreeSiteLayout(
  page: Page,
  owners: readonly string[],
) {
  for (const owner of owners) {
    const locator = page.locator(`[data-stylex-owner="${owner}"]`);
    await expect(locator).toBeVisible();
    await expect(locator).not.toHaveClass(
      /(?:site-admin-page|page-wrap-outer|site-setting-wrap|row-fluid|span(?:1|2|3|4|5|10))/u,
    );
  }
}

test("site-admin fallback bridge has no React emitter", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".site-admin-page");
  expect(appCss).not.toContain(".site-setting-wrap");

  for (const [route, owners] of [
    [
      "src/routes/sites/userList.tsx",
      [
        "site-user-list-page-wrap-outer",
        "site-user-list-setting-wrap",
        "site-user-list-setting-grid",
        "site-user-list-setting-sidebar-column",
        "site-user-list-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/postList.tsx",
      [
        "site-post-list-page-wrap-outer",
        "site-post-list-setting-wrap",
        "site-post-list-setting-grid",
        "site-post-list-setting-sidebar-column",
        "site-post-list-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/projectList.tsx",
      [
        "site-project-list-page-wrap-outer",
        "site-project-list-setting-wrap",
        "site-project-list-setting-grid",
        "site-project-list-setting-sidebar-column",
        "site-project-list-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/mail.tsx",
      [
        "site-mail-page",
        "site-mail-setting-grid",
        "site-mail-sidebar-column",
        "site-mail-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/massmail.tsx",
      [
        "site-massmail-page",
        "site-massmail-setting-grid",
        "site-massmail-sidebar-column",
        "site-massmail-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/update.tsx",
      [
        "site-update-page",
        "site-update-setting-grid",
        "site-update-sidebar-column",
        "site-update-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/diagnostic.tsx",
      [
        "site-diagnostic-page",
        "site-diagnostic-setting-grid",
        "site-diagnostic-sidebar-column",
        "site-diagnostic-setting-content-column",
      ],
    ],
    [
      "src/routes/sites/data.tsx",
      [
        "site-data-page",
        "site-data-setting-grid",
        "site-data-sidebar-column",
        "site-data-setting-content-column",
      ],
    ],
  ] as const) {
    const source = readFileSync(route, "utf8");
    expect(source).not.toContain("site-admin-page");
    for (const owner of owners) expect(source).toContain(`data-stylex-owner=\"${owner}\"`);
  }
});

test("app-shell fallback bridge has no remaining selector", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".app-shell");
});

test("runtime-error-banner fallback bridge has no remaining selector", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".runtime-error-banner");
});

test("runtime-grid fallback bridge has no remaining selectors", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".runtime-grid {",
    ".runtime-grid div {",
    ".runtime-grid dt {",
    ".runtime-grid dd {",
  ]) {
    expect(appCss).not.toContain(selector);
  }
});

test("project history generic activity wrappers have no fallback bridge", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".content-container .main-stream {");
  expect(appCss).not.toContain(".content-container .main-stream .activity-streams {");
  // The item-specific first/last rules remain until their conditional StyleX
  // variants own the legacy padding and border declarations.
  expect(appCss).toContain(
    ".content-container .main-stream .activity-streams .activity-stream:first-of-type",
  );
  expect(appCss).toContain(
    ".content-container .main-stream .activity-streams .activity-stream:last-child",
  );
  expect(readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8")).toContain(
    'data-stylex-owner="project-history-stream"',
  );
  expect(readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8")).toContain(
    'data-stylex-owner="project-history-activity-streams"',
  );
});

test("posting-history modal trigger bridge has no remaining selector arm", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain('.board-view .posting-history > button[data-toggle="modal"]');
  expect(appCss).not.toContain('.posting-history > button[data-toggle="modal"]');
  expect(appCss).not.toContain('.voter-list li > button[data-toggle="modal"]');
  expect(appCss).not.toContain('.vote-description-people[data-toggle="modal"]');
  expect(appCss).toContain(".modal {");
  expect(appCss).toContain(".modal-backdrop");
  for (const route of [
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
  ]) {
    expect(readFileSync(route, "utf8")).not.toContain('data-toggle="modal"');
  }
});

test("row-fluid controls-row fallback bridge has no app.css arm", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain('.row-fluid .controls-row [class*="span"] + [class*="span"] {');
  expect(appCss).toContain('.row-fluid [class*="span"]:first-child {');
});

test("alert-danger fallback bridge has no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".alert-danger,");
  expect(appCss).not.toContain(".alert-danger h4,");
  expect(appCss).toContain(".alert-error {");
  expect(appCss).toContain(".alert-error h4 {");
});

test("dead syntax selector family has no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".syntax-comment",
    ".syntax-quote",
    ".syntax-keyword",
    ".syntax-title",
    ".syntax-params",
    ".syntax-string",
    ".syntax-number",
    ".syntax-punctuation",
    ".syntax-meta",
    ".syntax-identifier",
  ]) {
    expect(appCss).not.toContain(selector);
  }

  for (const retainedSelector of [
    ".hljs-comment,",
    ".hljs-keyword,",
    ".hljs-title,",
    ".hljs-params {",
    ".hljs-string,",
    ".hljs-number {",
    ".hljs-punctuation {",
    ".hljs-meta {",
  ]) {
    expect(appCss).toContain(retainedSelector);
  }
});

test("sidebar refresh plugin bridge has no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".sidebar .nav-tabs li > .refresh-button {",
    ".sidebar .refresh-button:hover,",
    ".sidebar .refresh-button:focus {",
  ]) {
    expect(appCss).not.toContain(selector);
  }
  for (const retainedSelector of [
    ".sidebar .nav-tabs li a,",
    ".sidebar .nav-tabs .active a,",
  ]) {
    expect(appCss).toContain(retainedSelector);
  }
  const source = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  expect(source).toContain("leftSidebarTabStyles.refreshButton");
  expect(source).not.toContain("refresh-button");
});

test("issueform legacy insert bridge has no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".attached-file .btn-insert",
    ".attached-file .btn-insert:hover",
    ".attached-file.complete .btn-insert",
  ]) {
    expect(appCss).not.toContain(`${selector} {`);
  }
  expect(appCss).toContain(".attached-file.complete .progress {");
  expect(readFileSync("src/routes/$ownerName/$projectName/issueform.tsx", "utf8")).toContain(
    'className={`btn-insert-copy ${stylex.props(issueFormStyles.attachedFileInsertCopy).className ?? ""}`.trim()}',
  );
});

test("issueform legacy picker bridge has no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".issue-form-page-wrap .issue-label-trigger",
    ".issue-form-page-wrap .issue-assignee-selection",
    ".issue-form-page-wrap .issue-assignee-arrow",
    ".issue-form-page-wrap .issue-label-selection",
    ".issue-form-page-wrap .issue-label-color",
    ".issue-project-utility-menu",
  ]) {
    expect(appCss).not.toContain(`${selector} {`);
  }
  expect(appCss).toContain(".issue-form-page-wrap .issue-combobox > input {");
  expect(appCss).toContain(".issue-form-page-wrap .issue-combobox-options {");
  expect(readFileSync("src/routes/$ownerName/$projectName/issueform.tsx", "utf8")).not.toContain(
    "issue-assignee-selection",
  );
});

test("site post-row fallback bridges have no remaining selectors", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".post-row {",
    ".post-row-main {",
    ".post-title {",
    ".post-row-meta {",
  ]) {
    expect(appCss).not.toContain(selector);
  }

  for (const [route, owners] of [
    [
      "src/routes/sites/postList.tsx",
      ["site-post-list-row", "site-post-list-info", "site-post-list-title-link", "site-post-list-metadata"],
    ],
    [
      "src/routes/sites/issueList.tsx",
      ["site-issue-list-row", "site-issue-list-info", "site-issue-list-title-link", "site-issue-list-metadata"],
    ],
  ] as const) {
    const source = readFileSync(route, "utf8");
    for (const owner of owners) expect(source).toContain(`data-stylex-owner="${owner}"`);
    expect(source).not.toContain('className="post-row"');
    expect(source).not.toContain('className="post-row-main"');
    expect(source).not.toContain('className="post-row-meta"');
    expect(source).not.toContain('className="post-title"');
  }
});

test("board form fallback bridges have no remaining selector arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".board-label-picker");
  for (const selector of [
    ".board-comment-form,",
    ".board-form {",
    ".board-comment-form textarea,",
    ".board-form textarea {",
    ".board-form label {",
    ".board-check {",
  ]) {
    expect(appCss).not.toContain(selector);
  }

  for (const route of [
    "src/routes/$ownerName/$projectName/postform.tsx",
    "src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx",
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
  ]) {
    const source = readFileSync(route, "utf8");
    for (const selector of [
      "board-label-picker",
      "board-comment-form",
      "board-form",
      "board-check",
    ]) {
      expect(source).not.toContain(selector);
    }
  }
});

test("board-comment fallback bridge has no remaining producer", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".board-comment {");
  expect(appCss).toContain(".board-comments {");
  expect(appCss).toContain(".board-comment-wrap");
  expect(appCss).toContain(".review-card .comments {");

  for (const route of [
    "src/routes/$ownerName/$projectName/postform.tsx",
    "src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx",
    "src/routes/$ownerName/$projectName/post/$postNumber.tsx",
  ]) {
    expect(readFileSync(route, "utf8")).not.toMatch(/["'`]board-comment["'`]/);
  }
});

test("board-actions fallback bridge has no remaining selector", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".board-actions {");
  expect(appCss).toContain(".actions {");
  expect(appCss).toContain(".checkbox {");

  for (const [route, owner] of [
    ["src/routes/$ownerName/$projectName/postform.tsx", "project-postform-actions"],
    [
      "src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx",
      "post-edit-form-actions",
    ],
  ]) {
    const source = readFileSync(route, "utf8");
    expect(source).not.toContain("board-actions");
    expect(source).toContain(`data-stylex-owner=\"${owner}\"`);
  }
});

test("pull-request action and branch fallback bridges have no remaining selector arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".pull-request-actions");
  expect(appCss).not.toContain(".pull-request-branches");
  expect(appCss).toContain(".thread-actrow,");
  expect(appCss).toContain(".actions {");

  for (const route of [
    "src/routes/$ownerName/$projectName/newPullRequestForm.tsx",
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
  ]) {
    const source = readFileSync(route, "utf8");
    expect(source).not.toContain("pull-request-actions");
    expect(source).not.toContain("pull-request-branches");
  }
});

test("dead temporary typography bridges have no remaining selectors", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".eyebrow {");
  expect(appCss).not.toContain(".lede {");
  expect(appCss).toContain("h1 {");
  expect(appCss).not.toContain(".content-container .main-stream {");
  expect(appCss).not.toContain(".content-container .main-stream .activity-streams {");
  expect(appCss).toContain(
    ".content-container .main-stream .activity-streams .activity-stream:first-of-type",
  );
  expect(appCss).toContain(
    ".content-container .main-stream .activity-streams .activity-stream:last-child",
  );
});

test("secret-page fallback selector branches have no React emitter", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".secret-page .secret-box",
    ".secret-page .secret-wrap",
    ".secret-page .logo",
  ]) {
    expect(appCss).not.toContain(selector);
  }

  for (const retainedSelector of [
    ".secret-box {",
    ".secret-wrap {",
    ".secret-wrap .logo {",
    ".page-wrap-outer:has(.secret-box.txt-center) .secret-wrap",
  ]) {
    expect(appCss).toContain(retainedSelector);
  }
});

test("code and diff fallback bridges have no remaining selectors", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".diff-file",
    ".diff-stats",
    ".diff-code",
    ".diff-table",
    ".line-comment-trigger",
    ".inline-comment-form-row",
    ".code-review-form",
    ".code-syntax-wrap",
    ".code-line-wrap",
    ".line-code",
  ]) {
    expect(appCss).not.toContain(selector);
  }

  for (const retainedSelector of [
    ".diff-body",
    ".diff-partial-codeline",
    ".diff-container tr.comments",
    ".review-wrap",
    ".line-number",
    ".hljs-comment",
  ]) {
    expect(appCss).toContain(retainedSelector);
  }
});

test("codediff markdown-editor plugin bridge has no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    '.codediff-wrap [data-toggle="markdown-editor"] > .nav-tabs > li > button',
    '.codediff-wrap [data-toggle="markdown-editor"] > .nav-tabs > li > button:hover',
    '.codediff-wrap [data-toggle="markdown-editor"] > .nav-tabs > li > button:focus',
    '.codediff-wrap [data-toggle="markdown-editor"] > .nav-tabs > li.active > button',
    '.codediff-wrap [data-toggle="markdown-editor"] > .nav-tabs > li.active > button:hover',
    '.codediff-wrap [data-toggle="markdown-editor"] > .nav-tabs > li.active > button:focus',
  ]) {
    expect(appCss).not.toContain(selector);
  }
  expect(appCss).toContain(".codediff-wrap .review-container .nav-tabs > li > button");
  expect(appCss).toContain(
    ".codediff-wrap .review-container .nav-tabs > li.active > button",
  );
});

test("pull-request tab button bridge has no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".pullrequeset-tab-menu > li > button {",
    ".pullrequeset-tab-menu > li > button:hover,",
    ".pullrequeset-tab-menu > li > button:focus {",
    ".pullrequeset-tab-menu > li.active > button,",
    ".pullrequeset-tab-menu > li.active > button:hover,",
    ".pullrequeset-tab-menu > li.active > button:focus {",
  ]) {
    expect(appCss).not.toContain(selector);
  }
  expect(appCss).toContain(".nav-tabs > li > a:hover,");
  expect(appCss).toContain(".nav-tabs > li.active > a,");
  expect(readFileSync("src/routes/$ownerName/$projectName/pullRequests.tsx", "utf8")).not.toContain(
    "pullrequeset-tab-menu",
  );
  expect(
    readFileSync("src/routes/organizations/$organizationName/pullrequests.tsx", "utf8"),
  ).not.toContain("pullrequeset-tab-menu");
});

test("uneditable-input width bridge has no current React consumer", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".uneditable-input");
  expect(appCss).toContain("input,\ntextarea {\n  width: 206px;\n}");
});

test("dead Bootstrap btn-primary bridge has no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".btn-primary {");
  expect(appCss).not.toContain(".btn-primary:hover,");
  expect(appCss).not.toContain(".btn-primary:focus");
  expect(appCss).toContain(".ybtn-primary,\n.ybtn-success {");
  expect(appCss).toContain(".ybtn-success:focus {");
});

test("milestone mass-update button bridge has no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".milesion-wrap .mass-update-list > li > button {",
    ".milesion-wrap .mass-update-list > li > button:hover,",
    ".milesion-wrap .mass-update-list > li > button:focus {",
  ]) {
    expect(appCss).not.toContain(selector);
  }
  expect(appCss).toContain(".milesion-wrap .item-count-groups > button.sharer-color,");
  expect(appCss).toContain(".issue-list-page .item-count-groups > button.sharer-color");
});

test("dot-variant ybtn bridges have no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".ybtn.primary {");
  expect(appCss).not.toContain(".ybtn.danger {");
  expect(appCss).toContain(".ybtn-primary,");
  expect(appCss).toContain(".ybtn {");
});

test("dead badge-info bridge has no app.css arm", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".badge-info");
  expect(appCss).toContain(".label-info {\n  background-color: #3a87ad;\n}");
});

test("project-home issue-wrap bridge has no React-side fallback arm", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".project-home .issue-wrap {");
  expect(appCss).not.toContain(".project-home .issue-wrap a.btn {");
});

test("site mail form-horizontal bridge has no app.css arms", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".form-horizontal .control-group");
  expect(appCss).not.toContain(".form-horizontal .control-label");
  expect(appCss).not.toContain(".form-horizontal .controls");
  expect(readFileSync("src/routes/sites/mail.tsx", "utf8")).toContain(
    'data-stylex-owner="site-mail-form"',
  );
});

test("board toolbar bridge has no current producer", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".board-toolbar");
  expect(readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8")).not.toContain(
    "board-toolbar",
  );
});

test("search-layout fallback bridge has no remaining selector", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".search-layout");
  expect(appCss).toContain(".search-category-wrap {");
  expect(appCss).toContain("#searchInnerForm {");
});

test("search-page fallback bridge has no React or legacy producer", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".search-page {");

  for (const route of [
    "src/routes/search.tsx",
    "src/routes/$ownerName/$projectName/search.tsx",
    "src/routes/organizations/$organizationName/search.tsx",
  ]) {
    expect(readFileSync(route, "utf8")).not.toMatch(/className=[^{\n]*["'`]search-page["'`]/u);
  }
});

test("project-issues dead list-reset bridge is retired", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  expect(appCss).not.toContain(".issue-list-page .post-list-wrap {");
  expect(appCss).toContain(".post-list-wrap {");
  expect(appCss).not.toContain(".issue-list-page .issue-item-row {");
  expect(readFileSync("src/routes/$ownerName/$projectName/issues.tsx", "utf8")).not.toContain(
    'className="issue-list-page',
  );
});

test("project-issues left-menu scoped search bridge is retired", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".issue-list-page .left-menu #search hr.hide-in-mobile {",
    ".issue-list-page .left-menu .search-bar {",
    ".issue-list-page .left-menu .search-bar .textbox {",
    ".issue-list-page .left-menu .search-bar .search-btn {",
    ".issue-list-page .left-menu .issue-option {",
    ".issue-list-page .left-menu .issue-option dt {",
    ".issue-list-page .left-menu .issue-option dd {",
    ".issue-list-page .left-menu .issue-option select {",
  ]) {
    expect(appCss).not.toContain(selector);
  }
  expect(appCss).toContain(".search-box-wrap {");
  expect(appCss).toContain(".search-category-wrap li.empty a,");
});

test("project-issues dead row and mass-update ancestor bridge is retired", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  for (const selector of [
    ".issue-list-page .mass-update-form .btn-group {",
    ".issue-list-page .post-item .mass-update-check {",
    ".issue-list-page .post-item .avatar-wrap {",
    ".issue-list-page .post-item .title-wrap .title {",
    ".issue-list-page .post-item .infos {",
    ".issue-list-page .item-count-groups {",
    ".issue-list-page .child-issue-list {",
  ]) {
    expect(appCss).not.toContain(selector);
  }
  expect(readFileSync("src/routes/$ownerName/$projectName/issues.tsx", "utf8")).not.toContain(
    'className="issue-list-page',
  );
});

async function mockMassMailSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-massmail" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/projects", (route) =>
    route.fulfill({ json: { projects: [{ ownerName: "admin", projectName: "projectYobi" }] } }),
  );
}

async function mockSecretSetup(page: Page) {
  await page.route("**/api/v1/auth/capabilities", (route) =>
    route.fulfill({ json: { secretSetupRequired: true } }),
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ json: { isAnonymous: true } }),
  );
}

async function mockProjectListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-project-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      json: {
        filter: "road",
        page: 1,
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-06-29",
            id: 77,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
}

async function mockUserListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-user-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 1,
        state: "ACTIVE",
        total: 1,
        totalPages: 1,
        users: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            createdAt: "2026-06-28",
            displayName: "Alice",
            emailAddress: "alice@example.com",
            id: 1,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "",
            loginId: "alice",
            state: "ACTIVE",
          },
        ],
      },
    }),
  );
}

async function mockPostListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-post-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            title: "Release checklist",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
}

async function mockIssueListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-issue-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/issues?*", (route) =>
    route.fulfill({
      json: {
        issues: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 5,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 13:00",
            issueNumber: "42",
            labels: [],
            ownerName: "acme",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            state: "open",
            title: "Fix release blocker",
          },
        ],
        page: 1,
        pageSize: 20,
        state: "open",
        total: 1,
        totalPages: 1,
      },
    }),
  );
}

async function mockBoardEditFormSession(page: Page) {
  const session = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-board-edit" },
      json: {
        actorId: 2,
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "dev",
        userLabel: "Dev Member",
      },
    });
  };
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      json: {
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: { board: true, code: true, issue: true, milestone: true, pullRequest: true, review: true },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/3", (route) =>
    route.fulfill({
      json: {
        attachments: [],
        authorId: "2",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        bodyHtml: "<p>Post <strong>markdown</strong></p>",
        bodyMarkdown: "Post **markdown**",
        commentCount: 0,
        comments: [],
        createdLabel: "Jul 2, 2026",
        historyHtml: "",
        historyMarkdown: "",
        id: "103",
        isWatching: false,
        labels: [],
        notice: false,
        ownerName: "admin",
        permissions: { canComment: true, canCreate: true, canDelete: true, canRead: true, canSetNotice: true, canUpdate: true, canWatch: true },
        postNumber: "3",
        projectName: "sample",
        readme: false,
        title: "Release note",
        updatedLabel: "Jul 2, 2026",
        watcherCount: 0,
      },
    }),
  );
}

async function mockPullRequestEditFormSession(page: Page) {
  const session = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-pull-request-edit" },
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    });
  };
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: { board: true, code: true, issue: true, milestone: true, pullRequest: true, review: true },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/7/form-options", (route) =>
    route.fulfill({
      json: {
        fromBranches: [{ name: "feature/ui", selected: true }],
        fromProjects: [{ id: 8, ownerName: "dev", projectName: "fork", selected: true }],
        mode: "edit",
        pullRequest: {
          bodyMarkdown: "Initial body",
          fromBranch: "feature/ui",
          fromOwnerName: "dev",
          fromProjectName: "fork",
          id: 90,
          projectName: "sample",
          state: "OPEN",
          title: "Initial title",
        },
        selected: { fromBranch: "feature/ui", fromProjectId: 8, toBranch: "main", toProjectId: 7 },
        toBranches: [{ name: "main", selected: true }],
        toProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*", (route) =>
    route.fulfill({
      json: {
        commits: [
          {
            authorDateLabel: "Jul 2, 2026",
            authorEmail: "dev@example.com",
            commitId: "abcdef1234567890",
            commitMessage: "Add UI",
            commitShortId: "abcdef1",
          },
        ],
        conflict: true,
      },
    }),
  );
}

async function mockAuthenticatedNotificationSession(page: Page) {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript((configuredBasePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    localStorage.setItem("yobi-intro", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: configuredBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "ko-KR",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        hasMore: false,
        items: [
          {
            actor: {
              avatarUrl: `${basePath}/assets/images/default-avatar-64.png`,
              displayName: "Site Admin",
              loginId: "admin",
            },
            createdAt: "2026-07-14T00:00:00Z",
            createdLabel: "방금 전",
            eventType: "NEW_COMMENT",
            id: "notification-1",
            message: "알림 본문",
            targetHref: "",
            targetTitle: "알림 제목",
            typeIcon: "info",
          },
        ],
        total: 1,
      },
    }),
  );
  for (const endpoint of ["workspace/overview", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}

async function mockProjectPostsSession(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        showBoard: true,
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 2,
            createdLabel: "Jul 2, 2026",
            labels: [],
            notice: false,
            ownerName: "admin",
            postNumber: "3",
            projectName: "sample",
            readme: false,
            title: "Release note",
          },
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 0,
            createdLabel: "Jul 3, 2026",
            labels: [],
            notice: false,
            ownerName: "admin",
            postNumber: "4",
            projectName: "sample",
            readme: true,
            title: "README",
          },
        ],
        notices: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Site Admin",
            authorLoginId: "admin",
            commentCount: 0,
            createdLabel: "Jul 1, 2026",
            labels: [],
            notice: true,
            ownerName: "admin",
            postNumber: "1",
            projectName: "sample",
            readme: false,
            title: "Notice",
          },
        ],
        openIssueCount: 0,
        closedIssueCount: 0,
        pageNum: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canAttachFiles: false,
        canMarkNotice: true,
        canMarkReadme: false,
        defaultPermissions: {
          canAttachFiles: false,
          canCreate: true,
          canMarkNotice: true,
          canMarkReadme: false,
        },
        labels: [],
      },
    }),
  );
}

async function mockRuntimeGridProjectHome(page: Page) {
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "csrf-runtime-grid" },
        json: session,
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        cloneUrl: "https://example.com/admin/sample.git",
        currentMilestone: {
          closedIssueCount: 1,
          completionPercent: 50,
          dueDateLabel: "Jul 5, 2026",
          dueDateOverdue: false,
          id: 5,
          openIssueCount: 1,
          state: "open",
          title: "v1.0",
          untilLabel: "4 days left",
        },
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          noMilestoneOpenIssueCount: 0,
          pullRequests: [],
          unassignedOpenIssueCount: 0,
        },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            loginId: "admin",
            userId: 1,
            userLabel: "Site Admin",
          },
        ],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanCreateCommitResource: true,
        viewerCanLeave: true,
        viewerCanUpdate: true,
      },
    }),
  );
}

async function mockGlobalSearchSession(page: Page) {
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route) => route.fulfill({ contentType: "application/json", json: session }));
  await page.route("**/api/v1/search**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        keyword: "bug",
        searchType: "issue",
        counts: {
          issues: 1,
          users: 0,
          projects: 0,
          posts: 0,
          milestones: 0,
          issueComments: 0,
          postComments: 0,
          reviews: 0,
        },
        items: [
          {
            id: "1",
            href: "/yona/weblabs/demo/issue/1",
            type: "issue",
            title: "Bug issue",
            projectName: "demo",
            ownerName: "weblabs",
            authorLabel: "admin",
            authorLoginId: "admin",
            createdLabel: "today",
            updatedLabel: "today",
            number: "1",
            state: "open",
            snippets: [{ text: "Bug issue", highlights: [] }],
          },
        ],
        totalCount: 1,
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "issue",
        scope: "global",
        context: { organizationName: "", ownerName: "", projectName: "" },
      },
    }),
  );
}

test("generated fallback excludes only proven dead Yobi selectors", async ({ page }) => {
  test.skip(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1",
    "normal runtime asset contract",
  );

  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/") ? configuredBasePath : `${configuredBasePath}/`;
  await page.goto(basePath, { waitUntil: "commit" });

  const fallbackLink = page.locator(`link[href$="${generatedFallbackHref}"]`);
  await expect(fallbackLink).toHaveCount(1);
  const fallbackHref = await fallbackLink.getAttribute("href");
  if (!fallbackHref) {
    throw new Error("Generated legacy fallback link must have an href.");
  }
  const fallbackCss = await page.evaluate(async (href) => {
    const response = await fetch(href);
    return response.text();
  }, fallbackHref);

  for (const selector of [
    ".all-projects .project .info-wrap .forked",
    ".all-projects .project .stats-wrap .like",
    ".all-projects .project .stats-wrap .like .num",
    ".all-projects .project .stats-wrap .like .ico",
    ".profile-frmwrap .avatar-frm",
    ".profile-frmwrap .avatar-frm .avatar-wrap",
    ".profile-frmwrap .avatar-frm .avatar-wrap .progress",
    ".profile-frmwrap .avatar-frm .avatar-wrap .progress.loading",
    ".profile-frmwrap .avatar-frm .btn-wrap",
    ".profile-frmwrap .avatar-frm .btn-wrap .nbtn i",
    ".milestones .milestone .infos .desc",
  ]) {
    expect(fallbackCss).not.toContain(`${selector} {`);
  }

  expect(fallbackCss).toContain(".all-projects .project .stats-wrap .members {");
  expect(fallbackCss).toContain(".profile-frmwrap dl {");
  expect(fallbackCss).toContain(".profile-frmwrap form {");
  expect(fallbackCss).toContain(".milestones .milestone .infos .progress-wrap {");
  expect(fallbackCss).toContain(".milestones .milestone .infos .actrow {");
  expect(fallbackCss).toContain(".milestones .milestone .completion-rate {");
});

test("fallback-off discovery mode removes the generated legacy stylesheet", async ({ page }) => {
  test.skip(
    process.env.VITE_DISABLE_LEGACY_FALLBACK !== "1",
    "runs only through test:e2e:fallback-off",
  );

  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/") ? configuredBasePath : `${configuredBasePath}/`;
  await page.goto(basePath, { waitUntil: "commit" });

  await expect(
    page.locator(`link[href$="${generatedFallbackHref}"]`),
  ).toHaveCount(0);
  await expect(page.locator("#root")).toHaveCount(1);
});

test("massmail default and selected-project output retain the runtime fallback boundary", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockMassMailSession(page);
  await page.goto(`${basePath}/sites/massmail`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  await expect(page.locator("#mailtoAll")).toBeChecked();
  await expect(page.locator("#project-list-wrap")).toBeHidden();
  await expect(page.locator(".app-shell, .site-admin-page, .project-select-row")).toHaveCount(0);
  await expectClassFreeSiteLayout(page, [
    "site-massmail-page",
    "site-massmail-setting-grid",
    "site-massmail-sidebar-column",
    "site-massmail-setting-content-column",
  ]);

  await page.locator("#mailtoPrj").check();
  await page.locator("#input-project").fill("admin/projectYobi");
  await page.locator("#select-project").click();
  await expect(page.locator("#selected-projects")).toHaveText("admin/projectYobi x");
  await expect(page.locator(".app-shell, .site-admin-page, .project-select-row")).toHaveCount(0);
});

test("project-list output retains the runtime fallback boundary without its dead bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockProjectListSession(page);
  await page.goto(`${basePath}/sites/projectList?filter=road`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const container = page.locator('[data-stylex-owner="site-project-list-container"]');
  await expect(container).toBeVisible();
  await expect(container.locator('[data-stylex-owner="site-project-list-project-name"]')).toHaveText(
    "acme/roadmap",
  );
  await expect(page.locator(".site-admin-page, .project-list-wrap")).toHaveCount(0);
  await expectClassFreeSiteLayout(page, [
    "site-project-list-page-wrap-outer",
    "site-project-list-setting-wrap",
    "site-project-list-setting-grid",
    "site-project-list-setting-sidebar-column",
    "site-project-list-setting-content-column",
  ]);
});

test("user-list output retains the runtime fallback boundary without its dead bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockUserListSession(page);
  await page.goto(`${basePath}/sites/userList`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const list = page.locator('[data-stylex-owner="site-user-list-row-list"]');
  await expect(list).toBeVisible();
  await expect(list.locator('[data-stylex-owner="site-user-list-row-user-name"]')).toHaveText(
    "Alice",
  );
  await expect(page.locator(".site-admin-page, .user-list-wrap")).toHaveCount(0);
  await expectClassFreeSiteLayout(page, [
    "site-user-list-page-wrap-outer",
    "site-user-list-setting-wrap",
    "site-user-list-setting-grid",
    "site-user-list-setting-sidebar-column",
    "site-user-list-setting-content-column",
  ]);
});

test("post-list output retains the runtime fallback boundary without its dead bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockPostListSession(page);
  await page.goto(`${basePath}/sites/postList`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const container = page.locator('[data-stylex-owner="site-post-list-container"]');
  await expect(container).toBeVisible();
  const row = container.locator('[data-stylex-owner="site-post-list-row"]');
  await expect(row).toHaveCount(1);
  await expect(row.locator(':scope > [data-stylex-owner="site-post-list-project-avatar"]')).toHaveCount(1);
  await expect(row.locator(':scope > [data-stylex-owner="site-post-list-info"]')).toHaveCount(1);
  await expect(row.locator(':scope > [data-stylex-owner="site-post-list-metadata"]')).toHaveCount(1);
  await expect(row.locator('[data-stylex-owner="site-post-list-title-link"]')).toHaveText("Release checklist");
  expect(await row.evaluate((element) => {
    const [avatar, info, metadata] = Array.from(element.children).map((child) =>
      child.getBoundingClientRect(),
    );
    const rowBox = element.getBoundingClientRect();
    return {
      avatarLeft: avatar.left,
      infoTop: info.top,
      metadataTop: metadata.top,
      rowBottom: rowBox.bottom,
    };
  })).toEqual(expect.objectContaining({ avatarLeft: expect.any(Number), infoTop: expect.any(Number), metadataTop: expect.any(Number), rowBottom: expect.any(Number) }));
  await expect(page.locator(".site-admin-page, .post-list-wrap")).toHaveCount(0);
  await expectClassFreeSiteLayout(page, [
    "site-post-list-page-wrap-outer",
    "site-post-list-setting-wrap",
    "site-post-list-setting-grid",
    "site-post-list-setting-sidebar-column",
    "site-post-list-setting-content-column",
  ]);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileRow = await row.evaluate((element) => {
    const rowBox = element.getBoundingClientRect();
    const titleBox = element.querySelector('[data-stylex-owner="site-post-list-title-link"]')?.getBoundingClientRect();
    return { rowBox, titleBox, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(mobileRow.titleBox).not.toBeNull();
  expect(mobileRow.titleBox!.right).toBeLessThanOrEqual(mobileRow.rowBox.right + 1);
  expect(mobileRow.scrollWidth).toBeLessThanOrEqual(390);
});

test("issue-list output retains StyleX row ownership without the dead post-row bridges", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockIssueListSession(page);
  await page.goto(`${basePath}/sites/issueList?state=open`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const row = page.locator('[data-stylex-owner="site-issue-list-row"]');
  await expect(row).toHaveCount(1);
  await expect(row.locator(':scope > [data-stylex-owner="site-issue-list-project-avatar"]')).toHaveCount(1);
  await expect(row.locator(':scope > [data-stylex-owner="site-issue-list-info"]')).toHaveCount(1);
  await expect(row.locator(':scope > [data-stylex-owner="site-issue-list-metadata"]')).toHaveCount(1);
  await expect(row.locator('[data-stylex-owner="site-issue-list-title-link"]')).toHaveText("Fix release blocker");
  const desktop = await row.evaluate((element) => {
    const rowBox = element.getBoundingClientRect();
    const avatarBox = element.children[0]?.getBoundingClientRect();
    const infoBox = element.children[1]?.getBoundingClientRect();
    const metadataBox = element.children[2]?.getBoundingClientRect();
    return { rowBox, avatarBox, infoBox, metadataBox };
  });
  expect(desktop.avatarBox!.left).toBeGreaterThanOrEqual(desktop.rowBox.left);
  expect(desktop.infoBox!.top).toBeGreaterThanOrEqual(desktop.rowBox.top);
  expect(desktop.metadataBox!.bottom).toBeLessThanOrEqual(desktop.rowBox.bottom + 1);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await row.evaluate((element) => {
    const rowBox = element.getBoundingClientRect();
    const titleBox = element.querySelector('[data-stylex-owner="site-issue-list-title-link"]')?.getBoundingClientRect();
    return { rowBox, titleBox, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(mobile.titleBox).not.toBeNull();
  expect(mobile.titleBox!.right).toBeLessThanOrEqual(mobile.rowBox.right + 1);
  expect(mobile.scrollWidth).toBeLessThanOrEqual(390);
  await expect(page.locator(".post-row, .post-row-main, .post-row-meta")).toHaveCount(0);
});

test("board edit form retains legacy form controls without dead board bridges", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockBoardEditFormSession(page);
  await page.goto(`${basePath}/admin/sample/post/3/editform`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const form = page.locator("form.nm");
  await expect(form).toBeVisible();
  await expect(form.locator(".content-wrap.frm-wrap")).toHaveCount(1);
  await expect(form.locator(".actions")).toHaveCount(1);
  await expect(form.locator('[data-stylex-owner="post-edit-form-actions"]')).toHaveCount(1);
  await expect(form.locator("label.checkbox")).toHaveCount(3);
  await expect(form.locator(".board-label-picker")).toHaveCount(0);
  await expect(form.locator(".board-actions")).toHaveCount(0);
  await expect(form.locator(".board-check")).toHaveCount(0);
  const desktop = await form.evaluate((element) => {
    const formBox = element.getBoundingClientRect();
    const contentBox = element.querySelector(".content-wrap.frm-wrap")?.getBoundingClientRect();
    const actionsBox = element.querySelector(".actions")?.getBoundingClientRect();
    const content = element.querySelector(".content-wrap.frm-wrap");
    const actions = content?.querySelector(":scope > .actions");
    const checkboxGroup = Array.from(content?.children ?? []).find((child) =>
      child.querySelector("label.checkbox"),
    );
    return {
      actionsBox,
      checkboxGroupBeforeActions:
        !!checkboxGroup &&
        !!actions &&
        Array.from(content?.children ?? []).indexOf(checkboxGroup) <
          Array.from(content?.children ?? []).indexOf(actions),
      contentBox,
      formBox,
    };
  });
  expect(desktop.contentBox!.left).toBeGreaterThanOrEqual(desktop.formBox.left);
  expect(desktop.actionsBox!.right).toBeLessThanOrEqual(desktop.formBox.right + 1);
  expect(desktop.checkboxGroupBeforeActions).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await form.evaluate((element) => {
    const formBox = element.getBoundingClientRect();
    const actionsBox = element.querySelector(".actions")?.getBoundingClientRect();
    return { actionsBox, formBox, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(mobile.actionsBox!.right).toBeLessThanOrEqual(mobile.formBox.right + 1);
  expect(mobile.scrollWidth).toBeLessThanOrEqual(390);
});

test("pull-request edit form retains active action order without dead action and branch bridges", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockPullRequestEditFormSession(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const form = page.locator("form.nm");
  await expect(form).toBeVisible();
  await expect(form.locator(".pull-request-wrap")).toHaveCount(1);
  await expect(form.locator(".pull-request-wrap > .pull-left")).toHaveCount(1);
  await expect(form.locator(".pull-request-wrap > .arrow + .pull-right")).toHaveCount(1);
  await expect(form.locator(".actions > button[type=submit] + button[type=button]")).toHaveCount(1);
  await expect(page.locator(".pull-request-actions, .pull-request-branches")).toHaveCount(0);

  const desktop = await form.evaluate((element) => {
    const formBox = element.getBoundingClientRect();
    const selectorsBox = element.querySelector(".pull-request-wrap")?.getBoundingClientRect();
    const actionsBox = element.querySelector(".actions")?.getBoundingClientRect();
    return { actionsBox, formBox, selectorsBox, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(desktop.selectorsBox!.left).toBeGreaterThanOrEqual(desktop.formBox.left);
  expect(desktop.actionsBox!.right).toBeLessThanOrEqual(desktop.formBox.right + 1);
  expect(desktop.scrollWidth).toBeLessThanOrEqual(1366);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await form.evaluate((element) => {
    const formBox = element.getBoundingClientRect();
    const actionsBox = element.querySelector(".actions")?.getBoundingClientRect();
    return { actionsBox, formBox, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(mobile.actionsBox!.right).toBeLessThanOrEqual(mobile.formBox.right + 1);
  expect(mobile.scrollWidth).toBeLessThanOrEqual(392);
});

test("project posts retains legacy label output without the dead board-badge bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockProjectPostsSession(page);
  await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  await expect(page.locator(".app-shell, .board-page")).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="project-posts-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-posts-item"]')).toHaveCount(3);
  await expect(page.locator(".post-list-wrap .label.label-notice")).toHaveText("Notice");
  await expect(page.locator(".post-list-wrap .label.label-important")).toHaveText("README");
  await expect(page.locator(".board-badges, .board-badge, .board-label")).toHaveCount(0);
});

test("project home retains the legacy right rail without the dead runtime-grid bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockRuntimeGridProjectHome(page);
  await page.goto(`${basePath}/admin/sample`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const rail = page.locator(".span-right-pane");
  await expect(rail).toBeVisible();
  await expect(rail.locator('[data-stylex-owner="project-home-side-panel"]')).toBeVisible();
  await expect(rail.locator('[data-stylex-owner="project-home-member-inner"]')).toBeVisible();
  await expect(rail.locator(".project-btn-wrap + .milestone-info + .inner.member-info")).toHaveCount(
    1,
  );
  await expect(page.locator(".runtime-grid")).toHaveCount(0);
});

test("notifications output retains the runtime fallback boundary without its dead page bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockAuthenticatedNotificationSession(page);
  await page.goto(`${basePath}/notifications`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const list = page.locator('[data-stylex-owner="authenticated-home-notification-list"]');
  await expect(list).toBeVisible();
  await expect(
    list.locator(':scope > [data-stylex-owner="authenticated-home-notification-row"]'),
  ).toHaveCount(1);
  await expect(page.locator(".notification-page, .activity-streams")).toHaveCount(0);
});

test("secret setup output retains active fallback classes without secret-page branches", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockSecretSetup(page);
  await page.goto(`${basePath}/secret`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const owner = page.locator('[data-stylex-owner="secret-setup"]');
  await expect(owner).toBeVisible();
  await expect(owner).toHaveClass(/\bsecret-wrap\b/u);
  await expect(owner.locator('[data-stylex-part="secret-setup-logo"]')).toHaveText("Yoram");
  await expect(owner.locator('[data-stylex-part="secret-setup-box"]')).toBeVisible();
  await expect(owner.locator(".secret-box, .logo")).toHaveCount(2);
  await expect(page.locator(".secret-page")).toHaveCount(0);
});

test("global search output retains the runtime fallback boundary without the dead search-layout bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockGlobalSearchSession(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/search?keyword=bug&searchType=issue`);

    await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
      process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
    );
    await expect(page.locator('[data-stylex-owner="global-search-input"]')).toHaveValue("bug");
    await expect(page.locator('[data-stylex-owner="global-search-result-wrap"]')).toBeVisible();
    await expect(page.locator('[data-stylex-owner="global-search-result-item"]')).toHaveCount(1);
    await expect(page.locator(".search-layout, .search-page")).toHaveCount(0);
  }
});
