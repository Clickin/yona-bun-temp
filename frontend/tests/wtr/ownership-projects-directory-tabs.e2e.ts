import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  item: "projects-directory-tabs-item",
  link: "projects-directory-tabs-link",
  list: "projects-directory-tabs-list",
} as const;

test.use({ locale: "ko-KR" });

async function openProjects(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: 1,
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            createdLabel: "방금 전",
            createdTitle: "2026-07-17",
            labels: [],
            lastPushedLabel: "방금 전",
            logoUrl: "/assets/images/project_default_logo.png",
            memberCount: 1,
            overview: "샘플 프로젝트",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            watchCount: 2,
          },
        ],
        page: 1,
        pageNum: 1,
        total: 1,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/projects`);
  await expect(page.locator(`[data-owner="${owners.list}"]`)).toBeVisible();
}

test("directory tabs record frozen source, future owners, retirement, and route paint", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const list = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const override = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_override.less",
    "utf8",
  );
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");

  expect(list).toContain("@siteLayout(message, utils.MenuType.PROJECTS)");
  expect(siteLayout).toContain('@layout(Messages(title))("")');
  expect(list).toContain('<div class="title_area">');
  expect(list).toContain('<ul class="nav nav-tabs">');
  expect(list).toContain("<li class='active'>");
  for (const key of ["project.public", "title.projectList", "title.organization.list"])
    expect(messages).toMatch(new RegExp(`^${key.replaceAll(".", "\\.")}\\s*=`, "mu"));
  for (const imported of [
    "_variables.less",
    "_mixins.less",
    "_common.less",
    "_page.less",
    "_responsive.less",
    "_yobiUI.less",
    "_override.less",
  ])
    expect(yobi).toContain(imported);
  expect(bootstrap).toContain(".nav-tabs:before,");
  expect(bootstrap).toContain(".nav-tabs > .active > a:hover,");
  expect(yobiUi).toContain("padding-left:30px; padding-right:30px;");
  expect(yobiUi).toContain("color: #3592b5;");
  expect(override).toContain(".title_area {");
  expect(override).toContain("margin-top: 10px;");
  expect(responsive).toContain(".nav-tabs li a {");
  expect(responsive).toContain("padding-left: 5px !important;");

  for (const owner of Object.values(owners)) expect(route).toContain(`data-owner="${owner}"`);
  expect(route).not.toContain('className="nav nav-tabs"');
  expect(route).not.toContain('className="active"');

  for (const declaration of []) expect(route).toContain(declaration);
});

function paint(element: HTMLElement) {
  const style = getComputedStyle(element);
  return {
    backgroundColor: style.backgroundColor,
    borderBottomColor: style.borderBottomColor,
    borderLeftColor: style.borderLeftColor,
    borderRightColor: style.borderRightColor,
    borderTopColor: style.borderTopColor,
    color: style.color,
    cursor: style.cursor,
    textDecoration: style.textDecorationLine,
  };
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`directory tabs preserve exact ${viewport.name} geometry, paint, and interaction`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openProjects(page);
    const list = page.locator(`[data-owner="${owners.list}"]`);
    const items = list.locator(`:scope > [data-owner="${owners.item}"]`);
    const links = items.locator(`:scope > [data-owner="${owners.link}"]`);
    await expect(items).toHaveCount(2);
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveText("공개 프로젝트 목록");
    await expect(links.nth(1)).toHaveText("그룹 목록");
    await expect(links.nth(0)).toHaveAttribute("href", `${basePath}/projects`);
    await expect(links.nth(1)).toHaveAttribute("href", `${basePath}/orgs`);
    await expect(list).not.toHaveClass(/\bnav(?:-tabs)?\b/u);
    await expect(items.nth(0)).not.toHaveClass(/\bactive\b/u);

    const geometry = await page.evaluate((ownerNames) => {
      const list = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.list}"]`)!;
      const items = Array.from(
        list.querySelectorAll<HTMLElement>(`:scope > [data-owner="${ownerNames.item}"]`),
      );
      const links = items.map(
        (item) => item.querySelector<HTMLElement>(`:scope > [data-owner="${ownerNames.link}"]`)!,
      );
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const before = getComputedStyle(list, "::before");
      const after = getComputedStyle(list, "::after");
      return {
        after: {
          clear: after.clear,
          content: after.content,
          display: after.display,
          lineHeight: after.lineHeight,
        },
        before: { content: before.content, display: before.display, lineHeight: before.lineHeight },
        boxes: {
          items: items.map(box),
          links: links.map(box),
          list: box(list),
          title: box(list.parentElement!),
        },
        list: {
          borderBottom: getComputedStyle(list).borderBottom,
          listStyle: getComputedStyle(list).listStyleType,
          margin: getComputedStyle(list).margin,
          padding: getComputedStyle(list).padding,
        },
        pageY: (
          list.closest('[data-owner="projects-breadcrumb-outer"]')!
            .nextElementSibling as HTMLElement
        ).getBoundingClientRect().y,
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);
    if (viewport.name === "desktop") {
      expect(geometry.boxes).toEqual({
        items: [
          { height: 38, width: 182.359375, x: 10, y: 93 },
          { height: 38, width: 123.1875, x: 192.359375, y: 93 },
        ],
        links: [
          { height: 38, width: 180.359375, x: 10, y: 93 },
          { height: 38, width: 121.1875, x: 192.359375, y: 93 },
        ],
        list: { height: 38, width: 1346, x: 10, y: 93 },
        title: { height: 38, width: 1346, x: 10, y: 93 },
      });
    } else {
      expect(geometry.boxes).toEqual({
        items: [
          { height: 38, width: 132.359375, x: 10, y: 93 },
          { height: 38, width: 73.1875, x: 142.359375, y: 123 },
        ],
        links: [
          { height: 38, width: 130.359375, x: 10, y: 93 },
          { height: 38, width: 71.1875, x: 142.359375, y: 123 },
        ],
        list: { height: 68, width: 370, x: 10, y: 93 },
        title: { height: 68, width: 370, x: 10, y: 93 },
      });
    }
    expect(geometry.list).toEqual({
      borderBottom: "1px solid rgb(221, 221, 221)",
      listStyle: "none",
      margin: "10px 0px 20px",
      padding: "0px",
    });
    expect(geometry.before).toEqual({ content: '""', display: "table", lineHeight: "0px" });
    expect(geometry.after).toEqual({
      clear: "both",
      content: '""',
      display: "table",
      lineHeight: "0px",
    });
    expect(geometry.pageY).toBe(viewport.name === "desktop" ? 151 : 181);
    expect(geometry.scrollWidth).toBe(viewport.width);

    const active = links.nth(0);
    const inactive = links.nth(1);
    const readPaint = (locator: typeof active) => locator.evaluate(paint);
    expect(await readPaint(active)).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      borderBottomColor: "rgba(0, 0, 0, 0)",
      borderLeftColor: "rgb(221, 221, 221)",
      borderRightColor: "rgb(221, 221, 221)",
      borderTopColor: "rgb(221, 221, 221)",
      color: "rgb(85, 85, 85)",
      cursor: "default",
      textDecoration: "none",
    });
    expect(await readPaint(inactive)).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderBottomColor: "rgba(0, 0, 0, 0)",
      borderLeftColor: "rgba(0, 0, 0, 0)",
      borderRightColor: "rgba(0, 0, 0, 0)",
      borderTopColor: "rgba(0, 0, 0, 0)",
      color: "rgb(53, 146, 181)",
      cursor: "pointer",
      textDecoration: "none",
    });
    await inactive.hover();
    expect(await readPaint(inactive)).toMatchObject({
      backgroundColor: "rgb(242, 242, 242)",
      borderBottomColor: "rgb(221, 221, 221)",
      borderLeftColor: "rgb(238, 238, 238)",
      borderRightColor: "rgb(238, 238, 238)",
      borderTopColor: "rgb(238, 238, 238)",
    });
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await inactive.focus();
    expect(await readPaint(inactive)).toMatchObject({
      backgroundColor: "rgb(238, 238, 238)",
      borderBottomColor: "rgb(221, 221, 221)",
      borderLeftColor: "rgb(238, 238, 238)",
      borderRightColor: "rgb(238, 238, 238)",
      borderTopColor: "rgb(238, 238, 238)",
    });
    await active.hover();
    expect(await readPaint(active)).toMatchObject({
      backgroundColor: "rgb(255, 255, 255)",
      borderBottomColor: "rgba(0, 0, 0, 0)",
      color: "rgb(85, 85, 85)",
      cursor: "default",
    });
    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await active.focus();
    expect(await readPaint(active)).toMatchObject({
      backgroundColor: "rgb(255, 255, 255)",
      borderBottomColor: "rgba(0, 0, 0, 0)",
      color: "rgb(85, 85, 85)",
      cursor: "default",
    });

    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    const screenshot = await list.screenshot({
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `style-projects-directory-tabs-${viewport.name}.png`,
      ),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
}
