import { readFileSync } from "../wtr-compat.ts";
// Batch 1118: verify 3-dot merge-base revision compare UI
import { expect, test, type Page } from "../wtr-compat.ts";

const ROUTE_SOURCE = readFileSync(
  "src/routes/$ownerName/$projectName/compare/$revisionRange.tsx",
  "utf8",
);
const DIFF_LINE_VIEW_SOURCE = readFileSync("src/components/diff-line-view.tsx", "utf8");

const EXPECTED_COMPARE_BODY = `
<div class="project-page-wrap"><div class="code-browse-wrap"><p class="commitInfo"><strong class="commitId">@abcdef1234567890..1234567890abcdef</strong></p><div class="alert">No changes</div></div></div>
`;

const EXPECTED_FILE_NO_CHANGES_DIFF = `
<div id="src-main-rs" class="diff-partial-outer"><div class="diff-partial-inner"><div class="diff-partial-meta"><div class="diff-partial-commit"><div class="diff-partial-commit-id"><a href="__BASE_PATH__/admin/sample/code/abcdef1234567890/src/main.rs" title="abcdef1234567890" target="_blank">abcdef1</a></div><div class="diff-partial-commit-id"><a href="__BASE_PATH__/admin/sample/code/1234567890abcdef/src/main.rs" title="1234567890abcdef" target="_blank">1234567</a></div></div><div class="diff-partial-file"><span class="filename">src/main.rs</span></div></div><div class="diff-partial-code" data-hashcode="src/main.rs"><div class="patch-header"><div class="path">--- src/main.rs</div><div class="path">+++ src/main.rs</div></div><table class="diff-container show-comments" data-commit-a="abcdef1234567890" data-commit-b="1234567890abcdef" data-file-path="src/main.rs" data-path-a="src/main.rs" data-path-b="src/main.rs"><tbody><tr><td colspan="3">No changes</td></tr></tbody></table></div></div></div>
`;

const SIMPLE_FILE_PATCH = `--- a/src/main.rs
+++ b/src/main.rs
@@ -1,2 +1,2 @@
 fn main() {
-    println!("old");
+    println!("new");`;

const ADDED_FILE_PATCH = `--- /dev/null
+++ b/src/new.rs
@@ -0,0 +1,1 @@
+pub fn added() {}`;

test("project code compare no-change state matches legacy code/compare.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const compareRequests: string[] = [];
  await mockProjectCompare(page, compareRequests);

  await page.goto(`${basePath}/admin/sample/compare/abcdef1234567890..1234567890abcdef`);
  await expect(page).toHaveTitle("abcdef1234567890..1234567890abcdef - admin/sample");
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".commitInfo .commitId")).toHaveText(
    "@abcdef1234567890..1234567890abcdef",
  );
  expect(compareRequests).toEqual(["abcdef1234567890..1234567890abcdef"]);
  expect(await canonicalize(page, ".project-page-wrap")).toEqual(
    await canonicalizeHtml(page, EXPECTED_COMPARE_BODY),
  );
});

test("project code compare route uses React-rendered legacy projectLayout title metadata", () => {
  expect(ROUTE_SOURCE).toContain("<ProjectCodeCompareTitle");
  expect(ROUTE_SOURCE).toContain(
    "return <title>{`${commitA}..${commitB} - ${ownerName}/${projectName}`}</title>;",
  );
  expect(ROUTE_SOURCE).toContain("commitA: compare.commitA?.commitId || compare.revA || rangeA");
  expect(ROUTE_SOURCE).toContain("commitB: compare.commitB?.commitId || compare.revB || rangeB");
  expect(ROUTE_SOURCE).not.toContain("document.title");
  expect(ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(ROUTE_SOURCE).not.toMatch(/\buseEffect\b[\s\S]*?\btitle\b/u);
  expect(ROUTE_SOURCE).not.toMatch(/\btitle\b[\s\S]*?\buseEffect\b/u);
});

test("project code compare route preserves legacy partial_diff file limit alert", () => {
  expect(ROUTE_SOURCE).toContain("const LEGACY_DIFF_FILE_LIMIT = 2000;");
  expect(ROUTE_SOURCE).toContain("compare.files.length >= LEGACY_DIFF_FILE_LIMIT");
  expect(ROUTE_SOURCE).toContain('t("code.fileDiffLimitExceeded"');
  expect(ROUTE_SOURCE).toMatch(
    /<div className="diff-body discommentable">[\s\S]*?<p className="alert">[\s\S]*?compare\.files\.map/u,
  );
});

test("project code compare uses legacy project-scoped GNB search shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const compareUrl = `${basePath}/admin/sample/compare/abcdef1234567890..1234567890abcdef`;
  const compareRequests: string[] = [];
  await mockProjectCompare(
    page,
    compareRequests,
    {},
    { isProtected: true, organizationName: "admin" },
  );

  await page.goto(compareUrl);
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-stylex-owner="global-gnb-search-box"]');
  await expect(searchBox).toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).toHaveClass(/\bselect\b/);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");

  const scopeButtons = page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button");
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect
    .poll(() =>
      scopeButtons.evaluateAll((elements) =>
        elements.map((element) => ({
          action: element.getAttribute("data-action") ?? "",
          text: element.textContent?.trim() ?? "",
        })),
      ),
    )
    .toEqual([
      { action: "", text: "This Project" },
      { action: "", text: "This Group" },
      { action: "", text: "All Projects" },
    ]);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  await expect(page).toHaveURL(compareUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(2).click();
  await expect(page).toHaveURL(compareUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(0).click();
  await expect(page).toHaveURL(compareUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");

  const metrics = await compareNavbarMetrics(page);
  expect(metrics).not.toBeNull();
  expect(metrics!.form.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.form.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.form.right).toBeLessThanOrEqual(metrics!.navbar.right);
  expect(metrics!.scope.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.scope.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.searchBox.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.searchBox.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.searchBox.right).toBeLessThanOrEqual(metrics!.navbar.right);
  expect(metrics!.input.top).toBeGreaterThanOrEqual(metrics!.searchBox.top);
  expect(metrics!.input.bottom).toBeLessThanOrEqual(metrics!.searchBox.bottom + 1);
  expect(metrics!.projectHeader.top).toBeLessThanOrEqual(metrics!.navbar.top);
  expect(metrics!.menu.top).toBeGreaterThan(metrics!.projectHeader.top);
});

test("project code compare file with no hunks renders legacy partial_filediff no-change row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const compareRequests: string[] = [];
  await mockProjectCompare(page, compareRequests, {
    files: [{ path: "src/main.rs", patch: "" }],
  });

  await page.goto(`${basePath}/admin/sample/compare/abcdef1234567890..1234567890abcdef`);

  const noChangeCell = page.locator(".diff-partial-code tbody tr td");
  await expect(page.locator(".diff-body.discommentable")).toBeVisible();
  await expect(page.locator(".diff-partial-outer#src-main-rs .filename")).toHaveText("src/main.rs");
  await expect(noChangeCell).toHaveAttribute("colspan", "3");
  await expect(noChangeCell).toHaveText("No changes");
  expect(await canonicalize(page, ".diff-partial-outer#src-main-rs")).toEqual(
    await canonicalizeHtml(page, EXPECTED_FILE_NO_CHANGES_DIFF.replace(/__BASE_PATH__/g, basePath)),
  );
});

test("project code compare non-empty patch renders legacy diff table rows", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const compareRequests: string[] = [];
  await mockProjectCompare(page, compareRequests, {
    files: [{ path: "src/main.rs", patch: SIMPLE_FILE_PATCH }],
  });

  await page.goto(`${basePath}/admin/sample/compare/abcdef1234567890..1234567890abcdef`);

  const diffOuter = page.locator(".diff-partial-outer#src-main-rs");
  const diffTable = diffOuter.locator("table.diff-container.show-comments");
  await expect(diffOuter).toBeVisible();
  await expect(page.locator(".diff-file > pre")).toHaveCount(0);
  await expect(diffTable).toHaveCount(1);
  await expect(diffTable.locator("tbody > tr")).toHaveCount(4);
  await expect(diffTable.locator("tbody > tr.range .hunk")).toHaveText("@@ -1,2 +1,2 @@");
  await expect(diffTable.locator("tbody > tr.context")).toHaveAttribute("data-side", "B");
  await expect(diffTable.locator("tbody > tr.context")).not.toHaveAttribute("data-type", /.*/u);
  await expect(diffTable.locator("tbody > tr.context .diff-partial-codeline")).toHaveText(
    " fn main() {",
  );
  await expect(diffTable.locator("tbody > tr.remove")).toHaveAttribute("data-side", "A");
  await expect(diffTable.locator("tbody > tr.remove")).not.toHaveAttribute("data-type", /.*/u);
  await expect(diffTable.locator("tbody > tr.remove .diff-partial-codeline")).toHaveText(
    '-    println!("old");',
  );
  await expect(diffTable.locator("tbody > tr.add")).toHaveAttribute("data-side", "B");
  await expect(diffTable.locator("tbody > tr.add")).not.toHaveAttribute("data-type", /.*/u);
  await expect(diffTable.locator("tbody > tr.add .diff-partial-codeline")).toHaveText(
    '+    println!("new");',
  );

  const metrics = await compareDiffMetrics(page);
  expect(metrics).not.toBeNull();
  expect(metrics!.commitInfo.top).toBeGreaterThanOrEqual(metrics!.pageWrap.top);
  expect(metrics!.commitInfo.left).toBeGreaterThanOrEqual(metrics!.pageWrap.left);
  expect(metrics!.diffBody.top).toBeGreaterThan(metrics!.commitInfo.bottom);
  expect(metrics!.diffOuter.top).toBeGreaterThanOrEqual(metrics!.diffBody.top);
  expect(metrics!.diffOuter.left).toBeGreaterThanOrEqual(metrics!.diffBody.left);
  expect(metrics!.diffOuter.right).toBeLessThanOrEqual(metrics!.diffBody.right + 1);
  expect(metrics!.meta.top).toBeGreaterThanOrEqual(metrics!.diffOuter.top);
  expect(metrics!.meta.height).toBeGreaterThanOrEqual(29);
  expect(metrics!.meta.height).toBeLessThanOrEqual(32);
  expect(metrics!.commitColumn.right).toBeLessThanOrEqual(metrics!.filename.left + 1);
  expect(metrics!.filename.top).toBeGreaterThanOrEqual(metrics!.meta.top);
  expect(metrics!.filename.bottom).toBeLessThanOrEqual(metrics!.meta.bottom + 1);
  expect(metrics!.table.top).toBeGreaterThanOrEqual(metrics!.meta.bottom);
  expect(metrics!.oldLine.right).toBeLessThanOrEqual(metrics!.newLine.left + 1);
  expect(metrics!.newLine.right).toBeLessThanOrEqual(metrics!.codeCell.left + 1);
});

test("project code compare added file renders legacy added-path metadata", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const compareRequests: string[] = [];
  await mockProjectCompare(page, compareRequests, {
    files: [{ path: "src/new.rs", patch: ADDED_FILE_PATCH }],
  });

  await page.goto(`${basePath}/admin/sample/compare/abcdef1234567890..1234567890abcdef`);

  const diffOuter = page.locator(".diff-partial-outer#src-new-rs");
  const commitIds = diffOuter.locator(".diff-partial-commit-id");
  await expect(diffOuter.locator(".filename")).toHaveText("src/new.rs (added)");
  await expect(commitIds.nth(0)).toHaveText("\u00a0");
  await expect(commitIds.nth(0).locator("a")).toHaveCount(0);
  await expect(commitIds.nth(1).locator("a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/1234567890abcdef/src/new.rs`,
  );
  await expect(diffOuter.locator(".patch-header .path")).toHaveText("+++ src/new.rs");
  await expect(diffOuter.locator("table.diff-container")).toHaveAttribute("data-path-a", "");
  await expect(diffOuter.locator("table.diff-container")).toHaveAttribute(
    "data-path-b",
    "src/new.rs",
  );
});

test("project code compare route drops legacy comment JS-only diff line type marker", () => {
  expect(DIFF_LINE_VIEW_SOURCE).toContain("data-line={line.lineNumber}");
  expect(DIFF_LINE_VIEW_SOURCE).toContain('data-side={line.type === "remove" ? "A" : "B"}');
  expect(ROUTE_SOURCE).not.toContain("data-type={line.type}");
  expect(ROUTE_SOURCE).not.toMatch(/<tr[\s\S]*data-type=/u);
});

async function mockProjectCompare(
  page: Page,
  compareRequests: string[],
  compareOverrides: Record<string, unknown> = {},
  projectOverrides: Record<string, unknown> = {},
) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
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
        vcs: "GIT",
        viewerCanUpdate: true,
        ...projectOverrides,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/compare/**", async (route) => {
    compareRequests.push(route.request().url().split("/compare/")[1] ?? "");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        commitA: { commitId: "abcdef1234567890" },
        commitB: { commitId: "1234567890abcdef" },
        files: [],
        noHead: false,
        ownerName: "admin",
        projectName: "sample",
        revA: "abcdef1234567890",
        revB: "1234567890abcdef",
        ...compareOverrides,
      }),
    });
  });
}

async function compareNavbarMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>(
      "header[data-stylex-owner=global-gnb-outer]",
    );
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const searchBox = document.querySelector<HTMLElement>(
      '[data-stylex-owner="global-gnb-search-box"]',
    );
    const input = document.querySelector<HTMLElement>(
      '[data-stylex-owner="global-gnb-search-input"]',
    );
    const projectHeader = document.querySelector<HTMLElement>(".project-header-outer");
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    if (!navbar || !form || !scope || !searchBox || !input || !projectHeader || !menu) {
      return null;
    }

    return {
      form: rect(form),
      input: rect(input),
      menu: rect(menu),
      navbar: rect(navbar),
      projectHeader: rect(projectHeader),
      scope: rect(scope),
      searchBox: rect(searchBox),
    };

    function rect(element: HTMLElement) {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }
  });
}

async function compareDiffMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrap = document.querySelector<HTMLElement>(".project-page-wrap");
    const commitInfo = document.querySelector<HTMLElement>(".code-browse-wrap .commitInfo");
    const diffBody = document.querySelector<HTMLElement>(".diff-body.discommentable");
    const diffOuter = document.querySelector<HTMLElement>(".diff-partial-outer#src-main-rs");
    const meta = document.querySelector<HTMLElement>(".diff-partial-meta");
    const commitColumn = document.querySelector<HTMLElement>(".diff-partial-commit");
    const filename = document.querySelector<HTMLElement>(".diff-partial-file");
    const table = document.querySelector<HTMLElement>("table.diff-container.show-comments");
    const oldLine = document.querySelector<HTMLElement>("tr.context td.linenum:nth-child(1)");
    const newLine = document.querySelector<HTMLElement>("tr.context td.linenum:nth-child(2)");
    const codeCell = document.querySelector<HTMLElement>("tr.context td.code");
    if (
      !pageWrap ||
      !commitInfo ||
      !diffBody ||
      !diffOuter ||
      !meta ||
      !commitColumn ||
      !filename ||
      !table ||
      !oldLine ||
      !newLine ||
      !codeCell
    ) {
      return null;
    }

    return {
      codeCell: rect(codeCell),
      commitColumn: rect(commitColumn),
      commitInfo: rect(commitInfo),
      diffBody: rect(diffBody),
      diffOuter: rect(diffOuter),
      filename: rect(filename),
      meta: rect(meta),
      newLine: rect(newLine),
      oldLine: rect(oldLine),
      pageWrap: rect(pageWrap),
      table: rect(table),
    };

    function rect(element: HTMLElement) {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }
  });
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-stylex-owner",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-stylex-owner",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
