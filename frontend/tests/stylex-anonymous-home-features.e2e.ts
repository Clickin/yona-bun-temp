import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const FEATURE = '[data-stylex-owner="anonymous-home-feature"]';
const HEADING = '[data-stylex-owner="anonymous-home-feature-heading"]';
const HEADING_TEXT = '[data-stylex-owner="anonymous-home-feature-heading-text"]';
const LIST = '[data-stylex-owner="anonymous-home-feature-list"]';
const ITEM = '[data-stylex-owner="anonymous-home-feature-item"]';
const ICON = '[data-stylex-owner="anonymous-home-feature-icon"]';
const INFO = '[data-stylex-owner="anonymous-home-feature-info"]';
const TITLE = '[data-stylex-owner="anonymous-home-feature-title"]';
const DESCRIPTION = '[data-stylex-owner="anonymous-home-feature-description"]';
const SCREENSHOTS = resolve("..", "output", "playwright");
const PRESENTATION_CLASSES =
  /(?:^|\s)(?:feature|feature-wrap|row|feature-image|feature-info|feature-title|feature-desc)(?:\s|$)/u;

const ENGLISH = [
  [
    "yobicon-cgicenter",
    "Project / Organization",
    "Work based on projects/organizations supported by proper roles",
  ],
  ["yobicon-code", "Code management", "Your code is safely stored in a version controlled system."],
  [
    "yobicon-articles",
    "Issue tracker",
    "Yoram provides an issue tracker to help you deal with your issues more easily and clearly.",
  ],
  ["yobicon-lock", "Private repositories", "Keep your code private at your private repositories."],
  [
    "yobicon-preview",
    "Code review",
    "Review all changes in the code with your team before merging. Code discussion will help improve your code.",
  ],
  [
    "yobicon-friends",
    "Team play",
    "Yoram provides a simple and easy team management tool to help you build teams for projects.",
  ],
] as const;

const KOREAN = [
  [
    "yobicon-cgicenter",
    "프로젝트/그룹 기반으로 작업",
    "프로젝트/그룹 기반으로 효율적으로 개발을 진행 할 수 있습니다.",
  ],
  [
    "yobicon-code",
    "코드 관리",
    "작성한 코드는 모두 이력이 관리되는 형태로 안전하게 서버에 보관됩니다.",
  ],
  [
    "yobicon-articles",
    "이슈 트래커",
    "팀이 함께 고민하고 처리해야 하는 내용들을 적고 거친 파도를 합심해 헤쳐나가듯 해결해 나갑니다.",
  ],
  [
    "yobicon-lock",
    "비공개 프로젝트",
    "다른 사람에게 공개하고 싶지 않은 비밀 프로젝트 공간을 만들어 자유롭게 생각의 나래를 펼쳐보세요.",
  ],
  [
    "yobicon-preview",
    "코드 리뷰",
    "변경된 코드를 보면서 팀원들과 토론해보세요. 코드의 완성도를 더욱 높일 수 있습니다.",
  ],
  [
    "yobicon-friends",
    "팀 구성",
    "프로젝트별로 멤버를 자유롭게 구성할수 있는 쉽고 간편한 멤버관리 기능이 제공 됩니다.",
  ],
] as const;

test("anonymous Home feature block has complete global-theme StyleX ownership", () => {
  const route = readFileSync(resolve("src/routes/-home-route-screen.tsx"), "utf8");
  const theme = readFileSync(resolve("src/routes/-home-route-screen.stylex.ts"), "utf8");
  const appCss = readFileSync(resolve("src/app.css"), "utf8");
  const legacy = readFileSync(
    resolve("../yona-original/app/views/index/partial_intro.scala.html"),
    "utf8",
  );

  expect(legacy).toContain('<div class="feature">');
  expect(legacy).toContain('<ul class="feature-wrap row">');
  expect(route).toContain("anonymousHomeFeatureStyles");
  for (const owner of [
    "anonymous-home-feature",
    "anonymous-home-feature-heading",
    "anonymous-home-feature-heading-text",
    "anonymous-home-feature-list",
    "anonymous-home-feature-item",
    "anonymous-home-feature-icon",
    "anonymous-home-feature-info",
    "anonymous-home-feature-title",
    "anonymous-home-feature-description",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(theme).toContain('anonymousHomeFeaturePrimary: "#ff7332"');
  expect(route).toContain('width: "95%"');
  expect(theme).not.toContain("anonymousHomeFeatureMobileItemWidth:");
  expect(route).not.toMatch(
    /className="(?:feature(?:-wrap|-image|-info|-title|-desc)?|row)(?:\s|")/u,
  );
  expect(appCss).not.toMatch(/\.feature(?:\s|\{|\.)/u);
  expect(appCss).not.toMatch(/\.feature-wrap/u);
  expect(appCss).not.toMatch(/data-stylex-owner.?=.?(?:anonymous-home-feature)/u);
});

test.describe("Korean anonymous Home feature geometry", () => {
  test.use({ locale: "ko-KR" });

  test("preserves desktop geometry, paint, copy, order, and glyph primitives", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);
    await assertCopyAndGlyphs(page, "주요 기능 소개", KOREAN);

    const evidence = await readEvidence(page);
    expect(evidence.feature.box).toEqual({ x: 53, y: 340, width: 1240, height: 291 });
    expect(evidence.feature.style).toMatchObject({
      borderBottom: "1px solid rgb(232, 232, 232)",
      margin: "0px 73px",
      maxWidth: "1200px",
      padding: "0px 20px",
      position: "relative",
      textAlign: "center",
    });
    expect(evidence.heading.box).toEqual({ x: 73, y: 340, width: 1200, height: 40 });
    expect(evidence.heading.style).toMatchObject({
      display: "block",
      fontSize: "26px",
      fontWeight: "400",
      lineHeight: "20px",
      marginTop: "30px",
      padding: "10px 20px",
    });
    expect(evidence.headingText.box).toMatchObject({ width: 186.40625, height: 30 });
    expect(evidence.headingText.style).toMatchObject({
      backgroundColor: "rgb(255, 255, 255)",
      padding: "0px 20px",
    });
    expect(evidence.list.box).toEqual({ x: 73, y: 390, width: 1200, height: 200 });
    expect(evidence.list.style).toMatchObject({
      listStyleType: "none",
      margin: "10px 0px 40px",
      overflow: "hidden",
      padding: "0px",
    });
    expect(evidence.items.map(({ box }) => box)).toEqual([
      { x: 154.40625, y: 390, width: 330, height: 100 },
      { x: 528, y: 390, width: 330, height: 100 },
      { x: 901.59375, y: 390, width: 330, height: 100 },
      { x: 154.40625, y: 490, width: 330, height: 100 },
      { x: 528, y: 490, width: 330, height: 100 },
      { x: 901.59375, y: 490, width: 330, height: 100 },
    ]);
    for (const item of evidence.items) {
      expect(item.style).toMatchObject({
        boxSizing: "border-box",
        display: "inline-block",
        marginLeft: "40px",
        position: "relative",
        width: "330px",
      });
      expect(item.icon.box).toMatchObject({
        x: item.box.x,
        y: item.box.y + 10,
        width: 40,
        height: 40,
      });
      expect(item.icon.style).toMatchObject({
        color: "rgb(255, 115, 50)",
        fontSize: "40px",
        left: "0px",
        position: "absolute",
        textAlign: "center",
        top: "10px",
      });
      expect(item.info.box).toEqual({ x: item.box.x + 55, y: item.box.y, width: 275, height: 100 });
      expect(item.info.style).toMatchObject({
        display: "block",
        height: "100px",
        marginLeft: "55px",
      });
      expect(item.title.style).toMatchObject({
        fontSize: "16px",
        fontWeight: "700",
        lineHeight: "40px",
        textAlign: "left",
      });
      expect(item.description.style).toMatchObject({
        fontSize: "13px",
        lineHeight: "20px",
        textAlign: "left",
      });
    }
    mkdirSync(SCREENSHOTS, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(SCREENSHOTS, "stylex-anonymous-home-features-desktop.png"),
    });
  });

  test("preserves mobile geometry without document overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);
    const evidence = await readEvidence(page);
    expect(evidence.feature.box).toEqual({ x: -20, y: 380, width: 410, height: 751 });
    expect(evidence.heading.box).toEqual({ x: 0, y: 380, width: 370, height: 40 });
    expect(evidence.list.box).toEqual({ x: 0, y: 430, width: 370, height: 660 });
    expect(evidence.items.map(({ box }) => box)).toEqual(
      Array.from({ length: 6 }, (_, index) => ({
        x: 14.25,
        y: 440 + index * 110,
        width: 351.5,
        height: 100,
      })),
    );
    for (const item of evidence.items) {
      expect(item.style.marginLeft).toBe("10px");
      expect(item.style.marginTop).toBe("10px");
      expect(item.style.width).toBe("351.5px");
    }
    expect(evidence.document).toEqual({ clientWidth: 390, scrollWidth: 390 });
    mkdirSync(SCREENSHOTS, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(SCREENSHOTS, "stylex-anonymous-home-features-mobile.png"),
    });
  });
});

test.describe("English anonymous Home features", () => {
  test.use({ locale: "en-US" });
  test("preserves English copy and order", async ({ page }) => {
    await page.goto(`${BASE_PATH}/`);
    await assertCopyAndGlyphs(page, "Key features", ENGLISH);
  });
});

async function assertCopyAndGlyphs(
  page: Page,
  heading: string,
  expected: ReadonlyArray<readonly [string, string, string]>,
) {
  await expect(page.locator(HEADING_TEXT)).toHaveText(heading);
  const items = page.locator(ITEM);
  await expect(items).toHaveCount(6);
  for (const [index, [iconClass, title, description]] of expected.entries()) {
    const item = items.nth(index);
    await expect(item.locator(ICON)).not.toHaveClass(PRESENTATION_CLASSES);
    await expect(item.locator(`${ICON} > i`)).toHaveClass(iconClass);
    expect(
      await item.locator(`${ICON} > i`).evaluate((element) => getComputedStyle(element).fontFamily),
    ).toMatch(/yobicon/u);
    await expect(item.locator(TITLE)).toHaveText(title);
    await expect(item.locator(DESCRIPTION)).toHaveText(description);
  }
}

async function box(locator: Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

async function readEvidence(page: Page) {
  const feature = page.locator(FEATURE);
  const heading = page.locator(HEADING);
  const headingText = page.locator(HEADING_TEXT);
  const list = page.locator(LIST);
  const items = page.locator(ITEM);
  return {
    document: await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    })),
    feature: { box: await box(feature), style: await styles(feature) },
    heading: { box: await box(heading), style: await styles(heading) },
    headingText: { box: await box(headingText), style: await styles(headingText) },
    list: { box: await box(list), style: await styles(list) },
    items: await Promise.all(
      Array.from({ length: await items.count() }, async (_, index) => {
        const item = items.nth(index);
        const icon = item.locator(ICON);
        const info = item.locator(INFO);
        const title = item.locator(TITLE);
        const description = item.locator(DESCRIPTION);
        return {
          box: await box(item),
          style: await styles(item),
          icon: { box: await box(icon), style: await styles(icon) },
          info: { box: await box(info), style: await styles(info) },
          title: { style: await styles(title) },
          description: { style: await styles(description) },
        };
      }),
    ),
  };
}

async function styles(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderBottom: style.borderBottom,
      boxSizing: style.boxSizing,
      color: style.color,
      display: style.display,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      height: style.height,
      left: style.left,
      lineHeight: style.lineHeight,
      listStyleType: style.listStyleType,
      margin: style.margin,
      marginLeft: style.marginLeft,
      marginTop: style.marginTop,
      maxWidth: style.maxWidth,
      overflow: style.overflow,
      padding: style.padding,
      position: style.position,
      textAlign: style.textAlign,
      top: style.top,
      width: style.width,
    };
  });
}
