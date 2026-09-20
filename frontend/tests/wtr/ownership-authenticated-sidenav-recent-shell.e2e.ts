import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

for (const state of ["populated", "empty"] as const) {
  for (const viewport of [
    { height: 900, label: "desktop", width: 1366, shellWidth: 350, x: 1015 },
    { height: 844, label: "mobile", width: 390, shellWidth: 390, x: 9 },
  ]) {
    test(`authenticated Recent History ${state} shell preserves ${viewport.label} parity and behavior`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await installAuthenticatedHome(page, state);
      await page.goto(`${BASE_PATH}/`);
      await page.evaluate(() => document.fonts.ready);
      await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
      await page.getByRole("button", { name: "Recent History", exact: true }).click();

      const shell = page.locator(
        '#myRecentIssueList [data-owner="authenticated-sidenav-recent-shell"]',
      );
      const input = shell.getByRole("textbox", { name: "Type name" });
      const result = shell.locator("#recentlyVisitedIssues");
      await expect(shell).toBeVisible();
      // Wait for the actual width transition, not one accidentally stable sample.
      await page.locator("#mySidenav").evaluate(async (element) => {
        element.getBoundingClientRect();
        await Promise.all(element.getAnimations().map((animation) => animation.finished));
      });
      const initial = await readEvidence(shell);
      console.log(
        `authenticated-sidenav-recent-shell-${state}-${viewport.label}`,
        JSON.stringify(initial),
      );
      await saveScreenshot(
        page,
        `style-authenticated-sidenav-recent-shell-${state}-${viewport.label}-${initial.hasOwner ? "after" : "before"}.png`,
      );

      expect(initial.hasOwner).toBe(true);
      expect(initial.pluginAttributes).toEqual([]);
      expect(initial.geometry.root).toMatchObject({
        height: state === "populated" ? 106 : 95,
        // Legacy overflow-hidden sidenavs can still scroll horizontally on focus.
        left:
          viewport.x -
          initial.viewport.scrollbarGutter -
          initial.viewport.scrollX -
          initial.viewport.sidenavScrollLeft,
        width: viewport.shellWidth,
      });
      expect(initial.geometry.group).toMatchObject({ height: 42, width: viewport.shellWidth });
      expect(initial.geometry.input).toMatchObject({
        height: 42,
        width: viewport.label === "desktop" ? 358.5 : 398.09375,
      });
      expect(initial.geometry.inner).toMatchObject({
        height: state === "populated" ? 64 : 53,
        width: viewport.shellWidth,
      });
      expect(initial.geometry.result).toMatchObject({
        height: state === "populated" ? 54 : 18,
        width: viewport.shellWidth,
      });
      expect(initial.geometry.group.bottom).toBe(initial.geometry.inner.top);
      expect(initial.styles.groupPosition).toBe("relative");
      expect(initial.styles.input).toEqual({
        borderRadius: "0px",
        borderStyle: "none",
        borderWidth: "0px",
        boxSizing: "content-box",
        display: "block",
        fontSize: viewport.label === "desktop" ? "14px" : "16px",
        height: "34px",
        marginBottom: "0px",
        outlineStyle: "none",
        padding: "4px 6px",
        width: viewport.label === "desktop" ? "346.5px" : "386.094px",
      });
      expect(initial.styles.bar).toEqual({ display: "block", position: "relative" });
      expect(initial.styles.before).toEqual({
        backgroundColor: "rgb(233, 30, 99)",
        bottom: "1px",
        height: "1px",
        left: `${viewport.shellWidth / 2}px`,
        position: "absolute",
        transitionDuration: "0.2s",
        width: "0px",
      });
      expect(initial.styles.after).toEqual({
        backgroundColor: "rgb(233, 30, 99)",
        bottom: "1px",
        height: "1px",
        position: "absolute",
        right: `${viewport.shellWidth / 2}px`,
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
          await expect(row).toHaveAttribute(
            "data-owner",
            "authenticated-sidenav-recent-issue-rows",
          );
        }
        await input.fill("needle");
        await expect(result.locator(":scope > li.user-li")).toHaveCount(1);
        await expect(result).toContainText("needle issue");
        await expect(result).not.toContainText("other issue");
        await page.getByRole("button", { name: "Project", exact: true }).click();
        await expect(page.locator("#myProjectList .project-search")).toHaveValue("needle");
        await page.getByRole("button", { name: "Recent History", exact: true }).click();
        await expect(input).toHaveValue("needle");
        await input.fill("");
      }

      await input.focus();
      await expect
        .poll(() =>
          shell.evaluate((element) =>
            Number.parseFloat(getComputedStyle(element.querySelector(".bar")!, "::before").width),
          ),
        )
        .toBe(viewport.shellWidth / 2);
      const focused = await readEvidence(shell);
      expect(focused.styles.before.width).toBe(`${viewport.shellWidth / 2}px`);
      expect(focused.styles.after.width).toBe(`${viewport.shellWidth / 2}px`);
      expect(
        focused.geometry.root.left +
          focused.viewport.scrollbarGutter +
          focused.viewport.scrollX +
          focused.viewport.sidenavScrollLeft,
      ).toBe(viewport.x);
    });
  }
}

async function installAuthenticatedHome(page: Page, state: "populated" | "empty") {
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
    const sidenav = element.closest("#mySidenav");
    if (!group || !input || !bar || !inner || !result || !sidenav) {
      throw new Error("Authenticated Recent History shell is incomplete");
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
      viewport: {
        scrollbarGutter: window.innerWidth - document.documentElement.clientWidth,
        scrollX: window.scrollX,
        sidenavScrollLeft: sidenav.scrollLeft,
      },
      geometry: {
        group: box(group),
        inner: box(inner),
        input: box(input),
        result: box(result),
        root: box(element),
      },
      hasOwner: element.getAttribute("data-owner") === "authenticated-sidenav-recent-shell",
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
          borderRadius: inputStyle.borderRadius,
          borderStyle: inputStyle.borderStyle,
          borderWidth: inputStyle.borderWidth,
          boxSizing: inputStyle.boxSizing,
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

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
