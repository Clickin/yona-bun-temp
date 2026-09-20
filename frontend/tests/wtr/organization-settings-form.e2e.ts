import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const ORGANIZATION_SETTINGS_ROUTE_SOURCE =
  "src/routes/organizations/$organizationName/settingform.tsx";
const ORGANIZATION_PARENT_ROUTE_SOURCE = "src/routes/organizations/$organizationName.tsx";

const EXPECTED_ORGANIZATION_SETTINGS_FORM = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i>
    </div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
      <li class="divider"></li>
      <li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li>
      <li>
        <form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form">
          <input type="hidden" name="searchType" value="auto">
          <div class="search-box">
            <input type="text" name="keyword" autocomplete="off" accesskey="S">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li>
          <li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li>
          <li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)">
        <a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button>
        <ul class="dropdown-menu flat right">
          <li><a href="__BASE_PATH__/user/issues/new">New issue</a></li>
          <li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li>
          <li><hr class="no-margin"></li>
          <li><a href="__BASE_PATH__/projectform">Create new project</a></li>
          <li><a href="__BASE_PATH__/organizations/new">New Group</a></li>
        </ul>
      </li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/group_default.png')">
  <div class="project-header-inner">
    <div class="project-header-wrap">
      <div class="project-header-avatar"><img src="/assets/images/group_default.png"></div>
      <div class="project-breadcrumb-wrap">
        <div class="project-breadcrumb">
          <span class="project-author"><span class="group-title-head">group</span><a href="__BASE_PATH__/organizations/weblabs">weblabs</a></span>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="project-menu-outer">
  <div class="project-menu-inner">
    <ul class="project-menu-nav project-menu-gruop">
      <li class=""><a href="__BASE_PATH__/organizations/weblabs">Group Home</a></li>
      <li class=""><a href="__BASE_PATH__/organizations/weblabs/issues">Issue</a></li>
      <li class=""><a href="__BASE_PATH__/organizations/weblabs/boards">Board</a></li>
      <li class=""><a href="__BASE_PATH__/organizations/weblabs/pullrequests">Pull request</a></li>
    </ul>
    <div class="project-setting">
      <ul class="project-menu-nav">
        <li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform"><i class="yobicon-cog"></i><span class="blind">Project configuration</span></a></li>
      </ul>
    </div>
  </div>
</div>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <ul class="nav nav-tabs">
      <li class="active"><a href="__BASE_PATH__/organizations/weblabs/settingform">Setting</a></li>
      <li class=""><a href="__BASE_PATH__/organizations/weblabs/members">Group member</a></li>
      <li class=""><a href="__BASE_PATH__/organizations/weblabs/deleteForm">Group Delete</a></li>
    </ul>
    <form id="saveSetting" method="post" action="__BASE_PATH__/organizations/weblabs/setting" enctype="multipart/form-data" class="nm" name="update-org">
      <input type="hidden" name="id" value="42">
      <div class="bubble-wrap gray">
        <div class="box-wrap top clearfix frm-wrap" style="padding-top:20px;">
          <div class="setting-box left">
            <div class="logo-wrap" style="background-image:url('/assets/images/group_default.png')"></div>
            <div class="logo-desc">
              <ul class="unstyled descs">
                <li><strong>Logo</strong></li>
                <li>File type <span class="point">bmp, jpg, gif, png</span></li>
                <li>Max File size <span class="point">5MB</span></li>
                <li><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input id="logoPath" type="file" class="file" name="logoPath" accept="image/*"></div></div></li>
              </ul>
            </div>
          </div>
          <dl class="setting-box right">
            <dt><label for="project-name">input group name</label></dt>
            <dd><input id="project-name" type="text" name="name" maxlength="250" value="weblabs"><div class="orange-txt"><span class="msg wrongName" style="display: none;"></span></div></dd>
            <dt><label for="project-desc">input group's description</label></dt>
            <dd><textarea id="project-desc" name="descr" maxlength="250" class="textarea">Web labs group</textarea></dd>
          </dl>
        </div>
      </div>
      <div class="box-wrap bottom"><button id="save" class="ybtn ybtn-success">Save</button></div>
    </form>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a>
      &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a>
      &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

test("organization settings form matches legacy organization/setting.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSettings(page);

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  await expect(page).toHaveTitle("weblabs");
  await expect(page.locator("#saveSetting")).toBeVisible();
  await expect(page.locator("#saveSetting")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/setting`,
  );
  await expect(page.locator("#project-name")).toHaveValue("weblabs");
  await expect(page.locator("#project-desc")).toHaveValue("Web labs group");
  expect(await canonicalizeScreenRoot(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_ORGANIZATION_SETTINGS_FORM.replaceAll("__BASE_PATH__", basePath),
      ".page-wrap-outer",
    ),
  );
});

test("organization settings form pins the live localhost authenticated generic shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSettings(page);

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  await expect(page.locator("#saveSetting")).toBeVisible();

  await expect(page).toHaveTitle("weblabs");
  await expect(page.locator('[data-owner="global-gnb-nav"] > li > a')).toHaveText([
    "Y",
    "List All",
    "Feedback",
  ]);
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator('form.gnb-search-form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/search`,
  );
  await expect(page.locator(".project-header-avatar img")).toHaveAttribute(
    "src",
    `${basePath}/legacy-assets/images/group_default.png`,
  );

  const shellMetrics = await page.evaluate(() => {
    const navbar = document.querySelector("header[data-owner=global-gnb-outer]");
    const searchForm = document.querySelector("form.gnb-search-form");
    const searchBox = document.querySelector('[data-owner="global-gnb-search-box"]');
    const projectHeader = document.querySelector(".project-header-outer");
    const logoWrap = document.querySelector(".setting-box.left .logo-wrap");
    if (!(navbar instanceof HTMLElement)) {
      throw new Error("Missing header.gnb-outer");
    }
    if (!(searchForm instanceof HTMLElement)) {
      throw new Error("Missing form.gnb-search-form");
    }
    if (!(searchBox instanceof HTMLElement)) {
      throw new Error("Missing global GNB search box owner");
    }
    if (!(projectHeader instanceof HTMLElement)) {
      throw new Error("Missing .project-header-outer");
    }
    if (!(logoWrap instanceof HTMLElement)) {
      throw new Error("Missing .setting-box.left .logo-wrap");
    }
    return {
      navbar: navbar.getBoundingClientRect(),
      searchForm: searchForm.getBoundingClientRect(),
      searchBox: searchBox.getBoundingClientRect(),
      logoWrapBackgroundImage: getComputedStyle(logoWrap).backgroundImage,
      projectHeaderBackgroundImage: getComputedStyle(projectHeader).backgroundImage,
    };
  });

  expect(shellMetrics.searchForm.top).toBeGreaterThanOrEqual(shellMetrics.navbar.top);
  expect(shellMetrics.searchForm.bottom).toBeLessThanOrEqual(shellMetrics.navbar.bottom);
  expect(shellMetrics.searchBox.top).toBeGreaterThanOrEqual(shellMetrics.navbar.top);
  expect(shellMetrics.searchBox.bottom).toBeLessThanOrEqual(shellMetrics.navbar.bottom);
  expect(shellMetrics.searchForm.right).toBeLessThanOrEqual(shellMetrics.navbar.right);
  expect(shellMetrics.projectHeaderBackgroundImage).toContain("group_default.png");
  expect(shellMetrics.logoWrapBackgroundImage).toContain("group_default.png");
});

test("organization settings form keeps legacy setting.scala.html layout metrics", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSettings(page);
  await page.setViewportSize({ height: 900, width: 1440 });

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  await expect(page.locator("#saveSetting")).toBeVisible();

  const metrics = await organizationSettingsMetrics(page);

  expect(metrics.form.margin).toBe("0px");
  expect(metrics.bubble.backgroundColor).toBe("rgb(247, 247, 247)");
  expect(metrics.bubble.borderRadius).toBe("5px");
  expect(metrics.topBox.paddingTop).toBe("20px");
  expect(metrics.topBox.paddingBottom).toBe("20px");
  expect(metrics.leftBox.width).toBe(420);
  expect(metrics.leftBox.paddingRight).toBe("20px");
  expect(metrics.leftBox.borderRight).toBe("1px solid rgb(255, 255, 255)");
  expect(metrics.rightBox.width).toBe(420);
  expect(metrics.rightBox.paddingLeft).toBe("20px");
  expect(metrics.rightBox.borderLeft).toBe("1px solid rgb(212, 212, 212)");
  expect(metrics.rightBox.xGapFromLeft).toBe(0);
  expect(metrics.logo.width).toBe(260);
  expect(metrics.logo.height).toBe(188);
  expect(metrics.logo.borderRadius).toBe("10px");
  expect(metrics.logoDesc.width).toBe(120);
  expect(metrics.logoDesc.marginLeft).toBe("10px");
  expect(metrics.logoDesc.fontSize).toBe("12px");
  expect(metrics.logoPoint.color).toBe("rgb(81, 170, 204)");
  expect(metrics.logoPoint.textTransform).toBe("uppercase");
  expect(metrics.logoUploadRow.marginTop).toBe("25px");
  expect(metrics.nameLabel.fontWeight).toBe("700");
  expect(metrics.nameRow.margin).toBe("3px 0px 1px");
  expect(metrics.textarea.width).toBe("380px");
  expect(metrics.textarea.height).toBe("80px");
  expect(metrics.textarea.resize).toBe("vertical");
  expect(metrics.bottomBox.padding).toBe("20px 0px 12px");
  expect(metrics.bottomBox.textAlign).toBe("center");
  expect(metrics.saveButton.height).toBeGreaterThanOrEqual(30);
});

test("organization settings top-box preserves frozen mobile resets", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSettings(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  await expect(page.locator("#saveSetting")).toBeVisible();
  const metrics = await page.evaluate(() => {
    const logo = document.querySelector<HTMLElement>("#saveSetting .logo-wrap");
    const right = document.querySelector<HTMLElement>("#saveSetting .setting-box.right");
    const textarea = document.querySelector<HTMLTextAreaElement>("#project-desc");
    if (!logo || !right || !textarea) throw new Error("Missing mobile setting controls");
    const rightStyle = getComputedStyle(right);
    return {
      logoWidth: logo.getBoundingClientRect().width,
      logoHeight: logo.getBoundingClientRect().height,
      borderLeft: rightStyle.borderLeftStyle,
      paddingLeft: rightStyle.paddingLeft,
      textareaWidth: textarea.getBoundingClientRect().width,
    };
  });
  expect(metrics.logoWidth).toBe(100);
  expect(metrics.logoHeight).toBe(100);
  expect(metrics.borderLeft).toBe("none");
  expect(metrics.paddingLeft).toBe("0px");
  expect(metrics.textareaWidth).toBeLessThan(390);
  const containment = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(containment.scrollWidth).toBe(containment.viewport);
});

test("organization settings logo input validates image files and auto-submits like legacy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const uploadRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const updateRequests: { body: Record<string, unknown>; hasCsrfToken: boolean; method: string }[] =
    [];
  await mockOrganizationSettings(page, { updateRequests, uploadRequests });

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  await expect(page.locator("#saveSetting")).toBeVisible();

  await markLogoInputNode(page, "invalid-selection");
  const dialogPromise = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.locator("#logoPath").setInputFiles({
    buffer: Buffer.from("not an image"),
    mimeType: "text/plain",
    name: "not-image.txt",
  });
  await expect(dialogPromise).resolves.toBe("This is not an image.");
  await expect(page.locator("#logoPath")).toHaveValue("");
  await expectLogoInputNodeMarker(page, undefined);
  expect(uploadRequests).toEqual([]);
  expect(updateRequests).toEqual([]);

  await markLogoInputNode(page, "successful-submit");
  const updateResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/organizations/weblabs") &&
      response.request().method() === "PATCH",
  );
  await page.locator("#logoPath").setInputFiles({
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    mimeType: "image/png",
    name: "organization-logo.png",
  });
  await updateResponsePromise;

  expect(uploadRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  expect(updateRequests).toEqual([
    {
      body: {
        description: "Web labs group",
        logoAttachmentId: 42,
        organizationName: "weblabs",
      },
      hasCsrfToken: true,
      method: "PATCH",
    },
  ]);
  await expect(page.locator("#logoPath")).toHaveValue("");
  await expectLogoInputNodeMarker(page, undefined);
});

test("organization settings logo input reset source is React-owned", () => {
  const source = readFileSync(ORGANIZATION_SETTINGS_ROUTE_SOURCE, "utf8");
  const logoInputSlice =
    source.match(/function OrganizationSettingsBody[\s\S]*?function OrganizationHeader/u)?.[0] ??
    source;

  expect(logoInputSlice).toContain("const [logoInputKey, setLogoInputKey] = useState(0)");
  expect(logoInputSlice).toContain("key={logoInputKey}");
  expect(logoInputSlice).toContain("setLogoInputKey((key) => key + 1)");
  expect(logoInputSlice).not.toContain("logoInputRef.current.value");
  expect(logoInputSlice).not.toContain(".current.value");
  expect(logoInputSlice).not.toContain("event.currentTarget.value");
  expect(logoInputSlice).not.toContain("document.querySelector");
  expect(logoInputSlice).not.toContain("document.getElementById");
  expect(logoInputSlice).not.toContain("addEventListener");
  expect(logoInputSlice).not.toContain("classList");
  expect(logoInputSlice).not.toContain("style.display");
  expect(logoInputSlice).not.toContain("dangerouslySetInnerHTML");
});

test("organization settings top-box Style owners preserve legacy declarations", () => {
  const source = readFileSync(ORGANIZATION_SETTINGS_ROUTE_SOURCE, "utf8");
  const style = curatedAppCss();
  for (const owner of [
    "organization-setting-box-left",
    "organization-setting-box-right",
    "organization-setting-logo",
    "organization-setting-logo-desc",
    "organization-setting-descs",
    "organization-setting-logo-point",
    "organization-setting-description",
  ])
    expect(source).toContain(`data-owner="${owner}"`);
});

test("organization settings name submit shows legacy validation warning", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const updateRequests: { body: Record<string, unknown>; hasCsrfToken: boolean; method: string }[] =
    [];
  await mockOrganizationSettings(page, { updateRequests });

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  await expect(page.locator("#saveSetting")).toBeVisible();

  await page.locator("#project-name").fill("bad group name");
  await page.locator("#save").click();

  await expect(page.locator("#saveSetting .wrongName")).toHaveText(
    "Enter the group name in alphanumerical or symbol characters(_-.)",
  );
  await expect(page.locator("#saveSetting .wrongName")).toBeVisible();
  expect(updateRequests).toEqual([]);
});

test("organization settings duplicate name error stays under the name field like legacy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const updateRequests: { body: Record<string, unknown>; hasCsrfToken: boolean; method: string }[] =
    [];
  await mockOrganizationSettings(page, {
    updateErrorMessage: "organization.name.duplicate",
    updateRequests,
  });

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  await expect(page.locator("#saveSetting")).toBeVisible();

  await page.locator("#project-name").fill("weblabs2");
  await page.locator("#save").click();

  const warning = page.locator(
    '#saveSetting [data-owner="organization-setting-validation-message"] .warning',
  );
  await expect(warning).toHaveText("Already existent user's login id or group name.");
  await expect(warning).toBeVisible();
  await expect(
    page.locator('#saveSetting [data-owner="organization-setting-validation-message"] .wrongName'),
  ).toBeHidden();
  expect(updateRequests).toEqual([
    {
      body: {
        description: "Web labs group",
        organizationName: "weblabs2",
      },
      hasCsrfToken: true,
      method: "PATCH",
    },
  ]);

  const errorMetrics = await page.evaluate(() => {
    const nameField = mustElement("#project-name");
    const errorWrap = mustElement(
      '#project-name + [data-owner="organization-setting-validation-message"]',
    );
    const warningElement = mustElement(
      '#project-name + [data-owner="organization-setting-validation-message"] .warning',
    );
    const wrongNameElement = mustElement(
      '#project-name + [data-owner="organization-setting-validation-message"] .wrongName',
    );
    const fieldBox = nameField.getBoundingClientRect();
    const wrapBox = errorWrap.getBoundingClientRect();
    const warningBox = warningElement.getBoundingClientRect();

    return {
      warningAfterField: warningBox.top >= fieldBox.bottom,
      warningBeforeWrongName: warningElement.compareDocumentPosition(wrongNameElement),
      warningInsideWrap:
        warningBox.left >= wrapBox.left &&
        warningBox.right <= wrapBox.right &&
        warningBox.top >= wrapBox.top &&
        warningBox.bottom <= wrapBox.bottom,
      wrapLeftAlignedWithField: Math.round(wrapBox.left - fieldBox.left),
      wrapWidth: Math.round(wrapBox.width),
    };

    function mustElement(selector: string) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing selector: ${selector}`);
      }
      return element;
    }
  });

  expect(errorMetrics.warningAfterField).toBe(true);
  expect((errorMetrics.warningBeforeWrongName & 4) !== 0).toBe(true);
  expect(errorMetrics.warningInsideWrap).toBe(true);
  expect(errorMetrics.wrapLeftAlignedWithField).toBe(0);
  expect(errorMetrics.wrapWidth).toBeGreaterThan(300);
});

test("organization settings navigation anchors keep legacy hrefs without route-local native listeners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installOrganizationSettingsNativeLinkAudit(page);
  await mockOrganizationSettings(page);

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  await expect(page.locator("#saveSetting")).toBeVisible();

  await expect(page.locator(".project-menu-gruop a")).toHaveCount(4);
  await expect(page.locator(".project-menu-gruop a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/issues`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(2)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(3)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/pullrequests`,
  );
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a")).toHaveCount(3);
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/settingform`,
  );
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/members`,
  );
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs a").nth(2)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/deleteForm`,
  );
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs li").nth(0)).toHaveClass("active");
  for (const tabLink of await page.locator(".project-page-wrap > .nav.nav-tabs a").all()) {
    await expect(tabLink).not.toHaveAttribute("class", /(^|\s)active(\s|$)/u);
    await expect(tabLink).not.toHaveAttribute("aria-current", /.*/u);
    await expect(tabLink).not.toHaveAttribute("data-status", /.*/u);
  }
  expect(await readOrganizationSettingsNativeLinkAudit(page)).toEqual([]);
});

test("organization settings menu masks TanStack active markers from legacy anchors", () => {
  const source = readFileSync(ORGANIZATION_SETTINGS_ROUTE_SOURCE, "utf8");

  expect(source).toContain("legacyOrganizationSettingMenuActiveOptions");
  expect(source).toContain("includeHash: true");
  expect(source).toContain('hash="organization-settingform-active-sentinel"');

  expect(source).toContain("legacyOrganizationSettingMenuActiveProps");
});

test("organization settings breadcrumb organization link keeps legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSettings(page);

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  const breadcrumbLink = page.locator(".project-breadcrumb .project-author > a");
  await expect(breadcrumbLink).toHaveText("weblabs");
  await expect(breadcrumbLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await expect(breadcrumbLink).not.toHaveAttribute("aria-current", /.*/u);
  await expect(breadcrumbLink).not.toHaveAttribute("data-status", /.*/u);
  await expect(breadcrumbLink).not.toHaveAttribute("class", /.*/u);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await breadcrumbLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#mylist-filter")).toHaveCount(1);
  await expect(page.locator("#mylist-filter")).toBeVisible();
});

test("organization settings parent owns the legacy breadcrumb shell without Link prop shims", () => {
  const settingsSource = readFileSync(ORGANIZATION_SETTINGS_ROUTE_SOURCE, "utf8");
  const parentSource = readFileSync(ORGANIZATION_PARENT_ROUTE_SOURCE, "utf8");
  const headerBreadcrumb = parentSource.match(
    /<span className="project-author">[\s\S]*?<\/span>\s*<\/div>\s*<\/div>/u,
  )?.[0];

  expect(headerBreadcrumb).toContain("<Link");
  expect(headerBreadcrumb).toContain('to="/organizations/$organizationName"');
  expect(parentSource).toContain("showLegacyProjectHeaderLinks");
  expect(settingsSource).toContain("<title>{organizationName}</title>");
  expect(settingsSource).not.toContain("SiteLayoutShell");
  expect(settingsSource).not.toContain("OrganizationHeader");
  expect(settingsSource).not.toContain("OrganizationMenu");
  expect(parentSource).not.toContain("globalThis.document");
  expect(parentSource).not.toContain("document.title");
  expect(parentSource).not.toContain("Parameters<typeof Link>");
  expect(parentSource).not.toContain("as unknown as");
  expect(headerBreadcrumb).not.toContain(
    "href={organizationSettingHref(basePath, organizationName)}",
  );
  expect(parentSource).not.toContain(
    "<a href={organizationSettingHref(basePath, organizationName)}>{organizationName}</a>",
  );
});

test("organization settings menu members link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSettings(page);

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  const membersLink = page.locator(".project-page-wrap > .nav.nav-tabs a").filter({
    hasText: "Group member",
  });
  await expect(membersLink).toHaveAttribute("href", `${basePath}/organizations/weblabs/members`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await membersLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/members`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs li").nth(1)).toHaveClass("active");
  await expect(page.locator("#addNewMember")).toBeVisible();
});

test("organization settings menu home link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSettings(page);

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  const homeLink = page.locator(".project-menu-gruop a").filter({ hasText: "Group Home" });
  await expect(homeLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await homeLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-menu-gruop li").first()).toHaveClass(/active/);
  await expect(page.locator("#mylist-filter")).toHaveCount(1);
  await expect(page.locator("#mylist-filter")).toBeVisible();
});

test("organization settings menu board link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationSettings(page);

  await page.goto(`${basePath}/organizations/weblabs/settingform`);
  const boardLink = page.locator(".project-menu-gruop a").filter({ hasText: "Board" });
  await expect(boardLink).toHaveAttribute("href", `${basePath}/organizations/weblabs/boards`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await boardLink.click();

  await expect(page).toHaveURL(
    new RegExp(`${basePath}/organizations/weblabs/boards\\?orderBy=updatedDate&orderDir=desc`),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Board");
  await expect(page.locator("#option_form")).toBeVisible();
});

async function installOrganizationSettingsNativeLinkAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__organizationSettingsNativeLinkListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithOrganizationSettingsAudit(
      type,
      listener,
      options,
    ) {
      if (this.matches(".project-menu-gruop a, .project-page-wrap > .nav.nav-tabs a")) {
        (
          window as Window &
            typeof globalThis & { __organizationSettingsNativeLinkListeners: string[] }
        ).__organizationSettingsNativeLinkListeners.push(`${this.className}:${String(type)}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readOrganizationSettingsNativeLinkAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __organizationSettingsNativeLinkListeners?: string[] }
      ).__organizationSettingsNativeLinkListeners ?? [],
  );
}

async function markLogoInputNode(page: Page, marker: string) {
  await page.locator("#logoPath").evaluate((element, value) => {
    (element as HTMLInputElement & { __yonaLogoInputMarker?: string }).__yonaLogoInputMarker =
      value;
  }, marker);
}

async function expectLogoInputNodeMarker(page: Page, marker: string | undefined) {
  await expect
    .poll(() =>
      page.locator("#logoPath").evaluate((element) => {
        return (element as HTMLInputElement & { __yonaLogoInputMarker?: string })
          .__yonaLogoInputMarker;
      }),
    )
    .toBe(marker);
}

async function organizationSettingsMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrap = mustElement(".page-wrap-outer > .project-page-wrap");
    const settingMenu = mustElement(".project-page-wrap > .nav.nav-tabs");
    const form = mustElement("#saveSetting");
    const bubble = mustElement("#saveSetting > .bubble-wrap.gray");
    const topBox = mustElement("#saveSetting .box-wrap.top.frm-wrap");
    const leftBox = mustElement("#saveSetting .setting-box.left");
    const rightBox = mustElement("#saveSetting .setting-box.right");
    const logo = mustElement("#saveSetting .logo-wrap");
    const logoDesc = mustElement("#saveSetting .logo-desc");
    const logoPoint = mustElement("#saveSetting .logo-desc .point");
    const logoUploadRow = mustElement("#saveSetting .logo-desc .descs li:last-of-type");
    const nameLabel = mustElement('label[for="project-name"]');
    const nameRow = mustElement("#saveSetting .setting-box.right dt");
    const textarea = mustElement("#project-desc");
    const bottomBox = mustElement("#saveSetting .box-wrap.bottom");
    const saveButton = mustElement("#save");
    const leftBoxRect = leftBox.getBoundingClientRect();
    const rightBoxRect = rightBox.getBoundingClientRect();
    const pageWrapStyle = getComputedStyle(pageWrap);
    const settingMenuStyle = getComputedStyle(settingMenu);
    const formStyle = getComputedStyle(form);
    const bubbleStyle = getComputedStyle(bubble);
    const topBoxStyle = getComputedStyle(topBox);
    const leftBoxStyle = getComputedStyle(leftBox);
    const rightBoxStyle = getComputedStyle(rightBox);
    const logoStyle = getComputedStyle(logo);
    const logoDescStyle = getComputedStyle(logoDesc);
    const logoPointStyle = getComputedStyle(logoPoint);
    const logoUploadRowStyle = getComputedStyle(logoUploadRow);
    const nameLabelStyle = getComputedStyle(nameLabel);
    const nameRowStyle = getComputedStyle(nameRow);
    const textareaStyle = getComputedStyle(textarea);
    const bottomBoxStyle = getComputedStyle(bottomBox);

    return {
      pageWrap: {
        marginTop: pageWrapStyle.marginTop,
      },
      settingMenu: {
        marginBottom: settingMenuStyle.marginBottom,
      },
      form: {
        margin: formStyle.margin,
      },
      bubble: {
        backgroundColor: bubbleStyle.backgroundColor,
        borderRadius: bubbleStyle.borderRadius,
      },
      topBox: {
        paddingBottom: topBoxStyle.paddingBottom,
        paddingTop: topBoxStyle.paddingTop,
      },
      leftBox: {
        borderRight: `${leftBoxStyle.borderRightWidth} ${leftBoxStyle.borderRightStyle} ${leftBoxStyle.borderRightColor}`,
        paddingRight: leftBoxStyle.paddingRight,
        width: Math.round(leftBoxRect.width),
      },
      rightBox: {
        borderLeft: `${rightBoxStyle.borderLeftWidth} ${rightBoxStyle.borderLeftStyle} ${rightBoxStyle.borderLeftColor}`,
        paddingLeft: rightBoxStyle.paddingLeft,
        width: Math.round(rightBoxRect.width),
        xGapFromLeft: Math.round(rightBoxRect.left - leftBoxRect.right),
      },
      logo: {
        borderRadius: logoStyle.borderRadius,
        height: Math.round(logo.getBoundingClientRect().height),
        width: Math.round(logo.getBoundingClientRect().width),
      },
      logoDesc: {
        fontSize: logoDescStyle.fontSize,
        marginLeft: logoDescStyle.marginLeft,
        width: Math.round(logoDesc.getBoundingClientRect().width),
      },
      logoPoint: {
        color: logoPointStyle.color,
        textTransform: logoPointStyle.textTransform,
      },
      logoUploadRow: {
        marginTop: logoUploadRowStyle.marginTop,
      },
      nameLabel: {
        fontWeight: nameLabelStyle.fontWeight,
      },
      nameRow: {
        margin: nameRowStyle.margin,
      },
      textarea: {
        height: textareaStyle.height,
        resize: textareaStyle.resize,
        width: textareaStyle.width,
      },
      bottomBox: {
        padding: bottomBoxStyle.padding,
        textAlign: bottomBoxStyle.textAlign,
      },
      saveButton: {
        height: Math.round(saveButton.getBoundingClientRect().height),
      },
    };

    function mustElement(selector: string) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing selector: ${selector}`);
      }
      return element;
    }
  });
}

async function mockOrganizationSettings(
  page: Page,
  overrides: Partial<{
    updateErrorMessage: string;
    updateRequests: { body: Record<string, unknown>; hasCsrfToken: boolean; method: string }[];
    uploadRequests: { hasCsrfToken: boolean; method: string }[];
  }> = {},
) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
    };
  }, process.env.YONA_DEV_BASE_PATH ?? "/yona");

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
  await page.route("**/api/v1/organizations/weblabs/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Web labs group",
        id: 42,
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/files", async (route) => {
    const request = route.request();
    overrides.uploadRequests?.push({
      hasCsrfToken: Boolean(request.headers()["x-csrf-token"]),
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 42,
        mimeType: "image/png",
        name: "organization-logo.png",
        size: 4,
        url: "/files/42",
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs", async (route) => {
    const request = route.request();
    overrides.updateRequests?.push({
      body: request.postDataJSON() as Record<string, unknown>,
      hasCsrfToken: Boolean(request.headers()["x-csrf-token"]),
      method: request.method(),
    });
    if (overrides.updateErrorMessage) {
      await route.fulfill({
        contentType: "application/json",
        status: 400,
        body: JSON.stringify({
          error: {
            code: "bad_request",
            message: overrides.updateErrorMessage,
            status: 400,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Web labs group",
        id: 42,
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/admin", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(organizationAdminPayload()),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(organizationContainerPayload()),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/boards**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        notices: [],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
}

function organizationContainerPayload() {
  return {
    adminMembers: [
      {
        avatarUrl: "/assets/images/default-avatar-45.png",
        loginId: "admin",
        role: "org_admin",
        userLabel: "Site Admin",
      },
    ],
    description: "Web labs group",
    logoUrl: "",
    memberMembers: [],
    organizationName: "weblabs",
    viewerCanCreateProject: true,
    viewerCanLeave: true,
    viewerCanUpdate: true,
    visibleProjects: [],
  };
}

function organizationAdminPayload() {
  return {
    deleteAllowed: true,
    enrollmentRequests: [],
    id: 42,
    logoUrl: "",
    members: [
      {
        avatarUrl: "/assets/images/default-avatar-64.png",
        loginId: "admin",
        role: "org_admin",
        userId: 1,
        userLabel: "Site Admin",
      },
    ],
    organizationName: "weblabs",
    roleOptions: [
      { label: "Group Manager", role: "org_admin" },
      { label: "Group Member", role: "org_member" },
    ],
    viewerCanUpdate: true,
  };
}

async function canonicalizeScreenRoot(page: Page, selector: string) {
  return page.evaluate((targetSelector) => {
    const root = document.querySelector(targetSelector);
    if (!root) {
      throw new Error(`Missing selector: ${targetSelector}`);
    }
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
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
            attr.name !== "data-owner",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => [attr.name, normalizeAttr(attr)] as const)
        .filter(([name, value]) => !(name === "class" && value === ""))
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
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
      return attr.name === "style"
        ? attr.value
            .replace(/\s+/g, "")
            .replace(/;$/u, "")
            .replaceAll('"', "'")
            .replace(
              /--x-([A-Za-z0-9-]+):/gu,
              (_match, name: string) =>
                `${name.replace(/[A-Z]/gu, (letter: string) => `-${letter.toLowerCase()}`)}:`,
            )
        : attr.value;
    }
  }, selector);
}

async function canonicalizeHtml(page: Page, html: string, selector?: string) {
  return page.evaluate(
    ({ input, targetSelector }) => {
      const template = document.createElement("template");
      template.innerHTML = input;
      const roots = targetSelector
        ? Array.from(template.content.querySelectorAll(targetSelector))
        : Array.from(template.content.children);
      return roots.map((root) => visit(root)).join("");

      function visit(node: Node): string {
        if (node.nodeType === Node.TEXT_NODE) {
          return normalizeText(node.textContent ?? "");
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
              attr.name !== "data-owner",
          )
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((attr) => [attr.name, normalizeAttr(attr)] as const)
          .filter(([name, value]) => !(name === "class" && value === ""))
          .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
          .join(" ");
        const open = attrs
          ? `<${node.tagName.toLowerCase()} ${attrs}>`
          : `<${node.tagName.toLowerCase()}>`;
        return `${open}${Array.from(node.childNodes)
          .map((child) => visit(child))
          .join("")}</${node.tagName.toLowerCase()}>`;
      }

      function normalizeText(text: string) {
        return text.replace(/\s+/g, " ").trim();
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
        return attr.name === "style"
          ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
          : attr.value;
      }
    },
    { input: html, targetSelector: selector },
  );
}
