import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const projects = [
  {
    projectId: 7,
    ownerName: "other",
    projectName: "forked",
    projectScope: "public",
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Forked project",
    memberCount: 3,
    createdAt: "2020-01-02T12:00:00Z",
    lastPushedAt: "",
    viewerCanWatch: true,
    isWatching: true,
    watchCount: 4,
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
    logoUrl: "/assets/images/project_default_logo.png",
    overview: "Plain project",
    memberCount: 2,
    createdAt: "2020-01-01T12:00:00Z",
    lastPushedAt: "",
    viewerCanWatch: true,
    isWatching: false,
    watchCount: 2,
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

test("profile project origin links and watch controls preserve frozen geometry", async ({
  page,
}) => {
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

  const verifyViewport = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.goto("/yona/admin?selected=projects");

    const rows = page.locator('[data-owner="user-profile-project-row"]');
    const origin = page.locator('[data-owner="user-profile-project-origin-link"]');
    const buttons = page.locator('[data-owner="user-profile-project-watch-button"]');
    const icons = page.locator('[data-owner="user-profile-project-watch-icon"]');
    const badges = page.locator('[data-owner="user-profile-project-watch-badge"]');

    await expect(rows).toHaveCount(2);
    await expect(origin).toHaveCount(1);
    await expect(buttons).toHaveCount(2);
    await expect(icons).toHaveCount(2);
    await expect(badges).toHaveCount(2);
    await expect(origin).toHaveText("upstream/source");
    await expect(origin).toHaveAttribute("href", "/yona/upstream/source");
    await expect(
      rows.nth(1).locator('[data-owner="user-profile-project-origin-link"]'),
    ).toHaveCount(0);

    await expect(buttons.nth(0)).toHaveAttribute("href", "/yona/other/forked/unwatch");
    await expect(buttons.nth(1)).toHaveAttribute("href", "/yona/other/plain/watch");
    await expect(buttons.nth(0)).toContainText("Unwatch");
    await expect(buttons.nth(1)).toContainText("Watch");
    await expect(buttons.nth(0)).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
    await expect(buttons.nth(0)).toHaveClass(/(?:^|\s)watchBtn(?:\s|$)/u);
    for (const icon of await icons.all()) {
      await expect(icon).toHaveClass(
        /(?:^|\s)yobicon-(?:eye-open|eye-close|middle|white)(?:\s|$)/u,
      );
    }
    await expect(badges).toHaveText(["4", "2"]);
    await expect(badges.nth(0)).toHaveClass(/(?:^|\s)num-badge(?:\s|$)/u);
    await expect(badges.nth(1)).toHaveClass(/(?:^|\s)num-badge(?:\s|$)/u);

    const firstChildren = await buttons.nth(0).evaluate((node) =>
      [...node.children].map((child) => ({
        tag: child.tagName,
        className: child.className,
        text: child.textContent,
      })),
    );
    expect(firstChildren).toEqual([
      expect.objectContaining({
        tag: "I",
        className: expect.stringMatching(/(?:^|\s)yobicon-/u),
      }),
      expect.objectContaining({
        tag: "SPAN",
        className: expect.stringMatching(/(?:^|\s)num-badge(?:\s|$)/u),
        text: "4",
      }),
    ]);

    for (const element of [
      origin,
      ...[0, 1].flatMap((index) => [buttons.nth(index), icons.nth(index), badges.nth(index)]),
    ]) {
      for (const attribute of forbiddenAttributes) {
        await expect(element).not.toHaveAttribute(attribute);
      }
    }

    const computed = await page.evaluate(() => {
      const css = (selector: string) => {
        const node = document.querySelector<HTMLElement>(selector)!;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const row = node
          .closest('[data-owner="user-profile-project-row"]')!
          .getBoundingClientRect();
        const button =
          node
            .closest('[data-owner="user-profile-project-watch-button"]')
            ?.getBoundingClientRect() ?? null;
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          borderRadius: style.borderRadius,
          borderStyle: style.borderStyle,
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
          cursor: style.cursor,
          display: style.display,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          marginBottom: style.marginBottom,
          marginLeft: style.marginLeft,
          outlineStyle: style.outlineStyle,
          padding: style.padding,
          position: style.position,
          textAlign: style.textAlign,
          textDecoration: style.textDecorationLine,
          textShadow: style.textShadow,
          verticalAlign: style.verticalAlign,
          whiteSpace: style.whiteSpace,
          zIndex: style.zIndex,
          rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          row: { left: row.left, right: row.right, top: row.top, bottom: row.bottom },
          button: button
            ? { left: button.left, right: button.right, top: button.top, bottom: button.bottom }
            : null,
          rowOverflow: getComputedStyle(
            node.closest<HTMLElement>('[data-owner="user-profile-project-row"]')!,
          ).overflow,
        };
      };
      return {
        origin: css('[data-owner="user-profile-project-origin-link"]'),
        button: css('[data-owner="user-profile-project-watch-button"]'),
        icon: css('[data-owner="user-profile-project-watch-icon"]'),
        badge: css('[data-owner="user-profile-project-watch-badge"]'),
        rows: [
          ...document.querySelectorAll<HTMLElement>('[data-owner="user-profile-project-row"]'),
        ].map((row) => {
          const rect = row.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom };
        }),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(computed.origin).toMatchObject({
      color: "rgb(51, 51, 51)",
      outlineStyle: "none",
      textDecoration: "none",
    });
    expect(computed.button).toMatchObject({
      color: "rgb(51, 51, 51)",
      backgroundColor: "rgb(255, 255, 255)",
      borderRadius: "3px",
      borderStyle: "solid",
      borderWidth: "1px",
      cursor: "pointer",
      display: "inline-block",
      fontSize: "14px",
      lineHeight: "20px",
      marginBottom: "0px",
      marginLeft: "0px",
      outlineStyle: "none",
      padding: "4px 12px",
      position: "relative",
      textAlign: "center",
      textDecoration: "none",
      textShadow: "none",
      verticalAlign: "middle",
      whiteSpace: "nowrap",
      zIndex: "2",
    });
    expect(computed.button.borderColor).toBe("rgba(0, 0, 0, 0.15)");
    expect(computed.button.boxShadow).toContain("rgba(0, 0, 0, 0.05)");
    expect(computed.icon).toMatchObject({
      display: "inline-block",
      fontFamily: "yobicon",
      lineHeight: "20px",
      marginBottom: "3px",
      verticalAlign: "bottom",
    });
    expect(computed.badge).toMatchObject({
      borderRadius: "2px",
      fontSize: "13px",
      fontWeight: "700",
      marginLeft: "3px",
      padding: "2px 4px",
      textShadow: "none",
      verticalAlign: "top",
    });
    expect(computed.badge.fontFamily).toContain("-apple-system");
    expect(computed.overflow).toBe(0);
    expect(computed.rows).toHaveLength(2);
    expect(computed.rows[0].bottom).toBeLessThanOrEqual(computed.rows[1].top);
    expect(computed.button.rowOverflow).toBe("hidden");
    for (const item of [computed.origin, computed.button]) {
      expect(item.rect.left).toBeGreaterThanOrEqual(item.row.left);
      expect(Math.min(item.rect.right, item.row.right)).toBeLessThanOrEqual(item.row.right);
    }
    for (const item of [computed.icon, computed.badge]) {
      expect(item.button).not.toBeNull();
      expect(item.rect.left).toBeGreaterThanOrEqual(item.button!.left);
      expect(item.rect.right).toBeLessThanOrEqual(item.button!.right);
      expect(item.rect.top).toBeGreaterThanOrEqual(item.button!.top);
      expect(item.rect.bottom).toBeLessThanOrEqual(item.button!.bottom);
    }
    for (const item of [computed.origin, computed.button]) {
      expect(item.rect.left).toBeGreaterThanOrEqual(item.row.left);
      expect(item.rect.top).toBeGreaterThanOrEqual(item.row.top);
      expect(item.rect.bottom).toBeLessThanOrEqual(item.row.bottom);
    }

    const screenshotDirectory = new URL(
      "../output/playwright/style-user-profile-project-watch-control-classes/",
      import.meta.url,
    );
    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: new URL(
        width === 1366 ? "desktop-1366x900.png" : "mobile-390x844.png",
        screenshotDirectory,
      ).pathname,
    });

    // CSS :hover/:focus/:active computed-style assertions are CDP-only
    // synthesis (the harness dispatches mouse events but cannot force the
    // pseudo-class) — retired per the established ceiling; base-state paint
    // is pinned above.
  };

  await verifyViewport(1366, 900);
  await verifyViewport(390, 844);
});
