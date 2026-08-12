import { expect, test, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const EXPECTED_PROJECT_CREATE = `
<div class="unsupported hidden">
  <div class="unsupported-inner"><p id="unsupported-content"></p></div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <button class="pin" type="button" title="Sidebar" aria-controls="sidebar" aria-expanded="false">
      <i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i>
    </button>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
      <li class="divider"></li>
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
          <li class="myOrganizationList active"><button type="button">Favorite</button></li>
          <li class="myProjectList"><button type="button">Project</button></li>
          <li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" title="Shortcut (A)">
        <a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-item">
        <a href="__BASE_PATH__/sites/userList" title="Site administration" class="usermenu-icon-button show-progress-bar">
          <i class="yobicon-wrench"></i>
        </a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
        <button type="button" class="gnb-dropdown-toggle" title="User menu, Shortcut (F)">
          <span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span>
        </button>
      </li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn">
          <i class="yobicon-plus"></i><span class="caret"></span>
        </button>
        <ul class="dropdown-menu flat right">
          <li><a href="__BASE_PATH__/user/issues/new">New issue</a></li>
          <li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li>
          <li><hr class="no-margin"></li>
          <li><a href="__BASE_PATH__/projectform" class="active">Create new project</a></li>
          <li><a href="__BASE_PATH__/organizations/new">New Group</a></li>
        </ul>
      </li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="form-wrap new-project">
      <form id="newProjectForm" action="__BASE_PATH__/projects" method="post" class="frm-wrap">
        <legend>
          Create new project
          <span>
            <small>Or &nbsp; </small>
            <a href="__BASE_PATH__/_import?owner=admin" class="ybtn ybtn-small nm"><strong>Import Git repository.</strong></a>
          </span>
        </legend>
        <dl>
          <dt><label for="project-owner">Owner Name<strong>*</strong></label></dt>
          <dd>
            <select id="project-owner" name="owner" data-format="user" class="mb10" style="min-width: 220px;">
              <option value="admin">admin</option>
              <option value="weblabs">weblabs</option>
            </select>
          </dd>
          <dt><label for="project-name">Project name<strong>*</strong></label></dt>
          <dd><input id="project-name" type="text" name="name" class="text" maxlength="250" value="" placeholder="Enter project name in alphabetnumerical or symbol characters(_-.)"></dd>
          <dt><label for="description">Description</label></dt>
          <dd><textarea id="description" name="overview" class="text textarea.span4"></textarea></dd>
        </dl>
        <div class="advanced-options">
          <div class="row-fluid">
            <div class="span2 right-txt mt10">Share Options</div>
            <div class="span10">
              <ul class="unstyled project-scopes mt10">
                <li>
                  <input type="radio" id="public" name="projectScope" value="PUBLIC" class="radio-btn pull-left" checked="">
                  <label for="public"><strong class="ml5">PUBLIC</strong><p class="note">Anonymous users are able to access the project.</p></label>
                </li>
                <li id="opt-protected" class="mt10" style="display: none;">
                  <input type="radio" id="protected" name="projectScope" value="PROTECTED" class="radio-btn pull-left">
                  <label for="protected"><strong class="ml5">GROUP PUBLIC</strong><p class="note">Users in the group and also users who have been explicitly granted access are able to access the project.</p></label>
                </li>
                <li class="mt10">
                  <input type="radio" id="private" name="projectScope" value="PRIVATE" class="radio-btn pull-left">
                  <label for="private"><strong class="ml5">PRIVATE</strong><p class="note">Project access must be granted explicitly for each user, but basic information (name, description, etc.) can be exposed to public.</p></label>
                </li>
              </ul>
            </div>
          </div>
          <hr>
          <div class="row-fluid">
            <div class="span2 right-txt mt10"><label for="vcs">Repository type</label></div>
            <div class="span10 cu-desc">
              <select id="vcs" name="vcs" data-dropdown-css-class="select2-without-searchbox" class="mb10 mt5" style="min-width: 220px;">
                <option value="GIT">Git</option>
                <option value="SUBVERSION">Subversion</option>
              </select>
              <span class="ml10 notice is-hidden" id="svn">Subversion can't use pull request</span>
            </div>
          </div>
          <hr>
          <div class="row-fluid">
            <div class="span2 right-txt">Menu Setting</div>
            <div class="span10">
              <label for="menuSettingCode" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingCode" name="code" value="true" checked="">Code</label>
              <label for="menuSettingIssue" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingIssue" name="issue" value="true" checked="">Issue</label>
              <label for="menuSettingPullRequest" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingPullRequest" name="pullRequest" value="true" checked="">Pull request</label>
              <label for="menuSettingReview" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingReview" name="review" value="true" checked="">Review</label>
              <label for="menuSettingMilestone" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingMilestone" name="milestone" value="true" checked="">Milestone</label>
              <label for="menuSettingBoard" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingBoard" name="board" value="true" checked="">Board</label>
            </div>
          </div>
        </div>
        <div class="actions mt20">
          <button class="ybtn ybtn-success">Create a project</button>
          <a href="__BASE_PATH__/" class="ybtn">Cancel</a>
        </div>
      </form>
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

test("project create form matches legacy project/create.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);
  await expect(page).toHaveTitle("Create new project");
  expect(await page.evaluate(() => document.head.querySelector("title")?.textContent)).toBe(
    "Create new project",
  );
  await expect(page.locator("#newProjectForm")).toBeVisible();
  await expect(page.locator("#project-owner")).toHaveValue("admin");
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();
  await expect(page.locator(".actions.mt20 .ybtn").last()).toHaveAttribute("href", `${basePath}/`);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_CREATE.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await projectCreateMetrics(page)).toMatchObject({
    actionTextAlign: "center",
    actionButtonsContained: true,
    advancedBackground: "rgb(250, 250, 250)",
    advancedBorderRadius: "10px",
    formAction: `${basePath}/projects`,
    formMethod: "post",
    formWidth: 700,
    importLinkContained: true,
    // F5 dist-truth (2026-08-11): the name input spans the full form width.
    inputWidthRatio: 1,
    ownerDataFormat: "user",
    ownerDataToggle: null,
    ownerStyle: "min-width: 220px;",
    vcsDataDropdownCssClass: "select2-without-searchbox",
    vcsDataToggle: null,
    vcsStyle: "min-width: 220px;",
  });
});

test("project create form mirrors legacy owner, VCS, and menu dependencies", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);

  await page.locator("#project-owner").selectOption("weblabs");
  await expect(page.locator("#opt-protected")).toBeVisible();
  await page.locator("#protected").check();
  await page.locator("#project-owner").selectOption("admin");
  await expect(page.locator("#opt-protected")).toBeHidden();
  await expect(page.locator("#public")).toBeChecked();

  await page.locator("#vcs").selectOption("SUBVERSION");
  await expect(page.locator("#svn")).toBeVisible();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeHidden();
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();

  await page.locator("#vcs").selectOption("GIT");
  await expect(page.locator("#svn")).toBeHidden();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeVisible();
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();

  await page.locator("#menuSettingCode").uncheck();
  await expect(page.locator("#menuSettingCode")).not.toBeChecked();
  await expect(page.locator("#menuSettingPullRequest")).not.toBeChecked();
  await expect(page.locator("#menuSettingReview")).not.toBeChecked();

  await page.locator("#menuSettingPullRequest").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();

  await page.locator("#menuSettingReview").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();
});

test("project create select controls drop delegated select2 option markers only", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);

  const owner = page.locator("#project-owner");
  const vcs = page.locator("#vcs");
  const adminOption = owner.locator('option[value="admin"]');
  const groupOption = owner.locator('option[value="weblabs"]');
  await expect(owner).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(owner).toHaveAttribute("data-format", "user");
  await expect(owner).toHaveAttribute("style", "min-width: 220px;");
  await expect(adminOption).toHaveText("admin");
  await expect(adminOption).not.toHaveAttribute("data-type", /.+/u);
  await expect(adminOption).not.toHaveAttribute("data-avatar-url", /.+/u);
  await expect(groupOption).toHaveText("weblabs");
  await expect(groupOption).not.toHaveAttribute("data-type", /.+/u);
  await expect(groupOption).not.toHaveAttribute("data-avatar-url", /.+/u);
  await expect(vcs).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(vcs).toHaveAttribute("data-dropdown-css-class", "select2-without-searchbox");
  await expect(vcs).toHaveAttribute("style", "min-width: 220px;");

  await owner.selectOption("weblabs");
  await expect(page.locator("#opt-protected")).toBeVisible();
  await vcs.selectOption("SUBVERSION");
  await expect(page.locator("#svn")).toBeVisible();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeHidden();
});

test("project create form mirrors legacy project-name blur and validation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);
  let createRequests = 0;
  await page.route("**/api/v1/owners/*/projects", async (route) => {
    createRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerName: "admin",
        projectName: "valid-project",
      }),
    });
  });

  await page.goto(`${basePath}/projectform`);

  await page.locator("#project-name").fill("  project with spaces  ");
  await page.locator("#description").focus();
  await expect(page.locator("#project-name")).toHaveValue("project-with-spaces");

  await page.locator("#project-name").fill(".git");
  await page.locator("#newProjectForm button.ybtn-success").click();
  await expect(page.locator("#newProjectForm .popover-content")).toHaveText(
    "You can't use reserved names.",
  );
  expect(createRequests).toBe(0);

  await page.locator("#project-name").fill("invalid project!");
  await page.locator("#newProjectForm button.ybtn-success").click();
  await expect(page.locator("#newProjectForm .popover-content")).toHaveText(
    "Enter name in alphabetnumerical or symbol characters(_-.)",
  );
  expect(createRequests).toBe(0);
});

test("project create form honors configured default scope and menus", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript((configuredBasePath) => {
    (
      window as Window & {
        __YONA_RUNTIME_CONFIG__?: Record<string, unknown>;
      }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: configuredBasePath,
      projectDefaultMenus: ["issue", "board"],
      projectDefaultScope: "private",
    };
  }, basePath);
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);

  await expect(page.locator("#public")).not.toBeChecked();
  await expect(page.locator("#protected")).not.toBeChecked();
  await expect(page.locator("#private")).toBeChecked();
  await expect(page.locator("#menuSettingCode")).not.toBeChecked();
  await expect(page.locator("#menuSettingIssue")).toBeChecked();
  await expect(page.locator("#menuSettingPullRequest")).not.toBeChecked();
  await expect(page.locator("#menuSettingReview")).not.toBeChecked();
  await expect(page.locator("#menuSettingMilestone")).not.toBeChecked();
  await expect(page.locator("#menuSettingBoard")).toBeChecked();
});

test("project create form restores legacy server validation values", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page, {
    name: "restored-project",
    overview: "Restored overview",
    owner: "weblabs",
    projectScope: "PROTECTED",
    selectedOwnerName: "weblabs",
    vcs: "SUBVERSION",
  });

  await page.goto(`${basePath}/projectform`);

  await expect(page.locator("#project-owner")).toHaveValue("weblabs");
  await expect(page.locator("#project-name")).toHaveValue("restored-project");
  await expect(page.locator("#description")).toHaveValue("Restored overview");
  await expect(page.locator("#protected")).toBeChecked();
  await expect(page.locator("#vcs")).toHaveValue("SUBVERSION");
  await expect(page.locator("#svn")).toBeVisible();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeHidden();
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();
  await expect(page.locator("#newProjectForm legend a.ybtn-small")).toHaveAttribute(
    "href",
    `${basePath}/_import?owner=weblabs`,
  );
});

test("project create import link keeps legacy href and navigates through the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);
  const importLink = page.locator("#newProjectForm legend a.ybtn-small");

  await expect(importLink).toHaveAttribute("href", `${basePath}/_import?owner=admin`);
  await expect(importLink).toHaveClass("ybtn ybtn-small nm");
  await expect(importLink).toHaveText("Import Git repository.");

  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });
  await page.evaluate(() => {
    (window as Window & { __projectCreateSpaMarker?: string }).__projectCreateSpaMarker = "kept";
  });

  await importLink.click({ noWaitAfter: true });

  await expect(page).toHaveURL(`${basePath}/_import?owner=admin`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectCreateSpaMarker?: string }).__projectCreateSpaMarker,
      ),
    )
    .toBe("kept");
  expect(documentRequests).toEqual([]);
});

test("project create cancel link keeps root navigation and navigates through the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);
  const cancelLink = page.locator(".actions.mt20 .ybtn").last();

  await expect(cancelLink).toHaveAttribute("href", `${basePath}/`);
  await expect(cancelLink).not.toHaveAttribute("data-status", /.+/u);
  await expect(cancelLink).not.toHaveAttribute("aria-current", /.+/u);

  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });
  await page.evaluate(() => {
    (
      window as Window & { __projectCreateCancelSpaMarker?: string }
    ).__projectCreateCancelSpaMarker = "kept";
  });

  await cancelLink.click({ noWaitAfter: true });

  await expect(page).toHaveURL(`${basePath}/`);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __projectCreateCancelSpaMarker?: string })
            .__projectCreateCancelSpaMarker,
      ),
    )
    .toBe("kept");
  expect(documentRequests).toEqual([]);
});

test("project create route source keeps cancel navigation on a normal TanStack Link", () => {
  const routeSource = readFileSync(
    new URL("../src/routes/projectform.tsx", import.meta.url),
    "utf8",
  );

  expect(routeSource).toContain(
    'import { Link, createFileRoute, useRouter } from "@tanstack/react-router";',
  );
  expect(routeSource).toContain('<title>{t("title.newProject")}</title>');
  expect(routeSource).toContain('to="/_import"');
  expect(routeSource).toContain("<Link");
  expect(routeSource).toContain('to="/"');
  expect(routeSource).toContain("activeOptions={legacyProjectCreateCancelLinkActiveOptions}");
  expect(routeSource).toContain("const legacyProjectCreateCancelLinkActiveProps = {");
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain("className: undefined");
  expect(routeSource).toContain('"data-status": undefined');
  expect(routeSource).toContain("activeProps={legacyProjectCreateCancelLinkActiveProps}");
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toContain("reactJsx");
  expect(routeSource).not.toContain("useLinkProps");
  expect(routeSource).not.toContain("ProjectCreateRootLink");
  expect(routeSource).not.toContain("ProjectCreateRootLinkAnchor");
  expect(routeSource).not.toContain("legacyCancelHref");
  expect(routeSource).not.toContain("legacyRootHref");
  expect(routeSource).not.toContain("LegacyHrefAnchor");
  expect(routeSource).not.toContain("React.createElement");
  expect(routeSource).not.toContain("forwardRef");
  expect(routeSource).not.toContain("router.history.push(cancelNavigationHref);");
  expect(routeSource).not.toContain(
    'const cancelNavigationHref = prefixBasePath(runtimeConfig.basePath, "/");',
  );
  expect(routeSource).not.toMatch(/<a\b/u);
  expect(routeSource).not.toContain('<Link to="/" className="ybtn">');
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).not.toContain("globalThis.document");
  expect(routeSource).not.toContain("window.document");
  expect(routeSource).not.toMatch(/use(?:Layout)?Effect\s*\([^)]*title/iu);
  expect(routeSource).not.toMatch(/title\s*=\s*["'`]Create new project/iu);
});

test("project create route source drops delegated select2 initializer markers only", () => {
  const routeSource = readFileSync(
    new URL("../src/routes/projectform.tsx", import.meta.url),
    "utf8",
  );

  expect(routeSource).not.toContain('data-toggle="select2"');
  expect(routeSource).not.toContain('data-toggle="select2"');
  expect(routeSource).not.toContain("data-toggle={'select2'}");
  expect(routeSource).not.toContain('data-toggle={"select2"}');
  expect(routeSource).not.toContain("data-type={option.organization");
  expect(routeSource).not.toContain("data-avatar-url={option.avatarUrl");
  expect(routeSource).toContain('data-format="user"');
  expect(routeSource).toContain('data-dropdown-css-class="select2-without-searchbox"');
  expect(routeSource).toContain('id="project-owner"');
  expect(routeSource).toContain('id="vcs"');
});

async function mockProjectCreate(page: Page, formOptions: Record<string, unknown> = {}) {
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
  await page.route("**/api/v1/projects/form-options*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerOptions: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            organization: false,
            ownerName: "admin",
            selected: true,
          },
          {
            avatarUrl: "/assets/images/organization_default_logo.png",
            organization: true,
            ownerName: "weblabs",
            selected: false,
          },
        ],
        selectedOwnerName: "admin",
        ...formOptions,
      }),
    });
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    // e2e closure ledger (2026-08-11): the workspace pane loads async —
    // pin the fixture Loading... state like the project-delete-form
    // canonicalizer.
    document.querySelectorAll("#usermenu-tab-content-list").forEach((element) => {
      element.replaceChildren(document.createTextNode("Loading..."));
    });
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-owner=global-gnb-outer], .page-wrap-outer, [data-owner=site-footer]",
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      if (
        name === "class" &&
        (current.matches('[data-owner="global-gnb-inner"]') ||
          current.matches('[data-owner="global-gnb-outer"]') ||
          current.matches('[data-owner="site-footer"]') ||
          current.matches('[data-owner="site-footer-inner"]') ||
          current.matches('[data-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      const value = current.getAttribute(name) ?? "";
      if (
        name === "class" &&
        value.split(/\s+/u).includes("gnb-nav") &&
        current.matches('[data-owner="global-gnb-nav"]')
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
          .join(" ");
      }
      if (name === "class") {
        return value
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
      return name === "style" ? normalizeStyleAttr(value) : value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'");
      if (!normalized.includes("--x-") || !normalized.includes("url(")) {
        return normalized;
      }
      return normalized
        .replace(
          /(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\/([^'")]+?)-[A-Za-z0-9]{8}([^'")]*)(['"]?\))/gu,
          "$1src/assets/legacy/$2$3$4)",
        )
        .replace(/(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\//gu, "$1src/assets/legacy/");
    }

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "maxlength",
        "placeholder",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "style",
        "checked",
        "selected",
        "data-toggle",
        "data-placement",
        "data-format",
        "data-dropdown-css-class",
      ];
      const attrs = stableAttributes
        .filter(
          (name) =>
            current.hasAttribute(name) &&
            !(name === "class" && normalizeSiteLayoutGnbNavAttribute(current, name) === ""),
        )
        .map(
          (name) => `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
        )
        .sort()
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }
  });
}

async function projectCreateMetrics(page: Page) {
  return page.evaluate(() => {
    const formWrap = requireElement(".form-wrap.new-project");
    const form = requireElement<HTMLFormElement>("#newProjectForm");
    const owner = requireElement<HTMLSelectElement>("#project-owner");
    const vcs = requireElement<HTMLSelectElement>("#vcs");
    const nameInput = requireElement<HTMLInputElement>("#project-name");
    const advanced = requireElement(".advanced-options");
    const actions = requireElement(".actions");
    const submitButton = requireElement<HTMLButtonElement>(".actions .ybtn-success");
    const cancelLink = requireElement<HTMLAnchorElement>(".actions a.ybtn");
    const legend = requireElement("legend");
    const importLink = requireElement<HTMLAnchorElement>("legend a.ybtn-small");
    const formWrapRect = formWrap.getBoundingClientRect();
    const nameRect = nameInput.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const submitRect = submitButton.getBoundingClientRect();
    const cancelRect = cancelLink.getBoundingClientRect();
    const legendRect = legend.getBoundingClientRect();
    const importRect = importLink.getBoundingClientRect();
    const advancedStyle = getComputedStyle(advanced);

    return {
      actionTextAlign: getComputedStyle(actions).textAlign,
      actionButtonsContained:
        submitRect.top >= actionsRect.top &&
        cancelRect.top >= actionsRect.top &&
        submitRect.bottom <= actionsRect.bottom &&
        cancelRect.bottom <= actionsRect.bottom &&
        submitRect.left >= actionsRect.left &&
        cancelRect.right <= actionsRect.right,
      advancedBackground: advancedStyle.backgroundColor,
      advancedBorderRadius: advancedStyle.borderTopLeftRadius,
      formAction: form.getAttribute("action"),
      formMethod: form.getAttribute("method"),
      formWidth: Math.round(formWrapRect.width),
      importLinkContained:
        importRect.top >= legendRect.top &&
        importRect.bottom <= legendRect.bottom &&
        importRect.left >= legendRect.left &&
        importRect.right <= legendRect.right,
      inputWidthRatio: Number((nameRect.width / formWrapRect.width).toFixed(2)),
      ownerDataFormat: owner.getAttribute("data-format"),
      ownerDataToggle: owner.getAttribute("data-toggle"),
      ownerStyle: owner.getAttribute("style"),
      vcsDataDropdownCssClass: vcs.getAttribute("data-dropdown-css-class"),
      vcsDataToggle: vcs.getAttribute("data-toggle"),
      vcsStyle: vcs.getAttribute("style"),
    };

    function requireElement<T extends HTMLElement = HTMLElement>(selector: string) {
      const element = document.querySelector<T>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      const value = current.getAttribute(name) ?? "";
      const isSiteLayoutHeader =
        name === "class" &&
        value.split(/\s+/u).includes("gnb-outer") &&
        current.matches("header.gnb-outer") &&
        current.querySelector(':scope > div.gnb-inner form[name="gnb-search-form"]') !== null;
      const isSiteLayoutFooterOuter =
        name === "class" &&
        value.split(/\s+/u).includes("page-footer-outer") &&
        current.matches("footer.page-footer-outer") &&
        current.querySelector(":scope > div.page-footer > span.provider") !== null;
      const isSiteLayoutFooterInner =
        name === "class" &&
        value.split(/\s+/u).includes("page-footer") &&
        current.matches("footer.page-footer-outer > div.page-footer") &&
        current.querySelector(":scope > span.provider") !== null;
      const isSiteLayoutFooterProvider =
        name === "class" &&
        value.split(/\s+/u).includes("provider") &&
        current.matches("footer.page-footer-outer > div.page-footer > span.provider");
      const retiredToken = isSiteLayoutFooterOuter
        ? "page-footer-outer"
        : isSiteLayoutFooterInner
          ? "page-footer"
          : isSiteLayoutFooterProvider
            ? "provider"
            : isSiteLayoutHeader && value.split(/\s+/u).includes("project-header")
              ? "project-header"
              : isSiteLayoutHeader
                ? "gnb-outer"
                : name === "class" &&
                    value.split(/\s+/u).includes("gnb-inner") &&
                    current.matches("header.gnb-outer > div.gnb-inner") &&
                    current.querySelector('form[name="gnb-search-form"]') !== null
                  ? "gnb-inner"
                  : name === "class" &&
                      value.split(/\s+/u).includes("gnb-nav") &&
                      current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                      current.querySelector('form[name="gnb-search-form"]') !== null
                    ? "gnb-nav"
                    : null;
      if (retiredToken) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== retiredToken)
          .join(" ");
      }
      if (name === "class") {
        return value
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
      return name === "style" ? normalizeStyleAttr(value) : value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'");
      if (!normalized.includes("--x-") || !normalized.includes("url(")) {
        return normalized;
      }
      return normalized
        .replace(
          /(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\/([^'")]+?)-[A-Za-z0-9]{8}([^'")]*)(['"]?\))/gu,
          "$1src/assets/legacy/$2$3$4)",
        )
        .replace(/(--x-[A-Za-z0-9-]+:url\(['"]?)\/yona\/assets\//gu, "$1src/assets/legacy/");
    }

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "maxlength",
        "placeholder",
        "autocomplete",
        "accesskey",
        "href",
        "target",
        "title",
        "style",
        "checked",
        "selected",
        "data-toggle",
        "data-placement",
        "data-format",
        "data-dropdown-css-class",
      ];
      const attrs = stableAttributes
        .filter(
          (name) =>
            current.hasAttribute(name) &&
            !(name === "class" && normalizeSiteLayoutGnbNavAttribute(current, name) === ""),
        )
        .map(
          (name) => `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
        )
        .sort()
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }
  }, html);
}
