import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";

const LEGACY_UIKIT_TEMPLATE = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/help/UIKit.scala.html", import.meta.url)),
  "utf8",
);
const LEGACY_SELECT2_TEMPLATE = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/views/common/select2.scala.html", import.meta.url),
  ),
  "utf8",
);
const UIKIT_ROUTE_SOURCE = readFileSync(
  fileURLToPath(new URL("../src/routes/[_]UIKit.tsx", import.meta.url)),
  "utf8",
);
const APP_CSS_SOURCE = readFileSync(
  fileURLToPath(new URL("../src/app.css", import.meta.url)),
  "utf8",
);
const UIKIT_STYLEX_SOURCE = readFileSync(
  fileURLToPath(new URL("../src/routes/-UIKit.stylex.ts", import.meta.url)),
  "utf8",
);
const ORIGINAL_MESSAGE_SOURCE = readFileSync(
  fileURLToPath(
    new URL(
      "../../yona-original/public/javascripts/common/yobi.OriginalMessage.js",
      import.meta.url,
    ),
  ),
  "utf8",
);
const ROOT_ROUTE_SOURCE = readFileSync(
  fileURLToPath(new URL("../src/routes/__root.tsx", import.meta.url)),
  "utf8",
);
const EXPECTED_UIKIT_TITLE = extractBetween(LEGACY_UIKIT_TEMPLATE, "<title>", "</title>");
const EXPECTED_UIKIT_BODY = extractBetween(LEGACY_UIKIT_TEMPLATE, "<body>", "</body>");
const SELECT2_TEMPLATE_IDS = [
  "tplSelect2FormatUser",
  "tplSelect2FormatMilestone",
  "tplSelect2Projects",
  "tplSelect2ProjectsWithoutAvatar",
  "tplSelect2FormatIssues",
];

async function expectRootLoginDialogState(dialog: Locator, visible: boolean) {
  await expect(dialog).toHaveAttribute("id", "loginDialog");
  await expect(dialog).toHaveAttribute("data-stylex-owner", "root-login-dialog-frame");
  await expect(dialog).toHaveAttribute("role", "dialog");
  await expect(dialog.locator('[data-stylex-owner="root-login-dialog-body"]')).toHaveCount(1);
  await expect(dialog).not.toHaveClass(/\bloginDialog\b|\bmodal\b|\bhide\b|\bin\b/);
  await expect(dialog).toHaveAttribute("aria-hidden", visible ? "false" : "true");
}

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

test("standalone UI kit renders legacy browser title metadata", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  await expect(page).toHaveTitle(EXPECTED_UIKIT_TITLE);
  await expect
    .poll(async () =>
      page
        .locator("head")
        .evaluate((head) =>
          Array.from(head.querySelectorAll("title"), (title) => title.textContent ?? ""),
        ),
    )
    .toContain(EXPECTED_UIKIT_TITLE);
});

test("standalone UI kit route renders JSX without raw legacy body injection", async () => {
  expect(UIKIT_ROUTE_SOURCE).toContain("<title>Yobi UI</title>");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("document.title");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("window.document");
  expect(UIKIT_ROUTE_SOURCE).not.toMatch(/useEffect\([\s\S]*title/);
  expect(UIKIT_ROUTE_SOURCE).not.toContain("UIKit.scala.html?raw");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("legacyUiKitTemplate");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("extractBetween");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("__html");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("LegacyAnchor");

  const routeSourceOutsideCodeSamples = UIKIT_ROUTE_SOURCE.replace(
    /<CodeSample>[\s\S]*?<\/CodeSample>/g,
    "",
  );
  expect(routeSourceOutsideCodeSamples).not.toMatch(/href=["']#/);
  expect(routeSourceOutsideCodeSamples).not.toContain('href="javascript:void(0)"');
});

test("standalone UI kit keeps the unreachable experimental-help action bridge out of app.css", () => {
  expect(APP_CSS_SOURCE).not.toContain("#experimentalHelp .actrow");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("#experimentalHelp");
});

test("standalone UI kit dropdown stays on React handlers without route document listeners", async () => {
  const routeSourceOutsideCodeSamples = UIKIT_ROUTE_SOURCE.replace(
    /<CodeSample>[\s\S]*?<\/CodeSample>/g,
    "",
  );

  expect(UIKIT_ROUTE_SOURCE).not.toContain("addEventListener");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("removeEventListener");
  expect(routeSourceOutsideCodeSamples).toContain('data-toggle="dropdown"');
  expect(routeSourceOutsideCodeSamples).toContain(
    'className={`btn-group${isOpen ? " open" : ""}`}',
  );
  expect(routeSourceOutsideCodeSamples).toContain("event.stopPropagation()");
  expect(routeSourceOutsideCodeSamples).toContain("setIsOpen((current) => !current)");
  expect(routeSourceOutsideCodeSamples).toContain("setSelectedValue");
  expect(routeSourceOutsideCodeSamples).toContain("setHasSelectedValue");
  expect(routeSourceOutsideCodeSamples).toContain("setIsOpen(false)");
});

test("root shell does not own route comment edit toggles", async () => {
  expect(ROOT_ROUTE_SOURCE).not.toContain('data-toggle="comment-edit"');
  expect(ROOT_ROUTE_SOURCE).not.toContain("comment-editform-");
  expect(ROOT_ROUTE_SOURCE).not.toContain("comment-body-");
});

test("root shell does not own route comment delete toggles", async () => {
  expect(ROOT_ROUTE_SOURCE).not.toContain('[data-toggle="comment-delete"]');
  expect(ROOT_ROUTE_SOURCE).not.toContain("comment-delete-modal");
  expect(ROOT_ROUTE_SOURCE).not.toContain("comment-delete-confirm");
});

test("root shell does not own route tab, search scope, or notify bridge state", async () => {
  expect(ROOT_ROUTE_SOURCE).not.toContain('[data-toggle="tab"], [data-toggle="pill"]');
  expect(ROOT_ROUTE_SOURCE).not.toContain('[data-toggle="search-scope"]');
  expect(ROOT_ROUTE_SOURCE).not.toContain("gnb-search-scope-title");
  expect(ROOT_ROUTE_SOURCE).not.toContain("scanNotifySources");
  expect(ROOT_ROUTE_SOURCE).not.toContain("yobi:notify-scan");
  expect(ROOT_ROUTE_SOURCE).not.toContain('[data-toggle="yobi-notify"]');
  expect(ROOT_ROUTE_SOURCE).not.toContain('[data-toggle="markdown-help"]');
  expect(ROOT_ROUTE_SOURCE).not.toContain(".markdown-help-nav");
  expect(ROOT_ROUTE_SOURCE).not.toContain(".markdown-help-wrap");
  expect(ROOT_ROUTE_SOURCE).toContain("<RootToastContext.Provider value={setRootToast}>");
  expect(ROOT_ROUTE_SOURCE).toContain('<div id="yobiToasts" className="yobiToasts">');
});

test("root shell does not own delegated original-message scanning", async () => {
  expect(ROOT_ROUTE_SOURCE).not.toContain("scanOriginalMessageSources");
  expect(ROOT_ROUTE_SOURCE).not.toContain("yobi:original-message-scan");
  expect(ROOT_ROUTE_SOURCE).not.toContain(
    'document.querySelectorAll<HTMLElement>("[data-via-email]")',
  );
  expect(ROOT_ROUTE_SOURCE).not.toContain('document.querySelectorAll("[data-via-email]")');
  expect(ROOT_ROUTE_SOURCE).not.toContain("yobiOriginalMessageProcessed");
  expect(ROOT_ROUTE_SOURCE).not.toContain("data-yobi-original-message-processed");
  expect(ROOT_ROUTE_SOURCE).not.toContain("delimiter.before(toggle)");
  expect(ROOT_ROUTE_SOURCE).not.toContain('toggle.textContent = "..."');
  expect(ROOT_ROUTE_SOURCE).not.toContain('toggle.addEventListener("click"');
  expect(ROOT_ROUTE_SOURCE).not.toContain("(^|^<[^>]+>)---+[^-]*---+");
});

test("root shell does not own route dropdown open, close, or selection mutation", async () => {
  expect(ROOT_ROUTE_SOURCE).not.toContain("closeDropdowns");
  expect(ROOT_ROUTE_SOURCE).not.toContain('[data-toggle="dropdown"]');
  expect(ROOT_ROUTE_SOURCE).not.toContain('data-activate="manual"');
  expect(ROOT_ROUTE_SOURCE).not.toContain(".btn-group.open, .dropdown.open");
  expect(ROOT_ROUTE_SOURCE).not.toContain('classList.toggle("open"');
  expect(ROOT_ROUTE_SOURCE).not.toContain(".btn-group[data-name] .dropdown-menu li");
  expect(ROOT_ROUTE_SOURCE).not.toContain("label.innerHTML = selectedItem.innerHTML");
  expect(ROOT_ROUTE_SOURCE).not.toContain("CSS.escape(fieldName)");
  expect(ROOT_ROUTE_SOURCE).not.toContain("container.append(hiddenInput)");
});

test("root shell does not own route alert dismissal", async ({ page }) => {
  expect(ROOT_ROUTE_SOURCE).not.toContain('[data-dismiss="alert"]');
  expect(ROOT_ROUTE_SOURCE).not.toContain("dismissAlert");
  expect(ROOT_ROUTE_SOURCE).not.toContain('closest<HTMLElement>(".alert")');
  expect(ROOT_ROUTE_SOURCE).not.toContain('[data-dismiss="modal"]');

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  await page.locator(".page-wrap-outer").evaluate((container) => {
    container.insertAdjacentHTML(
      "beforeend",
      `<div id="route-owned-alert-fixture" class="alert alert-success">
        <button type="button" class="close" data-dismiss="alert">&times;</button>
        <h4>Route-owned alert</h4>
      </div>`,
    );
  });

  await page.locator('#route-owned-alert-fixture [data-dismiss="alert"]').click();
  await expect(page.locator("#route-owned-alert-fixture")).toHaveCount(1);
});

test("root shell owns login dialog state without delegated document modal mutation", async () => {
  const forbiddenRootModalBridgeSources = [
    'document.addEventListener("click"',
    "target?.closest<HTMLElement>('[data-dismiss=\"modal\"]')",
    "target.closest<HTMLElement>('[data-toggle=\"modal\"]')",
    'document.querySelectorAll(".modal-backdrop")',
    "document.getElementById",
    'document.createElement("div")',
    "classList.add",
    "classList.remove",
    "style.display",
  ];

  for (const forbiddenSource of forbiddenRootModalBridgeSources) {
    expect(ROOT_ROUTE_SOURCE).not.toContain(forbiddenSource);
  }

  expect(ROOT_ROUTE_SOURCE).not.toContain("handleDocumentSubmit");
  expect(ROOT_ROUTE_SOURCE).not.toContain("getModalToggleSelector");
  expect(ROOT_ROUTE_SOURCE).not.toContain("getRootShellModalId");
  expect(ROOT_ROUTE_SOURCE).not.toContain('[data-toggle="modal"]');
  expect(ROOT_ROUTE_SOURCE).not.toContain("data-target");
  expect(ROOT_ROUTE_SOURCE).not.toMatch(/getAttribute\(["']href["']\).*#[^)]/s);
  expect(ROOT_ROUTE_SOURCE).not.toContain('document.querySelector<HTMLElement>("#loginDialog")');
  expect(ROOT_ROUTE_SOURCE).not.toContain("dialog.querySelectorAll<HTMLInputElement>(");
  expect(ROOT_ROUTE_SOURCE).not.toContain('dialog.style.display = "block"');
  expect(ROOT_ROUTE_SOURCE).not.toContain('dialog.style.display = "none"');
  expect(ROOT_ROUTE_SOURCE).not.toContain('error.style.display = "block"');
  expect(ROOT_ROUTE_SOURCE).not.toContain('error.style.display = "none"');
  expect(ROOT_ROUTE_SOURCE).not.toContain("window.location.reload");
  expect(ROOT_ROUTE_SOURCE).toContain("handleRootShellClick");
  expect(ROOT_ROUTE_SOURCE).toContain("handleRootLoginDialogSubmit");
  expect(ROOT_ROUTE_SOURCE).toContain("openRootLoginDialog");
  expect(ROOT_ROUTE_SOURCE).toContain("submitRootLoginDialogForm");
  expect(ROOT_ROUTE_SOURCE).toContain("onClickCapture={handleRootShellClick}");
  expect(ROOT_ROUTE_SOURCE).toContain("onSubmit={handleRootLoginDialogSubmit}");
  expect(ROOT_ROUTE_SOURCE).toContain("className={rootLoginDialogProps.className}");
  expect(ROOT_ROUTE_SOURCE).not.toContain('["loginDialog", rootLoginDialogProps.className]');
  expect(ROOT_ROUTE_SOURCE).toContain('className="modal-backdrop in"');
  expect(ROOT_ROUTE_SOURCE).toContain("data-stylex-owner={");
  expect(ROOT_ROUTE_SOURCE).toContain('"root-login-dialog-backdrop"');
  expect(ROOT_ROUTE_SOURCE).toContain("data-stylex-part={");
  expect(ROOT_ROUTE_SOURCE).toContain('"login-dialog-backdrop"');
  expect(ROOT_ROUTE_SOURCE).toContain("onClick={closeRootShellModal}");
});

test("UI kit route owns original-message demo state", async () => {
  expect(UIKIT_ROUTE_SOURCE).toContain('data-original-message-owner="route"');
  expect(UIKIT_ROUTE_SOURCE).toContain('data-stylex-owner="uikit-original-message-toggle"');
  expect(UIKIT_ROUTE_SOURCE).toContain("sx.styles.originalMessageToggle");
  expect(UIKIT_ROUTE_SOURCE).not.toContain(
    "style={{ border: 0, paddingLeft: 5, paddingRight: 5 }}",
  );
  expect(UIKIT_STYLEX_SOURCE).toContain('borderStyle: "none"');
  expect(UIKIT_STYLEX_SOURCE).toContain("borderWidth: 0");
  expect(UIKIT_STYLEX_SOURCE).toContain("paddingLeft: 5");
  expect(UIKIT_STYLEX_SOURCE).toContain("paddingRight: 5");
  expect(ORIGINAL_MESSAGE_SOURCE).toContain(".css('border', 0)");
  expect(ORIGINAL_MESSAGE_SOURCE).toContain(".css('padding-left', '5px')");
  expect(ORIGINAL_MESSAGE_SOURCE).toContain(".css('padding-right', '5px')");
  expect(UIKIT_ROUTE_SOURCE).toContain("setShowsViaEmailDemo");
  expect(UIKIT_ROUTE_SOURCE).not.toContain("yobi:original-message-scan");
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

test("standalone UI kit interactive JSX does not render raw legacy href controls", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);

  expect(await readRenderedLegacyHrefControls(page)).toEqual([]);
  await expect(page.locator("xmp").first()).toContainText('<a href="#" class="ybtn">Default</a>');
  await expect(page.locator("xmp").nth(2)).toContainText('<a href="javascript:void(0)">전체</a>');
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
  await expect(dropdown).not.toHaveClass(/open/);
  await expect(dropdown.locator(".dropdown-menu")).toBeHidden();
  await expect(dropdown.locator(".d-label")).toHaveText("담당자 없음");
  await expect(dropdown.locator('li[data-value="0"]')).toHaveClass(/active/);
  await expect(dropdown.locator('input[type="hidden"][name="assigneeId"]')).toHaveValue("0");
});

test("standalone UI kit root shell does not open synthetic data-toggle dropdowns", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  await page.locator(".page-wrap-outer").evaluate((container) => {
    container.insertAdjacentHTML(
      "beforeend",
      `<div id="synthetic-dropdown-fixture" class="btn-group" data-name="watcherId">
        <button class="btn dropdown-toggle large" data-toggle="dropdown">
          <span class="d-label">HEAD</span>
          <span class="d-caret"><span class="caret"></span></span>
        </button>
        <ul class="dropdown-menu">
          <li data-value="0"><button type="button">Watcher 없음</button></li>
        </ul>
      </div>`,
    );
  });

  const dropdown = page.locator("#synthetic-dropdown-fixture");
  await dropdown.locator('[data-toggle="dropdown"]').click();
  await expect(dropdown).not.toHaveClass(/open/);
  await expect(dropdown.locator(".d-label")).toHaveText("HEAD");
  await expect(dropdown.locator("li.active")).toHaveCount(0);
  await expect(dropdown.locator('input[type="hidden"][name="watcherId"]')).toHaveCount(0);
});

test("standalone UI kit root shell does not close or mutate pre-open synthetic dropdowns", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  await page.locator(".page-wrap-outer").evaluate((container) => {
    container.insertAdjacentHTML(
      "beforeend",
      `<button id="outside-dropdown-fixture" type="button">Outside</button>
      <div id="delegated-dropdown-fixture" class="btn-group open" data-name="watcherId" data-activate="manual">
        <button class="btn dropdown-toggle large" data-toggle="dropdown">
          <span class="d-label">HEAD</span>
          <span class="d-caret"><span class="caret"></span></span>
        </button>
        <ul class="dropdown-menu">
          <li data-value="0"><button type="button">Watcher 없음</button></li>
        </ul>
      </div>`,
    );
  });

  const dropdown = page.locator("#delegated-dropdown-fixture");
  await expect(dropdown).toHaveClass(/open/);

  await page.locator("#outside-dropdown-fixture").click();
  await expect(dropdown).toHaveClass(/open/);

  await dropdown.locator('li[data-value="0"] button').click();
  await expect(dropdown).toHaveClass(/open/);
  await expect(dropdown.locator(".d-label")).toHaveText("HEAD");
  await expect(dropdown.locator("li.active")).toHaveCount(0);
  await expect(dropdown.locator('input[type="hidden"][name="watcherId"]')).toHaveCount(0);
});

test("standalone UI kit root shell mounts legacy anonymous login dialog", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  const dialog = page.locator("#loginDialog");
  await expectRootLoginDialogState(dialog, false);
  await expect(dialog.locator("form.frm-wrap.login-form-wrap")).toHaveAttribute(
    "action",
    `${basePath}/users/login`,
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
  expect(await readLoginDialogHiddenMetrics(page)).toEqual({
    dialogDisplay: "none",
    dialogMarginLeft: "-230px",
    dialogWidth: "460px",
    errorDisplay: "none",
    errorMarginBottom: "20px",
    formMarginBottom: "20px",
    formMarginTop: "20px",
    inputBoxShadow: "none",
    loginButtonWidth: "100%",
    rememberCheckboxMarginTop: "4px",
    rememberLabelDisplay: "inline-block",
  });
});

test("standalone UI kit root shell renders legacy social-login-only dialog branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        allowPasswordLogin: false,
        enabledSocialProviders: ["github"],
        secretSetupRequired: false,
        signupMode: "PUBLIC",
        socialLoginOnly: true,
      },
    });
  });

  await page.goto(`${basePath}/_UIKit`);
  const dialog = page.locator("#loginDialog");
  await expect(dialog.locator(".btns-row.nm").first()).toHaveText(
    "Only allow sign-in via social login",
  );
  await expect(dialog.locator("#loginIdOrEmailD")).toHaveCount(0);
  await expect(dialog.locator("#passwordD")).toHaveCount(0);
  await expect(dialog.locator(".error")).toHaveCount(0);
  await expect(dialog.locator("button[type=submit]")).toHaveCount(0);
  await expect(dialog.locator(".act-row")).toHaveCount(0);
  await expect(dialog.locator(".social-login-title-line")).toHaveCount(0);
  await expect(dialog.locator(".oauth-login-btn")).toHaveCount(1);
  await expect(dialog.locator(".oauth-login-btn")).toHaveAttribute(
    "href",
    `${basePath}/authenticate/github`,
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

  await expectRootLoginDialogState(dialog, true);
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

  await dialog.locator(".pull-right .close").click();
  await expectRootLoginDialogState(dialog, false);
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

  await expectRootLoginDialogState(dialog, true);
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

  await expect(
    page.locator('link[href$="/legacy-assets/javascripts/lib/select2/select2.css"]'),
  ).toHaveAttribute("rel", "stylesheet");
  expect(await readSelect2ScriptOrder(page, basePath)).toEqual([
    `${basePath}/assets/javascripts/lib/select2/select2.js`,
    `${basePath}/assets/javascripts/common/yobi.ui.Select2.js`,
    "tplSelect2FormatUser",
  ]);
  await expect(page.locator('script[src$="/select2_locale_ko.js"]')).toHaveCount(0);
  await expect(page.locator('script[src$="/select2_locale_ja.js"]')).toHaveCount(0);
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

test("standalone UI kit root shell emits legacy select2 Korean locale script", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await setBrowserLanguage(page, "ko-KR");

  await page.goto(`${basePath}/_UIKit`);

  await expect(page.locator('script[src$="/select2_locale_ko.js"]')).toHaveCount(1);
  await expect(page.locator('script[src$="/select2_locale_ja.js"]')).toHaveCount(0);
  expect(await readSelect2ScriptOrder(page, basePath)).toEqual([
    `${basePath}/assets/javascripts/lib/select2/select2.js`,
    `${basePath}/assets/javascripts/common/yobi.ui.Select2.js`,
    `${basePath}/assets/javascripts/lib/select2/select2_locale_ko.js`,
    "tplSelect2FormatUser",
  ]);
});

test("standalone UI kit root shell emits legacy select2 Japanese locale script", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await setBrowserLanguage(page, "ja-JP");

  await page.goto(`${basePath}/_UIKit`);

  await expect(page.locator('script[src$="/select2_locale_ja.js"]')).toHaveCount(1);
  await expect(page.locator('script[src$="/select2_locale_ko.js"]')).toHaveCount(0);
  expect(await readSelect2ScriptOrder(page, basePath)).toEqual([
    `${basePath}/assets/javascripts/lib/select2/select2.js`,
    `${basePath}/assets/javascripts/common/yobi.ui.Select2.js`,
    `${basePath}/assets/javascripts/lib/select2/select2_locale_ja.js`,
    "tplSelect2FormatUser",
  ]);
});

test("standalone UI kit root shell does not open synthetic data-toggle modals", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  const yobiConfirm = page.locator("#yobiDialog .center-txt.buttons .ybtn.ybtn-info");
  await expect(yobiConfirm).toHaveText("Confirm");
  await expect(yobiConfirm).not.toHaveAttribute("data-dismiss", "modal");
  await expect(page.locator("#yobiDialog .btn-dismiss .btn-transparent")).not.toHaveAttribute(
    "data-dismiss",
    "modal",
  );
  await expect(page.locator("#loginDialog .pull-right .close")).not.toHaveAttribute(
    "data-dismiss",
    "modal",
  );

  await page.locator(".page-wrap-outer").evaluate((container, href) => {
    container.insertAdjacentHTML(
      "beforeend",
      `<button id="yobi-dialog-trigger" type="button" data-toggle="modal" data-target="#yobiDialog">Open dialog</button><button id="login-dialog-trigger" type="button" data-toggle="modal" data-target="#loginDialog">Open login modal</button><a id="href-login-dialog-trigger" href="#loginDialog" data-toggle="modal">Open login href modal</a><a id="login-required-fixture" href="${href}" data-login="required">Log in</a><button id="route-modal-trigger" type="button" data-toggle="modal" data-target="#routeOwnedModal">Open route modal</button><div id="routeOwnedModal" class="modal hide fade" tabindex="-1" role="dialog" aria-hidden="true"><div class="modal-footer"><button id="route-modal-dismiss" type="button" data-dismiss="modal">Close</button></div></div>`,
    );
  }, `${basePath}/users/loginform`);

  const yobiDialog = page.locator("#yobiDialog");
  const routeOwnedModal = page.locator("#routeOwnedModal");
  const loginDialog = page.locator("#loginDialog");
  await expect(routeOwnedModal).toHaveClass("modal hide fade");

  await page.locator("#yobi-dialog-trigger").click();
  await expect(yobiDialog).toHaveClass("modal hide yobiDialog");
  await expect(yobiDialog).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);

  await page.locator("#login-dialog-trigger").click();
  await expectRootLoginDialogState(loginDialog, false);
  await expect(loginDialog).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);

  await page.locator("#href-login-dialog-trigger").click();
  await expectRootLoginDialogState(loginDialog, false);
  await expect(loginDialog).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);

  await page.locator("#route-modal-trigger").click();
  await expect(routeOwnedModal).toHaveClass("modal hide fade");
  await expect(routeOwnedModal).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);

  await page.locator("#login-required-fixture").click();
  await expectRootLoginDialogState(loginDialog, true);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await loginDialog.locator(".pull-right .close").click();
  await expectRootLoginDialogState(loginDialog, false);
  await expect(loginDialog).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);

  await page.locator("#route-modal-dismiss").dispatchEvent("click");
  await expect(routeOwnedModal).toHaveClass("modal hide fade");
  await expect(routeOwnedModal).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(0);
});

test("standalone UI kit route owns legacy data-via-email original message", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);

  const fixture = page.locator("#ui-kit-via-email-fixture");
  await expect(fixture).toHaveCount(0);
  await page.locator('.switch.deactivate input[type="checkbox"]').check();
  await expect(fixture).toHaveAttribute("data-original-message-owner", "route");
  await expect(fixture.locator("blockquote > :first-child")).toHaveText("...");
  const toggle = fixture.locator('button[type="button"]');
  await expect(toggle).toHaveText("...");
  await expect(toggle).toHaveAttribute("data-stylex-owner", "uikit-original-message-toggle");
  await expect(toggle).not.toHaveAttribute("style", /.+/);
  await expect(toggle).toHaveCSS("border-top-width", "0px");
  await expect(toggle).toHaveCSS("border-right-width", "0px");
  await expect(toggle).toHaveCSS("border-bottom-width", "0px");
  await expect(toggle).toHaveCSS("border-left-width", "0px");
  await expect(toggle).toHaveCSS("padding-left", "5px");
  await expect(toggle).toHaveCSS("padding-right", "5px");
  await expect(page.locator("#via-email-delimiter")).toBeHidden();
  await expect(page.locator("#via-email-hidden-line")).toBeHidden();
  await expect(page.locator("#via-email-hidden-sibling")).toBeHidden();

  await page.evaluate(() => {
    document.dispatchEvent(new Event("yobi:original-message-scan"));
  });
  await expect(toggle).toHaveCount(1);
  await expect(page.locator("#via-email-delimiter")).toBeHidden();
  await expect(page.locator("#via-email-hidden-line")).toBeHidden();
  await expect(page.locator("#via-email-hidden-sibling")).toBeHidden();

  await toggle.click();
  await expect(page.locator("#via-email-delimiter")).toBeVisible();
  await expect(page.locator("#via-email-hidden-line")).toBeVisible();
  await expect(page.locator("#via-email-hidden-sibling")).toBeVisible();

  await toggle.click();
  await expect(page.locator("#via-email-delimiter")).toBeHidden();
  await expect(page.locator("#via-email-hidden-line")).toBeHidden();
  await expect(page.locator("#via-email-hidden-sibling")).toBeHidden();

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(toggleBox!.x).toBeGreaterThanOrEqual(0);
    expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(viewport.width);
  }

  await page.locator('.switch.deactivate input[type="checkbox"]').uncheck();
  await expect(fixture).toHaveCount(0);
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

async function readRenderedLegacyHrefControls(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href="#"], a[href^="javascript:"]'))
      .filter((anchor) => !anchor.closest("xmp"))
      .map((anchor) => ({
        href: anchor.getAttribute("href"),
        text: (anchor.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
  );
}

async function readLoginDialogOpenMetrics(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>("#loginDialog");
    const modalBody = document.querySelector<HTMLElement>(
      '[data-stylex-owner="root-login-dialog-body"]',
    );
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

async function readLoginDialogHiddenMetrics(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>("#loginDialog");
    const form = document.querySelector<HTMLElement>("#loginDialog .login-form-wrap");
    const input = document.querySelector<HTMLElement>("#loginIdOrEmailD");
    const error = document.querySelector<HTMLElement>("#loginDialog .error");
    const loginButton = document.querySelector<HTMLElement>("#loginDialog .fullsize");
    const rememberCheckbox = document.querySelector<HTMLElement>("#remember-meD");
    const rememberLabel = document.querySelector<HTMLElement>("#loginDialog .bg-checkbox");
    if (
      !dialog ||
      !form ||
      !input ||
      !error ||
      !loginButton ||
      !rememberCheckbox ||
      !rememberLabel
    ) {
      throw new Error("Expected hidden login dialog metric targets are missing.");
    }
    const dialogStyle = getComputedStyle(dialog);
    const formStyle = getComputedStyle(form);
    const errorStyle = getComputedStyle(error);
    return {
      dialogDisplay: dialogStyle.display,
      dialogMarginLeft: dialogStyle.marginLeft,
      dialogWidth: dialogStyle.width,
      errorDisplay: errorStyle.display,
      errorMarginBottom: errorStyle.marginBottom,
      formMarginBottom: formStyle.marginBottom,
      formMarginTop: formStyle.marginTop,
      inputBoxShadow: getComputedStyle(input).boxShadow,
      loginButtonWidth: getComputedStyle(loginButton).width,
      rememberCheckboxMarginTop: getComputedStyle(rememberCheckbox).marginTop,
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
        .filter((name) => hasStableAttribute(current, name))
        .map((name) => [name, stableAttributeValue(current, name)] as const)
        .filter(([name, value]) => value !== "" || name !== "class")
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
        .join(" ");
      const tagName = stableTagName(current);
      const open = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
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

      return `${open}${children}</${tagName}>`;
    }

    function stableTagName(current: Element) {
      return isLegacyAnchorReplacement(current) ? "a" : current.tagName.toLowerCase();
    }

    function hasStableAttribute(current: Element, name: string) {
      if (isLegacyAnchorReplacement(current)) {
        return name === "href" || (name === "class" && current.hasAttribute("class"));
      }
      return current.hasAttribute(name);
    }

    function stableAttributeValue(current: Element, name: string) {
      if (isLegacyAnchorReplacement(current) && name === "href") {
        return current.closest(".dropdown-menu") ? "javascript:void(0)" : "#";
      }
      if (name === "checked") {
        return "checked";
      }
      if (name === "href" && current.closest(".dropdown-menu")) {
        return "javascript:void(0)";
      }
      if (name === "class") {
        return (current.getAttribute(name) ?? "")
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              (!/^x[0-9a-z]+$/u.test(token) || token === "xlarge") &&
              !token.includes("__"),
          )
          .join(" ");
      }
      if (name === "style") {
        const raw = current.getAttribute("style") ?? "";
        const probe = document.createElement("div");
        probe.setAttribute("style", raw);
        if (!raw.includes("--x-")) {
          return probe.style.cssText;
        }
        // stylex dynamic values emit --x-* custom properties; resolve the
        // declarations the legacy inline style carried (background/color).
        const computed = window.getComputedStyle(current);
        return `background-color: ${computed.backgroundColor}; color: ${computed.color};`;
      }
      return current.getAttribute(name) ?? "";
    }

    function isLegacyAnchorReplacement(current: Element) {
      if (current.tagName.toLowerCase() !== "button") {
        return false;
      }
      if (
        current.closest(".dropdown-menu, .nav-tabs") ||
        current.classList.contains("avatar-wrap")
      ) {
        return true;
      }
      const className = current.getAttribute("class") ?? "";
      return ["ybtn", "ybtn ybtn-inverse", "ybtn ybtn-watching", "ybtn ybtn-danger"].includes(
        className,
      );
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
          .map((name) => `${name}=${JSON.stringify(stableAttributeValue(current, name))}`)
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

      function stableAttributeValue(current: Element, name: string) {
        if (name === "checked") {
          return "checked";
        }
        if (name === "href" && current.closest(".dropdown-menu")) {
          return "javascript:void(0)";
        }
        if (name === "style") {
          const probe = document.createElement("div");
          probe.setAttribute("style", current.getAttribute("style") ?? "");
          return probe.style.cssText;
        }
        return current.getAttribute(name) ?? "";
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

async function readSelect2ScriptOrder(page: Page, basePath: string) {
  return page.evaluate((expectedBasePath) => {
    const relevantScripts = [...document.scripts]
      .map((script) => script.id || script.getAttribute("src") || "")
      .filter(
        (value) =>
          value === "tplSelect2FormatUser" ||
          value === `${expectedBasePath}/assets/javascripts/lib/select2/select2.js` ||
          value === `${expectedBasePath}/assets/javascripts/common/yobi.ui.Select2.js` ||
          value === `${expectedBasePath}/assets/javascripts/lib/select2/select2_locale_ko.js` ||
          value === `${expectedBasePath}/assets/javascripts/lib/select2/select2_locale_ja.js`,
      );
    return relevantScripts.slice(0, relevantScripts.indexOf("tplSelect2FormatUser") + 1);
  }, basePath);
}

async function setBrowserLanguage(page: Page, language: string) {
  await page.addInitScript((nextLanguage) => {
    Object.defineProperty(navigator, "language", {
      configurable: true,
      get: () => nextLanguage,
    });
    Object.defineProperty(navigator, "languages", {
      configurable: true,
      get: () => [nextLanguage],
    });
  }, language);
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
