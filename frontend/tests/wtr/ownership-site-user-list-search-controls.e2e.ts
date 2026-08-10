import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

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

test("title search controls retire the bounded legacy fallback", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobicon = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");
  expect(legacy).toContain('<form class="form-search pull-right"');
  expect(legacy).toContain('<div class="search-bar">');
  expect(legacy).toContain('<input class="textbox" name="query" type="text"');
  expect(legacy).toContain('<button type="submit" class="search-btn">');
  expect(yobiUi).toContain(".search-bar {");
  expect(yobiUi).toContain("width:350px;");
  expect(yobiUi).toContain(".search-btn {");
  expect(responsive).toContain("margin: 5px 0;");
  expect(responsive).toContain("width: inherit !important;");
  expect(bootstrap).toContain(".form-search input,");
  expect(bootstrap).toContain("float: right;");
  for (const owner of Object.values(owners)) expect(route).toContain(`data-owner="${owner}"`);
  for (const retired of ["form-search", "pull-right", "search-bar", "textbox", "search-btn"])
    expect(route).not.toContain(`className="${retired}"`);
  expect(yobicon).toContain('[class^="yobicon-"]');

  expect(route).not.toContain('className="yobicon-search"');
  expect(route).toContain('data-owner="site-user-list-title-search-icon"');
});

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
    await expect(icon).not.toHaveClass(/\byobicon-search\b/u);
    await expect(
      form.locator("[data-toggle], [data-request-method], [data-request-uri]"),
    ).toHaveCount(0);
    for (const retired of ["form-search", "pull-right", "search-bar", "textbox", "search-btn"])
      await expect(form.locator(`.${retired}`)).toHaveCount(0);

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
    if (viewport.name === "desktop") {
      expect(actualRelativeGeometry).toEqual(frozenRelativeGeometry);
    } else {
      const withoutResponsiveWidths = (geometry: typeof actualRelativeGeometry) => ({
        ...geometry,
        input: { ...geometry.input, width: undefined },
        wrapper: { ...geometry.wrapper, width: undefined },
      });
      expect(withoutResponsiveWidths(actualRelativeGeometry)).toEqual(
        withoutResponsiveWidths(frozenRelativeGeometry),
      );
      expect({
        input: actualRelativeGeometry.input.width,
        wrapper: actualRelativeGeometry.wrapper.width,
      }).toEqual({ input: 183, wrapper: 205 });
      expect({
        input: frozenRelativeGeometry.input.width,
        wrapper: frozenRelativeGeometry.wrapper.width,
      }).toEqual({ input: 185, wrapper: 207 });
    }
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
    const withoutFont = ({ font: _, ...style }: Awaited<ReturnType<typeof computed>>) => style;
    const withoutWidth = ({ width: _, ...style }: Awaited<ReturnType<typeof computed>>) => style;
    const withoutFontAndWidth = ({
      font: _,
      width: __,
      ...style
    }: Awaited<ReturnType<typeof computed>>) => style;
    if (viewport.name === "desktop") {
      expect(actualFormBase).toEqual(frozenFormBase);
      expect(actualWrapperBase).toEqual(frozenWrapperBase);
      expect(withoutFont(actualInputBase)).toEqual(withoutFont(frozenInputBase));
    } else {
      expect(withoutWidth(actualFormBase)).toEqual(withoutWidth(frozenFormBase));
      expect(withoutWidth(actualWrapperBase)).toEqual(withoutWidth(frozenWrapperBase));
      expect(withoutFontAndWidth(actualInputBase)).toEqual(withoutFontAndWidth(frozenInputBase));
      expect({
        form: actualFormBase.width,
        input: actualInputBase.width,
        wrapper: actualWrapperBase.width,
      }).toEqual({ form: "205px", input: "173px", wrapper: "173px" });
      expect({
        form: frozenFormBase.width,
        input: frozenInputBase.width,
        wrapper: frozenWrapperBase.width,
      }).toEqual({ form: "207px", input: "175px", wrapper: "175px" });
    }
    expect(actualInputBase.font).toBe(
      `400 ${viewport.name === "desktop" ? "12px" : "16px"}/20px "Helvetica Neue", Helvetica, Arial, sans-serif`,
    );
    expect(frozenInputBase.font).toBe(
      `400 ${viewport.name === "desktop" ? "12px" : "16px"}/20px -apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
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
    const retiredIconClassEvidence = await icon.evaluate((node) => {
      const snapshot = () => ({
        content: getComputedStyle(node, "::before").content,
        fontFamily: getComputedStyle(node).fontFamily,
        rect: node.getBoundingClientRect().toJSON(),
      });
      const without = snapshot();
      node.classList.add("yobicon-search");
      const withRetiredClass = snapshot();
      node.classList.remove("yobicon-search");
      return { withRetiredClass, without };
    });
    expect(retiredIconClassEvidence.withRetiredClass).toEqual(retiredIconClassEvidence.without);
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
    if (viewport.name === "desktop") {
      expect(withoutFont(actualInputFocus)).toEqual(withoutFont(frozenInputFocus));
    } else {
      expect(withoutFontAndWidth(actualInputFocus)).toEqual(withoutFontAndWidth(frozenInputFocus));
      expect(actualInputFocus.width).toBe("173px");
      expect(frozenInputFocus.width).toBe("175px");
    }
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
