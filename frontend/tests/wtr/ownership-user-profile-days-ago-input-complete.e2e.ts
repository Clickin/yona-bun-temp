import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
let viewerIsGuest = false;
let profileRequests: string[] = [];

test.beforeEach(async ({ page }) => {
  viewerIsGuest = false;
  profileRequests = [];
  await page.addInitScript(
    ({ apiBaseUrl, mountedBasePath }) => {
      Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
      (
        window as Window & {
          __YONA_RUNTIME_CONFIG__?: {
            apiBaseUrl: string;
            basePath: string;
            showUserEmail: boolean;
            supportedLanguages: string[];
          };
        }
      ).__YONA_RUNTIME_CONFIG__ = {
        apiBaseUrl,
        basePath: mountedBasePath,
        showUserEmail: true,
        supportedLanguages: ["ko-KR"],
      };
    },
    { apiBaseUrl: `${basePath}/api`, mountedBasePath: basePath },
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: viewerIsGuest, isGuest: viewerIsGuest, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) => {
    profileRequests.push(route.request().url());
    return route.fulfill({ contentType: "application/json", json: profileResponse() });
  });
});

test("public-profile daysAgo number input completely owns its frozen cascade", async ({ page }) => {
  test.setTimeout(60_000);
  await assertSourceEvidence();

  for (const viewport of [
    { width: 1366, height: 900, fontSize: "12px" },
    { width: 390, height: 844, fontSize: "16px" },
  ]) {
    await page.setViewportSize(viewport);
    viewerIsGuest = false;
    profileRequests = [];
    await page.goto(`${basePath}/admin?daysAgo=27&selected=issues`, {
      waitUntil: "domcontentloaded",
    });

    const input = page.locator('[data-owner="user-profile-days-ago-input"]');
    const controls = page.locator('[data-owner="user-profile-days-ago-controls"]');

    await expect(input).toHaveCount(1);
    await expect(input).toHaveAttribute("id", "daysAgoBtn");
    await expect(input).toHaveAttribute("name", "daysAgo");
    await expect(input).toHaveAttribute("type", "number");
    await expect(input).toHaveAttribute("min", "1");
    await expect(input).toHaveAttribute("max", "99");
    await expect(input).toHaveValue("27");
    // wave-33 retained-class retention (667398a04): input keeps input-mini-min
    // per legacy user/view.scala.html:90 class="input-mini-min"
    await expect(input).toHaveClass(/(?:^|\s)input-mini-min(?:\s|$)/u);
    await expect(controls).toHaveText("최근일");
    await expect
      .poll(() =>
        controls.evaluate((node) =>
          Array.from(node.childNodes).map((child) =>
            child.nodeType === Node.TEXT_NODE ? child.textContent : (child as Element).tagName,
          ),
        ),
      )
      .toEqual(["최근", "INPUT", "일"]);
    for (const attribute of [
      "style",
      "data-toggle",
      "data-target",
      "data-action",
      "data-href",
      "data-url",
      "data-request-url",
      "data-provider",
    ]) {
      await expect(input).not.toHaveAttribute(attribute);
    }

    await expect
      .poll(() => computedInputStyle(input, false))
      .toEqual({
        backgroundColor: "rgb(247, 247, 247)",
        borderBottomColor: "rgb(85, 85, 85)",
        borderBottomStyle: "none",
        borderBottomWidth: "0px",
        borderRadius: "2px",
        boxShadow: "none",
        color: "rgb(85, 85, 85)",
        display: "inline-block",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontSize: viewport.fontSize,
        fontWeight: "400",
        height: "20px",
        lineHeight: "20px",
        margin: "0px 5px",
        padding: "4px 6px",
        position: "relative",
        textAlign: "right",
        top: "4px",
        transitionDuration: "0.2s, 0.2s",
        transitionProperty: "border, box-shadow",
        transitionTimingFunction: "linear, linear",
        verticalAlign: "bottom",
        width: "30px",
      });

    await input.focus();
    await expect(input).toBeFocused();
    await expect
      .poll(() => computedInputStyle(input, true))
      .toEqual({
        borderColor: "rgb(243, 108, 34)",
        borderStyle: "none",
        borderWidth: "0px",
        boxShadow: "none",
        outlineStyle: "none",
        outlineWidth: "0px",
      });

    await input.fill("42");
    await expect(input).toHaveValue("42");
    expect(profileRequests).toHaveLength(1);
    expect(new URL(profileRequests[0]!).searchParams.get("daysAgo")).toBe("27");
    expect(new URL(page.url()).searchParams.get("daysAgo")).toBe("27");

    const geometry = await page.evaluate(() => {
      const inputNode = document.querySelector<HTMLElement>(
        '[data-owner="user-profile-days-ago-input"]',
      );
      const controlsNode = document.querySelector<HTMLElement>(
        '[data-owner="user-profile-days-ago-controls"]',
      );
      const tabsNode = document.querySelector<HTMLElement>('[data-owner="user-profile-tabs"]');
      const streamNode = document.querySelector<HTMLElement>('[data-owner="user-profile-stream"]');
      const firstTabButton = tabsNode?.querySelector<HTMLElement>(
        '[data-owner="user-profile-tab-button"]',
      );
      if (!inputNode || !controlsNode || !tabsNode || !streamNode || !firstTabButton) return null;
      const inputBox = inputNode.getBoundingClientRect();
      const controlsBox = controlsNode.getBoundingClientRect();
      const firstTabButtonBox = firstTabButton.getBoundingClientRect();
      const streamBox = streamNode.getBoundingClientRect();
      return {
        controlsFloat: getComputedStyle(controlsNode).float,
        inputBox: {
          bottom: inputBox.bottom,
          height: inputBox.height,
          left: inputBox.left,
          right: inputBox.right,
          top: inputBox.top,
          width: inputBox.width,
        },
        contained:
          inputBox.left >= controlsBox.left &&
          inputBox.right <= controlsBox.right &&
          controlsBox.left >= streamBox.left &&
          controlsBox.right <= streamBox.right,
        noTabOverlap:
          inputBox.right <= firstTabButtonBox.left ||
          firstTabButtonBox.right <= inputBox.left ||
          inputBox.bottom <= firstTabButtonBox.top ||
          firstTabButtonBox.bottom <= inputBox.top,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.controlsFloat).toBe("right");
    expect(geometry!.inputBox.width).toBeCloseTo(42, 1);
    expect(geometry!.inputBox.height).toBeCloseTo(28, 1);
    expect(geometry!.contained).toBe(true);
    expect(geometry!.noTabOverlap).toBe(true);
    expect(geometry!.scrollWidth).toBe(viewport.width);
  }

  viewerIsGuest = true;
  await page.goto(`${basePath}/admin?daysAgo=27&selected=issues`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('[data-owner="user-profile-days-ago-input"]')).toHaveCount(0);
  await expect(page.locator('[data-owner="user-profile-days-ago-controls"]')).toHaveCount(0);
});

async function assertSourceEvidence() {
  const [
    routeSource,
    _styleSource,
    _scala,
    yobi,
    bootstrap,
    variables,
    pageLess,
    responsive,
    yobiUi,
    temporary,
    markdown,
    migration,
    override,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    curatedAppCss(),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_temporary.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_markdown.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_migration.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_override.less", import.meta.url),
      "utf8",
    ),
  ]);
  expect(scala).toContain(
    '@Messages("userinfo.daysAgo.prefix")<input id="daysAgoBtn" name="daysAgo" type="number" min="1" max="99" class="input-mini-min" value="@daysAgo" style="margin:0px 5px; vertical-align:bottom;">@Messages("userinfo.daysAgo.suffix")',
  );
  const orderedImports = [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ];
  let previousImport = -1;
  for (const importPath of orderedImports) {
    const index = yobi.indexOf(`@import "${importPath}";`);
    expect(index).toBeGreaterThan(previousImport);
    previousImport = index;
  }
  expect(bootstrap).toContain('input[type="number"],');
  expect(bootstrap).toContain("height: 20px;\n  padding: 4px 6px;");
  expect(bootstrap).toContain("width: 206px;");
  expect(bootstrap).toContain("transition: border linear 0.2s, box-shadow linear 0.2s;");
  expect(variables).toContain("@orange : #F36C22;");
  expect(variables).toContain("@primary         : @orange;");
  expect(pageLess).toContain(
    ".input-mini-min {\n  width: 30px;\n  border: none;\n  top: 4px;\n  position: relative;\n  background-color: #F7F7F7;\n  text-align: right;",
  );
  expect(responsive).toContain(
    'input[type="text"],\n  input[type="number"],\n  input[type="password"],\n  textarea {\n    font-size: 16px !important;',
  );
  expect(yobiUi).toContain("label, input, button, select, textarea { font-size:12px; }");
  expect(yobiUi).toContain('input[type="week"], input[type="number"]');
  expect(yobiUi).toContain(".box-shadow(none);");
  expect(yobiUi).toContain("border-color:@primary !important;");
  for (const laterImport of [temporary, markdown, migration, override]) {
    expect(laterImport).not.toMatch(/input-mini-min|daysAgoBtn|input\[type=["']number["']\]/u);
  }
  // wave-33 retained-class retention (667398a04): route keeps input-mini-min
  // per legacy user/view.scala.html:90 class="input-mini-min"

  expect(routeSource).toContain('data-owner="user-profile-days-ago-input"');
}

async function computedInputStyle(input: ReturnType<Page["locator"]>, focused: boolean) {
  return input.evaluate((node, focusState) => {
    const style = getComputedStyle(node);
    return focusState
      ? {
          borderColor: style.borderColor,
          borderStyle: style.borderStyle,
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        }
      : {
          backgroundColor: style.backgroundColor,
          borderBottomColor: style.borderBottomColor,
          borderBottomStyle: style.borderBottomStyle,
          borderBottomWidth: style.borderBottomWidth,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          color: style.color,
          display: style.display,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          height: style.height,
          lineHeight: style.lineHeight,
          margin: style.margin,
          padding: style.padding,
          position: style.position,
          textAlign: style.textAlign,
          top: style.top,
          transitionDuration: style.transitionDuration,
          transitionProperty: style.transitionProperty,
          transitionTimingFunction: style.transitionTimingFunction,
          verticalAlign: style.verticalAlign,
          width: style.width,
        };
  }, focused);
}

function profileResponse() {
  return {
    daysAgo: 27,
    selected: "issues",
    viewerCanEditProfile: false,
    profile: {
      avatarUrl: "",
      connectedSocialProviders: [],
      displayName: "Admin User",
      englishName: "Admin",
      isBlocked: false,
      isGuest: false,
      isSiteAdmin: false,
      loginId: "admin",
      primaryEmailAddress: null,
      sinceLabel: "2026-06-30",
    },
    issueItems: [],
    memberProjects: [],
    pullRequestItems: [],
  };
}
