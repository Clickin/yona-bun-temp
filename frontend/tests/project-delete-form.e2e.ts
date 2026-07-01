import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECT_DELETE_FORM = `
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
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>
      <li class="gnb-usermenu-dropdown">
        <a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a>
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
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')">
  <div class="project-header-inner">
    <div class="project-header-wrap">
      <div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div>
      <div class="project-breadcrumb-wrap">
        <div class="project-breadcrumb">
          <span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span>
          <span class="project-separator hide-in-mobile">/</span>
          <span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span>
          <span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span>
        </div>
      </div>
      <div class="project-util-wrap"><ul class="project-util"></ul></div>
    </div>
  </div>
</div>
<div class="project-menu-outer">
  <div class="project-menu-inner">
    <ul class="project-menu-nav project-menu-gruop">
      <li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li>
      <li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li>
      <li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li>
      <li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li>
      <li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li>
      <li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li>
      <li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li>
    </ul>
    <div class="project-setting">
      <ul class="project-menu-nav">
        <li class="active"><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li>
      </ul>
    </div>
  </div>
</div>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <ul class="nav nav-tabs">
      <li id="subMenuProjectSetting" class=""><a href="__BASE_PATH__/admin/sample/setting">Settings</a></li>
      <li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li>
      <li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/labels">Issue Label</a></li>
      <li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li>
      <li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li>
      <li id="subMenuProjectDelete" class="active"><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li>
      <li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li>
    </ul>
    <div class="bubble-wrap gray wp">
      <div class="cu-label">Delete project</div>
      <div class="cu-desc">
        <p><strong class="notice">Once you delete the project, data related to code, board, issues etc. will also be deleted, and won't be able to be recovered.</strong></p>
        <p><input type="checkbox" class="checkbox" autocomplete="off" id="accept"><label for="accept" class="bg-checkbox label-agreement">I agree to delete this project.</label></p>
      </div>
    </div>
    <div class="box-wrap bottom">
      <a id="btnDelete" href="#alertDeletion" class="ybtn ybtn-danger" data-toggle="modal"><i class="yobicon-database-remove"></i> Delete this project</a>
    </div>
    <div id="alertDeletion" class="modal hide">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal">×</button>
        <h3>Do you want to delete this project?</h3>
      </div>
      <div class="modal-body">
        <p> Once you delete the project, data related to code, board, issues etc. will also be deleted, and won't be able to be recovered.</p>
        <p> Are you sure you want to delete this project? </p>
      </div>
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

test("project delete form matches legacy project/delete.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/deleteform`);
  await expect(page.locator("#btnDelete")).toBeVisible();
  await expect(page.locator("#alertDeletion")).toHaveClass(/hide/);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_DELETE_FORM.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readDesktopDeleteMetrics(page)).toEqual({
    activeTabClass: "active",
    activeTabHeight: "38px",
    agreementLineHeight: "20px",
    agreementMarginLeft: "0px",
    bottomPadding: "20px 0px 12px",
    bubbleBackground: "rgb(247, 247, 247)",
    bubblePadding: "20px 20px 10px",
    bubbleWidth: 1260,
    buttonHeight: "21px",
    buttonLineHeight: "20px",
    buttonPadding: "4px 12px",
    checkboxMargin: "2px",
    descMarginLeft: "0px",
    descWidth: 795,
    labelLineHeight: "20px",
    labelWidth: 205,
    modalDisplay: "none",
    modalFooterPadding: "14px 15px 15px",
    modalHeaderPadding: "9px 15px",
    modalWidth: "560px",
    pageWrapMinWidth: "1100px",
    projectPageMarginTop: "5px",
    projectPageWidth: 1260,
    tabsMarginBottom: "15px",
  });
});

async function readDesktopDeleteMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap");
    const tabs = requireElement(".project-page-wrap > .nav.nav-tabs");
    const activeTab = requireElement("#subMenuProjectDelete");
    const bubble = requireElement(".bubble-wrap.gray.wp");
    const label = requireElement(".bubble-wrap.gray.wp .cu-label");
    const desc = requireElement(".bubble-wrap.gray.wp .cu-desc");
    const accept = requireElement("#accept");
    const agreement = requireElement(".label-agreement");
    const bottom = requireElement(".box-wrap.bottom");
    const deleteButton = requireElement("#btnDelete");
    const modal = requireElement("#alertDeletion");
    const modalHeader = requireElement("#alertDeletion .modal-header");
    const modalFooter = requireElement("#alertDeletion .modal-footer");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const tabsStyle = getComputedStyle(tabs);
    const activeTabStyle = getComputedStyle(activeTab);
    const bubbleStyle = getComputedStyle(bubble);
    const labelStyle = getComputedStyle(label);
    const descStyle = getComputedStyle(desc);
    const acceptStyle = getComputedStyle(accept);
    const agreementStyle = getComputedStyle(agreement);
    const bottomStyle = getComputedStyle(bottom);
    const buttonStyle = getComputedStyle(deleteButton);
    const modalStyle = getComputedStyle(modal);
    const modalHeaderStyle = getComputedStyle(modalHeader);
    const modalFooterStyle = getComputedStyle(modalFooter);
    return {
      activeTabClass: activeTab.className,
      activeTabHeight: activeTabStyle.height,
      agreementLineHeight: agreementStyle.lineHeight,
      agreementMarginLeft: agreementStyle.marginLeft,
      bottomPadding: bottomStyle.padding,
      bubbleBackground: bubbleStyle.backgroundColor,
      bubblePadding: bubbleStyle.padding,
      bubbleWidth: Math.round(bubble.getBoundingClientRect().width),
      buttonHeight: buttonStyle.height,
      buttonLineHeight: buttonStyle.lineHeight,
      buttonPadding: buttonStyle.padding,
      checkboxMargin: acceptStyle.margin,
      descMarginLeft: descStyle.marginLeft,
      descWidth: Math.round(desc.getBoundingClientRect().width),
      labelLineHeight: labelStyle.lineHeight,
      labelWidth: Math.round(label.getBoundingClientRect().width),
      modalDisplay: modalStyle.display,
      modalFooterPadding: modalFooterStyle.padding,
      modalHeaderPadding: modalHeaderStyle.padding,
      modalWidth: modalStyle.width,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
      tabsMarginBottom: tabsStyle.marginBottom,
    };

    function requireElement(selector: string): HTMLElement {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function mockProjectAdmin(page: Page) {
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
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isCodeAccessibleMemberOnly: false,
        isFavorite: false,
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
        openIssueCount: 0,
        openPullRequestCount: 0,
        ownerName: "admin",
        postCount: 0,
        projectName: "sample",
        reviewCount: 0,
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerCanWatch: false,
      }),
    });
  });
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
