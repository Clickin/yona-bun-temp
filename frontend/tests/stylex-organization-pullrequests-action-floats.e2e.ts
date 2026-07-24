import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const testMode =
  process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ||
  process.env.YONA_E2E_FALLBACK_MODE === "fallback-off"
    ? "fallback-off"
    : "normal";
const screenshotDirectory = resolve(
  `output/playwright/stylex-organization-pullrequests-action-floats/${testMode}`,
);
const owner = (name: string) => `[data-stylex-owner="${name}"]`;
const receiverRailOwner = owner("organization-pullrequests-row-receiver-rail");
const stateOwner = owner("organization-pullrequests-row-state");

const routeSource = readFileSync(
  "src/routes/organizations/$organizationName/pullrequests.tsx",
  "utf8",
);
const styleSource = readFileSync(
  "src/routes/organizations/$organizationName/-organization-pullrequests.stylex.ts",
  "utf8",
);
const legacyRootSource = readFileSync(
  "../yona-original/app/views/organization/group_pullrequest_list.scala.html",
  "utf8",
);
const legacyPartialSource = readFileSync(
  "../yona-original/app/views/organization/group_pullrequest_list_partial.scala.html",
  "utf8",
);
const bootstrapSource = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
const bootstrapResponsiveSource = readFileSync(
  "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  "utf8",
);
const commonLessSource = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_common.less",
  "utf8",
);
const pageLessSource = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_page.less",
  "utf8",
);
const responsiveLessSource = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_responsive.less",
  "utf8",
);
const yobiLessSource = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
const messagesSource = readFileSync("../yona-original/conf/messages", "utf8");

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

function sourceWindow(source: string, marker: string) {
  const index = source.indexOf(marker);
  expect(index, `missing source marker ${marker}`).toBeGreaterThanOrEqual(0);
  return source.slice(Math.max(0, index - 360), index + 360);
}

test("organization pull-request action floats preserve exact legacy source provenance", () => {
  expect(legacyRootSource).toContain("group_pullrequest_list_partial");
  expect(legacyRootSource).toContain('class="nav nav-tabs nm pullrequeset-tab-menu"');
  expect(legacyRootSource).toContain('data-type="state"');
  expect(legacyPartialSource).toContain('<div class="mt5 pull-right hide-in-mobile">');
  expect(legacyPartialSource).toContain('<div class="empty-avatar-wrap">&nbsp;</div>');
  expect(legacyPartialSource).toContain(
    '<div class="state @if(req.isConflict == true) {conflict} else { @req.state.toString.toLowerCase} pull-right">',
  );
  expect(legacyPartialSource).toContain("@if(req.receiver != null)");

  expect(bootstrapSource).toMatch(/\.pull-right\s*\{\s*float:\s*right;\s*\}/u);
  expect(bootstrapResponsiveSource).toContain(".row-fluid .span2");
  expect(bootstrapResponsiveSource).toContain(".media .pull-right");
  expect(commonLessSource).toContain(".mt5 { margin-top:5px; }");
  expect(pageLessSource).toContain(".post-list-wrap {");
  expect(pageLessSource).toContain(".state {");
  expect(pageLessSource).toContain("margin-right:16px;");
  expect(pageLessSource).toContain("margin-top:7px;");
  expect(responsiveLessSource).toContain(".post-list-wrap {");
  expect(responsiveLessSource).toContain(".hide-in-mobile {");
  expect(responsiveLessSource).toContain("display: none !important;");

  expect(yobiLessSource.trim().split(/\r?\n/u)).toEqual(
    legacyImportChain.map((file) => `@import "less/${file}";`),
  );
  for (const imported of legacyImportChain) {
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  for (const message of [
    "issue.noAuthor = No author",
    "pullRequest.is.empty = No pull requests have been received",
    "pullRequest.review.closed = Closed review",
    "pullRequest.review.total = Total review",
    "pullRequest.state.conflict = Conflict",
    "pullRequest.state.open = Open",
  ]) {
    expect(messagesSource).toContain(message);
  }

  expect(routeSource).toContain('data-stylex-owner="organization-pullrequests-row-receiver-rail"');
  expect(routeSource).toContain('data-stylex-owner="organization-pullrequests-row-state"');
  expect(routeSource).toContain("sx.receiverRail");
  expect(routeSource).toContain("sx.state");
  expect(routeSource).toContain("mt5 hide-in-mobile");
  expect(routeSource).toContain("state ${stateKey}");
  expect(
    sourceWindow(routeSource, 'data-stylex-owner="organization-pullrequests-row-receiver-rail"'),
  ).not.toContain("pull-right");
  expect(
    sourceWindow(routeSource, 'data-stylex-owner="organization-pullrequests-row-state"'),
  ).not.toContain("pull-right");
  expect(styleSource).toContain('receiverRail: { float: "right" }');
  expect(styleSource).toContain(
    'state: { color: organizationPullRequestColors.stateText, float: "right" }',
  );
});

test(`organization pull-request action floats preserve populated geometry and interaction (${testMode})`, async ({
  page,
}) => {
  await mockPopulatedOrganizationPullRequests(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/pullrequests?filter=review`, {
      waitUntil: "domcontentloaded",
    });

    const rows = page.locator(owner("organization-pullrequests-row"));
    const receiverRails = page.locator(receiverRailOwner);
    const states = page.locator(stateOwner);
    await expect(rows).toHaveCount(2);
    await expect(receiverRails).toHaveCount(2);
    await expect(states).toHaveCount(2);
    await expect(page.locator(owner("organization-pullrequests-tabs"))).toBeVisible();
    await expect(page.locator("#search")).toHaveAttribute(
      "action",
      `${basePath}/organizations/weblabs/pullrequests`,
    );
    await expect(page.locator('#search input[name="filter"]')).toHaveValue("review");

    await expect(rows.nth(0)).toHaveClass(/(?:^|\s)post-item(?:\s|$)/u);
    await expect(rows.nth(0)).toHaveClass(/(?:^|\s)title(?:\s|$)/u);
    await expect(rows.nth(0)).toHaveAttribute("href", `${basePath}/weblabs/sample/pullRequest/3`);
    await expect(rows.nth(1)).toHaveAttribute(
      "href",
      `${basePath}/weblabs/playground/pullRequest/4`,
    );
    expect(
      await rows
        .nth(0)
        .evaluate((row) =>
          Array.from(row.children).map((child) =>
            child.classList.contains("span10")
              ? "span10"
              : child.classList.contains("span2")
                ? "span2"
                : "other",
          ),
        ),
    ).toEqual(["span10", "span2"]);
    expect(
      await rows
        .nth(0)
        .evaluate((row) =>
          Array.from(row.querySelector<HTMLElement>(".span2")?.children ?? []).map(
            (child) => child.getAttribute("data-stylex-owner") ?? child.className,
          ),
        ),
    ).toEqual([
      "organization-pullrequests-row-receiver-rail",
      "organization-pullrequests-row-state",
    ]);

    await expect(receiverRails.nth(0)).toHaveClass(/(?:^|\s)mt5(?:\s|$)/u);
    await expect(receiverRails.nth(0)).toHaveClass(/(?:^|\s)hide-in-mobile(?:\s|$)/u);
    await expect(receiverRails.nth(1)).toHaveClass(/(?:^|\s)mt5(?:\s|$)/u);
    await expect(receiverRails.nth(1)).toHaveClass(/(?:^|\s)hide-in-mobile(?:\s|$)/u);
    await expect(states.nth(0)).toHaveClass(/(?:^|\s)state(?:\s|$)/u);
    await expect(states.nth(0)).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
    await expect(states.nth(0)).toHaveText("Open");
    await expect(states.nth(1)).toHaveClass(/(?:^|\s)state(?:\s|$)/u);
    await expect(states.nth(1)).toHaveClass(/(?:^|\s)conflict(?:\s|$)/u);
    await expect(states.nth(1)).toHaveText("Conflict");

    const firstReceiver = receiverRails.nth(0).locator("a.avatar-wrap.assinee");
    await expect(firstReceiver).toHaveAttribute("href", `${basePath}/admin`);
    await expect(firstReceiver).toHaveAttribute("title", "Site Admin");
    await expect(firstReceiver.locator("img")).toHaveAttribute("alt", "Site Admin");
    await expect(firstReceiver.locator("img")).toHaveAttribute("width", "32");
    await expect(firstReceiver.locator("img")).toHaveAttribute("height", "32");
    await expect(receiverRails.nth(1).locator(".empty-avatar-wrap")).toHaveCount(1);
    await expect(receiverRails.nth(1).locator(".empty-avatar-wrap")).toHaveText("\u00a0");

    const firstTitle = rows.nth(0).locator(":scope > .span10 > .title-wrap > a.title");
    const secondTitle = rows.nth(1).locator(":scope > .span10 > .title-wrap > a.title");
    await expect(firstTitle).toHaveText("Fix login redirect");
    await expect(firstTitle).toHaveAttribute("href", `${basePath}/weblabs/sample/pullRequest/3`);
    await expect(secondTitle).toHaveText("Conflict branch");
    await expect(secondTitle).toHaveClass(/(?:^|\s)conflict(?:\s|$)/u);
    await expect(secondTitle).toHaveAttribute(
      "href",
      `${basePath}/weblabs/playground/pullRequest/4`,
    );
    await expect(rows.nth(0).locator(":scope > .span10 > .title-wrap > .post-id")).toHaveText("3");
    await expect(rows.nth(1).locator(":scope > .span10 > .title-wrap > .post-id")).toHaveText("4");
    await expect(rows.nth(0).locator(".infos-link-item.group-project-name")).toHaveAttribute(
      "href",
      `${basePath}/weblabs/sample`,
    );
    await expect(rows.nth(1).locator(".infos-link-item.group-project-name")).toHaveAttribute(
      "href",
      `${basePath}/weblabs/playground`,
    );

    for (const actionOwner of [
      receiverRails.nth(0),
      receiverRails.nth(1),
      states.nth(0),
      states.nth(1),
    ]) {
      await expect(actionOwner).not.toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
      await expect(actionOwner).not.toHaveAttribute("style");
      const invalidAttributes = await actionOwner.evaluate((element) => {
        const pluginOnly =
          /^data-(?:toggle|placement|action|href|url|request-.+|dismiss|target|trigger|backdrop|spy|provider|loading-text)$/u;
        return [element, ...Array.from(element.querySelectorAll("*"))].flatMap((node) =>
          Array.from(node.attributes)
            .filter(({ name }) => name === "style" || pluginOnly.test(name))
            .map(({ name }) => name),
        );
      });
      expect(invalidAttributes).toEqual([]);
    }

    const geometry = await page.evaluate(() => {
      const readBox = (element: Element | null) => {
        if (!(element instanceof HTMLElement)) return null;
        const box = element.getBoundingClientRect();
        return {
          bottom: box.bottom,
          display: getComputedStyle(element).display,
          float: getComputedStyle(element).float,
          height: box.height,
          left: box.left,
          right: box.right,
          top: box.top,
          width: box.width,
        };
      };
      const rows = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-stylex-owner="organization-pullrequests-row"]',
        ),
      );
      return {
        documentScrollWidth: document.documentElement.scrollWidth,
        rows: rows.map((row) => {
          const column = row.querySelector<HTMLElement>(":scope > .span2");
          const receiver = row.querySelector<HTMLElement>(
            '[data-stylex-owner="organization-pullrequests-row-receiver-rail"]',
          );
          const state = row.querySelector<HTMLElement>(
            '[data-stylex-owner="organization-pullrequests-row-state"]',
          );
          const rowBox = readBox(row);
          const columnBox = readBox(column);
          const receiverBox = readBox(receiver);
          const stateBox = readBox(state);
          return {
            column: columnBox,
            receiver: receiverBox,
            receiverAndStateShareColumn: receiver?.parentElement === state?.parentElement,
            row: rowBox,
            state: stateBox,
          };
        }),
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry.rows).toHaveLength(2);
    for (const row of geometry.rows) {
      expect(row.receiverAndStateShareColumn).toBe(true);
      expect(row.row).not.toBeNull();
      expect(row.row!.left).toBeGreaterThanOrEqual(0);
      expect(row.row!.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(row.receiver).not.toBeNull();
      expect(row.state).not.toBeNull();
      expect(row.receiver!.float).toBe("right");
      expect(row.state!.float).toBe("right");
      if (viewport.width === 1366) {
        expect(row.receiver!.width).toBeGreaterThan(0);
        expect(row.state!.width).toBeGreaterThan(0);
        for (const action of [row.receiver!, row.state!]) {
          expect(action.left).toBeGreaterThanOrEqual(row.column!.left - 1);
          expect(action.right).toBeLessThanOrEqual(row.column!.right + 1);
          expect(action.left).toBeGreaterThanOrEqual(row.row!.left - 1);
          expect(action.right).toBeLessThanOrEqual(row.row!.right + 1);
          expect(action.top).toBeGreaterThanOrEqual(row.row!.top - 1);
          expect(action.bottom).toBeLessThanOrEqual(row.row!.bottom + 1);
          expect(action.right).toBeLessThanOrEqual(viewport.width + 1);
        }
      }
    }

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });

    const closedTab = page
      .locator(owner("organization-pullrequests-tab"))
      .filter({ hasText: "Closed" });
    await closedTab.click();
    await expect(page).toHaveURL(`${basePath}/organizations/weblabs/closedPullrequests`);
    await expect(
      page.locator('[data-stylex-owner="organization-pullrequests-tabs"] li.active'),
    ).toContainText("Closed");
    await expect(page.locator("#search")).toHaveAttribute(
      "action",
      `${basePath}/organizations/weblabs/closedPullrequests`,
    );
  }
});

async function mockPopulatedOrganizationPullRequests(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Site Admin",
  };
  for (const path of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(path, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        viewerCanUpdate: true,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/pull-requests**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        category: "open",
        closedCount: 1,
        items: [
          {
            closedCommentThreadCount: 1,
            commentThreadCount: 2,
            conflict: false,
            contributorLabel: "Dev Member",
            contributorLoginId: "dev",
            createdLabel: "Jul 1, 2026",
            fromBranch: "feature/login",
            fromOwnerName: "dev",
            fromProjectName: "sample",
            id: 3,
            ownerName: "weblabs",
            projectName: "sample",
            pullRequestNumber: 3,
            receiverLabel: "Site Admin",
            receiverLoginId: "admin",
            reviewerCount: 0,
            reviewerNames: [],
            state: "OPEN",
            title: "Fix login redirect",
            toBranch: "main",
            updatedLabel: "Jul 1, 2026",
          },
          {
            closedCommentThreadCount: 0,
            commentThreadCount: 0,
            conflict: true,
            contributorLabel: "Site Admin",
            contributorLoginId: "admin",
            createdLabel: "Jul 2, 2026",
            fromBranch: "feature/conflict",
            fromOwnerName: "admin",
            fromProjectName: "playground",
            id: 4,
            ownerName: "weblabs",
            projectName: "playground",
            pullRequestNumber: 4,
            receiverLabel: "",
            receiverLoginId: "",
            reviewerCount: 0,
            reviewerNames: [],
            state: "OPEN",
            title: "Conflict branch",
            toBranch: "main",
            updatedLabel: "Jul 2, 2026",
          },
        ],
        openCount: 2,
        pageNum: 1,
        pageSize: 20,
        recentlyPushedBranches: [],
        sentCount: 0,
        totalCount: 2,
      },
    }),
  );
}
