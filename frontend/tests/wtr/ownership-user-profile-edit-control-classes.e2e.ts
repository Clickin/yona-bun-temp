import { readFile, readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = "output/playwright/style-user-profile-edit-control-classes";

test.beforeEach(async ({ page }) => {
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
      json: { isAnonymous: false, isGuest: false, loginId: "owner" },
    }),
  );
  await page.route("**/api/v1/users/*/profile**", (route) => {
    const loginId = route
      .request()
      .url()
      .match(/\/users\/([^/]+)\/profile/u)?.[1];
    if (loginId === "missing") {
      return route.fulfill({
        contentType: "application/json",
        status: 404,
        json: { error: { code: "not_found", message: "User exists not", status: 404 } },
      });
    }
    return route.fulfill({
      contentType: "application/json",
      json: profileResponse(loginId ?? "owner"),
    });
  });
});

test("owner public-profile edit Link retires only its ybtn runtime classes", async ({ page }) => {
  test.setTimeout(60_000);
  await assertSourceEvidence();

  for (const viewport of [
    { name: "desktop-1366x900", width: 1366, height: 900 },
    { name: "mobile-390x844", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/owner`, { waitUntil: "domcontentloaded" });

    const edit = page.locator('[data-owner="user-profile-identity-edit"]');
    const control = page.locator('[data-owner="user-profile-edit-control"]');
    const icon = page.locator('[data-owner="user-profile-edit-control-icon"]');

    await expect(edit).toHaveCount(1);
    await expect(control).toHaveCount(1);
    await expect(control).toHaveText("프로필 수정");
    await expect(control).toHaveAttribute("href", `${basePath}/user/editform`);
    expect(await control.evaluate((node) => node.tagName)).toBe("A");
    // Bucket-3 (wave 33): ybtn runtime classes are back on the edit Link
    // (legacy parity restored in 667398a04).
    await expect(control).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
    await expect(control).toHaveClass(/(?:^|\s)ybtn-default(?:\s|$)/u);
    await expect(control).toHaveClass(/(?:^|\s)ybtn-mini(?:\s|$)/u);
    expect(await icon.evaluate((node) => node.tagName)).toBe("I");
    await expect(icon).toHaveClass(/(?:^|\s)yobicon-edit(?:\s|$)/u);
    expect(
      await control.evaluate((node) =>
        Array.from(node.childNodes).map((child) =>
          child.nodeType === Node.TEXT_NODE
            ? { kind: "text", value: child.textContent }
            : {
                kind: (child as Element).tagName,
                owner: (child as Element).getAttribute("data-owner"),
              },
        ),
      ),
    ).toEqual([
      { kind: "I", owner: "user-profile-edit-control-icon" },
      { kind: "text", value: " " },
      { kind: "text", value: "프로필 수정" },
    ]);
    expect(await control.evaluate((node) => node.parentElement?.dataset.owner)).toBe(
      "user-profile-identity-edit",
    );
    expect(await edit.evaluate((node) => node.parentElement?.dataset.owner)).toBe(
      "user-profile-whoami",
    );
    expect(await edit.evaluate((node) => node.previousElementSibling?.dataset.owner)).toBe(
      "user-profile-identity-email",
    );
    for (const attribute of [
      "style",
      "data-toggle",
      "data-placement",
      "data-action",
      "data-href",
      "data-url",
      "data-request-url",
      "data-target",
    ]) {
      await expect(control).not.toHaveAttribute(attribute);
      await expect(icon).not.toHaveAttribute(attribute);
    }

    await page.mouse.move(0, viewport.height - 1);
    await control.blur();
    await assertBaseAndGeometry(page);
    await control.hover();
    await assertInteractive(control);
    await page.mouse.move(0, viewport.height - 1);
    await control.focus();
    await assertInteractive(control);
    const box = await control.boundingBox();
    if (!box) throw new Error("profile edit control has no box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await assertInteractive(control);
    await page.mouse.move(0, viewport.height - 1);
    await page.mouse.up();

    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: `${screenshotDirectory}/${viewport.name}.png`,
    });

    await page.goto(`${basePath}/other`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-owner="user-profile-identity-edit"]')).toHaveCount(0);
    await expect(page.locator('[data-owner="user-profile-edit-control"]')).toHaveCount(0);
    await expect(page.locator('[data-owner="user-profile-edit-control-icon"]')).toHaveCount(0);
  }

  await page.goto(`${basePath}/missing`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-owner="user-profile-notfound-error-wrap"]')).toBeVisible();
  await expect(page.locator('[data-owner="user-profile-identity-edit"]')).toHaveCount(0);
  await expect(page.locator('[data-owner="user-profile-edit-control"]')).toHaveCount(0);
});

async function assertSourceEvidence() {
  const lessNames = [
    "_variables.less",
    "_mixins.less",
    "_common.less",
    "_sprites.less",
    "_page.less",
    "_tippy.less",
    "_scrollbar.less",
    "_responsive.less",
    "_yobiUI.less",
    "_temporary.less",
    "_markdown.less",
    "_migration.less",
    "_override.less",
  ];
  const [
    route,
    styles,
    scala,
    messages,
    yobi,
    yobiUi,
    pageLess,
    bootstrap,
    bootstrapResponsive,
    appCss,
    ...lessChain
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    curatedAppCss(),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages.ko-KR", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
      "utf8",
    ),
    Promise.resolve(curatedAppCss()),
    ...lessNames.map((name) =>
      readFile(
        new URL(`../../yona-original/app/assets/stylesheets/less/${name}`, import.meta.url),
        "utf8",
      ),
    ),
  ]);

  expect(scala).toContain(
    '<a href="@routes.UserApp.editUserInfoForm()" class="ybtn ybtn-default ybtn-mini"><i class="yobicon-edit"></i> @Messages("userinfo.editProfile")</a>',
  );
  expect(messages).toContain("userinfo.editProfile = 프로필 수정");
  expect(yobiUi).toContain(".ybtn, .flat > li > .ybtn  {");
  expect(yobiUi).toContain("i { line-height:20px;}");
  expect(yobiUi).toContain("&:first-child {\n        margin-left:0;");
  expect(yobiUi).toContain("&:hover, &:focus, &:active, &:focus, &.disabled, &[disabled]  {");
  expect(yobiUi).toContain(
    "&.ybtn-mini {\n        padding: 0 6px !important;\n        font-size: 10.5px !important;",
  );
  expect(lessChain.join("\n")).not.toMatch(/\.ybtn-default\s*\{/u);
  expect(pageLess).toMatch(/\.keymap-help\s*\{[\s\S]*?\.ybtn\s*\{/u);
  expect(pageLess).toMatch(/\.attach\s*\{[\s\S]*?\.ybtn\.download\s*\{/u);
  expect(pageLess).toContain(".voters-dialog {");
  expect(bootstrap).not.toMatch(/\.ybtn(?:[\s,{:.]|$)/u);
  expect(bootstrapResponsive).not.toMatch(/\.ybtn(?:[\s,{:.]|$)/u);
  expect(appCss).toContain(".ybtn {");
  for (const [index, name] of lessNames.entries()) {
    const statement = `@import "less/${name}";`;
    expect(yobi).toContain(statement);
    if (index > 0) {
      expect(yobi.indexOf(statement)).toBeGreaterThan(
        yobi.indexOf(`@import "less/${lessNames[index - 1]}";`),
      );
    }
  }
  expect(lessChain).toHaveLength(lessNames.length);
  expect(yobi.indexOf('@import "less/_page.less";')).toBeLessThan(
    yobi.indexOf('@import "less/_yobiUI.less";'),
  );
  expect(yobi.indexOf('@import "less/_yobiUI.less";')).toBeLessThan(
    yobi.indexOf('@import "less/_override.less";'),
  );
  expect(route).toContain('data-owner="user-profile-edit-control"');
  expect(route).toContain('data-owner="user-profile-edit-control-icon"');
  expect(route).toContain('to="/user/editform"');
  expect(route).toContain("reloadDocument");

  // Bucket-3 (wave 33): the app restored the legacy ybtn cascade on the edit
  // Link (667398a04) — the retirement pin is stale; the runtime classes are
  // back on purpose (legacy parity), the style paint carries the cascade.
  expect(route).toContain('className={"ybtn ybtn-default ybtn-mini"}');
}

async function assertBaseAndGeometry(page: Page) {
  const result = await page.evaluate(() => {
    const required = (owner: string) => {
      const node = document.querySelector<HTMLElement>(`[data-owner="${owner}"]`);
      if (!node) throw new Error(`missing ${owner}`);
      return node;
    };
    const info = required("user-profile-info");
    const whoami = required("user-profile-whoami");
    const edit = required("user-profile-identity-edit");
    const control = required("user-profile-edit-control");
    const icon = required("user-profile-edit-control-icon");
    const since = required("user-profile-user-since");
    const infoBox = info.getBoundingClientRect();
    const whoamiBox = whoami.getBoundingClientRect();
    const editBox = edit.getBoundingClientRect();
    const controlBox = control.getBoundingClientRect();
    const sinceBox = since.getBoundingClientRect();
    const style = getComputedStyle(control);
    return {
      style: {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
        color: style.color,
        cursor: style.cursor,
        display: style.display,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        marginBottom: style.marginBottom,
        marginLeft: style.marginLeft,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        padding: style.padding,
        position: style.position,
        textAlign: style.textAlign,
        textShadow: style.textShadow,
        transitionDelay: style.transitionDelay,
        transitionDuration: style.transitionDuration,
        transitionProperty: style.transitionProperty,
        transitionTimingFunction: style.transitionTimingFunction,
        verticalAlign: style.verticalAlign,
        whiteSpace: style.whiteSpace,
        zIndex: style.zIndex,
      },
      iconLineHeight: getComputedStyle(icon).lineHeight,
      geometry: {
        controlInsideEdit:
          controlBox.left >= editBox.left &&
          controlBox.right <= editBox.right + 1 &&
          controlBox.top >= editBox.top &&
          controlBox.bottom <= editBox.bottom + 1,
        editInsideWhoami:
          editBox.left >= whoamiBox.left &&
          editBox.right <= whoamiBox.right + 1 &&
          editBox.top >= whoamiBox.top,
        noSinceOverlap: editBox.bottom <= sinceBox.top + 1,
        whoamiInsideSidebar: whoamiBox.left >= infoBox.left && whoamiBox.right <= infoBox.right + 1,
      },
      noHorizontalOverflow: document.documentElement.scrollWidth === innerWidth,
    };
  });
  expect(result).toEqual({
    style: {
      backgroundColor: "rgb(255, 255, 255)",
      borderColor: "rgba(0, 0, 0, 0.15)",
      borderRadius: "3px",
      borderStyle: "solid",
      borderWidth: "1px",
      boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      color: "rgb(51, 51, 51)",
      cursor: "pointer",
      display: "inline-block",
      fontSize: "10.5px",
      lineHeight: "20px",
      marginBottom: "0px",
      marginLeft: "0px",
      outlineStyle: "none",
      outlineWidth: "0px",
      padding: "0px 6px",
      position: "relative",
      textAlign: "center",
      textShadow: "none",
      transitionDelay: "0s",
      transitionDuration: "0.3s",
      transitionProperty: "all",
      transitionTimingFunction: "ease",
      verticalAlign: "middle",
      whiteSpace: "nowrap",
      zIndex: "2",
    },
    iconLineHeight: "20px",
    geometry: {
      controlInsideEdit: true,
      editInsideWhoami: true,
      noSinceOverlap: true,
      whoamiInsideSidebar: true,
    },
    noHorizontalOverflow: true,
  });
}

async function assertInteractive(control: Locator) {
  await expect(control).toHaveCSS("background-color", "rgb(241, 241, 241)");
  await expect(control).toHaveCSS("border-color", "rgba(0, 0, 0, 0.25)");
  await expect(control).toHaveCSS("color", "rgb(41, 41, 41)");
  await expect(control).toHaveCSS("text-decoration-line", "none");
}

function profileResponse(loginId: string) {
  return {
    daysAgo: 14,
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/assets/images/default-avatar-256.png",
      connectedSocialProviders: [],
      displayName: "Owner User",
      englishName: "Owner",
      isBlocked: false,
      isGuest: false,
      isSiteAdmin: false,
      loginId,
      primaryEmailAddress: "owner@example.com",
      sinceLabel: "2026-06-30",
    },
    pullRequestItems: [],
    selected: "issues",
    viewerCanEditProfile: loginId === "owner",
  };
}
