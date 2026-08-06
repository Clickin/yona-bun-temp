import { expect, test } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); join/resolve build those paths; fileURLToPath yields the served URL
// pathname so string mapping + .txt raw-suffix applies.
const mkdirSync = () => undefined;
const join = (...parts: string[]) => parts.join("/");
const resolve = (...parts: string[]) => parts.join("/");
const fileURLToPath = (u: URL) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/code/$branch.tsx", import.meta.url)),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/-code-branch.stylex.ts", import.meta.url),
  ),
  "utf8",
);
const screenshotDirectory = resolve(
  process.cwd(),
  "output/playwright/stylex-project-code-branch-index",
);
mkdirSync(screenshotDirectory, { recursive: true });
const legacyFolderSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/views/code/partial_view_folder.scala.html", import.meta.url),
  ),
  "utf8",
);
const legacyCommonSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  ),
  "utf8",
);
const legacyPageSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);
const legacyYobiSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
  "utf8",
);

const owners = [
  "project-code-branch-tabs",
  "project-code-branch-header",
  "project-code-branch-picker",
  "project-code-branch-breadcrumbs",
  "project-code-branch-list-header",
  "project-code-branch-list-row",
] as const;

test("code branch index keeps six independent visible StyleX owners", () => {
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
  expect(styleSource).toContain("listHeader");
  expect(styleSource).toContain("listRow");
  expect(routeSource).not.toContain("globalColors");
});

test("populated commit-message wrappers own the frozen ml5 margin", () => {
  expect(legacyFolderSource).toContain(
    '<span class="ml5"><a href="@fieldText(file, "commitUrl")">',
  );
  expect(legacyFolderSource).toContain(
    '<span class="ml5"><a href="${commitUrl}">${commitMsg}</a></span>',
  );
  expect(legacyCommonSource).toContain(".ml5 { margin-left:5px; }");
  expect(legacyPageSource).toContain(
    ".commitMsg { font-size:10pt; color:#7e7e7e; .text-overflow; }",
  );
  expect(legacyPageSource).toContain(".listhead { display:none; }");
  expect(legacyPageSource).toContain(".row-fluid   { line-height:40px; }");
  expect(legacyPageSource).toContain(".listitem {");
  expect(legacyYobiSource).toContain('@import "less/_common.less";');
  expect(legacyYobiSource).toContain('@import "less/_page.less";');
  expect(styleSource).toContain("commitMessageWrapper");
  expect(styleSource).toContain('marginLeft: "5px"');
  expect(routeSource).toContain(
    "data-stylex-owner={`project-code-branch-${entry.kind}-commit-message`}",
  );
});

test("populated code branch preserves folder output, branch interaction, and responsive geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: [],
        entries: [
          {
            commitDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            commitMessage: "Add source",
            commitShortId: "abcdef1",
            kind: "folder",
            name: "src",
            path: "src",
          },
          {
            commitDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            commitMessage: "Update README",
            commitShortId: "1234567",
            kind: "file",
            name: "README.md",
            path: "README.md",
          },
        ],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/code/main`, { waitUntil: "commit" });
    const actualViewportWidth = await page.evaluate(() => window.innerWidth);
    await expect(page.locator('[data-stylex-owner="project-code-branch-list-row"]')).toHaveCount(2);
    await expect(page.locator('[data-stylex-owner="project-code-branch-breadcrumbs"]')).toHaveText(
      "sample",
    );
    await expect(page.locator(".code-browse-wrap [data-toggle]")).toHaveCount(0);
    await expect(page.locator(".code-browse-wrap [data-action]")).toHaveCount(0);
    await expect(page.locator("#cb-src .filename a")).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/code/main/src#cb-src`,
    );
    const commitWrappers = page.locator('[data-stylex-owner$="-commit-message"]');
    await expect(commitWrappers).toHaveCount(2);
    const commitIds = ["abcdef1", "1234567"];
    for (let index = 0; index < 2; index += 1) {
      const wrapper = commitWrappers.nth(index);
      await expect(wrapper).toHaveClass(/\bml5\b/);
      // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
      const commitLink = wrapper.locator("a");
      await expect(commitLink).toHaveCount(1);
      await expect(commitLink).toHaveAttribute(
        "href",
        `${basePath}/admin/sample/commit/${commitIds[index]}?branch=main`,
      );
      const wrapperMetrics = await wrapper.evaluate((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return { marginLeft: style.marginLeft, left: box.left, right: box.right };
      });
      expect(wrapperMetrics.marginLeft).toBe("5px");
      expect(wrapperMetrics.right).toBeLessThanOrEqual(actualViewportWidth + 1);
    }

    if (actualViewportWidth < 768) {
      const documentOverflow = await page.evaluate(
        () =>
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
          window.innerWidth,
      );
      expect(documentOverflow).toBeLessThanOrEqual(1);
    }

    const metrics = await page
      .locator('[data-stylex-owner="project-code-branch-list"]')
      .evaluate((list) => {
        const row = list.querySelector<HTMLElement>(
          "[data-stylex-owner=project-code-branch-list-row]",
        );
        if (!row) throw new Error("code branch list row owner missing");
        const rowStyle = getComputedStyle(row);
        return {
          right: list.getBoundingClientRect().right,
          viewport: window.innerWidth,
          rowBorder: rowStyle.borderBottomWidth,
          rowLineHeight: rowStyle.lineHeight,
        };
      });
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.rowBorder).toBe("1px");
    expect(metrics.rowLineHeight).toBe("40px");
    await page.screenshot({
      path: join(screenshotDirectory, `${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/code/main`, { waitUntil: "commit" });
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/main`);
  const picker = page.locator('[data-stylex-owner="project-code-branch-picker"]');
  await expect(picker).toBeVisible();
  await picker.locator("button.select2-choice").click();
  const pickerDrop = page.locator('[data-stylex-owner="project-code-branch-picker-drop"]');
  await expect(pickerDrop).toBeVisible();
  await pickerDrop.locator(".select2-result-label", { hasText: "feature/release" }).click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/feature%2Frelease`);
  await expect(page.locator("[data-stylex-owner=project-code-branch-list-row]")).toHaveCount(2);
});
