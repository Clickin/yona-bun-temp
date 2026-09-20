import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
// wtr-compat readFileSync's binary branch sets responseType=arraybuffer on a
// synchronous XHR, which documents reject (InvalidAccessError) — bucket-1 gap
// reported to main. readFile (async fetch) returns the PNG bytes; btoa keeps
// the original data-URL semantics.
const memberAvatarDataUrl = `data:image/png;base64,${btoa(
  String.fromCharCode(
    ...((await readFile(
      resolve("src/assets/legacy/default-avatar-34.png"),
    )) as unknown as Uint8Array),
  ),
)}`;
const owners = {
  avatar: "projects-directory-member-avatar",
  avatarImage: "projects-directory-member-avatar-image",
  icon: "projects-directory-stats-icon",
  members: "projects-directory-members",
  row: "projects-directory-row",
  stats: "projects-directory-stats",
} as const;

test.use({ locale: "ko-KR" });

async function open(page: Page) {
  await page.clock.setFixedTime("2026-07-17T12:00:00Z");
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
            createdAt: "2026-07-07T12:00:00Z",
            labels: [],
            lastPushedAt: "",
            logoUrl: "",
            memberCount: 1,
            overview: "Protected organization project for localhost parity",
            ownerName: "weblabs",
            projectName: "portal",
            projectScope: "protected",
            watchCount: 1,
          },
          {
            createdAt: "2026-07-07T12:00:00Z",
            labels: [],
            lastPushedAt: "",
            logoUrl: "",
            memberCount: 1,
            members: [{ avatarUrl: memberAvatarDataUrl, loginId: "alice", userLabel: "Alice Kim" }],
            overview: "Parity seed project for the alice workspace",
            ownerName: "alice",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdAt: "2026-07-07T12:00:00Z",
            labels: [],
            lastPushedAt: "",
            logoUrl: "",
            memberCount: 1,
            members: [
              { avatarUrl: memberAvatarDataUrl, loginId: "admin", userLabel: "Site Admin" },
            ],
            overview: "Parity seed Subversion project for localhost checks",
            ownerName: "admin",
            projectName: "svnplayground",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdAt: "2026-07-07T12:00:00Z",
            labels: [],
            lastPushedAt: "2026-07-12T12:00:00Z",
            logoUrl: "",
            memberCount: 1,
            members: [
              { avatarUrl: memberAvatarDataUrl, loginId: "admin", userLabel: "Site Admin" },
            ],
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
  await expect(page.locator('[data-owner="projects-directory-list"]')).toBeVisible();
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`icons/avatar image preserve exact ${viewport.name} output and geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await open(page);

    const rows = page.locator(`[data-owner="${owners.row}"]`);
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0).locator(`[data-owner="${owners.icon}"]`)).toHaveCount(0);
    await expect(rows.nth(0).locator(`[data-owner="${owners.avatarImage}"]`)).toHaveCount(0);
    const secondRow = rows.nth(1);
    const stats = secondRow.locator(`[data-owner="${owners.stats}"]`);
    const members = stats.locator(`:scope > [data-owner="${owners.members}"]`);
    const avatar = members.locator(`[data-owner="${owners.avatar}"]`);
    const avatarImage = avatar.locator(`:scope > [data-owner="${owners.avatarImage}"]`);
    const icons = members.locator(`p > [data-owner="${owners.icon}"]`);
    await expect(stats).not.toHaveClass(/(?:^|\s)stats-wrap(?:\s|$)/u);
    await expect(avatar).not.toHaveClass(/(?:^|\s)avatar-wrap(?:\s|$)/u);
    await expect(avatar).toHaveAttribute("href", `${basePath}/alice`);
    await expect(avatarImage).toHaveAttribute("alt", "Alice Kim");
    await expect(avatarImage).toHaveAttribute("src", memberAvatarDataUrl);
    await expect(icons).toHaveCount(2);
    await expect(icons.nth(0)).not.toHaveClass(/(?:^|\s)yobicon-friends(?:\s|$)/u);
    await expect(icons.nth(1)).not.toHaveClass(/(?:^|\s)yobicon-eye(?:\s|$)/u);
    await expect(icons.nth(0)).not.toHaveClass(/(?:^|\s)yobicon-middle(?:\s|$)/u);
    await expect(icons.nth(1)).not.toHaveClass(/(?:^|\s)yobicon-middle(?:\s|$)/u);
    await expect(members.locator("p > *")).toHaveCount(4);
    await expect(members.locator("p > *").nth(0)).toHaveAttribute("data-owner", owners.icon);
    await expect(members.locator("p > *").nth(2)).toHaveAttribute("data-owner", owners.icon);

    const actual = await page.evaluate((ownerNames) => {
      const row = document.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.row}"]`)[1]!;
      const stats = row.querySelector<HTMLElement>(`[data-owner="${ownerNames.stats}"]`)!;
      const avatar = row.querySelector<HTMLElement>(`[data-owner="${ownerNames.avatar}"]`)!;
      const avatarImage = row.querySelector<HTMLImageElement>(
        `[data-owner="${ownerNames.avatarImage}"]`,
      )!;
      const icons = Array.from(
        row.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.icon}"]`),
      );
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          right: rect.right,
          width: rect.width,
          x: rect.x,
          y: rect.y,
        };
      };
      const avatarStyle = getComputedStyle(avatar);
      const imageStyle = getComputedStyle(avatarImage);
      return {
        avatar: box(avatar),
        avatarBorderRadius: avatarStyle.borderRadius,
        avatarImage: box(avatarImage),
        avatarImageStyle: {
          height: imageStyle.height,
          verticalAlign: imageStyle.verticalAlign,
          width: imageStyle.width,
        },
        icons: icons.map((icon) => {
          const style = getComputedStyle(icon);
          return {
            box: box(icon),
            className: icon.className,
            display: style.display,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            glyph: getComputedStyle(icon, "::before").content,
            lineHeight: style.lineHeight,
            marginBottom: style.marginBottom,
            marginLeft: style.marginLeft,
            marginRight: style.marginRight,
            verticalAlign: style.verticalAlign,
          };
        }),
        imageContained:
          avatarImage.getBoundingClientRect().left >= avatar.getBoundingClientRect().left &&
          avatarImage.getBoundingClientRect().right <= avatar.getBoundingClientRect().right &&
          avatarImage.getBoundingClientRect().top >= avatar.getBoundingClientRect().top &&
          avatarImage.getBoundingClientRect().bottom <= avatar.getBoundingClientRect().bottom,
        row: box(row),
        scrollWidth: document.documentElement.scrollWidth,
        stats: box(stats),
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.avatar).toEqual({
      bottom: desktop ? 339 : 434,
      height: 32,
      right: desktop ? 1353 : 387,
      width: 32,
      x: desktop ? 1321 : 355,
      y: desktop ? 307 : 402,
    });
    expect(actual.avatarImage).toEqual(actual.avatar);
    expect(actual.avatarImageStyle).toEqual({
      height: "32px",
      verticalAlign: "top",
      width: "32px",
    });
    expect(actual.avatarBorderRadius).toBe("3px");
    expect(actual.imageContained).toBe(true);
    expect(actual.icons.map(({ box }) => box)).toEqual([
      {
        bottom: desktop ? 364 : 459,
        height: 16,
        right: desktop ? 1304.65625 : 338.65625,
        width: 16,
        x: desktop ? 1288.65625 : 322.65625,
        y: desktop ? 348 : 443,
      },
      {
        bottom: desktop ? 364 : 459,
        height: 16,
        right: desktop ? 1340.828125 : 374.828125,
        width: 16,
        x: desktop ? 1324.828125 : 358.828125,
        y: desktop ? 348 : 443,
      },
    ]);
    expect(
      actual.icons.every(
        ({ className }) =>
          !className.includes("yobicon-middle") &&
          !className.includes("yobicon-friends") &&
          !className.includes("yobicon-eye"),
      ),
    ).toBe(true);
    expect(actual.icons.map(({ glyph }) => glyph)).toEqual(['""', '""']);
    for (const icon of actual.icons) {
      expect(icon).toMatchObject({
        display: "inline-block",
        fontFamily: "yobicon",
        fontSize: "16px",
        lineHeight: "16px",
        marginBottom: "3px",
        marginLeft: "5px",
        marginRight: "5px",
        verticalAlign: "bottom",
      });
    }
    expect(actual.stats).toEqual({
      bottom: desktop ? 367 : 462,
      height: 60,
      right: desktop ? 1356 : 390,
      width: 85,
      x: desktop ? 1271 : 305,
      y: desktop ? 307 : 402,
    });
    expect(actual.row).toEqual({
      bottom: desktop ? 383 : 473,
      height: desktop ? 91 : 151,
      right: desktop ? 1356 : 390,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 292 : 322,
    });
    expect(actual.scrollWidth).toBe(viewport.width);

    const screenshotDirectory = resolve("..", "output/playwright/visual-sweep");
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(screenshotDirectory, `style-projects-icons-avatar-image-${viewport.name}.png`),
    });
  });
