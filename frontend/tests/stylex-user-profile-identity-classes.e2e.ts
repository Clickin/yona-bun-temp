import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const identityOwners = [
  "user-profile-whoami",
  "user-profile-identity-name",
  "user-profile-identity-loginid",
  "user-profile-identity-email",
  "user-profile-identity-edit",
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ apiBaseUrl, mountedBasePath }) => {
      (
        window as Window & {
          __YONA_RUNTIME_CONFIG__?: {
            apiBaseUrl: string;
            basePath: string;
            showUserEmail: boolean;
          };
        }
      ).__YONA_RUNTIME_CONFIG__ = {
        apiBaseUrl,
        basePath: mountedBasePath,
        showUserEmail: true,
      };
    },
    { apiBaseUrl: `${basePath}/api`, mountedBasePath: basePath },
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "identity-all" },
    }),
  );
  await page.route("**/api/v1/users/*/profile**", (route) => {
    const loginId =
      route
        .request()
        .url()
        .match(/\/users\/([^/]+)\/profile/u)?.[1] ?? "identity-all";
    if (loginId === "identity-missing") {
      return route.fulfill({
        contentType: "application/json",
        status: 404,
        json: { message: "not found" },
      });
    }
    const emailVisible = loginId === "identity-all" || loginId === "identity-email";
    const editVisible = loginId === "identity-all" || loginId === "identity-edit";
    return route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: editVisible,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Identity User",
          englishName: "Identity",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId,
          primaryEmailAddress: emailVisible ? "identity@example.com" : null,
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [],
      },
    });
  });
});

test("public-profile identity ownership comes only from the matching frozen selectors", async () => {
  const [routeSource, scala, pageLess, yobiUiLess, overrideLess] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_override.less", import.meta.url),
      "utf8",
    ),
  ]);

  expect(scala).toContain('<div class="whoami usf-group">');
  expect(scala).toContain('<span class="name">@user.englishName</span>');
  expect(scala).toContain('<span class="loginid">@{"@"}@user.loginId</span>');
  expect(scala).toContain('<span class="email">@user.email</span>');
  expect(scala).toContain('<div class="edit">');
  expect(pageLess).toMatch(
    /\.user-info-box\s*\{[\s\S]*?\.whoami\s*\{[\s\S]*?margin-top:15px;[\s\S]*?\.name\s*\{[\s\S]*?font-size:18px;[\s\S]*?font-weight:bold;[\s\S]*?\.edit\s*\{[\s\S]*?text-align:right;[\s\S]*?margin-top:5px;/u,
  );
  expect(yobiUiLess).toMatch(
    /\.usf-group\s*\{[\s\S]*?\.name\s*\{\s*margin-right:2px;\s*\}[\s\S]*?\.loginid\s*\{\s*color:#999;\s*\}/u,
  );
  expect(yobiUiLess).toContain(".dropdown-menu li");
  expect(yobiUiLess).toContain(".usf-group .loginid { color:#fff; }");
  expect(overrideLess).toContain(".select2-highlighted");
  expect(overrideLess).toContain(".loginid { color:#fff; }");

  for (const owner of identityOwners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  const identitySource = routeSource.slice(
    routeSource.indexOf('data-stylex-owner="user-profile-avatar-background"'),
    routeSource.indexOf('data-stylex-owner="user-profile-user-status"'),
  );
  for (const staleClassExpression of [
    "whoami usf-group",
    ".className} name",
    ".className} loginid",
    'className="email"',
    ".className} edit",
  ]) {
    expect(identitySource).not.toContain(staleClassExpression);
  }
  expect(routeSource).toContain(
    'profileName: { fontSize: "18px", fontWeight: "bold", marginRight: "2px" }',
  );
  expect(routeSource).toContain("whoami-wrap");
});

test("public-profile identity keeps exact conditional DOM, paint, and geometry", async ({
  page,
}, testInfo) => {
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const state of [
      { email: true, edit: true, loginId: "identity-all" },
      { email: true, edit: false, loginId: "identity-email" },
      { email: false, edit: true, loginId: "identity-edit" },
      { email: false, edit: false, loginId: "identity-minimal" },
    ]) {
      await page.goto(`${basePath}/${state.loginId}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-stylex-owner="user-profile-whoami"]')).toBeVisible();
      await assertIdentity(page, state);
    }
    await captureIdentityScreenshot(page, testInfo, viewport.name);
  }
});

test("missing public profile emits no identity owners", async ({ page }) => {
  await page.goto(`${basePath}/identity-missing`, { waitUntil: "domcontentloaded" });
  for (const owner of identityOwners) {
    await expect(page.locator(`[data-stylex-owner="${owner}"]`)).toHaveCount(0);
  }
});

async function assertIdentity(
  page: Page,
  state: { email: boolean; edit: boolean; loginId: string },
) {
  const result = await page.evaluate(
    ({ emailVisible, editVisible, loginId }) => {
      const required = (owner: string) => {
        const node = document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`);
        if (!node) throw new Error(`missing ${owner}`);
        return node;
      };
      const whoami = required("user-profile-whoami");
      const name = required("user-profile-identity-name");
      const login = required("user-profile-identity-loginid");
      const email = document.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-identity-email"]',
      );
      const edit = document.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-identity-edit"]',
      );
      const info = required("user-profile-info");
      const avatar = required("user-profile-avatar-background");
      const since = required("user-profile-user-since");
      const whoamiBox = whoami.getBoundingClientRect();
      const infoBox = info.getBoundingClientRect();
      const avatarBox = avatar.getBoundingClientRect();
      const sinceBox = since.getBoundingClientRect();
      const directOwners = [whoami, ...Array.from(whoami.children)].filter((node) =>
        node.hasAttribute("data-stylex-owner"),
      );
      const classTokens = [whoami, name, login, ...(email ? [email] : []), ...(edit ? [edit] : [])]
        .flatMap((node) => Array.from(node.classList))
        .filter((token) =>
          ["whoami", "usf-group", "name", "loginid", "email", "edit"].includes(token),
        );
      const insideInfo = (node: HTMLElement) => {
        const box = node.getBoundingClientRect();
        return box.left >= infoBox.left && box.right <= infoBox.right + 1;
      };
      const children = Array.from(whoami.childNodes).map((node) =>
        node.nodeType === Node.TEXT_NODE
          ? { kind: "text", value: node.textContent }
          : {
              kind: (node as Element).tagName.toLowerCase(),
              owner: (node as Element).getAttribute("data-stylex-owner"),
            },
      );
      return {
        classTokens,
        children,
        counts: {
          directOwners: directOwners.length,
          edit: edit ? 1 : 0,
          email: email ? 1 : 0,
        },
        copy: {
          edit: edit?.textContent?.replace(/\s+/gu, " ").trim() ?? null,
          email: email?.textContent ?? null,
          login: login.textContent,
          name: name.textContent,
        },
        geometry: {
          avatarBeforeIdentity: avatarBox.bottom <= whoamiBox.top,
          contained: [
            whoami,
            name,
            login,
            ...(email ? [email] : []),
            ...(edit ? [edit] : []),
          ].every(insideInfo),
          identityBeforeSince: whoamiBox.bottom <= sinceBox.top,
          noHorizontalOverflow: document.documentElement.scrollWidth === window.innerWidth,
        },
        paint: {
          edit: edit
            ? {
                marginTop: getComputedStyle(edit).marginTop,
                textAlign: getComputedStyle(edit).textAlign,
              }
            : null,
          email: email?.ownerDocument.defaultView?.getComputedStyle(email).color ?? null,
          login: getComputedStyle(login).color,
          name: {
            fontSize: getComputedStyle(name).fontSize,
            fontWeight: getComputedStyle(name).fontWeight,
            marginRight: getComputedStyle(name).marginRight,
          },
          whoamiMarginTop: getComputedStyle(whoami).marginTop,
        },
        stateMatches: Boolean(email) === emailVisible && Boolean(edit) === editVisible,
        ownerOrder: directOwners.map((node) => node.getAttribute("data-stylex-owner")),
        loginId,
      };
    },
    { emailVisible: state.email, editVisible: state.edit, loginId: state.loginId },
  );

  expect(result.classTokens).toEqual([]);
  expect(result.stateMatches).toBe(true);
  expect(result.counts).toEqual({
    directOwners: 3 + Number(state.email) + Number(state.edit),
    edit: Number(state.edit),
    email: Number(state.email),
  });
  expect(result.copy).toEqual({
    edit: state.edit ? "Edit profile" : null,
    email: state.email ? "identity@example.com" : null,
    login: `@${state.loginId}`,
    name: "Identity",
  });
  expect(result.paint).toEqual({
    edit: state.edit ? { marginTop: "5px", textAlign: "right" } : null,
    email: state.email ? "rgb(51, 51, 51)" : null,
    login: "rgb(153, 153, 153)",
    name: { fontSize: "18px", fontWeight: "700", marginRight: "2px" },
    whoamiMarginTop: "15px",
  });
  expect(result.geometry).toEqual({
    avatarBeforeIdentity: true,
    contained: true,
    identityBeforeSince: true,
    noHorizontalOverflow: true,
  });
  expect(result.ownerOrder).toEqual([
    "user-profile-whoami",
    "user-profile-identity-name",
    "user-profile-identity-loginid",
    ...(state.email ? ["user-profile-identity-email"] : []),
    ...(state.edit ? ["user-profile-identity-edit"] : []),
  ]);
  expect(result.children).toEqual([
    { kind: "span", owner: "user-profile-identity-name" },
    { kind: "text", value: " " },
    { kind: "span", owner: "user-profile-identity-loginid" },
    { kind: "text", value: " " },
    ...(state.email ? [{ kind: "span", owner: "user-profile-identity-email" }] : []),
    ...(state.edit ? [{ kind: "div", owner: "user-profile-identity-edit" }] : []),
  ]);
}

async function captureIdentityScreenshot(page: Page, testInfo: TestInfo, viewport: string) {
  await page.goto(`${basePath}/identity-all`, { waitUntil: "domcontentloaded" });
  const outputDirectory = resolve(
    process.cwd(),
    "output/playwright/stylex-user-profile-identity-classes",
  );
  mkdirSync(outputDirectory, { recursive: true });
  const screenshot = await page
    .locator('[data-stylex-owner="user-profile-info"]')
    .screenshot({ path: resolve(outputDirectory, `identity-${viewport}.png`) });
  await testInfo.attach(`identity-${viewport}`, {
    body: screenshot,
    contentType: "image/png",
  });
}
