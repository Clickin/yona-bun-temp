import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OUTPUT = resolve("..", "output", "playwright");
const OWNER = "left-sidebar-favorite-nested-project-rows";

test.use({ locale: "en-US" });

test("left Favorite nested project rows use global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const start = route.indexOf("const leftSidebarFavoriteNestedProjectRowStyles");
  const end = route.indexOf("const authenticatedSidenavFavoriteProjectRowStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const owner = route.slice(start, end);
  for (const token of [
    "leftSidebarFavoriteNestedProjectText",
    "leftSidebarFavoriteNestedProjectAvatar",
    "leftSidebarFavoriteNestedProjectHoverSurface",
    "leftSidebarFavoriteNestedProjectStarIdle",
    "leftSidebarFavoriteNestedProjectStarActive",
    "leftSidebarFavoriteNestedProjectStarActiveHover",
    "leftSidebarFavoriteNestedProjectPopoverSurface",
    "leftSidebarFavoriteNestedProjectPopoverBorder",
    "leftSidebarFavoriteNestedProjectPopoverArrowBorder",
    "leftSidebarFavoriteNestedProjectPopoverShadow",
    "textOnAccent",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(owner).toContain(`homeColors.${token}`);
    } else {
      expect(owner).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(owner).not.toMatch(/#[\da-f]{3,8}|rgba?\(/i);
  expect(route).toContain(`"${OWNER}"`);
  expect(route).toContain('content={isLeftSidebarFavorite ? "" : overview}');
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`left Favorite nested project rows preserve ${viewport.label} parity and behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const interaction = await installHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const panel = page.locator("#left-sidebar-myOrganizationList");
    await expect(panel).not.toHaveClass(/user-project-list/);
    const ownToggle = panel.locator("[aria-expanded]").filter({ hasText: "admin" });
    const link = panel.getByRole("link", { includeHidden: true, name: /sample/ });
    const row = link.locator("xpath=ancestor::li[1]");
    await expect(link).toBeHidden();
    await ownToggle.click();
    await expect(link).toBeVisible();
    await expect(row).toHaveAttribute("data-stylex-owner", OWNER);

    const list = link.locator("..");
    const logo = link.locator(":scope > div").nth(0);
    const nameOwner = link.locator(":scope > div").nth(1);
    const name = nameOwner.locator(":scope > div");
    const star = list.getByRole("button", { name: /sample.*favorites/ });
    const panelBox = await panel.boundingBox();
    const rowBox = await row.boundingBox();
    const listBox = await list.boundingBox();
    const linkBox = await link.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(rowBox).not.toBeNull();
    expect(listBox).not.toBeNull();
    expect(linkBox).not.toBeNull();
    const evidence = await readEvidence(row, list, link, logo, nameOwner, name, star);
    expect(evidence.geometry).toMatchObject({
      link: { height: 18, left: 0, width: 241 },
      list: { height: 26, left: 0, width: 270 },
      logo: { left: 2, width: 48 },
      name: { height: 16, left: 50 },
      nameOwner: { left: 50, width: 191 },
      row: { height: 26, left: 0, width: 270 },
      star: { height: 16, left: 241, width: 29 },
    });
    expect(rowBox!.y).toBeGreaterThanOrEqual(panelBox!.y);
    expect(listBox!.y).toBe(rowBox!.y);
    expect(linkBox!.y - rowBox!.y).toBe(4);
    expect(rowBox!.x).toBe(panelBox!.x);
    expect(evidence.styles).toEqual({
      link: {
        color: "rgb(255, 255, 255)",
        display: "flex",
        fontSize: "14px",
        height: "18px",
        lineHeight: "16px",
        overflow: "hidden",
      },
      list: {
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        padding: "4px 0px",
        position: "relative",
      },
      name: {
        fontSize: "14px",
        maxWidth: "150px",
        minWidth: "50px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      row: { cursor: "pointer", lineHeight: "normal", marginLeft: "0px" },
      star: {
        color: "rgb(238, 238, 238)",
        fontFamily: '"Material Icons"',
        fontSize: "16px",
        height: "15px",
        lineHeight: "16px",
      },
    });
    expect(evidence.forbiddenClasses).toEqual([]);
    expect(evidence.pluginAttributes).toEqual([]);
    const overflowBeforeHover = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      sidebar: document.querySelector<HTMLElement>("#sidebar")?.scrollWidth ?? 0,
    }));
    await list.hover();
    await expect(list).toHaveCSS("background-color", "rgba(255, 255, 255, 0.15)");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    expect(
      await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        sidebar: document.querySelector<HTMLElement>("#sidebar")?.scrollWidth ?? 0,
      })),
    ).toEqual(overflowBeforeHover);
    mkdirSync(OUTPUT, { recursive: true });
    await page.screenshot({
      path: resolve(
        OUTPUT,
        `stylex-left-sidebar-favorite-nested-project-local-${viewport.label}.png`,
      ),
    });

    await page.mouse.move(viewport.width - 1, viewport.height - 1);
    await star.click();
    await expect(star).toBeDisabled();
    await expect(star).toHaveAttribute("data-stylex-owner-state", "pending-unstarred");
    await expect(ownToggle).toHaveAttribute("aria-expanded", "true");
    interaction.resolveFavorite({ favorited: true });
    await expect(star).toHaveAttribute("data-stylex-owner-state", "starred");
    expect(interaction.requests).toEqual([
      `${BASE_PATH}/api/v1/owners/admin/projects/sample/favorite`,
    ]);
    expect(await link.getAttribute("href")).toBe(`${BASE_PATH}/admin/sample`);

    await ownToggle.click();
    await expect(link).toBeHidden();
    await panel.getByPlaceholder("Type name").fill("sample");
    await expect(link).toBeVisible();
    await panel.getByPlaceholder("Type name").fill("missing");
    await expect(link).toBeHidden();
    await expect(page.locator(`#myOrganizationList [data-stylex-owner="${OWNER}"]`)).toHaveCount(0);
  });
}

async function readEvidence(
  row: Locator,
  list: Locator,
  link: Locator,
  logo: Locator,
  nameOwner: Locator,
  name: Locator,
  star: Locator,
) {
  return row.evaluate(
    (element, handles) => {
      const [listElement, linkElement, logoElement, nameOwnerElement, nameElement, starElement] =
        handles as HTMLElement[];
      const box = (target: Element) => {
        const rect = target.getBoundingClientRect();
        return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
      };
      const pick = (target: Element, keys: string[]) => {
        const style = getComputedStyle(target);
        return Object.fromEntries(
          keys.map((key) => [key, style[key as keyof CSSStyleDeclaration]]),
        );
      };
      const icon = starElement.querySelector("i")!;
      const forbidden = new Set([
        "user-li",
        "show-always",
        "hide",
        "project-list",
        "project-flex-container",
        "project-item",
        "project-item-container",
        "sidebar-project-link",
        "sidebar-row-link",
        "flex-item",
        "site-logo",
        "all-project-names",
        "project-avatar",
        "logo",
        "projectName-owner",
        "project-name",
        "star-project",
        "star",
        "starred",
        "material-icons",
        "popover",
        "right",
        "arrow",
        "popover-content",
      ]);
      return {
        forbiddenClasses: Array.from(element.querySelectorAll("*"), (node) =>
          Array.from(node.classList),
        )
          .flat()
          .filter((name) => forbidden.has(name)),
        geometry: {
          link: box(linkElement),
          list: box(listElement),
          logo: box(logoElement),
          name: box(nameElement),
          nameOwner: box(nameOwnerElement),
          row: box(element),
          star: box(starElement),
        },
        pluginAttributes: Array.from(
          element.querySelectorAll(
            "[data-toggle], [data-placement], [data-trigger], [data-content]",
          ),
          (node) => node.tagName,
        ),
        styles: {
          link: pick(linkElement, [
            "color",
            "display",
            "fontSize",
            "height",
            "lineHeight",
            "overflow",
          ]),
          list: pick(listElement, [
            "alignItems",
            "display",
            "flexDirection",
            "justifyContent",
            "padding",
            "position",
          ]),
          name: pick(nameElement, [
            "fontSize",
            "maxWidth",
            "minWidth",
            "overflow",
            "textOverflow",
            "whiteSpace",
          ]),
          row: pick(element, ["cursor", "lineHeight", "marginLeft"]),
          star: pick(icon, ["color", "fontFamily", "fontSize", "height", "lineHeight"]),
        },
      };
    },
    [
      await list.elementHandle(),
      await link.elementHandle(),
      await logo.elementHandle(),
      await nameOwner.elementHandle(),
      await name.elementHandle(),
      await star.elementHandle(),
    ],
  );
}

async function installHome(page: Page) {
  const requests: string[] = [];
  let resolveFavorite!: (value: object) => void;
  const favorite = new Promise<object>((resolve) => {
    resolveFavorite = resolve;
  });
  await page.addInitScript((basePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
    localStorage.setItem("sidebarActiveMenu", "myOrganizationList");
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
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
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      headers: { "x-csrf-token": "csrf-left-nested-row" },
      json: { isAnonymous: false },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({ json: { hasMore: false, items: [], total: 0 } }),
  );
  await page.route("**/api/v1/owners/*/projects/*/favorite", async (route) => {
    requests.push(new URL(route.request().url()).pathname);
    await route.fulfill({ json: await favorite });
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      json: {
        favoriteOrganizations: [
          {
            isFavorited: true,
            organizationId: 2,
            organizationName: "weblabs",
            projectCount: 1,
            projects: [
              { isFavorited: true, ownerName: "weblabs", projectId: 3, projectName: "web-project" },
            ],
          },
        ],
        favoriteProjects: [],
        organizations: [],
        ownProjects: [
          {
            isFavorited: false,
            overview: "Parity seed project for the admin workspace",
            ownerName: "admin",
            projectId: 1,
            projectName: "sample",
          },
        ],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [],
        issueItems: [],
      },
    }),
  );
  return { requests, resolveFavorite };
}
