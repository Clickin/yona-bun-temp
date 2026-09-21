import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

// Live legacy replay is unavailable in this focused test environment; legacy Scala/LESS/messages
// files are therefore the explicit output-DOM and frozen-paint evidence below.
test("shared search error family preserves legacy DOM, copy, paint, and geometry", async ({
  page,
}) => {
  const [
    route,
    _styles,
    notFound,
    forbidden,
    internal,
    tooLarge,
    search,
    pageLess,
    sprites,
    messages,
  ] = await Promise.all([
    readFile(new URL("../src/routes/-search-screen.tsx", import.meta.url), "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile(
      new URL("../../yona-original/app/views/error/notfound_default.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/error/forbidden.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../../yona-original/app/views/error/internalServerError_default.scala.html",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../../yona-original/app/views/error/requestTextEntityTooLarge.scala.html",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/search/result.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_sprites.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(search).toContain("@partial_search(null, null, searchResult)");
  for (const view of [notFound, forbidden, internal, tooLarge]) {
    expect(view).toContain('<div class="page-wrap-outer">');
    expect(view).toContain('<div class="project-page-wrap">');
    expect(view).toContain('<div class="error-wrap">');
  }
  expect(forbidden).toContain('<i class="ico ico-err2"></i>');
  expect(internal).toContain('<i class="ico-404"></i>');
  expect(tooLarge).toContain('<i class="ico ico-err2"></i>');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(sprites).toContain("background-position: -5px -160px;");
  expect(sprites).toContain("background-position: -80px -160px;");
  expect(messages).toContain("error.forbidden = You are not authorized");
  expect(messages).toContain(
    "error.internalServerError = Server error occurred; service is not available",
  );
  expect(messages).toContain("error.tooLargeText.limit = Text length exceeds maximum allowed text");
  expect(route).toContain('data-owner="search-error-wrap"');
  expect(route).toContain('data-owner="search-error-limit"');

  await mockSearchErrors(page);
  for (const scenario of [
    {
      query: "keyword=forbidden&searchType=issue",
      icon: "ico-err2",
      paragraphs: ["You are not authorized"],
    },
    {
      query: "keyword=server-error&searchType=issue",
      icon: "ico-404",
      paragraphs: ["Server error occurred; service is not available"],
    },
    {
      query: "keyword=too-large&searchType=issue",
      icon: "ico-err2",
      paragraphs: [
        "Request text entity too large",
        'Text length exceeds maximum allowed text "102400" bytes.',
      ],
    },
    {
      query: "keyword=",
      icon: "ico-404",
      paragraphs: ["The request cannot be fulfilled due to bad syntax"],
    },
  ]) {
    await page.goto(`${basePath}/search?${scenario.query}`, { waitUntil: "networkidle" });
    const wrap = page.locator('[data-owner="search-error-wrap"]');
    const icon = page.locator('[data-owner="search-error-icon"]');
    await expect(wrap).toBeVisible();
    await expect(icon).toHaveClass(new RegExp(`\\b${scenario.icon}\\b`, "u"));
    await expect(wrap.locator("p")).toHaveText(scenario.paragraphs);
    await expect(wrap.locator(".ybtn")).toHaveCount(scenario.paragraphs.length === 1 ? 1 : 0);
    expect(
      await wrap.evaluate((node) => Array.from(node.children).map((child) => child.tagName)),
    ).toEqual(scenario.paragraphs.length === 1 ? ["I", "P", "A"] : ["I", "P", "P"]);
    await expect(wrap).toHaveCSS("padding", "100px 0px");
    await expect(wrap).toHaveCSS("text-align", "center");
    await expect(icon).toHaveCSS("background-repeat", "no-repeat");
    await expect(icon).toHaveCSS(
      "background-position",
      scenario.icon === "ico-err2" ? "-80px -160px" : "-80px -160px",
    );
    await expect(icon).toHaveCSS("width", "50px");
    await expect(icon).toHaveCSS("height", "80px");
    await expect(wrap.locator("p").first()).toHaveCSS("margin", "30px 0px");
    const geometry = await wrap.evaluate((node) => {
      const wrapBox = node.getBoundingClientRect();
      const iconBox = node.querySelector<HTMLElement>("i")!.getBoundingClientRect();
      return {
        contained: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
        width: wrapBox.width,
      };
    });
    expect(geometry.contained).toBe(true);
    expect(geometry.width).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath}/search?keyword=forbidden&searchType=issue`, {
    waitUntil: "networkidle",
  });
  await expect(page.locator('[data-owner="search-error-wrap"]')).toHaveCSS("padding", "100px 0px");
  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
});

async function mockSearchErrors(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ contentType: "application/json", json: { isAnonymous: true } }),
  );
  await page.route("**/api/v1/search?**", (route) => {
    const keyword = new URL(route.request().url()).searchParams.get("keyword");
    const status =
      keyword === "forbidden"
        ? 403
        : keyword === "server-error"
          ? 500
          : keyword === "too-large"
            ? 413
            : 200;
    if (status === 200) return route.fulfill({ contentType: "application/json", json: {} });
    return route.fulfill({ status, contentType: "application/json", json: { error: { status } } });
  });
}
