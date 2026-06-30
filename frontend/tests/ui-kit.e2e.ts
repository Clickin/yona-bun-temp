import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const LEGACY_UIKIT_TEMPLATE = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/help/UIKit.scala.html", import.meta.url)),
  "utf8",
);
const EXPECTED_UIKIT_BODY = extractBetween(LEGACY_UIKIT_TEMPLATE, "<body>", "</body>");

test("standalone UI kit matches legacy help/UIKit.scala.html body DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.goto(`${basePath}/_UIKit`);
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toBeVisible();
  await expect(page.locator('input[name="viewport"]')).toHaveCount(0);

  const actual = await canonicalizeUIKitRoots(page);
  const expected = await canonicalizeHtml(page, EXPECTED_UIKIT_BODY);

  expect(actual).toEqual(expected);
  expect(await readDesktopUIKitMetrics(page)).toEqual({
    bodyColor: "rgb(204, 204, 204)",
    cssBadgeBackground: "rgb(201, 235, 181)",
    cssBadgeBorderRadius: "3px",
    cssBadgeBorderWidth: "1px",
    cssBadgePaddingTop: "3px",
    ddMarginLeft: "0px",
    dlDisplay: "inline-block",
    dlMarginTop: "18px",
    gnbOuterHeight: "40px",
    gnbTextAlign: "center",
    pageFooterLineHeight: "34px",
    pageFooterOuterPadding: "10px 0px",
    pageWrapOuterMarginTop: "10px",
    pageWrapOuterMinHeight: "450px",
    pageWrapOuterMinWidth: "1100px",
    providerColor: "rgb(51, 51, 51)",
    providerFontSize: "9px",
    providerMarginLeft: "4px",
    subtitleFontSize: "24px",
    subtitleFontWeight: "700",
    subtitleHeight: "55px",
    subtitleLineHeight: "55px",
    subtitleVerticalAlign: "bottom",
  });
});

test("standalone UI kit keeps legacy mobile shell proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/_UIKit`);
  await expect(page.locator(".page-wrap-outer")).toBeVisible();

  expect(await readMobileUIKitMetrics(page)).toEqual({
    bodyColor: "rgb(204, 204, 204)",
    gnbOuterMinWidth: "10px",
    gnbOuterPadding: "0px 10px",
    gnbOuterTextAlign: "center",
    pageFooterLineHeight: "34px",
    pageFooterOuterMinWidth: "10px",
    pageFooterOuterPadding: "10px",
    pageFooterWidth: 370,
    pageWrapOuterMinHeight: "450px",
    pageWrapOuterMinWidth: "10px",
    pageWrapOuterPadding: "0px",
    pageWrapOuterWidth: 390,
    providerFontSize: "9px",
    subtitleFontSize: "24px",
    subtitleHeight: "55px",
    subtitleLineHeight: "55px",
  });
});

async function readDesktopUIKitMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const subtitle = document.querySelector<HTMLElement>(".subtitle");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    const dl = document.querySelector<HTMLElement>("dl");
    const dd = document.querySelector<HTMLElement>("dd");
    const cssBadge = document.querySelector<HTMLElement>(".css");
    if (
      !gnbOuter ||
      !subtitle ||
      !pageWrapOuter ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider ||
      !dl ||
      !dd ||
      !cssBadge
    ) {
      throw new Error("Expected UI kit metric targets are missing.");
    }

    const bodyStyle = getComputedStyle(document.body);
    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const subtitleStyle = getComputedStyle(subtitle);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);
    const dlStyle = getComputedStyle(dl);
    const ddStyle = getComputedStyle(dd);
    const cssBadgeStyle = getComputedStyle(cssBadge);

    return {
      bodyColor: bodyStyle.color,
      cssBadgeBackground: cssBadgeStyle.backgroundColor,
      cssBadgeBorderRadius: cssBadgeStyle.borderTopLeftRadius,
      cssBadgeBorderWidth: cssBadgeStyle.borderTopWidth,
      cssBadgePaddingTop: cssBadgeStyle.paddingTop,
      ddMarginLeft: ddStyle.marginLeft,
      dlDisplay: dlStyle.display,
      dlMarginTop: dlStyle.marginTop,
      gnbOuterHeight: gnbOuterStyle.height,
      gnbTextAlign: gnbOuterStyle.textAlign,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
      subtitleFontSize: subtitleStyle.fontSize,
      subtitleFontWeight: subtitleStyle.fontWeight,
      subtitleHeight: subtitleStyle.height,
      subtitleLineHeight: subtitleStyle.lineHeight,
      subtitleVerticalAlign: subtitleStyle.verticalAlign,
    };
  });
}

async function readMobileUIKitMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const subtitle = document.querySelector<HTMLElement>(".subtitle");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
    if (!gnbOuter || !subtitle || !pageWrapOuter || !pageFooter || !pageFooterOuter || !provider) {
      throw new Error("Expected UI kit mobile metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const subtitleStyle = getComputedStyle(subtitle);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);

    return {
      bodyColor: getComputedStyle(document.body).color,
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      gnbOuterTextAlign: gnbOuterStyle.textAlign,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterMinWidth: pageFooterOuterStyle.minWidth,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageFooterWidth: Math.round(pageFooter.getBoundingClientRect().width),
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      pageWrapOuterPadding: pageWrapOuterStyle.padding,
      pageWrapOuterWidth: Math.round(pageWrapOuter.getBoundingClientRect().width),
      providerFontSize: getComputedStyle(provider).fontSize,
      subtitleFontSize: subtitleStyle.fontSize,
      subtitleHeight: subtitleStyle.height,
      subtitleLineHeight: subtitleStyle.lineHeight,
    };
  });
}

async function canonicalizeUIKitRoots(page: Page) {
  return page.evaluate(() => {
    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "href",
        "src",
        "accept",
        "placeholder",
        "checked",
        "style",
        "data-toggle",
        "data-name",
        "data-value",
        "data-selected",
        "data-on-label",
        "data-off-label",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");

      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }

    const roots = Array.from(
      document.querySelectorAll(".gnb-outer, .page-wrap-outer, .page-footer-outer"),
    );
    return roots.map((root) => visit(root)).join("");
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      function visit(current: Element): string {
        const stableAttributes = [
          "id",
          "class",
          "name",
          "type",
          "href",
          "src",
          "accept",
          "placeholder",
          "checked",
          "style",
          "data-toggle",
          "data-name",
          "data-value",
          "data-selected",
          "data-on-label",
          "data-off-label",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
          .join(" ");
        const open = attrs
          ? `<${current.tagName.toLowerCase()} ${attrs}>`
          : `<${current.tagName.toLowerCase()}>`;
        const children = Array.from(current.childNodes)
          .map((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              return (child.textContent ?? "").replace(/\s+/g, " ").trim();
            }
            if (child.nodeType === Node.ELEMENT_NODE) {
              return visit(child as Element);
            }
            return "";
          })
          .filter(Boolean)
          .join("");

        return `${open}${children}</${current.tagName.toLowerCase()}>`;
      }

      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .filter((root) => root.matches(".gnb-outer, .page-wrap-outer, .page-footer-outer"))
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}

function extractBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Legacy UIKit template marker not found: ${start} ... ${end}`);
  }
  return source.slice(startIndex + start.length, endIndex);
}
