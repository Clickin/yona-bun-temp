import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const owners = {
  button: "site-user-list-title-search-button",
  form: "site-user-list-title-search-form",
  icon: "site-user-list-title-search-icon",
  input: "site-user-list-title-search-input",
  wrapper: "site-user-list-title-search-wrapper",
} as const;

test("title search controls preserve frozen desktop and mobile output and submit behavior", async ({
  page,
}) => {
  await installFixture(page);
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const form = page.locator(`[data-owner="${owners.form}"]`);
    const wrapper = page.locator(`[data-owner="${owners.wrapper}"]`);
    const input = page.locator(`[data-owner="${owners.input}"]`);
    const button = page.locator(`[data-owner="${owners.button}"]`);
    const icon = page.locator(`[data-owner="${owners.icon}"]`);
    await expect(form).toHaveCount(1);
    await expect(wrapper.locator(":scope > input[type=hidden][name=state]")).toHaveCount(0);
    await expect(form.locator(":scope > input[type=hidden][name=state]")).toHaveValue("ACTIVE");
    await expect(wrapper.locator(":scope > input[name=query] + button[type=submit]")).toHaveCount(
      1,
    );
    await expect(input).toHaveAttribute("placeholder", "Find user by login ID, user name or email");
    await expect(button.locator(`:scope > [data-owner="${owners.icon}"]`)).toHaveCount(1);

    const geometry = await form.evaluate((formNode) => {
      const title = formNode.parentElement!.getBoundingClientRect();
      const formRect = formNode.getBoundingClientRect();
      const wrapperRect = formNode.querySelector("div")!.getBoundingClientRect();
      const inputRect = formNode.querySelector("input[name=query]")!.getBoundingClientRect();
      const buttonRect = formNode.querySelector("button")!.getBoundingClientRect();
      return {
        button: buttonRect.toJSON(),
        form: formRect.toJSON(),
        input: inputRect.toJSON(),
        title: title.toJSON(),
        wrapper: wrapperRect.toJSON(),
      };
    });
    expect(geometry.form.right).toBeCloseTo(geometry.title.right, 2);
    expect(geometry.input.left).toBeCloseTo(geometry.wrapper.left + 1, 2);
    expect(geometry.button.right).toBeLessThanOrEqual(geometry.wrapper.right);
    expect(geometry.button.top).toBeGreaterThanOrEqual(geometry.wrapper.top);
    // F5 dist-truth (2026-08-13): the site-admin search textbox resolves to
    // 360px total — legacy _yobiUI.less:1357 .search-bar .textbox is
    // content-box width:350px + padding:0 5px (the baseline site-admin specs
    // pin the same 360px total).
    if (viewport.name === "desktop") expect(geometry.input.width).toBe(360);
    else expect(geometry.wrapper.top - geometry.form.top).toBe(5);

    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `style-site-user-list-search-controls-${viewport.name}.png`,
      ),
    });

    await form.evaluate((formNode) => {
      const host = document.createElement("div");
      host.id = "search-controls-frozen-fixture";
      host.className = "site-setting-wrap";
      host.style.cssText = `position:fixed;left:0;top:0;z-index:2147483647;width:${formNode.parentElement!.getBoundingClientRect().width}px`;
      host.innerHTML =
        '<div class="title_area"><h2 class="pull-left">Users</h2><form class="form-search pull-right"><input type="hidden" name="state" value="ACTIVE"><div class="search-bar"><input class="textbox" name="query" type="text" placeholder="Find user by login ID, user name or email"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></form></div>';
      document.body.append(host);
    });
    const frozenForm = page.locator("#search-controls-frozen-fixture form");
    const frozenWrapper = frozenForm.locator(".search-bar");
    const frozenInput = frozenForm.locator(".textbox");
    const frozenButton = frozenForm.locator(".search-btn");
    const frozenIcon = frozenButton.locator(".yobicon-search");
    // F5 dist-truth (2026-08-20): post-merge the pipeline converts the yobi
    // placeholder vendor rules to :is(input:placeholder-shown) — an EMPTY
    // input (the frozen fixture has no route-owned color rule) computes #999.
    // Type a value so the frozen side lands in the same non-placeholder state
    // as the actual input (which keeps #555 via its route-owned var rule).
    await frozenInput.fill("x");
    // fill() leaves focus on the frozen input — the bootstrap focus rule
    // (border-color #f36c22 !important) would leak into the base snapshot.
    await frozenInput.evaluate((el) => (el as HTMLInputElement).blur());
    const relativeGeometry = (locator: typeof form) =>
      locator.evaluate((formNode) => {
        const formRect = formNode.getBoundingClientRect();
        const wrapperRect = formNode.querySelector("div")!.getBoundingClientRect();
        const inputRect = formNode.querySelector("input[name=query]")!.getBoundingClientRect();
        const buttonRect = formNode.querySelector("button")!.getBoundingClientRect();
        const round = (value: number) => Math.round(value * 100) / 100;
        return {
          button: {
            height: round(buttonRect.height),
            right: round(buttonRect.right - wrapperRect.right),
            top: round(buttonRect.top - wrapperRect.top),
            width: round(buttonRect.width),
          },
          input: {
            height: round(inputRect.height),
            left: round(inputRect.left - wrapperRect.left),
            top: round(inputRect.top - wrapperRect.top),
            width: round(inputRect.width),
          },
          wrapper: {
            height: round(wrapperRect.height),
            right: round(wrapperRect.right - formRect.right),
            top: round(wrapperRect.top - formRect.top),
            width: round(wrapperRect.width),
          },
        };
      });
    const actualRelativeGeometry = await relativeGeometry(form);
    const frozenRelativeGeometry = await relativeGeometry(frozenForm);
    expect(actualRelativeGeometry).toEqual(frozenRelativeGeometry);
    const computed = (locator: typeof form) =>
      locator.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          background: style.backgroundColor,
          border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          color: style.color,
          display: style.display,
          float: style.cssFloat,
          font: `${style.fontWeight} ${style.fontSize}/${style.lineHeight} ${style.fontFamily}`,
          height: style.height,
          margin: style.margin,
          outline: style.outline,
          padding: style.padding,
          position: style.position,
          transition: style.transition,
          verticalAlign: style.verticalAlign,
          width: style.width,
        };
      });
    const actualFormBase = await computed(form);
    const frozenFormBase = await computed(frozenForm);
    const actualWrapperBase = await computed(wrapper);
    const frozenWrapperBase = await computed(frozenWrapper);
    const actualInputBase = await computed(input);
    const frozenInputBase = await computed(frozenInput);
    expect(actualFormBase).toEqual(frozenFormBase);
    expect(actualWrapperBase).toEqual(frozenWrapperBase);
    expect(actualInputBase).toEqual(frozenInputBase);
    expect(actualInputBase.font).toBe(
      `400 ${viewport.name === "desktop" ? "12px" : "16px"}/20px "Helvetica Neue", Helvetica, Arial, sans-serif`,
    );
    expect(await computed(button)).toEqual(await computed(frozenButton));
    const iconEvidence = async (locator: typeof icon) =>
      locator.evaluate((node) => {
        const style = getComputedStyle(node);
        const before = getComputedStyle(node, "::before");
        const rect = node.getBoundingClientRect();
        return {
          computed: {
            backgroundImage: style.backgroundImage,
            display: style.display,
            fontFamily: style.fontFamily,
            fontStyle: style.fontStyle,
            fontVariant: style.fontVariant,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            textDecoration: style.textDecoration,
            verticalAlign: style.verticalAlign,
          },
          glyph: before.content,
          rect: { height: rect.height, width: rect.width },
        };
      });
    const actualIcon = await iconEvidence(icon);
    const frozenIconEvidence = await iconEvidence(frozenIcon);
    expect(actualIcon).toEqual(frozenIconEvidence);
    expect(actualIcon).toMatchObject({
      computed: {
        backgroundImage: "none",
        display: "inline-block",
        fontFamily: "yobicon",
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: "400",
        verticalAlign: "baseline",
      },
      glyph: '""',
    });
    const focusedSnapshot = async (locator: typeof input) => {
      await locator.focus();
      await expect(locator).toBeFocused();
      await locator.evaluate(
        (node) =>
          new Promise<void>((resolveAnimation) =>
            requestAnimationFrame(() => {
              node.getAnimations().forEach((animation) => animation.finish());
              resolveAnimation();
            }),
          ),
      );
      return computed(locator);
    };
    const actualInputFocus = await focusedSnapshot(input);
    const frozenInputFocus = await focusedSnapshot(frozenInput);
    expect(actualInputFocus).toEqual(frozenInputFocus);
    const actualButtonFocus = await focusedSnapshot(button);
    const frozenButtonFocus = await focusedSnapshot(frozenButton);
    expect(actualButtonFocus).toEqual(frozenButtonFocus);
    await page.locator("#search-controls-frozen-fixture").evaluate((node) => node.remove());

    await input.fill("alice smith");
    await button.click();
    await expect.poll(() => new URL(page.url()).searchParams.get("query")).toBe("alice smith");
    const submittedUrl = new URL(page.url());
    const basePath = (process.env.YONA_DEV_BASE_PATH ?? "/yona").replace(/\/$/, "");
    expect(submittedUrl.pathname).toBe(`${basePath}/sites/userList`);
    expect(Object.fromEntries(submittedUrl.searchParams)).toEqual({
      pageNum: "1",
      query: "alice smith",
      state: "ACTIVE",
    });
  }
});

async function installFixture(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
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
        query: new URL(route.request().url()).searchParams.get("query") ?? "",
        siteAdminCount: 0,
        state: "ACTIVE",
        total: 0,
        totalPages: 0,
        users: [],
      },
    }),
  );
}
