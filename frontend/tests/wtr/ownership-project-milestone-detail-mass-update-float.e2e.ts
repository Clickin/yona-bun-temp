import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = "normal";
const screenshotDirectory = resolve(
  "output/playwright/style-project-milestone-detail-mass-update-float",
  fallbackMode,
);
const legacyImportChain = [
  "_variables.less",
  "_mixins.less",
  "_common.less",
  "_sprites.less",
  "_page.less",
  "_tippy.less",
  "_scrollbar.less",
  "_responsive.less",
  "_yobiUI.less",
  "_temporary.less",
  "_markdown.less",
  "_migration.less",
  "_override.less",
] as const;

test.use({ locale: "en-US" });

test(`milestone detail owns the mass-update form float (${fallbackMode})`, async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );

  const legacyView = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");
  const massUpdatePartial = readFileSync(
    "../yona-original/app/views/issue/partial_massupdate.scala.html",
    "utf8",
  );
  const issueListPartial = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
    "utf8",
  );
  const issueDraftPartial = readFileSync(
    "../yona-original/app/views/issue/partial_list_draft.scala.html",
    "utf8",
  );
  const issueListTemplate = readFileSync(
    "../yona-original/app/views/issue/list.scala.html",
    "utf8",
  );
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");
  const massUpdateJs = readFileSync(
    "../yona-original/public/javascripts/service/yobi.issue.MassUpdate.js",
    "utf8",
  );

  expect(legacyView).toContain('<div class="filter-wrap">');
  expect(legacyView).toContain("@issue.partial_massupdate(project, new SearchCondition())");
  expect(legacyView).toContain("issue.partial_list(project, milestone.sortedByNumberOfOpenIssue()");
  expect(massUpdatePartial).toContain('<div class="mass-update-wrap hide-in-mobile">');
  expect(massUpdatePartial).toContain(
    '<form id="mass-update-form" class="mass-update-form pull-left"',
  );
  expect(massUpdatePartial).toContain('method="post"');
  expect(issueListPartial).toContain('<input id="issue-@issue.id" type="checkbox"');
  expect(issueListPartial).toContain('class="mass-update-check hide-in-mobile"');
  expect(issueDraftPartial).toContain('class="post-list-wrap row-fluid"');
  expect(issueListTemplate).toContain("@partial_list_wrap(title, currentPage, param, project)");

  expect(commonLess).toContain(".right-txt     { text-align:right; }");
  expect(pageLess).toContain(".filter-wrap {");
  expect(pageLess).toContain(".mass-update-wrap {");
  expect(pageLess).toContain(".mass-update-form {");
  expect(responsiveLess).toContain(".hide-in-mobile {");
  expect(bootstrap).toMatch(/\.pull-left\s*\{\s*float:\s*left;\s*\}/u);
  expect(bootstrapResponsive).toContain(".row-fluid {");
  for (const imported of legacyImportChain) {
    expect(yobiLess).toContain(`@import "less/${imported}"`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  for (const message of [
    "button.list = List",
    "issue.update.state = Update status",
    "issue.update.assignee.id = Update assignee",
    "issue.update.milestone.id = Update milestone",
    "issue.update.attachLabel = Attach label",
    "issue.update.detachLabel = Detach label",
    "issue.noAssignee = No assignee",
    "issue.noMilestone = No milestone",
    "issue.state.open = Open",
    "issue.state.closed = Closed",
  ]) {
    expect(messages).toContain(message);
  }
  expect(massUpdateJs).toContain("_setMassUpdateFormAffixed");
  expect(massUpdateJs).toContain("_onCheckIssue");
  expect(massUpdateJs).toContain("htElement.welMassUpdateForm");
  expect(massUpdateJs).toContain("welMassUpdateButtons");

  expect(routeSource).toContain('data-owner="milestone-detail-mass-update-form"');
  expect(routeSource).not.toContain('className="mass-update-form pull-left"');

  await mockMilestone(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/milestone/1`, { waitUntil: "commit" });

    const filter = page.locator('[data-owner="milestone-detail-filter"]');
    const wrapper = page.locator('[data-owner="milestone-detail-mass-update"]');
    const form = page.locator('[data-owner="milestone-detail-mass-update-form"]');
    await expect(filter).toBeVisible();
    await expect(wrapper).toHaveCount(1);
    await expect(form).toHaveCount(1);
    await expect(form).toHaveAttribute("id", "mass-update-form");
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", `${basePath}/admin/sample/issues`);
    await expect(form).toHaveClass(/\bmass-update-form\b/u);
    await expect(form).not.toHaveClass(/\bpull-left\b/u);

    const pluginAttribute =
      /^data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)/u;
    expect(
      await form.evaluate((element, pluginAttributeSource) => {
        const pluginAttribute = new RegExp(pluginAttributeSource, "u");
        return [element, ...Array.from(element.querySelectorAll("*"))].flatMap((node) =>
          Array.from(node.attributes)
            .filter(({ name }) => pluginAttribute.test(name))
            .map(({ name }) => name),
        );
      }, pluginAttribute.source),
    ).toEqual([]);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );

    if (viewport.width === 390) {
      await expect(wrapper).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    } else if (await wrapper.isVisible()) {
      await expect(form).toBeVisible();
      await expect(form).toHaveCSS("float", "left");
      expect(
        await form
          .locator(":scope > .btn-group")
          .evaluateAll((elements) => elements.map((element) => element.id)),
      ).toEqual([
        "check-all",
        "state",
        "assignee",
        "milestone",
        "attaching-label",
        "detaching-label",
      ]);
      await expect(form.locator(".d-label")).toHaveText([
        "Update status",
        "Update assignee",
        "Update milestone",
        "Attach label",
        "Detach label",
      ]);
      await expect(form.locator("#state button")).toBeDisabled();
      await expect(form.locator("#assignee button")).toBeDisabled();

      const geometry = await page.evaluate(() => {
        const filterElement = document.querySelector<HTMLElement>(
          '[data-owner="milestone-detail-filter"]',
        );
        const formElement = document.querySelector<HTMLElement>(
          '[data-owner="milestone-detail-mass-update-form"]',
        );
        if (!filterElement || !formElement) return null;
        const filterBox = filterElement.getBoundingClientRect();
        const formBox = formElement.getBoundingClientRect();
        return {
          documentWidth: document.documentElement.scrollWidth,
          filter: {
            bottom: filterBox.bottom,
            left: filterBox.left,
            right: filterBox.right,
            top: filterBox.top,
          },
          form: {
            bottom: formBox.bottom,
            left: formBox.left,
            right: formBox.right,
            top: formBox.top,
          },
          viewportWidth: window.innerWidth,
        };
      });
      expect(geometry).not.toBeNull();
      expect(geometry!.documentWidth).toBeLessThanOrEqual(geometry!.viewportWidth);
      expect(geometry!.form.left).toBeGreaterThanOrEqual(geometry!.filter.left - 1);
      expect(geometry!.form.right).toBeLessThanOrEqual(geometry!.filter.right + 1);
      expect(geometry!.form.top).toBeGreaterThanOrEqual(geometry!.filter.top - 1);
      expect(geometry!.form.bottom).toBeLessThanOrEqual(geometry!.filter.bottom + 1);

      const issueCheckbox = page.locator('input[name="checked-issue"]').first();
      await issueCheckbox.check();
      await expect(form.locator("#state button")).toBeEnabled();
      await form.locator("#state button").click();
      await expect(form.locator("#state")).toHaveClass(/\bopen\b/u);
      await expect(form.locator("#state .dropdown-menu")).toBeVisible();
      await expect(form.locator("#state .dropdown-menu li")).toHaveText(["Open", "Closed"]);
      await form.locator("#state button").click();
      await expect(form.locator("#state")).not.toHaveClass(/\bopen\b/u);
    } else {
      // Batch 922 baseline: the existing global hide-in-mobile cascade hides this wrapper on desktop.
      await expect(wrapper).toBeHidden();
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockMilestone(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        members: [{ loginId: "admin" }],
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
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestone: {
          assignableUsers: [],
          attachments: [],
          closedIssues: [],
          closedIssueCount: 0,
          completionPercent: 50,
          contentsMarkdown: "Details",
          dueDateLabel: "2026-07-30",
          id: "1",
          openIssues: [
            {
              authorLabel: "Admin",
              authorLoginId: "admin",
              authorUserId: "1",
              createdLabel: "2026-07-01",
              createdTitle: "2026-07-01",
              dueDateLabel: "2026-07-30",
              dueDateOverdue: false,
              dueDateText: "8 days left",
              id: "42",
              issueNumber: "42",
              labels: [
                {
                  categoryId: "category-1",
                  categoryName: "Type",
                  color: "#51a351",
                  id: "7",
                  name: "Bug",
                },
              ],
              state: "open",
              title: "Populated milestone issue",
            },
          ],
          openIssueCount: 1,
          openMilestones: [{ id: "2", title: "Next milestone" }],
          projectLabels: [
            {
              categoryId: "category-1",
              categoryName: "Type",
              color: "#51a351",
              id: "7",
              name: "Bug",
            },
          ],
          state: "open",
          title: "v1.0",
          untilLabel: "10 days left",
          viewerCanDelete: true,
          viewerCanUpdate: true,
        },
      },
    }),
  );
}
