import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated Recent issue rows have narrow global-theme StyleX ownership", () => {
  const source = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const legacyCss = readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const owner = source.match(
    /const authenticatedSidenavRecentIssueRowStyles = stylex\.create\([\s\S]*?\n\}\);/,
  )?.[0];

  expect(owner).toBeDefined();
  for (const token of [
    "sidenavText",
    "sidenavOrganizationHoverSurface",
    "sidenavIssueTitleMarker",
    "sidenavPopoverSurface",
    "sidenavPopoverBorder",
    "sidenavPopoverArrowBorder",
    "sidenavPopoverShadow",
    "textOnAccent",
  ]) {
    expect(owner).toContain(`homeColors.${token}`);
  }
  expect(owner).toContain('backgroundColor: "transparent"');
  expect(owner).toContain('borderColor: "transparent"');
  expect(theme).not.toContain("transparent:");
  expect(owner).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/i);
  const issueStyle = owner?.match(/\n  issue: \{([\s\S]*?)\n  \},\n  marker:/)?.[1] ?? "";
  expect(issueStyle).toContain('display: "block"');
  expect(issueStyle).toContain('paddingLeft: "5px"');
  expect(theme).toContain('sidenavIssueTitleMarker: "darkgray"');
  expect(source).toContain(
    "isAuthenticatedRecentIssueRow && authenticatedSidenavRecentIssueRowStyles.popover",
  );
  expect(source).toContain('"authenticated-sidenav-recent-issue-rows"');
  expect(source).toContain('"authenticated-sidenav-recent-issue-popover"');

  const issueItemRule =
    legacyCss.match(/\.user-project-list \.issue-item\s*\{([^}]+)\}/)?.[1] ?? "";
  expect(issueItemRule.match(/!important/g)).toHaveLength(2);
  expect(issueItemRule).toMatch(/display:\s*block\s*!important/);
  expect(issueItemRule).toMatch(/padding-left:\s*5px\s*!important/);
});

for (const viewport of [
  { height: 900, label: "desktop", paneScrollWidth: 359, width: 1366, x: 1015, rowWidth: 350 },
  { height: 844, label: "mobile", paneScrollWidth: 398, width: 390, x: 9, rowWidth: 390 },
]) {
  test(`authenticated Recent issue row preserves ${viewport.label} parity and React behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
    // F5 dist-truth: the shell slides open with a 0.5s width transition
    // (rootSidebarMotionStyles.shell); row geometry only matches the settled
    // layout (legacy #mySidenav {position:absolute;right:0} _usermenu.less:852),
    // so wait it out (favorite-stars precedent waits 600ms).
    await page.waitForTimeout(600);
    await page.getByRole("button", { exact: true, name: "Recent History" }).click();

    const row = page.locator('[data-stylex-owner="authenticated-sidenav-recent-issue-rows"]');
    const link = row.getByRole("link", { name: "Seed notes" });
    const item = link.locator("..");
    const host = item.locator("..");
    await expect(row).toBeVisible();

    const initial = await readRowEvidence(row);
    console.log(
      `authenticated-sidenav-recent-issue-row-${viewport.label}`,
      JSON.stringify(initial),
    );
    expect(initial.hasOwner).toBe(true);
    expect(initial.pluginAttributes).toEqual([]);
    expect(initial.geometry.row).toMatchObject({
      height: 27,
      left: viewport.x,
      width: viewport.rowWidth,
    });
    expect(initial.geometry.host).toMatchObject({
      height: 27,
      left: viewport.x,
      width: viewport.rowWidth,
    });
    expect(initial.geometry.item).toMatchObject({
      height: 19,
      left: viewport.x,
      width: viewport.rowWidth,
    });
    expect(initial.geometry.link).toMatchObject({
      height: 19,
      left: viewport.x,
      width: viewport.rowWidth,
    });
    expect(initial.geometry.marker).toMatchObject({ width: 10 });
    expect(initial.geometry.marker.left).toBe(viewport.x + 5);
    expect(initial.geometry.title.left).toBe(viewport.x + 15);
    expect(initial.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });
    expect(initial.styles).toEqual({
      host: {
        alignItems: "center",
        cursor: "pointer",
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        paddingBottom: "4px",
        paddingTop: "4px",
        position: "relative",
      },
      issue: {
        alignItems: "center",
        display: "block",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        overflowX: "hidden",
        overflowY: "hidden",
        paddingBottom: "1px",
        paddingLeft: "5px",
        paddingTop: "1px",
      },
      item: {
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        fontSize: "14px",
        fontWeight: "400",
        justifyContent: "space-between",
        overflowX: "hidden",
        overflowY: "hidden",
      },
      link: {
        alignItems: "center",
        color: "rgb(0, 0, 0)",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        minWidth: "0px",
        overflowX: "hidden",
        overflowY: "hidden",
        textDecorationLine: "none",
      },
      marker: {
        color: "rgb(169, 169, 169)",
        display: "inline-block",
        verticalAlign: "top",
        width: "10px",
      },
      row: { cursor: "pointer", lineHeight: "normal" },
      title: {
        display: "inline-block",
        fontSize: "13px",
        maxWidth: "240px",
        whiteSpace: "break-spaces",
        wordBreak: "break-all",
      },
    });

    await host.hover();
    expect(await host.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      "rgb(241, 241, 241)",
    );
    const tooltip = page.locator(
      '[data-stylex-owner="authenticated-sidenav-recent-issue-popover"]',
    );
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText("project #1");
    await expectOwnedPopoverLegacyClassesAbsent(tooltip);
    const popover = await readPopoverEvidence(tooltip);
    const hoveredHost = await host.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { right: rect.right, top: rect.top, height: rect.height };
    });
    console.log(
      `authenticated-sidenav-recent-issue-popover-${viewport.label}`,
      JSON.stringify(popover),
    );
    await saveScreenshot(
      page,
      `stylex-authenticated-sidenav-recent-row-popover-local-${viewport.label}-after.png`,
    );
    await tooltip.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `stylex-authenticated-sidenav-recent-row-popover-local-element-${viewport.label}-after.png`,
      ),
    });
    expect(popover.styles).toEqual({
      backgroundClip: "padding-box",
      backgroundColor: "rgb(3, 169, 244)",
      borderColor: "rgba(0, 0, 0, 0.2)",
      borderRadius: "2px",
      borderStyle: "solid",
      borderWidth: "1px",
      boxShadow: "rgba(0, 0, 0, 0.1) -2px 2px 1px 0px",
      color: "rgb(255, 255, 255)",
      display: "block",
      fontSize: "13px",
      lineHeight: "13px",
      marginLeft: "10px",
      maxWidth: "276px",
      minWidth: "200px",
      padding: "1px",
      position: "absolute",
      textAlign: "left",
      whiteSpace: "normal",
      wordWrap: "break-word",
      zIndex: "1010",
    });
    expect(popover.contentStyles).toEqual({ lineHeight: "15.6px", padding: "9px 10px" });
    expect(popover.arrowStyles).toMatchObject({
      borderLeftWidth: "0px",
      borderRightColor: "rgba(0, 0, 0, 0.25)",
      borderStyle: "solid",
      borderWidth: "11px 11px 11px 0px",
      display: "block",
      height: "0px",
      left: "-11px",
      marginTop: "-11px",
      position: "absolute",
      width: "0px",
    });
    expect(popover.arrowAfterStyles).toMatchObject({
      borderLeftWidth: "0px",
      borderRightColor: "rgb(3, 169, 244)",
      borderStyle: "solid",
      borderWidth: "10px 10px 10px 0px",
      bottom: "-10px",
      content: '""',
      left: "1px",
      position: "absolute",
    });
    expect(popover.geometry.left).toBe(hoveredHost.right + 10);
    expect(popover.geometry.height).toBe(37.59375);
    expect(popover.geometry.top + popover.geometry.height / 2).toBe(
      hoveredHost.top + hoveredHost.height / 2,
    );
    expect(
      await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        pane: document.querySelector<HTMLElement>("#myRecentIssueList")?.scrollWidth ?? Number.NaN,
        viewport: innerWidth,
      })),
    ).toEqual({
      document: viewport.width,
      // The frozen content-box search input determines this internal scroll width.
      pane: viewport.paneScrollWidth,
      viewport: viewport.width,
    });

    const beforeDeletion = await readRowEvidence(row);
    const beforePopoverDeletion = await readPopoverEvidence(tooltip);
    await removeLegacyClasses(row, tooltip);
    expect(await readRowEvidence(row)).toEqual(beforeDeletion);
    expect(await readPopoverEvidence(tooltip)).toEqual(beforePopoverDeletion);
    await expect(row.locator(".issue-item")).toHaveCount(1);

    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
    await expect(link).toHaveAttribute("href", `${BASE_PATH}/outside/project/issue/1`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/outside/project/issue/1/?$`));
  });
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [
          { issueNumber: 1, ownerName: "outside", projectName: "project", title: "Seed notes" },
        ],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}

async function readRowEvidence(row: Locator) {
  return row.evaluate((element) => {
    const host = element.firstElementChild as HTMLElement;
    const item = host.firstElementChild as HTMLElement;
    const link = item.firstElementChild as HTMLElement;
    const issue = link.firstElementChild as HTMLElement;
    const marker = issue.firstElementChild as HTMLElement;
    const title = issue.lastElementChild as HTMLElement;
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    const pick = (target: Element, keys: string[]) => {
      const style = getComputedStyle(target);
      return Object.fromEntries(keys.map((key) => [key, style[key as keyof CSSStyleDeclaration]]));
    };
    return {
      geometry: {
        host: box(host),
        issue: box(issue),
        item: box(item),
        link: box(link),
        marker: box(marker),
        row: box(element),
        title: box(title),
      },
      hasOwner:
        element.getAttribute("data-stylex-owner") === "authenticated-sidenav-recent-issue-rows",
      pluginAttributes: Array.from(
        element.querySelectorAll(
          "[data-toggle], [data-target], [data-action], [data-href], [data-url]",
        ),
        (node) => node.tagName.toLowerCase(),
      ),
      styles: {
        host: pick(host, [
          "alignItems",
          "cursor",
          "display",
          "flexDirection",
          "flexWrap",
          "justifyContent",
          "paddingBottom",
          "paddingTop",
          "position",
        ]),
        issue: pick(issue, [
          "alignItems",
          "display",
          "flexDirection",
          "flexGrow",
          "flexWrap",
          "justifyContent",
          "overflowX",
          "overflowY",
          "paddingBottom",
          "paddingLeft",
          "paddingTop",
        ]),
        item: pick(item, [
          "alignItems",
          "display",
          "flexDirection",
          "flexGrow",
          "flexWrap",
          "fontSize",
          "fontWeight",
          "justifyContent",
          "overflowX",
          "overflowY",
        ]),
        link: pick(link, [
          "alignItems",
          "color",
          "display",
          "flexDirection",
          "flexGrow",
          "minWidth",
          "overflowX",
          "overflowY",
          "textDecorationLine",
        ]),
        marker: pick(marker, ["color", "display", "verticalAlign", "width"]),
        row: pick(element, ["cursor", "lineHeight"]),
        title: pick(title, ["display", "fontSize", "maxWidth", "whiteSpace", "wordBreak"]),
      },
      viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
    };
  });
}

async function readPopoverEvidence(tooltip: Locator) {
  return tooltip.evaluate((element) => {
    const arrow = element.firstElementChild as HTMLElement;
    const content = element.lastElementChild as HTMLElement;
    const style = getComputedStyle(element);
    const arrowStyle = getComputedStyle(arrow);
    const after = getComputedStyle(arrow, "::after");
    const contentStyle = getComputedStyle(content);
    const rect = element.getBoundingClientRect();
    const pick = (target: CSSStyleDeclaration, keys: string[]) =>
      Object.fromEntries(keys.map((key) => [key, target[key as keyof CSSStyleDeclaration]]));
    return {
      arrowAfterStyles: pick(after, [
        "borderLeftWidth",
        "borderRightColor",
        "borderStyle",
        "borderWidth",
        "bottom",
        "content",
        "left",
        "position",
      ]),
      arrowStyles: pick(arrowStyle, [
        "borderLeftWidth",
        "borderRightColor",
        "borderStyle",
        "borderWidth",
        "display",
        "height",
        "left",
        "marginTop",
        "position",
        "top",
        "width",
      ]),
      contentStyles: { lineHeight: contentStyle.lineHeight, padding: contentStyle.padding },
      geometry: {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      },
      styles: pick(style, [
        "backgroundClip",
        "backgroundColor",
        "borderColor",
        "borderRadius",
        "borderStyle",
        "borderWidth",
        "boxShadow",
        "color",
        "display",
        "fontSize",
        "lineHeight",
        "marginLeft",
        "maxWidth",
        "minWidth",
        "padding",
        "position",
        "textAlign",
        "whiteSpace",
        "wordWrap",
        "zIndex",
      ]),
    };
  });
}

async function expectOwnedPopoverLegacyClassesAbsent(tooltip: Locator) {
  expect(
    await tooltip.evaluate((element) => ({
      arrow: element.firstElementChild?.classList.contains("arrow"),
      content: element.lastElementChild?.classList.contains("popover-content"),
      popover: element.classList.contains("popover"),
      right: element.classList.contains("right"),
    })),
  ).toEqual({ arrow: false, content: false, popover: false, right: false });
}

async function removeLegacyClasses(row: Locator, tooltip: Locator) {
  await row.evaluate((element) => {
    element.classList.remove("user-li");
    const host = element.firstElementChild!;
    host.classList.remove("project-list", "project-flex-container");
    const item = host.firstElementChild!;
    item.classList.remove("project-item", "project-item-container");
    const link = item.firstElementChild!;
    const issue = link.firstElementChild!;
    issue.classList.remove("projectName-owner", "flex-item");
    issue.firstElementChild!.classList.remove("issue-title-start");
    issue.lastElementChild!.classList.remove("issue-title", "flex-item");
  });
  await tooltip.evaluate((element) => {
    element.classList.remove("popover", "right");
    element.firstElementChild!.classList.remove("arrow");
    element.lastElementChild!.classList.remove("popover-content");
  });
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
