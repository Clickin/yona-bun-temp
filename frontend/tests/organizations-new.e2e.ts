import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXPECTED_ORGANIZATION_NEW = `
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
      <li class="gnb-usermenu-item">
        <a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar">
          <i class="yobicon-wrench"></i>
        </a>
      </li>
      <li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn">
        <button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)">
          <span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span>
        </button>
      </li>
      <li class="gnb-usermenu-dropdown">
        <button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown">
          <i class="yobicon-plus"></i><span class="caret"></span>
        </button>
        <ul class="dropdown-menu flat right">
          <li><a href="__BASE_PATH__/user/issues/new">New issue</a></li>
          <li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li>
          <li><hr class="no-margin"></li>
          <li><a href="__BASE_PATH__/projectform">Create new project</a></li>
          <li><a href="__BASE_PATH__/organizations/new" class="active">New Group</a></li>
        </ul>
      </li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="form-wrap new-project">
      <form action="__BASE_PATH__/organizations/new" method="post" name="new-org" class="frm-wrap">
        <legend>New Group</legend>
        <dl>
          <dt>
            <div class="n-alert" data-errType="name">
              <div class="orange-txt"><span class="msg wrongName" style="display: none;"></span></div>
            </div>
            <label for="name">input group name</label>
          </dt>
          <dd><input id="name" type="text" name="name" class="text" placeholder="" maxlength="250" value=""></dd>
          <dt><label for="descr">input group's description</label></dt>
          <dd><textarea id="descr" name="descr" class="text textarea.span4" style="resize: vertical;"></textarea></dd>
        </dl>
        <div class="actions">
          <button class="ybtn ybtn-success"><i class="yobicon-friends"></i>Create Group</button>
          <a href="__BASE_ROOT_HREF__" class="ybtn">Cancel</a>
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

test("organization create form matches legacy organization/create.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const cancelHref = rootHref(basePath);
  await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/organizations/new`);
  await expect(page).toHaveTitle("Yona");
  expect(
    await page.evaluate(() =>
      Array.from(document.head.querySelectorAll("title"), (title) => title.textContent ?? ""),
    ),
  ).toContain("Yona");
  await expect(page.locator('form[name="new-org"]')).toBeVisible();
  await expect(page.locator("#name")).toBeFocused();
  await expect(page.locator(".n-alert")).toHaveAttribute("data-errType", "name");
  await expect(page.locator(".wrongName")).toBeHidden();
  const cancelLink = page.locator('form[name="new-org"] .actions a.ybtn', { hasText: "Cancel" });
  await expect(cancelLink).toHaveAttribute("href", cancelHref);
  await expect(cancelLink).toHaveClass("ybtn");
  await expect(cancelLink).toHaveText("Cancel");
  await expect(cancelLink).not.toHaveAttribute("data-status", "active");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_ORGANIZATION_NEW.replaceAll("__BASE_ROOT_HREF__", cancelHref).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
  expect(await organizationCreateMetrics(page)).toEqual({
    actionsOffsetTop: 4,
    alertDataErrType: "name",
    descriptionHeight: 40,
    descriptionWidth: 686,
    formWidth: 700,
    nameInputWidth: 686,
    pageWrapWidth: 1280,
    submitButtonHeight: 30,
    titleFontSize: 13,
    warningDisplay: "none",
  });
});

test("organization create name alert keeps legacy data error attribute declaratively", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/organizations/new`);
  await expect(page.locator(".n-alert")).toHaveAttribute("data-errType", "name");
  await expect(page.locator(".wrongName")).toBeHidden();
});

test("organization create form validates name and posts REST payload", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const requests = await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/organizations/new`);
  await page.locator("#name").fill("bad name");
  await page
    .locator('form[name="new-org"]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.locator(".wrongName")).toBeVisible();
  expect(requests.createdOrganizations).toEqual([]);

  await page.locator("#name").fill("team.");
  await page
    .locator('form[name="new-org"]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.locator(".wrongName")).toBeVisible();
  expect(requests.createdOrganizations).toEqual([]);

  await page.locator("#name").fill("한글-group");
  await page.locator("#descr").fill("Hangul team");
  await page
    .locator('form[name="new-org"]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());

  await expect
    .poll(() => requests.createdOrganizations)
    .toEqual([
      {
        description: "Hangul team",
        organizationName: "한글-group",
      },
    ]);
  await expect(page).toHaveURL(`${basePath}/organizations/team-alpha`);
});

test("organization create form renders legacy flash warning before wrongName", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/organizations/new?warning=organization.name.duplicate`);

  const warning = page.locator(".n-alert .orange-txt > span.warning");
  const wrongName = page.locator(".n-alert .orange-txt > span.wrongName");
  await expect(warning).toHaveText("Already existent user's login id or group name.");
  await expect(wrongName).toBeHidden();
  expect(
    await page.locator(".n-alert .orange-txt > span").evaluateAll((spans) =>
      spans.map((span) => ({
        className: span.className,
        text: span.textContent ?? "",
      })),
    ),
  ).toEqual([
    {
      className: "warning",
      text: "Already existent user's login id or group name.",
    },
    {
      className: "msg wrongName",
      text: "",
    },
  ]);

  await page.locator("#name").fill("bad name");
  await page
    .locator('form[name="new-org"]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());

  await expect(warning).toBeHidden();
  await expect(wrongName).toBeVisible();
  await expect(wrongName).toHaveText(
    "Enter the group name in alphanumerical or symbol characters(_-.)",
  );
});

test("organization create cancel keeps legacy href and navigates through the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const cancelHref = rootHref(basePath);
  await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/organizations/new`);
  const cancelLink = page.locator('form[name="new-org"] .actions a.ybtn', { hasText: "Cancel" });

  await expect(cancelLink).toHaveAttribute("href", cancelHref);
  await expect(cancelLink).toHaveClass("ybtn");
  await expect(cancelLink).toHaveText("Cancel");

  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });
  await page.evaluate(() => {
    (window as Window & { __organizationCreateSpaMarker?: string }).__organizationCreateSpaMarker =
      "kept";
  });

  await cancelLink.click({ noWaitAfter: true });

  await expect.poll(() => page.evaluate(() => window.location.pathname)).toBe(cancelHref);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __organizationCreateSpaMarker?: string })
            .__organizationCreateSpaMarker,
      ),
    )
    .toBe("kept");
  expect(documentRequests).toEqual([]);
});

test("organization create route source keeps cancel navigation out of raw anchors", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("../src/routes/organizations/new.tsx", import.meta.url)),
    "utf8",
  );
  const rawAnchorBlocks = routeSource.match(/<a\b[\s\S]*?<\/a>/gu) ?? [];
  const effectBlocks =
    routeSource.match(/(?:React\.)?use(?:Layout)?Effect\s*\([\s\S]*?\)\s*;/gu) ?? [];

  expect(routeSource).toContain(
    'import { createFileRoute, createLink, useRouter } from "@tanstack/react-router";',
  );
  expect(routeSource).toContain('data-errtype="name"');
  expect(routeSource).toContain("const MountedRootLink = createLink(MountedRootLinkAnchor);");
  expect(routeSource).toContain('<title>{t("app.name")}</title>');
  expect(routeSource).toContain('const cancelHref = prefixBasePath(runtimeConfig.basePath, "");');
  expect(routeSource).toContain("router.history.push(cancelHref);");
  expect(routeSource).toContain("<MountedRootLink");
  expect(routeSource).toContain("legacyHref={cancelHref}");
  expect(routeSource).toContain("activeProps={legacyAnchorActiveProps}");
  expect(routeSource).not.toContain("useLinkProps");
  expect(routeSource).not.toContain("LegacyHrefAnchor");
  expect(routeSource).not.toContain("React.createElement");
  expect(routeSource).not.toContain('setAttribute("data-errType"');
  expect(
    rawAnchorBlocks.filter((block) => /Cancel|button\.cancel|prefixBasePath/u.test(block)),
  ).toEqual([]);
  expect(routeSource).not.toContain(
    '<Link to="/" activeOptions={{ exact: true }} className="ybtn">',
  );
  expect(routeSource).not.toContain("href={runtimeConfig.basePath}");
  expect(routeSource).not.toContain("<Link {...cancelLinkProps}>");
  expect(routeSource).not.toMatch(/\bdocument\s*\.\s*title\b/u);
  expect(routeSource).not.toMatch(/\bglobalThis\s*\.\s*document\b/u);
  expect(routeSource).not.toMatch(/\bwindow\s*\.\s*document\b/u);
  expect(effectBlocks.filter((block) => /\btitle\b/u.test(block))).toEqual([]);
  expect(routeSource).not.toMatch(
    /dangerouslySetInnerHTML|document\.|addEventListener|classList|\.style\.display/u,
  );
});

async function mockAuthenticatedSession(page: Page) {
  const requests = {
    createdOrganizations: [] as Array<{ description: string; organizationName: string }>,
  };

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
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
      body: JSON.stringify({ user: { loginId: "admin" } }),
    });
  });
  await page.route("**/api/v1/organizations", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as {
        description?: string;
        organizationName?: string;
      };
      requests.createdOrganizations.push({
        description: body.description ?? "",
        organizationName: body.organizationName ?? "",
      });
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Alpha team",
        id: 44,
        logoUrl: "/assets/images/organization_default_logo.png",
        organizationName: "team-alpha",
        redirectPath: "/organizations/team-alpha",
      }),
    });
  });

  return requests;
}

function rootHref(basePath: string) {
  return basePath;
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".unsupported, .gnb-outer, .page-wrap-outer, .page-footer-outer"),
    );
    return roots.map((root) => visit(root)).join("");

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
        "data-toggle",
        "data-placement",
        "data-errType",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
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

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

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
        "data-toggle",
        "data-placement",
        "data-errType",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
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

async function organizationCreateMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrap = requireElement(".project-page-wrap");
    const form = requireElement('form[name="new-org"]');
    const legend = requireElement("legend");
    const alert = requireElement(".n-alert");
    const warning = requireElement(".wrongName");
    const nameInput = requireElement("#name");
    const description = requireElement("#descr");
    const actions = requireElement(".actions");
    const submitButton = requireElement(".actions .ybtn-success");
    const formRect = form.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const descriptionRect = description.getBoundingClientRect();
    const nameInputRect = nameInput.getBoundingClientRect();
    const pageWrapRect = pageWrap.getBoundingClientRect();
    const submitButtonRect = submitButton.getBoundingClientRect();
    const legendStyle = getComputedStyle(legend);
    const warningStyle = getComputedStyle(warning);

    return {
      actionsOffsetTop: Math.round(actionsRect.top - descriptionRect.bottom),
      alertDataErrType: alert.getAttribute("data-errType"),
      descriptionHeight: Math.round(descriptionRect.height),
      descriptionWidth: Math.round(descriptionRect.width),
      formWidth: Math.round(formRect.width),
      nameInputWidth: Math.round(nameInputRect.width),
      pageWrapWidth: Math.round(pageWrapRect.width),
      submitButtonHeight: Math.round(submitButtonRect.height),
      titleFontSize: Math.round(parseFloat(legendStyle.fontSize)),
      warningDisplay: warningStyle.display,
    };

    function requireElement(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}
