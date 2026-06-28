import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type SessionState = {
  isAnonymous?: boolean;
  isSiteAdmin?: boolean;
  loginId?: string;
  userLabel?: string;
};

type WorkspaceState = {
  favoriteProjects?: Array<{ ownerName: string; projectName: string }>;
  isGuest?: boolean;
  memberProjects?: Array<{ ownerName: string; projectName: string }>;
  recentProjects?: Array<{ ownerName: string; projectName: string }>;
};

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

async function expectNoVisibleRawLegacyKeys(page: Page): Promise<void> {
  const bodyText = await page.locator("body").innerText();
  const rawKeys =
    bodyText.match(
      /\b(?:app|button|error|issue|menu|notification|search|site|title|user|validation)\.[A-Za-z0-9_.-]+/g,
    ) ?? [];
  expect(rawKeys, `visible raw legacy message keys in:\n${bodyText}`).toEqual([]);
}

async function expectNoDormantDebugFragment(page: Page): Promise<void> {
  await expect(page.locator("body")).not.toContainText(/^lang =/m);
  await expect(page.locator("body > .container", { hasText: /^lang =/ })).toHaveCount(0);
}

async function installRuntimeConfig(
  page: Page,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await page.addInitScript((runtimeOverrides) => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
      ...runtimeOverrides,
    };
  }, overrides);
}

async function installCommonApiMocks(
  page: Page,
  {
    session = {},
    workspace = {},
  }: {
    session?: SessionState;
    workspace?: WorkspaceState;
  } = {},
): Promise<void> {
  const isAnonymous = session.isAnonymous ?? false;
  const loginId = session.loginId ?? (isAnonymous ? "" : "admin");
  const userLabel = session.userLabel ?? (isAnonymous ? "" : "Administrator");

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: null,
        user: null,
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: isAnonymous ? "" : "1",
        defaultLandingPath: isAnonymous ? "/" : "/me",
        emailAddress: isAnonymous ? "" : `${loginId}@example.com`,
        isAnonymous,
        isConfirmed: !isAnonymous,
        isSiteAdmin: session.isSiteAdmin ?? false,
        loginId,
        userLabel,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultAdminContact: "moc.elpmaxe@nimda",
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "api-token",
        daysAgo: 14,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: workspace.favoriteProjects ?? [
          { ownerName: "admin", projectName: "sample" },
        ],
        issueItems: [
          {
            assigneeLabel: "Administrator",
            authorLabel: "Administrator",
            commentCount: 0,
            issueNumber: 7,
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "Recent issue",
            updatedLabel: "2026-06-26",
          },
        ],
        memberProjects: (
          workspace.memberProjects ?? [{ ownerName: "admin", projectName: "sample" }]
        ).map((project) => ({
          createdLabel: "2026-06-26",
          lastPushedLabel: "2026-06-26",
          memberCount: 1,
          overview: "Sample project",
          projectScope: "public",
          watchCount: 1,
          ...project,
        })),
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: userLabel || loginId,
          englishName: "",
          isBlocked: false,
          isGuest: workspace.isGuest ?? false,
          isSiteAdmin: session.isSiteAdmin ?? false,
          loginId,
          primaryEmailAddress: isAnonymous ? "" : `${loginId}@example.com`,
          sinceLabel: "2026-06-26",
        },
        pullRequestItems: [],
        recentProjects: workspace.recentProjects ?? [{ ownerName: "admin", projectName: "sample" }],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
}

test("anonymous root shell keeps legacy nav, feedback, login dialog, and login error state", async ({
  page,
}) => {
  await installRuntimeConfig(page, { feedbackUrl: "https://feedback.example.test" });
  await installCommonApiMocks(page, { session: { isAnonymous: true } });
  let submittedBody: Record<string, unknown> | null = null;
  await page.route(apiV1Route("/auth/sign-in"), async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({ message: "user.login.failed.client" }),
      headers: restJsonHeaders,
      status: 401,
    });
  });

  await page.goto("/yona/");
  await expectNoVisibleRawLegacyKeys(page);
  await expectNoDormantDebugFragment(page);

  await expect(page.locator(".gnb-outer .gnb-inner")).toBeVisible();
  await expect(page.locator('a.logo.logo-letter[href="/yona"]')).toBeVisible();
  await expect(page.locator('form[name="gnb-search-form"] input[name="keyword"]')).toBeVisible();
  await expect(page.locator('a[href="/yona/projects"]')).toBeVisible();
  await expect(page.locator('a[href="https://feedback.example.test"]')).toBeVisible();
  await expect(page.locator("#required-logged-in a[data-login='required']")).toBeVisible();
  await expect(
    page.locator(".gnb-usermenu a.ybtn.ybtn-success[href='/yona/users/signupform']"),
  ).toBeVisible();
  await expect(page.locator("#mySidenav")).toHaveCount(0);
  await expect(page.locator(".page-footer-outer .page-footer")).toBeVisible();
  await expect(page.locator("#loginDialog.modal.hide")).toHaveCount(1);
  await expect(page.locator(".siteintro-bg.row")).toBeVisible();
  await expect(page.locator(".site-heading")).toHaveText(
    "21st Century Software Development Platform",
  );
  await expect(page.locator(".site-features > li")).toHaveText([
    "Just focus on what you have to do",
  ]);
  await expect(page.locator(".signup-btn .ybtn.ybtn-success.ybtn-padding")).toHaveText(
    "Sign up for Yona",
  );
  await expect(page.locator(".feature .feature-wrap > li")).toHaveCount(6);
  await expect(page.locator(".feature .feature-title")).toHaveText([
    "Project / Organization",
    "Code management",
    "Issue tracker",
    "Private repositories",
    "Code review",
    "Team play",
  ]);

  const nav = await layoutBox(page, ".gnb-outer");
  const navInner = await layoutBox(page, ".gnb-outer .gnb-inner");
  const pin = await layoutBox(page, ".gnb-outer .pin");
  const logo = await layoutBox(page, "a.logo.logo-letter");
  const navList = await layoutBox(page, ".gnb-nav");
  const searchForm = await layoutBox(page, 'form[name="gnb-search-form"]');
  const userMenu = await layoutBox(page, ".gnb-usermenu");
  const loginLink = await layoutBox(page, "#required-logged-in");
  const signupButton = await layoutBox(page, ".gnb-usermenu a.ybtn.ybtn-success");
  const appShell = await layoutBox(page, "main.app-shell");
  const siteIntroBg = await layoutBox(page, ".siteintro-bg.row");
  const siteIntro = await layoutBox(page, ".siteintro");
  const siteIntroCover = await layoutBox(page, ".siteintro-cover");
  const siteIntroWrap = await layoutBox(page, ".siteintro-wrap");
  const siteHeading = await layoutBox(page, ".site-heading");
  const siteFeature = await layoutBox(page, ".site-features > li");
  const introSignupWrap = await layoutBox(page, ".siteintro .signup-btn");
  const introSignupButton = await layoutBox(page, ".siteintro .signup-btn .ybtn");
  const feature = await layoutBox(page, ".feature");
  const featureHeading = await layoutBox(page, ".feature > h2");
  const featureWrap = await layoutBox(page, ".feature .feature-wrap");
  const firstFeature = await layoutBox(page, ".feature .feature-wrap > li:first-child");
  const firstFeatureIcon = await layoutBox(
    page,
    ".feature .feature-wrap > li:first-child .feature-image",
  );
  const firstFeatureInfo = await layoutBox(
    page,
    ".feature .feature-wrap > li:first-child .feature-info",
  );
  const firstFeatureTitle = await layoutBox(
    page,
    ".feature .feature-wrap > li:first-child .feature-title",
  );
  const secondFeature = await layoutBox(page, ".feature .feature-wrap > li:nth-child(2)");
  const fourthFeature = await layoutBox(page, ".feature .feature-wrap > li:nth-child(4)");
  const footerOuter = await layoutBox(page, ".page-footer-outer");
  const footerInner = await layoutBox(page, ".page-footer-outer .page-footer");

  expect(Math.round(nav.height)).toBe(40);
  expect(navInner.y).toBeGreaterThanOrEqual(nav.y);
  expect(navInner.height).toBeLessThanOrEqual(nav.height);
  expect(pin.x).toBeLessThan(navInner.x);
  expect(pin.y).toBeGreaterThanOrEqual(navInner.y);
  expect(pin.y + pin.height).toBeLessThanOrEqual(navInner.y + navInner.height);
  expect(logo.x).toBeGreaterThan(pin.x + pin.width - 1);
  expect(navList.y).toBeCloseTo(navInner.y, 0);
  expect(searchForm.x).toBeGreaterThan(logo.x + logo.width - 1);
  expect(userMenu.x).toBeGreaterThan(searchForm.x + searchForm.width - 1);
  expect(userMenu.y).toBeCloseTo(navInner.y, 0);
  expect(loginLink.x).toBeGreaterThanOrEqual(userMenu.x);
  expect(signupButton.x).toBeGreaterThan(loginLink.x + loginLink.width - 1);
  expect(appShell.y).toBeGreaterThanOrEqual(nav.y + nav.height - 1);
  expect(siteIntroBg.x).toBeCloseTo(0, 0);
  expect(siteIntroBg.width).toBeGreaterThanOrEqual(1280);
  expect(siteIntro.y).toBeCloseTo(appShell.y, 0);
  expect(siteIntro.width).toBeCloseTo(siteIntroBg.width, 0);
  await expect(page.locator(".siteintro")).toHaveCSS(
    "background-image",
    /photo-svetacreative\.jpg/u,
  );
  expect(Math.round(siteIntroCover.width)).toBe(750);
  expect(Math.abs(siteIntroCover.x + siteIntroCover.width / 2 - 640)).toBeLessThanOrEqual(1);
  expect(siteIntroWrap.x).toBeGreaterThanOrEqual(siteIntroCover.x);
  expect(siteHeading.y).toBeGreaterThanOrEqual(siteIntroCover.y + 55);
  expect(siteHeading.width).toBeCloseTo(siteIntroCover.width, 0);
  expect(siteFeature.y).toBeGreaterThan(siteHeading.y + siteHeading.height - 1);
  expect(Math.abs(siteFeature.x + siteFeature.width / 2 - 640)).toBeLessThanOrEqual(3);
  await expect(page.locator(".site-features > li")).toHaveCSS("letter-spacing", "1.1px");
  expect(introSignupWrap.y).toBeGreaterThan(siteFeature.y + siteFeature.height + 30);
  expect(Math.abs(introSignupButton.x + introSignupButton.width / 2 - 640)).toBeLessThanOrEqual(2);
  expect(feature.y).toBeGreaterThanOrEqual(siteIntro.y + siteIntro.height - 1);
  expect(feature.width).toBeLessThanOrEqual(1240);
  expect(featureHeading.y).toBeGreaterThanOrEqual(feature.y);
  expect(Math.abs(featureHeading.x + featureHeading.width / 2 - 640)).toBeLessThanOrEqual(2);
  expect(featureWrap.y).toBeGreaterThan(featureHeading.y + featureHeading.height - 1);
  expect(Math.round(firstFeature.width)).toBe(330);
  expect(secondFeature.x).toBeGreaterThan(firstFeature.x + firstFeature.width + 35);
  expect(fourthFeature.y).toBeGreaterThan(firstFeature.y + firstFeature.height - 1);
  expect(firstFeatureIcon.x).toBeCloseTo(firstFeature.x, 0);
  expect(firstFeatureInfo.x).toBeCloseTo(firstFeature.x + 55, 0);
  expect(firstFeatureTitle.x).toBeCloseTo(firstFeatureInfo.x, 0);
  expect(footerOuter.y).toBeGreaterThan(nav.y + nav.height);
  expect(footerOuter.y).toBeGreaterThan(feature.y + feature.height - 1);
  expect(footerInner.x).toBeCloseTo(0, 0);
  expect(footerInner.width).toBeGreaterThanOrEqual(navInner.width);

  await page.locator("#required-logged-in a[data-login='required']").click();
  await expect(page.locator("#loginDialog.modal.loginDialog")).toBeVisible();
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator("#loginDialog")).toHaveCSS("position", "fixed");
  await expect(page.locator("#loginDialog")).toHaveCSS("width", "460px");
  const dialog = await layoutBox(page, "#loginDialog.modal.loginDialog");
  const dialogBody = await layoutBox(page, "#loginDialog .modal-body");
  const dialogClose = await layoutBox(page, "#loginDialog button.close");
  const dialogForm = await layoutBox(page, "#loginDialog form.login-form-wrap");
  const dialogId = await layoutBox(page, "#loginIdOrEmailD");
  const dialogPassword = await layoutBox(page, "#passwordD");
  const dialogSubmit = await layoutBox(page, "#loginDialog button[type='submit']");
  const dialogRemember = await layoutBox(page, "#remember-meD");
  const dialogLinks = await layoutBox(page, "#loginDialog .act-row");

  expect(Math.round(dialog.width)).toBeGreaterThanOrEqual(460);
  expect(Math.round(dialog.width)).toBeLessThanOrEqual(462);
  expect(Math.abs(dialog.x + dialog.width / 2 - 640)).toBeLessThanOrEqual(2);
  expect(dialogBody.x).toBeGreaterThanOrEqual(dialog.x);
  expect(dialogClose.x).toBeGreaterThan(dialogBody.x + dialogBody.width - 80);
  expect(dialogForm.y).toBeGreaterThanOrEqual(dialogBody.y);
  expect(dialogId.x).toBeCloseTo(dialogPassword.x, 0);
  expect(dialogId.width).toBeCloseTo(dialogPassword.width, 0);
  expect(dialogPassword.y).toBeGreaterThan(dialogId.y);
  expect(dialogSubmit.y).toBeGreaterThan(dialogPassword.y + dialogPassword.height - 1);
  expect(dialogRemember.y).toBeGreaterThan(dialogSubmit.y + dialogSubmit.height - 1);
  expect(dialogRemember.y).toBeGreaterThanOrEqual(dialogLinks.y);
  await expect(page.locator("#remember-meD")).toBeChecked();
  await page.locator("#loginDialog input[name='loginIdOrEmail']").fill("admin");
  await page.locator("#loginDialog input[name='password']").fill("wrong-password");
  await page.locator("#remember-meD").uncheck();
  await page.locator("#loginDialog button[type='submit']").click();
  await expect(page.locator("#loginDialog .error .error-message")).toContainText(
    "Failed to log in. The request is invalid.",
  );
  expect(submittedBody).toMatchObject({
    identifier: "admin",
    password: "wrong-password",
    rememberMe: false,
  });
  await expectNoVisibleRawLegacyKeys(page);
  await page.locator("#loginDialog button.close").click();
  await expect(page.locator("#loginDialog.modal.hide.loginDialog")).toHaveCount(1);
});

test("anonymous root shell keeps the legacy login dialog usable on a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await installRuntimeConfig(page, { feedbackUrl: "https://feedback.example.test" });
  await installCommonApiMocks(page, { session: { isAnonymous: true } });

  await page.goto("/yona/");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page.locator(".gnb-outer .gnb-inner")).toBeVisible();
  await expect(page.locator("#required-logged-in a[data-login='required']")).toBeVisible();
  await page.locator("#required-logged-in a[data-login='required']").click();
  await expect(page.locator("#loginDialog.modal.loginDialog")).toBeVisible();
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator("#loginDialog")).toHaveCSS("position", "fixed");
  await expect(page.locator("#loginDialog")).toHaveCSS("width", "390px");
  await expect(page.locator("#loginDialog input[name='loginIdOrEmail']")).toBeVisible();
  await expect(page.locator("#loginDialog input[name='password']")).toBeVisible();
});

test("authenticated site admin shell renders user menu, sidebar tabs, create menu, and admin affix", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await installCommonApiMocks(page, {
    session: { isSiteAdmin: true, loginId: "admin", userLabel: "Administrator" },
  });

  await page.goto("/yona/me");
  await expectNoVisibleRawLegacyKeys(page);
  await expectNoDormantDebugFragment(page);

  await expect(page.locator(".admin-logged-in-affix")).toBeVisible();
  await expect(page.locator(".gnb-usermenu a[href='/yona/user/issues']")).toBeVisible();
  await expect(page.locator(".usermenu-icon-button[href='/yona/sites/userList']")).toBeVisible();
  await expect(page.locator("#sidebar-open-btn a[href='#mySidenav']")).toBeVisible();
  await expect(page.locator("#mySidenav")).toHaveCount(1);
  await expect(page.locator("#mySidenav")).toHaveCSS("width", "0px");
  await page.locator("#sidebar-open-btn a[href='#mySidenav']").click();
  await expect(page.locator("#mySidenav")).toHaveCSS("width", "360px");
  await page.locator(".admin-logged-in-affix").click();
  await expect(page.locator("#mySidenav")).toHaveCSS("width", "0px");
  await page.keyboard.press("f");
  await expect(page.locator("#mySidenav")).toHaveCSS("width", "360px");
  const sidebar = await layoutBox(page, "#mySidenav");
  const sidebarContent = await layoutBox(page, "#mySidenav .right-menu");
  const sidebarUserMenu = await layoutBox(page, "#mySidenav .user-menu-wrap");
  const sidebarTabs = await layoutBox(page, "#mySidenav .nav.nav-tabs");
  const sidebarTabContent = await layoutBox(page, "#usermenu-tab-content-list");
  const orgPane = await layoutBox(page, "#myOrganizationList");
  await page.locator('#mySidenav .nav.nav-tabs a[href="#myProjectList"]').click();
  const projectPane = await layoutBox(page, "#myProjectList");
  await page.locator('#mySidenav .nav.nav-tabs a[href="#myRecentIssueList"]').click();
  const recentPane = await layoutBox(page, "#myRecentIssueList");

  expect(Math.round(sidebar.width)).toBeGreaterThanOrEqual(360);
  expect(Math.round(sidebar.width)).toBeLessThanOrEqual(362);
  expect(sidebar.x + sidebar.width).toBeCloseTo(1280, 0);
  expect(sidebarContent.x).toBeGreaterThanOrEqual(sidebar.x);
  expect(sidebarContent.width).toBeLessThanOrEqual(sidebar.width);
  expect(sidebarUserMenu.y).toBeGreaterThanOrEqual(sidebar.y);
  expect(sidebarTabs.y).toBeGreaterThan(sidebarUserMenu.y + sidebarUserMenu.height - 1);
  expect(sidebarTabContent.y).toBeGreaterThan(sidebarTabs.y + sidebarTabs.height - 1);
  expect(orgPane.x).toBeCloseTo(sidebarTabContent.x, 0);
  expect(projectPane.x).toBeCloseTo(sidebarTabContent.x, 0);
  expect(recentPane.x).toBeCloseTo(sidebarTabContent.x, 0);
  await page.locator(".admin-logged-in-affix").click();
  await expect(page.locator("#mySidenav")).toHaveCSS("width", "0px");
  await expect(page.locator("#mySidenav .user-menu a[href='/yona/admin']")).toContainText(
    "Profile",
  );
  await expect(page.locator("#mySidenav .user-menu a[href='/yona/user/editform']")).toContainText(
    "Account",
  );
  await expect(page.locator("#myOrganizationList")).toContainText("sample");
  await expect(page.locator("#myProjectList")).toContainText("sample");
  await expect(page.locator("#myRecentIssueList")).toContainText("Recent issue");
  await expect(page.locator("#gnb-create-menu")).not.toBeVisible();
  await page.locator(".dropdwon-box-btn[href='#gnb-create-menu']").click();
  await expect(page.locator("#gnb-create-menu a[href='/yona/user/issues/new']")).toBeVisible();
  await expect(page.locator("#gnb-create-menu a[href='/yona/projects/new']")).toBeVisible();
  await expect(page.locator("#gnb-create-menu a[href='/yona/organizations/new']")).toBeVisible();
});

test("guest root shell hides project listing and organization creation like legacy navbar", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await installCommonApiMocks(page, {
    session: { loginId: "guest", userLabel: "Guest" },
    workspace: { isGuest: true },
  });

  await page.goto("/yona/me");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page.locator('a[href="/yona/projects"]')).toHaveCount(0);
  await expect(page.locator("#gnb-create-menu")).not.toBeVisible();
  await page.locator(".dropdwon-box-btn[href='#gnb-create-menu']").click();
  await expect(page.locator("#gnb-create-menu a[href='/yona/projects/new']")).toBeVisible();
  await expect(page.locator("#gnb-create-menu a[href='/yona/organizations/new']")).toHaveCount(0);
  await expect(page.locator(".gnb-usermenu a[href='/yona/user/issues']")).toBeVisible();
});

test("standalone legacy pages suppress root chrome", async ({ page }) => {
  await installRuntimeConfig(page);
  await installCommonApiMocks(page, { session: { isAnonymous: true } });

  await page.goto("/yona/secret");
  await expectNoVisibleRawLegacyKeys(page);
  await expectNoDormantDebugFragment(page);

  await expect(page).toHaveTitle("Tada! Welcome to Yona!");
  await expect(page.locator(".gnb-outer")).toHaveCount(0);
  await expect(page.locator("#mySidenav")).toHaveCount(0);
  await expect(page.locator(".page-footer-outer")).toHaveCount(1);
  await expect(page.locator(".secret-page .page-footer-outer")).toContainText("Powered by");
  await expect(page.locator(".page-footer-outer")).not.toContainText("Copyright");

  await page.goto("/yona/restart");
  await expectNoVisibleRawLegacyKeys(page);
  await expectNoDormantDebugFragment(page);
  await expect(page.locator(".gnb-outer")).toHaveCount(0);
  await expect(page.locator("#mySidenav")).toHaveCount(0);
  await expect(page.locator(".secret-page .secret-wrap.restart")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toHaveCount(1);
  await expect(page.locator(".secret-page .page-footer-outer")).toContainText("Powered by");
  await expect(page.locator(".page-footer-outer")).not.toContainText("Copyright");

  await page.goto("/yona/_UIKit");
  await expectNoVisibleRawLegacyKeys(page);
  await expectNoDormantDebugFragment(page);
  await expect(page.locator("#mySidenav")).toHaveCount(0);
  await expect(page.locator("header.gnb-outer")).toHaveCount(1);
  await expect(page.locator("header.gnb-outer .subtitle")).toHaveText("Yobi UI");
  await expect(page.locator(".page-wrap-outer")).toContainText("Buttons");
  await expect(page.locator(".page-footer-outer")).toContainText("NAVER Corp.");

  const uiHeader = await layoutBox(page, "header.gnb-outer");
  const subtitle = await layoutBox(page, "header.gnb-outer .subtitle");
  const uiPageOuter = await layoutBox(page, ".page-wrap-outer");
  const uiPage = await layoutBox(page, ".container.page-wrap > .page");
  const firstHeading = await layoutBox(page, ".container.page-wrap > .page h3:first-child");
  const firstButton = await layoutBox(page, ".container.page-wrap > .page .ybtn:first-of-type");
  const uploadButton = await layoutBox(page, ".fake-file-wrap");
  const firstDropdown = await layoutBox(page, ".btn-group[data-name='assigneeId']");
  const searchForm = await layoutBox(page, ".form-search");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(Math.round(uiHeader.height)).toBe(40);
  expect(subtitle.y).toBeGreaterThanOrEqual(uiHeader.y);
  expect(Math.round(subtitle.height)).toBeGreaterThanOrEqual(24);
  expect(
    Math.abs(subtitle.x + subtitle.width / 2 - (uiHeader.x + uiHeader.width / 2)),
  ).toBeLessThanOrEqual(2);
  expect(uiPageOuter.y).toBeGreaterThanOrEqual(uiHeader.y + uiHeader.height - 1);
  expect(uiPage.width).toBeGreaterThanOrEqual(900);
  expect(firstHeading.y).toBeGreaterThanOrEqual(uiPage.y);
  expect(firstButton.y).toBeGreaterThan(firstHeading.y + firstHeading.height - 1);
  expect(uploadButton.y).toBeGreaterThan(firstButton.y);
  expect(firstDropdown.y).toBeGreaterThan(uploadButton.y);
  expect(searchForm.y).toBeGreaterThan(firstDropdown.y);
  expect(footer.y).toBeGreaterThan(uiPage.y + uiPage.height - 1);
});

test("project route search scope exposes project, group, and global actions from browser DOM", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await installCommonApiMocks(page, {
    session: { loginId: "admin", userLabel: "Administrator" },
  });
  await page.route(apiV1Route("/owners/org/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        canDelete: false,
        canFork: true,
        canLeave: false,
        canUpdate: true,
        canWatch: true,
        cloneUrl: "https://example.test/org/projectYobi.git",
        codeMemberOnly: false,
        currentMilestone: null,
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          pullRequests: [],
        },
        defaultBranch: "main",
        defaultTab: "home",
        enrollmentRequested: false,
        history: { items: [] },
        isFavorited: false,
        isForked: false,
        isWatching: false,
        logoUrl: "",
        memberCount: 1,
        members: [],
        menuCounters: {},
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "org",
        originOwnerName: "",
        originProjectName: "",
        overview: "Project overview",
        overviewEditable: true,
        ownerName: "org",
        projectName: "projectYobi",
        projectScope: "public",
        readmeFile: null,
        reviewCount: 0,
        showAdmin: true,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        viewerCanEnroll: false,
        viewerCanUpdate: true,
        watchCount: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/org/projectYobi");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page.locator(".gnb-outer.project-header")).toBeVisible();
  await expect(page.locator("#gnb-search-scope-title")).toContainText("Project");
  await expect(
    page.locator("a[data-toggle='search-scope'][data-action='/yona/org/projectYobi/search']"),
  ).toContainText("Project");
  await expect(
    page.locator("a[data-toggle='search-scope'][data-action='/yona/organizations/org/search']"),
  ).toContainText("Group");
  await expect(
    page.locator("a[data-toggle='search-scope'][data-action='/yona/search']"),
  ).toContainText("All");
});
