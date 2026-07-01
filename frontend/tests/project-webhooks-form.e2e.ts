import { expect, test, type Page } from "@playwright/test";

const EMPTY_WEBHOOKS_LIST =
  '<div id="webhooksList" class="webhook-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No webhook exists.</p></div></div>';
const POPULATED_WEBHOOKS_LIST = `
<div id="webhooksList" class="webhook-list-wrap">
  <div class="row-fluid list-head"><div class="span5 payload-url"><strong>Payload URL</strong></div><div class="span2 secret text-center"><strong>Authorization Token</strong></div><div class="span2 secret text-center"><strong>Type of message</strong></div><div class="span2 secret text-center"><strong>Include git push events</strong></div><div class="span1 secret text-center"></div></div>
  <div class="row-fluid list-item vertical-align" data-webhook-id="11"><div class="span5"><h6 class="mr20 truncate">https://hooks.example.test/yona</h6></div><div class="span2 text-center"><h6>NONE</h6></div><div class="span2 text-center"><h6>SIMPLE</h6></div><div class="span2 text-center"><input type="checkbox" checked=""></div><div class="span1 text-center"><button type="button" class="ybtn ybtn-danger ybtn-small" data-request-method="delete" data-request-uri="__BASE_PATH__/admin/sample/webhooks/11">Delete</button></div></div>
  <div class="row-fluid list-item vertical-align" data-webhook-id="12"><div class="span5"><h6 class="mr20 truncate">https://hooks.example.test/slack</h6></div><div class="span2 text-center"><h6>secret-token</h6></div><div class="span2 text-center"><h6>DETAIL_SLACK</h6></div><div class="span2 text-center"><input type="checkbox"></div><div class="span1 text-center"><button type="button" class="ybtn ybtn-danger ybtn-small" data-request-method="delete" data-request-uri="__BASE_PATH__/admin/sample/webhooks/12">Delete</button></div></div>
</div>`;

const EXPECTED_PROJECT_WEBHOOKS = `
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
<div class="page-wrap-outer"><div class="project-page-wrap webhook-editor-wrap"><ul class="nav nav-tabs"><li id="subMenuProjectSetting" class=""><a href="__BASE_PATH__/admin/sample/setting">Settings</a></li><li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li><li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/labels">Issue Label</a></li><li id="subMenuWebhook" class="active"><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li><li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li><li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li><li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li></ul><form id="formNewWebhook" action="__BASE_PATH__/admin/sample/webhooks" method="post" class="new-webhook-wrap"><strong class="form-legend">Create new webhook</strong><div class="form-wrap form-actions"><div><input type="text" name="payloadUrl" class="input-webhook-payload" maxlength="2000" autocomplete="off" placeholder="Payload URL"><input type="text" name="secret" class="input-webhook-secret" maxlength="250" autocomplete="off" placeholder="Authorization Token"><button type="submit" class="ybtn ybtn-primary btn-submit">Add webhook</button></div><div><label class="radio inline"><input type="radio" name="webhookType" value="SIMPLE" checked=""> Messenger (Only text)</label><label class="radio inline"><input type="radio" name="webhookType" value="DETAIL_SLACK"> Slack (Meta)</label><label class="radio inline"><input type="radio" name="webhookType" value="DETAIL_HANGOUT_CHAT"> Google Chat (Thread)</label><label class="radio inline"><input type="radio" name="webhookType" value="JSON"> Continuous Integration tool (Only push event)</label><span class="radio inline" aria-hidden="true">|</span><span class="radio inline" aria-hidden="true"></span><label class="checkbox inline" for="gitPush"><input type="checkbox" id="gitPush" name="gitPush" class="form-check-input"> Include git push events</label></div></div><div>* Every webhook is sent in POST and with Content-Type: application/json header.<br>* If you need to include additional fields and values, please use a query string. e.g. http://abc.com?customKey=value <br>* If you put a value in the Token field, 'Authorization: token input-value' header is added to HTTP header. <br></div></form><div id="webhooksList" class="webhook-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No webhook exists.</p></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project webhooks matches legacy project/webhooks.scala.html empty DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/webhooks`);
  await expect(page.locator("#formNewWebhook")).toBeVisible();
  await expect(page.locator("#webhooksList")).toContainText("No webhook exists.");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_WEBHOOKS.replaceAll("__BASE_PATH__", basePath)),
  );
  await expect(webhookFormMetrics(page)).resolves.toEqual({
    activeTabClass: "active",
    activeTabHeight: "38px",
    emptyPadding: "100px 0px",
    formActionsMarginTop: "20px",
    formMarginBottom: "30px",
    formWidth: 1260,
    gitPushDisplay: "inline-block",
    helpLineHeight: "20px",
    helpMarginTop: "0px",
    legendDisplay: "block",
    legendMarginBottom: "10px",
    listMarginTop: "0px",
    pageWrapMinWidth: "1100px",
    payloadHeight: "30px",
    payloadWidth: "355px",
    projectPageMarginTop: "5px",
    projectPageWidth: 1260,
    radioDisplay: "inline-block",
    secretWidth: "214px",
    submitHeight: "30px",
    submitPadding: "4px 12px",
    tabsMarginBottom: "15px",
  });
});

test("project webhooks renders legacy project/partial_webhooks_list.scala.html populated list", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, [
    {
      gitPush: true,
      id: 11,
      payloadUrl: "https://hooks.example.test/yona",
      secret: "",
      webhookType: "SIMPLE",
    },
    {
      gitPush: false,
      id: 12,
      payloadUrl: "https://hooks.example.test/slack",
      secret: "secret-token",
      webhookType: "DETAIL_SLACK",
    },
  ]);

  await page.goto(`${basePath}/admin/sample/webhooks`);
  await expect(page.locator("#webhooksList .list-item")).toHaveCount(2);
  await expect(page.locator('#webhooksList [data-webhook-id="12"]')).toContainText("secret-token");

  const expected = EXPECTED_PROJECT_WEBHOOKS.replaceAll("__BASE_PATH__", basePath).replace(
    EMPTY_WEBHOOKS_LIST,
    POPULATED_WEBHOOKS_LIST.replaceAll("__BASE_PATH__", basePath),
  );
  expect(await canonicalizeScreenRoots(page)).toEqual(await canonicalizeHtml(page, expected));

  await expect(webhookListMetrics(page)).resolves.toMatchObject({
    deleteMethod: "delete",
    deleteUri: `${basePath}/admin/sample/webhooks/11`,
    gitPushChecked: true,
    headBackground: "rgb(250, 250, 250)",
    headBorderBottomWidth: "2px",
    listItemBorderBottomWidth: "1px",
    payloadText: "https://hooks.example.test/yona",
    secretText: "NONE",
    webhookId: "11",
    webhookType: "SIMPLE",
  });
});

test("project webhooks JSON type forces git push checkbox like legacy script", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/webhooks`);
  const gitPush = page.locator("#gitPush");

  await expect(gitPush).not.toBeChecked();
  await page.locator('input[name="webhookType"][value="JSON"]').check();
  await expect(gitPush).toBeChecked();

  await gitPush.click();
  await expect(gitPush).toBeChecked();

  await page.locator('input[name="webhookType"][value="SIMPLE"]').check();
  await expect(gitPush).not.toBeChecked();
  await gitPush.check();
  await expect(gitPush).toBeChecked();
});

async function mockProjectAdmin(page: Page, webhooks: unknown[] = []) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
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
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/webhooks", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        deliveries: [],
        ownerName: "admin",
        projectName: "sample",
        viewerCanUpdate: true,
        webhookTypes: ["SIMPLE", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT", "JSON"],
        webhooks,
      }),
    });
  });
}

async function webhookListMetrics(page: Page) {
  return page.evaluate(() => {
    const head = document.querySelector("#webhooksList .list-head");
    const firstItem = document.querySelector("#webhooksList .list-item");
    const cells = firstItem ? Array.from(firstItem.children) : [];
    const checkbox = firstItem?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    const button = firstItem?.querySelector("button[data-request-uri]");
    const headStyle = head ? getComputedStyle(head) : null;
    const itemStyle = firstItem ? getComputedStyle(firstItem) : null;
    return {
      deleteMethod: button?.getAttribute("data-request-method"),
      deleteUri: button?.getAttribute("data-request-uri"),
      gitPushChecked: checkbox?.checked,
      headBackground: headStyle?.backgroundColor,
      headBorderBottomWidth: headStyle?.borderBottomWidth,
      listItemBorderBottomWidth: itemStyle?.borderBottomWidth,
      payloadText: cells[0]?.textContent?.trim(),
      secretText: cells[1]?.textContent?.trim(),
      webhookId: firstItem?.getAttribute("data-webhook-id"),
      webhookType: cells[2]?.textContent?.trim(),
    };
  });
}

async function webhookFormMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap.webhook-editor-wrap");
    const tabs = requireElement(".project-page-wrap > .nav.nav-tabs");
    const activeTab = requireElement("#subMenuWebhook");
    const form = requireElement("#formNewWebhook");
    const legend = requireElement("#formNewWebhook .form-legend");
    const formActions = requireElement("#formNewWebhook .form-actions");
    const payload = requireElement(".input-webhook-payload");
    const secret = requireElement(".input-webhook-secret");
    const submit = requireElement("#formNewWebhook .btn-submit");
    const radio = requireElement("#formNewWebhook label.radio.inline");
    const gitPushLabel = requireElement('#formNewWebhook label.checkbox.inline[for="gitPush"]');
    const help = requireElement("#formNewWebhook > div:last-child");
    const list = requireElement("#webhooksList");
    const empty = requireElement("#webhooksList .error-wrap");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const tabsStyle = getComputedStyle(tabs);
    const activeTabStyle = getComputedStyle(activeTab);
    const formStyle = getComputedStyle(form);
    const legendStyle = getComputedStyle(legend);
    const formActionsStyle = getComputedStyle(formActions);
    const payloadStyle = getComputedStyle(payload);
    const secretStyle = getComputedStyle(secret);
    const submitStyle = getComputedStyle(submit);
    const radioStyle = getComputedStyle(radio);
    const gitPushStyle = getComputedStyle(gitPushLabel);
    const helpStyle = getComputedStyle(help);
    const listStyle = getComputedStyle(list);
    const emptyStyle = getComputedStyle(empty);
    return {
      activeTabClass: activeTab.className,
      activeTabHeight: activeTabStyle.height,
      emptyPadding: emptyStyle.padding,
      formActionsMarginTop: formActionsStyle.marginTop,
      formMarginBottom: formStyle.marginBottom,
      formWidth: Math.round(form.getBoundingClientRect().width),
      gitPushDisplay: gitPushStyle.display,
      helpLineHeight: helpStyle.lineHeight,
      helpMarginTop: helpStyle.marginTop,
      legendDisplay: legendStyle.display,
      legendMarginBottom: legendStyle.marginBottom,
      listMarginTop: listStyle.marginTop,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      payloadHeight: payloadStyle.height,
      payloadWidth: payloadStyle.width,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
      radioDisplay: radioStyle.display,
      secretWidth: secretStyle.width,
      submitHeight: submitStyle.height,
      submitPadding: submitStyle.padding,
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
