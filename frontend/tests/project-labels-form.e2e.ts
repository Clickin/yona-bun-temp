import { expect, test, type Page } from "@playwright/test";

const NEW_COLORS = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#3f51b5",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  "#ff5722",
  "#795548",
  "#9e9e9e",
];
const EDIT_COLORS = [
  "#FF7770",
  "#F18CA7",
  "#FFB399",
  "#F1D55C",
  "#A5D870",
  "#32CDA1",
  "#9985D8",
  "#40A0EB",
  "#6BC4E9",
  "#DCBD98",
  "#8C8C9C",
  "#7A9CB4",
];
const EMPTY_LABELS_LIST =
  '<div id="labelsList" class="issue-label-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No label exists</p></div></div>';
const EMPTY_EDIT_LABEL_SELECT = '<select name="category.id" data-toggle="select2"></select>';
const POPULATED_EDIT_LABEL_SELECT =
  '<select name="category.id" data-toggle="select2"><option value="3">type</option><option value="4">priority</option></select>';
const POPULATED_LABELS_LIST = `
<div id="labelsList" class="issue-label-list-wrap">
  <div class="row-fluid list-head"><div class="span3 category"><strong>Category</strong></div><div class="span9 name"><strong>Name</strong></div></div>
  <div class="row-fluid list-item category-wrap" data-category="3" data-category-name="type">
    <div class="span3"><h5 class="right-txt mr20"><span class="category-name">type</span><p class="mt5"><i class="category-exclusive yobicon-tags multiple" data-toggle="tooltip" data-html="true" title="In this category, you can choose<br>multiple labels"></i><button type="button" class="ybtn ybtn-mini" data-project-id="7" data-category-id="3" data-category-name="type" data-category-is-exclusive="false" data-category-update-uri="__BASE_PATH__/admin/sample/issue/label/category/3">Edit category</button></p></h5></div>
    <div class="span9"><table class="table nm"><tr data-label-id="8"><td><span class="issue-label active" data-label-id="8" data-label-name="bug">bug</span></td><td class="actions"><button type="button" class="ybtn ybtn-danger ybtn-small" data-category-name="type" data-label-id="8" data-delete-uri="__BASE_PATH__/admin/sample/issue/label/8/delete">Delete</button><button type="button" class="ybtn ybtn-small" data-category-id="3" data-label-name="bug" data-label-color="#e11d48" data-update-uri="__BASE_PATH__/admin/sample/issue/label/8">Edit</button></td></tr><tr data-label-id="9"><td><span class="issue-label active" data-label-id="9" data-label-name="feature">feature</span></td><td class="actions"><button type="button" class="ybtn ybtn-danger ybtn-small" data-category-name="type" data-label-id="9" data-delete-uri="__BASE_PATH__/admin/sample/issue/label/9/delete">Delete</button><button type="button" class="ybtn ybtn-small" data-category-id="3" data-label-name="feature" data-label-color="#3f51b5" data-update-uri="__BASE_PATH__/admin/sample/issue/label/9">Edit</button></td></tr></table></div>
  </div>
  <div class="row-fluid list-item category-wrap" data-category="4" data-category-name="priority">
    <div class="span3"><h5 class="right-txt mr20"><span class="category-name">priority</span><p class="mt5"><i class="category-exclusive yobicon-tag single" data-toggle="tooltip" data-html="true" title="In this category, you can choose<br>only a single label"></i><button type="button" class="ybtn ybtn-mini" data-project-id="7" data-category-id="4" data-category-name="priority" data-category-is-exclusive="true" data-category-update-uri="__BASE_PATH__/admin/sample/issue/label/category/4">Edit category</button></p></h5></div>
    <div class="span9"><table class="table nm"><tr data-label-id="10"><td><span class="issue-label active" data-label-id="10" data-label-name="high">high</span></td><td class="actions"><button type="button" class="ybtn ybtn-danger ybtn-small" data-category-name="priority" data-label-id="10" data-delete-uri="__BASE_PATH__/admin/sample/issue/label/10/delete">Delete</button><button type="button" class="ybtn ybtn-small" data-category-id="4" data-label-name="high" data-label-color="#ff9800" data-update-uri="__BASE_PATH__/admin/sample/issue/label/10">Edit</button></td></tr></table></div>
  </div>
</div>`;

const EXPECTED_PROJECT_LABELS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>
      <li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class="active"><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap label-editor-wrap"><ul class="nav nav-tabs"><li id="subMenuProjectSetting" class=""><a href="__BASE_PATH__/admin/sample/setting">Settings</a></li><li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li><li id="subMenuIssueLabel" class="active"><a href="__BASE_PATH__/admin/sample/issue/labelsform">Issue Label</a></li><li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li><li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li><li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li><li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li></ul><form id="copyLabel" action="__BASE_PATH__/admin/sample/labels/copy" method="post" class="new-label-wrap"><strong class="form-legend">Copy all labels from a project and append to current project</strong><div class="form-wrap"><input type="text" name="owner" class="input-label mr5" placeholder="Owner Name"><input type="text" name="projectName" class="input-label" placeholder="Project name"></div><button type="submit" class="ybtn ybtn-info btn-submit">Copy labels</button><div>If project path is 'naver/yobi', then owner name is 'naver' and project name is 'yobi'. Character case is ignored.</div><div>If there is already a label with the same name, category and color, another label will not be added.</div></form><form id="frmNewLabel" action="__BASE_PATH__/admin/sample/labels" method="post" class="new-label-wrap"><strong class="form-legend">Add new label</strong><div class="form-wrap"><div><input type="text" name="category" class="input-label mr5" maxlength="250" data-provider="typeahead" autocomplete="off" placeholder="Category"><input type="text" name="name" class="input-label" maxlength="250" autocomplete="off" placeholder="Name"></div><div class="label-preset-colors">__NEW_COLORS__<input type="text" name="color" class="input-small input-label-color" placeholder="Label Color"></div></div><button type="submit" class="ybtn ybtn-primary btn-submit">Add label</button></form><div id="labelsList" class="issue-label-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No label exists</p></div></div></div></div>
<div id="editCategory" class="modal hide yobiDialog" tabindex="-1" role="dialog" aria-hidden="true"><div class="btn-dismiss"><button type="button" class="btn-transparent" data-dismiss="modal">×</button></div><div class="message edit-label-category-form"><div class="center-txt"><input type="text" name="name" class="text category-name" placeholder="Category"><div class="desc">In this category, you can choose<select name="isExclusive" data-toggle="select2" data-dropdown-css-class="select2-without-searchbox"><option value="false">multiple labels</option><option value="true">only a single label</option></select></div></div><div class="center-txt buttons mt20 mb20"><button type="button" class="ybtn ybtn-info btnSubmit">Save</button><button type="button" class="ybtn ybtn-default" data-dismiss="modal">Cancel</button></div></div></div>
<div id="editLabel" class="modal hide yobiDialog" tabindex="-1" role="dialog" aria-hidden="true"><div class="btn-dismiss"><button type="button" class="btn-transparent" data-dismiss="modal">×</button></div><div class="message edit-label-form"><div class="center-txt"><select name="category.id" data-toggle="select2"></select><input type="text" name="name" class="text input-label-name" maxlength="250" placeholder="Name"><div class="label-preset-colors edit">__EDIT_COLORS__<input type="text" name="color" class="input-small input-label-color" placeholder="Label Color"></div></div><div class="center-txt buttons mt20 mb20"><button type="button" class="ybtn ybtn-info btnSubmit">Save</button><button type="button" class="ybtn ybtn-default" data-dismiss="modal">Cancel</button></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project labels matches legacy project/issuelabels.scala.html empty DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectLabels(page);

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);
  await expect(page.locator("#copyLabel")).toBeVisible();
  await expect(page.locator("#frmNewLabel")).toBeVisible();
  await expect(page.locator("#labelsList")).toContainText("No label exists");

  const expected = expectedProjectLabels(basePath);
  expect(await canonicalizeScreenRoots(page)).toEqual(await canonicalizeHtml(page, expected));
});

test("project labels renders legacy project/partial_issuelabels_list.scala.html populated list", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectLabels(page, [
    {
      category: "type",
      categoryId: "3",
      categoryIsExclusive: false,
      color: "#e11d48",
      id: "8",
      name: "bug",
    },
    {
      category: "type",
      categoryId: "3",
      categoryIsExclusive: false,
      color: "#3f51b5",
      id: "9",
      name: "feature",
    },
    {
      category: "priority",
      categoryId: "4",
      categoryIsExclusive: true,
      color: "#ff9800",
      id: "10",
      name: "high",
    },
  ]);

  await page.goto(`${basePath}/admin/sample/issue/labelsform`);
  await expect(page.locator("#labelsList .category-wrap")).toHaveCount(2);
  await expect(page.locator('#labelsList tr[data-label-id="9"]')).toContainText("feature");

  const expected = expectedProjectLabels(basePath)
    .replace(EMPTY_LABELS_LIST, POPULATED_LABELS_LIST.replaceAll("__BASE_PATH__", basePath))
    .replace(EMPTY_EDIT_LABEL_SELECT, POPULATED_EDIT_LABEL_SELECT);
  expect(await canonicalizeScreenRoots(page)).toEqual(await canonicalizeHtml(page, expected));

  await expect(labelListMetrics(page)).resolves.toMatchObject({
    categoryEditUri: `${basePath}/admin/sample/issue/label/category/3`,
    categoryHeaderAlign: "right",
    categoryId: "3",
    categoryName: "type",
    deleteUri: `${basePath}/admin/sample/issue/label/8/delete`,
    exclusiveClass: "category-exclusive yobicon-tags multiple",
    labelColor: "#e11d48",
    labelHeadBackground: "rgb(250, 250, 250)",
    labelId: "8",
    labelListBorderTopWidth: "2px",
    labelName: "bug",
    updateUri: `${basePath}/admin/sample/issue/label/8`,
  });
});

async function mockProjectLabels(page: Page, labels: unknown[] = []) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectSettings()),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ labels, ownerName: "admin", projectName: "sample" }),
    });
  });
}

function expectedProjectLabels(basePath: string) {
  return EXPECTED_PROJECT_LABELS.replaceAll("__BASE_PATH__", basePath)
    .replace("__NEW_COLORS__", colorButtons(NEW_COLORS))
    .replace("__EDIT_COLORS__", colorButtons(EDIT_COLORS));
}

function colorButtons(colors: string[]) {
  return colors
    .map(
      (color) =>
        `<button type="button" class="issue-label btn-preset-color" style="background-color:${color};"></button>`,
    )
    .join("");
}

async function labelListMetrics(page: Page) {
  return page.evaluate(() => {
    const listHead = document.querySelector("#labelsList .list-head");
    const categoryHead = document.querySelector("#labelsList .list-head .category");
    const firstCategory = document.querySelector("#labelsList .category-wrap");
    const exclusiveIcon = firstCategory?.querySelector(".category-exclusive");
    const categoryEdit = firstCategory?.querySelector("button[data-category-update-uri]");
    const firstLabel = firstCategory?.querySelector("tr[data-label-id] .issue-label");
    const deleteButton = firstCategory?.querySelector("button[data-delete-uri]");
    const editButton = firstCategory?.querySelector("button[data-update-uri]");
    const listStyle = listHead ? getComputedStyle(listHead) : null;
    const categoryStyle = categoryHead ? getComputedStyle(categoryHead) : null;
    return {
      categoryEditUri: categoryEdit?.getAttribute("data-category-update-uri"),
      categoryHeaderAlign: categoryStyle?.textAlign,
      categoryId: firstCategory?.getAttribute("data-category"),
      categoryName: firstCategory?.getAttribute("data-category-name"),
      deleteUri: deleteButton?.getAttribute("data-delete-uri"),
      exclusiveClass: exclusiveIcon?.getAttribute("class"),
      labelColor: editButton?.getAttribute("data-label-color"),
      labelHeadBackground: listStyle?.backgroundColor,
      labelId: firstLabel?.getAttribute("data-label-id"),
      labelListBorderTopWidth: listStyle?.borderTopWidth,
      labelName: firstLabel?.getAttribute("data-label-name"),
      updateUri: editButton?.getAttribute("data-update-uri"),
    };
  });
}

function projectSettings() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    backgroundUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isFavorited: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    logoUrl: "/assets/images/project_default_logo.png",
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    ownerName: "admin",
    projectId: 7,
    projectName: "sample",
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanUpdate: true,
  };
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, #editCategory, #editLabel, .page-footer-outer",
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
      if (attr.name === "style") {
        return normalizeStyle(attr.value);
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }

    function normalizeStyle(value: string) {
      return value
        .replace(/\s+/g, "")
        .replace(/rgb\((\d+),(\d+),(\d+)\)/gi, (_, red, green, blue) => {
          return `#${[red, green, blue]
            .map((channel) => Number(channel).toString(16).padStart(2, "0"))
            .join("")}`;
        })
        .replace(/#[0-9a-f]{6}/gi, (color) => color.toLowerCase())
        .replace(/;$/, "")
        .replaceAll('"', "'");
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup;
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
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
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
      if (attr.name === "style") {
        return normalizeStyle(attr.value);
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }

    function normalizeStyle(value: string) {
      return value
        .replace(/\s+/g, "")
        .replace(/rgb\((\d+),(\d+),(\d+)\)/gi, (_, red, green, blue) => {
          return `#${[red, green, blue]
            .map((channel) => Number(channel).toString(16).padStart(2, "0"))
            .join("")}`;
        })
        .replace(/#[0-9a-f]{6}/gi, (color) => color.toLowerCase())
        .replace(/;$/, "")
        .replaceAll('"', "'");
    }
  }, html);
}
