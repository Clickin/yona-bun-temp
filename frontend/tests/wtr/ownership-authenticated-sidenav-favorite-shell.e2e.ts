import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated side-nav Favorite shell uses the global theme color boundary", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

  expect(routeSource).toContain('"authenticated-sidenav-favorite-shell"');
});

for (const state of ["populated", "empty"] as const) {
  for (const viewport of [
    { label: "desktop", width: 1366, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ]) {
    test(`authenticated Favorite ${state} shell preserves ${viewport.label} styles and geometry`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await installAuthenticatedHome(page, state);
      await page.goto(`${BASE_PATH}/`);
      await page.evaluate(() => document.fonts.ready);
      await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
      // F5 dist-truth: the shell slides open with a 0.5s width transition
      // (rootSidebarMotionStyles.shell); pseudo-element geometry only matches
      // the settled layout, so wait it out (favorite-stars precedent waits 600ms).
      await page.waitForTimeout(600);

      const root = page.locator('[data-owner="authenticated-sidenav-favorite-shell"]');
      const input = root.getByRole("textbox");
      const group = input.locator("..");
      const bar = input.locator("xpath=following-sibling::*[1]");
      const result = root.locator(":scope > #organizations");
      await expect(root).toBeVisible();
      await expect(input).toHaveAttribute("placeholder", "Type name");

      const base = await readShellEvidence(root, group, input, bar, result);
      console.log(
        `authenticated-sidenav-favorite-shell-${state}-${viewport.label}`,
        JSON.stringify(base),
      );
      await saveScreenshot(
        page,
        `style-authenticated-sidenav-favorite-shell-${state}-${viewport.label}-${base.hasOwner ? "after" : "before"}.png`,
      );

      expect(base.hasOwner).toBe(true);
      expect(base.pluginAttributes).toEqual([]);
      expect(base.childClasses).toEqual(["group", state === "empty" ? "no-result" : "user-ul"]);
      expect(base.groupStyles.position).toBe("relative");
      expect(base.inputStyles).toMatchObject({
        borderBottomStyle: "none",
        borderBottomWidth: "0px",
        borderLeftStyle: "none",
        borderLeftWidth: "0px",
        borderRadius: "0px",
        borderRightStyle: "none",
        borderRightWidth: "0px",
        borderTopStyle: "none",
        borderTopWidth: "0px",
        boxSizing: "content-box",
        display: "block",
        fontSize: viewport.label === "mobile" ? "16px" : "14px",
        height: "34px",
        marginBottom: "0px",
      });
      expect(Number.parseFloat(base.inputStyles.width)).toBeCloseTo(
        base.geometry.root.width * 0.99,
        1,
      );
      expect(base.barStyles).toEqual({ display: "block", position: "relative" });
      expect(base.barPseudoStyles).toEqual({
        after: {
          backgroundColor: "rgb(233, 30, 99)",
          bottom: "1px",
          height: "1px",
          position: "absolute",
          right: `${base.geometry.root.width / 2}px`,
          transitionDuration: "0.2s",
          width: "0px",
        },
        before: {
          backgroundColor: "rgb(233, 30, 99)",
          bottom: "1px",
          height: "1px",
          left: `${base.geometry.root.width / 2}px`,
          position: "absolute",
          transitionDuration: "0.2s",
          width: "0px",
        },
      });
      expect(base.resultStyles).toMatchObject({
        listStyleType: "none",
        marginBottom: state === "empty" ? "25px" : "10px",
        marginLeft: "0px",
        marginRight: "0px",
        overflowX: "auto",
        overflowY: "auto",
        paddingBottom: "0px",
        paddingLeft: "0px",
        paddingRight: "0px",
        paddingTop: "0px",
      });
      expect(base.resultStyles.maxHeight).toBe(`${viewport.height * 0.8}px`);
      expect(base.scrollbarStyles).toEqual({
        scrollbar: {
          backgroundColor: "rgb(211, 211, 211)",
          height: "10px",
          width: "5px",
        },
        thumb: { backgroundColor: "rgb(39, 136, 186)" },
      });
      expect(base.geometry.group.left).toBe(base.geometry.root.left);
      expect(base.geometry.group.right).toBe(base.geometry.root.right);
      expect(base.geometry.input.left).toBe(base.geometry.group.left);
      expect(base.geometry.bar.left).toBe(base.geometry.group.left);
      expect(base.geometry.bar.right).toBe(base.geometry.group.right);
      expect(base.geometry.result.left).toBe(base.geometry.root.left);
      expect(base.geometry.result.right).toBe(base.geometry.root.right);
      expect(base.geometry.result.top).toBe(
        base.geometry.group.bottom + (state === "empty" ? 10 : 0),
      );
      expect(base.geometry.root.right).toBeLessThanOrEqual(base.geometry.panel.right);
      expect(base.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

      if (state === "populated") {
        expect(base.resultStyles.marginTop).toBe("0px");
        expect(base.resultStyles.color).not.toBe("rgb(199, 21, 133)");
        const copyOrder = ["admin", "weblabs", "example", "direct-favorite"].map((copy) =>
          base.visibleText.indexOf(copy),
        );
        expect(copyOrder.every((index) => index >= 0)).toBe(true);
        expect(copyOrder).toEqual([...copyOrder].sort((left, right) => left - right));
        await input.fill("direct");
        await expect(root.getByText("direct-favorite", { exact: true })).toBeVisible();
        await expect(root.getByText("weblabs", { exact: true })).toBeHidden();
        await page.getByRole("button", { name: "Project", exact: true }).click();
        await expect(page.locator("#myProjectList .project-search")).toHaveValue("direct");
        await page.getByRole("button", { name: "Favorite", exact: true }).click();
        await input.fill("");
      } else {
        expect(base.resultStyles).toMatchObject({
          color: "rgb(199, 21, 133)",
          fontSize: "16px",
          marginTop: "10px",
          textAlign: "center",
        });
        await expect(result).toHaveText("No results");
      }

      await input.focus();
      await expect
        .poll(() =>
          bar.evaluate((element) => Number.parseFloat(getComputedStyle(element, "::before").width)),
        )
        .toBe(base.geometry.root.width / 2);
      const focused = await input.evaluate((element) => {
        const style = getComputedStyle(element);
        const bar = element.nextElementSibling;
        if (!bar) throw new Error("Favorite search bar is missing");
        return {
          borderStyle: style.borderStyle,
          outlineStyle: style.outlineStyle,
          pseudoAfterWidth: getComputedStyle(bar, "::after").width,
          pseudoBeforeWidth: getComputedStyle(bar, "::before").width,
        };
      });
      expect(focused.borderStyle).toBe("none");
      expect(focused.outlineStyle).toBe("none");
      expect(Number.parseFloat(focused.pseudoBeforeWidth)).toBeGreaterThan(0);
      expect(Number.parseFloat(focused.pseudoAfterWidth)).toBeGreaterThan(0);
      expect(Number.parseFloat(focused.pseudoBeforeWidth)).toBe(base.geometry.root.width / 2);
      expect(Number.parseFloat(focused.pseudoAfterWidth)).toBe(base.geometry.root.width / 2);

      const beforeLegacyClassRemoval = await readShellEvidence(root, group, input, bar, result);
      await removeKnownLegacyClasses(root, group, input, bar, result, state);
      const afterLegacyClassRemoval = await readShellEvidence(root, group, input, bar, result);
      expect(afterLegacyClassRemoval.hasOwner).toBe(true);
      expect(afterLegacyClassRemoval.groupStyles).toEqual(beforeLegacyClassRemoval.groupStyles);
      expect(afterLegacyClassRemoval.inputStyles).toEqual(beforeLegacyClassRemoval.inputStyles);
      expect(afterLegacyClassRemoval.barStyles).toEqual(beforeLegacyClassRemoval.barStyles);
      expect(afterLegacyClassRemoval.barPseudoStyles).toEqual(
        beforeLegacyClassRemoval.barPseudoStyles,
      );
      expect(afterLegacyClassRemoval.resultStyles).toEqual(beforeLegacyClassRemoval.resultStyles);
      expect(afterLegacyClassRemoval.scrollbarStyles).toEqual(
        beforeLegacyClassRemoval.scrollbarStyles,
      );
      expect(afterLegacyClassRemoval.geometry).toEqual(beforeLegacyClassRemoval.geometry);
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
        avatarUrl: "/legacy-assets/images/default-avatar-34.png",
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
      json:
        state === "empty"
          ? {
              favoriteOrganizations: [],
              favoriteProjects: [],
              organizations: [],
              ownProjects: [],
              profile: { loginId: "admin" },
              recentIssues: [],
            }
          : {
              favoriteOrganizations: [
                {
                  isFavorited: true,
                  organizationId: 11,
                  organizationName: "weblabs",
                  projectCount: 1,
                  projects: [],
                },
              ],
              favoriteProjects: [
                {
                  isFavorited: true,
                  ownerName: "outsider",
                  projectId: 41,
                  projectName: "direct-favorite",
                },
              ],
              organizations: [
                { organizationId: 11, organizationName: "weblabs", projects: [] },
                { organizationId: 12, organizationName: "example", projects: [] },
              ],
              ownProjects: [
                {
                  isFavorited: false,
                  ownerName: "admin",
                  projectId: 31,
                  projectName: "own-project",
                },
              ],
              profile: { loginId: "admin" },
              recentIssues: [],
            },
    }),
  );
}

async function readShellEvidence(
  root: Locator,
  group: Locator,
  input: Locator,
  bar: Locator,
  result: Locator,
) {
  return root.evaluate(
    (element, targets) => {
      const [groupElement, inputElement, barElement, resultElement] = targets as HTMLElement[];
      const panel = element.closest('[data-owner="authenticated-sidenav-tab-panel"]');
      if (!panel) throw new Error("Favorite shell is outside the authenticated tab panel");
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
      const groupStyle = getComputedStyle(groupElement);
      const inputStyle = getComputedStyle(inputElement);
      const barStyle = getComputedStyle(barElement);
      const resultStyle = getComputedStyle(resultElement);
      const pseudoStyle = (pseudo: "::before" | "::after") => {
        const style = getComputedStyle(barElement, pseudo);
        return {
          backgroundColor: style.backgroundColor,
          bottom: style.bottom,
          height: style.height,
          ...(pseudo === "::before" ? { left: style.left } : { right: style.right }),
          position: style.position,
          transitionDuration: style.transitionDuration,
          width: style.width,
        };
      };
      const scrollbarStyle = getComputedStyle(resultElement, "::-webkit-scrollbar");
      const scrollbarThumbStyle = getComputedStyle(resultElement, "::-webkit-scrollbar-thumb");
      return {
        barStyles: { display: barStyle.display, position: barStyle.position },
        barPseudoStyles: { after: pseudoStyle("::after"), before: pseudoStyle("::before") },
        childClasses: Array.from(element.children, (child) =>
          child === groupElement
            ? "group"
            : child.classList.contains("no-result")
              ? "no-result"
              : "user-ul",
        ),
        geometry: {
          bar: box(barElement),
          group: box(groupElement),
          input: box(inputElement),
          panel: box(panel),
          result: box(resultElement),
          root: box(element),
        },
        groupStyles: { position: groupStyle.position },
        hasOwner: element.getAttribute("data-owner") === "authenticated-sidenav-favorite-shell",
        inputStyles: {
          borderBottomStyle: inputStyle.borderBottomStyle,
          borderBottomWidth: inputStyle.borderBottomWidth,
          borderLeftStyle: inputStyle.borderLeftStyle,
          borderLeftWidth: inputStyle.borderLeftWidth,
          borderRadius: inputStyle.borderRadius,
          borderRightStyle: inputStyle.borderRightStyle,
          borderRightWidth: inputStyle.borderRightWidth,
          borderTopStyle: inputStyle.borderTopStyle,
          borderTopWidth: inputStyle.borderTopWidth,
          boxSizing: inputStyle.boxSizing,
          display: inputStyle.display,
          fontSize: inputStyle.fontSize,
          height: inputStyle.height,
          marginBottom: inputStyle.marginBottom,
          width: inputStyle.width,
        },
        pluginAttributes: Array.from(
          element.querySelectorAll(
            "[data-toggle], [data-target], [data-action], [data-href], [data-url], [data-request-method]",
          ),
          (node) => node.tagName.toLowerCase(),
        ),
        resultStyles: {
          color: resultStyle.color,
          fontSize: resultStyle.fontSize,
          listStyleType: resultStyle.listStyleType,
          marginBottom: resultStyle.marginBottom,
          marginLeft: resultStyle.marginLeft,
          marginRight: resultStyle.marginRight,
          marginTop: resultStyle.marginTop,
          maxHeight: resultStyle.maxHeight,
          overflowX: resultStyle.overflowX,
          overflowY: resultStyle.overflowY,
          paddingBottom: resultStyle.paddingBottom,
          paddingLeft: resultStyle.paddingLeft,
          paddingRight: resultStyle.paddingRight,
          paddingTop: resultStyle.paddingTop,
          textAlign: resultStyle.textAlign,
        },
        scrollbarStyles: {
          scrollbar: {
            backgroundColor: scrollbarStyle.backgroundColor,
            height: scrollbarStyle.height,
            width: scrollbarStyle.width,
          },
          thumb: { backgroundColor: scrollbarThumbStyle.backgroundColor },
        },
        viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
        visibleText: resultElement.innerText,
      };
    },
    [
      await group.elementHandle(),
      await input.elementHandle(),
      await bar.elementHandle(),
      await result.elementHandle(),
    ],
  );
}

async function removeKnownLegacyClasses(
  root: Locator,
  group: Locator,
  input: Locator,
  bar: Locator,
  result: Locator,
  state: "populated" | "empty",
) {
  await root.evaluate(
    (element, targets) => {
      element.classList.remove("search-result");
      const [groupElement, inputElement, barElement, resultElement, empty] = targets as [
        HTMLElement,
        HTMLElement,
        HTMLElement,
        HTMLElement,
        boolean,
      ];
      groupElement.classList.remove("group");
      inputElement.classList.remove("search-input", "org-search");
      barElement.classList.remove("bar");
      resultElement.classList.remove("user-ul");
      if (empty) resultElement.classList.remove("no-result");
    },
    [
      await group.elementHandle(),
      await input.elementHandle(),
      await bar.elementHandle(),
      await result.elementHandle(),
      state === "empty",
    ],
  );
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
