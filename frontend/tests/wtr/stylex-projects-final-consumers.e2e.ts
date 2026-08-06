import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  identity: "projects-directory-readable-identity",
  info: "projects-directory-readable-info",
  list: "projects-directory-list",
  lock: "projects-directory-private-lock",
  row: "projects-directory-row",
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
    actorId: null,
    defaultLandingPath: "/",
    emailAddress: "",
    isAnonymous: true,
    isConfirmed: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "",
    userLabel: "",
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
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            members: [],
            overview: "Private project",
            ownerName: "alice",
            projectName: "stylex-private-residual",
            projectScope: "private",
            watchCount: 0,
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
  await expect(page.locator(`[data-stylex-owner="${owners.lock}"]`)).toBeVisible();
}

test("final consumers record reachable controller branches and zero presentation fallback", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const controller = readFileSync("../yona-original/app/controllers/ProjectApp.java", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const labelModel = readFileSync("../yona-original/app/models/Label.java", "utf8");
  const yobicon = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");

  expect(controller).toContain(
    "if (!user.isSiteManager() && !Config.displayPrivateRepositories())",
  );
  expect(controller).toContain('el.eq("projectScope", ProjectScope.PUBLIC);');
  expect(scala).toContain(
    "@if(Config.displayPrivateRepositories() || AccessControl.isAllowed(UserApp.currentUser(), project.asResource(), Operation.READ))",
  );
  expect(scala).toContain('<li class="project" style="background-color: #fcfcfc;">');
  expect(labelModel).toContain("public String category;");
  expect(labelModel).toContain('return category + " - " + name;');
  expect(yobicon).toContain('.yobicon-lock:before {\n    content: "\\e21e";');

  expect(route).not.toContain("projectIsReadable");
  expect(route).not.toContain("viewerCanRead");
  expect(route).not.toContain("You do not have permission to view this project's information");
  expect(route).not.toContain("all-projects");
  expect(route).not.toContain("info-wrap");
  expect(route).not.toMatch(/className=.*yobicon-lock/u);
  expect(route).not.toContain('style={{ backgroundColor: "#fcfcfc" }}');
  expect(route).not.toContain("style={{ opacity: 0.3 }}");
  expect(route).not.toContain('style={{ float: "left", color: "gray" }}');
  expect(route).toContain('data-stylex-owner="projects-directory-private-lock"');
  expect(route).toContain('directoryPrivateLockIcon: { "::before": { content: \'"\\\\e21e"\' } }');
  expect(route).toContain("label.category.toLowerCase()");
  expect(route).not.toContain("globalColors.");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`final private consumer preserves exact ${viewport.name} lock output`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);

    const list = page.locator(`[data-stylex-owner="${owners.list}"]`);
    const row = list.locator(`:scope > [data-stylex-owner="${owners.row}"]`);
    const info = row.locator(`:scope > [data-stylex-owner="${owners.info}"]`);
    const identity = info.locator(`:scope > [data-stylex-owner="${owners.identity}"]`);
    const lock = row.locator(`[data-stylex-owner="${owners.lock}"]`);
    await expect(row).toHaveCount(1);
    await expect(list).not.toHaveClass(/(?:^|\s)all-projects(?:\s|$)/u);
    await expect(row).not.toHaveClass(/(?:^|\s)project(?:\s|$)/u);
    await expect(info).not.toHaveClass(/(?:^|\s)info-wrap(?:\s|$)/u);
    await expect(identity).not.toHaveAttribute("style");
    await expect(lock).not.toHaveClass(/(?:^|\s)yobicon-lock(?:\s|$)/u);

    const actual = await page.evaluate((ownerNames) => {
      const get = (owner: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
      const list = get(ownerNames.list);
      const row = get(ownerNames.row);
      const lock = get(ownerNames.lock);
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const lockStyle = getComputedStyle(lock);
      return {
        list: box(list),
        lock: {
          box: box(lock),
          style: {
            backgroundImage: lockStyle.backgroundImage,
            color: lockStyle.color,
            display: lockStyle.display,
            fontFamily: lockStyle.fontFamily,
            fontSize: lockStyle.fontSize,
            fontStyle: lockStyle.fontStyle,
            fontVariant: lockStyle.fontVariant,
            fontWeight: lockStyle.fontWeight,
            glyph: getComputedStyle(lock, "::before").content,
            lineHeight: lockStyle.lineHeight,
            textDecorationLine: lockStyle.textDecorationLine,
            verticalAlign: lockStyle.verticalAlign,
          },
        },
        row: box(row),
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);
    const desktop = viewport.name === "desktop";
    expect(actual.list).toEqual({
      height: 91,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: 158,
    });
    expect(actual.row).toEqual(actual.list);
    expect(actual.lock.box).toEqual({
      height: 14,
      width: 14,
      x: desktop ? 299.546875 : 289.546875,
      y: 177,
    });
    expect(actual.lock.style).toEqual({
      backgroundImage: "none",
      color: "rgb(127, 140, 141)",
      display: "inline-block",
      fontFamily: "yobicon",
      fontSize: "14px",
      fontStyle: "normal",
      fontVariant: "normal",
      fontWeight: "400",
      glyph: '""',
      lineHeight: "14px",
      textDecorationLine: "none",
      verticalAlign: "baseline",
    });
    expect(actual.scrollWidth).toBe(viewport.width);

    const screenshotDirectory = resolve("..", "output/playwright/visual-sweep");
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(screenshotDirectory, `stylex-projects-final-consumers-${viewport.name}.png`),
    });
  });
