import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const projects = [
  {
    projectId: 7,
    ownerName: "other",
    projectName: "forked",
    projectScope: "public",
    logoUrl: "/assets/images/forked.png",
    overview: "Forked project",
    memberCount: 3,
    createdLabel: "today",
    viewerCanWatch: true,
    isWatching: false,
    watchCount: 2,
    viewerCanLeave: false,
    originOwnerName: "upstream",
    originProjectName: "source",
    notifications: [],
  },
  {
    projectId: 8,
    ownerName: "other",
    projectName: "plain",
    projectScope: "public",
    logoUrl: "/assets/images/plain.png",
    overview: "Plain project",
    memberCount: 2,
    createdLabel: "yesterday",
    viewerCanWatch: true,
    isWatching: true,
    watchCount: 4,
    viewerCanLeave: false,
    notifications: [],
  },
];

test.beforeEach(async ({ page }) => {
  await page.route(/\/assets\/images\/(?:forked|plain)\.png$/u, (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "projects",
        viewerCanEditProfile: false,
        profile: {
          loginId: "admin",
          displayName: "Admin",
          englishName: "Admin",
          avatarUrl: "",
          primaryEmailAddress: "",
          sinceLabel: "2026-01-01",
          isGuest: false,
          isBlocked: false,
          isSiteAdmin: false,
          connectedSocialProviders: [],
        },
        issueItems: [],
        memberProjects: projects,
        pullRequestItems: [],
      },
    }),
  );
});

test("profile project avatar images and conditional fork icon own the final legacy declarations", async ({
  page,
}) => {
  const [routeSource, styleSource, view, partial, yobi, commonLess, yobiUiLess, bootstrap] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/views/user/partial_projectlist.scala.html",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
        "utf8",
      ),
    ]);

  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain(
    '<a href="@routes.ProjectApp.project(project.owner, project.name)" class="avatar-wrap small">',
  );
  expect(partial).toContain('<img src="@urlToProjectLogo(project)">');
  expect(partial).toContain('<i class="yobicon-split yobicon-white vmiddle"></i>');
  expect(yobi.indexOf('@import "less/_common.less";')).toBeLessThan(
    yobi.indexOf('@import "less/_yobiUI.less";'),
  );
  expect(bootstrap).toContain(
    "img {\n  width: auto\\9;\n  height: auto;\n  max-width: 100%;\n  vertical-align: middle;",
  );
  expect(commonLess).toContain(".vmiddle  { vertical-align:middle !important; }");
  expect(yobiUiLess).toContain("img {\n        width:100%;\n        vertical-align:top;\n    }");

  expect(styleSource).toContain(
    'projectAvatarImage: {\n    width: "100%",\n    verticalAlign: "top",\n  }',
  );
  expect(styleSource).not.toContain('projectAvatarImage: {\n    height: "100%"');
  expect(styleSource).toContain("projectForkIcon: {");
  expect(styleSource).toContain('verticalAlign: "middle !important"');
  expect(routeSource).toContain('data-stylex-owner="user-profile-project-avatar-image"');
  expect(routeSource).toContain('data-stylex-owner="user-profile-project-fork-icon"');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/yona/admin");
  await page.getByRole("button", { name: /Projects/i }).click();

  const rows = page.locator('[data-stylex-owner="user-profile-project-row"]');
  const images = page.locator('[data-stylex-owner="user-profile-project-avatar-image"]');
  const forkedRow = rows.nth(0);
  const plainRow = rows.nth(1);
  const forkIcon = forkedRow.locator('[data-stylex-owner="user-profile-project-fork-icon"]');

  await expect(rows).toHaveCount(2);
  await expect(images).toHaveCount(2);
  await expect(forkIcon).toHaveCount(1);
  await expect(
    plainRow.locator('[data-stylex-owner="user-profile-project-fork-icon"]'),
  ).toHaveCount(0);
  await expect(forkIcon).not.toHaveClass(/yobicon-split/u);
  await expect(forkIcon).not.toHaveClass(/yobicon-white/u);
  await expect(forkIcon).not.toHaveClass(/vmiddle/u);
  await expect(forkIcon).not.toHaveAttribute("style");
  await expect(forkIcon).not.toHaveAttribute("data-toggle");
  await expect(forkIcon).not.toHaveAttribute("data-action");

  for (const [index, name] of ["forked", "plain"].entries()) {
    const row = rows.nth(index);
    const wrapper = row.locator('[data-stylex-owner="user-profile-project-avatar-link"]');
    const image = row.locator('[data-stylex-owner="user-profile-project-avatar-image"]');
    await expect(wrapper).not.toHaveClass(/avatar-wrap/u);
    await expect(wrapper).not.toHaveClass(/small/u);
    await expect(wrapper).toHaveAttribute("href", `/yona/other/${name}`);
    await expect(image).toHaveAttribute("src", `/assets/images/${name}.png`);
    await expect(image).toHaveAttribute("alt", "");
    await expect(image).not.toHaveAttribute("style");
    await expect(image).not.toHaveAttribute("data-toggle");
    await expect(wrapper.locator(":scope > img")).toHaveCount(1);
  }

  const headerChildren = await forkedRow
    .locator('[data-stylex-owner="user-profile-project-header"]')
    .evaluate((node) =>
      [...node.children].map((child) => ({
        tag: child.tagName,
        className: child.className,
        text: child.textContent?.trim() ?? "",
      })),
    );
  expect(headerChildren).toEqual([
    expect.objectContaining({
      tag: "A",
      text: "forked",
    }),
    expect.objectContaining({
      tag: "I",
      className: expect.not.stringContaining("yobicon-split"),
      text: "",
    }),
    expect.objectContaining({ tag: "SPAN", text: "upstream/source" }),
  ]);
  await expect(
    forkedRow.locator('[data-stylex-owner="user-profile-project-header"] span a'),
  ).toHaveAttribute("href", "/yona/upstream/source");
  await expect(
    forkedRow.locator('[data-stylex-owner="user-profile-project-header"] span'),
  ).toHaveText(" upstream/source");
  await expect(plainRow.locator('[data-stylex-owner="user-profile-project-header"]')).toHaveText(
    "plain",
  );

  const assertMetrics = async (viewportWidth: number) => {
    const metrics = await rows.evaluateAll((nodes) =>
      nodes.map((row) => {
        const wrapper = row.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-project-avatar-link"]',
        )!;
        const image = row.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-project-avatar-image"]',
        )!;
        const icon = row.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-project-fork-icon"]',
        );
        const stream = row
          .closest<HTMLElement>('[data-stylex-owner="user-profile-projects-list"]')!
          .getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        return {
          imageWidth: getComputedStyle(image).width,
          imageVerticalAlign: getComputedStyle(image).verticalAlign,
          iconVerticalAlign: icon ? getComputedStyle(icon).verticalAlign : null,
          imageContained:
            imageRect.left >= wrapperRect.left &&
            imageRect.right <= wrapperRect.right &&
            imageRect.top >= wrapperRect.top &&
            imageRect.bottom <= wrapperRect.bottom,
          rowContained:
            row.getBoundingClientRect().left >= stream.left &&
            row.getBoundingClientRect().right <= stream.right,
        };
      }),
    );
    expect(metrics).toHaveLength(2);
    for (const metric of metrics) {
      expect(metric.imageWidth).toBe("24px");
      expect(metric.imageVerticalAlign).toBe("top");
      expect(metric.imageContained).toBe(true);
      expect(metric.rowContained).toBe(true);
    }
    expect(metrics[0].iconVerticalAlign).toBe("middle");
    expect(metrics[1].iconVerticalAlign).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewportWidth);
  };

  await assertMetrics(1366);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertMetrics(390);
});
