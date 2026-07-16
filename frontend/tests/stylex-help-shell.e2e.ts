import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/[_]help.tsx", import.meta.url);
const pageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const responsiveLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);
const templateSource = new URL(
  "../../yona-original/app/views/help/toc.scala.html",
  import.meta.url,
);

const owners = {
  breadcrumbInner: "help-shell-breadcrumb-inner",
  breadcrumbOuter: "help-shell-breadcrumb-outer",
  breadcrumbHeading: "help-shell-breadcrumb-heading",
  page: "help-shell-page-wrap",
  pageOuter: "help-shell-page-wrap-outer",
} as const;

test("source owns only the five closed-default help shell surfaces", async () => {
  const [route, pageLess, responsiveLess, template] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(pageLessSource, "utf8"),
    readFile(responsiveLessSource, "utf8"),
    readFile(templateSource, "utf8"),
  ]);

  expect(template).toContain('<div class="site-breadcrumb-outer">');
  expect(template).toContain('<div class="page-wrap-outer">');
  expect(pageLess).toContain(`.page-wrap-outer {
    min-height: 450px;
    margin-top: 10px;`);
  expect(pageLess).toContain(`.page-wrap {
    background-color: @white;
    margin: 0 auto;`);
  expect(pageLess).toContain(`h3 {
            padding: 10px 10px 5px 10px;
            line-height: 30px;`);
  expect(responsiveLess).toContain(`.page-wrap-outer {
    min-width: 10px !important;
    padding: 0 !important;`);
  for (const owner of Object.values(owners)) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const token of [
    'className="site-breadcrumb-outer"',
    'className="site-breadcrumb-inner"',
    'className="page-wrap-outer"',
    'className="page-wrap"',
  ]) {
    expect(route).not.toContain(token);
  }
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 900, name: "mobile", width: 390 },
]) {
  test(`keeps ${viewport.name} closed-default help shell geometry and fallback equivalence`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/_help`);

    const breadcrumbOuter = owner(page, owners.breadcrumbOuter);
    const breadcrumbInner = owner(page, owners.breadcrumbInner);
    const breadcrumbHeading = owner(page, owners.breadcrumbHeading);
    const pageOuter = owner(page, owners.pageOuter);
    const pageWrap = owner(page, owners.page);
    await expect(breadcrumbOuter).toHaveCSS("box-sizing", "border-box");
    await expect(breadcrumbOuter).toHaveCSS("padding", "0px 10px");
    await expect(pageOuter).toHaveCSS("min-height", "450px");
    await expect(pageOuter).toHaveCSS("margin-top", "10px");
    await expect(pageOuter).toHaveCSS("padding", viewport.name === "desktop" ? "0px 10px" : "0px");
    await expect(pageWrap).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(pageWrap).toHaveCSS("margin", "0px");

    const boxes = await readBoxes(
      breadcrumbOuter,
      breadcrumbInner,
      breadcrumbHeading,
      pageOuter,
      pageWrap,
    );
    expect(boxes.breadcrumbOuter).toMatchObject({
      height: 45,
      left: 0,
      top: 40,
      width: viewport.width,
    });
    expect(boxes.breadcrumbInner.left).toBe(viewport.name === "desktop" ? 10 : 10);
    expect(boxes.breadcrumbInner.width).toBe(viewport.width - 20);
    expect(boxes.breadcrumbInner.height).toBe(45);
    expect(boxes.breadcrumbHeading.height).toBe(45);
    expect(boxes.pageOuter.left).toBe(0);
    expect(boxes.pageOuter.top).toBe(115);
    if (viewport.name === "desktop") expect(boxes.pageOuter.height).toBe(450);
    expect(boxes.pageOuter.width).toBe(viewport.width);
    expect(boxes.page.left).toBe(viewport.name === "desktop" ? 10 : 0);
    expect(boxes.page.width).toBe(
      viewport.name === "desktop" ? viewport.width - 20 : viewport.width,
    );
    expect(boxes.breadcrumbInner.left - boxes.breadcrumbOuter.left).toBe(10);
    expect(boxes.page.left - boxes.pageOuter.left).toBe(viewport.name === "desktop" ? 10 : 0);

    const equivalence = await page.evaluate((ownerNames) => {
      const nodes = Object.fromEntries(
        Object.entries(ownerNames).map(([key, value]) => [
          key,
          document.querySelector<HTMLElement>(`[data-stylex-owner="${value}"]`),
        ]),
      ) as Record<string, HTMLElement>;
      const capture = () =>
        Object.fromEntries(
          Object.entries(nodes).map(([key, node]) => {
            const style = getComputedStyle(node);
            const box = node.getBoundingClientRect();
            return [
              key,
              {
                backgroundColor: style.backgroundColor,
                height: box.height,
                left: box.left,
                margin: style.margin,
                padding: style.padding,
                top: box.top,
                width: box.width,
              },
            ];
          }),
        );
      const migrated = capture();
      const classes = {
        breadcrumbHeading: "",
        breadcrumbInner: "site-breadcrumb-inner",
        breadcrumbOuter: "site-breadcrumb-outer",
        page: "page-wrap",
        pageOuter: "page-wrap-outer",
      } as const;
      for (const [key, node] of Object.entries(nodes)) {
        for (const token of Array.from(node.classList))
          if (token.startsWith("x")) node.classList.remove(token);
        const fallbackClass = classes[key as keyof typeof classes];
        if (fallbackClass) node.classList.add(fallbackClass);
      }
      return { fallback: capture(), migrated };
    }, owners);
    expect(equivalence.migrated.breadcrumbOuter.height).toBe(45);
    expect(equivalence.migrated.pageOuter.top).toBe(115);
    if (viewport.name === "desktop") {
      expect(equivalence.fallback.breadcrumbOuter.height).toBe(46);
      expect(equivalence.fallback.page.width).toBe(1080);
      expect(equivalence.fallback.page.margin).toBe("0px 133px");
    }
    expect(equivalence.fallback).not.toEqual(equivalence.migrated);
    expect((await pageOuter.screenshot()).byteLength).toBeGreaterThan(0);
  });
}

function owner(page: Page, name: string) {
  return page.locator(`[data-stylex-owner="${name}"]`);
}

async function readBoxes(
  breadcrumbOuter: Locator,
  breadcrumbInner: Locator,
  breadcrumbHeading: Locator,
  pageOuter: Locator,
  pageWrap: Locator,
) {
  const box = async (locator: Locator) => {
    const value = await locator.boundingBox();
    if (!value) throw new Error("Missing help shell box");
    return { height: value.height, left: value.x, top: value.y, width: value.width };
  };
  return {
    breadcrumbInner: await box(breadcrumbInner),
    breadcrumbHeading: await box(breadcrumbHeading),
    breadcrumbOuter: await box(breadcrumbOuter),
    page: await box(pageWrap),
    pageOuter: await box(pageOuter),
  };
}
