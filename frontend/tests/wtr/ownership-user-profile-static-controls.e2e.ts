import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("output/playwright/style-user-profile-static-controls");

test.use({ locale: "en-US" });

test("authenticated public profile issues controls preserve legacy output and own Style presentation", async ({
  page,
}) => {
  const routeSource = readFileSync("src/routes/$user.tsx", "utf8");
  const sharedComponentSource = readFileSync("src/components/two-column-mode-checkbox.tsx", "utf8");

  const styleSource = readFileSync("src/app.css", "utf8");
  const legacyView = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const legacyTwoColumn = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const legacySubtasks = readFileSync(
    "../yona-original/app/views/common/showSubtasksCheckbox.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const twoColumnJs = readFileSync(
    "../yona-original/public/javascripts/service/yona.twoColumnMode.js",
    "utf8",
  );
  const subtasksJs = readFileSync(
    "../yona-original/public/javascripts/service/yona.showSubtask.js",
    "utf8",
  );

  // Output DOM provenance: user/view.scala.html and its two common checkbox partials.
  expect(legacyView).toContain("@common.twoColumnModeCheckboxArea()");
  expect(legacyView).toContain("@common.showSubtasksCheckbox()");
  expect(legacyView).toContain('<ul class="nav nav-tabs">');
  expect(legacyView).toContain('<ul class="nav nav-tabs nm">');
  expect(legacyTwoColumn).toContain('class="two-column-icon mr10 hide-in-mobile"');
  expect(legacyTwoColumn).toContain('id="two-column-mode-checkbox"');
  expect(legacyTwoColumn).toContain('id="two-column-mode"');
  expect(legacyTwoColumn).toContain('class="two-column-icon-border"');
  expect(legacyTwoColumn).toContain('class="two-column-mode-text"');
  expect(legacySubtasks).toContain('class="show-subtasks mr10"');
  expect(legacySubtasks).toContain('id="two-column-mode-checkbox"');
  expect(legacySubtasks).toContain('id="toggle-show-subtasks"');
  expect(legacySubtasks).toContain('class="show-subtasks-button-border"');
  expect(legacySubtasks).toContain('class="show-subtasks-text"');

  // Frozen declaration provenance: less/_page.less 7384-7435 and the 720px
  // hide-in-mobile rule in less/_responsive.less.
  for (const declaration of [
    "display: inline-block;",
    "line-height: 37px;",
    "margin-left: 10px;",
    "padding-top: 4px;",
    "padding-left: 0;",
    "float: none;",
    "margin: 4px 4px 0 2px;",
    "vertical-align: top;",
    "color: #03a9f4;",
    "border: 1px solid #03afff;",
    "border-radius: 3px;",
    "padding: 3px 3px 0 3px;",
    "background-color: #03afff;",
    "color: #fff0ff;",
    "padding: 0 4px 0 0;",
    "line-height: 20px;",
    "vertical-align: text-bottom;",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  expect(responsiveLess).toContain(".hide-in-mobile");
  expect(responsiveLess).toContain("display: none !important;");
  expect(bootstrap).toContain("label {\n  display: block;\n  margin-bottom: 5px;\n}");
  expect(bootstrap).toContain(
    ".radio,\n.checkbox {\n  min-height: 20px;\n  padding-left: 20px;\n}",
  );
  expect(bootstrap).toContain(
    '.radio input[type="radio"],\n.checkbox input[type="checkbox"] {\n  float: left;\n  margin-left: -20px;\n}',
  );
  expect(bootstrap).toContain(
    'input[type="radio"],\ninput[type="checkbox"] {\n  margin: 4px 0 0;\n',
  );
  expect(bootstrap).toContain('input[type="radio"],\ninput[type="checkbox"] {\n  width: auto;\n');
  expect(pageLess).toContain(
    ".checkbox {\n    .inline-block;\n    vertical-align:top;\n    margin:2px !important;\n}",
  );

  // Behavior provenance: JS is evidence only; the route owns the behavior with React events.
  expect(twoColumnJs).toContain("localStorage.getItem('useTwoColumnMode')");
  expect(twoColumnJs).toContain("localStorage.setItem('useTwoColumnMode'");

  expect(subtasksJs).toContain("localStorage.getItem('showSubtasksAlways')");
  expect(subtasksJs).toContain("localStorage.setItem('showSubtasksAlways'");
  expect(routeSource).toContain('anchorOwner="user-profile-two-column-popover-anchor"');
  expect(sharedComponentSource).toContain("data-owner={anchorOwner}");
  expect(routeSource).toContain('data-owner="user-profile-show-subtasks-popover-anchor"');
  expect(routeSource).toContain("onMouseEnter={showPopover}");
  expect(routeSource).toContain("onFocus={showPopover}");
  expect(routeSource).not.toContain("data-toggle=");
  expect(routeSource).not.toContain("data-trigger=");
  expect(routeSource).not.toContain("data-placement=");
  expect(routeSource).not.toContain("data-content=");

  // Style ownership contracts and exact route-local declarations.

  expect(routeSource).not.toContain("two-column-icon mr10 hide-in-mobile");
  // Wave-33: the app retains the show-subtasks mr10 class composition on the
  // subtasks popover anchor (667398a04 legacy-parity restore) — assert retention.
  expect(routeSource).toContain("show-subtasks mr10");

  await mockProfile(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, width: 1366, name: "1366x900" },
    { height: 844, width: 390, name: "390x844" },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "commit" });
    await expect(page.locator('[data-owner="user-profile-tabs"]')).toBeVisible();
    await page.evaluate(() => {
      localStorage.removeItem("useTwoColumnMode");
      localStorage.removeItem("showSubtasksAlways");
    });
    await page.reload({ waitUntil: "commit" });

    const mode = page.locator('[data-owner="user-profile-two-column-popover-anchor"]');
    const subtasks = page.locator('[data-owner="user-profile-show-subtasks-popover-anchor"]');
    const modeInput = mode.locator("#two-column-mode");
    const subtasksInput = subtasks.locator("#toggle-show-subtasks");
    await expect(mode).toHaveCount(1);
    await expect(subtasks).toHaveCount(1);
    await expect(mode.locator("label")).toHaveCount(1);
    await expect(subtasks.locator("label")).toHaveCount(1);
    await expect(mode).toHaveAttribute("id", "two-column-mode-checkbox");
    await expect(subtasks).toHaveAttribute("id", "two-column-mode-checkbox");
    await expect(modeInput).toHaveAttribute("id", "two-column-mode");
    await expect(subtasksInput).toHaveAttribute("id", "toggle-show-subtasks");
    await expect(mode.locator(".two-column-icon-border")).toHaveText("Column View");
    await expect(subtasks.locator(".show-subtasks-button-border")).toHaveText("Show subtask");

    const controlState = await page.evaluate(() => {
      const mode = document.querySelector<HTMLElement>(
        '[data-owner="user-profile-two-column-popover-anchor"]',
      );
      const subtasks = document.querySelector<HTMLElement>(
        '[data-owner="user-profile-show-subtasks-popover-anchor"]',
      );
      const modeLabel = mode?.querySelector<HTMLElement>("label");
      const modeInput = mode?.querySelector<HTMLInputElement>("#two-column-mode");
      const modeBorder = mode?.querySelector<HTMLElement>(".two-column-icon-border");
      const modeText = mode?.querySelector<HTMLElement>(".two-column-mode-text");
      const stream = document.querySelector<HTMLElement>('[data-owner="user-profile-stream"]');
      if (!mode || !subtasks || !modeLabel || !modeInput || !modeBorder || !modeText || !stream) {
        return null;
      }
      const modeBox = mode.getBoundingClientRect();
      const subtasksBox = subtasks.getBoundingClientRect();
      const streamBox = stream.getBoundingClientRect();
      const inputStyle = getComputedStyle(modeInput);
      const labelStyle = getComputedStyle(modeLabel);
      const borderStyle = getComputedStyle(modeBorder);
      const textStyle = getComputedStyle(modeText);
      return {
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        modeDisplay: getComputedStyle(mode).display,
        modeWidth: modeBox.width,
        modeHeight: modeBox.height,
        contained: modeBox.left >= streamBox.left - 1 && modeBox.right <= streamBox.right + 1,
        subtasksContained:
          subtasksBox.left >= streamBox.left - 1 && subtasksBox.right <= streamBox.right + 1,
        labelDisplay: getComputedStyle(modeLabel).display,
        labelLineHeight: labelStyle.lineHeight,
        labelMinHeight: labelStyle.minHeight,
        labelVerticalAlign: labelStyle.verticalAlign,
        inputLineHeight: inputStyle.lineHeight,
        inputMinHeight: inputStyle.minHeight,
        inputWidth: inputStyle.width,
        labelPaddingTop: labelStyle.paddingTop,
        labelPaddingLeft: labelStyle.paddingLeft,
        inputFloat: inputStyle.float,
        inputMargin: inputStyle.margin,
        inputVerticalAlign: inputStyle.verticalAlign,
        borderColor: borderStyle.color,
        borderWidth: borderStyle.borderWidth,
        borderStyle: borderStyle.borderStyle,
        borderRadius: borderStyle.borderRadius,
        borderPadding: borderStyle.padding,
        textPadding: textStyle.padding,
        textLineHeight: textStyle.lineHeight,
        textVerticalAlign: textStyle.verticalAlign,
        subtasksDisplay: getComputedStyle(subtasks).display,
      };
    });
    expect(controlState).toEqual({
      documentWidth: expect.any(Number),
      innerWidth: viewport.width,
      modeDisplay: viewport.width <= 720 ? "none" : "inline-block",
      modeWidth: viewport.width <= 720 ? 0 : expect.any(Number),
      modeHeight: viewport.width <= 720 ? 0 : expect.any(Number),
      contained: viewport.width <= 720 ? expect.any(Boolean) : true,
      subtasksContained: true,
      labelDisplay: "inline-block",
      labelLineHeight: "20px",
      labelMinHeight: "20px",
      labelVerticalAlign: "top",
      inputLineHeight: "normal",
      inputMinHeight: "0px",
      inputWidth: expect.any(String),
      labelPaddingTop: "4px",
      labelPaddingLeft: "0px",
      inputFloat: "none",
      inputMargin: "4px 4px 0px 2px",
      inputVerticalAlign: "top",
      borderColor: "rgb(3, 169, 244)",
      borderWidth: "1px",
      borderStyle: "solid",
      borderRadius: "3px",
      borderPadding: "3px 3px 0px",
      textPadding: "0px 4px 0px 0px",
      textLineHeight: "20px",
      textVerticalAlign: "text-bottom",
      subtasksDisplay: "inline-block",
    });
    expect(controlState!.documentWidth).toBeLessThanOrEqual(viewport.width + 1);

    if (viewport.width > 720) {
      // Harness gap (bucket-1): hover() dispatches enter events on the locator
      // element only, so child onMouseEnter (React hover-state styles on the
      // .two-column-icon-border) never fires. Hover the border directly —
      // React's emulated mouseenter then reaches both the border's and the
      // anchor's handlers, preserving the PW hover outcome.
      await mode.locator(".two-column-icon-border").hover();
      await expect(mode.locator('[role="tooltip"]')).toBeVisible();
      await expect(mode.locator(".two-column-icon-border")).toHaveCSS(
        "background-color",
        "rgb(3, 175, 255)",
      );
      await expect(mode.locator(".two-column-icon-border")).toHaveCSS(
        "color",
        "rgb(255, 240, 255)",
      );
      await modeInput.focus();
      await expect(mode.locator('[role="tooltip"]')).toBeVisible();
      await modeInput.check();
      await expect(modeInput).toBeChecked();
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
        .toBe("true");
      await modeInput.uncheck();
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
        .toBe("false");
    } else {
      await expect(mode).toBeHidden();
    }

    await subtasks.hover();
    await expect(subtasks.locator('[role="tooltip"]')).toBeVisible();
    await subtasksInput.focus();
    await expect(subtasks.locator('[role="tooltip"]')).toBeVisible();
    const childList = page.locator(".child-issue-list").first();
    await expect(childList).toHaveClass(/hide/u);
    await subtasksInput.check();
    await expect(subtasksInput).toBeChecked();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("showSubtasksAlways")))
      .toBe("true");
    await expect(childList).not.toHaveClass(/hide/u);
    await subtasksInput.uncheck();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("showSubtasksAlways")))
      .toBe("false");
    await expect(childList).toHaveClass(/hide/u);

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockProfile(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/*/profile**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          loginId: "admin",
          displayName: "Admin",
          englishName: "Admin",
          avatarUrl: "",
          primaryEmailAddress: "",
          sinceLabel: "2026-01-01",
          isGuest: false,
          isBlocked: false,
          isSiteAdmin: false,
          connectedSocialProviders: [],
        },
        issueItems: [
          {
            id: 1,
            number: 1,
            issueNumber: 1,
            title: "Profile issue",
            state: "open",
            ownerName: "admin",
            projectName: "sample",
            childIssues: [
              {
                issueNumber: 2,
                title: "Profile child issue",
                state: "open",
                createdLabel: "today",
                assigneeLabel: "",
                labels: [],
              },
            ],
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
}
