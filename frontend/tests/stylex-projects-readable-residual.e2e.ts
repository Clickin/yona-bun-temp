import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const avatarDataUrl = `data:image/png;base64,${readFileSync(
  resolve("src/assets/legacy/default-avatar-34.png"),
).toString("base64")}`;
const owners = {
  forkIcon: "projects-directory-fork-split-icon",
  identity: "projects-directory-readable-identity",
  info: "projects-directory-readable-info",
  list: "projects-directory-list",
  row: "projects-directory-row",
  searchIcon: "projects-directory-search-icon",
  statsIcon: "projects-directory-stats-icon",
} as const;

test.use({ locale: "ko-KR" });

async function open(page: Page) {
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
    actorId: 2,
    emailAddress: "alice@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: false,
    loginId: "alice",
    userLabel: "Alice Kim",
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
            createdLabel: "21초 전",
            isForked: true,
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "alice", userLabel: "Alice Kim" }],
            originOwnerName: "admin",
            originProjectName: "sample",
            overview: "Parity seed project for the admin workspace",
            ownerName: "alice",
            projectName: "stylexfork",
            projectScope: "public",
            watchCount: 0,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "alice", userLabel: "Alice Kim" }],
            overview: "Parity seed project for the alice workspace",
            ownerName: "alice",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "admin", userLabel: "Site Admin" }],
            overview: "Parity seed Subversion project for localhost checks",
            ownerName: "admin",
            projectName: "svnplayground",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "5일 전",
            logoUrl: "",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "admin", userLabel: "Site Admin" }],
            overview: "Parity seed project for the admin workspace",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
        ],
        page: 1,
        pageNum: 1,
        total: 4,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/projects`);
  await expect(page.locator(`[data-stylex-owner="${owners.identity}"]`).first()).toBeVisible();
}

test("readable residual wave records five direct owner groups and branch-scoped deletion", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobicon = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");

  expect(scala).toContain('<li class="project">\n                <div class="info-wrap">');
  expect(scala).toContain('<div style="float:left">');
  expect(scala).toContain('<i class="yobicon-search"></i>');
  expect(scala).toContain('<i class="yobicon-split"></i>');
  expect(scala).toContain('<i class="yobicon-eye yobicon-middle"></i>');
  expect(pageLess).toContain(".all-projects {");
  expect(pageLess).toContain(".project {");
  expect(pageLess).toContain(".info-wrap {");
  expect(yobicon).toContain("font-family: 'yobicon';");
  expect(yobicon).toContain("font-variant: normal;");
  expect(yobicon).toContain("background-image:none;");
  for (const [name, glyph] of [
    ["search", "e225"],
    ["friends", "e27b"],
    ["split", "e450"],
    ["eye", "e52e"],
  ])
    expect(yobicon).toContain(`.yobicon-${name}:before {\n    content: "\\${glyph}";`);

  expect(route).toContain('data-stylex-owner="projects-directory-readable-identity"');
  expect(route).toContain('data-stylex-owner="projects-directory-readable-info"');
  expect(route).toContain('data-stylex-owner="projects-directory-search-icon"');
  expect(route).toContain('data-stylex-owner="projects-directory-fork-split-icon"');
  expect(route.match(/data-stylex-owner="projects-directory-stats-icon"/gu)).toHaveLength(2);
  expect(route).toContain('directoryReadableIdentity: { float: "left" }');
  for (const token of [
    'fontFamily: "yobicon"',
    'fontStyle: "normal"',
    'fontVariant: "normal"',
    'fontWeight: "400"',
    "lineHeight: 1",
    'display: "inline-block"',
    'textDecoration: "none"',
    'backgroundImage: "none"',
    'verticalAlign: "baseline"',
  ])
    expect(route).toContain(token);
  for (const glyph of ["\\\\e225", "\\\\e27b", "\\\\e450", "\\\\e52e"])
    expect(route).toContain(`content: '"${glyph}"'`);

  expect(route.split("className={`project ").length - 1).toBe(1);
  expect(route.match(/className="info-wrap"/gu)).toHaveLength(1);
  expect(route).toContain('style={{ backgroundColor: "#fcfcfc" }}');
  expect(route).toContain('className="info-wrap" style={{ opacity: 0.3 }}');
  expect(route).toContain('style={{ float: "left", color: "gray" }}');
  for (const retired of ["yobicon-search", "yobicon-split", "yobicon-friends", "yobicon-eye"])
    expect(route).not.toMatch(new RegExp(`className=.*${retired}`, "u"));
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`readable residual wave preserves exact ${viewport.name} output`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);

    const list = page.locator(`[data-stylex-owner="${owners.list}"]`);
    const rows = list.locator(`:scope > [data-stylex-owner="${owners.row}"]`);
    const row = rows.first();
    const info = row.locator(`:scope > [data-stylex-owner="${owners.info}"]`);
    const identity = info.locator(`:scope > [data-stylex-owner="${owners.identity}"]`);
    const searchIcon = page.locator(`[data-stylex-owner="${owners.searchIcon}"]`);
    const forkIcon = row.locator(`[data-stylex-owner="${owners.forkIcon}"]`);
    const statsIcons = row.locator(`[data-stylex-owner="${owners.statsIcon}"]`);

    await expect(rows).toHaveCount(4);
    await expect(row).not.toHaveClass(/(?:^|\s)project(?:\s|$)/u);
    await expect(info).not.toHaveClass(/(?:^|\s)info-wrap(?:\s|$)/u);
    await expect(identity).toHaveCount(1);
    await expect(identity).not.toHaveAttribute("style");
    await expect(searchIcon).not.toHaveClass(/(?:^|\s)yobicon-search(?:\s|$)/u);
    await expect(forkIcon).not.toHaveClass(/(?:^|\s)yobicon-split(?:\s|$)/u);
    await expect(statsIcons).toHaveCount(2);
    await expect(statsIcons.nth(0)).not.toHaveClass(/(?:^|\s)yobicon-friends(?:\s|$)/u);
    await expect(statsIcons.nth(1)).not.toHaveClass(/(?:^|\s)yobicon-eye(?:\s|$)/u);

    const actual = await page.evaluate((ownerNames) => {
      const get = (owner: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
      const list = get(ownerNames.list);
      const row = get(ownerNames.row);
      const info = get(ownerNames.info);
      const identity = get(ownerNames.identity);
      const searchIcon = get(ownerNames.searchIcon);
      const forkIcon = get(ownerNames.forkIcon);
      const statsIcons = Array.from(
        row.querySelectorAll<HTMLElement>(`[data-stylex-owner="${ownerNames.statsIcon}"]`),
      );
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const icon = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return {
          box: box(element),
          glyph: getComputedStyle(element, "::before").content,
          style: {
            backgroundImage: style.backgroundImage,
            display: style.display,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontStyle: style.fontStyle,
            fontVariant: style.fontVariant,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            textDecorationLine: style.textDecorationLine,
            verticalAlign: style.verticalAlign,
          },
        };
      };
      return {
        forkIcon: icon(forkIcon),
        identity: { box: box(identity), float: getComputedStyle(identity).cssFloat },
        info: box(info),
        list: box(list),
        row: box(row),
        rows: Array.from(list.children).map((child) => box(child as HTMLElement)),
        searchIcon: icon(searchIcon),
        scrollWidth: document.documentElement.scrollWidth,
        statsIcons: statsIcons.map(icon),
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.list).toEqual({
      height: desktop ? 367 : 607,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 158 : 188,
    });
    expect(actual.row).toEqual({
      height: desktop ? 94 : 154,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 158 : 188,
    });
    expect(actual.rows.map(({ height }) => height)).toEqual(
      desktop ? [94, 91, 91, 91] : [154, 151, 151, 151],
    );
    expect(actual.info).toEqual({
      height: 0,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 173 : 203,
    });
    expect(actual.identity).toEqual({
      box: {
        height: 68,
        width: 276.546875,
        x: desktop ? 70 : 60,
        y: desktop ? 173 : 203,
      },
      float: "left",
    });
    expect(actual.searchIcon).toMatchObject({
      box: { height: 12, width: 12, x: desktop ? 374 : 187, y: desktop ? 127 : 162 },
      glyph: '""',
    });
    expect(actual.forkIcon).toMatchObject({
      box: { height: 10, width: 10, x: desktop ? 179.046875 : 169.046875, y: desktop ? 181 : 211 },
      glyph: '""',
    });
    expect(actual.statsIcons.map(({ box, glyph }) => ({ box, glyph }))).toEqual([
      {
        box: {
          height: 16,
          width: 16,
          x: desktop ? 1286.40625 : 320.40625,
          y: desktop ? 214 : 312,
        },
        glyph: '""',
      },
      {
        box: {
          height: 16,
          width: 16,
          x: desktop ? 1322.578125 : 356.578125,
          y: desktop ? 214 : 312,
        },
        glyph: '""',
      },
    ]);
    for (const icon of [actual.searchIcon, actual.forkIcon, ...actual.statsIcons]) {
      expect(icon.style).toMatchObject({
        backgroundImage: "none",
        display: "inline-block",
        fontFamily: "yobicon",
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: "400",
        textDecorationLine: "none",
      });
    }
    expect(actual.scrollWidth).toBe(viewport.width);

    const screenshotDirectory = resolve("..", "output/playwright/visual-sweep");
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(screenshotDirectory, `stylex-projects-readable-residual-${viewport.name}.png`),
    });
  });
