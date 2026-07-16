import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/[_]help.tsx", import.meta.url);
const appCssSource = new URL("../src/app.css", import.meta.url);
const pageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const spritesLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_sprites.less",
  import.meta.url,
);
const templateSource = new URL(
  "../../yona-original/app/views/help/toc.scala.html",
  import.meta.url,
);
const yobiconSource = new URL(
  "../../yona-original/public/stylesheets/yobicon/style.css",
  import.meta.url,
);

const owner = (name: string) => `[data-stylex-owner="help-faq-${name}"]`;

test("source fully owns the legacy help FAQ subtree without presentation classes", async () => {
  const [appCss, pageLess, route, spritesLess, template, yobicon] = await Promise.all([
    readFile(appCssSource, "utf8"),
    readFile(pageLessSource, "utf8"),
    readFile(routeSource, "utf8"),
    readFile(spritesLessSource, "utf8"),
    readFile(templateSource, "utf8"),
    readFile(yobiconSource, "utf8"),
  ]);

  expect(template).toContain('class="qas"');
  expect(template).toContain('class="qa"');
  expect(template).toContain('$(e.currentTarget).toggleClass("open")');
  expect(pageLess).toContain("//-- help page");
  expect(pageLess).toContain(".question-wrap, .answer-wrap");
  expect(spritesLess).toContain("background-position:-3px -144px;");
  expect(spritesLess).toContain("background-position:-20px -144px;");
  expect(yobicon).toContain(`.yobicon-a:before {
    content: "\\e480";`);
  expect(yobicon).toContain(`.yobicon-q:before {
    content: "\\e48f";`);
  expect(route).toContain('import legacySpriteUrl from "../assets/legacy/sprite.png"');
  expect(route).toContain(`faqQuestionControl: {
    backgroundColor: "transparent",`);
  expect(route).toContain(`faqQuestion: {
    boxSizing: "content-box",
    color: helpColors.faqQuestionText,
    display: "table-cell",`);
  expect(route).toContain("lineHeight: 1.2");
  expect(route).toContain('textAlign: "start"');
  expect(route).toContain("event.stopPropagation()");
  expect(route).not.toContain("tabIndex={0}");
  for (const name of [
    "list",
    "row",
    "question-wrap",
    "question-control",
    "question",
    "question-icon",
    "toggle-icon",
    "answer-wrap",
    "answer-icon",
    "answer",
  ]) {
    expect(route).toContain(`data-stylex-owner="help-faq-${name}"`);
  }
  for (const token of [
    "qas",
    "qa",
    "question-wrap",
    "question",
    "answer-wrap",
    "answer",
    "yobicon-q q",
    "yobicon-a a",
    "ico icor",
  ]) {
    expect(route).not.toContain(`className="${token}"`);
  }
  expect(appCss).not.toMatch(/\.qas(?:\s|\{|\.)/u);
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 900, name: "mobile", width: 390 },
]) {
  test(`keeps ${viewport.name} legacy closed/open FAQ geometry, paint, assets, and interaction`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/_help`);
    const list = page.locator(owner("list"));
    const rows = page.locator(owner("row"));
    const first = rows.first();
    const last = rows.last();
    const questionWrap = first.locator(owner("question-wrap"));
    const questionControl = first.locator(owner("question-control"));
    const question = first.locator(owner("question"));
    const qIcon = first.locator(owner("question-icon"));
    const toggleIcon = first.locator(owner("toggle-icon"));
    const answerWrap = first.locator(owner("answer-wrap"));
    const aIcon = first.locator(owner("answer-icon"));
    const answer = first.locator(owner("answer"));

    await expect(rows).toHaveCount(6);
    await expect(first).toHaveAttribute("data-index", "0");
    await expect(first).toHaveAttribute("data-state", "closed");
    await expect(questionControl).toHaveAttribute("aria-expanded", "false");
    await expect(questionControl).toHaveCSS("display", "block");
    await expect(question).toHaveCSS("display", "table-cell");
    await expect(answerWrap).toHaveCSS("display", "none");
    await expect(last).toHaveCSS("border-bottom-style", "none");
    await expect(first).toHaveCSS("border-bottom-width", "1px");
    await expect(first).toHaveCSS("margin-bottom", "14px");
    await expect(question).toHaveCSS("font-size", "14px");
    await expect(question).toHaveCSS(
      "font-family",
      '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    );
    await expect(question).toHaveCSS("font-weight", "400");
    await expect(question).toHaveCSS("line-height", "16.8px");
    await expect(question).toHaveCSS("text-align", "start");
    await expect(questionWrap).toHaveCSS("box-sizing", "content-box");
    await expect(question).toHaveCSS("box-sizing", "content-box");
    await expect(answerWrap).toHaveCSS("box-sizing", "content-box");
    await expect(answer).toHaveCSS("box-sizing", "content-box");
    await expect(question).toHaveCSS("color", "rgb(76, 76, 76)");
    await expect(qIcon).toHaveCSS("color", "rgb(243, 108, 34)");
    await expect(qIcon).toHaveCSS("font-family", "yobicon");
    await expect(toggleIcon).toHaveCSS("background-position", "-3px -144px");
    await expect(toggleIcon).toHaveCSS("width", "14px");
    await expect(toggleIcon).toHaveCSS("height", "14px");
    expect(await qIcon.evaluate((node) => getComputedStyle(node, "::before").content)).toBe(
      '"\ue48f"',
    );

    const closed = await faqBoxes(page);
    expect(closed.list).toMatchObject({
      height: 433,
      left: viewport.name === "desktop" ? 10 : 0,
      top: 115,
      width: viewport.name === "desktop" ? 1346 : 390,
    });
    expect(closed.row.height).toBe(63);
    expect(closed.questionWrap).toMatchObject({
      height: 48,
      left: viewport.name === "desktop" ? 10 : 0,
      top: 115,
      width: viewport.name === "desktop" ? 1376 : 420,
    });
    expect(closed.questionWrap.width - closed.list.width).toBe(30);
    expect(closed.question).toMatchObject({
      height: 48,
      left: viewport.name === "desktop" ? 95.9375 : 41,
      top: 115,
      width: viewport.name === "desktop" ? 1144.09375 : 316,
    });
    expect(closed.qIcon).toMatchObject({
      height: 26,
      left: viewport.name === "desktop" ? 25 : 15,
      top: 126,
      width: 26,
    });
    expect(closed.toggleIcon).toMatchObject({
      height: 14,
      left: viewport.name === "desktop" ? 1257.03125 : 374,
      top: 132,
      width: 14,
    });

    await questionControl.click();
    await expect(first).toHaveAttribute("data-state", "open");
    await expect(questionControl).toHaveAttribute("aria-expanded", "true");
    await expect(questionWrap).toHaveCSS("margin-bottom", "16px");
    await expect(answerWrap).toHaveCSS("display", "table");
    await expect(answerWrap).toHaveCSS("padding", "15px");
    await expect(answerWrap).toHaveCSS("background-color", "rgb(243, 243, 243)");
    await expect(answerWrap).toHaveCSS("border-top-color", "rgb(220, 220, 220)");
    await expect(aIcon).toHaveCSS("color", "rgb(0, 0, 0)");
    await expect(aIcon).toHaveCSS("margin-right", "30px");
    await expect(answer).toHaveCSS("line-height", "23.4px");
    await expect(answer).toHaveCSS(
      "padding-right",
      viewport.name === "desktop" ? "118.438px" : "32.3906px",
    );
    await expect(answer).toHaveCSS(
      "width",
      viewport.name === "desktop" ? "1141.56px" : "271.609px",
    );
    await expect(answer).toHaveCSS("text-align", "justify");
    await expect(toggleIcon).toHaveCSS("background-position", "-20px -144px");
    expect(await aIcon.evaluate((node) => getComputedStyle(node, "::before").content)).toBe(
      '"\ue480"',
    );

    const open = await faqBoxes(page);
    expect(open.row.height).toBe(viewport.name === "desktop" ? 122 : 142.8125);
    expect(open.question).toMatchObject({
      height: 48,
      left: viewport.name === "desktop" ? 95.9375 : 41,
      top: 115,
      width: viewport.name === "desktop" ? 1144.09375 : 316,
    });
    expect(open.answerWrap).toMatchObject({
      height: viewport.name === "desktop" ? 57 : 77.8125,
      left: viewport.name === "desktop" ? 10 : 0,
      top: 179,
      width: viewport.name === "desktop" ? 1346 : 390,
    });
    expect(open.aIcon).toMatchObject({
      height: 26,
      left: viewport.name === "desktop" ? 25 : 15,
      top: 195,
      width: 26,
    });
    expect(open.answer.left).toBe(viewport.name === "desktop" ? 81 : 71);
    expect(open.answer.width).toBe(viewport.name === "desktop" ? 1260 : 304);

    await questionControl.focus();
    await expect(questionControl).toBeFocused();
    await questionControl.press("Space");
    await expect(first).toHaveAttribute("data-state", "closed");
    await expect(questionControl).toHaveAttribute("aria-expanded", "false");
    await questionControl.press("Enter");
    await expect(first).toHaveAttribute("data-state", "open");
    await expect(questionControl).toHaveAttribute("aria-expanded", "true");
    await questionControl.click();
    await expect(first).toHaveAttribute("data-state", "closed");
    await expect(questionControl).toHaveAttribute("aria-expanded", "false");
    expect((await list.screenshot()).byteLength).toBeGreaterThan(0);
  });
}

async function faqBoxes(page: Page) {
  return page.evaluate(() => {
    const box = (name: string) => {
      const node = document.querySelector<HTMLElement>(`[data-stylex-owner="help-faq-${name}"]`);
      if (!node) throw new Error(`Missing help FAQ owner: ${name}`);
      const { height, left, top, width } = node.getBoundingClientRect();
      return { height, left, top, width };
    };
    return {
      aIcon: box("answer-icon"),
      answer: box("answer"),
      answerWrap: box("answer-wrap"),
      list: box("list"),
      qIcon: box("question-icon"),
      question: box("question"),
      questionWrap: box("question-wrap"),
      row: box("row"),
      toggleIcon: box("toggle-icon"),
    };
  });
}
