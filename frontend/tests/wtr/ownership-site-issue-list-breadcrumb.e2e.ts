import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOTS = resolve("..", "output", "playwright");
const OWNERS = {
  outer: "site-issue-list-breadcrumb-outer",
  inner: "site-issue-list-breadcrumb-inner",
  heading: "site-issue-list-breadcrumb-heading",
} as const;
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`);

test.use({ locale: "en-US" });

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`breadcrumb preserves ${viewport.name} frozen output and independent fallback evidence`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installPopulatedOpenIssueList(page);
    await page.goto(`${BASE_PATH}/sites/issueList?state=open`);
    await page.evaluate(() => document.fonts.ready);

    const outer = owner(page, OWNERS.outer);
    const inner = owner(page, OWNERS.inner);
    const heading = owner(page, OWNERS.heading);
    await expect(outer).toBeVisible();
    await expect(heading).toHaveText("Site management");
    expect(
      await outer.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["DIV"]);
    expect(
      await inner.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["H3"]);
    await expect(outer).not.toHaveClass(/site-breadcrumb-outer/u);
    await expect(inner).not.toHaveClass(/site-breadcrumb-inner/u);
    await expect(outer).toHaveCSS("box-sizing", "border-box");
    await expect(outer).toHaveCSS("width", `${viewport.width}px`);
    await expect(outer).toHaveCSS("padding", "0px 10px");
    await expect(outer).toHaveCSS("border-bottom-width", "0px");
    await expect(inner).toHaveCSS("margin", "0px");
    await expect(heading).toHaveCSS("padding", "10px 10px 5px");
    await expect(heading).toHaveCSS("font-size", "24.5px");
    await expect(heading).toHaveCSS("font-weight", "700");
    await expect(heading).toHaveCSS("line-height", "30px");

    const evidence = await page.evaluate((names) => {
      const find = (name: string) => document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const actualOuter = find(names.outer);
      const actualInner = find(names.inner);
      const actualHeading = find(names.heading);
      const host = document.createElement("div");
      host.style.cssText = `position:absolute;left:-10000px;width:${actualOuter.getBoundingClientRect().width}px`;
      const shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = `<style>
        :host { display:block; color:${getComputedStyle(actualHeading).color}; font-family:${getComputedStyle(actualHeading).fontFamily}; }
        .site-breadcrumb-outer { box-sizing:border-box; width:100%; padding:0 10px; }
        .site-breadcrumb-inner { margin:0 auto; }
        /* Frozen _common.less resets heading margins before breadcrumb padding. */
        h3 { margin:0; padding:10px 10px 5px; font-family:inherit; font-size:24.5px; font-weight:bold; line-height:30px; color:inherit; text-rendering:optimizelegibility; }
        @media (max-width:720px) { .site-breadcrumb-outer { min-width:10px; } }
      </style><div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Site management</h3></div></div>`;
      document.body.append(host);
      const fallbackOuter = shadow.querySelector<HTMLElement>(".site-breadcrumb-outer")!;
      const fallbackInner = shadow.querySelector<HTMLElement>(".site-breadcrumb-inner")!;
      const fallbackHeading = shadow.querySelector<HTMLElement>("h3")!;
      const values = (element: HTMLElement, properties: string[]) => {
        const computed = getComputedStyle(element);
        return properties.map((property) => computed.getPropertyValue(property));
      };
      const box = (element: HTMLElement) => element.getBoundingClientRect().toJSON();
      const result = {
        boxes: { heading: box(actualHeading), inner: box(actualInner), outer: box(actualOuter) },
        fallback: {
          heading: values(fallbackHeading, [
            "margin",
            "padding",
            "font-size",
            "font-weight",
            "line-height",
          ]),
          inner: values(fallbackInner, ["margin"]),
          outer: values(fallbackOuter, ["box-sizing", "width", "padding", "border-bottom-width"]),
        },
        actual: {
          heading: values(actualHeading, [
            "margin",
            "padding",
            "font-size",
            "font-weight",
            "line-height",
          ]),
          inner: values(actualInner, ["margin"]),
          outer: values(actualOuter, ["box-sizing", "width", "padding", "border-bottom-width"]),
        },
        documentWidth: document.documentElement.scrollWidth,
      };
      host.remove();
      return result;
    }, OWNERS);
    expect(evidence.actual).toEqual(evidence.fallback);
    expect(evidence.boxes.outer.width).toBe(viewport.width);
    expect(evidence.boxes.inner.left).toBe(evidence.boxes.outer.left + 10);
    expect(evidence.boxes.inner.right).toBe(evidence.boxes.outer.right - 10);
    expect(evidence.boxes.heading.left).toBe(evidence.boxes.inner.left);
    expect(evidence.boxes.heading.right).toBe(evidence.boxes.inner.right);
    expect(evidence.boxes.heading.height).toBe(45);
    expect(evidence.documentWidth).toBe(viewport.width);
    mkdirSync(SCREENSHOTS, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(SCREENSHOTS, `style-site-issue-list-breadcrumb-${viewport.name}.png`),
    });
  });
}

async function installPopulatedOpenIssueList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/issues?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        issues: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29T14:30:00Z",
            issueNumber: "42",
            ownerName: "acme",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            state: "open",
            title: "Fix release blocker",
          },
        ],
        page: 1,
        pageSize: 20,
        state: "open",
        total: 1,
        totalPages: 1,
      },
    }),
  );
}
