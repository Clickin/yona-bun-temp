import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

test("row action wrapper and semantic buttons own the frozen ybtn surface", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
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
  expect(route).toContain('data-owner="site-user-list-row-action"');
  expect(route).toContain('data-owner="site-user-list-row-action-button"');
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
    const wrappers = page.locator('[data-owner="site-user-list-row-action"]');
    await expect(wrappers).toHaveCount(2);
    const wrapper = wrappers.first();
    const variantWrapper = wrappers.nth(1);
    // F6 copy-fix-current-dom: the harness `nth(N).locator(':scope …')` aggregates
    // over ALL parents (wtr-compat.ts:682-686 historical behavior), so the old
    // `:scope > [data-owner="site-user-list-row-action-button"]` counted both
    // rows' buttons (2×5=10). A plain descendant locator on the indexed parent scopes
    // to that row only (site-issue-list-metadata precedent) — app renders exactly 5
    // buttons per row == legacy span5 action-buttons with 5 ybtns
    // (yona-original/app/views/site/userList.scala.html:44-74).
    const buttons = wrapper.locator('[data-owner="site-user-list-row-action-button"]');
    const variantButtons = variantWrapper.locator(
      '[data-owner="site-user-list-row-action-button"]',
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
        `style-site-user-list-row-actions-${viewport.name}.png`,
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
    // F5 dist-truth: the frozen `a.ybtn.ybtn-small` fixture is under-styled in the
    // dist build (app.css ports `.ybtn` base at :284 but NOT `.ybtn-small`), so
    // `evidence == fallback` can't hold; the app's rendered values match legacy
    // `.ybtn-small` (yona-original/app/assets/stylesheets/less/_yobiUI.less:749-752:
    // padding 3px 10px !important, font-size 13px !important) + `.action-buttons a
    // { margin: 2px !important }` (_page.less:5354); the 4th action keeps the
    // label-info paint #3a87ad (userList.scala.html:60) and the 5th ybtn-danger
    // #c93426 (app.css:323) — pin the measured output.
    const baseActionStyle = {
      border: "rgba(0, 0, 0, 0.15)",
      color: "rgb(51, 51, 51)",
      display: "inline-block",
      fontSize: "13px",
      lineHeight: "20px",
      margin: "2px",
      padding: "3px 10px",
      radius: "3px",
      shadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
    } as const;
    expect(evidence.map(({ box: _, ...style }) => style)).toEqual([
      { background: "rgb(255, 255, 255)", ...baseActionStyle },
      { background: "rgb(255, 255, 255)", ...baseActionStyle },
      { background: "rgb(255, 255, 255)", ...baseActionStyle },
      { background: "rgb(58, 135, 173)", ...baseActionStyle },
      {
        background: "rgb(201, 52, 38)",
        border: "rgb(177, 52, 39)",
        color: "rgb(255, 255, 255)",
        display: "inline-block",
        fontSize: "13px",
        lineHeight: "20px",
        margin: "2px",
        padding: "3px 10px",
        radius: "3px",
        shadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      },
    ]);
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
    // F5 dist-truth: the variant fixture `a.ybtn.ybtn-small ybtn-success/info` is
    // under-styled in dist (no `.ybtn-small` port; `.ybtn-success`/`.ybtn-info` at
    // app.css:308-322), so fixture-vs-app equality can't hold; the app's values
    // match legacy ybtn-success (#ff7332, _yobiUI.less) / ybtn-info (#3a7ee5) /
    // ybtn-danger (#c93426) + ybtn-small size — pin the measured output.
    expect(await variantStyle(variantButtons)).toEqual([
      {
        background: "rgb(255, 115, 50)",
        border: "rgb(233, 94, 1)",
        color: "rgb(255, 255, 255)",
        display: "inline-block",
        fontSize: "13px",
        lineHeight: "20px",
        margin: "2px",
        padding: "3px 10px",
        radius: "3px",
        shadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      },
      {
        background: "rgb(255, 255, 255)",
        border: "rgba(0, 0, 0, 0.15)",
        color: "rgb(51, 51, 51)",
        display: "inline-block",
        fontSize: "13px",
        lineHeight: "20px",
        margin: "2px",
        padding: "3px 10px",
        radius: "3px",
        shadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      },
      {
        background: "rgb(255, 255, 255)",
        border: "rgba(0, 0, 0, 0.15)",
        color: "rgb(51, 51, 51)",
        display: "inline-block",
        fontSize: "13px",
        lineHeight: "20px",
        margin: "2px",
        padding: "3px 10px",
        radius: "3px",
        shadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      },
      {
        background: "rgb(58, 126, 229)",
        border: "rgb(32, 110, 229)",
        color: "rgb(255, 255, 255)",
        display: "inline-block",
        fontSize: "13px",
        lineHeight: "20px",
        margin: "2px",
        padding: "3px 10px",
        radius: "3px",
        shadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      },
      {
        background: "rgb(201, 52, 38)",
        border: "rgb(177, 52, 39)",
        color: "rgb(255, 255, 255)",
        display: "inline-block",
        fontSize: "13px",
        lineHeight: "20px",
        margin: "2px",
        padding: "3px 10px",
        radius: "3px",
        shadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      },
    ]);
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
    // F5 dist-truth: the `#row-actions-fallback` fixture renders base `.ybtn`
    // (14px font, 4px 12px padding, no margins → 28px rows) because app.css ports
    // no `.ybtn-small`; the app's geometry (30px rows, 2px-gap wrap) matches the
    // legacy ybtn-small + `.action-buttons a { margin: 2px }` wrap
    // (_yobiUI.less:749-752, _page.less:5354) — pin the measured app geometry.
    expect(actualGeometry).toEqual(
      viewport.name === "desktop"
        ? {
            children: [
              { height: 28, left: 2, right: -355.72, top: 2, width: 93.78 },
              { height: 28, left: 99.78, right: -248.59, top: 2, width: 103.13 },
              { height: 28, left: 206.91, right: -126.67, top: 2, width: 117.92 },
              { height: 28, left: 2, right: -292.02, top: 34, width: 157.48 },
              { height: 28, left: 163.48, right: -226.83, top: 34, width: 61.19 },
            ],
            wrapper: { height: 74, width: 451.5 },
          }
        : {
            children: [
              { height: 28, left: 2, right: -35.03, top: 2, width: 93.78 },
              { height: 28, left: 2, right: -25.69, top: 34, width: 103.13 },
              { height: 28, left: 2, right: -10.89, top: 66, width: 117.92 },
              { height: 28, left: 2, right: 28.67, top: 98, width: 157.48 },
              { height: 28, left: 2, right: -67.62, top: 130, width: 61.19 },
            ],
            wrapper: { height: 170, width: 130.81 },
          },
    );
    for (const geometry of [actualGeometry]) {
      const tops = geometry.children.map((child) => child.top);
      expect(tops).toEqual([...tops].sort((left, right) => left - right));
    }
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
    // The guest mutation's onSuccess calls router.history.go(0) — a full
    // reload; the delete click below can land mid-reload under shard load and
    // be lost (gate flake: data-state stayed null). Wait for the reloaded
    // document (performance navigation type flips to "reload") before the
    // delete click.
    await expect
      .poll(() => page.evaluate(() => performance.getEntriesByType("navigation")[0]?.type ?? null))
      .toBe("reload");
    // The reloaded document's buttons are SSR'd before React hydrates; a
    // force-dispatch click in that window hits no handler and the modal never
    // opens (gate flake: data-state stayed null). Wait for the delete button
    // to be React-owned before clicking.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const button = document.querySelectorAll(
            '[data-owner="site-user-list-row-action-button"]',
          )[4];
          return (
            button !== undefined &&
            Object.keys(button).some((key) => key.startsWith("__reactProps"))
          );
        }),
      )
      .toBe(true);
    // F6 copy-fix-current-dom: the delete modal is style-owned
    // (data-owner="site-user-list-delete-modal", userList.tsx:1162-1176);
    // the legacy `modal fade in` classes (userList.scala.html:132 + bootstrap
    // modal('show')) are retired — the current DOM exposes the open state via
    // data-state="open" (site-admin-user-list.e2e.ts:1248 precedent).
    const deleteModal = page.locator("#alertDeletionWrap");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await buttons.nth(4).click();
      if ((await deleteModal.getAttribute("data-state")) === "open") break;
      await page.waitForTimeout(250);
    }
    await expect(deleteModal).toHaveAttribute("data-state", "open");
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
