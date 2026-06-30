import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECTS_LIST = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
    </div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
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
          <li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li>
          <li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li>
          <li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li>
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
      <li class="gnb-usermenu-item">
        <a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar">
          <i class="yobicon-wrench"></i>
        </a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
        <a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)">
          <span class="avatar-wrap smaller"><img alt="" src="/assets/images/default-avatar-32.png"></span><span class="caret"></span>
        </a>
      </li>
      <li class="gnb-usermenu-dropdown">
        <a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown">
          <i class="yobicon-plus"></i><span class="caret"></span>
        </a>
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
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner">
    <div class="title_area">
      <ul class="nav nav-tabs">
        <li class="active"><a href="__BASE_PATH__/projects">PUBLICProject list</a></li>
        <li><a href="__BASE_PATH__/orgs">Group List</a></li>
      </ul>
    </div>
  </div>
</div>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="search-wrap">
      <div id="search" class="pull-left">
        <form action="__BASE_PATH__/projects" method="get">
          <div class="search-bar">
            <input name="filter" class="textbox" type="text" placeholder="Search by keyword" value="sample" autofocus>
            <button type="submit" class="search-btn"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </div>
    </div>
    <ul class="all-projects">
      <li class="project">
        <div class="info-wrap">
          <div class="owner-avatar-wrap">
            <a href="__BASE_PATH__/admin/sample"><img src="/assets/images/project_default_logo.png" alt="sample"></a>
          </div>
          <div style="float:left">
            <div class="header">
              <a href="__BASE_PATH__/admin/sample" class="black">sample</a>
            </div>
            <div class="desc">Sample project</div>
            <p class="name-tag">by<a href="__BASE_PATH__/admin" class="owner-name-small">admin</a>at<strong title="2026-06-30">just now</strong><span class="small-font">,Latest code update<strong>just now</strong></span></p>
          </div>
        </div>
        <div class="stats-wrap pull-right">
          <div class="members">
            <ul class="unstyled"></ul>
            <p><i class="yobicon-friends yobicon-middle"></i><strong>2</strong> <i class="yobicon-eye yobicon-middle"></i> <strong>3</strong></p>
          </div>
        </div>
      </li>
    </ul>
    <div id="pagination"></div>
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

test("projects list matches legacy project/list.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedProjects(page);

  await page.goto(`${basePath}/projects?filter=sample`);
  await expect(page.locator(".all-projects .project")).toBeVisible();

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_PROJECTS_LIST.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);

  expect(await readProjectsListMetrics(page)).toEqual({
    avatarBorderRadius: "3px",
    avatarDisplay: "block",
    avatarFloat: "left",
    avatarHeight: "50px",
    avatarImageHeight: "36px",
    avatarImageVerticalAlign: "top",
    avatarImageWidth: "50px",
    avatarMarginRight: "10px",
    avatarWidth: "50px",
    descriptionColor: "rgb(186, 186, 186)",
    descriptionMarginLeft: "10px",
    headerFontSize: "20px",
    headerFontWeight: "700",
    headerMarginBottom: "5px",
    headerMarginLeft: "10px",
    listClear: "both",
    listMargin: "0px 0px 20px",
    listStyleType: "none",
    nameTagColor: "rgb(153, 153, 153)",
    nameTagFontSize: "11px",
    nameTagMarginLeft: "10px",
    rowBorderBottomColor: "rgb(220, 220, 220)",
    rowBorderBottomStyle: "solid",
    rowOverflow: "hidden",
    rowPadding: "15px 0px 10px",
    statsTextAlign: "right",
    statsWidth: "76.1094px",
  });
});

async function mockAuthenticatedProjects(page: Page) {
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
  await page.route("**/api/v1/projects", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            createdLabel: "just now",
            createdTitle: "2026-06-30",
            lastPushedLabel: "just now",
            logoUrl: "/assets/images/project_default_logo.png",
            memberCount: 2,
            overview: "Sample project",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            watchCount: 3,
          },
        ],
      }),
    });
  });
}

async function readProjectsListMetrics(page: Page) {
  return page.evaluate(() => {
    const list = document.querySelector<HTMLElement>(".all-projects");
    const row = document.querySelector<HTMLElement>(".all-projects > .project");
    const avatar = document.querySelector<HTMLElement>(".all-projects .owner-avatar-wrap");
    const avatarImage = document.querySelector<HTMLElement>(".all-projects .owner-avatar-wrap img");
    const header = document.querySelector<HTMLElement>(".all-projects .header");
    const description = document.querySelector<HTMLElement>(".all-projects .desc");
    const nameTag = document.querySelector<HTMLElement>(".all-projects .name-tag");
    const stats = document.querySelector<HTMLElement>(".all-projects .stats-wrap");
    const members = document.querySelector<HTMLElement>(".all-projects .members");
    if (
      !list ||
      !row ||
      !avatar ||
      !avatarImage ||
      !header ||
      !description ||
      !nameTag ||
      !stats ||
      !members
    ) {
      throw new Error("Expected projects list metric targets are missing.");
    }

    const listStyle = getComputedStyle(list);
    const rowStyle = getComputedStyle(row);
    const avatarStyle = getComputedStyle(avatar);
    const avatarImageStyle = getComputedStyle(avatarImage);
    const headerStyle = getComputedStyle(header);
    const descriptionStyle = getComputedStyle(description);
    const nameTagStyle = getComputedStyle(nameTag);
    const statsStyle = getComputedStyle(stats);
    const membersStyle = getComputedStyle(members);

    return {
      avatarBorderRadius: avatarStyle.borderRadius,
      avatarDisplay: avatarStyle.display,
      avatarFloat: avatarStyle.cssFloat,
      avatarHeight: avatarStyle.height,
      avatarImageHeight: avatarImageStyle.height,
      avatarImageVerticalAlign: avatarImageStyle.verticalAlign,
      avatarImageWidth: avatarImageStyle.width,
      avatarMarginRight: avatarStyle.marginRight,
      avatarWidth: avatarStyle.width,
      descriptionColor: descriptionStyle.color,
      descriptionMarginLeft: descriptionStyle.marginLeft,
      headerFontSize: headerStyle.fontSize,
      headerFontWeight: headerStyle.fontWeight,
      headerMarginBottom: headerStyle.marginBottom,
      headerMarginLeft: headerStyle.marginLeft,
      listClear: listStyle.clear,
      listMargin: listStyle.margin,
      listStyleType: listStyle.listStyleType,
      nameTagColor: nameTagStyle.color,
      nameTagFontSize: nameTagStyle.fontSize,
      nameTagMarginLeft: nameTagStyle.marginLeft,
      rowBorderBottomColor: rowStyle.borderBottomColor,
      rowBorderBottomStyle: rowStyle.borderBottomStyle,
      rowOverflow: rowStyle.overflow,
      rowPadding: rowStyle.padding,
      statsTextAlign: statsStyle.textAlign,
      statsWidth: membersStyle.width,
    };
  });
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
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
        .filter((attr) => !attr.name.startsWith("data-v-"))
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

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
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
        .filter((attr) => !attr.name.startsWith("data-v-"))
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

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
