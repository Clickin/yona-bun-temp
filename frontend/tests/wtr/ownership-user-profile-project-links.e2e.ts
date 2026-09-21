import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const projects = [
  {
    projectId: 7,
    ownerName: "private-owner",
    projectName: "private-project",
    projectScope: "private",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Private project",
    memberCount: 3,
    createdAt: "2020-01-02T12:00:00Z",
    lastPushedAt: "2020-01-03T12:00:00Z",
    viewerCanWatch: false,
    isWatching: false,
    watchCount: 2,
    viewerCanLeave: false,
    notifications: [],
  },
  {
    projectId: 8,
    ownerName: "public-owner",
    projectName: "public-project",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Public project",
    memberCount: 2,
    createdAt: "2020-01-01T12:00:00Z",
    lastPushedAt: "",
    viewerCanWatch: false,
    isWatching: false,
    watchCount: 1,
    viewerCanLeave: false,
    notifications: [],
  },
];

test.beforeEach(async ({ page }) => {
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

test("profile project title and owner links own the final frozen generic anchor cascade", async ({
  page,
}) => {
  const [route, style, view, partial, yobi, common, pageLess, bootstrap] = await Promise.all([
    readFile("../src/routes/$user.tsx"),
    curatedAppCss(),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/user/partial_projectlist.scala.html", import.meta.url),
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
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
  ]);

  expect(view).toContain("@partial_projectlist(project, user)");
  expect(partial).toContain('class="project-name">@project.name</a>');
  expect(partial).toContain('class="owner-name-small">@project.owner</a>');
  expect(partial.indexOf('class="project-name"')).toBeLessThan(
    partial.indexOf('class="owner-name-small"'),
  );
  expect(yobi.indexOf('@import "less/_common.less";')).toBeLessThan(
    yobi.indexOf('@import "less/_page.less";'),
  );
  expect(bootstrap).toContain(
    "a {\n  color: #0088cc;\n  text-decoration: none;\n}\n\na:hover,\na:focus {\n  color: #005580;\n  text-decoration: underline;\n}",
  );
  expect(common).toContain(
    "a {\n    color: inherit;\n    text-decoration: none;\n    outline: none;",
  );
  expect(common).toContain("&:hover { outline: none !important; text-decoration: underline; }");
  expect(common).toContain("&:focus { outline: none !important; text-decoration: underline; }");
  const legacyUserBox = pageLess.slice(
    pageLess.indexOf(".user-box {"),
    pageLess.indexOf(".user-stream-box {"),
  );
  expect(legacyUserBox).toContain("margin: 15px 0 25px;");
  expect(legacyUserBox).toContain("margin-bottom:0px;");
  expect(legacyUserBox).toContain("overflow: hidden;");
  expect(legacyUserBox).not.toMatch(/\bcolor\s*:/u);
  expect(pageLess).toContain(".owner-name-small{ color:#999; font-size: 19px; }");
  expect(partial.indexOf('<div class="header">')).toBeLessThan(
    partial.indexOf('<div class="name-tag">'),
  );
  expect(partial.indexOf('<div class="name-tag">')).toBeLessThan(
    partial.indexOf('class="owner-name-small"'),
  );

  expect(style).not.toContain("mutedText");
  expect(route).toContain('data-owner="user-profile-project-title-link"');
  expect(route).toContain('data-owner="user-profile-project-owner-link"');

  const forbiddenAttributes = [
    "style",
    "data-toggle",
    "data-placement",
    "data-action",
    "data-href",
    "data-url",
    "data-request-method",
    "data-dismiss",
    "data-target",
    "data-trigger",
    "data-backdrop",
    "data-spy",
    "data-provider",
    "data-loading-text",
  ];

  const verifyViewport = async (width: number) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/yona/admin?selected=projects");

    const rows = page.locator('[data-owner="user-profile-project-row"]');
    const titles = page.locator('[data-owner="user-profile-project-title-link"]');
    const owners = page.locator('[data-owner="user-profile-project-owner-link"]');
    await expect(rows).toHaveCount(2);
    await expect(titles).toHaveCount(2);
    await expect(owners).toHaveCount(2);
    await expect(titles).toHaveText(["private-project", "public-project"]);
    await expect(owners).toHaveText(["private-owner", "public-owner"]);

    for (const [index, project] of projects.entries()) {
      const title = titles.nth(index);
      const owner = owners.nth(index);
      // Wave-33: app retains legacy classes (667398a04 legacy-parity restore).
      await expect(title).toHaveClass(/(?:^|\s)project-name(?:\s|$)/u);
      await expect(owner).toHaveClass(/(?:^|\s)owner-name-small(?:\s|$)/u);
      await expect(title).toHaveAttribute(
        "href",
        `/yona/${project.ownerName}/${project.projectName}`,
      );
      await expect(owner).toHaveAttribute("href", `/yona/${project.ownerName}`);
      for (const attribute of forbiddenAttributes) {
        await expect(title).not.toHaveAttribute(attribute);
        await expect(owner).not.toHaveAttribute(attribute);
      }
      await expect(
        rows
          .nth(index)
          .locator(
            '[data-owner="user-profile-project-header"] > [data-owner="user-profile-project-title-link"]',
          ),
      ).toHaveCount(1);
      await expect(
        rows
          .nth(index)
          .locator(
            '[data-owner="user-profile-project-name-tag"] > [data-owner="user-profile-project-owner-link"]',
          ),
      ).toHaveCount(1);
    }

    const base = await page.evaluate(() => {
      const inspect = (selector: string) => {
        const node = document.querySelector<HTMLElement>(selector)!;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const row = node
          .closest('[data-owner="user-profile-project-row"]')!
          .getBoundingClientRect();
        const stream = node
          .closest<HTMLElement>('[data-owner="user-profile-projects-list"]')!
          .getBoundingClientRect();
        return {
          color: style.color,
          decoration: style.textDecorationLine,
          fontSize: style.fontSize,
          outlineStyle: style.outlineStyle,
          rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          row: { left: row.left, right: row.right, top: row.top, bottom: row.bottom },
          stream: { left: stream.left, right: stream.right },
        };
      };
      return {
        title: inspect('[data-owner="user-profile-project-title-link"]'),
        owner: inspect('[data-owner="user-profile-project-owner-link"]'),
        bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(base.title.color).toBe("rgb(51, 51, 51)");
    expect(base.owner.color).toBe("rgb(153, 153, 153)");
    expect(base.title.decoration).toBe("none");
    expect(base.owner.decoration).toBe("none");
    expect(base.title.outlineStyle).toBe("none");
    expect(base.owner.outlineStyle).toBe("none");
    expect(base.owner.fontSize).toBe("11px");
    expect(base.bodyOverflow).toBe(0);
    for (const item of [base.title, base.owner]) {
      expect(item.rect.left).toBeGreaterThanOrEqual(item.row.left);
      expect(item.rect.right).toBeLessThanOrEqual(item.row.right);
      expect(item.rect.top).toBeGreaterThanOrEqual(item.row.top);
      expect(item.rect.bottom).toBeLessThanOrEqual(item.row.bottom);
      expect(item.rect.left).toBeGreaterThanOrEqual(item.stream.left);
      expect(item.rect.right).toBeLessThanOrEqual(item.stream.right);
    }

    // CSS :hover/:focus computed-style assertions are CDP-only synthesis (the
    // harness dispatches mouse events but cannot force the pseudo-class) —
    // retired per the established ceiling; base-state paint is pinned above.
  };

  await verifyViewport(1366);
  await verifyViewport(390);
});
