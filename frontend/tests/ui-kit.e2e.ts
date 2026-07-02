import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const LEGACY_UIKIT_TEMPLATE = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/help/UIKit.scala.html", import.meta.url)),
  "utf8",
);
const LEGACY_MARKDOWN_HELP_TEMPLATE = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/help/markdown.scala.html", import.meta.url)),
  "utf8",
);
const LEGACY_SELECT2_TEMPLATE = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/views/common/select2.scala.html", import.meta.url),
  ),
  "utf8",
);
const EXPECTED_UIKIT_BODY = extractBetween(LEGACY_UIKIT_TEMPLATE, "<body>", "</body>");
const LEGACY_MARKDOWN_HELP_BODY = LEGACY_MARKDOWN_HELP_TEMPLATE.split(
  '<script type="text/javascript">',
)[0].replace('@Messages("title.markdown.help")', "Markdown Help");
const SELECT2_TEMPLATE_IDS = [
  "tplSelect2FormatUser",
  "tplSelect2FormatMilestone",
  "tplSelect2Projects",
  "tplSelect2ProjectsWithoutAvatar",
  "tplSelect2FormatIssues",
];

test("standalone UI kit matches legacy help/UIKit.scala.html body DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toBeVisible();
  await expect(page.locator('input[name="viewport"]')).toHaveCount(0);
  await expect(page.locator("#experimentalHelp, #helpKeys")).toHaveCount(0);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
  );

  const actual = await canonicalizeUIKitRoots(page);
  const expected = await canonicalizeHtml(page, EXPECTED_UIKIT_BODY);

  expect(actual).toEqual(expected);
  expect(await readDesktopUIKitMetrics(page)).toEqual({
    bodyColor: "rgb(204, 204, 204)",
    cssBadgeBackground: "rgb(201, 235, 181)",
    cssBadgeBorderRadius: "3px",
    cssBadgeBorderWidth: "1px",
    cssBadgePaddingTop: "3px",
    ddMarginLeft: "0px",
    dlDisplay: "inline-block",
    dlMarginTop: "18px",
    gnbOuterHeight: "40px",
    gnbTextAlign: "center",
    pageFooterLineHeight: "34px",
    pageFooterOuterPadding: "10px 0px",
    pageWrapOuterMarginTop: "10px",
    pageWrapOuterMinHeight: "450px",
    pageWrapOuterMinWidth: "1100px",
    providerColor: "rgb(51, 51, 51)",
    providerFontSize: "9px",
    providerMarginLeft: "4px",
    subtitleFontSize: "24px",
    subtitleFontWeight: "700",
    subtitleHeight: "55px",
    subtitleLineHeight: "55px",
    subtitleVerticalAlign: "bottom",
  });
});

test("standalone UI kit keeps legacy mobile shell proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/_UIKit`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();

  expect(await readMobileUIKitMetrics(page)).toEqual({
    bodyColor: "rgb(204, 204, 204)",
    gnbOuterMinWidth: "10px",
    gnbOuterPadding: "0px 10px",
    gnbOuterTextAlign: "center",
    pageFooterLineHeight: "34px",
    pageFooterOuterMinWidth: "10px",
    pageFooterOuterPadding: "10px",
    pageFooterWidth: 370,
    pageWrapOuterMinHeight: "450px",
    pageWrapOuterMinWidth: "10px",
    pageWrapOuterPadding: "0px",
    pageWrapOuterWidth: 390,
    providerFontSize: "9px",
    subtitleFontSize: "24px",
    subtitleHeight: "55px",
    subtitleLineHeight: "55px",
  });
});

test("standalone UI kit dropdown matches legacy yobi.ui.Dropdown interaction", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  const dropdown = page.locator('.btn-group[data-name="assigneeId"]').first();
  await expect(dropdown).toBeVisible();
  await expect(dropdown.locator(".dropdown-menu")).toBeHidden();

  await dropdown.locator('[data-toggle="dropdown"]').click();
  await expect(dropdown).toHaveClass(/open/);
  await expect(dropdown.locator(".dropdown-menu")).toBeVisible();

  await dropdown.locator('li[data-value="0"]').click();
  await expect(dropdown.locator(".d-label")).toHaveText("담당자 없음");
  await expect(dropdown.locator('li[data-value="0"]')).toHaveClass(/active/);
  await expect(dropdown.locator('input[type="hidden"][name="assigneeId"]')).toHaveValue("0");
});

test("standalone UI kit root shell skips yobi dropdown mutation for data-activate manual", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  await page.locator(".page-wrap-outer").evaluate((container) => {
    container.insertAdjacentHTML(
      "beforeend",
      `<div id="manual-branch-dropdown" class="btn-group branches pull-right" data-name="branch" data-activate="manual">
        <button class="btn dropdown-toggle large" data-toggle="dropdown">
          <span class="d-label">HEAD</span>
          <span class="d-caret"><span class="caret"></span></span>
        </button>
        <ul class="dropdown-menu">
          <li data-value="main"><a href="/yona/project/commits/main">main</a></li>
        </ul>
      </div>`,
    );
  });

  const dropdown = page.locator("#manual-branch-dropdown");
  await dropdown.locator('[data-toggle="dropdown"]').click();
  await expect(dropdown).toHaveClass(/open/);

  await dropdown.locator('li[data-value="main"]').click();
  await expect(dropdown.locator(".d-label")).toHaveText("HEAD");
  await expect(dropdown.locator("li.active")).toHaveCount(0);
  await expect(dropdown.locator('input[type="hidden"][name="branch"]')).toHaveCount(0);
});

test("standalone UI kit root shell applies legacy navbar search scope selection", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  await page.locator(".page-wrap-outer").evaluate((container) => {
    container.insertAdjacentHTML(
      "afterbegin",
      `<form action="/yona/search" class="input-prepend gnb-search-form" name="gnb-search-form" style="position: fixed; top: 0; left: 0; z-index: 10000; width: 320px;">
        <input type="hidden" name="searchType" value="auto">
        <div class="btn-group open">
          <button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">
            Project
          </button>
          <ul class="dropdown-menu flat right">
            <li><a href="#" data-toggle="search-scope" data-action="/yona/search/project/yona">Project</a></li>
            <li><a href="#" data-toggle="search-scope" data-action="/yona/search/group/yona">Group</a></li>
            <li><a href="#" data-toggle="search-scope" data-action="/yona/search">All</a></li>
          </ul>
        </div>
      </form>`,
    );
  });

  await page
    .locator('[data-toggle="search-scope"][data-action="/yona/search/group/yona"]')
    .dispatchEvent("click");

  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    "/yona/search/group/yona",
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("Group");
});

test("standalone UI kit root shell applies legacy markdown help tab selection", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const expectedTargets = [
    "markdownHeaders",
    "markdownStyling",
    "markdownLinks",
    "markdownLists",
    "markdownTaskList",
    "markdownImages",
    "markdownBlockquotes",
    "markdownCodes",
    "markdownTables",
    "markdownShortLinks",
  ];

  await page.goto(`${basePath}/_UIKit`);
  await page.locator(".page-wrap-outer").evaluate((container, markup) => {
    container.insertAdjacentHTML("beforeend", markup);
  }, LEGACY_MARKDOWN_HELP_BODY);

  expect(await normalizedOuterHtml(page, ".markdown-help")).toEqual(
    await normalizedFragmentOuterHtml(page, LEGACY_MARKDOWN_HELP_BODY, ".markdown-help"),
  );
  await expect(page.locator(".markdown-help-nav .help-nav")).toHaveCount(expectedTargets.length);
  expect(
    await page.locator(".markdown-help-nav .help-nav").evaluateAll((items) =>
      items.map((item) => ({
        target: item.getAttribute("data-target"),
        toggle: item.getAttribute("data-toggle"),
      })),
    ),
  ).toEqual(expectedTargets.map((target) => ({ target, toggle: "markdown-help" })));

  await page.locator('[data-toggle="markdown-help"][data-target="markdownLinks"]').click();
  await expect(page.locator('.markdown-help-nav [data-target="markdownLinks"]')).toHaveClass(
    /active/,
  );
  await expect(page.locator(".markdown-help-wrap > .markdownLinks")).toHaveClass(/active/);
  await expect(page.locator(".markdown-help-wrap > .markdownHeaders")).not.toHaveClass(/active/);

  await page.locator('[data-toggle="markdown-help"][data-target="markdownLists"]').click();
  await expect(page.locator('.markdown-help-nav [data-target="markdownLinks"]')).not.toHaveClass(
    /active/,
  );
  await expect(page.locator(".markdown-help-wrap > .markdownLinks")).not.toHaveClass(/active/);
  await expect(page.locator('.markdown-help-nav [data-target="markdownLists"]')).toHaveClass(
    /active/,
  );
  await expect(page.locator(".markdown-help-wrap > .markdownLists")).toHaveClass(/active/);
  expect(await markdownHelpMetrics(page)).toEqual({
    activeBorderBottomWidth: "0px",
    activeBorderTopWidth: "0px",
    activePadding: "10px",
    activeTextColor: "rgb(51, 51, 51)",
    firstHelpNavColor: "rgb(158, 158, 158)",
    firstHelpNavCursor: "pointer",
    firstHelpNavLineHeight: "20px",
    firstHelpNavPadding: "5px 7px",
    inactiveHeight: "0px",
    inactiveOverflow: "hidden",
    labelBackground: "rgb(199, 201, 201)",
    labelTextShadow: "none",
    markdownHelpMarginTop: "5px",
    navBackground: "rgb(247, 247, 247)",
    navBorderBottomWidth: "0px",
    navBorderTopWidth: "1px",
    navListStyleType: "none",
    syntaxBorderTopWidth: "1px",
    syntaxPadding: "10px",
    theadBackground: "rgb(247, 247, 247)",
    theadBorderTopWidth: "1px",
    theadCellFontWeight: "700",
    theadCellLineHeight: "30px",
    wrapBackground: "rgb(255, 255, 255)",
    wrapListStyleType: "none",
  });

  await page.locator('[data-toggle="markdown-help"][data-target="markdownLists"]').click();
  await expect(page.locator('.markdown-help-nav [data-target="markdownLists"]')).not.toHaveClass(
    /active/,
  );
  await expect(page.locator(".markdown-help-wrap > .markdownLists")).not.toHaveClass(/active/);
});

test("standalone UI kit root shell mounts legacy anonymous login dialog", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  const dialog = page.locator("#loginDialog");
  await expect(dialog).toHaveClass(/modal/);
  await expect(dialog).toHaveClass(/hide/);
  await expect(dialog).toHaveClass(/loginDialog/);
  await expect(dialog.locator("form.frm-wrap.login-form-wrap")).toHaveAttribute(
    "action",
    "/users/login",
  );
  await expect(dialog.locator("form.frm-wrap.login-form-wrap")).toHaveAttribute("method", "post");
  await expect(dialog.locator("#loginIdOrEmailD")).toHaveAttribute("name", "loginIdOrEmail");
  await expect(dialog.locator("#loginIdOrEmailD")).toHaveAttribute(
    "placeholder",
    "Login ID or E-mail",
  );
  await expect(dialog.locator("#passwordD")).toHaveAttribute("name", "password");
  await expect(dialog.locator("#passwordD")).toHaveAttribute("placeholder", "Password");
  await expect(dialog.locator(".error .error-message")).toHaveCount(1);
  await expect(dialog.locator("#remember-meD")).toBeChecked();
  await expect(dialog.locator('label[for="remember-meD"].bg-checkbox')).toHaveText(
    "Stay logged in",
  );
  await expect(dialog.locator(".act-row a").first()).toHaveAttribute(
    "href",
    `${basePath}/lostPassword`,
  );
  await expect(dialog.locator(".act-row a").last()).toHaveAttribute(
    "href",
    `${basePath}/users/signupform`,
  );
});

test("standalone UI kit root shell opens legacy login dialog from data-login required", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  await page.locator(".page-wrap-outer").evaluate((container, href) => {
    container.insertAdjacentHTML(
      "beforeend",
      `<a id="login-required-fixture" href="${href}" data-login="required">Log in</a>`,
    );
  }, `${basePath}/users/loginform`);
  const dialog = page.locator("#loginDialog");
  await dialog.evaluate((element) => {
    const loginId = element.querySelector<HTMLInputElement>("#loginIdOrEmailD");
    const password = element.querySelector<HTMLInputElement>("#passwordD");
    const error = element.querySelector<HTMLElement>(".error");
    if (loginId) {
      loginId.value = "stale-user";
    }
    if (password) {
      password.value = "stale-password";
    }
    if (error) {
      error.style.display = "block";
    }
  });

  await page.locator("#login-required-fixture").click();

  await expect(dialog).toHaveClass("modal loginDialog in");
  await expect(dialog).toHaveAttribute("aria-hidden", "false");
  await expect(dialog).toHaveCSS("display", "block");
  await expect(dialog.locator("#loginIdOrEmailD")).toBeFocused();
  await expect(dialog.locator("#loginIdOrEmailD")).toHaveValue("");
  await expect(dialog.locator("#passwordD")).toHaveValue("");
  await expect(dialog.locator(".error")).toBeHidden();
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  expect(await readLoginDialogOpenMetrics(page)).toEqual({
    bodyPadding: "15px",
    closeButtonFloat: "right",
    dialogLeft: "640px",
    dialogMarginLeft: "-230px",
    dialogWidth: "460px",
    formMarginBottom: "20px",
    formMarginTop: "20px",
    inputBoxShadow: "none",
    loginButtonWidth: "400px",
    rememberLabelDisplay: "inline-block",
  });

  await dialog.locator('[data-dismiss="modal"]').click();
  await expect(dialog).toHaveClass("modal loginDialog hide");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);
});

test("standalone UI kit login dialog shows legacy AJAX failure error", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const signInRequests: Array<{
    body: unknown;
    csrfToken: string | undefined;
    method: string;
  }> = [];

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-login-dialog" },
      json: { csrfToken: "csrf-login-dialog" },
    });
  });
  await page.route("**/api/v1/auth/sign-in", async (route) => {
    signInRequests.push({
      body: route.request().postDataJSON() as unknown,
      csrfToken: route.request().headers()["x-csrf-token"],
      method: route.request().method(),
    });
    await route.fulfill({
      contentType: "application/json",
      json: {
        error: {
          code: "auth_invalid_credentials",
          message: "Invalid ID or password.",
          status: 403,
        },
      },
      status: 403,
    });
  });

  await page.goto(`${basePath}/_UIKit`);
  await page.locator(".page-wrap-outer").evaluate((container, href) => {
    container.insertAdjacentHTML(
      "beforeend",
      `<a id="login-required-fixture" href="${href}" data-login="required">Log in</a>`,
    );
  }, `${basePath}/users/loginform`);

  const dialog = page.locator("#loginDialog");
  await page.locator("#login-required-fixture").click();
  await dialog.locator("#loginIdOrEmailD").fill("bad-user");
  await dialog.locator("#passwordD").fill("bad-password");
  await dialog.locator("#remember-meD").uncheck();
  await dialog.locator("button[type=submit]").click();

  await expect(dialog).toHaveClass("modal loginDialog in");
  await expect(dialog.locator("#loginIdOrEmailD")).toHaveValue("bad-user");
  await expect(dialog.locator("#passwordD")).toHaveValue("bad-password");
  await expect(dialog.locator(".error")).toBeVisible();
  await expect(dialog.locator(".error .error-message")).toHaveText("Invalid ID or password.");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  expect(signInRequests).toEqual([
    {
      body: { identifier: "bad-user", password: "bad-password", rememberMe: false },
      csrfToken: "csrf-login-dialog",
      method: "POST",
    },
  ]);
});

test("standalone UI kit root shell mounts legacy select2 formatter templates", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const expectedTemplates = extractLegacyScriptTemplates(
    LEGACY_SELECT2_TEMPLATE,
    SELECT2_TEMPLATE_IDS,
  );

  await page.goto(`${basePath}/_UIKit`);

  expect(await readRenderedScriptTemplates(page, SELECT2_TEMPLATE_IDS)).toEqual(expectedTemplates);
  expect(await readRenderedScriptTemplateMetrics(page, SELECT2_TEMPLATE_IDS)).toEqual({
    displays: ["none", "none", "none", "none", "none"],
    heights: [0, 0, 0, 0, 0],
    ids: SELECT2_TEMPLATE_IDS,
    textLengths: Object.values(expectedTemplates).map((template) => template.length),
    types: [
      "text/x-jquery-tmpl",
      "text/x-jquery-tmpl",
      "text/x-jquery-tmpl",
      "text/x-jquery-tmpl",
      "text/x-jquery-tmpl",
    ],
    widths: [0, 0, 0, 0, 0],
  });
});

test("standalone UI kit root shell dismisses legacy modal buttons", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  const dialog = page.locator("#loginDialog");
  await dialog.evaluate((element) => {
    element.classList.remove("hide");
    element.classList.add("in");
    (element as HTMLElement).style.display = "block";
  });

  await expect(dialog).toHaveClass("modal loginDialog in");
  await dialog.locator('[data-dismiss="modal"]').click();
  await expect(dialog).toHaveClass("modal loginDialog hide");
  await expect(dialog).toHaveAttribute("aria-hidden", "true");
});

test("standalone UI kit root shell hides legacy data-via-email original message", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  await page.locator(".page-wrap-outer").evaluate((container) => {
    container.insertAdjacentHTML(
      "beforeend",
      `<div id="via-email-fixture" class="markdown-wrap" data-via-email="true">
        <p>Reply body</p>
        <blockquote>
          <p id="via-email-delimiter">--- Original Message ---</p>
          <p id="via-email-hidden-line">Hidden original line</p>
        </blockquote>
        <p id="via-email-hidden-sibling">Hidden sibling after blockquote</p>
      </div>`,
    );
    document.dispatchEvent(new Event("yobi:original-message-scan"));
  });

  const fixture = page.locator("#via-email-fixture");
  await expect(fixture.locator('button[type="button"]')).toHaveText("...");
  await expect(page.locator("#via-email-delimiter")).toBeHidden();
  await expect(page.locator("#via-email-hidden-line")).toBeHidden();
  await expect(page.locator("#via-email-hidden-sibling")).toBeHidden();

  await fixture.locator('button[type="button"]').click();
  await expect(page.locator("#via-email-delimiter")).toBeVisible();
  await expect(page.locator("#via-email-hidden-line")).toBeVisible();
  await expect(page.locator("#via-email-hidden-sibling")).toBeVisible();
});

async function readDesktopUIKitMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const subtitle = document.querySelector<HTMLElement>(".subtitle");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    const dl = document.querySelector<HTMLElement>("dl");
    const dd = document.querySelector<HTMLElement>("dd");
    const cssBadge = document.querySelector<HTMLElement>(".css");
    if (
      !gnbOuter ||
      !subtitle ||
      !pageWrapOuter ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider ||
      !dl ||
      !dd ||
      !cssBadge
    ) {
      throw new Error("Expected UI kit metric targets are missing.");
    }

    const bodyStyle = getComputedStyle(document.body);
    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const subtitleStyle = getComputedStyle(subtitle);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);
    const dlStyle = getComputedStyle(dl);
    const ddStyle = getComputedStyle(dd);
    const cssBadgeStyle = getComputedStyle(cssBadge);

    return {
      bodyColor: bodyStyle.color,
      cssBadgeBackground: cssBadgeStyle.backgroundColor,
      cssBadgeBorderRadius: cssBadgeStyle.borderTopLeftRadius,
      cssBadgeBorderWidth: cssBadgeStyle.borderTopWidth,
      cssBadgePaddingTop: cssBadgeStyle.paddingTop,
      ddMarginLeft: ddStyle.marginLeft,
      dlDisplay: dlStyle.display,
      dlMarginTop: dlStyle.marginTop,
      gnbOuterHeight: gnbOuterStyle.height,
      gnbTextAlign: gnbOuterStyle.textAlign,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
      subtitleFontSize: subtitleStyle.fontSize,
      subtitleFontWeight: subtitleStyle.fontWeight,
      subtitleHeight: subtitleStyle.height,
      subtitleLineHeight: subtitleStyle.lineHeight,
      subtitleVerticalAlign: subtitleStyle.verticalAlign,
    };
  });
}

async function readMobileUIKitMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const subtitle = document.querySelector<HTMLElement>(".subtitle");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (!gnbOuter || !subtitle || !pageWrapOuter || !pageFooter || !pageFooterOuter || !provider) {
      throw new Error("Expected UI kit mobile metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const subtitleStyle = getComputedStyle(subtitle);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);

    return {
      bodyColor: getComputedStyle(document.body).color,
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      gnbOuterTextAlign: gnbOuterStyle.textAlign,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterMinWidth: pageFooterOuterStyle.minWidth,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageFooterWidth: Math.round(pageFooter.getBoundingClientRect().width),
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      pageWrapOuterPadding: pageWrapOuterStyle.padding,
      pageWrapOuterWidth: Math.round(pageWrapOuter.getBoundingClientRect().width),
      providerFontSize: getComputedStyle(provider).fontSize,
      subtitleFontSize: subtitleStyle.fontSize,
      subtitleHeight: subtitleStyle.height,
      subtitleLineHeight: subtitleStyle.lineHeight,
    };
  });
}

async function readLoginDialogOpenMetrics(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>("#loginDialog");
    const modalBody = document.querySelector<HTMLElement>("#loginDialog .modal-body");
    const close = document.querySelector<HTMLElement>("#loginDialog .close");
    const form = document.querySelector<HTMLElement>("#loginDialog .login-form-wrap");
    const input = document.querySelector<HTMLElement>("#loginIdOrEmailD");
    const loginButton = document.querySelector<HTMLElement>("#loginDialog .fullsize");
    const rememberLabel = document.querySelector<HTMLElement>("#loginDialog .bg-checkbox");
    if (!dialog || !modalBody || !close || !form || !input || !loginButton || !rememberLabel) {
      throw new Error("Expected login dialog metric targets are missing.");
    }
    const dialogStyle = getComputedStyle(dialog);
    const formStyle = getComputedStyle(form);
    return {
      bodyPadding: getComputedStyle(modalBody).padding,
      closeButtonFloat: getComputedStyle(close).float,
      dialogLeft: dialogStyle.left,
      dialogMarginLeft: dialogStyle.marginLeft,
      dialogWidth: dialogStyle.width,
      formMarginBottom: formStyle.marginBottom,
      formMarginTop: formStyle.marginTop,
      inputBoxShadow: getComputedStyle(input).boxShadow,
      loginButtonWidth: getComputedStyle(loginButton).width,
      rememberLabelDisplay: getComputedStyle(rememberLabel).display,
    };
  });
}

async function canonicalizeUIKitRoots(page: Page) {
  return page.evaluate(() => {
    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "href",
        "src",
        "accept",
        "placeholder",
        "checked",
        "style",
        "data-toggle",
        "data-target",
        "data-name",
        "data-value",
        "data-selected",
        "data-on-label",
        "data-off-label",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
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

    const roots = Array.from(
      document.querySelectorAll(".gnb-outer, .page-wrap-outer, .page-footer-outer"),
    );
    return roots.map((root) => visit(root)).join("");
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      function visit(current: Element): string {
        const stableAttributes = [
          "id",
          "class",
          "name",
          "type",
          "href",
          "src",
          "accept",
          "placeholder",
          "checked",
          "style",
          "data-toggle",
          "data-target",
          "data-name",
          "data-value",
          "data-selected",
          "data-on-label",
          "data-off-label",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
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

      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .filter((root) => root.matches(".gnb-outer, .page-wrap-outer, .page-footer-outer"))
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}

async function normalizedOuterHtml(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => root.outerHTML);
}

async function markdownHelpMetrics(page: Page) {
  return page.locator(".markdown-help").evaluate((root) => {
    const nav = root.querySelector<HTMLElement>(".markdown-help-nav");
    const firstHelpNav = root.querySelector<HTMLElement>(".markdown-help-nav .help-nav");
    const activeHelpNav = root.querySelector<HTMLElement>(".markdown-help-nav .help-nav.active");
    const label = root.querySelector<HTMLElement>(".markdown-help-nav .label");
    const wrap = root.querySelector<HTMLElement>(".markdown-help-wrap");
    const activeItem = root.querySelector<HTMLElement>(".markdown-help-wrap > .active");
    const inactiveItem = root.querySelector<HTMLElement>(
      ".markdown-help-wrap > .markdown-help-item:not(.active)",
    );
    const thead = activeItem?.querySelector<HTMLElement>(".thead");
    const theadCell = thead?.querySelector<HTMLElement>("div");
    const syntaxWrap = activeItem?.querySelector<HTMLElement>(".markdwon-syntax-wrap");
    const syntax = activeItem?.querySelector<HTMLElement>(".markdwon-syntax");
    const missing = Object.entries({
      activeHelpNav,
      activeItem,
      firstHelpNav,
      inactiveItem,
      label,
      nav,
      syntax,
      syntaxWrap,
      thead,
      theadCell,
      wrap,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected markdown help metric targets are missing: ${missing.join(", ")}`);
    }

    const rootStyle = getComputedStyle(root);
    const navStyle = getComputedStyle(nav!);
    const firstHelpNavStyle = getComputedStyle(firstHelpNav!);
    const activeHelpNavStyle = getComputedStyle(activeHelpNav!);
    const labelStyle = getComputedStyle(label!);
    const wrapStyle = getComputedStyle(wrap!);
    const activeStyle = getComputedStyle(activeItem!);
    const inactiveStyle = getComputedStyle(inactiveItem!);
    const theadStyle = getComputedStyle(thead!);
    const theadCellStyle = getComputedStyle(theadCell!);
    const syntaxWrapStyle = getComputedStyle(syntaxWrap!);
    const syntaxStyle = getComputedStyle(syntax!);

    return {
      activeBorderBottomWidth: activeStyle.borderBottomWidth,
      activeBorderTopWidth: activeStyle.borderTopWidth,
      activePadding: activeStyle.padding,
      activeTextColor: activeHelpNavStyle.color,
      firstHelpNavColor: firstHelpNavStyle.color,
      firstHelpNavCursor: firstHelpNavStyle.cursor,
      firstHelpNavLineHeight: firstHelpNavStyle.lineHeight,
      firstHelpNavPadding: firstHelpNavStyle.padding,
      inactiveHeight: inactiveStyle.height,
      inactiveOverflow: inactiveStyle.overflow,
      labelBackground: labelStyle.backgroundColor,
      labelTextShadow: labelStyle.textShadow,
      markdownHelpMarginTop: rootStyle.marginTop,
      navBackground: navStyle.backgroundColor,
      navBorderBottomWidth: navStyle.borderBottomWidth,
      navBorderTopWidth: navStyle.borderTopWidth,
      navListStyleType: navStyle.listStyleType,
      syntaxBorderTopWidth: syntaxWrapStyle.borderTopWidth,
      syntaxPadding: syntaxStyle.padding,
      theadBackground: theadStyle.backgroundColor,
      theadBorderTopWidth: theadStyle.borderTopWidth,
      theadCellFontWeight: theadCellStyle.fontWeight,
      theadCellLineHeight: theadCellStyle.lineHeight,
      wrapBackground: wrapStyle.backgroundColor,
      wrapListStyleType: wrapStyle.listStyleType,
    };
  });
}

async function normalizedFragmentOuterHtml(page: Page, html: string, selector: string) {
  return page.evaluate(
    ({ markup, rootSelector }) => {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      const root = template.content.querySelector(rootSelector);
      if (!root) {
        throw new Error(`Expected legacy root is missing: ${rootSelector}`);
      }
      return root.outerHTML;
    },
    { markup: html, rootSelector: selector },
  );
}

function extractLegacyScriptTemplates(markup: string, ids: string[]) {
  return Object.fromEntries(
    ids.map((id) => {
      const pattern = new RegExp(
        `<script\\s+id="${id}"\\s+type="text/x-jquery-tmpl">([\\s\\S]*?)</script>`,
        "u",
      );
      const match = pattern.exec(markup);
      if (!match) {
        throw new Error(`Expected legacy select2 template is missing: ${id}`);
      }
      return [id, normalizeTemplateText(match[1] ?? "")];
    }),
  );
}

async function readRenderedScriptTemplates(page: Page, ids: string[]) {
  return page.evaluate((templateIds) => {
    const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
    return Object.fromEntries(
      templateIds.map((id) => {
        const template = document.querySelector<HTMLScriptElement>(
          `script#${CSS.escape(id)}[type="text/x-jquery-tmpl"]`,
        );
        if (!template) {
          throw new Error(`Expected rendered select2 template is missing: ${id}`);
        }
        return [id, normalize(template.textContent ?? "")];
      }),
    );
  }, ids);
}

async function readRenderedScriptTemplateMetrics(page: Page, ids: string[]) {
  return page.evaluate((templateIds) => {
    const templates = templateIds.map((id) => {
      const template = document.querySelector<HTMLScriptElement>(
        `script#${CSS.escape(id)}[type="text/x-jquery-tmpl"]`,
      );
      if (!template) {
        throw new Error(`Expected rendered select2 template is missing: ${id}`);
      }
      return template;
    });
    return {
      displays: templates.map((template) => window.getComputedStyle(template).display),
      heights: templates.map((template) => Math.round(template.getBoundingClientRect().height)),
      ids: templates.map((template) => template.id),
      textLengths: templates.map(
        (template) => (template.textContent ?? "").replace(/\s+/g, " ").trim().length,
      ),
      types: templates.map((template) => template.type),
      widths: templates.map((template) => Math.round(template.getBoundingClientRect().width)),
    };
  }, ids);
}

function normalizeTemplateText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Legacy UIKit template marker not found: ${start} ... ${end}`);
  }
  return source.slice(startIndex + start.length, endIndex);
}
