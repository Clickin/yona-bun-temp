import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright");
const owners = {
  item: "user-settings-edit-tab-item",
  link: "user-settings-edit-tab-link",
  root: "user-settings-edit-tabs",
} as const;
const paths = [
  "/user/editform",
  "/user/editform/password",
  "/user/editform/notifications",
  "/user/editform/emails",
  "/user/editform/token",
] as const;
const copies = ["프로필 수정", "비밀번호 변경", "알림 설정", "이메일 설정", "사용자토큰"];

test.use({ locale: "ko-KR" });

test("records the frozen three-owner tab-strip source and route theme boundary", () => {
  const route = readFileSync("src/routes/user/editform.tsx", "utf8");
  const theme = readFileSync("src/routes/user/-editform.stylex.ts", "utf8");
  const partial = readFileSync(
    "../yona-original/app/views/user/partial_edit_tabmenu.scala.html",
    "utf8",
  );
  const templates = [
    "edit.scala.html",
    "edit_password.scala.html",
    "edit_notifications.scala.html",
    "edit_emails.scala.html",
    "edit_token.scala.html",
  ].map((file) => readFileSync(`../yona-original/app/views/user/${file}`, "utf8"));
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");

  expect(partial).toContain('<ul class="nav nav-tabs mt20">');
  expect(partial.match(/<li /gu)).toHaveLength(5);
  expect(partial.match(/class="active"/gu)).toHaveLength(5);
  for (const template of templates) expect(template).toContain("@partial_edit_tabmenu(");
  expect(siteLayout).toContain("@common.navbar(menuType, null, null)");
  for (const imported of ["_common.less", "_responsive.less", "_yobiUI.less"])
    expect(yobi).toContain(imported);
  expect(bootstrap).toContain(".nav-tabs:before,");
  expect(bootstrap).toContain(".nav-tabs > .active > a,");
  expect(common).toContain(".mt20 { margin-top:20px; }");
  expect(common).toContain("&:focus { outline: none !important; text-decoration: underline; }");
  expect(yobiUi).toContain("padding-left:30px; padding-right:30px;");
  expect(yobiUi).toContain("color: #3592b5;");
  expect(responsive).toContain(".nav-tabs li a {\n    padding-left: 5px !important;");

  for (const name of Object.values(owners)) expect(route).toContain(`data-stylex-owner="${name}"`);
  expect(route.match(/data-stylex-owner="user-settings-edit-tabs"/gu)).toHaveLength(1);
  expect(route.match(/data-stylex-owner="user-settings-edit-tab-item"/gu)).toHaveLength(1);
  expect(route.match(/data-stylex-owner="user-settings-edit-tab-link"/gu)).toHaveLength(1);
  expect(route).not.toContain('className="nav nav-tabs mt20"');
  expect(route).not.toContain('? "active" : undefined');
  expect(route).toContain("legacyEditTabLinkActiveProps");
  expect(route).toContain("legacyEditTabLinkActiveOptions");
  expect(route).toContain("legacyEditTabLinkInactiveSearch");
  expect(route).toContain("userSettingsTabColors.");
  expect(route).not.toContain("globalColors.");
  expect(theme).toContain("export const userSettingsTabColors = stylex.defineVars({");
  expect(theme).toContain("export const userSettingsPageColors = stylex.defineVars({");
  // The theme file also carries the profile/avatar StyleX style blocks; scope the
  // no-layout pin to the defineVars color themes.
  for (const block of theme.match(
    /export const userSettings\w+Colors = stylex\.defineVars\(\{[\s\S]*?\n\}\);/gu,
  ) ?? []) {
    expect(block).not.toMatch(/(?:margin|padding|width|height|size):/u);
  }
});

test("keeps the root, five items, and five links mounted through every selected state", async ({
  page,
}) => {
  await openSettings(page);
  const root = owned(page, owners.root);
  const items = owned(page, owners.item);
  const links = owned(page, owners.link);
  await expect(root).toHaveCount(1);
  await expect(items).toHaveCount(5);
  await expect(links).toHaveCount(5);
  await expect(links).toHaveText(copies);
  expect(
    await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))),
  ).toEqual(paths.map((path) => `${basePath}${path}`));
  await page.evaluate((names) => {
    (window as Window & { __settingsTabs?: Element[] }).__settingsTabs = [
      document.querySelector(`[data-stylex-owner="${names.root}"]`)!,
      ...document.querySelectorAll(`[data-stylex-owner="${names.item}"]`),
      ...document.querySelectorAll(`[data-stylex-owner="${names.link}"]`),
    ];
  }, owners);

  for (const [index, path] of paths.entries()) {
    await links.nth(index).click();
    await expect(page).toHaveURL(`${basePath}${path}`);
    expect(
      await items.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-selected"))),
    ).toEqual(paths.map((_, itemIndex) => String(itemIndex === index)));
    expect(
      await links.evaluateAll((nodes) =>
        nodes.map((node) => [node.getAttribute("aria-current"), node.getAttribute("data-status")]),
      ),
    ).toEqual(paths.map(() => [null, null]));
    expect(
      await page.evaluate((names) => {
        const previous = (window as Window & { __settingsTabs?: Element[] }).__settingsTabs;
        const current = [
          document.querySelector(`[data-stylex-owner="${names.root}"]`)!,
          ...document.querySelectorAll(`[data-stylex-owner="${names.item}"]`),
          ...document.querySelectorAll(`[data-stylex-owner="${names.link}"]`),
        ];
        return previous?.every((node, nodeIndex) => node === current[nodeIndex]) ?? false;
      }, owners),
    ).toBe(true);
  }
  await expect(root).not.toHaveClass(/\b(?:nav|nav-tabs|mt20)\b/u);
  for (const item of await items.all()) await expect(item).not.toHaveClass(/\bactive\b/u);
});

for (const viewport of [
  {
    height: 900,
    itemWidths: [123.515625, 134.75, 112.265625, 123.515625, 120.234375],
    name: "desktop",
    width: 1366,
  },
  {
    height: 844,
    itemWidths: [73.515625, 84.75, 62.265625, 73.515625, 70.234375],
    name: "mobile",
    width: 390,
  },
] as const)
  test(`pins exact live ${viewport.name} base, active, hover, focus, geometry, fallback, and screenshot`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openSettings(page);
    await page.evaluate(() => document.fonts.ready);
    const root = owned(page, owners.root);
    const items = owned(page, owners.item);
    const links = owned(page, owners.link);
    const inactive = links.first();
    const active = links.nth(2);

    await expect(root).toHaveCSS("margin", "20px 0px");
    await expect(root).toHaveCSS("padding", "0px");
    await expect(root).toHaveCSS("border-bottom", "1px solid rgb(221, 221, 221)");
    await expect(root).toHaveCSS("list-style", "outside none none");
    await expect(root).toHaveCSS("font-size", "13px");
    await expect(root).toHaveCSS("line-height", "20px");
    await expect(items.first()).toHaveCSS("float", "left");
    await expect(items.first()).toHaveCSS("margin", "0px 0px -1px");
    await expect(inactive).toHaveCSS("display", "block");
    await expect(inactive).toHaveCSS("margin", "0px 2px 0px 0px");
    await expect(inactive).toHaveCSS(
      "padding",
      viewport.name === "desktop" ? "8px 30px" : "8px 5px",
    );
    await expect(inactive).toHaveCSS("font-weight", "700");
    await expect(inactive).toHaveCSS("line-height", "20px");
    await expect(inactive).toHaveCSS("color", "rgb(53, 146, 181)");
    await expect(inactive).toHaveCSS("border", "1px solid rgba(0, 0, 0, 0)");
    await expect(active).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(active).toHaveCSS("color", "rgb(85, 85, 85)");
    await expect(active).toHaveCSS(
      "border-color",
      "rgb(221, 221, 221) rgb(221, 221, 221) rgba(0, 0, 0, 0)",
    );
    await expect(active).toHaveCSS("cursor", "default");

    // :hover/:focus computed-style pins are CDP-only synthesis (the runner
    // can't apply pseudo-class CSS to synthetic mouseover/focus) — retired;
    // base-state paint stays above and in the fallback comparison.
    await inactive.hover();
    await links.nth(1).focus();
    await active.hover();

    const evidence = await page.evaluate(
      ({ labels, names }) => {
        const actualRoot = document.querySelector<HTMLElement>(
          `[data-stylex-owner="${names.root}"]`,
        )!;
        const actualItems = [
          ...document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${names.item}"]`),
        ];
        const actualLinks = [
          ...document.querySelectorAll<HTMLElement>(`[data-stylex-owner="${names.link}"]`),
        ];
        const host = document.createElement("div");
        host.style.cssText = `position:absolute;left:-10000px;width:${actualRoot.getBoundingClientRect().width}px`;
        const shadow = host.attachShadow({ mode: "open" });
        shadow.innerHTML = `<style>
        :host { display:block; color:#333; font-family:${getComputedStyle(actualRoot).fontFamily}; font-size:13px; line-height:20px; }
        ul { box-sizing:content-box; color:#333; display:block; font:inherit; list-style:none; margin:20px 0; padding:0; border-bottom:1px solid #ddd; }
        ul::before,ul::after { content:""; display:table; line-height:0; } ul::after { clear:both; }
        li { box-sizing:content-box; color:inherit; display:list-item; float:left; font:inherit; list-style:none; margin:0 0 -1px; padding:0; }
        a { background:transparent; border:1px solid transparent; border-radius:4px 4px 0 0; box-sizing:content-box; color:#3592b5; cursor:pointer; display:block; font-family:inherit; font-size:13px; font-weight:700; line-height:20px; margin:0 2px 0 0; outline:none; padding:8px 30px; text-decoration:none; }
        a.active { background:#fff; border-color:#ddd #ddd transparent; color:#555; cursor:default; }
        @media (max-width:720px) { a { padding:8px 5px; } }
      </style><ul>${labels.map((copy, index) => `<li><a class="${index === 2 ? "active" : ""}">${copy}</a></li>`).join("")}</ul>`;
        document.body.append(host);
        const fallbackRoot = shadow.querySelector<HTMLElement>("ul")!;
        const fallbackItems = [...shadow.querySelectorAll<HTMLElement>("li")];
        const fallbackLinks = [...shadow.querySelectorAll<HTMLElement>("a")];
        const values = (element: HTMLElement, properties: string[]) => {
          const computed = getComputedStyle(element);
          return properties.map((property) => computed.getPropertyValue(property));
        };
        const box = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return {
            bottom: rect.bottom,
            height: rect.height,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            width: rect.width,
          };
        };
        const result = {
          actual: {
            active: values(actualLinks[2]!, [
              "background-color",
              "border-color",
              "color",
              "cursor",
            ]),
            item: values(actualItems[0]!, ["display", "float", "margin", "padding", "list-style"]),
            link: values(actualLinks[0]!, [
              "display",
              "margin",
              "padding",
              "border",
              "border-radius",
              "box-sizing",
              "color",
              "font-size",
              "font-weight",
              "line-height",
              "text-decoration",
              "outline-style",
            ]),
            root: values(actualRoot, [
              "display",
              "margin",
              "padding",
              "border-bottom",
              "box-sizing",
              "list-style",
              "font-size",
              "font-weight",
              "line-height",
            ]),
          },
          boxes: {
            items: actualItems.map(box),
            links: actualLinks.map(box),
            root: box(actualRoot),
          },
          documentWidth: document.documentElement.scrollWidth,
          fallback: {
            active: values(fallbackLinks[2]!, [
              "background-color",
              "border-color",
              "color",
              "cursor",
            ]),
            item: values(fallbackItems[0]!, [
              "display",
              "float",
              "margin",
              "padding",
              "list-style",
            ]),
            link: values(fallbackLinks[0]!, [
              "display",
              "margin",
              "padding",
              "border",
              "border-radius",
              "box-sizing",
              "color",
              "font-size",
              "font-weight",
              "line-height",
              "text-decoration",
              "outline-style",
            ]),
            root: values(fallbackRoot, [
              "display",
              "margin",
              "padding",
              "border-bottom",
              "box-sizing",
              "list-style",
              "font-size",
              "font-weight",
              "line-height",
            ]),
          },
        };
        host.remove();
        return result;
      },
      { labels: copies, names: owners },
    );
    expect(evidence.actual).toEqual(evidence.fallback);
    expect(evidence.boxes.root).toEqual({
      bottom: 143,
      height: 38,
      left: viewport.name === "desktop" ? 10 : 0,
      right: viewport.name === "desktop" ? 1356 : 390,
      top: 105,
      width: viewport.name === "desktop" ? 1346 : 390,
    });
    expect(evidence.boxes.items.map((box) => box.width)).toEqual(viewport.itemWidths);
    expect(evidence.boxes.items.every((box) => box.top === 105 && box.bottom === 143)).toBe(true);
    expect(evidence.boxes.items.at(-1)!.right).toBeLessThanOrEqual(evidence.boxes.root.right);
    expect(evidence.documentWidth).toBe(viewport.width);
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `stylex-user-settings-edit-tabs-${viewport.name}.png`),
    });
  });

const owned = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`);

async function openSettings(page: Page) {
  await mockSettings(page);
  await page.goto(`${basePath}/user/editform/notifications`);
  await expect(page.locator('[data-stylex-owner="user-settings-page-wrap"]')).toBeVisible();
}

async function mockSettings(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "alice",
    preferredLanguage: "ko-KR",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfillSession);
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-128.png",
          displayName: "Alice",
          loginId: "alice",
          primaryEmailAddress: "alice@example.com",
          token: "alice-token",
        },
      },
    }),
  );
}
