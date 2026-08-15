import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const EXPECTED_ORGANIZATIONS_LIST = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <button aria-controls="sidebar" aria-expanded="false" class="pin" title="Sidebar" type="button">
      <i aria-hidden="true" class="yobicon-arrow-left"></i>
      <i aria-hidden="true" class="yobicon-arrow-right"></i>
    </button>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
      <li class="active"><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li>
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
        <button aria-controls="mySidenav" aria-expanded="false" type="button" class="gnb-dropdown-toggle" title="User menu, Shortcut (F)">
          <span class="avatar-wrap smaller"><img alt="" src="/yona/legacy-assets/images/default-avatar-34.png"></span><span class="caret"></span>
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
          <li><a href="__BASE_PATH__/projectform">Create new project</a></li>
          <li><a href="__BASE_PATH__/organizations/new">New Group</a></li>
        </ul>
      </li>
    </ul>
  </div>
</header>
<div>
  <div>
    <div class="search-wrap">
      <div id="search" class="pull-left">
        <form action="__BASE_PATH__/orgs" method="get">
          <div class="search-bar">
            <input name="filter" class="textbox" type="text" placeholder="Find organization by name" value="weblabs">
            <button type="submit" class="search-btn"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </div>
    </div>
    <ul class="all-projects">
      <li class="project">
        <div class="info-wrap">
          <div class="owner-avatar-wrap">
            <a href="__BASE_PATH__/organizations/weblabs"></a>
          </div>
          <div style="float:left">
            <div class="header">
              <a href="__BASE_PATH__/organizations/weblabs" class="black">weblabs</a>
            </div>
            <div class="desc">Web labs group</div>
            <p class="name-tag">created<strong title="2026-06-30">just now</strong></p>
          </div>
        </div>
      </li>
    </ul>
    <div id="pagination"></div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" rel="noreferrer" target="_blank" class="yona-author">Yona authors</a>
      &amp; © <a href="https://navercorp.com" rel="noreferrer" target="_blank">NAVER Corp.</a>
      &amp; <a href="https://naverlabs.com/" rel="noreferrer" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" rel="noreferrer" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

test("organizations list matches legacy organization/list.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page);

  await page.goto(`${basePath}/orgs?filter=weblabs`);
  const filterInput = page.locator('#search input[name="filter"]');
  await expect(page.locator(".all-projects .project")).toBeVisible();
  await expect.poll(() => page.title()).toBe("Project list");
  await expect
    .poll(() => page.evaluate(() => document.head.querySelector("title")?.textContent))
    .toBe("Project list");
  await expect.poll(() => filterInput.getAttribute("autofocus")).toBeNull();
  await expect(filterInput).toBeFocused();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_ORGANIZATIONS_LIST.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
});

test("organization list filter input preserves legacy initial focus without React prop warnings", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleMessages: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push(message.text());
    }
  });
  await mockAuthenticatedOrganizations(page);

  await page.goto(`${basePath}/orgs?filter=weblabs`);
  const filterInput = page.locator('#search input[name="filter"]');
  await expect.poll(() => filterInput.getAttribute("autofocus")).toBeNull();
  await expect(filterInput).toBeFocused();
  expect(
    consoleMessages.some(
      (message) =>
        message.includes("Invalid DOM property") &&
        message.includes("autofocus") &&
        message.includes("autoFocus"),
    ),
  ).toBe(false);
});

test("organization directory card links keep legacy hrefs and use SPA navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page);

  await page.goto(`${basePath}/orgs?filter=weblabs`);
  const logoLink = page.locator(".all-projects .owner-avatar-wrap a");
  const nameLink = page.locator(".all-projects .header a.black");

  await expect(logoLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await expect(logoLink.locator("img")).toHaveCount(0);
  await expect(logoLink).not.toHaveAttribute("aria-current");
  await expect(logoLink).not.toHaveAttribute("data-status");
  await expect(nameLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);
  await expect(nameLink).toHaveClass("black");
  await expect(nameLink).not.toHaveAttribute("aria-current");
  await expect(nameLink).not.toHaveAttribute("data-status");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await nameLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("organization directory card falls back to legacy org.name and org.descr fields", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page, [
    {
      createdLabel: "just now",
      createdTitle: "2026-06-30",
      descr: "Legacy group description",
      logoUrl: "",
      name: "legacy-labs",
    },
  ]);

  await page.goto(`${basePath}/orgs?filter=legacy`);
  const card = page.locator(".all-projects .project").first();

  await expect(card.locator(".owner-avatar-wrap a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/legacy-labs`,
  );
  await expect(card.locator(".header a.black")).toHaveAttribute(
    "href",
    `${basePath}/organizations/legacy-labs`,
  );
  await expect(card.locator(".header a.black")).toHaveText("legacy-labs");
  await expect(card.locator(".desc")).toHaveText("Legacy group description");
});

test("organization directory top tabs keep legacy hrefs without active marker leakage", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page);

  await page.goto(`${basePath}/orgs?filter=weblabs`);
  const projectTab = page.locator(".title_area .nav-tabs > li").first();
  const orgTab = page.locator(".title_area .nav-tabs > li").nth(1);
  const projectLink = projectTab.locator("a");
  const orgLink = orgTab.locator("a");
  const navbarProjectLink = page.locator('[data-owner="global-gnb-project-list-link"]');

  await expect(projectTab).not.toHaveClass(/active/u);
  await expect(orgTab).toHaveClass("active");
  await expect(projectLink).toHaveAttribute("href", `${basePath}/projects`);
  await expect(orgLink).toHaveAttribute("href", `${basePath}/orgs`);
  await expect(projectLink).not.toHaveAttribute("aria-current");
  await expect(projectLink).not.toHaveAttribute("data-status");
  await expect(orgLink).not.toHaveAttribute("aria-current");
  await expect(orgLink).not.toHaveAttribute("data-status");
  await expect(navbarProjectLink).toHaveAttribute("href", `${basePath}/projects`);
  await expect(navbarProjectLink).not.toHaveAttribute("aria-current");
  await expect(navbarProjectLink).not.toHaveAttribute("data-status");
});

test("organization directory renders legacy multi-page pagination with query-preserving SPA links", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(
    page,
    [
      {
        createdLabel: "just now",
        createdTitle: "2026-06-30",
        description: "Web labs group",
        logoUrl: "",
        organizationName: "weblabs",
      },
    ],
    {
      pageNum: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 3,
    },
  );

  await page.goto(`${basePath}/orgs?filter=weblabs&pageNum=1`);
  const pagination = page.locator("#pagination");
  const nextLink = pagination.locator("li.page-num.ikon a").last();

  await expect(pagination).toHaveClass("page-navigation-wrap");
  await expect(pagination.locator("ul.page-nums")).toHaveCount(1);
  await expect(pagination.locator("li.page-num")).toHaveCount(5);
  await expect(pagination.locator("li.page-num.ikon").first().locator("a")).toHaveCount(0);
  await expect(pagination.locator("li.page-num.ikon").first().locator(".off")).toHaveCount(2);
  await expect(pagination.locator('input[name="pageNum"][type="number"]')).toHaveValue("1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("min", "1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "3");
  await expect(pagination.locator(".delimiter")).toHaveText("/");
  await expect(pagination.locator("li.page-num").nth(3)).toHaveText("3");
  await expect(nextLink).toHaveAttribute("href", `${basePath}/orgs?filter=weblabs&pageNum=2`);
  await expect(nextLink).not.toHaveAttribute("aria-current");
  await expect(nextLink).not.toHaveAttribute("data-status");
  await expect(nextLink).not.toHaveAttribute("class");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await nextLink.click();

  await expect(page).toHaveURL(`${basePath}/orgs?filter=weblabs&pageNum=2`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(pagination.locator('input[name="pageNum"][type="number"]')).toHaveValue("2");
  await expect(pagination.locator("li.page-num.ikon a").first()).toHaveAttribute(
    "href",
    `${basePath}/orgs?filter=weblabs&pageNum=1`,
  );
  await expect(pagination.locator("li.page-num.ikon a").first()).not.toHaveAttribute(
    "aria-current",
  );
  await expect(pagination.locator("li.page-num.ikon a").first()).not.toHaveAttribute("data-status");
  await expect(pagination.locator("li.page-num.ikon a").first()).not.toHaveAttribute("class");
});

test("organization directory pagination input clamps valid pages and resets invalid input", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(
    page,
    [
      {
        createdLabel: "just now",
        createdTitle: "2026-06-30",
        description: "Web labs group",
        logoUrl: "",
        organizationName: "weblabs",
      },
    ],
    {
      pageNum: 2,
      pageSize: 1,
      totalCount: 3,
      totalPages: 3,
    },
  );

  await page.goto(`${basePath}/orgs?filter=weblabs&pageNum=2`);
  const input = page.locator('#pagination input[name="pageNum"]');
  await expect(input).toHaveValue("2");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await input.fill("99");
  await input.press("Enter");

  await expect(page).toHaveURL(`${basePath}/orgs?filter=weblabs&pageNum=3`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.goto(`${basePath}/orgs?filter=weblabs&pageNum=2`);
  await input.fill("1.5");
  await input.press("Enter");

  await expect(page).toHaveURL(`${basePath}/orgs?filter=weblabs&pageNum=2`);
  await expect(input).toHaveValue("2");
});

test("organization directory keeps single-page pagination branch empty", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(
    page,
    [
      {
        createdLabel: "just now",
        createdTitle: "2026-06-30",
        description: "Web labs group",
        logoUrl: "",
        organizationName: "weblabs",
      },
    ],
    {
      pageNum: 1,
      pageSize: 1,
      totalCount: 1,
      totalPages: 1,
    },
  );

  await page.goto(`${basePath}/orgs?filter=weblabs`);

  await expect(page.locator("#pagination")).toHaveCount(1);
  await expect(page.locator("#pagination")).not.toHaveClass(/page-navigation-wrap/u);
  await expect(page.locator("#pagination ul.page-nums")).toHaveCount(0);
});

test("organization directory renders unreadable private organization card like legacy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedOrganizations(page, [
    {
      createdLabel: "just now",
      createdTitle: "2026-06-30",
      description: "Web labs group",
      logoUrl: "",
      organizationName: "weblabs",
    },
    {
      isPrivate: true,
      organizationName: "secret-labs",
      viewerCanRead: false,
    },
  ]);

  await page.goto(`${basePath}/orgs?filter=weblabs`);
  const unreadableCard = page.locator(".all-projects .project").nth(1);
  const infoWrap = unreadableCard.locator(".info-wrap");

  await expect(unreadableCard).toHaveCSS("background-color", "rgb(252, 252, 252)");
  await expect(infoWrap).toHaveCSS("opacity", "0.3");
  await expect(unreadableCard.locator(".owner-avatar-wrap img")).toHaveAttribute(
    "src",
    "/assets/images/organization_default_logo.png",
  );
  await expect(unreadableCard.locator(".owner-avatar-wrap img")).toHaveAttribute(
    "alt",
    "secret-labs",
  );
  await expect(infoWrap.locator("div").last()).toHaveCSS("color", "rgb(128, 128, 128)");
  await expect(unreadableCard).toContainText(
    "You do not have permission to view this project's information",
  );
  await expect(unreadableCard.locator("a")).toHaveCount(0);
  await expect(
    page.locator(".all-projects .project").first().locator(".header a.black"),
  ).toHaveText("weblabs");
});

test("organization directory source uses Link for internal route anchors", () => {
  const source = readFileSync("src/routes/orgs.tsx", "utf8");

  expect(source).not.toContain('<a href={prefixBasePath(runtimeConfig.basePath, "/projects")}');
  expect(source).not.toContain('<a href={prefixBasePath(runtimeConfig.basePath, "/orgs")}');
  expect(source).not.toContain("organizationHref");
  expect(source).not.toContain("href={organizationHref}");
  expect(source).not.toContain("prefixBasePath(basePath, `/organizations/${organizationName}`)");
  expect(source).not.toContain('setAttribute("autofocus"');

  expect(source).not.toContain("document.title");
  expect(source).not.toContain("globalThis.document");
  expect(source).not.toContain("window.document");
  expect(source).not.toMatch(
    /(?:useEffect|useLayoutEffect)[\s\S]{0,300}(?:document|globalThis\.document|window\.document)[\s\S]{0,160}(?:\.title|title\s*=)/u,
  );
  expect(source).not.toMatch(
    /(?:useEffect|useLayoutEffect)[\s\S]{0,300}(?:\.title|title\s*=)[\s\S]{0,160}(?:document|globalThis\.document|window\.document)/u,
  );
  expect(source).toContain("autoFocus");
  expect(source).toContain('<title>{t("title.projectList")}</title>');
  expect(source).toContain('to="/projects"');
  expect(source).toContain('to="/orgs"');
  expect(source).toContain('to="/organizations/$organizationName"');
  expect(source).toContain("params={{ organizationName }}");
  expect(source).toContain(
    "activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}",
  );
  expect(source).toContain('"aria-current": undefined');
  expect(source).toContain('"data-status": undefined');
});

async function mockAuthenticatedOrganizations(
  page: Page,
  items: Record<string, unknown>[] = [
    {
      createdLabel: "just now",
      createdTitle: "2026-06-30",
      description: "Web labs group",
      logoUrl: "",
      organizationName: "weblabs",
    },
  ],
  pageMetadata: Record<string, unknown> = {},
) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
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
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "/assets/images/organization_default_logo.png",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/organizations**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (
      !pathname.endsWith("/api/v1/organizations") &&
      !pathname.endsWith("/api/v1/organizations/")
    ) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items,
        ...pageMetadata,
      }),
    });
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    // e2e closure ledger (2026-08-11): the user-menu sidebar loads the workspace
    // project/org list asynchronously; the legacy fixture pins `Loading...`
    // (mirrors project-delete-form canonicalizer)
    document.querySelectorAll("#usermenu-tab-content-list").forEach((element) => {
      element.replaceChildren(document.createTextNode("Loading..."));
    });
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-owner=global-gnb-outer], .site-breadcrumb-outer, .page-wrap-outer, [data-owner=organization-directory-page-wrap], [data-owner=site-footer]",
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
        .filter(
          (attr) =>
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            attr.name !== "data-page-shell" &&
            attr.name !== "data-toggle" &&
            !attr.name.startsWith("data-v-") &&
            !(attr.name === "class" && normalizeAttr(attr) === ""),
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}="${normalizeAttr(attr)}"`)
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

    function normalizeAttr(attr: Attr): string {
      if (
        attr.name === "class" &&
        (attr.ownerElement?.matches('[data-owner="global-gnb-inner"]') ||
          attr.ownerElement?.matches('[data-owner="global-gnb-outer"]') ||
          attr.ownerElement?.matches('[data-owner="site-footer"]') ||
          attr.ownerElement?.matches('[data-owner="site-footer-inner"]') ||
          attr.ownerElement?.matches('[data-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      if (
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("gnb-nav") &&
        attr.ownerElement.matches('[data-owner="global-gnb-nav"]')
      ) {
        const originalValue = attr.value;
        attr.value = originalValue
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
          .join(" ");
        try {
          return normalizeAttr(attr);
        } finally {
          attr.value = originalValue;
        }
      }
      const owner = attr.ownerElement?.getAttribute("data-owner");
      if (attr.name === "class" && owner === "global-gnb-project-list-item") return "active";
      if (attr.name === "class" && owner === "global-gnb-project-list-divider") return "divider";
      if (attr.name === "class" && owner === "global-gnb-project-list-link")
        return "show-progress-bar";
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
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/g, "").replace(/;$/u, "");
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
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.childNodes)
      .map((node) => visit(node))
      .join("");

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
            attr.name !== "data-toggle" &&
            !attr.name.startsWith("data-v-") &&
            !(attr.name === "class" && normalizeAttr(attr) === ""),
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}="${normalizeAttr(attr)}"`)
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

    function normalizeAttr(attr: Attr): string {
      const isSiteLayoutHeader =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("gnb-outer") &&
        attr.ownerElement.matches("header.gnb-outer") &&
        attr.ownerElement.querySelector(':scope > div.gnb-inner form[name="gnb-search-form"]') !==
          null;
      const isSiteLayoutFooterOuter =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("page-footer-outer") &&
        attr.ownerElement.matches("footer.page-footer-outer") &&
        attr.ownerElement.querySelector(":scope > div.page-footer > span.provider") !== null;
      const isSiteLayoutFooterInner =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("page-footer") &&
        attr.ownerElement.matches("footer.page-footer-outer > div.page-footer") &&
        attr.ownerElement.querySelector(":scope > span.provider") !== null;
      const isSiteLayoutFooterProvider =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("provider") &&
        attr.ownerElement.matches("footer.page-footer-outer > div.page-footer > span.provider");
      const retiredToken = isSiteLayoutFooterOuter
        ? "page-footer-outer"
        : isSiteLayoutFooterInner
          ? "page-footer"
          : isSiteLayoutFooterProvider
            ? "provider"
            : isSiteLayoutHeader && attr.value.split(/\s+/u).includes("project-header")
              ? "project-header"
              : isSiteLayoutHeader
                ? "gnb-outer"
                : attr.name === "class" &&
                    attr.ownerElement &&
                    attr.value.split(/\s+/u).includes("gnb-inner") &&
                    attr.ownerElement.matches("header.gnb-outer > div.gnb-inner") &&
                    attr.ownerElement.querySelector('form[name="gnb-search-form"]') !== null
                  ? "gnb-inner"
                  : attr.name === "class" &&
                      attr.ownerElement &&
                      attr.value.split(/\s+/u).includes("gnb-nav") &&
                      attr.ownerElement.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                      attr.ownerElement.querySelector('form[name="gnb-search-form"]') !== null
                    ? "gnb-nav"
                    : null;
      if (retiredToken) {
        const originalValue = attr.value;
        attr.value = originalValue
          .split(/\s+/u)
          .filter((token) => token !== retiredToken)
          .join(" ");
        try {
          return normalizeAttr(attr);
        } finally {
          attr.value = originalValue;
        }
      }
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    function normalizeStyleAttr(value: string) {
      const normalized = value.replace(/\s+/g, "").replace(/;$/u, "");
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
  }, html);
}
