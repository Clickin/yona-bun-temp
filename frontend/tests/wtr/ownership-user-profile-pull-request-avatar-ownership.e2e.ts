import { readFile, readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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
        selected: "pullRequests",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Admin User",
          englishName: "Admin",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "admin",
          primaryEmailAddress: null,
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [
          {
            ownerName: "admin",
            projectName: "sample",
            pullRequestNumber: 12,
            title: "Conflict pull request",
            state: "open",
            conflict: true,
            projectLogoUrl: "/assets/images/project-avatar.png",
            contributorLoginId: "contributor",
            contributorLabel: "Contributor User",
            updatedLabel: "2 days ago",
            commentCount: 3,
            receiverLoginId: "receiver",
            receiverLabel: "Receiver User",
            receiverAvatarUrl: "/assets/images/receiver-avatar.png",
          },
          {
            ownerName: "admin",
            projectName: "sample",
            pullRequestNumber: 13,
            title: "Open pull request",
            state: "open",
            conflict: false,
            projectLogoUrl: "/assets/images/project-avatar.png",
            contributorLoginId: "",
            contributorLabel: "",
            updatedLabel: "Yesterday",
            commentCount: 0,
            receiverLoginId: "",
            receiverLabel: "",
          },
        ],
      },
    }),
  );
  await page.route("**/assets/images/project-avatar.png", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" />',
    }),
  );
  await page.route("**/assets/images/receiver-avatar.png", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" />',
    }),
  );
});

test("authenticated public-profile pull-request avatars own the frozen avatar cascade", async ({
  page,
}) => {
  const [
    routeSource,
    styleSource,
    viewScala,
    partial,
    commonLess,
    yobiUiLess,
    pageLess,
    responsiveLess,
    bootstrap,
    bootstrapResponsive,
    yobiLess,
    messages,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../src/app.css", import.meta.url), "utf8") +
      readFileSync(
        new URL(
          "../frontend/public/legacy-assets/stylesheets/legacy-fallback.css",
          import.meta.url,
        ),
        "utf8",
      ),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../../yona-original/app/views/user/partial_pullRequests.scala.html",
        import.meta.url,
      ),
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
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(viewScala).toContain('<div id="pullRequests" class="tab-pane');
  expect(viewScala).toContain("@partial_pullRequests(pull, pull.toProject)");
  expect(partial).toContain(
    '<a href="@routes.ProjectApp.project(project.owner, project.name)" class="avatar-wrap mlarge">',
  );
  expect(partial).toContain(
    '<img src="@urlToProjectLogo(project)" alt="@project.owner / @project.name">',
  );
  expect(partial).toContain('class="avatar-wrap assinee"');
  expect(partial).toContain(
    '<img src="@req.receiver.avatarUrl" width="32" height="32" alt="@req.receiver.name">',
  );
  expect(partial).toContain('<div class="empty-avatar-wrap">&nbsp;</div>');
  expect(partial).toContain('<div class="mt5 pull-right">');

  for (const declaration of [
    "width:32px; height:32px;",
    "vertical-align:top;",
    "overflow:hidden; display:inline-block;",
  ]) {
    expect(commonLess).toContain(declaration);
  }
  for (const declaration of [
    "width:32px; height:32px; /* default size: medium */",
    "display:inline-block;",
    "vertical-align:middle;",
    "overflow:hidden;",
    "background:#ddd;",
    ".border-radius(3px) !important;",
    "&.mlarge  { width:40px; height:40px; }",
    "width:100%;",
    "vertical-align:top;",
  ]) {
    expect(yobiUiLess).toContain(declaration);
  }
  for (const declaration of [
    ".post-item {",
    "padding:10px;",
    "border-bottom:1px solid #ddd;",
    "display:block;",
    "overflow: auto;",
    "clear: both;",
    ".avatar-wrap {",
    "margin-right:10px;",
    "float: left;",
    "&.assinee {",
    "margin-right:0;",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  expect(responsiveLess).toContain("@media");
  expect(bootstrap).toContain('.row-fluid [class*="span"]');
  expect(bootstrap).toContain(".row-fluid .span10");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  for (const importPath of [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ]) {
    expect(yobiLess).toContain(`@import "${importPath}";`);
  }
  for (const messageKey of [
    "issue.noAuthor",
    "pullRequest.state.conflict",
    "pullRequest.state.open",
    "pullRequest.is.empty",
  ]) {
    expect(messages).toContain(messageKey);
  }

  for (const owner of [
    "user-profile-pull-request-project-avatar-rail",
    "user-profile-pull-request-project-avatar-image",
    "user-profile-pull-request-receiver-avatar-link",
    "user-profile-pull-request-receiver-avatar-image",
    "user-profile-pull-request-receiver-rail",
    "user-profile-pull-request-state",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
  // 667398a04 legacy-parity restore: PR row retains avatar-wrap mlarge / assinee (wave-33).
  expect(routeSource).toContain("avatar-wrap mlarge");
  expect(routeSource).toContain("avatar-wrap assinee");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=pullRequests`, { waitUntil: "networkidle" });

  const fallback = page.locator('link[href*="legacy-fallback.css"]');
  await expect(fallback).toHaveCount(process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1);

  const rows = page.locator('[data-owner="user-profile-pull-request-row"]');
  await expect(rows).toHaveCount(2);
  const populated = rows.nth(0);
  const empty = rows.nth(1);
  const projectAvatar = populated.locator(
    '[data-owner="user-profile-pull-request-project-avatar-rail"]',
  );
  const projectImage = populated.locator(
    '[data-owner="user-profile-pull-request-project-avatar-image"]',
  );
  const receiverAvatar = populated.locator(
    '[data-owner="user-profile-pull-request-receiver-avatar-link"]',
  );
  const receiverImage = populated.locator(
    '[data-owner="user-profile-pull-request-receiver-avatar-image"]',
  );

  await expect(projectAvatar).toHaveCount(1);
  await expect(projectImage).toHaveCount(1);
  await expect(receiverAvatar).toHaveCount(1);
  await expect(receiverImage).toHaveCount(1);
  await expect(projectAvatar).toHaveClass(/(?:^|\s)(?:avatar-wrap|mlarge)(?:\s|$)/u);
  await expect(receiverAvatar).toHaveClass(/(?:^|\s)(?:avatar-wrap|assinee)(?:\s|$)/u);
  await expect(projectAvatar).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(projectImage).toHaveAttribute("src", "/assets/images/project-avatar.png");
  await expect(projectImage).toHaveAttribute("alt", "admin / sample");
  await expect(receiverAvatar).toHaveAttribute("href", `${basePath}/receiver`);
  await expect(receiverAvatar).toHaveAttribute("title", "Receiver User");
  await expect(receiverImage).toHaveAttribute("src", "/assets/images/receiver-avatar.png");
  await expect(receiverImage).toHaveAttribute("width", "32");
  await expect(receiverImage).toHaveAttribute("height", "32");
  await expect(receiverImage).toHaveAttribute("alt", "Receiver User");
  await expect(populated).toContainText(
    "sample12Conflict pull requestContributor User2 days ago3Conflict",
  );
  await expect(empty).toContainText("sample13Open pull request");
  await expect(
    empty.locator('[data-owner="user-profile-pull-request-empty-avatar-wrap"]'),
  ).toHaveCount(1);
  await expect(
    empty.locator('[data-owner="user-profile-pull-request-receiver-avatar-link"]'),
  ).toHaveCount(0);

  // Native <img> loads bypass the fetch mock (loadFixtureLogo precedent), so
  // swap the fixture avatars for data: URIs before computed-size assertions
  // (project mock is 1x1, receiver mock is 32x32).
  await page.evaluate(async () => {
    const swap = async (selector: string, uri: string) => {
      for (const img of document.querySelectorAll<HTMLImageElement>(selector)) {
        img.src = uri;
        await img.decode().catch(() => undefined);
      }
    };
    await swap(
      '[data-owner="user-profile-pull-request-project-avatar-image"]',
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E",
    );
    await swap(
      '[data-owner="user-profile-pull-request-receiver-avatar-image"]',
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'/%3E",
    );
  });

  const desktop = await populated.evaluate((row) => {
    const project = row.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-project-avatar-rail"]',
    );
    const projectImg = row.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-project-avatar-image"]',
    );
    const receiver = row.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-receiver-avatar-link"]',
    );
    const receiverImg = row.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-receiver-avatar-image"]',
    );
    const rail = row.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-receiver-rail"]',
    );
    const state = row.querySelector<HTMLElement>('[data-owner="user-profile-pull-request-state"]');
    if (!project || !projectImg || !receiver || !receiverImg || !rail || !state) {
      throw new Error("Batch 1017 avatar owners missing");
    }
    const projectStyle = getComputedStyle(project);
    const projectImageStyle = getComputedStyle(projectImg);
    const receiverStyle = getComputedStyle(receiver);
    const receiverImageStyle = getComputedStyle(receiverImg);
    const rowBox = row.getBoundingClientRect();
    const boxes = [project, projectImg, receiver, receiverImg, rail, state].map((element) =>
      element.getBoundingClientRect(),
    );
    return {
      project: {
        width: projectStyle.width,
        height: projectStyle.height,
        display: projectStyle.display,
        verticalAlign: projectStyle.verticalAlign,
        overflow: projectStyle.overflow,
        backgroundColor: projectStyle.backgroundColor,
        borderRadius: projectStyle.borderRadius,
        float: projectStyle.float,
        marginRight: projectStyle.marginRight,
      },
      projectImage: {
        width: projectImageStyle.width,
        verticalAlign: projectImageStyle.verticalAlign,
      },
      receiver: {
        width: receiverStyle.width,
        height: receiverStyle.height,
        display: receiverStyle.display,
        verticalAlign: receiverStyle.verticalAlign,
        overflow: receiverStyle.overflow,
        backgroundColor: receiverStyle.backgroundColor,
        borderRadius: receiverStyle.borderRadius,
        float: receiverStyle.float,
        marginRight: receiverStyle.marginRight,
      },
      receiverImage: {
        width: receiverImageStyle.width,
        height: receiverImageStyle.height,
        verticalAlign: receiverImageStyle.verticalAlign,
      },
      railFloat: getComputedStyle(rail).float,
      railMarginTop: getComputedStyle(rail).marginTop,
      stateFloat: getComputedStyle(state).float,
      rowContained: boxes.every(
        (box) => box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1,
      ),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await populated.evaluate((row) => {
    const project = row.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-project-avatar-rail"]',
    );
    const receiver = row.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-receiver-avatar-link"]',
    );
    if (!project || !receiver) throw new Error("Batch 1017 mobile avatar owners missing");
    const rowBox = row.getBoundingClientRect();
    const boxes = [project, receiver].map((element) => element.getBoundingClientRect());
    return {
      projectWidth: getComputedStyle(project).width,
      projectHeight: getComputedStyle(project).height,
      receiverWidth: getComputedStyle(receiver).width,
      receiverHeight: getComputedStyle(receiver).height,
      rowContained: boxes.every(
        (box) => box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1,
      ),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobile).toEqual({
    projectWidth: "40px",
    projectHeight: "40px",
    receiverWidth: "32px",
    receiverHeight: "32px",
    rowContained: true,
    documentWidth: 390,
    viewportWidth: 390,
  });
});
