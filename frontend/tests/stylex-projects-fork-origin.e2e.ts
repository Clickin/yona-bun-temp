import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const avatarDataUrl = `data:image/png;base64,${readFileSync(
  resolve("src/assets/legacy/default-avatar-34.png"),
).toString("base64")}`;
const owners = {
  forkLink: "projects-directory-fork-origin-link",
  forkWrapper: "projects-directory-fork-origin",
  header: "projects-directory-header",
  row: "projects-directory-row",
  title: "projects-directory-title-link",
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
  await expect(page.locator(`[data-stylex-owner="${owners.forkWrapper}"]`)).toBeVisible();
}

test("fork origin records exactly two owners and the generic Yobicon fallback", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const theme = readFileSync("src/routes/-projects.stylex.ts", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const variables = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const yobicon = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");
  const titleIndex = scala.indexOf('class="black">@project.name</a>');
  const forkIndex = scala.indexOf('<span class="small-font blue-txt">');
  const lockIndex = scala.indexOf("@if(project.isPrivate)");
  const labelsIndex = scala.indexOf("@for(label <- project.labels)");

  expect(titleIndex).toBeGreaterThan(-1);
  expect(forkIndex).toBeGreaterThan(titleIndex);
  expect(lockIndex).toBeGreaterThan(forkIndex);
  expect(labelsIndex).toBeGreaterThan(lockIndex);
  expect(scala).toContain('class="origin-title"');
  expect(scala).toContain('<i class="yobicon-split"></i>');
  expect(variables).toContain("@blue   : #5DBBE0;");
  expect(common).toContain(".blue-txt      { color:@blue;}");
  expect(common).toContain(".small-font{\n    font-size: 10px;\n    font-weight: normal;");
  expect(yobicon).toContain('.yobicon-split:before {\n    content: "\\e450";');

  expect(route).toContain('data-stylex-owner="projects-directory-fork-origin"');
  expect(route).toContain('data-stylex-owner="projects-directory-fork-origin-link"');
  expect(route).toContain("project.isForked === true");
  expect(route).toContain('stringField(project, "originOwnerName", "")');
  expect(route).toContain('stringField(project, "originProjectName", "")');
  expect(route).toContain('className="yobicon-split"');
  expect(route).not.toContain("small-font");
  expect(route).not.toContain("blue-txt");
  expect(route).not.toContain("origin-title");
  expect(route).not.toContain("globalColors.");
  expect(theme).toContain('forkOriginText: "#5DBBE0"');
  expect(theme).not.toContain("globalColors");
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`fork origin preserves exact ${viewport.name} output`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);

    const rows = page.locator(`[data-stylex-owner="${owners.row}"]`);
    const row = rows.first();
    const header = row.locator(`[data-stylex-owner="${owners.header}"]`);
    const title = header.locator(`[data-stylex-owner="${owners.title}"]`);
    const wrapper = header.locator(`[data-stylex-owner="${owners.forkWrapper}"]`);
    const link = wrapper.locator(`[data-stylex-owner="${owners.forkLink}"]`);
    const icon = link.locator(":scope > i.yobicon-split");

    await expect(rows).toHaveCount(4);
    await expect(title).toHaveText("stylexfork");
    await expect(wrapper).toHaveText(/admin\s*\/\s*sample/u);
    await expect(link).toHaveAttribute("href", `${basePath}/admin/sample`);
    await expect(icon).toHaveCount(1);
    await expect(wrapper).not.toHaveClass(/(?:^|\s)(?:small-font|blue-txt)(?:\s|$)/u);
    await expect(link).not.toHaveClass(/(?:^|\s)origin-title(?:\s|$)/u);
    await expect(header.locator(":scope > *")).toHaveCount(2);

    const actual = await page.evaluate((owners) => {
      const first = (owner: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
      const row = first(owners.row);
      const header = first(owners.header);
      const title = first(owners.title);
      const wrapper = first(owners.forkWrapper);
      const link = first(owners.forkLink);
      const icon = link.querySelector<HTMLElement>(":scope > i.yobicon-split")!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const wrapperStyle = getComputedStyle(wrapper);
      const linkStyle = getComputedStyle(link);
      const iconStyle = getComputedStyle(icon);
      return {
        boxes: {
          header: box(header),
          icon: box(icon),
          link: box(link),
          row: box(row),
          title: box(title),
          wrapper: box(wrapper),
        },
        icon: {
          content: getComputedStyle(icon, "::before").content,
          display: iconStyle.display,
          fontFamily: iconStyle.fontFamily,
          fontSize: iconStyle.fontSize,
          lineHeight: iconStyle.lineHeight,
        },
        link: {
          backgroundColor: linkStyle.backgroundColor,
          borderColor: linkStyle.borderColor,
          borderStyle: linkStyle.borderStyle,
          color: linkStyle.color,
          fontFamily: linkStyle.fontFamily,
          fontSize: linkStyle.fontSize,
          fontStyle: linkStyle.fontStyle,
          fontWeight: linkStyle.fontWeight,
          lineHeight: linkStyle.lineHeight,
          margin: linkStyle.margin,
          outlineStyle: linkStyle.outlineStyle,
          padding: linkStyle.padding,
          textDecorationLine: linkStyle.textDecorationLine,
          verticalAlign: linkStyle.verticalAlign,
        },
        order: Array.from(header.children).map((child) => child.getAttribute("data-stylex-owner")),
        wrapper: {
          backgroundColor: wrapperStyle.backgroundColor,
          borderColor: wrapperStyle.borderColor,
          borderStyle: wrapperStyle.borderStyle,
          color: wrapperStyle.color,
          display: wrapperStyle.display,
          fontFamily: wrapperStyle.fontFamily,
          fontSize: wrapperStyle.fontSize,
          fontStyle: wrapperStyle.fontStyle,
          fontWeight: wrapperStyle.fontWeight,
          lineHeight: wrapperStyle.lineHeight,
          margin: wrapperStyle.margin,
          padding: wrapperStyle.padding,
          verticalAlign: wrapperStyle.verticalAlign,
        },
      };
    }, owners);

    const expected =
      viewport.name === "desktop"
        ? {
            header: { height: 23, width: 266.546875, x: 80, y: 173 },
            icon: { height: 10, width: 10, x: 179.046875, y: 181 },
            link: { height: 12, width: 85.71875, x: 179.046875, y: 180 },
            row: { height: 94, width: 1346, x: 10, y: 158 },
            title: { height: 23, width: 94.609375, x: 80, y: 171 },
            wrapper: { height: 12, width: 85.71875, x: 179.046875, y: 180 },
          }
        : {
            header: { height: 23, width: 266.546875, x: 70, y: 203 },
            icon: { height: 10, width: 10, x: 169.046875, y: 211 },
            link: { height: 12, width: 85.71875, x: 169.046875, y: 210 },
            row: { height: 154, width: 390, x: 0, y: 188 },
            title: { height: 23, width: 94.609375, x: 70, y: 201 },
            wrapper: { height: 12, width: 85.71875, x: 169.046875, y: 210 },
          };
    for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
      expect(actual.boxes[key].x).toBeCloseTo(expected[key].x, 1);
      expect(actual.boxes[key].y).toBeCloseTo(expected[key].y, 1);
      expect(actual.boxes[key].width).toBeCloseTo(expected[key].width, 1);
      expect(actual.boxes[key].height).toBeCloseTo(expected[key].height, 1);
    }
    expect(actual.order).toEqual([owners.title, owners.forkWrapper]);
    expect(actual.wrapper).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderColor: "rgb(93, 187, 224)",
      borderStyle: "none",
      color: "rgb(93, 187, 224)",
      display: "inline",
      fontFamily:
        '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      fontSize: "10px",
      fontStyle: "normal",
      fontWeight: "400",
      lineHeight: "20px",
      margin: "0px",
      padding: "0px",
      verticalAlign: "baseline",
    });
    expect(actual.link).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderColor: "rgb(93, 187, 224)",
      borderStyle: "none",
      color: "rgb(93, 187, 224)",
      fontFamily:
        '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      fontSize: "10px",
      fontStyle: "normal",
      fontWeight: "400",
      lineHeight: "20px",
      margin: "0px",
      outlineStyle: "none",
      padding: "0px",
      textDecorationLine: "none",
      verticalAlign: "baseline",
    });
    expect(actual.icon.content).toBe('"\ue450"');
    expect(actual.icon.display).toBe("inline-block");
    expect(actual.icon.fontFamily).toContain("yobicon");
    expect(actual.icon.fontSize).toBe("10px");
    expect(actual.icon.lineHeight).toBe("10px");
    expect(actual.boxes.row.x + actual.boxes.row.width).toBeLessThanOrEqual(viewport.width);

    mkdirSync("../output/playwright/visual-sweep", { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: `../output/playwright/visual-sweep/stylex-projects-fork-origin-${viewport.name}.png`,
    });

    await link.hover();
    await expect(link).toHaveCSS("color", "rgb(0, 85, 128)");
    await expect(link).toHaveCSS("text-decoration-line", "underline");
    await link.focus();
    await expect(link).toHaveCSS("color", "rgb(0, 85, 128)");
    await expect(link).toHaveCSS("text-decoration-line", "underline");
    await expect(link).toHaveCSS("outline-style", "none");
  });
