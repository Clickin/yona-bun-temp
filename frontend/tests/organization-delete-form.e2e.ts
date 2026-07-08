import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

const ORGANIZATION_DELETE_FORM_ROUTE_SOURCE = new URL(
  "../src/routes/organizations/$organizationName/deleteForm.tsx",
  import.meta.url,
);

const EXPECTED_ORGANIZATION_DELETE_FORM = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer project-header">
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
        <form action="__BASE_PATH__/organizations/weblabs/search" class="input-prepend gnb-search-form" name="gnb-search-form">
          <input type="hidden" name="searchType" value="auto">
          <div class="btn-group">
            <button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Group</button>
            <ul class="dropdown-menu flat right">
              <li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/search">All Projects</button></li>
            </ul>
          </div>
          <div class="search-box select">
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" data-toggle="tooltip" data-placement="bottom" title="Site administration"><i class="yobicon-wrench"></i></a></li>
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
      <li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform">Setting</a></li>
      <li class=""><a href="__BASE_PATH__/organizations/weblabs/members">Group member</a></li>
      <li class="active"><a href="__BASE_PATH__/organizations/weblabs/deleteForm">Group Delete</a></li>
    </ul>
    <div class="box-wrap bottom">
      <button id="btnDelete" type="button" class="ybtn ybtn-danger">Delete This Group</button>
    </div>
    <div id="alertDeletion" class="modal hide">
      <div class="modal-header">
        <button type="button" class="close">×</button>
        <h3>Do you want to delete this group?</h3>
      </div>
      <div class="modal-body"><p> Are you sure you want to delete this group? </p></div>
      <div class="modal-footer">
        <button id="btnDeleteExec" type="button" class="ybtn ybtn-danger">Yes</button>
        <button type="button" class="ybtn">No</button>
      </div>
    </div>
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

test("organization delete form matches legacy organization/deleteForm.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationAdmin(page);

  await page.goto(`${basePath}/organizations/weblabs/deleteForm`);
  await expect(page).toHaveTitle("weblabs");
  await expect(page.locator("#btnDelete")).toBeVisible();
  await expect(page.locator("#alertDeletion")).toHaveClass(/hide/);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_ORGANIZATION_DELETE_FORM.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("organization delete form restores localhost organization shell and scoped navbar layout", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationAdmin(page);

  await page.goto(`${basePath}/organizations/weblabs/deleteForm`);

  await expect(page).toHaveTitle("weblabs");
  await expect(page.locator("header.gnb-outer")).toHaveClass(/project-header/);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  await expect(page.locator(".project-header-outer")).toHaveAttribute(
    "style",
    /group_default\.png/u,
  );
  await expect(page.locator(".project-header-avatar img")).toHaveAttribute(
    "src",
    "/assets/images/group_default.png",
  );
  await expect(page.locator(".gnb-nav > li > a")).toHaveText(["Y", "List All", "Feedback"]);

  const boxes = await page.evaluate(() => {
    const navbar = document.querySelector(".gnb-outer");
    const scopeButton = document.querySelector("#gnb-search-scope-title");
    const searchBox = document.querySelector(".gnb-search-form .search-box");
    if (!navbar || !scopeButton || !searchBox) {
      return null;
    }
    return {
      navbar: navbar.getBoundingClientRect(),
      scopeButton: scopeButton.getBoundingClientRect(),
      searchBox: searchBox.getBoundingClientRect(),
    };
  });
  expect(boxes).not.toBeNull();
  expect(boxes!.scopeButton.top).toBeGreaterThanOrEqual(boxes!.navbar.top);
  expect(boxes!.scopeButton.bottom).toBeLessThanOrEqual(boxes!.navbar.bottom);
  expect(boxes!.searchBox.top).toBeGreaterThanOrEqual(boxes!.navbar.top);
  expect(boxes!.searchBox.bottom).toBeLessThanOrEqual(boxes!.navbar.bottom);
  expect(boxes!.searchBox.right).toBeLessThanOrEqual(boxes!.navbar.right);
});

test("organization delete confirmation modal opens, closes, deletes, and redirects through SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const deleteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await auditOrganizationDeleteNativeListeners(page);
  await mockOrganizationAdmin(page, { deleteRequests });

  await page.goto(`${basePath}/organizations/weblabs/deleteForm`);
  await installOrganizationDeleteModalBridgeAudit(page, ["alertDeletion"]);
  await rememberSpaMarker(page, "organization-delete-modal");
  const deleteFormUrl = page.url();
  await expect(page.locator('a[href="#alertDeletion"][data-toggle="modal"]')).toHaveCount(0);
  const deleteButton = page.locator('#btnDelete[type="button"]');
  const deleteModal = page.locator("#alertDeletion");
  const closeButton = page.locator("#alertDeletion .close");
  const noButton = page.locator("#alertDeletion .modal-footer .ybtn").filter({ hasText: "No" });
  await expect(deleteButton).toHaveClass("ybtn ybtn-danger");
  await expect(deleteButton).not.toHaveAttribute("data-toggle");
  await expect(deleteButton).not.toHaveAttribute("data-target");
  await expect(deleteModal).toHaveClass("modal hide");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(deleteModal).not.toHaveAttribute("aria-hidden");
  await expect(deleteModal).not.toHaveAttribute("style");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(deleteFormUrl);
  expect(await spaMarker(page)).toBe("organization-delete-modal");

  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal hide in");
  await expect(deleteModal).toHaveCSS("display", "block");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  await expect(deleteModal).toHaveAttribute("style", "display: block;");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(closeButton).not.toHaveAttribute("data-dismiss");
  await expect(noButton).not.toHaveAttribute("data-dismiss");
  await expect(page).toHaveURL(deleteFormUrl);
  expect(await spaMarker(page)).toBe("organization-delete-modal");
  await expect
    .poll(() => organizationDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });

  expect(await dispatchCancelableClick(noButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal hide");
  await expect(deleteModal).toHaveCSS("display", "none");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(deleteModal).toHaveAttribute("style", "display: none;");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(deleteFormUrl);
  expect(await spaMarker(page)).toBe("organization-delete-modal");
  await expect
    .poll(() => organizationDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });

  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal hide in");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "false");
  await expect(deleteModal).toHaveAttribute("style", "display: block;");
  expect(await dispatchCancelableClick(closeButton)).toBe(false);
  await expect(deleteModal).toHaveClass("modal hide");
  await expect(deleteModal).toHaveAttribute("aria-hidden", "true");
  await expect(deleteModal).toHaveAttribute("style", "display: none;");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(deleteFormUrl);
  expect(await spaMarker(page)).toBe("organization-delete-modal");
  await expect
    .poll(() => organizationDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });

  await rememberSpaMarker(page, "kept");
  expect(await dispatchCancelableClick(deleteButton)).toBe(false);
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/organizations/weblabs") &&
      response.request().method() === "DELETE",
  );
  await page.locator("#btnDeleteExec").click();
  await deleteResponsePromise;

  expect(deleteRequests).toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
  await expect(page).toHaveURL(basePath);
  await expect.poll(() => spaMarker(page)).toBe("kept");
  await expect
    .poll(() => organizationDeleteModalBridgeAuditHits(page))
    .toEqual({ documentClicks: [], getElementById: [] });
  expect(await readOrganizationDeleteNativeListenerAudit(page)).toEqual([]);
});

test("organization delete failure closes modal and shows legacy alert", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const alerts: string[] = [];
  page.on("dialog", async (dialog) => {
    alerts.push(dialog.message());
    await dialog.accept();
  });
  await mockOrganizationAdmin(page, {
    deleteFailure: {
      code: "organization.delete.impossible.project.exist",
      status: 400,
    },
  });

  await page.goto(`${basePath}/organizations/weblabs/deleteForm`);
  await page.locator("#btnDelete").click();
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide in");

  await page.locator("#btnDeleteExec").click();

  await expect.poll(() => alerts).toEqual(["You cannot delete a group that has projects)."]);
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide");
  await expect(page.locator("#alertDeletion")).toHaveCSS("display", "none");
  await expect(page.locator("#alertDeletion")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#alertDeletion")).toHaveAttribute("style", "display: none;");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/deleteForm`);
});

test("organization delete modal source insulates delegated modal bridge", () => {
  const source = readFileSync(ORGANIZATION_DELETE_FORM_ROUTE_SOURCE, "utf8");
  const modalSource = source.slice(
    source.indexOf("function insulateOrganizationDeleteModalButtonClick"),
    source.indexOf("function OrganizationMenu"),
  );

  expect(modalSource).toContain(
    "function insulateOrganizationDeleteModalButtonClick(event: MouseEvent<HTMLButtonElement>) {",
  );
  expect(modalSource).toContain("event.preventDefault();");
  expect(modalSource).toContain("event.stopPropagation();");
  expect(modalSource).toContain(
    "const openDeletionModal = (event: MouseEvent<HTMLButtonElement>) => {",
  );
  expect(modalSource).toContain(
    "const dismissDeletionModal = (event: MouseEvent<HTMLButtonElement>) => {",
  );
  expect(modalSource).toContain(
    "const [deletionModalWasOpened, setDeletionModalWasOpened] = useState(false);",
  );
  expect(modalSource).toContain("setDeletionModalWasOpened(true);");
  expect(modalSource).toContain("setDeletionModalOpen(true);");
  expect(modalSource).toContain("closeDeletionModal();");
  expect(modalSource).toContain(
    "aria-hidden={deletionModalWasOpened ? !deletionModalOpen : undefined}",
  );
  expect(modalSource).toContain('display: deletionModalOpen ? "block" : "none"');
  expect(modalSource).not.toContain('data-toggle="modal"');
  expect(modalSource).not.toContain('data-target="#alertDeletion"');
  expect(modalSource).not.toContain('data-dismiss="modal"');
  expect(modalSource).toContain("onClick={openDeletionModal}");
  expect(modalSource.match(/onClick=\{dismissDeletionModal\}/gu) ?? []).toHaveLength(2);
  expect(modalSource).not.toContain("document.");
  expect(modalSource).not.toContain("classList");
  expect(modalSource).not.toContain("style.display");
  expect(modalSource).not.toContain("addEventListener(");
});

test("organization delete navigation anchors preserve legacy hrefs without native listeners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installOrganizationDeleteNavigationAnchorAudit(page);
  await mockOrganizationAdmin(page);

  await page.goto(`${basePath}/organizations/weblabs/deleteForm`);

  const menuLinks = page.locator(".project-menu-gruop a");
  await expect(menuLinks).toHaveCount(4);
  await expect(menuLinks.nth(0)).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await expect(menuLinks.nth(1)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/issues`,
  );
  await expect(menuLinks.nth(2)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards`,
  );
  await expect(menuLinks.nth(3)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/pullrequests`,
  );

  const adminLinks = page.locator(".project-setting a");
  await expect(adminLinks).toHaveCount(1);
  await expect(adminLinks.first()).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/settingform`,
  );

  const tabLinks = page.locator(".project-page-wrap > .nav.nav-tabs a");
  await expect(tabLinks).toHaveCount(3);
  await expect(tabLinks.nth(0)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/settingform`,
  );
  await expect(tabLinks.nth(1)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/members`,
  );
  await expect(tabLinks.nth(2)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/deleteForm`,
  );

  expect(await readOrganizationDeleteNavigationAnchorAudit(page)).toEqual([]);
});

test("organization delete menu settings link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationAdmin(page);

  await page.goto(`${basePath}/organizations/weblabs/deleteForm`);
  const settingsLink = page.locator(".project-page-wrap > .nav.nav-tabs a").filter({
    hasText: "Setting",
  });
  await expect(settingsLink).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/settingform`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await settingsLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/settingform`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs li").first()).toHaveClass("active");
  await expect(page.locator("#saveSetting")).toBeVisible();
});

test("organization delete menu home link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationAdmin(page);

  await page.goto(`${basePath}/organizations/weblabs/deleteForm`);
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
  await expect(page.locator(".project-menu-gruop li").first()).toHaveClass("active");
  await expect(page.locator("#mylist-filter")).toBeVisible();
});

test("organization delete breadcrumb organization link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationAdmin(page);

  await page.goto(`${basePath}/organizations/weblabs/deleteForm`);
  const breadcrumbLink = page.locator(".project-breadcrumb .project-author > a");
  await expect(breadcrumbLink).toHaveText("weblabs");
  await expect(breadcrumbLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await expect(breadcrumbLink).not.toHaveAttribute("aria-current");
  await expect(breadcrumbLink).not.toHaveAttribute("data-status");
  expect(await breadcrumbLink.getAttribute("class")).toBeNull();

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
  await expect(page.locator("#mylist-filter")).toBeVisible();
});

test("organization delete breadcrumb source uses direct Link", () => {
  const source = readFileSync(ORGANIZATION_DELETE_FORM_ROUTE_SOURCE, "utf8");
  expect(source).not.toContain("function organizationHref");
  expect(source).not.toContain("organizationHref(");
  expect(source).not.toContain("<a href={organizationHref");
  expect(source).not.toContain("Parameters<typeof Link>");
  expect(source).not.toContain("as unknown as");
  expect(source).toMatch(
    /<span className="project-author">[\s\S]*?<Link[\s\S]*?to="\/organizations\/\$organizationName"/,
  );
  expect(source).toContain('"aria-current": undefined');
  expect(source).toContain('"data-status": undefined');
});

test("organization delete source renders legacy title without route-local document mutation", () => {
  const source = readFileSync(ORGANIZATION_DELETE_FORM_ROUTE_SOURCE, "utf8");
  expect(source).toContain("<title>{organizationName}</title>");
  expect(source).not.toContain("useEffect");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain("globalThis.document");
  expect(source).not.toContain('globalThis["document"]');
});

async function mockOrganizationAdmin(
  page: Page,
  options: {
    deleteFailure?: { code: string; status: number };
    deleteRequests?: { hasCsrfToken: boolean; method: string }[];
  } = {},
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
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-organization-delete" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs", async (route) => {
    if (route.request().method() === "DELETE") {
      const request = route.request();
      options.deleteRequests?.push({
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-organization-delete",
        method: request.method(),
      });
      if (options.deleteFailure) {
        await route.fulfill({
          contentType: "application/json",
          status: options.deleteFailure.status,
          body: JSON.stringify({ errorMsg: options.deleteFailure.code }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true, redirectPath: "/" }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Web labs group",
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanUpdate: true,
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
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanLeave: true,
        viewerCanUpdate: true,
        visibleProjects: [],
      }),
    });
  });
}

async function auditOrganizationDeleteNativeListeners(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const records: string[] = [];
    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (
        this instanceof Element &&
        (this.id === "btnDelete" ||
          this.id === "alertDeletion" ||
          Boolean(this.closest("#alertDeletion")))
      ) {
        records.push(`${this.id || this.className}:${type}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    (
      window as Window & typeof globalThis & { __organizationDeleteNativeListenerAudit?: string[] }
    ).__organizationDeleteNativeListenerAudit = records;
  });
}

async function installOrganizationDeleteModalBridgeAudit(page: Page, modalIds: string[]) {
  await page.evaluate((ids) => {
    type GuardedWindow = typeof window & {
      __organizationDeleteModalBridgeAudit?: {
        documentClicks: string[];
        getElementById: string[];
      };
      __organizationDeleteModalBridgeAuditArmed?: boolean;
      __organizationDeleteModalBridgeNativeGetElementById?: typeof Document.prototype.getElementById;
    };
    const guardedWindow = window as GuardedWindow;
    guardedWindow.__organizationDeleteModalBridgeAudit = {
      documentClicks: [],
      getElementById: [],
    };
    guardedWindow.__organizationDeleteModalBridgeNativeGetElementById ??=
      Document.prototype.getElementById;
    const nativeGetElementById = guardedWindow.__organizationDeleteModalBridgeNativeGetElementById;

    Document.prototype.getElementById = function guardedGetElementById(id: string) {
      if (ids.includes(id)) {
        guardedWindow.__organizationDeleteModalBridgeAudit?.getElementById.push(id);
      }
      return nativeGetElementById.call(this, id);
    };

    if (guardedWindow.__organizationDeleteModalBridgeAuditArmed) {
      return;
    }

    guardedWindow.__organizationDeleteModalBridgeAuditArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridgeTarget = target?.closest('[data-toggle="modal"], [data-dismiss="modal"]');
      if (bridgeTarget) {
        guardedWindow.__organizationDeleteModalBridgeAudit?.documentClicks.push(
          `${bridgeTarget.tagName.toLowerCase()}:${bridgeTarget.getAttribute("data-toggle") ?? ""}:${bridgeTarget.getAttribute("data-dismiss") ?? ""}`,
        );
      }
    });
  }, modalIds);
}

async function organizationDeleteModalBridgeAuditHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __organizationDeleteModalBridgeAudit?: {
              documentClicks: string[];
              getElementById: string[];
            };
          }
      ).__organizationDeleteModalBridgeAudit ?? { documentClicks: [], getElementById: [] },
  );
}

async function rememberSpaMarker(page: Page, marker: string) {
  await page.evaluate((nextMarker) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      nextMarker;
  }, marker);
}

async function spaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function dispatchCancelableClick(locator: Locator) {
  return locator.evaluate((element) => {
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    return element.dispatchEvent(clickEvent);
  });
}

async function readOrganizationDeleteNativeListenerAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __organizationDeleteNativeListenerAudit?: string[] }
      ).__organizationDeleteNativeListenerAudit ?? [],
  );
}

async function installOrganizationDeleteNavigationAnchorAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__organizationDeleteNavigationAnchorListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithOrganizationDeleteAnchorAudit(
      type,
      listener,
      options,
    ) {
      if (
        this.matches(
          ".project-menu-gruop a, .project-setting a, .project-page-wrap > .nav.nav-tabs a",
        )
      ) {
        (
          window as Window &
            typeof globalThis & { __organizationDeleteNavigationAnchorListeners: string[] }
        ).__organizationDeleteNavigationAnchorListeners.push(`${this.className}:${String(type)}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readOrganizationDeleteNavigationAnchorAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __organizationDeleteNavigationAnchorListeners?: string[] }
      ).__organizationDeleteNavigationAnchorListeners ?? [],
  );
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, .page-footer-outer",
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .filter((attr) => attr.name !== "aria-current" && attr.name !== "data-status")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .filter((attr) => attr.name !== "aria-current" && attr.name !== "data-status")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  }, html);
}
