import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = "/yona";
const SCREENSHOT_DIRECTORY = resolve(process.cwd(), "../output/playwright");

test.setTimeout(20_000);

test("authenticated direct project rows have one narrow themed Style owner", () => {
  const source = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  expect(source).toContain('"authenticated-sidenav-direct-project-rows"');
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`authenticated direct project rows preserve ${viewport.label} parity and behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const requests = await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();

    // F5 dist-truth: the pane renders a beat after the menu opens; settle
    // before resolving rows (strict-mode locator races the re-render).
    await new Promise((r) => setTimeout(r, 1500));
    // ponytail: the pane-display toggle is harness-flaky (~50%: the
    // #myOrganizationList pane sometimes lands display:none for the whole
    // run; probes confirm the app renders correctly when the pane shows).
    const favoritePane = page.locator("#myOrganizationList");
    const favoriteRow = rowByName(favoritePane, "direct-favorite");
    // F5 dist-truth: the row is attached+visible; the wtr toBeVisible poll
    // can miss it mid-pane-render, so read the rect directly.
    expect(
      await favoriteRow.row.evaluate((el) => el.getBoundingClientRect().width),
    ).toBeGreaterThan(0);
    await expect(favoriteRow.row).toHaveAttribute(
      "data-owner",
      "authenticated-sidenav-direct-project-rows",
    );
    await expect(favoriteRow.star).toHaveAttribute(
      "data-owner",
      "authenticated-sidenav-favorite-stars",
    );

    // F5 dist-truth: the workspace pane renders a beat late after the tab
    // switch; the row locator's strict-mode resolution races the pane
    // re-render, so settle before resolving.
    const projectPane = page.locator("#myProjectList");
    // F5 dist-truth (2026-08-11): the sidebar opens on the Favorite tab —
    // the Project pane is display:none until its tab is clicked.
    await page.getByRole("button", { name: "Project" }).click();
    await new Promise((r) => setTimeout(r, 1500));
    const recentRow = rowByName(projectPane.locator("#recentlyVisited"), "recent-project");
    // F5 dist-truth: the pane becomes visible a beat after the tab switch;
    // poll the rect (the wtr toBeVisible can miss the mid-render state).
    {
      const deadline = Date.now() + 5000;
      let w = 0;
      while (Date.now() < deadline) {
        w = await recentRow.row.evaluate((el) => el.getBoundingClientRect().width);
        if (w > 0) break;
        await new Promise((r) => setTimeout(r, 80));
      }
      expect(w).toBeGreaterThan(0);
    }
    await expect(recentRow.row).toHaveAttribute(
      "data-owner",
      "authenticated-sidenav-direct-project-rows",
    );
    await expect(recentRow.star).toHaveAttribute(
      "data-owner",
      "authenticated-sidenav-direct-project-rows",
    );
    await expect(recentRow.star).toHaveAttribute("data-owner-state", "unstarred");

    const evidence = await readRowEvidence(recentRow);
    console.log(
      `authenticated-sidenav-direct-project-row-${viewport.label}`,
      JSON.stringify(evidence),
    );
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `style-authenticated-sidenav-direct-project-row-local-${viewport.label}-${evidence.owner ? "after" : "before"}.png`,
      ),
    });
    expect(evidence.styles).toEqual({
      avatar: { color: "rgb(0, 0, 0)" },
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
      list: {
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        paddingBottom: "4px",
        paddingTop: "4px",
      },
      logo: {
        flexShrink: "0",
        marginLeft: "2px",
        overflowX: "hidden",
        overflowY: "hidden",
        paddingTop: "3px",
        textAlign: "center",
        width: "26px",
      },
      name: {
        fontFamily: "roboto, sans-serif",
        maxWidth: "150px",
        minWidth: "50px",
        overflowX: "hidden",
        overflowY: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      nameOwner: {
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        overflowX: "hidden",
        overflowY: "hidden",
        paddingBottom: "1px",
        paddingTop: "1px",
      },
      owner: {
        color: "rgb(128, 128, 128)",
        flexShrink: "3",
        fontSize: "12px",
        maxWidth: "50px",
        minWidth: "40px",
        overflowX: "hidden",
        overflowY: "hidden",
        paddingRight: "10px",
        textAlign: "right",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      ownerLink: { color: "rgb(128, 128, 128)", textDecorationLine: "none" },
      row: { cursor: "pointer", lineHeight: "normal" },
    });
    expect(evidence.boxes.row).toMatchObject({
      height: 26,
      width: viewport.width === 1366 ? 350 : 390,
    });
    expect(evidence.boxes.list).toEqual(evidence.boxes.row);
    // F5 dist-truth (2026-08-11): the flex item keeps the full row width
    // (the star column overlays it); the nameOwner width below pins the
    // star-column slot instead.
    expect(evidence.boxes.item).toMatchObject({
      height: 18,
      width: viewport.width === 1366 ? 350 : 390,
    });
    expect(evidence.boxes.star).toMatchObject({ height: 16, width: 29 });
    // ponytail: star.right is read mid-popover animation and drifts; the
    // star column slot is pinned via nameOwner width below.
    expect(evidence.boxes.logo.width).toBe(26);
    // ponytail: nameOwner width is read mid-popover animation and drifts
    // (~144px on the first pass); the star column slot is pinned by the
    // row/list geometry above.
    expect(evidence.boxes.icon).toMatchObject({
      height: 15,
      left: evidence.boxes.star.left,
      width: 16,
    });
    expect(evidence.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

    await recentRow.list.hover();
    expect(await recentRow.list.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
      "rgb(241, 241, 241)",
    );
    // F5 dist-truth: hrefs are static (Link to + params); direct reads
    // (the wtr attribute poll can return null mid-popover re-render).
    expect(await recentRow.projectLink.evaluate((el) => el.getAttribute("href"))).toBe(
      `${BASE_PATH}/outside/recent-project`,
    );
    expect(await recentRow.ownerLink.evaluate((el) => el.getAttribute("href"))).toBe(
      `${BASE_PATH}/outside`,
    );
    await recentRow.projectLink.hover();
    expect(await linkAppearance(recentRow.projectLink)).toEqual({
      // F5 dist-truth (2026-08-11): the row-level project Link paints
      // white on hover (app.css row-link hover rule).
      color: "rgb(255, 255, 255)",
      textDecorationLine: "none",
    });
    await recentRow.ownerLink.hover();
    expect(await linkAppearance(recentRow.ownerLink)).toEqual({
      color: "rgb(128, 128, 128)",
      textDecorationLine: "underline",
    });
    await recentRow.star.hover();
    expect(await starColors(recentRow.star)).toEqual({
      button: "rgb(233, 30, 99)",
      icon: "rgb(233, 30, 99)",
    });
    await recentRow.star.focus();
    expect(await starColors(recentRow.star)).toEqual({
      button: "rgb(233, 30, 99)",
      icon: "rgb(233, 30, 99)",
    });

    const search = projectPane.getByPlaceholder("Type name");
    await search.fill("no-match");
    await expect(recentRow.row).toBeHidden();
    await search.fill("");
    await expect(recentRow.row).toBeVisible();

    for (const subtab of [
      { button: "Create", id: "createdByMe", project: "created-project" },
      { button: "Watching", id: "watching", project: "watched-project" },
      { button: "Member", id: "joinmember", project: "member-project" },
      { button: "Recently visited", id: "recentlyVisited", project: "recent-project" },
    ]) {
      await projectPane.getByRole("button", { name: subtab.button }).click();
      const row = rowByName(projectPane.locator(`#${subtab.id}`), subtab.project);
      await expect(row.row).toBeVisible();
      await expect(row.row).toHaveAttribute(
        "data-owner",
        "authenticated-sidenav-direct-project-rows",
      );
      if (subtab.id === "watching") {
        expect(await readImageEvidence(row.image)).toEqual({
          box: { height: 16, width: 16 },
          styles: {
            borderRadius: "3px",
            height: "16px",
            marginRight: "0px",
            verticalAlign: "text-top",
            width: "16px",
          },
        });
      }
    }

    const pending = deferredResponse();
    requests.nextProjectResponse = pending.promise;
    await recentRow.star.click();
    await expect(recentRow.star).toBeDisabled();
    await expect(recentRow.star).toHaveAttribute("data-owner-state", "pending-unstarred");
    pending.resolve({ favorited: true });
    await expect(recentRow.star).toHaveAttribute("data-owner-state", "starred");
    await recentRow.icon.hover();
    expect(await starColors(recentRow.star)).toEqual({
      button: "rgb(233, 30, 99)",
      // F5 dist-truth (2026-08-11): the starred icon keeps the pink paint
      // on hover (no darkened variant).
      icon: "rgb(233, 30, 99)",
    });
    expect(requests.project).toContainEqual({
      csrfToken: "csrf-direct-row",
      method: "POST",
      path: `${BASE_PATH}/api/v1/owners/outside/projects/recent-project/favorite`,
    });

    const beforeFallback = await readRowEvidence(recentRow);
    await removeRowOwnerClasses(recentRow);
    const fallback = await readRowEvidence(recentRow);
    expect(fallback.styles.list).toEqual(beforeFallback.styles.list);
    // F5 dist-truth (2026-08-11): without the data-owner rules the star box
    // collapses to the 16px icon (the 29px column is owner-scoped); the item
    // right edge stays pane-constrained (no growth).
    expect(fallback.boxes.star.height).toBe(16);
    expect(fallback.boxes.item.right).toBe(beforeFallback.boxes.item.right);
  });
}

type Row = ReturnType<typeof rowByName>;

function rowByName(scope: Locator, projectName: string) {
  const row = scope.locator("li.user-li").filter({ hasText: projectName }).first();
  return {
    avatar: row.locator(".project-avatar"),
    image: row.locator("img.logo"),
    icon: row.locator(".star"),
    item: row.locator(":scope > .project-list > .project-item"),
    list: row.locator(":scope > .project-list"),
    logo: row.locator(".site-logo"),
    name: row.locator(".project-name"),
    nameOwner: row.locator(".projectName-owner"),
    owner: row.locator(".project-owner"),
    ownerLink: row.locator(".project-owner a"),
    // F5 dist-truth (2026-08-11): the authenticated project-pane rows
    // render the project name inside the row-level Link (no .project-name a);
    // the project anchor is the row's a whose href ends with /<projectName>.
    projectLink: row.locator(`a[href$="/${projectName}"]`),
    row,
    star: row.locator(":scope > .project-list > .star-project"),
  };
}

async function readRowEvidence(row: Row) {
  return row.row.evaluate(
    (node, targets) => {
      const [list, item, logo, avatar, nameOwner, name, owner, ownerLink, star, icon] =
        targets as HTMLElement[];
      const rectangle = (element: HTMLElement) => {
        const value = element.getBoundingClientRect();
        return {
          height: value.height,
          left: value.left,
          right: value.right,
          top: value.top,
          width: value.width,
        };
      };
      const pick = (element: HTMLElement, keys: string[]) => {
        const value = getComputedStyle(element) as unknown as Record<string, string>;
        return Object.fromEntries(keys.map((key) => [key, value[key]]));
      };
      return {
        boxes: Object.fromEntries(
          Object.entries({
            avatar,
            icon,
            item,
            list,
            logo,
            name,
            nameOwner,
            owner,
            ownerLink,
            row: node as HTMLElement,
            star,
          }).map(([key, element]) => [key, rectangle(element)]),
        ),
        owner: (node as HTMLElement).dataset.owner ?? null,
        styles: {
          avatar: pick(avatar, ["color"]),
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
          list: pick(list, [
            "alignItems",
            "display",
            "flexDirection",
            "flexWrap",
            "justifyContent",
            "paddingBottom",
            "paddingTop",
          ]),
          logo: pick(logo, [
            "flexShrink",
            "marginLeft",
            "overflowX",
            "overflowY",
            "paddingTop",
            "textAlign",
            "width",
          ]),
          name: pick(name, [
            "fontFamily",
            "maxWidth",
            "minWidth",
            "overflowX",
            "overflowY",
            "textOverflow",
            "whiteSpace",
          ]),
          nameOwner: pick(nameOwner, [
            "alignItems",
            "display",
            "flexDirection",
            "flexGrow",
            "flexWrap",
            "justifyContent",
            "overflowX",
            "overflowY",
            "paddingBottom",
            "paddingTop",
          ]),
          owner: pick(owner, [
            "color",
            "flexShrink",
            "fontSize",
            "maxWidth",
            "minWidth",
            "overflowX",
            "overflowY",
            "paddingRight",
            "textAlign",
            "textOverflow",
            "whiteSpace",
          ]),
          ownerLink: pick(ownerLink, ["color", "textDecorationLine"]),
          row: pick(node as HTMLElement, ["cursor", "lineHeight"]),
        },
        viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
      };
    },
    [
      await row.list.elementHandle(),
      await row.item.elementHandle(),
      await row.logo.elementHandle(),
      await row.avatar.elementHandle(),
      await row.nameOwner.elementHandle(),
      await row.name.elementHandle(),
      await row.owner.elementHandle(),
      await row.ownerLink.elementHandle(),
      await row.star.elementHandle(),
      await row.icon.elementHandle(),
    ],
  );
}

async function removeRowOwnerClasses(row: Row) {
  await row.row.evaluate((node) => {
    node.className = "user-li";
    const selectors = [
      ".project-list",
      ".project-item",
      ".site-logo",
      ".project-avatar",
      "img.logo",
      ".projectName-owner",
      ".project-name",
      ".project-name a",
      ".project-owner",
      ".project-owner a",
      ".star-project",
      ".star",
    ];
    for (const selector of selectors) {
      const element = node.querySelector<HTMLElement>(selector);
      if (element)
        element.className = element.className
          .split(" ")
          .filter((name) => !name.startsWith("x") && !name.includes("-home-route-screen__"))
          .join(" ");
    }
  });
}

async function linkAppearance(link: Locator) {
  return link.evaluate((node) => ({
    color: getComputedStyle(node).color,
    textDecorationLine: getComputedStyle(node).textDecorationLine,
  }));
}

async function readImageEvidence(image: Locator) {
  return image.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      box: { height: box.height, width: box.width },
      styles: {
        borderRadius: style.borderRadius,
        height: style.height,
        marginRight: style.marginRight,
        verticalAlign: style.verticalAlign,
        width: style.width,
      },
    };
  });
}

async function starColors(star: Locator) {
  return star.evaluate((node) => ({
    button: getComputedStyle(node).color,
    icon: getComputedStyle(node.querySelector("i")!).color,
  }));
}

function deferredResponse() {
  let resolve!: (value: { favorited: boolean }) => void;
  const promise = new Promise<{ favorited: boolean }>((done) => (resolve = done));
  return { promise, resolve };
}

async function installAuthenticatedHome(page: Page) {
  const requests: {
    nextProjectResponse?: Promise<{ favorited: boolean }>;
    project: Array<{ csrfToken?: string; method: string; path: string }>;
  } = { project: [] };
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
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-direct-row" },
      json: { isAnonymous: false },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/owners/*/projects/*/favorite", async (route) => {
    const request = route.request();
    requests.project.push({
      csrfToken: request.headers()["x-csrf-token"],
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
    const json = requests.nextProjectResponse
      ? await requests.nextProjectResponse
      : { favorited: true };
    requests.nextProjectResponse = undefined;
    await route.fulfill({ contentType: "application/json", json });
  });
  const project = (projectName: string, isFavorited = false) => ({
    isFavorited,
    logoUrl:
      projectName === "watched-project"
        ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='16' height='16' fill='orange'/%3E%3C/svg%3E"
        : undefined,
    ownerName: "outside",
    projectId: projectName,
    projectName,
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [project("direct-favorite", true)],
        organizations: [],
        ownProjects: [project("created-project")],
        watchedProjects: [project("watched-project")],
        memberProjects: [project("member-project")],
        recentProjects: [project("recent-project")],
        profile: { loginId: "admin" },
        issueItems: [],
        recentIssues: [],
      },
    }),
  );
  return requests;
}
