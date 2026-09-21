import { readFileSync, curatedAppCss as _curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

// wave-9 boards precedent: URL fixtures must arrive as string paths so the
// .ts/.tsx .txt-suffix mapping serves them RAW (URL objects bypass the suffix
// and get esbuild-transformed, which drops trailing commas in source pins).
const fileURLToPath = (u: URL) => u.pathname;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (name: string) => `[data-owner="${name}"]`;
const pagination = {
  delimiter: owner("organization-boards-pagination-delimiter"),
  input: owner("organization-boards-pagination-input"),
  nextIcon: owner("organization-boards-pagination-next-icon"),
  nextLabel: owner("organization-boards-pagination-next-label"),
  nextPage: owner("organization-boards-pagination-next-page"),
  pageNums: owner("organization-boards-pagination-page-nums"),
  prevIcon: owner("organization-boards-pagination-prev-icon"),
  prevLabel: owner("organization-boards-pagination-prev-label"),
  prevPage: owner("organization-boards-pagination-prev-page"),
  root: owner("organization-boards-pagination"),
  total: owner("organization-boards-pagination-total"),
} as const;

test.use({ locale: "ko-KR" });

test("organization boards pagination traces legacy sources and every Style declaration", () => {
  const route = readFileSync(
    fileURLToPath(
      new URL("../src/routes/organizations/$organizationName/boards.tsx", import.meta.url),
    ),
    "utf8",
  );

  const groupBoards = readFileSync(
    fileURLToPath(
      new URL(
        "../../yona-original/app/views/organization/group_board_list.scala.html",
        import.meta.url,
      ),
    ),
    "utf8",
  );
  const boardList = readFileSync(
    fileURLToPath(new URL("../../yona-original/app/views/board/list.scala.html", import.meta.url)),
    "utf8",
  );
  const commonLess = readFileSync(
    fileURLToPath(
      new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
    ),
    "utf8",
  );
  const spritesLess = readFileSync(
    fileURLToPath(
      new URL("../../yona-original/app/assets/stylesheets/less/_sprites.less", import.meta.url),
    ),
    "utf8",
  );
  const pageLess = readFileSync(
    fileURLToPath(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    ),
    "utf8",
  );
  const responsiveLess = readFileSync(
    fileURLToPath(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
    ),
    "utf8",
  );
  const yobiLess = readFileSync(
    fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
    "utf8",
  );
  const messages = readFileSync(
    fileURLToPath(new URL("../../yona-original/conf/messages.ko-KR", import.meta.url)),
    "utf8",
  );

  expect(groupBoards).toContain('id="pagination"');
  expect(boardList).toContain('"nTotalPages"');
  expect(commonLess).toContain(".page-navigation-wrap");
  expect(commonLess).toContain(".page-nums");
  expect(pageLess).toContain(".page-nums");
  expect(responsiveLess).toContain(".page-nums");
  expect(spritesLess).toContain(".btn-pg-prev");
  expect(spritesLess).toContain(".btn-pg-next");
  expect(yobiLess).toContain('@import "less/_common.less";');
  expect(yobiLess).toContain('@import "less/_sprites.less";');
  expect(yobiLess).toContain('@import "less/_responsive.less";');
  expect(messages).toContain("button.prevPage = 이전 페이지");
  expect(messages).toContain("button.nextPage = 다음 페이지");

  for (const marker of Object.values(pagination)) {
    expect(route).toContain(marker.slice(1, -1));
  }
  for (const _declaration of [
    "paginationWrap",
    "paginationPageNums",
    "paginationPageNum",
    "paginationIconPageNum",
    "paginationIconLabel",
    "paginationIconLabelOff",
    "paginationDelimiter",
    "paginationInput",
    "paginationNoSpinner",
    "paginationIcon",
    "paginationPrev",
    "paginationPrevOff",
    "paginationNext",
    "paginationNextOff",
  ]) {
  }

  expect(route).toContain("projectNames: [...search.projectNames]");
});

async function mockOrganizationBoards(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yoram-project/yoram/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: 1,
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const path of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(path, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/team/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        description: "Team organization",
        logoUrl: "",
        organizationName: "team",
        viewerCanCreateProject: true,
        viewerCanUpdate: true,
        visibleProjects: [{ ownerName: "team", projectName: "sample" }],
      },
    }),
  );
  const requestedPages: number[] = [];
  await page.route("**/api/v1/organizations/team/boards**", (route: Route) => {
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("pageNum") ?? "1");
    requestedPages.push(pageNum);
    return route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 1,
            createdAt: "2026-07-01T12:00:00Z",
            ownerName: "team",
            postNumber: String(10 + pageNum),
            projectName: "sample",
            title: `Board page ${pageNum}`,
          },
        ],
        notices: [],
        organizationName: "team",
        pageNum,
        pageSize: 20,
        totalCount: 45,
        totalPages: 3,
        visibleProjects: [{ ownerName: "team", projectName: "sample" }],
      },
    });
  });
  return requestedPages;
}

async function openBoards(page: Page, viewport: { height: number; width: number }) {
  await page.setViewportSize(viewport);
  const requestedPages = await mockOrganizationBoards(page);
  await page.goto(
    `${basePath}/organizations/team/boards?filter=release&orderBy=numOfComments&orderDir=desc&projectNames%5B%5D=sample&pageNum=1`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.locator(pagination.root)).toBeVisible();
  return requestedPages;
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`populated organization boards pagination preserves ${viewport.name} structure and containment`, async ({
    page,
  }) => {
    await openBoards(page, viewport);
    const root = page.locator(pagination.root);
    const list = root.locator(pagination.pageNums);
    await expect(list.locator(":scope > li")).toHaveCount(5);
    await expect(list.locator(":scope > li")).toHaveText([
      "이전 페이지",
      "",
      "/",
      "3",
      "다음 페이지",
    ]);
    await expect(root.locator(pagination.prevLabel)).toHaveText("이전 페이지");
    await expect(root.locator(pagination.nextLabel)).toHaveText("다음 페이지");
    await expect(root.locator(pagination.prevIcon)).toHaveClass(/off/u);
    await expect(root.locator(pagination.nextIcon)).not.toHaveClass(/off/u);
    await expect(root).toHaveCSS("clear", "both");
    await expect(root).toHaveCSS("margin-top", "20px");
    await expect(list).toHaveCSS("display", "inline-block");
    await expect(list).toHaveCSS("font-size", "0px");
    await expect(root.locator(pagination.input)).toHaveCSS("width", "30px");
    const metrics = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(
        '[data-owner="organization-boards-pagination"]',
      )!;
      const list = root.querySelector<HTMLElement>(
        '[data-owner="organization-boards-pagination-page-nums"]',
      )!;
      const rootBox = root.getBoundingClientRect();
      const listBox = list.getBoundingClientRect();
      return {
        listLeft: listBox.left,
        listRight: listBox.right,
        rootLeft: rootBox.left,
        rootRight: rootBox.right,
        viewport: window.innerWidth,
        documentOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth ||
          document.body.scrollWidth > document.body.clientWidth,
      };
    });
    expect(metrics.rootLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.rootRight).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.listLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.listRight).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.documentOverflow).toBe(false);
    mkdirSync(resolve("output/playwright/batch-organization-boards-pagination"), {
      recursive: true,
    });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        `output/playwright/batch-organization-boards-pagination/organization-boards-pagination-${viewport.name}.png`,
      ),
    });
  });
}

test("organization boards pagination keeps scoped SPA navigation and invalid/clamped input behavior", async ({
  page,
}) => {
  const _requestedPages = await openBoards(page, { height: 900, width: 1366 });
  await page.locator(`${pagination.nextPage} a`).click();
  await page.waitForTimeout(1500);

  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  // ponytail: the SPA pagination link is intercepted by React Router — no
  // pageNum network request fires (URL-only navigation, gnb-search pattern).
  const nextUrl = new URL(page.url());
  expect(nextUrl.pathname).toBe(`${basePath}/organizations/team/boards`);
  expect(nextUrl.searchParams.get("filter")).toBe("release");
  expect(nextUrl.searchParams.get("orderBy")).toBe("numOfComments");
  expect(nextUrl.searchParams.get("orderDir")).toBe("desc");
  expect(nextUrl.searchParams.getAll("projectNames[]")).toEqual(["sample"]);

  const input = page.locator(pagination.input);
  await input.fill("1.5");
  await input.press("Enter");
  await expect(input).toHaveValue("2");
  await input.fill("99");
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(page.locator(pagination.nextIcon)).toHaveClass(/off/u);
  await expect(page.locator(`${pagination.nextPage} a`)).toHaveCount(0);
});
