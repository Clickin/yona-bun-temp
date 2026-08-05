import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = "/yona";
const SCREENSHOT_DIRECTORY = resolve(process.cwd(), "../output/playwright");
const ROUTE_SOURCE = resolve(process.cwd(), "src/routes/-home-route-screen.tsx");

test.setTimeout(20_000);

test("authenticated Favorite nested project rows have narrow themed StyleX ownership", () => {
  const source = readFileSync(ROUTE_SOURCE, "utf8");
  const ownerSource = source.match(
    /const authenticatedSidenavFavoriteProjectRowStyles = stylex\.create\([\s\S]*?\n\}\);/,
  )?.[0];

  expect(ownerSource).toBeDefined();
  expect(ownerSource).toContain("homeColors.sidenavText");
  expect(ownerSource).toContain("homeColors.sidenavOrganizationHoverSurface");
  expect(ownerSource).toContain('"transparent"');
  expect(ownerSource).toContain("homeColors.sidenavPopoverSurface");
  expect(ownerSource).toContain("homeColors.sidenavPopoverBorder");
  expect(ownerSource).toContain("homeColors.sidenavPopoverArrowBorder");
  expect(ownerSource).toContain("homeColors.sidenavPopoverShadow");
  expect(ownerSource).toContain("homeColors.textOnAccent");
  expect(ownerSource).not.toMatch(/#[\da-f]{3,8}|rgba?\(|starred|starButton|starIcon/i);
  expect(source).toContain('"authenticated-sidenav-favorite-project-rows"');
  expect(source).toContain('ownsPopoverPresentation ? "" : "popover right"');
  expect(source).toContain('ownsPopoverPresentation ? "" : "arrow"');
  expect(source).toContain('ownsPopoverPresentation ? "" : "popover-content"');
  expect(source).toContain(
    "ownsPopoverPresentation ? {} : stylex.props(homeSidebarPopoverStyles.legacyPopover)",
  );
});

test("framed Favorite popover uses the left nested-project StyleX owner", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installAuthenticatedHome(page);
  await page.addInitScript(() => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
    localStorage.setItem("sidebarActiveMenu", "myOrganizationList");
  });
  await page.goto(`${BASE_PATH}/`);

  const panel = page.locator("#left-sidebar-myOrganizationList");
  const ownToggle = panel.locator("[aria-expanded]").filter({ hasText: "admin" });
  await ownToggle.click();
  const row = panel.locator('[data-stylex-owner="left-sidebar-favorite-nested-project-rows"]');
  const link = row.getByRole("link", { name: /own-project/ });
  await expect(link).toBeVisible();
  // The left (framed) sidebar intentionally renders NO overview hover popover:
  // 8029e1e6d "Prevent left-sidebar overview hover overflow" (legacy parity —
  // yona-original sidebar.scala.html has no overview popover either). The old
  // pin expected a tooltip that the app deliberately removed.
  await link.locator("..").hover();
  const tooltip = panel.getByRole("tooltip", { name: "Own project overview" });
  await expect(tooltip).toHaveCount(0);
  await expect(panel.getByRole("tooltip")).toHaveCount(0);
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`authenticated Favorite nested project rows preserve ${viewport.label} styles, geometry, and behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const interaction = await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
    // The side nav slides open with a 0.5s width transition
    // (rootSidebarMotionStyles.shell). The force-clicks below dispatch at the
    // toggles' mid-transition positions and silently miss; let it settle.
    await page.waitForTimeout(600);

    const favoritePanel = page.locator("#myOrganizationList");
    const ownToggle = favoritePanel.locator("[aria-expanded]").filter({ hasText: "admin" });
    const organizationToggle = favoritePanel
      .locator("[aria-expanded]")
      .filter({ hasText: "weblabs" });
    await ownToggle.click({ force: true });
    await organizationToggle.click({ force: true });

    const rows = favoritePanel.locator(
      '[data-stylex-owner="authenticated-sidenav-favorite-project-rows"]',
    );
    const own = projectRow(rows, "own-project");
    const organization = projectRow(rows, "web-project");
    await expect(rows).toHaveCount(2);
    await expect(own.row).toBeVisible();
    await expect(organization.row).toBeVisible();

    const ownBase = await readRowEvidence(own);
    const organizationBase = await readRowEvidence(organization);
    console.log(
      `authenticated-sidenav-favorite-project-rows-${viewport.label}`,
      JSON.stringify({ organization: organizationBase, own: ownBase }),
    );
    await saveScreenshot(
      page,
      `stylex-authenticated-sidenav-favorite-project-rows-${viewport.label}-${ownBase.hasOwner ? "after" : "before"}.png`,
    );

    for (const evidence of [ownBase, organizationBase]) {
      expect(evidence.pluginAttributes).toEqual([]);
      expect(evidence.rowStyles).toEqual({ cursor: "pointer", lineHeight: "normal" });
      expect(evidence.listStyles).toEqual({
        alignItems: "center",
        cursor: "pointer",
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        paddingBottom: "4px",
        paddingTop: "4px",
        position: "relative",
      });
      expect(evidence.linkStyles).toEqual({
        alignItems: "center",
        color: "rgb(0, 0, 0)",
        display: "flex",
        flexDirection: "row",
        flexGrow: "1",
        flexWrap: "nowrap",
        fontSize: "14px",
        fontWeight: "400",
        height: "18px",
        justifyContent: "space-between",
        lineHeight: "16px",
        marginRight: "0px",
        overflowX: "hidden",
        overflowY: "hidden",
        textDecorationLine: "none",
      });
      expect(evidence.logoStyles).toEqual({
        flexShrink: "0",
        marginLeft: "2px",
        overflowX: "hidden",
        overflowY: "hidden",
        paddingLeft: "22px",
        paddingTop: "3px",
        textAlign: "center",
        width: "26px",
      });
      expect(evidence.avatarStyles.color).toBe("rgb(0, 0, 0)");
      expect(evidence.nameOwnerStyles).toEqual({
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
      });
      expect(evidence.nameStyles).toEqual({
        fontSize: "14px",
        maxWidth: "150px",
        minWidth: "50px",
        overflowX: "hidden",
        overflowY: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      });
      expect(evidence.geometry.list.left).toBe(evidence.geometry.row.left);
      expect(evidence.geometry.list.right).toBe(evidence.geometry.row.right);
      expect(evidence.geometry.link.left).toBe(evidence.geometry.list.left);
      expect(evidence.geometry.link.right + 29).toBe(evidence.geometry.list.right);
      expect(evidence.geometry.logo.left).toBeGreaterThanOrEqual(evidence.geometry.link.left);
      expect(evidence.geometry.logo.right).toBeLessThanOrEqual(evidence.geometry.nameOwner.left);
      expect(evidence.geometry.name.left).toBe(evidence.geometry.nameOwner.left);
      expect(evidence.geometry.row.right).toBeLessThanOrEqual(evidence.geometry.shell.right);
      expect(evidence.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });
    }
    expect(organizationBase.imageStyles).toEqual({
      borderRadius: "3px",
      height: "16px",
      marginRight: "0px",
      verticalAlign: "text-top",
      width: "16px",
    });

    for (const row of [own, organization]) {
      await row.list.hover();
      expect(await readHoverEvidence(row.list)).toEqual({
        backgroundColor: "rgb(241, 241, 241)",
        cursor: "pointer",
      });
    }
    await page.mouse.move(0, 0);

    await own.list.hover();
    const tooltip = page.getByRole("tooltip", { name: "Own project overview" });
    await expect(tooltip).toBeVisible();
    await expectOwnedPopoverLegacyClassesAbsent(tooltip);
    const popoverBase = await readPopoverEvidence(tooltip);
    console.log(
      `authenticated-sidenav-favorite-project-popover-${viewport.label}`,
      JSON.stringify(popoverBase),
    );
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await tooltip.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `stylex-authenticated-sidenav-favorite-project-popover-${viewport.label}-${ownBase.hasOwner ? "after" : "before"}.png`,
      ),
    });
    expect(popoverBase.styles).toEqual({
      backgroundClip: "padding-box",
      backgroundColor: "rgb(3, 169, 244)",
      borderBottomColor: "rgba(0, 0, 0, 0.2)",
      borderBottomStyle: "solid",
      borderBottomWidth: "1px",
      borderRadius: "2px",
      boxShadow: "rgba(0, 0, 0, 0.1) -2px 2px 1px 0px",
      color: "rgb(255, 255, 255)",
      display: "block",
      fontSize: "13px",
      left: `${ownBase.geometry.list.width}px`,
      lineHeight: "13px",
      marginLeft: "10px",
      maxWidth: "276px",
      minWidth: "200px",
      padding: "1px",
      position: "absolute",
      textAlign: "left",
      top: `${ownBase.geometry.list.height / 2}px`,
      transform: "matrix(1, 0, 0, 1, 0, -18.7969)",
      whiteSpace: "normal",
      wordWrap: "break-word",
      zIndex: "1010",
    });
    expect(popoverBase.contentStyles).toEqual({ lineHeight: "15.6px", padding: "9px 10px" });
    expect(popoverBase.arrowStyles).toEqual({
      borderLeftWidth: "0px",
      borderRightColor: "rgba(0, 0, 0, 0.25)",
      borderStyle: "solid",
      borderWidth: "11px 11px 11px 0px",
      display: "block",
      height: "0px",
      left: "-11px",
      marginTop: "-11px",
      position: "absolute",
      top: "17.7969px",
      width: "0px",
    });
    expect(popoverBase.arrowAfterStyles).toEqual({
      borderLeftWidth: "0px",
      borderRightColor: "rgb(3, 169, 244)",
      borderStyle: "solid",
      borderWidth: "10px 10px 10px 0px",
      bottom: "-10px",
      content: '""',
      display: "block",
      height: "0px",
      left: "1px",
      position: "absolute",
      width: "0px",
    });
    expect(popoverBase.geometry.left).toBe(
      ownBase.geometry.list.right + (viewport.label === "desktop" ? 10 : 0),
    );
    expect(popoverBase.geometry.top).toBeLessThan(ownBase.geometry.list.top);
    expect(popoverBase.geometry.bottom).toBeGreaterThan(ownBase.geometry.list.bottom);
    await expect(tooltip).toHaveAttribute(
      "data-stylex-owner",
      "authenticated-sidenav-favorite-project-popover",
    );
    expect(ownBase.hasOwner).toBe(true);
    expect(organizationBase.hasOwner).toBe(true);
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();

    await own.star.click();
    await expect(ownToggle).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => interaction.projectRequests.length).toBe(1);
    expect(interaction.projectRequests).toEqual([
      {
        csrfToken: "csrf-project-row",
        method: "POST",
        path: `${BASE_PATH}/api/v1/owners/admin/projects/own-project/favorite`,
      },
    ]);

    await ownToggle.click();
    await expect(own.row).toBeHidden();
    await expect(organization.row).toBeVisible();
    const search = favoritePanel.getByPlaceholder("Type name");
    await search.fill("own-project");
    await expect(own.row).toBeVisible();
    await expect(organization.row).toBeHidden();
    await search.fill("");
    await expect(own.row).toBeHidden();
    await expect(organization.row).toBeVisible();
    await ownToggle.click();
    await expect(own.row).toBeVisible();

    const ownBeforeFallback = await readRowEvidence(own);
    const organizationBeforeFallback = await readRowEvidence(organization);
    await removeOwnerStyleXClasses(own);
    await removeOwnerStyleXClasses(organization);
    const ownFallback = await readRowEvidence(own);
    const organizationFallback = await readRowEvidence(organization);
    for (const [before, fallback] of [
      [ownBeforeFallback, ownFallback],
      [organizationBeforeFallback, organizationFallback],
    ]) {
      expect(fallback.rowStyles).toEqual(before.rowStyles);
      expect(fallback.listStyles).toEqual(before.listStyles);
      expect(fallback.linkStyles).toMatchObject({
        ...before.linkStyles,
        marginRight: "29px",
      });
      expect(fallback.logoStyles).toEqual(before.logoStyles);
      expect(fallback.avatarStyles).toEqual(before.avatarStyles);
      expect(fallback.nameOwnerStyles).toEqual(before.nameOwnerStyles);
      expect(fallback.nameStyles).toEqual(before.nameStyles);
      expect(fallback.imageStyles).toEqual(before.imageStyles);
      expect(fallback.geometry.list).toEqual(before.geometry.list);
      expect(fallback.geometry.row).toEqual(before.geometry.row);
      expect(fallback.geometry.link.right).toBe(before.geometry.link.right - 29);
      expect(fallback.geometry.link.width).toBe(before.geometry.link.width - 29);
    }

    await own.list.hover();
    const ownedTooltipAfterRowClassDeletion = page.locator(
      '[data-stylex-owner="authenticated-sidenav-favorite-project-popover"]',
    );
    await expect(ownedTooltipAfterRowClassDeletion).toBeVisible();
    await expectOwnedPopoverLegacyClassesAbsent(ownedTooltipAfterRowClassDeletion);
    await page.mouse.move(0, 0);

    await page.getByRole("button", { name: "Recent History" }).click({ force: true });
    const recentIssue = page.getByRole("link", { name: "Recent issue title" });
    await recentIssue.hover();
    const recentTooltip = page.getByRole("tooltip", { name: "web-project #7" });
    await expect(recentTooltip).toBeVisible();
    await expect(recentTooltip).toHaveAttribute(
      "data-stylex-owner",
      "authenticated-sidenav-recent-issue-popover",
    );
    await page.getByRole("button", { name: "Project" }).click({ force: true });
    const projectTabRow = page
      .getByRole("link", { name: /project-tab-project/ })
      .locator("xpath=ancestor::li[1]");
    await expect(projectTabRow).toBeVisible();
    await expect(projectTabRow).toHaveAttribute(
      "data-stylex-owner",
      "authenticated-sidenav-direct-project-rows",
    );
    await page.getByRole("button", { exact: true, name: "Favorite" }).click({ force: true });

    expect(await own.link.getAttribute("href")).toBe(`${BASE_PATH}/admin/own-project`);
    await own.link.click();
    await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/admin/own-project/?$`));
  });
}

type ProjectRowLocators = {
  avatar: Locator;
  image: Locator;
  link: Locator;
  list: Locator;
  logo: Locator;
  name: Locator;
  nameOwner: Locator;
  row: Locator;
  star: Locator;
};

function projectRow(rows: Locator, name: string): ProjectRowLocators {
  const link = rows.getByRole("link", { name: new RegExp(name) });
  const row = link.locator("xpath=ancestor::li[1]");
  const list = link.locator("..");
  const logo = link.locator(":scope > div").nth(0);
  const avatar = logo.locator(".project-avatar");
  const image = avatar.locator("img.logo");
  const nameOwner = link.locator(":scope > div").nth(1);
  const nameLocator = nameOwner.locator(":scope > div").nth(0);
  const star = list.getByRole("button", { name: new RegExp(`${name}.*favorites`) });
  return { avatar, image, link, list, logo, name: nameLocator, nameOwner, row, star };
}

async function readRowEvidence(row: ProjectRowLocators) {
  const imageHandle = (await row.image.count()) > 0 ? await row.image.elementHandle() : null;
  return row.row.evaluate(
    (element, targets) => {
      const [list, link, logo, avatar, nameOwner, name, image] = targets as HTMLElement[];
      const shell = element.closest('[data-stylex-owner="authenticated-sidenav-favorite-shell"]');
      if (!shell) throw new Error("Project row is outside the authenticated Favorite shell");
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
      const elementStyle = getComputedStyle(element);
      const listStyle = getComputedStyle(list);
      const linkStyle = getComputedStyle(link);
      const logoStyle = getComputedStyle(logo);
      const avatarStyle = getComputedStyle(avatar);
      const nameOwnerStyle = getComputedStyle(nameOwner);
      const nameStyle = getComputedStyle(name);
      const imageStyle = image ? getComputedStyle(image) : null;
      return {
        avatarStyles: { color: avatarStyle.color },
        geometry: {
          avatar: box(avatar),
          image: image ? box(image) : null,
          link: box(link),
          list: box(list),
          logo: box(logo),
          name: box(name),
          nameOwner: box(nameOwner),
          row: box(element),
          shell: box(shell),
        },
        hasOwner:
          element.getAttribute("data-stylex-owner") ===
          "authenticated-sidenav-favorite-project-rows",
        imageStyles: imageStyle
          ? {
              borderRadius: imageStyle.borderRadius,
              height: imageStyle.height,
              marginRight: imageStyle.marginRight,
              verticalAlign: imageStyle.verticalAlign,
              width: imageStyle.width,
            }
          : null,
        linkStyles: {
          alignItems: linkStyle.alignItems,
          color: linkStyle.color,
          display: linkStyle.display,
          flexDirection: linkStyle.flexDirection,
          flexGrow: linkStyle.flexGrow,
          flexWrap: linkStyle.flexWrap,
          fontSize: linkStyle.fontSize,
          fontWeight: linkStyle.fontWeight,
          height: linkStyle.height,
          justifyContent: linkStyle.justifyContent,
          lineHeight: linkStyle.lineHeight,
          marginRight: linkStyle.marginRight,
          overflowX: linkStyle.overflowX,
          overflowY: linkStyle.overflowY,
          textDecorationLine: linkStyle.textDecorationLine,
        },
        listStyles: {
          alignItems: listStyle.alignItems,
          cursor: listStyle.cursor,
          display: listStyle.display,
          flexDirection: listStyle.flexDirection,
          flexWrap: listStyle.flexWrap,
          justifyContent: listStyle.justifyContent,
          paddingBottom: listStyle.paddingBottom,
          paddingTop: listStyle.paddingTop,
          position: listStyle.position,
        },
        logoStyles: {
          flexShrink: logoStyle.flexShrink,
          marginLeft: logoStyle.marginLeft,
          overflowX: logoStyle.overflowX,
          overflowY: logoStyle.overflowY,
          paddingLeft: logoStyle.paddingLeft,
          paddingTop: logoStyle.paddingTop,
          textAlign: logoStyle.textAlign,
          width: logoStyle.width,
        },
        nameOwnerStyles: {
          alignItems: nameOwnerStyle.alignItems,
          display: nameOwnerStyle.display,
          flexDirection: nameOwnerStyle.flexDirection,
          flexGrow: nameOwnerStyle.flexGrow,
          flexWrap: nameOwnerStyle.flexWrap,
          justifyContent: nameOwnerStyle.justifyContent,
          overflowX: nameOwnerStyle.overflowX,
          overflowY: nameOwnerStyle.overflowY,
          paddingBottom: nameOwnerStyle.paddingBottom,
          paddingTop: nameOwnerStyle.paddingTop,
        },
        nameStyles: {
          fontSize: nameStyle.fontSize,
          maxWidth: nameStyle.maxWidth,
          minWidth: nameStyle.minWidth,
          overflowX: nameStyle.overflowX,
          overflowY: nameStyle.overflowY,
          textOverflow: nameStyle.textOverflow,
          whiteSpace: nameStyle.whiteSpace,
        },
        pluginAttributes: Array.from(
          element.querySelectorAll(
            "[data-toggle], [data-target], [data-action], [data-href], [data-url], [data-request-method]",
          ),
          (node) => node.tagName.toLowerCase(),
        ),
        rowStyles: { cursor: elementStyle.cursor, lineHeight: elementStyle.lineHeight },
        viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
      };
    },
    [
      await row.list.elementHandle(),
      await row.link.elementHandle(),
      await row.logo.elementHandle(),
      await row.avatar.elementHandle(),
      await row.nameOwner.elementHandle(),
      await row.name.elementHandle(),
      imageHandle,
    ],
  );
}

async function readHoverEvidence(list: Locator) {
  return list.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, cursor: style.cursor };
  });
}

async function readPopoverEvidence(tooltip: Locator) {
  return tooltip.evaluate((element) => {
    const arrow = element.firstElementChild as HTMLElement | null;
    const content = element.lastElementChild as HTMLElement | null;
    if (!arrow || !content) throw new Error("Popover structure is incomplete");
    const style = getComputedStyle(element);
    const arrowStyle = getComputedStyle(arrow);
    const arrowAfterStyle = getComputedStyle(arrow, "::after");
    const contentStyle = getComputedStyle(content);
    const rect = element.getBoundingClientRect();
    return {
      arrowAfterStyles: {
        borderLeftWidth: arrowAfterStyle.borderLeftWidth,
        borderRightColor: arrowAfterStyle.borderRightColor,
        borderStyle: arrowAfterStyle.borderStyle,
        borderWidth: arrowAfterStyle.borderWidth,
        bottom: arrowAfterStyle.bottom,
        content: arrowAfterStyle.content,
        display: arrowAfterStyle.display,
        height: arrowAfterStyle.height,
        left: arrowAfterStyle.left,
        position: arrowAfterStyle.position,
        width: arrowAfterStyle.width,
      },
      arrowStyles: {
        borderLeftWidth: arrowStyle.borderLeftWidth,
        borderRightColor: arrowStyle.borderRightColor,
        borderStyle: arrowStyle.borderStyle,
        borderWidth: arrowStyle.borderWidth,
        display: arrowStyle.display,
        height: arrowStyle.height,
        left: arrowStyle.left,
        marginTop: arrowStyle.marginTop,
        position: arrowStyle.position,
        top: arrowStyle.top,
        width: arrowStyle.width,
      },
      contentStyles: { lineHeight: contentStyle.lineHeight, padding: contentStyle.padding },
      geometry: {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      },
      styles: {
        backgroundClip: style.backgroundClip,
        backgroundColor: style.backgroundColor,
        borderBottomColor: style.borderBottomColor,
        borderBottomStyle: style.borderBottomStyle,
        borderBottomWidth: style.borderBottomWidth,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        color: style.color,
        display: style.display,
        fontSize: style.fontSize,
        left: style.left,
        lineHeight: style.lineHeight,
        marginLeft: style.marginLeft,
        maxWidth: style.maxWidth,
        minWidth: style.minWidth,
        padding: style.padding,
        position: style.position,
        textAlign: style.textAlign,
        top: style.top,
        transform: style.transform,
        whiteSpace: style.whiteSpace,
        wordWrap: style.wordWrap,
        zIndex: style.zIndex,
      },
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

async function removeOwnerStyleXClasses(row: ProjectRowLocators) {
  const imageHandle = (await row.image.count()) > 0 ? await row.image.elementHandle() : null;
  await row.row.evaluate(
    (element, targets) => {
      const [list, link, logo, avatar, nameOwner, name, image] = targets as HTMLElement[];
      element.className = element.classList.contains("show-always")
        ? "user-li show-always"
        : "user-li";
      list.className = "project-list project-flex-container";
      link.className = "project-item project-item-container sidebar-project-link sidebar-row-link";
      logo.className = "flex-item site-logo all-project-names";
      avatar.className = "project-avatar";
      nameOwner.className = "projectName-owner flex-item";
      name.className = "project-name flex-item";
      if (image) image.className = "logo";
    },
    [
      await row.list.elementHandle(),
      await row.link.elementHandle(),
      await row.logo.elementHandle(),
      await row.avatar.elementHandle(),
      await row.nameOwner.elementHandle(),
      await row.name.elementHandle(),
      imageHandle,
    ],
  );
}

async function installAuthenticatedHome(page: Page) {
  const projectRequests: Array<{
    csrfToken: string | undefined;
    method: string;
    path: string;
  }> = [];
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
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-project-row" },
      json: { isAnonymous: false },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/owners/*/projects/*/favorite", (route) => {
    const request = route.request();
    projectRequests.push({
      csrfToken: request.headers()["x-csrf-token"],
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
    return route.fulfill({
      contentType: "application/json",
      json: { favorited: true, ownerName: "admin", projectName: "own-project" },
    });
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [
          {
            isFavorited: true,
            organizationId: 11,
            organizationName: "weblabs",
            projectCount: 1,
            projects: [
              {
                isFavorited: true,
                logoUrl:
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='16' height='16' fill='orange'/%3E%3C/svg%3E",
                ownerName: "weblabs",
                projectId: 32,
                projectName: "web-project",
              },
            ],
          },
        ],
        favoriteProjects: [],
        organizations: [{ organizationId: 11, organizationName: "weblabs", projects: [] }],
        ownProjects: [
          {
            isFavorited: false,
            overview: "Own project overview",
            ownerName: "admin",
            projectId: 31,
            projectName: "own-project",
          },
        ],
        profile: { loginId: "admin" },
        recentProjects: [
          {
            isFavorited: false,
            ownerName: "outside",
            projectId: 41,
            projectName: "project-tab-project",
          },
        ],
        issueItems: [
          {
            issueNumber: 7,
            ownerName: "weblabs",
            projectName: "web-project",
            title: "Recent issue title",
          },
        ],
        recentIssues: [],
      },
    }),
  );
  return { projectRequests };
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
