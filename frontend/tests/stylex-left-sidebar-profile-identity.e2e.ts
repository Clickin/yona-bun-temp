import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("left sidebar profile identity has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const start = route.indexOf("const leftSidebarProfileIdentityStyles");
  const end = route.indexOf("const leftSidebarClosePinStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  expect(styles).toContain("homeColors.leftSidebarProfileAvatarSurface");
  expect(theme).toContain("leftSidebarProfileAvatarSurface:");
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/i);

  const marker = route.indexOf('data-stylex-owner="left-sidebar-profile-identity"');
  expect(marker).toBeGreaterThanOrEqual(0);
  const ownerStart = route.lastIndexOf("<Link", marker);
  const ownerEnd = route.indexOf("</Link>", marker);
  const owner = route.slice(ownerStart, ownerEnd);
  for (const removedClass of ["avatar-wrap", "smaller", "caret-text", "hide-in-mobile"]) {
    expect(owner).not.toContain(removedClass);
  }
  expect(owner).toContain('to="/$user"');
  expect(owner).toContain("params={{ user: loginId }}");
  expect(owner).not.toContain("target=");
});

for (const viewport of [
  {
    height: 900,
    label: "desktop",
    labelBox: { height: 16, width: 64.921875, x: 38.59375, y: 13 },
    labelDisplay: "inline",
    link: { height: 16, width: 92.109375, x: 15, y: 13 },
    rowWidth: 270,
    width: 1366,
  },
  {
    height: 844,
    label: "mobile",
    labelBox: { height: 0, width: 0, x: 0, y: 0 },
    labelDisplay: "none",
    link: { height: 16, width: 23.59375, x: 15, y: 13 },
    rowWidth: 317.6875,
    width: 390,
  },
]) {
  test(`left sidebar profile identity preserves ${viewport.label} legacy parity`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    const row = sidebar.locator(':scope > [data-stylex-owner="left-sidebar-account-actions"]');
    const owner = row.locator('[data-stylex-owner="left-sidebar-profile-identity"]');
    await expect(owner).toBeVisible();
    const evidence = await readEvidence(owner, row);

    expect(evidence).toEqual({
      avatar: { height: 20, width: 20, x: 15, y: 12.578125 },
      image: { height: 20, width: 20, x: 15, y: 12.578125 },
      label: viewport.labelBox,
      link: viewport.link,
      owner: "left-sidebar-profile-identity",
      overflow: false,
      presentationClasses: [],
      row: { height: 44, width: viewport.rowWidth, x: 0, y: 0 },
      styles: {
        avatar: {
          backgroundColor: "rgb(221, 221, 221)",
          borderRadius: "3px",
          display: "inline-block",
          overflow: "hidden",
          verticalAlign: "middle",
        },
        image: { verticalAlign: "top", width: "20px" },
        label: {
          display: viewport.labelDisplay,
          fontSize: "13px",
          lineHeight: "20px",
        },
      },
    });
    await expect(owner).toHaveAttribute("href", `${BASE_PATH}/admin`);
    await expect(owner).not.toHaveAttribute("target", /.+/u);
    await expect(owner).not.toHaveAttribute("data-toggle", /.+/u);
    await expect(owner).not.toHaveAttribute("data-status", /.+/u);
    await expect(sidebar.locator("#sidebar-open-btn")).toHaveCount(0);
    await saveScreenshot(
      owner,
      `stylex-left-sidebar-profile-identity-owner-local-${viewport.label}.png`,
    );

    await page.evaluate(() => sessionStorage.removeItem("profile-native-unload"));
    await owner.click();
    await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/admin(?:\\?|$)`, "u"));
    expect(await page.evaluate(() => sessionStorage.getItem("profile-native-unload"))).toBeNull();
  });
}

async function readEvidence(owner: Locator, row: Locator) {
  return owner.evaluate(
    (element, rowElement) => {
      const avatar = element.children[0] as HTMLElement;
      const image = avatar.querySelector("img") as HTMLElement;
      const label = element.children[1] as HTMLElement;
      const box = (target: Element) => {
        const rect = target.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const avatarStyle = getComputedStyle(avatar);
      const imageStyle = getComputedStyle(image);
      const labelStyle = getComputedStyle(label);
      return {
        avatar: box(avatar),
        image: box(image),
        label: box(label),
        link: box(element),
        owner: element.getAttribute("data-stylex-owner"),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        presentationClasses: ["avatar-wrap", "smaller", "caret-text", "hide-in-mobile"].filter(
          (name) => element.querySelector(`.${name}`),
        ),
        row: box(rowElement as unknown as Element),
        styles: {
          avatar: {
            backgroundColor: avatarStyle.backgroundColor,
            borderRadius: avatarStyle.borderRadius,
            display: avatarStyle.display,
            overflow: avatarStyle.overflow,
            verticalAlign: avatarStyle.verticalAlign,
          },
          image: { verticalAlign: imageStyle.verticalAlign, width: imageStyle.width },
          label: {
            display: labelStyle.display,
            fontSize: labelStyle.fontSize,
            lineHeight: labelStyle.lineHeight,
          },
        },
      };
    },
    await row.elementHandle(),
  );
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
    localStorage.setItem("sidebarActiveMenu", "myProjectList");
    window.addEventListener("beforeunload", () => {
      sessionStorage.setItem("profile-native-unload", "true");
    });
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
        preferredLanguage: "en-US",
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
        issueItems: [],
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

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
