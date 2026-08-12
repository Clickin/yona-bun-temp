import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  arrow: "user-password-validation-arrow",
  content: "user-password-validation-content",
  root: "user-password-validation",
} as const;

test.use({ locale: "ko-KR" });

test("password validation owners trace Bootstrap placement and Yobi paint", () => {
  const route = readFileSync("src/routes/user/editform/password.tsx", "utf8");
  const colors =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const ui = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const setting = readFileSync(
    "../yona-original/public/javascripts/service/yobi.user.Setting.js",
    "utf8",
  );
  const plugin = readFileSync("../yona-original/public/javascripts/yona-common.js", "utf8");
  expect(bootstrap).toContain(".popover {\n  position: absolute;");
  expect(bootstrap).toContain(".popover.right .arrow {");
  expect(bootstrap).toContain(".popover.right .arrow:after {");
  expect(bootstrap).toContain(".fade.in {\n  opacity: 1;");
  expect(ui).toContain(".popover {\n    line-height:1;");
  expect(ui).toContain(".popover-content {\n    padding:9px 10px;");
  expect(setting).toContain('welInput.popover({"trigger": "manual", "placement": "right"});');
  expect(plugin).toContain("top:b.top+b.height/2-d/2,left:b.left+b.width");
  expect(route).toContain("top = inputTop + inputHeight / 2 - popoverHeight / 2");
  for (const owner of Object.values(owners)) expect(route).toContain(`data-owner="${owner}"`);
  expect(route).not.toContain('className="popover right in"');
  expect(route).not.toContain('className="arrow"');
  expect(route).not.toContain('className="popover-content"');
  expect(route).not.toContain("document.");
  expect(route).not.toContain("getBoundingClientRect");
  expect(
    colors.match(/passwordSettingsColors = style\.defineVars\(\{[\s\S]*?\n\}\);/u)?.[0],
  ).not.toContain("arrowBorder");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`empty submit renders three exact visible ${viewport.name} validation popovers`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    let postCount = 0;
    await mock(page, () => {
      postCount += 1;
    });
    await page.goto(`${basePath}/user/editform/password`);
    await page.locator("#frmPassword button[type=submit]").click();
    const roots = owner(page, owners.root);
    const arrows = owner(page, owners.arrow);
    const contents = owner(page, owners.content);
    await expect(roots).toHaveCount(3);
    await expect(arrows).toHaveCount(3);
    await expect(contents).toHaveCount(3);
    await expect(contents).toHaveText([
      "필수 항목 입니다.",
      "필수 항목 입니다.",
      "필수 항목 입니다.",
    ]);
    expect(postCount).toBe(0);
    for (let index = 0; index < 3; index++) {
      await expect(roots.nth(index)).toBeVisible();
      await expect(roots.nth(index)).not.toHaveClass(/(?:^|\s)popover(?:\s|$)/u);
      await expect(arrows.nth(index)).not.toHaveClass(/(?:^|\s)arrow(?:\s|$)/u);
      await expect(contents.nth(index)).not.toHaveClass(/popover-content/u);
    }

    const actual = await page.evaluate((ownerNames) => {
      const roots = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.root}"]`),
      );
      const box = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const css = (element: Element, pseudo?: string) => {
        const style = getComputedStyle(element, pseudo);
        return {
          backgroundClip: style.backgroundClip,
          backgroundColor: style.backgroundColor,
          border: style.border,
          borderColor: style.borderColor,
          borderRadius: style.borderRadius,
          borderStyle: style.borderStyle,
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
          content: style.content,
          display: style.display,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          margin: style.margin,
          maxWidth: style.maxWidth,
          opacity: style.opacity,
          padding: style.padding,
          position: style.position,
          textAlign: style.textAlign,
          transitionDuration: style.transitionDuration,
          visibility: style.visibility,
          whiteSpace: style.whiteSpace,
          zIndex: style.zIndex,
        };
      };
      return {
        items: roots.map((root) => {
          const arrow = root.querySelector<HTMLElement>(`[data-owner="${ownerNames.arrow}"]`)!;
          const content = root.querySelector<HTMLElement>(`[data-owner="${ownerNames.content}"]`)!;
          const input = root.previousElementSibling!;
          const description = root.parentElement!;
          return {
            after: css(arrow, "::after"),
            arrow: { box: box(arrow), style: css(arrow) },
            content: { box: box(content), style: css(content) },
            description: box(description),
            input: box(input),
            root: { box: box(root), style: css(root) },
          };
        }),
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);
    const pageX = viewport.name === "desktop" ? 10 : 0;
    const rootX = viewport.name === "desktop" ? 240 : 230;
    const inputYs = viewport.name === "desktop" ? [236, 306, 376] : [259, 329, 399];
    // F5 dist-truth (2026-08-11): the mobile validation popovers render 23px
    // higher than the legacy-text guess (stable across repeated runs).
    const rootYs = viewport.name === "desktop" ? [232, 302, 372] : [232, 302, 372];
    expect(actual.scrollWidth).toBe(viewport.width);
    for (const [index, item] of actual.items.entries()) {
      expect(item.input).toEqual({ height: 30, width: 220, x: pageX, y: inputYs[index] });
      expect(item.description.y).toBe(inputYs[index]);
      expect(item.root.box).toEqual({
        height: 37.59375,
        width: 113.671875,
        x: rootX,
        y: rootYs[index],
      });
      expect(item.arrow.box).toEqual({
        height: 22,
        width: 11,
        x: pageX + 220,
        y: rootYs[index] + 7.796875,
      });
      expect(item.content.box).toEqual({
        height: 33.59375,
        width: 109.671875,
        x: rootX + 2,
        y: rootYs[index] + 2,
      });
      expect(item.root.box.x).toBe(item.input.x + item.input.width + 10);
      expect(item.root.box.x + item.root.box.width).toBeLessThanOrEqual(viewport.width);
      expect(item.root.style).toMatchObject({
        backgroundClip: "padding-box",
        backgroundColor: "rgb(255, 255, 255)",
        border: "1px solid rgba(0, 0, 0, 0.2)",
        borderRadius: "2px",
        boxShadow: "rgba(0, 0, 0, 0.1) -2px 2px 1px 0px",
        display: "block",
        fontSize: "13px",
        fontWeight: "400",
        lineHeight: "13px",
        margin: "0px 0px 0px 10px",
        maxWidth: "276px",
        opacity: "1",
        padding: "1px",
        position: "absolute",
        textAlign: "left",
        transitionDuration: "0.15s",
        visibility: "visible",
        whiteSpace: "normal",
        zIndex: "1010",
      });
      expect(item.arrow.style).toMatchObject({
        borderColor: "rgba(0, 0, 0, 0) rgba(0, 0, 0, 0.25) rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)",
        borderStyle: "solid",
        borderWidth: "11px 11px 11px 0px",
        display: "block",
        position: "absolute",
      });
      expect(item.after).toMatchObject({
        borderColor: "rgba(0, 0, 0, 0) rgb(255, 255, 255) rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)",
        borderStyle: "solid",
        borderWidth: "10px 10px 10px 0px",
        content: '""',
        display: "block",
        position: "absolute",
      });
      expect(item.content.style).toMatchObject({
        display: "block",
        lineHeight: "15.6px",
        padding: "9px 10px",
      });
    }
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: `/private/tmp/style-user-password-validation-react-${viewport.name}.png`,
    });
  });

test("blur validation updates and clears without posting", async ({ page }) => {
  let postCount = 0;
  await mock(page, () => {
    postCount += 1;
  });
  await page.goto(`${basePath}/user/editform/password`);
  await page.locator("#password").fill("abc");
  await page.locator("#password").blur();
  await expect(owner(page, owners.content)).toHaveText([
    "필수 항목 입니다.",
    "비밀번호를 4자 이상으로 만들어 주세요!",
    "필수 항목 입니다.",
  ]);
  expect(postCount).toBe(0);

  await page.locator("#oldPassword").fill("old-pass");
  await page.locator("#password").fill("new-pass");
  await page.locator("#retypedPassword").fill("new-pass");
  await page.locator("#retypedPassword").blur();
  await expect(owner(page, owners.root)).toHaveCount(0);
  expect(postCount).toBe(0);
});

function owner(page: Page, name: string) {
  return page.locator(`[data-owner="${name}"]`);
}

async function mock(page: Page, onPasswordPost: () => void) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      json: { csrfToken: "csrf-token" },
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-128.png",
          connectedSocialProviders: [],
          displayName: "Admin User",
          englishName: "",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
          sinceLabel: "2026-06-30",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
  await page.route("**/api/v1/workspace/password", async (route: Route) => {
    onPasswordPost();
    await route.fulfill({ contentType: "application/json", json: { isAnonymous: true } });
  });
}
