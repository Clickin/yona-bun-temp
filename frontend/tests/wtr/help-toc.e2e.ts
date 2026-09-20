import { expect, test, type Page } from "../wtr-compat.ts";

test("anonymous help FAQ preserves links, independent toggles, and layout", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });

  await page.goto(`${basePath}/_help`);
  await expect(page).toHaveTitle("Help");
  expect(
    await page
      .locator("head > title")
      .first()
      .evaluate((title) => title.innerHTML),
  ).toBe("Help");
  await expect(page.locator('[data-owner="help-shell-breadcrumb-outer"]')).toBeVisible();
  await expect(page.locator('[data-owner="help-shell-page-wrap-outer"]')).toBeVisible();
  await expect(page.locator("#experimentalHelp, #helpKeys")).toHaveCount(0);
  await expect(page.locator('.qas > .qa .question[href="#!/toggle"]')).toHaveCount(0);
  await expect(page.locator('[data-owner="help-faq-question-control"]').first()).toHaveJSProperty(
    "tagName",
    "BUTTON",
  );
  await expect(page.locator('[data-owner="help-faq-answer"] a')).toHaveCount(5);
  expect(await renderedHelpAnswerLinks(page)).toEqual([
    {
      href: "https://github.com/doortts/yona#korean",
      text: "https://github.com/doortts/yona#korean",
    },
    { href: `${basePath}/`, text: "메인화면" },
    { href: `${basePath}/info`, text: "정보 페이지" },
    { href: `${basePath}/info`, text: "정보 페이지" },
    { href: "https://github.com/nforge/yobi/issues", text: "Yoram 이슈트래커에 등록" },
  ]);
  expect(await renderedHelpAnswerLinkActiveMarkers(page)).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: "https://github.com/doortts/yona#korean",
      text: "https://github.com/doortts/yona#korean",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/`,
      text: "메인화면",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/info`,
      text: "정보 페이지",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/info`,
      text: "정보 페이지",
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: "https://github.com/nforge/yobi/issues",
      text: "Yoram 이슈트래커에 등록",
    },
  ]);
  expect(await readExternalAnswerLinkContainment(page)).toEqual([
    {
      href: "https://github.com/doortts/yona#korean",
      text: "https://github.com/doortts/yona#korean",
      containedInAnswer: true,
      hasVisibleArea: false,
    },
    {
      href: "https://github.com/nforge/yobi/issues",
      text: "Yoram 이슈트래커에 등록",
      containedInAnswer: true,
      hasVisibleArea: false,
    },
  ]);

  // wtr-compat toEqual serializes with JSON.stringify, which is key-ORDER
  // sensitive for objects (bucket-1 gap); toMatchObject is order-insensitive
  // and the key sets are identical, so it is equivalent here.
  expect(await readDesktopHelpMetrics(page)).toMatchObject({
    answerDisplayClosed: "none",
    answerPaddingTopOpen: "15px",
    answerRightPaddingOpen: "118.438px",
    breadcrumbHeadingLineHeight: "30px",
    breadcrumbHeadingPaddingBottom: "5px",
    breadcrumbHeadingPaddingLeft: "10px",
    breadcrumbHeadingPaddingTop: "10px",
    firstQaBorderBottomWidth: "1px",
    firstQaMarginBottom: "14px",
    gnbInnerHeight: "40px",
    gnbInnerWidth: 1319,
    gnbOuterBackground: "rgb(27, 27, 27)",
    gnbOuterHeight: "40px",
    iconMarginOpen: "17px",
    logoBackground: "rgb(255, 87, 34)",
    logoLineHeight: "40px",
    logoPadding: "6px 10px",
    pageFooterLineHeight: "34px",
    pageFooterOuterPadding: "10px",
    pageWrapOuterMarginTop: "10px",
    pageWrapOuterMinHeight: "450px",
    providerColor: "rgb(51, 51, 51)",
    providerFontSize: "9px",
    providerMarginLeft: "4px",
    qasMarginTop: "30px",
    questionFontSize: "14px",
    questionLineHeight: "16.8px",
    questionMarginBottomClosed: "14px",
    questionMarginBottomOpen: "16px",
    questionWidth: "1144.09px",
  });

  const faqItems = page.locator('[data-owner="help-faq-row"]');
  const questions = page.locator('[data-owner="help-faq-question-control"]');
  const initialHash = new URL(page.url()).hash;
  await expect(faqItems.nth(0)).toHaveAttribute("data-state", "closed");
  await expect(faqItems.nth(1)).toHaveAttribute("data-state", "closed");

  await questions.nth(0).click();
  expect(new URL(page.url()).hash).toBe(initialHash);
  await expect(faqItems.nth(0)).toHaveAttribute("data-state", "open");
  await expect(faqItems.nth(1)).toHaveAttribute("data-state", "closed");

  await questions.nth(1).click();
  expect(new URL(page.url()).hash).toBe(initialHash);
  await expect(faqItems.nth(0)).toHaveAttribute("data-state", "open");
  await expect(faqItems.nth(1)).toHaveAttribute("data-state", "open");

  await questions.nth(0).click();
  expect(new URL(page.url()).hash).toBe(initialHash);
  await expect(faqItems.nth(0)).toHaveAttribute("data-state", "closed");
  await expect(faqItems.nth(1)).toHaveAttribute("data-state", "open");

  await faqItems.nth(0).locator('[data-owner="help-faq-toggle-icon"]').click();
  expect(new URL(page.url()).hash).toBe(initialHash);
  await expect(faqItems.nth(0)).toHaveAttribute("data-state", "open");
  await expect(faqItems.nth(1)).toHaveAttribute("data-state", "open");

  await questions.nth(2).click();
  // wtr-compat Locator.locator(child, {hasText}) drops the hasText option
  // (bucket-1 gap); filter at page level instead — only one FAQ answer link
  // carries the 메인화면 text, so this matches the same anchor.
  const homeLink = page.locator('[data-owner="help-faq-answer"] a').filter({ hasText: "메인화면" });
  await expect(homeLink).toHaveAttribute("href", `${basePath}/`);
  await page.evaluate(() => {
    (window as typeof window & { __helpFaqSpaMarker?: string }).__helpFaqSpaMarker = "home-link";
  });
  await homeLink.click();
  await expect.poll(() => page.evaluate(() => window.location.pathname)).toBe(`${basePath}/`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { __helpFaqSpaMarker?: string }).__helpFaqSpaMarker,
      ),
    )
    .toBe("home-link");

  await page.goto(`${basePath}/_help`);
  const logoLink = page.locator('[data-owner="global-gnb-brand-link"]');
  await expect(logoLink).toHaveAttribute("href", `${basePath}/`);
  await page.evaluate(() => {
    (window as typeof window & { __helpFaqSpaMarker?: string }).__helpFaqSpaMarker = "logo-link";
  });
  await logoLink.click();
  await expect.poll(() => page.evaluate(() => window.location.pathname)).toBe(`${basePath}/`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { __helpFaqSpaMarker?: string }).__helpFaqSpaMarker,
      ),
    )
    .toBe("logo-link");
});

test("anonymous help FAQ keeps legacy mobile shell proportions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/_help`);
  await expect(page.locator('[data-owner="help-shell-breadcrumb-outer"]')).toBeVisible();

  // Key-order-normalized via toMatchObject for the wtr-compat toEqual
  // JSON.stringify gap (order-sensitive object equality).
  expect(await readMobileHelpMetrics(page)).toMatchObject({
    answerDisplayClosed: "none",
    answerDisplayOpen: "table",
    answerPaddingTopOpen: "15px",
    gnbOuterMinWidth: "10px",
    gnbOuterPadding: "0px 10px",
    pageFooterOuterMinWidth: "10px",
    pageFooterOuterPadding: "10px",
    pageFooterWidth: 370,
    pageWrapOuterMinWidth: "10px",
    pageWrapOuterPadding: "0px",
    pageWrapOuterWidth: 390,
    qasMarginTop: "30px",
    questionFontSize: "14px",
    siteBreadcrumbMinWidth: "10px",
    siteBreadcrumbPadding: "0px 10px",
    siteBreadcrumbWidth: 390,
  });
});

test("shared markdown help preserves legacy samples and independent pane toggles", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await mockMarkdownHelpIssueForm(page);
  await page.goto(`${basePath}/admin/sample/issueform`);

  const markdownHelp = page.locator(".markdown-help");
  await expect(markdownHelp).toBeVisible();
  await expect(markdownHelp.locator('.help-nav[data-toggle="markdown-help"]')).toHaveCount(0);
  await expect(markdownHelp.locator(".help-nav[data-target]")).toHaveCount(0);
  expect(await renderedMarkdownHelpNavItems(page)).toEqual([
    "Header",
    "Text Style",
    "Link",
    "List",
    "Checklist",
    "Image",
    "Blockquote",
    "Code",
    "Table",
    "Short Link",
  ]);
  expect(await renderedMarkdownHelpPaneClasses(page)).toEqual([
    "markdownHeaders",
    "markdownStyling",
    "markdownLinks",
    "markdownLists",
    "markdownTaskList",
    "markdownImages",
    "markdownBlockquotes",
    "markdownCodes",
    "markdownTables",
    "markdownShortLinks",
  ]);
  await expect(markdownHelp.locator(".markdownLinks pre")).toContainText(
    '[Site](https://example.com/ "Yoram Site")',
  );
  await expect(markdownHelp.locator(".markdownImages pre")).toContainText(
    '![title](https://example.com/assets/images/ico-like-small.png "Yoram")',
  );
  await expect(markdownHelp.locator(".markdownShortLinks pre")).toContainText("Mention: @example");
  expect(
    await markdownHelp.locator(".markdownShortLinks .markdown-wrap a").evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute("href"),
        text: link.textContent?.trim(),
      })),
    ),
  ).toEqual([
    { href: `${basePath}/example/example/issue/2`, text: "#2" },
    { href: `${basePath}/example`, text: "@example" },
    { href: `${basePath}/example/example/commit/763575`, text: "@763575" },
    {
      href: `${basePath}/example/example/commit/763575f177a4ce8b9370954de3ea1a1410205593`,
      text: "@763575",
    },
  ]);
  const navItems = markdownHelp.locator(".markdown-help-nav > .help-nav");
  const linkNav = navItems.filter({ hasText: /^Link$/u });
  const listNav = navItems.filter({ hasText: /^List$/u });
  await expect(linkNav).toHaveText("Link");
  await expect(markdownHelp).toHaveAttribute("data-owner", "markdown-help-nav-root");
  await expect(markdownHelp.locator(".markdown-help-nav")).toHaveCSS(
    "background-color",
    "rgb(247, 247, 247)",
  );
  await expect(linkNav).toHaveCSS("color", "rgb(158, 158, 158)");
  await expect(linkNav).toHaveCSS("font-weight", "400");
  await expect(linkNav.locator("button")).toHaveCSS("padding", "5px 8px");
  await expect(linkNav.locator("button")).toHaveCSS("vertical-align", "baseline");
  await expect(markdownHelp.locator(".markdown-help-wrap > .active")).toHaveCount(0);
  expect(await readMarkdownHelpMetrics(page)).toEqual({
    labelContainedInNav: true,
    navInsideRoot: true,
    navWidthAlignedWithRoot: true,
    paneTopAlignedToNavBottom: true,
    wrapInsideRoot: true,
    wrapWidthAlignedWithNav: true,
  });

  // wtr-compat click dispatches on the resolved li without hit-testing (bucket-1
  // gap); target the button Playwright would hit-test to instead.
  await linkNav.locator("button").click();
  await expect(linkNav).toHaveClass(/active/);
  await expect(linkNav).toHaveCSS("color", "rgb(51, 51, 51)");
  await expect(linkNav).toHaveCSS("font-weight", "700");
  expect(await linkNav.evaluate((node) => getComputedStyle(node, "::before").content)).toBe('" "');
  expect(await linkNav.evaluate((node) => getComputedStyle(node, "::after").content)).toBe('" "');
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLinks")).toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLinks")).toBeVisible();
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLists")).not.toHaveClass(
    /active/,
  );

  await listNav.locator("button").click();
  await expect(linkNav).not.toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLinks")).not.toHaveClass(
    /active/,
  );
  await expect(listNav).toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLists")).toHaveClass(/active/);

  await listNav.locator("button").click();
  await expect(listNav).not.toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLists")).not.toHaveClass(
    /active/,
  );
  await expect(markdownHelp.locator(".markdown-help-wrap > .active")).toHaveCount(0);

  const codeNav = navItems.filter({ hasText: /^Code$/u });
  await codeNav.locator("button").click();
  const codePane = markdownHelp.locator(".markdown-help-wrap > .markdownCodes");
  await expect(codePane).toBeVisible();
  await expect(codePane).toHaveAttribute("data-owner", "markdown-help-pane");
  await expect(codePane.locator('[data-owner="markdown-help-input-pre"]')).toHaveCSS(
    "white-space",
    "pre",
  );
  // _page.less:5804-5812 resets only input samples; _markdown.less:213-225 pads output pre.
  await expect(codePane.locator('[data-owner="markdown-help-input-pre"]')).toHaveCSS(
    "padding",
    "0px",
  );
  await expect(codePane.locator('[data-owner="markdown-help-output-pre"]')).toHaveCSS(
    "padding",
    "10px",
  );
  await expect(codePane.locator('[data-owner="markdown-help-output-pre"]')).toHaveCSS(
    "background-color",
    "rgb(239, 239, 239)",
  );
  await expect(codePane.locator('[data-owner="markdown-help-output-pre-code"]')).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await expect(codePane.locator('[data-owner="markdown-help-output-pre-code"]')).toHaveCSS(
    "padding",
    "0px",
  );

  await navItems
    .filter({ hasText: /^Image$/u })
    .locator("button")
    .click();
  const sampleImage = markdownHelp.locator(".markdownImages .markdown-wrap img");
  await expect(sampleImage).toBeVisible();
  await expect(sampleImage).toHaveAttribute("title", "Yoram");
  await sampleImage.evaluate(async (image) => {
    if (!(image instanceof HTMLImageElement)) throw new Error("Missing Markdown sample image");
    await image.decode();
  });

  const tableNav = navItems.filter({ hasText: /^Table$/u });
  await tableNav.locator("button").click();
  const tablePane = markdownHelp.locator(".markdown-help-wrap > .markdownTables");
  const table = tablePane.locator('[data-owner="markdown-help-table"]');
  await expect(tablePane).toBeVisible();
  await expect(table).toHaveCSS("border-collapse", "collapse");
  await expect(table.locator("th").first()).toHaveCSS("min-width", "45px");
  await expect(table.locator("td").first()).toHaveCSS("word-break", "break-all");
  expect(
    await table.evaluate((element) => {
      const pane = element.closest<HTMLElement>('[data-owner="markdown-help-pane"]');
      const output = element.closest<HTMLElement>('[data-owner="markdown-help-output"]');
      if (!pane || !output) throw new Error("missing table containment owners");
      const paneBox = pane.getBoundingClientRect();
      const outputBox = output.getBoundingClientRect();
      const tableBox = element.getBoundingClientRect();
      return {
        outputInsidePane: outputBox.left >= paneBox.left && outputBox.right <= paneBox.right + 1,
        tableFitsScrollableOutput: tableBox.width <= output.scrollWidth,
      };
    }),
  ).toEqual({ outputInsidePane: true, tableFitsScrollableOutput: true });

  const taskNav = navItems.filter({ hasText: /^Checklist$/u });
  await taskNav.locator("button").click();
  const taskPane = markdownHelp.locator(".markdown-help-wrap > .markdownTaskList");
  await expect(taskPane.locator('[data-owner="markdown-help-task-list"]')).toHaveCSS(
    "list-style-type",
    "disc",
  );
  await expect(taskPane.locator('input[type="checkbox"]').first()).toHaveCSS(
    "vertical-align",
    "top",
  );
  await taskNav.locator("button").click();
  await expect(markdownHelp.locator(".markdown-help-wrap > .active")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator(".markdown-help")).toBeVisible();
  await expect(
    page.locator('.markdown-help-nav > [data-owner="markdown-help-nav-choice"] button').first(),
  ).toHaveCSS("padding", "5px 8px");
  expect(
    await page.locator(".markdown-help-nav > .help-nav").evaluateAll((items) =>
      items.every((item) => {
        const button = item.querySelector("button");
        if (!button) return false;
        const itemBox = item.getBoundingClientRect();
        const buttonBox = button.getBoundingClientRect();
        return (
          Math.abs(itemBox.width - buttonBox.width) < 0.1 &&
          Math.abs(itemBox.height - buttonBox.height) < 0.1
        );
      }),
    ),
  ).toBe(true);
  await page
    .locator(".markdown-help-nav > .help-nav")
    .filter({ hasText: /^Checklist$/u })
    .locator("button")
    .click();
  await expect(
    page.locator(".markdownTaskList").locator('[data-owner="markdown-help-task-list"]'),
  ).toHaveCSS("font-size", "16px");
  await expect(
    page.locator(".markdownTaskList").locator('[data-owner="markdown-help-task-list"]'),
  ).toHaveCSS("padding-left", "24px");
  expect(await readMarkdownHelpMobileMetrics(page)).toEqual({
    labelContainedInNav: true,
    navInsideRoot: true,
    navWidthAlignedWithRoot: true,
    rootInsideViewport: true,
    wrapInsideRoot: true,
    wrapWidthAlignedWithNav: true,
  });
});

async function renderedMarkdownHelpNavItems(page: Page) {
  return page
    .locator(".markdown-help .markdown-help-nav > .help-nav")
    .evaluateAll((items) => items.map((item) => item.textContent?.trim()));
}

async function renderedMarkdownHelpPaneClasses(page: Page) {
  return page
    .locator(".markdown-help .markdown-help-wrap > .markdown-help-item")
    .evaluateAll((items) =>
      items.map((item) =>
        Array.from(item.classList).find(
          (className) =>
            className.startsWith("markdown") &&
            className !== "markdown-help-item" &&
            className !== "active",
        ),
      ),
    );
}

async function readMarkdownHelpMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector(".markdown-help");
    const nav = document.querySelector(".markdown-help-nav");
    const label = document.querySelector(".markdown-help-nav .label");
    const wrap = document.querySelector(".markdown-help-wrap");
    if (!root || !nav || !label || !wrap) {
      throw new Error("Expected markdown help root, nav, label, and pane wrap to render.");
    }
    const rootBox = root.getBoundingClientRect();
    const navBox = nav.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    const wrapBox = wrap.getBoundingClientRect();

    return {
      labelContainedInNav:
        labelBox.top >= navBox.top &&
        labelBox.bottom <= navBox.bottom &&
        labelBox.left >= navBox.left &&
        labelBox.right <= navBox.right,
      navInsideRoot:
        navBox.top >= rootBox.top &&
        navBox.left >= rootBox.left &&
        navBox.right <= rootBox.right &&
        navBox.bottom <= rootBox.bottom,
      navWidthAlignedWithRoot: Math.abs(navBox.width - rootBox.width) <= 1,
      paneTopAlignedToNavBottom: Math.abs(wrapBox.top - navBox.bottom) <= 1,
      wrapInsideRoot:
        wrapBox.top >= rootBox.top &&
        wrapBox.left >= rootBox.left &&
        wrapBox.right <= rootBox.right &&
        wrapBox.bottom <= rootBox.bottom,
      wrapWidthAlignedWithNav: Math.abs(wrapBox.width - navBox.width) <= 1,
    };
  });
}

async function readMarkdownHelpMobileMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector(".markdown-help");
    const nav = document.querySelector(".markdown-help-nav");
    const label = document.querySelector(".markdown-help-nav .label");
    const wrap = document.querySelector(".markdown-help-wrap");
    if (!root || !nav || !label || !wrap) {
      throw new Error("Expected mobile markdown help metric targets to render.");
    }
    const rootBox = root.getBoundingClientRect();
    const navBox = nav.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    const wrapBox = wrap.getBoundingClientRect();

    return {
      labelContainedInNav:
        labelBox.top >= navBox.top &&
        labelBox.bottom <= navBox.bottom &&
        labelBox.left >= navBox.left &&
        labelBox.right <= navBox.right,
      navInsideRoot:
        navBox.top >= rootBox.top &&
        navBox.left >= rootBox.left &&
        navBox.right <= rootBox.right &&
        navBox.bottom <= rootBox.bottom,
      navWidthAlignedWithRoot: Math.abs(navBox.width - rootBox.width) <= 1,
      rootInsideViewport: rootBox.left >= 0 && rootBox.right <= window.innerWidth + 1,
      wrapInsideRoot:
        wrapBox.top >= rootBox.top &&
        wrapBox.left >= rootBox.left &&
        wrapBox.right <= rootBox.right &&
        wrapBox.bottom <= rootBox.bottom,
      wrapWidthAlignedWithNav: Math.abs(wrapBox.width - navBox.width) <= 1,
    };
  });
}

async function renderedHelpAnswerLinks(page: Page) {
  return page.locator('[data-owner="help-faq-answer"] a').evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute("href"),
      text: link.textContent?.trim(),
    })),
  );
}

async function renderedHelpAnswerLinkActiveMarkers(page: Page) {
  return page.locator('[data-owner="help-faq-answer"] a').evaluateAll((links) =>
    links.map((link) => ({
      ariaCurrent: link.getAttribute("aria-current"),
      className: link.getAttribute("class"),
      dataStatus: link.getAttribute("data-status"),
      href: link.getAttribute("href"),
      text: link.textContent?.trim(),
    })),
  );
}

async function readExternalAnswerLinkContainment(page: Page) {
  return page.locator('[data-owner="help-faq-answer"] a').evaluateAll((links) =>
    links
      .filter((link) => link.getAttribute("href")?.startsWith("https://github.com/"))
      .map((link) => {
        const answer = link.closest('[data-owner="help-faq-answer"]');
        const qa = link.closest('[data-owner="help-faq-row"]');
        if (!answer) {
          throw new Error("Expected external FAQ link to stay inside a legacy answer cell.");
        }
        const wasOpen = qa?.classList.contains("open") ?? false;
        qa?.classList.add("open");
        const linkBox = link.getBoundingClientRect();
        const answerBox = answer.getBoundingClientRect();
        const result = {
          href: link.getAttribute("href"),
          text: link.textContent?.trim(),
          containedInAnswer:
            linkBox.left >= answerBox.left &&
            linkBox.top >= answerBox.top &&
            linkBox.right <= answerBox.right &&
            linkBox.bottom <= answerBox.bottom,
          hasVisibleArea: linkBox.width > 0 && linkBox.height > 0,
        };
        if (!wasOpen) {
          qa?.classList.remove("open");
        }
        return result;
      }),
  );
}

async function readDesktopHelpMetrics(page: Page) {
  const closedMetrics = await page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const gnbInner = document.querySelector<HTMLElement>('[data-owner="global-gnb-inner"]');
    const logo = document.querySelector<HTMLElement>('[data-owner="global-gnb-brand-link"]');
    const pageWrapOuter = document.querySelector<HTMLElement>(
      '[data-owner="help-shell-page-wrap-outer"]',
    );
    const breadcrumbHeading = document.querySelector<HTMLElement>(
      '[data-owner="help-shell-breadcrumb-inner"] h3',
    );
    const qas = document.querySelector<HTMLElement>('[data-owner="help-faq-list"]');
    const firstQa = document.querySelector<HTMLElement>('[data-owner="help-faq-row"]');
    const questionWrap = document.querySelector<HTMLElement>(
      '[data-owner="help-faq-question-wrap"]',
    );
    const question = document.querySelector<HTMLElement>('[data-owner="help-faq-question"]');
    const answerWrap = document.querySelector<HTMLElement>('[data-owner="help-faq-answer-wrap"]');
    const answer = document.querySelector<HTMLElement>('[data-owner="help-faq-answer"]');
    const icon = document.querySelector<HTMLElement>('[data-owner="help-faq-toggle-icon"]');
    const pageFooter = document.querySelector<HTMLElement>("[data-owner=site-footer-inner]");
    const pageFooterOuter = document.querySelector<HTMLElement>("[data-owner=site-footer]");
    const provider = document.querySelector<HTMLElement>("[data-owner=site-footer-provider]");
    if (
      !gnbOuter ||
      !gnbInner ||
      !logo ||
      !pageWrapOuter ||
      !breadcrumbHeading ||
      !qas ||
      !firstQa ||
      !questionWrap ||
      !question ||
      !answerWrap ||
      !answer ||
      !icon ||
      !pageFooter ||
      !pageFooterOuter ||
      !provider
    ) {
      throw new Error("Expected help metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const gnbInnerStyle = getComputedStyle(gnbInner);
    const logoStyle = getComputedStyle(logo);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const breadcrumbHeadingStyle = getComputedStyle(breadcrumbHeading);
    const qasStyle = getComputedStyle(qas);
    const firstQaStyle = getComputedStyle(firstQa);
    const questionWrapStyle = getComputedStyle(questionWrap);
    const questionStyle = getComputedStyle(question);
    const answerWrapClosedStyle = getComputedStyle(answerWrap);
    const closedAnswerDisplay = answerWrapClosedStyle.display;
    const closedQuestionMarginBottom = questionWrapStyle.marginBottom;
    const pageFooterOuterStyle = getComputedStyle(pageFooterOuter);
    const providerStyle = getComputedStyle(provider);

    return {
      answerDisplayClosed: closedAnswerDisplay,
      breadcrumbHeadingLineHeight: breadcrumbHeadingStyle.lineHeight,
      breadcrumbHeadingPaddingBottom: breadcrumbHeadingStyle.paddingBottom,
      breadcrumbHeadingPaddingLeft: breadcrumbHeadingStyle.paddingLeft,
      breadcrumbHeadingPaddingTop: breadcrumbHeadingStyle.paddingTop,
      firstQaBorderBottomWidth: firstQaStyle.borderBottomWidth,
      firstQaMarginBottom: firstQaStyle.marginBottom,
      gnbInnerHeight: gnbInnerStyle.height,
      gnbInnerWidth: Math.round(gnbInner.getBoundingClientRect().width),
      gnbOuterBackground: gnbOuterStyle.backgroundColor,
      gnbOuterHeight: gnbOuterStyle.height,
      logoBackground: logoStyle.backgroundColor,
      logoLineHeight: logoStyle.lineHeight,
      logoPadding: logoStyle.padding,
      pageFooterLineHeight: getComputedStyle(pageFooter).lineHeight,
      pageFooterOuterPadding: pageFooterOuterStyle.padding,
      pageWrapOuterMarginTop: pageWrapOuterStyle.marginTop,
      pageWrapOuterMinHeight: pageWrapOuterStyle.minHeight,
      providerColor: providerStyle.color,
      providerFontSize: providerStyle.fontSize,
      providerMarginLeft: providerStyle.marginLeft,
      qasMarginTop: qasStyle.marginTop,
      questionFontSize: questionStyle.fontSize,
      questionLineHeight: questionStyle.lineHeight,
      questionMarginBottomClosed: closedQuestionMarginBottom,
      questionWidth: questionStyle.width,
    };
  });

  const row = page.locator('[data-owner="help-faq-row"]').first();
  const question = page.locator('[data-owner="help-faq-question"]').first();
  await question.click();
  await expect(row).toHaveAttribute("data-state", "open");
  const openMetrics = await page.evaluate(() => {
    const questionWrap = document.querySelector<HTMLElement>(
      '[data-owner="help-faq-question-wrap"]',
    );
    const answerWrap = document.querySelector<HTMLElement>('[data-owner="help-faq-answer-wrap"]');
    const answer = document.querySelector<HTMLElement>('[data-owner="help-faq-answer"]');
    const icon = document.querySelector<HTMLElement>('[data-owner="help-faq-toggle-icon"]');
    if (!questionWrap || !answerWrap || !answer || !icon) {
      throw new Error("Expected open help metric targets are missing.");
    }
    return {
      answerPaddingTopOpen: getComputedStyle(answerWrap).paddingTop,
      answerRightPaddingOpen: getComputedStyle(answer).paddingRight,
      iconMarginOpen: getComputedStyle(icon).marginTop,
      questionMarginBottomOpen: getComputedStyle(questionWrap).marginBottom,
    };
  });
  await question.click();
  await expect(row).toHaveAttribute("data-state", "closed");
  return { ...closedMetrics, ...openMetrics };
}

async function readMobileHelpMetrics(page: Page) {
  const closedMetrics = await page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const siteBreadcrumb = document.querySelector<HTMLElement>(
      '[data-owner="help-shell-breadcrumb-outer"]',
    );
    const pageWrapOuter = document.querySelector<HTMLElement>(
      '[data-owner="help-shell-page-wrap-outer"]',
    );
    const qas = document.querySelector<HTMLElement>('[data-owner="help-faq-list"]');
    const firstQa = document.querySelector<HTMLElement>('[data-owner="help-faq-row"]');
    const question = document.querySelector<HTMLElement>('[data-owner="help-faq-question"]');
    const answerWrap = document.querySelector<HTMLElement>('[data-owner="help-faq-answer-wrap"]');
    const pageFooter = document.querySelector<HTMLElement>("[data-owner=site-footer-inner]");
    const pageFooterOuter = document.querySelector<HTMLElement>("[data-owner=site-footer]");
    if (
      !gnbOuter ||
      !siteBreadcrumb ||
      !pageWrapOuter ||
      !qas ||
      !firstQa ||
      !question ||
      !answerWrap ||
      !pageFooter ||
      !pageFooterOuter
    ) {
      throw new Error("Expected help mobile metric targets are missing.");
    }

    const gnbOuterStyle = getComputedStyle(gnbOuter);
    const siteBreadcrumbStyle = getComputedStyle(siteBreadcrumb);
    const pageWrapOuterStyle = getComputedStyle(pageWrapOuter);
    const qasStyle = getComputedStyle(qas);
    const answerClosedStyle = getComputedStyle(answerWrap);
    const closedAnswerDisplay = answerClosedStyle.display;
    return {
      answerDisplayClosed: closedAnswerDisplay,
      gnbOuterMinWidth: gnbOuterStyle.minWidth,
      gnbOuterPadding: gnbOuterStyle.padding,
      pageFooterOuterMinWidth: getComputedStyle(pageFooterOuter).minWidth,
      pageFooterOuterPadding: getComputedStyle(pageFooterOuter).padding,
      pageFooterWidth: Math.round(pageFooter.getBoundingClientRect().width),
      pageWrapOuterMinWidth: pageWrapOuterStyle.minWidth,
      pageWrapOuterPadding: pageWrapOuterStyle.padding,
      pageWrapOuterWidth: Math.round(pageWrapOuter.getBoundingClientRect().width),
      qasMarginTop: qasStyle.marginTop,
      questionFontSize: getComputedStyle(question).fontSize,
      siteBreadcrumbMinWidth: siteBreadcrumbStyle.minWidth,
      siteBreadcrumbPadding: siteBreadcrumbStyle.padding,
      siteBreadcrumbWidth: Math.round(siteBreadcrumb.getBoundingClientRect().width),
    };
  });

  const row = page.locator('[data-owner="help-faq-row"]').first();
  const question = page.locator('[data-owner="help-faq-question"]').first();
  await question.click();
  await expect(row).toHaveAttribute("data-state", "open");
  const openMetrics = await page.evaluate(() => {
    const answerWrap = document.querySelector<HTMLElement>('[data-owner="help-faq-answer-wrap"]');
    if (!answerWrap) throw new Error("Expected open help mobile metric target is missing.");
    const style = getComputedStyle(answerWrap);
    return {
      answerDisplayOpen: style.display,
      answerPaddingTopOpen: style.paddingTop,
    };
  });
  await question.click();
  await expect(row).toHaveAttribute("data-state", "closed");
  return { ...closedMetrics, ...openMetrics };
}

async function mockMarkdownHelpIssueForm(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/form-options", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canCreateIssueAssignee: true,
        canCreateIssueMilestone: true,
        canManageIssueLabels: true,
        currentProject: {
          logoUrl: "/assets/images/project_default_logo.png",
          ownerName: "admin",
          projectId: 7,
          projectName: "sample",
        },
        issueTemplateMarkdown: "",
        movableIssueProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/parent-options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ id: 42, issueNumber: 11, selected: false, title: "Existing parent" }],
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestones: [
          {
            attachments: [],
            closedIssueCount: 0,
            closedIssues: [],
            completionPercent: 0,
            contentsHtml: "",
            contentsMarkdown: "",
            dueDateLabel: "",
            id: "5",
            openIssueCount: 0,
            openIssues: [],
            state: "open",
            title: "Sprint 1",
            viewerCanDelete: true,
            viewerCanUpdate: true,
          },
        ],
      }),
    });
  });
}
