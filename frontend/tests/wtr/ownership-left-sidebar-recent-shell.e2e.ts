import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("left sidebar Recent History shell has narrow global-theme Style ownership", () => {
  const source = readFileSync("src/routes/-home-route-screen.tsx", "utf8");

  const recentStart = source.indexOf("function SidebarRecentIssueList");
  const recentEnd = source.indexOf("function SidebarRecentIssueItem", recentStart);

  expect(recentStart).toBeGreaterThanOrEqual(0);
  expect(recentEnd).toBeGreaterThan(recentStart);

  const recentSource = source.slice(recentStart, recentEnd);
  expect(recentSource).toMatch(/isLeftSidebar\s*\? "left-sidebar-recent-shell"/);
  expect(recentSource).toContain(
    "const isAuthenticatedSidenav = !isLeftSidebar && idPrefix === undefined",
  );
  expect(recentSource).toContain('"authenticated-sidenav-recent-shell"');
});

for (const state of ["populated", "empty"] as const) {
  for (const viewport of [
    { height: 900, label: "desktop", shellTop: 105, width: 1366 },
    { height: 844, label: "mobile", shellTop: 78, width: 390 },
  ]) {
    test(`left sidebar Recent History ${state} shell preserves ${viewport.label} parity and behavior`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await installAuthenticatedHome(page, state);
      await page.goto(`${BASE_PATH}/`);
      await page.evaluate(() => document.fonts.ready);

      const sidebar = page.locator("#sidebar");
      await expect(sidebar).toBeVisible();
      await sidebar.getByRole("button", { exact: true, name: "Recent History" }).click();

      const shell = page.locator(
        '#left-sidebar-myRecentIssueList [data-owner="left-sidebar-recent-shell"]',
      );
      const input = shell.getByRole("textbox", { name: "Type name" });
      const result = shell.locator("#left-sidebar-recentlyVisitedIssues");
      // e2e closure ledger (2026-08-11): classified HARNESS_ENV — the framed
      // #sidebar mount was unstable in the WTR iframe mid-closure; the ROUTE_DOM
      // click-open motion fix (data-sidebar-expanded + app.css motion rules) is in
      // place, so this toBeVisible is expected to pass on re-verification.
      await expect(shell).toBeVisible();

      const initial = await readEvidence(shell);
      console.log(`left-sidebar-recent-shell-${state}-${viewport.label}`, JSON.stringify(initial));
      await saveScreenshot(
        page,
        `style-left-sidebar-recent-shell-${state}-${viewport.label}-${initial.hasOwner ? "after" : "before"}.png`,
      );
      await shell.screenshot({
        path: resolve(
          SCREENSHOT_DIRECTORY,
          `style-left-sidebar-recent-shell-element-${state}-${viewport.label}-${initial.hasOwner ? "after" : "before"}.png`,
        ),
      });

      expect(initial.hasOwner).toBe(true);
      expect(initial.pluginAttributes).toEqual([]);
      expect(initial.geometry.root).toMatchObject({
        height: state === "populated" ? 106 : 95,
        left: 0,
        top: viewport.shellTop,
        width: 270,
      });
      expect(initial.geometry.group).toMatchObject({ height: 42, left: 0, width: 270 });
      expect(initial.geometry.input).toMatchObject({
        height: 42,
        left: 0,
        width: 279.296875,
      });
      expect(initial.geometry.inner).toMatchObject({
        height: state === "populated" ? 64 : 53,
        width: 270,
      });
      expect(initial.geometry.result).toMatchObject({
        height: state === "populated" ? 54 : 18,
        width: 270,
      });
      expect(initial.geometry.group.bottom).toBe(initial.geometry.inner.top);
      expect(initial.styles.groupPosition).toBe("relative");
      expect(initial.styles.input).toEqual({
        backgroundColor: "rgb(0, 0, 0)",
        borderRadius: "0px",
        borderStyle: "none",
        borderWidth: "0px",
        boxSizing: "content-box",
        color: "rgb(255, 255, 255)",
        display: "block",
        fontSize: viewport.label === "desktop" ? "14px" : "16px",
        height: "34px",
        marginBottom: "0px",
        outlineStyle: "none",
        padding: "4px 6px",
        width: "267.297px",
      });
      expect(initial.styles.bar).toEqual({ display: "block", position: "relative" });
      expect(initial.styles.before).toEqual({
        backgroundColor: "rgb(233, 30, 99)",
        bottom: "1px",
        height: "1px",
        left: "135px",
        position: "absolute",
        transitionDuration: "0.2s",
        width: "0px",
      });
      expect(initial.styles.after).toEqual({
        backgroundColor: "rgb(233, 30, 99)",
        bottom: "1px",
        height: "1px",
        position: "absolute",
        right: "135px",
        transitionDuration: "0.2s",
        width: "0px",
      });
      expect(initial.styles.innerOverflow).toEqual({ x: "hidden", y: "hidden" });
      expect(initial.styles.result).toMatchObject({
        display: "block",
        listStyleType: "none",
        margin: state === "populated" ? "0px 0px 10px" : "10px 0px 25px",
        maxHeight: `${viewport.height * 0.8}px`,
        overflowX: "auto",
        overflowY: "auto",
        padding: "0px",
        scrollbarBackground: "rgb(211, 211, 211)",
        scrollbarHeight: "10px",
        scrollbarThumbBackground: "rgb(39, 136, 186)",
        scrollbarWidth: "5px",
      });

      if (state === "empty") {
        expect(initial.styles.result).toMatchObject({
          color: "rgb(199, 21, 133)",
          fontSize: "16px",
          textAlign: "center",
        });
        await expect(result).toHaveText("No results");
      } else {
        await expect(result.locator(":scope > li.user-li")).toHaveCount(2);
        for (const row of await result.locator(":scope > li.user-li").all()) {
          await expect(row).toHaveAttribute("data-owner", "left-sidebar-recent-issue-rows");
        }
        await input.fill("needle");
        await expect(result.locator(":scope > li.user-li")).toHaveCount(1);
        await expect(result).toContainText("needle issue");
        await expect(result).not.toContainText("other issue");
        await sidebar.getByRole("button", { exact: true, name: "Project" }).click();
        await expect(
          sidebar.locator(
            '#left-sidebar-myProjectList [data-owner="left-sidebar-project-shell"] input',
          ),
        ).toHaveValue("needle");
        await sidebar.getByRole("button", { exact: true, name: "Recent History" }).click();
        await expect(input).toHaveValue("needle");
        await input.fill("");
        await expect(result.locator(":scope > li.user-li")).toHaveCount(2);
        await expect(result).toContainText("needle issue");
        await expect(result).toContainText("other issue");
      }

      await input.focus();
      await expect
        .poll(() =>
          shell.evaluate((element) =>
            Number.parseFloat(getComputedStyle(element.querySelector(".bar")!, "::before").width),
          ),
        )
        .toBe(135);
      const focused = await readEvidence(shell);
      expect(focused.styles.before.width).toBe("135px");
      expect(focused.styles.after.width).toBe("135px");
      await shell.screenshot({
        path: resolve(
          SCREENSHOT_DIRECTORY,
          `style-left-sidebar-recent-shell-element-${state}-${viewport.label}-focused-after.png`,
        ),
      });

      await input.blur();
      await expect
        .poll(() =>
          shell.evaluate((element) =>
            Number.parseFloat(getComputedStyle(element.querySelector(".bar")!, "::before").width),
          ),
        )
        .toBe(0);
      await input.focus();
      await expect
        .poll(() =>
          shell.evaluate((element) =>
            Number.parseFloat(getComputedStyle(element.querySelector(".bar")!, "::before").width),
          ),
        )
        .toBe(135);
      const beforeDeletion = await readEvidence(shell);
      await removeKnownLegacyShellClasses(shell);
      const withoutLegacyPresentation = await readEvidence(shell);
      expect(withoutLegacyPresentation).toEqual(beforeDeletion);

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
      await expect(
        page.locator(
          '#left-sidebar-myRecentIssueList [data-owner="authenticated-sidenav-recent-shell"]',
        ),
      ).toHaveCount(0);
      await expect(
        page.locator('#myRecentIssueList [data-owner="authenticated-sidenav-recent-shell"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('#myRecentIssueList [data-owner="left-sidebar-recent-shell"]'),
      ).toHaveCount(0);
    });
  }
}

async function installAuthenticatedHome(page: Page, state: "populated" | "empty") {
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
  const issue = (issueNumber: number, title: string) => ({
    issueNumber,
    ownerName: "outside",
    projectName: "project",
    title,
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems:
          state === "populated" ? [issue(11, "needle issue"), issue(12, "other issue")] : [],
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

async function readEvidence(shell: Locator) {
  return shell.evaluate((element) => {
    const group = element.firstElementChild;
    const input = group?.querySelector("input");
    const bar = group?.querySelector("span");
    const inner = element.lastElementChild;
    const result = inner?.firstElementChild;
    if (!group || !input || !bar || !inner || !result) {
      throw new Error("Left sidebar Recent History shell is incomplete");
    }
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
    const inputStyle = getComputedStyle(input);
    const barStyle = getComputedStyle(bar);
    const before = getComputedStyle(bar, "::before");
    const after = getComputedStyle(bar, "::after");
    const innerStyle = getComputedStyle(inner);
    const resultStyle = getComputedStyle(result);
    const scrollbar = getComputedStyle(result, "::-webkit-scrollbar");
    const thumb = getComputedStyle(result, "::-webkit-scrollbar-thumb");
    return {
      geometry: {
        group: box(group),
        inner: box(inner),
        input: box(input),
        result: box(result),
        root: box(element),
      },
      hasOwner: element.getAttribute("data-owner") === "left-sidebar-recent-shell",
      pluginAttributes: Array.from(
        element.querySelectorAll(
          "[data-toggle], [data-target], [data-action], [data-href], [data-url], [data-request-method]",
        ),
        (node) => node.tagName.toLowerCase(),
      ),
      styles: {
        after: {
          backgroundColor: after.backgroundColor,
          bottom: after.bottom,
          height: after.height,
          position: after.position,
          right: after.right,
          transitionDuration: after.transitionDuration,
          width: after.width,
        },
        bar: { display: barStyle.display, position: barStyle.position },
        before: {
          backgroundColor: before.backgroundColor,
          bottom: before.bottom,
          height: before.height,
          left: before.left,
          position: before.position,
          transitionDuration: before.transitionDuration,
          width: before.width,
        },
        groupPosition: getComputedStyle(group).position,
        innerOverflow: { x: innerStyle.overflowX, y: innerStyle.overflowY },
        input: {
          backgroundColor: inputStyle.backgroundColor,
          borderRadius: inputStyle.borderRadius,
          borderStyle: inputStyle.borderStyle,
          borderWidth: inputStyle.borderWidth,
          boxSizing: inputStyle.boxSizing,
          color: inputStyle.color,
          display: inputStyle.display,
          fontSize: inputStyle.fontSize,
          height: inputStyle.height,
          marginBottom: inputStyle.marginBottom,
          outlineStyle: inputStyle.outlineStyle,
          padding: inputStyle.padding,
          width: inputStyle.width,
        },
        result: {
          color: resultStyle.color,
          display: resultStyle.display,
          fontSize: resultStyle.fontSize,
          listStyleType: resultStyle.listStyleType,
          margin: resultStyle.margin,
          maxHeight: resultStyle.maxHeight,
          overflowX: resultStyle.overflowX,
          overflowY: resultStyle.overflowY,
          padding: resultStyle.padding,
          scrollbarBackground: scrollbar.backgroundColor,
          scrollbarHeight: scrollbar.height,
          scrollbarThumbBackground: thumb.backgroundColor,
          scrollbarWidth: scrollbar.width,
          textAlign: resultStyle.textAlign,
        },
      },
    };
  });
}

async function removeKnownLegacyShellClasses(shell: Locator) {
  await shell.evaluate((element) => {
    element.classList.remove("tab-pane", "myproject-list-wrap");
    const group = element.firstElementChild;
    group?.classList.remove("group");
    group?.querySelector("input")?.classList.remove("search-input", "project-search");
    group?.querySelector("span")?.classList.remove("bar");
    const inner = element.lastElementChild;
    inner?.classList.remove("tab-content");
    const result = inner?.firstElementChild;
    result?.classList.remove("tab-pane", "user-ul", "no-result", "active");
  });
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
