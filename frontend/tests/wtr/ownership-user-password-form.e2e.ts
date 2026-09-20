import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  description: "user-password-description",
  form: "user-password-form",
  input: "user-password-input",
  list: "user-password-list",
  term: "user-password-term",
} as const;

// Stateful session mock: the password-change mutation's onSuccess invalidates the
// session query and navigates to /users/loginform, whose guard bounces
// authenticated sessions (isAnonymous:false) back to "/". Flip the flag after the
// POST so the post-change session refetch reports anonymous, matching legacy
// resetUserPassword (logout -> login form).
let sessionIsAnonymous = false;

test.use({ locale: "ko-KR" });

async function mockPasswordSettings(page: Page) {
  sessionIsAnonymous = false;
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: sessionIsAnonymous,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      json: { csrfToken: "csrf-token" },
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        apiToken: "token-before",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "/legacy-assets/images/default-avatar-128.png",
          connectedSocialProviders: [],
          displayName: "Admin User",
          englishName: "",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
          primaryEmailAddress: "admin@example.com",
          sinceLabel: "2026-06-30",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}

async function open(page: Page) {
  await mockPasswordSettings(page);
  await page.goto(`${basePath}/user/editform/password`);
  await expect(page.locator(`[data-owner="${owners.form}"]`)).toBeVisible();
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`password form owners preserve exact live ${viewport.name} output`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const form = page.locator(`[data-owner="${owners.form}"]`);
    const list = form.locator(`:scope > [data-owner="${owners.list}"]`);
    const terms = list.locator(`:scope > [data-owner="${owners.term}"]`);
    const descriptions = list.locator(`:scope > [data-owner="${owners.description}"]`);
    const inputs = form.locator(`[data-owner="${owners.input}"]`);
    await expect(terms).toHaveCount(3);
    await expect(descriptions).toHaveCount(4);
    await expect(inputs).toHaveCount(3);

    const actual = await page.evaluate((ownerNames) => {
      const get = (owner: string) =>
        document.querySelector<HTMLElement>(`[data-owner="${owner}"]`)!;
      const getAll = (owner: string) =>
        Array.from(document.querySelectorAll<HTMLElement>(`[data-owner="${owner}"]`));
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const css = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          border: style.border,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          boxSizing: style.boxSizing,
          color: style.color,
          display: style.display,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          height: style.height,
          lineHeight: style.lineHeight,
          margin: style.margin,
          padding: style.padding,
          transition: style.transition,
          verticalAlign: style.verticalAlign,
          width: style.width,
        };
      };
      return {
        descriptions: getAll(ownerNames.description).map(box),
        form: { box: box(get(ownerNames.form)), style: css(get(ownerNames.form)) },
        inputs: getAll(ownerNames.input).map((element) => ({
          box: box(element),
          style: css(element),
        })),
        list: { box: box(get(ownerNames.list)), style: css(get(ownerNames.list)) },
        scrollWidth: document.documentElement.scrollWidth,
        terms: getAll(ownerNames.term).map((element) => ({
          box: box(element),
          style: css(element),
        })),
      };
    }, owners);
    const desktop = viewport.name === "desktop";
    const pageWidth = desktop ? 1346 : 390;
    const pageX = desktop ? 10 : 0;
    expect(actual.form.box).toEqual({
      height: 240,
      width: pageWidth,
      x: pageX,
      y: 206,
    });
    expect(actual.list.box).toEqual(actual.form.box);
    expect(actual.form.style.margin).toBe("0px 0px 2px");
    expect(actual.list.style.margin).toBe("0px");
    expect(actual.terms.map(({ box }) => box)).toEqual(
      [206, 276, 346].map((y) => ({
        height: 20,
        width: pageWidth,
        x: pageX,
        y,
      })),
    );
    for (const { style } of actual.terms) {
      expect(style.fontWeight).toBe("700");
      expect(style.lineHeight).toBe("20px");
      expect(style.margin).toBe("0px");
    }
    expect(actual.descriptions).toEqual([
      { height: 40, width: pageWidth, x: pageX, y: 236 },
      { height: 40, width: pageWidth, x: pageX, y: 306 },
      { height: 40, width: pageWidth, x: pageX, y: 376 },
      { height: 30, width: pageWidth, x: pageX, y: 416 },
    ]);
    for (const [index, input] of actual.inputs.entries()) {
      expect(input.box).toEqual({
        height: 30,
        width: 220,
        x: pageX,
        y: [236, 306, 376][index],
      });
      expect(input.style).toEqual({
        backgroundColor: "rgb(255, 255, 255)",
        border: "1px solid rgb(204, 204, 204)",
        borderRadius: "2px",
        boxShadow: "none",
        boxSizing: "content-box",
        color: "rgb(85, 85, 85)",
        display: "inline-block",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontSize: desktop ? "12px" : "16px",
        fontWeight: "400",
        height: "20px",
        lineHeight: "20px",
        margin: "0px 0px 10px",
        padding: "4px 6px",
        transition: "border 0.2s linear, box-shadow 0.2s linear",
        verticalAlign: "middle",
        width: "206px",
      });
    }
    expect(actual.scrollWidth).toBe(viewport.width);

    await inputs.first().focus();
    await expect(inputs.first()).toHaveCSS("border-color", "rgb(243, 108, 34)");
    await expect(inputs.first()).toHaveCSS("box-shadow", "none");

    const screenshotDirectory = resolve("..", "output/playwright/visual-sweep");
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(screenshotDirectory, `style-user-password-react-${viewport.name}.png`),
    });
  });

test("password validation and TanStack mutation stay intact", async ({ page }) => {
  await mockPasswordSettings(page);
  let mutationBody: unknown;
  await page.route("**/api/v1/workspace/password", async (route: Route) => {
    mutationBody = JSON.parse(route.request().postData() ?? "{}");
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    // Post-change session refetch must report anonymous so /users/loginform
    // renders instead of bouncing authenticated sessions to "/".
    sessionIsAnonymous = true;
    await route.fulfill({ contentType: "application/json", json: { isAnonymous: true } });
  });
  await page.goto(`${basePath}/user/editform/password`);
  await page.locator("#frmPassword button[type=submit]").click();
  await expect(page.locator('[data-owner="user-password-validation-content"]')).toHaveText([
    "필수 항목 입니다.",
    "필수 항목 입니다.",
    "필수 항목 입니다.",
  ]);
  expect(mutationBody).toBeUndefined();

  await page.locator("#oldPassword").fill("old-pass");
  await page.locator("#password").fill("new-pass");
  await page.locator("#retypedPassword").fill("new-pass");
  await page.locator("#frmPassword button[type=submit]").click();
  // Depth-independent wait: a relative glob would resolve against the current
  // /yona/user/editform/ directory and never match the loginform path.
  await page.waitForURL((url) => url.pathname === `${basePath}/users/loginform`);
  expect(mutationBody).toEqual({
    loginId: "admin",
    oldPassword: "old-pass",
    password: "new-pass",
    retypedPassword: "new-pass",
  });
});
