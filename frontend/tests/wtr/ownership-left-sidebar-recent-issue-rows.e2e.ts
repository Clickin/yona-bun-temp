import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("left sidebar Recent issue rows have narrow global-theme Style ownership", () => {
  const source = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const legacyCss = readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

  expect(source).toContain('"left-sidebar-recent-issue-rows"');
  expect(source).toContain('"left-sidebar-recent-issue-popover"');

  const issueItemRule =
    legacyCss.match(/\.user-project-list \.issue-item\s*\{([^}]+)\}/)?.[1] ?? "";
  expect(issueItemRule.match(/!important/g)).toHaveLength(2);
  expect(issueItemRule).toMatch(/display:\s*block\s*!important/);
  expect(issueItemRule).toMatch(/padding-left:\s*5px\s*!important/);
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`left sidebar Recent issue row preserves ${viewport.label} parity and React behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toBeVisible();
    await sidebar.getByRole("button", { exact: true, name: "Recent History" }).click();

    const row = page.locator('[data-owner="left-sidebar-recent-issue-rows"]');
    const link = row.getByRole("link", { name: "Seed notes" });
    const host = link.locator("..");
    await expect(row).toBeVisible();

    const initial = await readRowEvidence(row, sidebar);
    const shellGeometry = await page.evaluate(() => {
      const selectors = [
        '#sidebar > [data-owner="left-sidebar-account-actions"]',
        '#sidebar > [data-owner="left-sidebar-tabs"]',
        "#left-sidebar-myRecentIssueList",
        "#left-sidebar-recent-issue-query",
        "#left-sidebar-recentlyVisitedIssues",
      ];
      return Object.fromEntries(
        selectors.map((selector) => {
          const element = document.querySelector(selector)!;
          const rect = element.getBoundingClientRect();
          return [selector, { height: rect.height, top: rect.top }];
        }),
      );
    });
    console.log(`left-sidebar-recent-issue-row-${viewport.label}`, JSON.stringify(initial));
    expect(initial.hasOwner).toBe(true);
    expect(initial.pluginAttributes).toEqual([]);
    expect(initial.geometry.sidebar).toMatchObject({
      height: viewport.height,
      left: 0,
      top: 0,
      width: 271,
    });
    // English legacy copy wraps the refresh item on desktop, while the narrower mobile padding
    // keeps all four items on one row. These locale-dependent legacy heights are intentional.
    const rowTop = viewport.label === "desktop" ? 147 : 120;
    expect(shellGeometry['#sidebar > [data-owner="left-sidebar-tabs"]']).toEqual({
      height: viewport.label === "desktop" ? 61 : 34,
      top: 44,
    });
    expect(initial.geometry.row).toMatchObject({ height: 27, left: 0, top: rowTop, width: 270 });
    expect(initial.geometry.host).toMatchObject({ height: 27, left: 0, top: rowTop, width: 270 });
    expect(initial.geometry.link).toMatchObject({
      height: 19,
      left: 0,
      top: rowTop + 4,
      width: 270,
    });
    expect(initial.geometry.marker).toMatchObject({ left: 0, top: rowTop + 5, width: 10 });
    expect(initial.geometry.title).toMatchObject({
      left: 10,
      top: rowTop + 6,
      width: 68.15625,
    });
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
        paddingLeft: "0px",
        paddingTop: "1px",
      },
      link: {
        alignItems: "center",
        color: "rgb(255, 255, 255)",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        fontSize: "14px",
        fontWeight: "400",
        justifyContent: "space-between",
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
        color: "rgb(255, 255, 255)",
        display: "inline-block",
        fontSize: "13px",
        maxWidth: "240px",
        whiteSpace: "break-spaces",
        wordBreak: "break-all",
      },
    });

    await host.hover();
    expect(await host.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      "rgba(255, 255, 255, 0.15)",
    );
    const tooltip = page.locator('[data-owner="left-sidebar-recent-issue-popover"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText("project #1");
    await expectOwnedPopoverLegacyClassesAbsent(tooltip);
    const popover = await readPopoverEvidence(tooltip);
    const hoveredHost = await host.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, right: rect.right, top: rect.top };
    });
    console.log(`left-sidebar-recent-issue-popover-${viewport.label}`, JSON.stringify(popover));
    await saveScreenshot(
      page,
      `style-left-sidebar-recent-row-popover-local-${viewport.label}-after.png`,
    );
    await tooltip.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `style-left-sidebar-recent-row-popover-local-element-${viewport.label}-after.png`,
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
    expect(popover.geometry).toMatchObject({ height: 37.59375, left: 280, width: 204 });
    expect(popover.geometry.left).toBe(hoveredHost.right + 10);
    expect(popover.geometry.top + popover.geometry.height / 2).toBe(
      hoveredHost.top + hoveredHost.height / 2,
    );
    expect(popover.geometry.right).toBe(484);
    // Known outer-owner evidence: the React framed shell clips document overflow; this owner keeps
    // the legacy popover's exact 484px right edge and does not add a compensating offset.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

    const beforeDeletion = await readRowEvidence(row, sidebar);
    const beforePopoverDeletion = await readPopoverEvidence(tooltip);
    await removeLegacyClasses(row, tooltip);
    expect(await readRowEvidence(row, sidebar)).toEqual(beforeDeletion);
    expect(await readPopoverEvidence(tooltip)).toEqual(beforePopoverDeletion);
    await expect(row.locator(".issue-item")).toHaveCount(1);

    await page.mouse.move(800, 800);
    await expect(tooltip).toBeHidden();
    await expect(link).toHaveAttribute("href", `${BASE_PATH}/outside/project/issue/1`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/outside/project/issue/1/?$`));
  });
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
    localStorage.setItem("sidebarActiveMenu", "myRecentIssueList");
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

async function readRowEvidence(row: Locator, sidebar: Locator) {
  return row.evaluate(
    (element, sidebarElement) => {
      const host = element.firstElementChild as HTMLElement;
      const link = host.firstElementChild as HTMLElement;
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
        return Object.fromEntries(
          keys.map((key) => [key, style[key as keyof CSSStyleDeclaration]]),
        );
      };
      return {
        geometry: {
          host: box(host),
          issue: box(issue),
          link: box(link),
          marker: box(marker),
          row: box(element),
          sidebar: box(sidebarElement),
          title: box(title),
        },
        hasOwner: element.getAttribute("data-owner") === "left-sidebar-recent-issue-rows",
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
          link: pick(link, [
            "alignItems",
            "color",
            "display",
            "flexDirection",
            "flexGrow",
            "flexWrap",
            "fontSize",
            "fontWeight",
            "justifyContent",
            "overflowX",
            "overflowY",
            "textDecorationLine",
          ]),
          marker: pick(marker, ["color", "display", "verticalAlign", "width"]),
          row: pick(element, ["cursor", "lineHeight"]),
          title: pick(title, [
            "color",
            "display",
            "fontSize",
            "maxWidth",
            "whiteSpace",
            "wordBreak",
          ]),
        },
      };
    },
    await sidebar.elementHandle(),
  );
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
    const link = host.firstElementChild!;
    link.classList.remove("project-item", "project-item-container", "sidebar-row-link");
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
