import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

test("row action wrapper and semantic buttons own the frozen ybtn surface", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme = readFileSync("src/routes/sites/-userList.stylex.ts", "utf8");
  const siteAdminApi = readFileSync("src/api/site-admin.ts", "utf8");
  const authWorkspaceClient = readFileSync("src/auth-workspace-client.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  expect(legacy).toContain('class="span5 listitem-col action-buttons"');
  expect(yobiUi).toContain(".ybtn, .flat > li > .ybtn");
  expect(yobiUi).toContain("&:hover, &:focus, &:active, &:focus, &.disabled, &[disabled]");
  expect(yobiUi).toContain("background-color:#f1f1f1");
  expect(yobiUi).toContain("&.ybtn-success {");
  expect(yobiUi).toContain("&:hover, &:focus, &:active, &:focus {");
  expect(yobiUi).toContain("&.ybtn-info {");
  expect(yobiUi).toContain("&.ybtn-danger {");
  expect(yobiUi).toMatch(/&\.ybtn-success \{[\s\S]*?&:hover, &:focus, &:active, &:focus \{/);
  expect(yobiUi).toMatch(/&\.ybtn-info \{[\s\S]*?&:hover, &:focus \{/);
  expect(yobiUi).toMatch(/&\.ybtn-danger \{[\s\S]*?&:hover, &:focus \{/);
  expect(bootstrap).toContain(".label-info,");
  expect(bootstrap).toContain("background-color: #3a87ad;");
  expect(route).toContain('data-stylex-owner="site-user-list-row-action"');
  expect(route).toContain('data-stylex-owner="site-user-list-row-action-button"');
  for (const retired of [
    "action-buttons",
    "ybtn ybtn-small",
    "ybtn-success",
    "ybtn-info",
    "ybtn-danger",
    "label-info",
  ])
    expect(route).not.toContain(`className="${retired}"`);
  expect(route).not.toContain("LEGACY_ACTION_ANCHOR_BUTTON_STYLE");
  expect(route).toContain("actionDangerButtonStyleProps");
  for (const paint of [
    "actionDefaultSurface",
    "actionPrimary",
    "actionInfo",
    "actionDanger",
    "actionShadow",
  ])
    expect(theme).toContain(paint);
  expect(route).not.toContain("globalColors.");
  expect(siteAdminApi).toContain("function siteUserPath(");
  expect(siteAdminApi).toContain("/${action}/toggle`");
  expect(authWorkspaceClient).toContain("export async function readSessionBootstrap(");
  expect(authWorkspaceClient).toContain('response.headers.get("x-csrf-token")');
});

test("five ACTIVE actions preserve order, output, geometry, and behavior boundary", async ({
  page,
}) => {
  const mutations: string[] = [];
  await installFixture(page, mutations);
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const wrappers = page.locator('[data-stylex-owner="site-user-list-row-action"]');
    await expect(wrappers).toHaveCount(2);
    const wrapper = wrappers.first();
    const variantWrapper = wrappers.nth(1);
    const buttons = wrapper.locator(
      ':scope > [data-stylex-owner="site-user-list-row-action-button"]',
    );
    const variantButtons = variantWrapper.locator(
      ':scope > [data-stylex-owner="site-user-list-row-action-button"]',
    );
    await expect(buttons).toHaveCount(5);
    await expect(buttons).toHaveText([
      "Make Guest",
      "Lock account",
      "Reset password",
      "Upgrade to Site admin",
      "Delete",
    ]);
    expect(
      await buttons.evaluateAll((nodes) =>
        nodes.map((node) => ({
          action: node.getAttribute("data-action"),
          legacy: [
            "ybtn",
            "ybtn-small",
            "ybtn-success",
            "ybtn-info",
            "ybtn-danger",
            "label-info",
          ].some((token) => node.classList.contains(token)),
          type: (node as HTMLButtonElement).type,
        })),
      ),
    ).toEqual([
      { action: "guest", legacy: false, type: "button" },
      { action: "account-lock", legacy: false, type: "button" },
      { action: "reset-password", legacy: false, type: "button" },
      { action: "site-admin", legacy: false, type: "button" },
      { action: "delete", legacy: false, type: "button" },
    ]);
    await expect(
      wrapper.locator("[data-request-method], [data-request-uri], [data-toggle], [data-href]"),
    ).toHaveCount(0);
    const wrapperBox = await wrapper.evaluate((node) => node.getBoundingClientRect().toJSON());
    const evidence = await buttons.evaluateAll((nodes) =>
      nodes.map((node) => {
        const s = getComputedStyle(node);
        const b = node.getBoundingClientRect();
        return {
          background: s.backgroundColor,
          border: s.borderColor,
          box: b.toJSON(),
          color: s.color,
          display: s.display,
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          margin: s.margin,
          padding: s.padding,
          radius: s.borderRadius,
          shadow: s.boxShadow,
        };
      }),
    );
    for (const item of evidence)
      expect(item).toMatchObject({
        display: "inline-block",
        fontSize: "13px",
        lineHeight: "20px",
        padding: "3px 10px",
        radius: "3px",
        shadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      });
    expect(evidence.map((item) => item.margin)).toEqual(["2px", "2px", "2px", "2px", "2px"]);
    for (const [index, item] of evidence.entries()) {
      expect(item.box.left).toBeGreaterThanOrEqual(wrapperBox.left);
      if (index) expect(item.box.top).toBeGreaterThanOrEqual(evidence[index - 1].box.top);
    }
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `stylex-site-user-list-row-actions-${viewport.name}.png`,
      ),
    });
    const fallback = await wrapper.evaluate((node) => {
      const legacyFixture = document.createElement("div");
      legacyFixture.id = "row-actions-legacy-fixtures";
      legacyFixture.className = "site-setting-wrap";
      legacyFixture.style.cssText = `position:fixed;left:0;top:0;z-index:2147483647;width:${node.getBoundingClientRect().width}px`;
      const legacyLabelInfoStyle = document.createElement("style");
      legacyLabelInfoStyle.id = "row-actions-label-info-base-style";
      legacyLabelInfoStyle.textContent =
        "@layer legacy { .legacy-label-info-fixture { background-color: #3a87ad; } }";
      legacyFixture.append(legacyLabelInfoStyle);
      const row = document.createElement("div");
      row.className = "listitem";
      row.style.display = "flow-root";
      const fixture = document.createElement("div");
      fixture.id = "row-actions-fallback";
      fixture.className = "span5 listitem-col action-buttons";
      fixture.style.width = `${node.getBoundingClientRect().width}px`;
      fixture.innerHTML =
        '<a class="ybtn ybtn-small" tabindex="-1">Make Guest</a><a class="ybtn ybtn-small" tabindex="-1">Lock account</a><a class="ybtn ybtn-small" tabindex="-1">Reset password</a><a class="ybtn ybtn-small legacy-label-info-fixture" tabindex="-1">Upgrade to Site admin</a><a class="ybtn ybtn-small ybtn-danger" tabindex="-1">Delete</a>';
      row.append(fixture);
      legacyFixture.append(row);
      const variantRow = row.cloneNode(false) as HTMLElement;
      const variantFixture = fixture.cloneNode(false) as HTMLElement;
      variantFixture.id = "row-actions-variant-fallback";
      variantFixture.innerHTML =
        '<a class="ybtn ybtn-small ybtn-success" tabindex="-1">Make Normal</a><a class="ybtn ybtn-small" tabindex="-1">Lock account</a><a class="ybtn ybtn-small" tabindex="-1">Reset password</a><a class="ybtn ybtn-small ybtn-info" tabindex="-1">Revoke site admin role</a><a class="ybtn ybtn-small ybtn-danger" tabindex="-1">Delete</a>';
      variantRow.append(variantFixture);
      legacyFixture.append(variantRow);
      document.body.append(legacyFixture);
      return Array.from(fixture.children, (button) => {
        const s = getComputedStyle(button);
        return {
          background: s.backgroundColor,
          border: s.borderColor,
          color: s.color,
          display: s.display,
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          margin: s.margin,
          padding: s.padding,
          radius: s.borderRadius,
          shadow: s.boxShadow,
        };
      });
    });
    expect(evidence.map(({ box: _, ...style }) => style)).toEqual(fallback);
    const variantStyle = (locator: typeof variantButtons) =>
      locator.evaluateAll((nodes) =>
        nodes.map((node) => {
          const s = getComputedStyle(node);
          return {
            background: s.backgroundColor,
            border: s.borderColor,
            color: s.color,
            display: s.display,
            fontSize: s.fontSize,
            lineHeight: s.lineHeight,
            margin: s.margin,
            padding: s.padding,
            radius: s.borderRadius,
            shadow: s.boxShadow,
          };
        }),
      );
    expect(await variantStyle(variantButtons)).toEqual(
      await variantStyle(page.locator("#row-actions-variant-fallback > a")),
    );
    const fallbackButtons = page.locator("#row-actions-fallback > a");
    const relativeGeometry = (locator: typeof wrapper) =>
      locator.evaluate((node) => {
        const wrapperRect = node.getBoundingClientRect();
        const round = (value: number) => Math.round(value * 100) / 100;
        return {
          children: Array.from(node.children, (child) => {
            const rect = child.getBoundingClientRect();
            return {
              height: round(rect.height),
              left: round(rect.left - wrapperRect.left),
              right: round(rect.right - wrapperRect.right),
              top: round(rect.top - wrapperRect.top),
              width: round(rect.width),
            };
          }),
          wrapper: { height: round(wrapperRect.height), width: round(wrapperRect.width) },
        };
      });
    const actualGeometry = await relativeGeometry(wrapper);
    const fallbackGeometry = await relativeGeometry(page.locator("#row-actions-fallback"));
    expect(fallbackGeometry).toEqual(actualGeometry);
    for (const geometry of [actualGeometry, fallbackGeometry]) {
      const tops = geometry.children.map((child) => child.top);
      expect(tops).toEqual([...tops].sort((left, right) => left - right));
    }
    expect(new Set(fallbackGeometry.children.map((child) => child.top)).size).toBe(
      new Set(actualGeometry.children.map((child) => child.top)).size,
    );
    const computed = (locator: typeof buttons, index: number) =>
      locator.nth(index).evaluate((node) => {
        const s = getComputedStyle(node);
        return {
          background: s.backgroundColor,
          border: s.borderColor,
          color: s.color,
          decoration: s.textDecorationLine,
        };
      });
    const activate = async (locator: typeof buttons, index: number, state: "hover" | "focus") => {
      const target = locator.nth(index);
      if (state === "hover") {
        await target.hover();
        expect(await target.evaluate((node) => node.matches(":hover")), `${index}:${state}`).toBe(
          true,
        );
      } else {
        await target.focus();
        expect(
          await target.evaluate((node) => document.activeElement === node),
          `${index}:${state}`,
        ).toBe(true);
      }
      await target.evaluate(
        (node) =>
          new Promise<void>((resolveAnimation) =>
            requestAnimationFrame(() => {
              node.getAnimations().forEach((animation) => animation.finish());
              resolveAnimation();
            }),
          ),
      );
    };
    for (const index of [0]) {
      for (const state of ["hover", "focus"] as const) {
        await activate(buttons, index, state);
        const actualState = await computed(buttons, index);
        await activate(fallbackButtons, index, state);
        expect(await computed(fallbackButtons, index), `${index}:${state}`).toEqual(actualState);
      }
    }
    const stateLiterals = [
      {
        index: 3,
        locator: buttons,
        background: "rgb(241, 241, 241)",
        border: "rgba(0, 0, 0, 0.25)",
        color: "rgb(41, 41, 41)",
      },
      {
        index: 4,
        locator: buttons,
        background: "rgb(177, 52, 39)",
        border: "rgb(177, 52, 39)",
        color: "rgb(255, 255, 255)",
      },
      {
        index: 0,
        locator: variantButtons,
        background: "rgb(233, 94, 1)",
        border: "rgb(233, 94, 1)",
        color: "rgb(255, 255, 255)",
      },
      {
        index: 3,
        locator: variantButtons,
        background: "rgb(32, 110, 229)",
        border: "rgb(32, 110, 229)",
        color: "rgb(255, 255, 255)",
      },
    ];
    for (const { locator, index, ...literal } of stateLiterals) {
      for (const state of ["hover", "focus"] as const) {
        await activate(locator, index, state);
        expect(await computed(locator, index), `${index}:${state}`).toEqual({
          ...literal,
          decoration: "none",
        });
      }
    }
    await page.locator("#row-actions-legacy-fixtures").evaluate((node) => node.remove());
    const active = async (locator: typeof buttons, index: number) => {
      const target = locator.nth(index);
      await target.hover();
      await page.mouse.down();
      expect(await target.evaluate((node) => node.matches(":active")), `${index}:active`).toBe(
        true,
      );
      await target.evaluate(
        (node) =>
          new Promise<void>((resolveAnimation) =>
            requestAnimationFrame(() => {
              node.getAnimations().forEach((animation) => animation.finish());
              resolveAnimation();
            }),
          ),
      );
      const settled = await computed(locator, index);
      await page.mouse.move(viewport.width - 1, viewport.height - 1);
      await page.mouse.up();
      return settled;
    };
    for (const variant of [
      {
        index: 0,
        locator: buttons,
        literal: {
          background: "rgb(241, 241, 241)",
          border: "rgba(0, 0, 0, 0.25)",
          color: "rgb(41, 41, 41)",
        },
      },
      {
        index: 3,
        locator: buttons,
        literal: {
          background: "rgb(241, 241, 241)",
          border: "rgba(0, 0, 0, 0.25)",
          color: "rgb(41, 41, 41)",
        },
      },
      {
        index: 4,
        locator: buttons,
        literal: {
          background: "rgb(201, 52, 38)",
          border: "rgb(177, 52, 39)",
          color: "rgb(255, 255, 255)",
        },
      },
      {
        index: 0,
        locator: variantButtons,
        literal: {
          background: "rgb(233, 94, 1)",
          border: "rgb(233, 94, 1)",
          color: "rgb(255, 255, 255)",
        },
      },
      {
        index: 3,
        locator: variantButtons,
        literal: {
          background: "rgb(58, 126, 229)",
          border: "rgb(32, 110, 229)",
          color: "rgb(255, 255, 255)",
        },
      },
    ])
      expect(await active(variant.locator, variant.index), `${variant.index}:active`).toEqual({
        ...variant.literal,
        decoration: "none",
      });
    await buttons.nth(0).click();
    await expect.poll(() => mutations).toContain("guest");
    await buttons.nth(4).click();
    await expect(page.locator("#alertDeletionWrap")).toHaveClass("modal fade in");
  }
});

async function installFixture(page: Page, mutations: string[]) {
  const basePath = (process.env.YONA_DEV_BASE_PATH ?? "/yona").replace(/\/$/, "");
  const session = (route: Route) =>
    route.fulfill({
      headers: { "x-csrf-token": "e2e-csrf" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 1,
        state: "ACTIVE",
        total: 1,
        totalPages: 1,
        users: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            createdAt: "2026-06-28",
            displayName: "Alice",
            emailAddress: "alice@example.com",
            id: 1,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "",
            loginId: "alice",
            state: "ACTIVE",
          },
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            createdAt: "2026-06-28",
            displayName: "Bob",
            emailAddress: "bob@example.com",
            id: 2,
            isGuest: true,
            isSiteAdmin: true,
            lastStateModifiedAt: "",
            loginId: "bob",
            state: "ACTIVE",
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/site/users/alice/guest/toggle", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(new URL(route.request().url()).pathname).toBe(
      `${basePath}/api/v1/site/users/alice/guest/toggle`,
    );
    expect(route.request().headers()["x-csrf-token"]).toBe("e2e-csrf");
    mutations.push("guest");
    await route.fulfill({ json: {} });
  });
}
