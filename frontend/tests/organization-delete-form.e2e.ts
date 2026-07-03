import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const ORGANIZATION_DELETE_FORM_ROUTE_SOURCE = new URL(
  "../src/routes/organizations/$organizationName/deleteForm.tsx",
  import.meta.url,
);

const EXPECTED_ORGANIZATION_DELETE_FORM = `
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
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
<div class="project-header-outer" style="background-image:url('/assets/images/organization_default_logo.png')">
  <div class="project-header-inner">
    <div class="project-header-wrap">
      <div class="project-header-avatar"><img src="/assets/images/organization_default_logo.png"></div>
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
        <button type="button" class="close" data-dismiss="modal">×</button>
        <h3>Do you want to delete this group?</h3>
      </div>
      <div class="modal-body"><p> Are you sure you want to delete this group? </p></div>
      <div class="modal-footer">
        <button id="btnDeleteExec" type="button" class="ybtn ybtn-danger">Yes</button>
        <button type="button" class="ybtn" data-dismiss="modal">No</button>
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
  await expect(page.locator("#btnDelete")).toBeVisible();
  await expect(page.locator("#alertDeletion")).toHaveClass(/hide/);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_ORGANIZATION_DELETE_FORM.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("organization delete confirmation modal opens, closes, deletes, and redirects through SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const deleteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await auditOrganizationDeleteNativeListeners(page);
  await mockOrganizationAdmin(page, { deleteRequests });

  await page.goto(`${basePath}/organizations/weblabs/deleteForm`);
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide");
  await expect(page.locator("#alertDeletion")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.locator("#btnDelete").click();
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide in");
  await expect(page.locator("#alertDeletion")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);

  await page.locator("#alertDeletion .modal-footer .ybtn").filter({ hasText: "No" }).click();
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide");
  await expect(page.locator("#alertDeletion")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.locator("#btnDelete").click();
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide in");
  await page.locator("#alertDeletion .close").click();
  await expect(page.locator("#alertDeletion")).toHaveClass("modal hide");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await page.locator("#btnDelete").click();
  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/organizations/weblabs") &&
      response.request().method() === "DELETE",
  );
  await page.locator("#btnDeleteExec").click();
  await deleteResponsePromise;

  expect(deleteRequests).toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
  await expect(page).toHaveURL(basePath);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  expect(await readOrganizationDeleteNativeListenerAudit(page)).toEqual([]);
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
  expect(source).toMatch(
    /<span className="project-author">[\s\S]*?<Link[\s\S]*?to: `\/organizations\/\$\{organizationName\}`/,
  );
  expect(source).toContain('"aria-current": undefined');
  expect(source).toContain('"data-status": undefined');
});

async function mockOrganizationAdmin(
  page: Page,
  options: { deleteRequests?: { hasCsrfToken: boolean; method: string }[] } = {},
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
        logoUrl: "/assets/images/organization_default_logo.png",
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
        logoUrl: "/assets/images/organization_default_logo.png",
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
        logoUrl: "/assets/images/organization_default_logo.png",
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
