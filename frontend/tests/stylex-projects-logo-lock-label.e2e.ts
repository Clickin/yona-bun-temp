import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const memberAvatarDataUrl = `data:image/png;base64,${readFileSync(
  resolve("src/assets/legacy/default-avatar-34.png"),
).toString("base64")}`;
const logoDataUrl = memberAvatarDataUrl;
const owners = {
  avatar: "projects-directory-owner-avatar",
  image: "projects-directory-owner-avatar-image",
  label: "projects-directory-project-label",
  lock: "projects-directory-private-lock",
  row: "projects-directory-row",
} as const;
const screenshotDirectory = resolve("..", "output", "playwright", "visual-sweep");

test.use({ locale: "ko-KR" });

async function open(page: Page) {
  await page.addInitScript((basePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath,
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
            createdLabel: "4분 전",
            labels: [{ category: "AREA", id: 27, name: "stylex" }],
            lastPushedLabel: "",
            logoUrl: logoDataUrl,
            memberCount: 1,
            overview: "Private project for project-list residual parity",
            ownerName: "admin",
            projectName: "privateparity",
            projectScope: "private",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            overview: "Protected organization project for localhost parity",
            ownerName: "weblabs",
            projectName: "portal",
            projectScope: "protected",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
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
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
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
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "5일 전",
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
        total: 5,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/projects`);
  await expect(page.locator(`[data-stylex-owner="${owners.image}"]`)).toBeVisible();
}

test("avatar, logo, private lock, and label record the four owners and exact fallback boundary", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const theme = readFileSync("src/routes/-projects.stylex.ts", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const uiLess = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobicon = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");
  expect(scala).toContain("@if(hasProjectLogo(project)){<img");
  expect(scala).toContain('@if(project.isPrivate){ <i class="yobicon-lock yobicon-small"></i> }');
  expect(scala).toContain('class="project-label @label.category.toLowerCase"');
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_yobiUI.less";');
  expect(pageLess).toMatch(/img\s*\{\s*vertical-align:\s*top;\s*width:\s*100%;\s*height:\s*100%;/u);
  expect(pageLess).toContain(".yobicon-lock { color:#7F8C8D;}");
  expect(uiLess).toMatch(
    /\.project-label\s*\{\s*border:none; padding:1px 5px; display:inline-block;/u,
  );
  expect(bootstrap).toContain("a:hover,\na:focus {\n  color: #005580;");
  expect(yobicon).toContain(".yobicon-small {\n    font-size:0.7em;");
  expect(yobicon).toContain('.yobicon-lock:before {\n    content: "\\e21e";');
  for (const owner of [owners.avatar, owners.image, owners.lock, owners.label])
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route.match(new RegExp(`data-stylex-owner="${owners.image}"`, "gu"))).toHaveLength(2);
  expect(route).not.toContain("owner-avatar-wrap");
  expect(route).not.toContain("className={`header ");
  expect(route).not.toContain("project-label ");
  expect(route).not.toContain("yobicon-small");
  expect(route).toContain("className={`yobicon-lock ${directoryPrivateLockStyleProps.className");
  expect(route).toContain("label.category.toLowerCase()");
  expect(theme).toContain('privateLockText: "#7f8c8d"');
  expect(theme).toContain('projectLabelText: "#ffffff"');
  expect(theme).toContain('projectLabelSurface: "#aaaaaa"');
  expect(theme).not.toContain("globalColors");
  expect(route).not.toContain("globalColors.");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`logo, private lock, and label preserve exact ${viewport.name} parity`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const row = page.locator(`[data-stylex-owner="${owners.row}"]`).first();
    const avatar = row.locator(`[data-stylex-owner="${owners.avatar}"]`);
    const logo = avatar.locator(`[data-stylex-owner="${owners.image}"]`);
    const header = row.locator('[data-stylex-owner="projects-directory-header"]');
    const lock = header.locator(`:scope > [data-stylex-owner="${owners.lock}"]`);
    const label = header.locator(`:scope > [data-stylex-owner="${owners.label}"]`);
    await expect(avatar).not.toHaveClass(/(?:^|\s)owner-avatar-wrap(?:\s|$)/u);
    await expect(logo).toHaveAttribute("src", logoDataUrl);
    await expect(logo).toHaveAttribute("alt", "privateparity");
    await expect(lock).toHaveClass(/(?:^|\s)yobicon-lock(?:\s|$)/u);
    await expect(lock).not.toHaveClass(/(?:^|\s)yobicon-small(?:\s|$)/u);
    await expect(label).toHaveClass(/(?:^|\s)area(?:\s|$)/u);
    await expect(label).not.toHaveClass(/(?:^|\s)project-label(?:\s|$)/u);
    await expect(label).toHaveText("stylex");
    await expect(label).toHaveAttribute("href", `${basePath}/projects?labelIds=27`);
    await expect(header.locator(":scope > *")).toHaveCount(3);
    await expect(header.locator(":scope > *").nth(0)).toHaveAttribute(
      "data-stylex-owner",
      "projects-directory-title-link",
    );
    await expect(header.locator(":scope > *").nth(1)).toHaveAttribute(
      "data-stylex-owner",
      owners.lock,
    );
    await expect(header.locator(":scope > *").nth(2)).toHaveAttribute(
      "data-stylex-owner",
      owners.label,
    );

    const actual = await page.evaluate((ownerNames) => {
      const select = (owner: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
      const logo = select(ownerNames.image);
      const avatar = select(ownerNames.avatar);
      const lock = select(ownerNames.lock);
      const label = select(ownerNames.label);
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const logoStyle = getComputedStyle(logo);
      const avatarStyle = getComputedStyle(avatar);
      const lockStyle = getComputedStyle(lock);
      const labelStyle = getComputedStyle(label);
      const lockGlyph = getComputedStyle(lock, "::before");
      return {
        avatar: { borderRadius: avatarStyle.borderRadius },
        boxes: { label: box(label), lock: box(lock), logo: box(logo) },
        label: {
          backgroundColor: labelStyle.backgroundColor,
          border: labelStyle.border,
          borderRadius: labelStyle.borderRadius,
          color: labelStyle.color,
          display: labelStyle.display,
          fontFamily: labelStyle.fontFamily,
          fontSize: labelStyle.fontSize,
          fontWeight: labelStyle.fontWeight,
          lineHeight: labelStyle.lineHeight,
          margin: labelStyle.margin,
          padding: labelStyle.padding,
          verticalAlign: labelStyle.verticalAlign,
          whiteSpace: labelStyle.whiteSpace,
        },
        lock: {
          color: lockStyle.color,
          display: lockStyle.display,
          fontFamily: lockStyle.fontFamily,
          fontSize: lockStyle.fontSize,
          fontStyle: lockStyle.fontStyle,
          fontWeight: lockStyle.fontWeight,
          glyphContent: lockGlyph.content,
          glyphFontFamily: lockGlyph.fontFamily,
          lineHeight: lockStyle.lineHeight,
          margin: lockStyle.margin,
          padding: lockStyle.padding,
          verticalAlign: lockStyle.verticalAlign,
        },
        logo: {
          height: logoStyle.height,
          verticalAlign: logoStyle.verticalAlign,
          width: logoStyle.width,
        },
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);
    expect(actual.boxes).toEqual({
      label: {
        height: 22,
        width: 43.703125,
        x: viewport.name === "desktop" ? 223.78125 : 213.78125,
        y: viewport.name === "desktop" ? 216.65625 : 246.65625,
      },
      lock: {
        height: 14,
        width: 14,
        x: viewport.name === "desktop" ? 205.34375 : 195.34375,
        y: viewport.name === "desktop" ? 220 : 250,
      },
      logo: {
        height: 50,
        width: 50,
        x: viewport.name === "desktop" ? 10 : 0,
        y: viewport.name === "desktop" ? 216 : 246,
      },
    });
    expect(actual.logo).toEqual({ height: "50px", verticalAlign: "top", width: "50px" });
    expect(actual.avatar).toEqual({ borderRadius: "3px" });
    expect(actual.lock).toEqual({
      color: "rgb(127, 140, 141)",
      display: "inline-block",
      fontFamily: "yobicon",
      fontSize: "14px",
      fontStyle: "normal",
      fontWeight: "400",
      glyphContent: '"\uE21E"',
      glyphFontFamily: "yobicon",
      lineHeight: "14px",
      margin: "0px",
      padding: "0px",
      verticalAlign: "baseline",
    });
    expect(actual.label).toEqual({
      backgroundColor: "rgb(170, 170, 170)",
      border: "0px none rgb(255, 255, 255)",
      borderRadius: "2px",
      color: "rgb(255, 255, 255)",
      display: "inline-block",
      fontFamily:
        '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      fontSize: "11px",
      fontWeight: "700",
      lineHeight: "20px",
      margin: "0px",
      padding: "1px 5px",
      verticalAlign: "middle",
      whiteSpace: "nowrap",
    });
    expect(actual.scrollWidth).toBe(viewport.width);
    expect(actual.boxes.lock.x).toBeGreaterThan(actual.boxes.logo.x + actual.boxes.logo.width);
    expect(actual.boxes.label.x).toBeGreaterThan(actual.boxes.lock.x + actual.boxes.lock.width);

    await label.hover();
    await expect(label).toHaveCSS("color", "rgb(0, 85, 128)");
    await expect(label).toHaveCSS("text-decoration-line", "underline");
    await expect(label).toHaveCSS("background-color", "rgb(170, 170, 170)");
    await label.focus();
    await expect(label).toHaveCSS("color", "rgb(0, 85, 128)");
    await expect(label).toHaveCSS("text-decoration-line", "underline");
    await expect(label).toHaveCSS("outline-style", "none");
    await page.mouse.move(0, 0);
    await label.evaluate((element) => element.blur());
    mkdirSync(screenshotDirectory, { recursive: true });
    expect(
      (
        await page.screenshot({
          path: resolve(
            screenshotDirectory,
            `stylex-projects-logo-lock-label-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
