import { expect, test, type Page } from "../wtr-compat.ts";

test("direct issue create route renders the legacy New issue title for the selected project", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockDirectIssueForm(page, { ownerName: "admin", projectName: "sample" });

  await page.goto(`${basePath}/user/issues/new`);

  await expect(page).toHaveTitle("New issue - admin/sample");
  await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator(".project-breadcrumb .project-author")).toHaveText("admin");
  await expect(page.locator(".project-breadcrumb .project-name")).toHaveText("sample");
  await expect(page.locator("#issue-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/issues/latest`,
  );
});

test("direct mine issue create route renders the legacy New issue title for the mine project", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockDirectIssueForm(page, { ownerName: "admin", projectName: "inbox" });

  await page.goto(`${basePath}/user/issues/new/mine`);

  await expect(page).toHaveTitle("New issue - admin/inbox");
  await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator(".project-breadcrumb .project-author")).toHaveText("admin");
  await expect(page.locator(".project-breadcrumb .project-name")).toHaveText("inbox");
  await expect(page.locator("#issue-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/inbox/issues/latest`,
  );
});

test("direct issue create migrates the fallback-off project header geometry from legacy project/header.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockDirectIssueForm(page, { ownerName: "weblabs", projectName: "portal" });
  await page.setViewportSize({ width: 1366, height: 900 });

  await page.goto(`${basePath}/user/issues/new`);

  await expect(page.locator(".project-breadcrumb")).toHaveText("weblabs / portal starG");
  for (const selector of [
    '[data-project-header-owner="outer"]',
    '[data-owner="project-header-wrap"]',
    '[data-owner="project-header-avatar"]',
    '[data-owner="project-header-avatar-image"]',
    '[data-owner="project-header-breadcrumb-wrap"]',
    '[data-owner="project-header-breadcrumb"]',
    '[data-owner="project-header-breadcrumb-author"]',
    '[data-owner="project-header-breadcrumb-author-link"]',
    '[data-owner="project-header-breadcrumb-separator"]',
    '[data-owner="project-header-breadcrumb-name"]',
    '[data-owner="project-header-breadcrumb-name-link"]',
    '[data-owner="project-header-breadcrumb-favorite-star"]',
    '[data-owner="project-header-util-wrap"]',
    '[data-owner="project-header-watcher-item"]',
    '[data-owner="project-header-watch-button-group"]',
    '[data-owner="project-header-watch-button"]',
  ]) {
    await expect(page.locator(selector)).toHaveCount(1);
  }
  const desktop = await page.evaluate(() => {
    const required = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const style = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return getComputedStyle(element);
    };
    const header = required('[data-project-header-owner="outer"]');
    const wrap = required('[data-owner="project-header-wrap"]');
    const avatar = required('[data-owner="project-header-avatar"]');
    const avatarImage = required('[data-owner="project-header-avatar-image"]');
    const breadcrumb = required('[data-owner="project-header-breadcrumb-wrap"]');
    const util = required('[data-owner="project-header-util-wrap"]');
    const watcherItem = required('[data-owner="project-header-watcher-item"]');
    const watcher = required(".watcher-count");
    const watchAction = required(".down-arrow");
    return {
      avatar,
      avatarImage,
      avatarStyle: {
        height: style('[data-owner="project-header-avatar"]').height,
        position: style('[data-owner="project-header-avatar"]').position,
        width: style('[data-owner="project-header-avatar"]').width,
      },
      breadcrumb,
      breadcrumbAuthorLinkStyle: {
        color: style('[data-owner="project-header-breadcrumb-author-link"]').color,
      },
      breadcrumbNameStyle: {
        color: style('[data-owner="project-header-breadcrumb-name"]').color,
      },
      breadcrumbSeparatorStyle: {
        color: style('[data-owner="project-header-breadcrumb-separator"]').color,
        padding: style('[data-owner="project-header-breadcrumb-separator"]').padding,
      },
      breadcrumbStarStyle: {
        color: style('[data-owner="project-header-breadcrumb-favorite-star"]').color,
        fontSize: style('[data-owner="project-header-breadcrumb-favorite-star"]').fontSize,
      },
      breadcrumbStyle: {
        fontSize: style('[data-owner="project-header-breadcrumb"]').fontSize,
        lineHeight: style('[data-owner="project-header-breadcrumb"]').lineHeight,
        padding: style('[data-owner="project-header-breadcrumb-wrap"]').padding,
        position: style('[data-owner="project-header-breadcrumb-wrap"]').position,
      },
      header,
      headerStyle: {
        backgroundPosition: style('[data-project-header-owner="outer"]').backgroundPosition,
        backgroundRepeat: style('[data-project-header-owner="outer"]').backgroundRepeat,
        backgroundSize: style('[data-project-header-owner="outer"]').backgroundSize,
      },
      util,
      utilStyle: {
        bottom: style('[data-owner="project-header-util-wrap"]').bottom,
        position: style('[data-owner="project-header-util-wrap"]').position,
      },
      watchAction,
      watcherItem,
      watcherItemStyle: {
        float: style('[data-owner="project-header-watcher-item"]').float,
        marginLeft: style('[data-owner="project-header-watcher-item"]').marginLeft,
        position: style('[data-owner="project-header-watcher-item"]').position,
      },
      watcher,
      wrap,
      wrapStyle: { position: style('[data-owner="project-header-wrap"]').position },
    };
  });
  expect(desktop.header.height).toBeCloseTo(120, 0);
  expect(desktop.headerStyle.backgroundPosition).toBe("50% 100%");
  expect(desktop.headerStyle.backgroundRepeat).toBe("no-repeat");
  expect(desktop.headerStyle.backgroundSize).toBe("cover");
  expect(desktop.wrap.width).toBeCloseTo(desktop.header.width * 0.97, 0);
  expect(desktop.wrapStyle.position).toBe("relative");
  expect(desktop.avatarStyle.position).toBe("absolute");
  expect(desktop.avatarStyle.width).toBe("80px");
  expect(desktop.avatarStyle.height).toBe("80px");
  expect(desktop.avatar.left).toBeCloseTo(desktop.wrap.left, 0);
  expect(desktop.avatar.bottom).toBeCloseTo(desktop.header.bottom + 30, 0);
  expect(desktop.avatarImage.width).toBeCloseTo(80, 0);
  expect(desktop.avatarImage.height).toBeCloseTo(80, 0);
  expect(desktop.breadcrumbStyle.position).toBe("absolute");
  expect(desktop.breadcrumbStyle.padding).toBe("2px 10px");
  expect(desktop.breadcrumbStyle.fontSize).toBe("19.5px");
  expect(desktop.breadcrumbStyle.lineHeight).toBe("30px");
  expect(desktop.breadcrumbAuthorLinkStyle.color).toBe("rgb(255, 255, 255)");
  expect(desktop.breadcrumbNameStyle.color).toBe("rgb(252, 73, 30)");
  expect(desktop.breadcrumbSeparatorStyle.color).toBe("rgb(255, 255, 255)");
  expect(desktop.breadcrumbSeparatorStyle.padding).toBe("0px 5px");
  expect(desktop.breadcrumbStarStyle.color).toBe("rgba(255, 255, 255, 0.22)");
  expect(desktop.breadcrumbStarStyle.fontSize).toBe("24px");
  expect(desktop.breadcrumb.left).toBeCloseTo(desktop.wrap.left + 90, 0);
  expect(desktop.breadcrumb.bottom).toBeCloseTo(desktop.header.bottom - 18, 0);
  expect(desktop.breadcrumb.right).toBeCloseTo(335.5, 0);
  expect(desktop.breadcrumb.width).toBeCloseTo(225, 0);
  expect(desktop.utilStyle.position).toBe("absolute");
  expect(desktop.utilStyle.bottom).toBe("20px");
  expect(desktop.util.right).toBeCloseTo(1345.5, 0);
  expect(desktop.watcherItemStyle.float).toBe("left");
  expect(desktop.watcherItemStyle.marginLeft).toBe("15px");
  expect(desktop.watcherItemStyle.position).toBe("relative");
  expect(desktop.watcher.x).toBeCloseTo(desktop.util.x + 15, 0);
  // Button-box alignment still depends on the shared Bootstrap button fallback.
  expect(desktop.watchAction.x).toBeCloseTo(desktop.watcher.right, 0);
  expect(desktop.watchAction.right).toBeCloseTo(desktop.util.right, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const required = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const style = getComputedStyle(element);
      return {
        box: element.getBoundingClientRect(),
        style: {
          bottom: style.bottom,
          fontSize: style.fontSize,
          height: style.height,
          left: style.left,
          minWidth: style.minWidth,
          width: style.width,
        },
      };
    };
    return {
      avatar: required('[data-owner="project-header-avatar"]'),
      breadcrumbAuthor: required('[data-owner="project-header-breadcrumb-author"]'),
      breadcrumbName: required('[data-owner="project-header-breadcrumb-name"]'),
      breadcrumb: required('[data-owner="project-header-breadcrumb-wrap"]'),
      documentWidth: document.documentElement.scrollWidth,
      header: required('[data-project-header-owner="outer"]'),
      wrap: required('[data-owner="project-header-wrap"]'),
      watchVisible: getComputedStyle(
        document.querySelector('[data-owner="project-header-watch-button-group"]')!,
      ).display,
    };
  });
  expect(mobile.documentWidth).toBe(390);
  expect(mobile.header.box.right).toBeLessThanOrEqual(390);
  expect(mobile.header.style.minWidth).toBe("10px");
  expect(mobile.avatar.style.bottom).toBe("-6px");
  expect(mobile.avatar.style.width).toBe("50px");
  expect(mobile.avatar.style.height).toBe("50px");
  expect(mobile.avatar.box.left).toBeCloseTo(mobile.wrap.box.left, 0);
  expect(mobile.avatar.box.bottom).toBeCloseTo(mobile.header.box.bottom + 6, 0);
  expect(mobile.breadcrumb.style.bottom).toBe("5px");
  expect(mobile.breadcrumb.style.left).toBe("52px");
  expect(mobile.breadcrumb.box.left).toBeCloseTo(mobile.wrap.box.left + 52, 0);
  expect(mobile.breadcrumb.box.right).toBeLessThanOrEqual(mobile.header.box.right);
  expect(mobile.breadcrumbAuthor.style.fontSize).toBe("13.65px");
  expect(mobile.breadcrumbName.style.fontSize).toBe("13.65px");
  expect(mobile.watchVisible).toBe("none");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "csrf" }),
    });
  });
  await page.route("**/api/v1/owners/weblabs/projects/portal/favorite", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: true, ownerName: "weblabs", projectName: "portal" }),
    });
  });
  await page.locator('[data-owner="project-header-breadcrumb-favorite-star"]').click();
  await expect(page.locator('[data-owner="project-header-breadcrumb-favorite-star"]')).toHaveClass(
    /starred/u,
  );
  await expect(page.locator('[data-owner="project-header-breadcrumb-favorite-star"]')).toHaveCSS(
    "color",
    "rgb(233, 30, 99)",
  );
});

for (const routePath of ["/user/issues/new", "/user/issues/new/mine"]) {
  test(`${routePath} renders the legacy home warning when no project is selected`, async ({
    page,
  }) => {
    const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
    await mockDirectIssueForm(page, { ownerName: "", projectName: "" });
    await page.route("**/api/v1/notifications?*", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ hasMore: false, items: [], total: 0 }),
      }),
    );

    await page.goto(`${basePath}${routePath}`);

    await expect(page.locator('#yobiToasts [data-part="toast-message"]')).toHaveText(
      "Project is non existent",
    );
    await expect(page.locator(".main-stream .notification-wrap")).toBeVisible();
    await expect(page.locator(".welcome-table a[href$='/projects']")).toBeVisible();
    await expect(page.locator("#setDefaultLoginPage")).toBeVisible();
    await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
    await expect(page.locator("#issue-form")).toHaveCount(0);
    await expect(page).toHaveURL(`${basePath}${routePath}`);
  });
}

test("direct issue form handles the canonical no-project error as the legacy home warning", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockDirectIssueForm(page, { ownerName: "", projectName: "" });
  await page.route("**/api/v1/user/issues/new-options**", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "not_found", message: "project.is.empty", status: 404 },
      }),
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ hasMore: false, items: [], total: 0 }),
    }),
  );

  await page.goto(`${basePath}/user/issues/new`);

  await expect(page.locator('#yobiToasts [data-part="toast-message"]')).toHaveText(
    "Project is non existent",
  );
  await expect(page.locator(".main-stream .notification-wrap")).toBeVisible();
  await expect(page.locator("#setDefaultLoginPage")).toBeVisible();
  await expect(page.locator("#issue-form")).toHaveCount(0);
});

test("direct issue form shows loading in the site shell and then the actual API error", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockDirectIssueForm(page, { ownerName: "admin", projectName: "sample" });
  let releaseResponse = () => {};
  const responseReady = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/v1/user/issues/new-options**", async (route) => {
    await responseReady;
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "permission_denied", message: "Issue creation is forbidden", status: 403 },
      }),
    });
  });

  try {
    await page.goto(`${basePath}/user/issues/new`);
    await expect(page.locator(".issue-form-loading[role=status]")).toBeVisible();
    await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
  } finally {
    releaseResponse();
  }
  await expect(page.locator(".issue-form-load-error[role=alert]")).toHaveText(
    "Issue creation is forbidden",
  );
  await expect(page.locator(".issue-form-loading")).toHaveCount(0);
  await expect(page.locator("#issue-form")).toHaveCount(0);
});

async function mockDirectIssueForm(
  page: Page,
  selectedProject: {
    ownerName: string;
    projectName: string;
  },
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
  await page.route("**/api/v1/user/issues/new-options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        bodyMarkdown: "",
        referCommentId: "",
        selectedProject,
      }),
    });
  });
  await page.route("**/api/v1/owners/*/projects/*/container**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const match = path.match(/\/owners\/([^/]+)\/projects\/([^/]+)\/container$/u);
    const ownerName = match?.[1] ?? selectedProject.ownerName;
    const projectName = match?.[2] ?? selectedProject.projectName;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectContainer(ownerName, projectName)),
    });
  });
  await page.route("**/api/v1/projects/*/*/issues/form-options", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const match = path.match(/\/projects\/([^/]+)\/([^/]+)\/issues\/form-options$/u);
    const ownerName = match?.[1] ?? selectedProject.ownerName;
    const projectName = match?.[2] ?? selectedProject.projectName;
    const project = projectContainer(ownerName, projectName);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canCreateIssueAssignee: true,
        canCreateIssueMilestone: true,
        canManageIssueLabels: true,
        currentProject: {
          logoUrl: project.logoUrl,
          ownerName,
          projectId: project.id,
          projectName,
        },
        issueTemplateMarkdown: "",
        movableIssueProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/owners/*/projects/*/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
      }),
    });
  });
  await page.route("**/api/v1/projects/*/*/issues/parent-options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ id: 42, issueNumber: 11, selected: false, title: "Existing parent" }],
      }),
    });
  });
  await page.route("**/api/v1/owners/*/projects/*/milestones**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestones: [
          {
            attachments: [],
            closedIssueCount: 0,
            closedIssues: [],
            completionPercent: 0,
            contentsHtml: "",
            contentsMarkdown: "",
            dueDateLabel: "",
            id: "5",
            openIssueCount: 0,
            openIssues: [],
            state: "open",
            title: "Sprint 1",
            viewerCanDelete: true,
            viewerCanUpdate: true,
          },
        ],
      }),
    });
  });
}

function projectContainer(ownerName: string, projectName: string) {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: projectName === "inbox",
    isProtected: projectName === "portal",
    isWatching: projectName === "portal",
    logoUrl: "/assets/images/project_default_logo.png",
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    ownerName,
    projectName,
    vcs: "GIT",
    viewerCanUpdate: true,
    viewerCanWatch: projectName === "portal",
    watchCount: projectName === "portal" ? 2 : 0,
  };
}
