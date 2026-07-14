import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const HELP_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/[_]help.tsx", import.meta.url),
  "utf8",
);

const SHARED_MARKDOWN_HELP_SOURCE = readFileSync(
  new URL("../src/routes/-legacy-markdown-help.tsx", import.meta.url),
  "utf8",
);

const EXPECTED_HELP_SCREEN = `
<div class="unsupported hidden">
  <div class="unsupported-inner">
    <p id="unsupported-content"></p>
  </div>
</div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
      <i class="yobicon-arrow-left"></i>
      <i class="yobicon-arrow-right"></i>
    </div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li>
        <form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form">
          <input type="hidden" name="searchType" value="auto">
          <div class="search-box">
            <input type="text" name="keyword" autocomplete="off" accesskey="S">
            <button type="submit"><i class="yobicon-search"></i></button>
          </div>
        </form>
      </li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/user/anonymous">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li>
          <li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li>
          <li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" id="required-logged-in">
        <a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a>
      </li>
      <li class="divider"></li>
      <li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li>
    </ul>
  </div>
</header>
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner">
    <h3>Help</h3>
  </div>
</div>
<div class="page-wrap-outer">
  <div class="page-wrap">
    <ul class="qas">
      <li class="qa">
        <div class="question-wrap">
          <i class="yobicon-q q"></i>
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; line-height: inherit; padding: 0px; text-align: left;">Yoram를 설치하고 싶어요.</button>
          <i class="ico icor"></i>
        </div>
        <div class="answer-wrap">
          <i class="yobicon-a a"></i>
          <div class="answer" style="width: 100%;">
            공개 저장소가 준비되면 설치 안내를 제공할 예정입니다.
          </div>
        </div>
      </li>
      <li class="qa">
        <div class="question-wrap">
          <i class="yobicon-q q"></i>
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; line-height: inherit; padding: 0px; text-align: left;">프로젝트를 새로 생성하고 싶어요.</button>
          <i class="ico icor"></i>
        </div>
        <div class="answer-wrap">
          <i class="yobicon-a a"></i>
          <div class="answer" style="width: 100%;">
            <p>상단의 "새 프로젝트 시작"을 클릭하신후 필요한 정보를 입력하시면 됩니다.</p>
            <p>
              공개설정에서 공개를 택하게 되면 해당 프로젝트의 멤버가 아닌
              사용자들도 해당 프로젝트를 둘러 볼 수 있게 되며 멤버가 아니라면
              코드 저장소를 익명으로 접근하여 소스코드를 받아 갈 수는 있지만
              소스코드를 수정하지는 못합니다. 공개설정에서 비공개를 선택하면
              해당 프로젝트의 멤버가 아닌 사용자들은 단지 설명과
              이름만을 볼수 있습니다.
            </p>
            <p>
              코드 저장소 방식은 현재 Git과 Subversion을 지원합니다.
              Subversion과 Git은 전 세계적으로 널리 쓰이고 있으며
              충분한 신뢰성과 성능을 가지고 있습니다.
            </p>
            <p>
              위의 내용을 다 작성하셨다면 "프로젝트 생성" 버튼을 누르면
              새로운 프로젝트를 생성하실수 있습니다.
            </p>
          </div>
        </div>
      </li>
      <li class="qa">
        <div class="question-wrap">
          <i class="yobicon-q q"></i>
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; line-height: inherit; padding: 0px; text-align: left;">내가 참여하는 프로젝트들은 어디서 볼수 있나요?</button>
          <i class="ico icor"></i>
        </div>
        <div class="answer-wrap">
          <i class="yobicon-a a"></i>
          <div class="answer" style="width: 100%;">
            <a href="__BASE_PATH__/">메인화면</a>
            우측 하단에 다음과 같이 참여하고 있는 프로젝트의 목록을 볼수 있습니다.
            자물쇠가 있는 것은 비공개 프로젝트이며 자물쇠가 없는 것은 공개 프로젝트 입니다.
            혹은 자신의 <a href="__BASE_PATH__/info">정보 페이지</a>에서도 확인하실수 있습니다.
          </div>
        </div>
      </li>
      <li class="qa">
        <div class="question-wrap">
          <i class="yobicon-q q"></i>
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; line-height: inherit; padding: 0px; text-align: left;">프로젝트 탈퇴는 어떻게 하나요.</button>
          <i class="ico icor"></i>
        </div>
        <div class="answer-wrap">
          <i class="yobicon-a a"></i>
          <div class="answer" style="width: 100%;">
            자신의 <a href="__BASE_PATH__/info">정보 페이지</a>에서 참여하고 있는 프로젝트 목록을 볼 수있고
            탈퇴도 할수 있습니다. 자신이 프로젝트의 유일한 관리자라면 해당 프로젝트에서 탈퇴를 할 수 없습니다.
          </div>
        </div>
      </li>
      <li class="qa">
        <div class="question-wrap">
          <i class="yobicon-q q"></i>
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; line-height: inherit; padding: 0px; text-align: left;">게시판에서는 어떠한 것들을 할수 있나요?</button>
          <i class="ico icor"></i>
        </div>
        <div class="answer-wrap">
          <i class="yobicon-a a"></i>
          <div class="answer" style="width: 100%;">
            게시판에서는 다음과 같은 기능이 가능합니다.
            <ul>
              <li>게시물 읽기: 사용자는 게시물의 내용을 볼 수 있다.</li>
              <li>게시물 댓글 등록: 로그인 유저는 게시물에 댓글을 남길 수 있다.</li>
              <li>게시물 댓글 조회: 사용자는 게시물의 댓글을 볼 수 있다.</li>
              <li>게시물 댓글 삭제: 로그인 유저는 자신이 남긴 댓글을 삭제할 수 있다.</li>
              <li>관리자 게시물 댓글 삭제: 프로젝트 관리자는 댓글을 삭제할 수 있다.</li>
              <li>관리자 게시물 수정: 프로젝트 관리자는 게시물을 편집/삭제 할 수 있다.</li>
            </ul>
          </div>
        </div>
      </li>
      <li class="qa">
        <div class="question-wrap">
          <i class="yobicon-q q"></i>
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; line-height: inherit; padding: 0px; text-align: left;">Yoram의 버그를 발견했어요.</button>
          <i class="ico icor"></i>
        </div>
        <div class="answer-wrap">
          <i class="yobicon-a a"></i>
          <div class="answer" style="width: 100%;">
            Yoram는 Open Source로 진행되고 있습니다. 공개 저장소가 준비되면 이슈 트래커를 통해 버그를 제보하거나 패치를 보내실 수 있습니다.
          </div>
        </div>
      </li>
    </ul>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Yoram authors</span>
  </div>
</footer>
`;

test("anonymous help FAQ matches legacy help/toc.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(HELP_ROUTE_SOURCE).not.toMatch(/<a\b/);
  expect(HELP_ROUTE_SOURCE).not.toContain(" as never");
  expect(HELP_ROUTE_SOURCE).toContain(
    'import { Link, createFileRoute, useRouter } from "@tanstack/react-router";',
  );
  expect(HELP_ROUTE_SOURCE).not.toContain("reactJsx");
  expect(HELP_ROUTE_SOURCE).not.toContain("createLink");
  expect(HELP_ROUTE_SOURCE).not.toContain("HelpRootLink");
  expect(HELP_ROUTE_SOURCE).not.toContain("HelpRootLinkAnchor");
  expect(HELP_ROUTE_SOURCE).not.toContain("legacyHomeHref");
  expect(HELP_ROUTE_SOURCE).not.toContain("handleHomeClick");
  expect(HELP_ROUTE_SOURCE).toContain("<HelpTocTitle />");
  expect(HELP_ROUTE_SOURCE).toContain('return <title>{t("title.help")}</title>;');
  expect(HELP_ROUTE_SOURCE).not.toMatch(/\bdocument\.title\b/);
  expect(HELP_ROUTE_SOURCE).not.toMatch(/\b(?:globalThis|window)\.document\b/);
  expect(HELP_ROUTE_SOURCE).not.toMatch(/\bdocument\.querySelector\(["'`]title["'`]\)/);
  expect(HELP_ROUTE_SOURCE).not.toMatch(/\bdocument\.head\b/);
  expect(HELP_ROUTE_SOURCE).not.toMatch(/useEffect[\s\S]{0,200}\btitle\b/);
  expect(HELP_ROUTE_SOURCE).not.toContain("github.com/doortts/yona");
  expect(HELP_ROUTE_SOURCE).toContain('prefixBasePath(runtimeConfig.basePath, "/")');
  expect(HELP_ROUTE_SOURCE).toContain("handleLayoutRootClickCapture");
  expect(HELP_ROUTE_SOURCE).toContain('target.className !== "logo logo-letter"');
  expect(HELP_ROUTE_SOURCE).toContain("router.history.push(homeHref)");
  expect(HELP_ROUTE_SOURCE).toContain('to="/"');
  expect(HELP_ROUTE_SOURCE).not.toContain("legacyHomeHref={homeHref}");
  expect(HELP_ROUTE_SOURCE).toContain('const infoPath: string = "/info";');
  expect(HELP_ROUTE_SOURCE).toContain("to={infoPath}");
  expect(HELP_ROUTE_SOURCE).toContain("reloadDocument");
  expect(HELP_ROUTE_SOURCE).not.toContain("href={infoPath}");
  expect(HELP_ROUTE_SOURCE).not.toContain("useLinkProps");
  expect(HELP_ROUTE_SOURCE).not.toContain("LegacyHrefAnchor");
  expect(HELP_ROUTE_SOURCE).not.toContain("React.createElement");
  expect(HELP_ROUTE_SOURCE).toContain('"aria-current": undefined');
  expect(HELP_ROUTE_SOURCE).toContain('"data-status": undefined');
  expect(HELP_ROUTE_SOURCE).not.toContain("github.com/nforge/yobi");

  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    (window as unknown as { __helpFaqNativeListenerTypes: string[] }).__helpFaqNativeListenerTypes =
      [];
    Element.prototype.addEventListener = function (type, listener, options) {
      if (type === "click" && this instanceof HTMLElement) {
        if (this.matches(".qas > .qa, .qas > .qa .question")) {
          (
            window as unknown as { __helpFaqNativeListenerTypes: string[] }
          ).__helpFaqNativeListenerTypes.push(type);
        }
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });

  await page.goto(`${basePath}/_help`);
  await expect(page).toHaveTitle("Help");
  expect(
    await page
      .locator("head > title")
      .first()
      .evaluate((title) => title.innerHTML),
  ).toBe("Help");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator("#experimentalHelp, #helpKeys")).toHaveCount(0);
  await expect(page.locator('.qas > .qa .question[href="#!/toggle"]')).toHaveCount(0);
  await expect(page.locator(".qas > .qa .question").first()).toHaveJSProperty("tagName", "BUTTON");
  await expect(page.locator(".qas > .qa .answer a")).toHaveCount(3);
  expect(await renderedHelpAnswerLinks(page)).toEqual([
    { href: `${basePath}/`, text: "메인화면" },
    { href: `${basePath}/info`, text: "정보 페이지" },
    { href: `${basePath}/info`, text: "정보 페이지" },
  ]);
  expect(await renderedHelpAnswerLinkActiveMarkers(page)).toEqual([
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
  ]);
  expect(await readExternalAnswerLinkContainment(page)).toEqual([]);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_HELP_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );

  expect(actual).toEqual(expected);
  expect(await readDesktopHelpMetrics(page)).toEqual({
    answerDisplayClosed: "none",
    answerPaddingTopOpen: "15px",
    answerRightPaddingOpen: "94.5px",
    breadcrumbHeadingLineHeight: "30px",
    breadcrumbHeadingPaddingBottom: "5px",
    breadcrumbHeadingPaddingLeft: "10px",
    breadcrumbHeadingPaddingTop: "10px",
    firstQaBorderBottomWidth: "1px",
    firstQaMarginBottom: "14px",
    gnbInnerHeight: "40px",
    gnbInnerWidth: 1058,
    gnbOuterBackground: "rgb(27, 27, 27)",
    gnbOuterHeight: "40px",
    iconMarginOpen: "17px",
    logoBackground: "rgb(255, 87, 34)",
    logoLineHeight: "40px",
    logoPadding: "6px 10px",
    pageFooterLineHeight: "34px",
    pageFooterOuterPadding: "10px 0px",
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
    questionWidth: "892.5px",
  });

  const faqItems = page.locator(".qas > .qa");
  const questions = page.locator(".qas > .qa .question");
  const initialHash = new URL(page.url()).hash;
  await expect(faqItems.nth(0)).not.toHaveClass(/open/);
  await expect(faqItems.nth(1)).not.toHaveClass(/open/);

  await questions.nth(0).click();
  expect(new URL(page.url()).hash).toBe(initialHash);
  await expect(faqItems.nth(0)).toHaveClass(/open/);
  await expect(faqItems.nth(1)).not.toHaveClass(/open/);

  await questions.nth(1).click();
  expect(new URL(page.url()).hash).toBe(initialHash);
  await expect(faqItems.nth(0)).toHaveClass(/open/);
  await expect(faqItems.nth(1)).toHaveClass(/open/);

  await questions.nth(0).click();
  expect(new URL(page.url()).hash).toBe(initialHash);
  await expect(faqItems.nth(0)).not.toHaveClass(/open/);
  await expect(faqItems.nth(1)).toHaveClass(/open/);

  await faqItems.nth(0).locator(".icor").click();
  expect(new URL(page.url()).hash).toBe(initialHash);
  await expect(faqItems.nth(0)).toHaveClass(/open/);
  await expect(faqItems.nth(1)).toHaveClass(/open/);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __helpFaqNativeListenerTypes: string[] })
          .__helpFaqNativeListenerTypes,
    ),
  ).toEqual([]);

  await questions.nth(2).click();
  const homeLink = faqItems.nth(2).locator(".answer a", { hasText: "메인화면" });
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
  const logoLink = page.locator('[data-stylex-owner="global-gnb-brand-link"]');
  await expect(logoLink).toHaveAttribute("href", basePath);
  await page.evaluate(() => {
    (window as typeof window & { __helpFaqSpaMarker?: string }).__helpFaqSpaMarker = "logo-link";
  });
  await logoLink.click();
  await expect.poll(() => page.evaluate(() => window.location.pathname)).toBe(basePath);
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
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();

  expect(await readMobileHelpMetrics(page)).toEqual({
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

test("shared markdown help uses typed React targets without legacy target markers", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(SHARED_MARKDOWN_HELP_SOURCE).not.toMatch(
    /(?:yobi\.io|repo\.yona\.io|demo\.yobi\.io|@yobi|"Yobi")/u,
  );
  expect(SHARED_MARKDOWN_HELP_SOURCE).toContain('[Site](https://example.com/ "Example Site")');
  expect(SHARED_MARKDOWN_HELP_SOURCE).toContain(
    '![title](https://example.com/images/sample.png "Sample image")',
  );
  expect(SHARED_MARKDOWN_HELP_SOURCE).toContain("Mention: @example");
  expect(SHARED_MARKDOWN_HELP_SOURCE).not.toContain(".dataset");
  expect(SHARED_MARKDOWN_HELP_SOURCE).not.toContain("currentTarget.dataset");
  expect(SHARED_MARKDOWN_HELP_SOURCE).not.toContain('data-toggle="markdown-help"');
  expect(SHARED_MARKDOWN_HELP_SOURCE).not.toMatch(/data-target=["']markdown/u);
  expect(SHARED_MARKDOWN_HELP_SOURCE).toContain(
    'onClick={() => toggleActiveTarget("markdownLinks")}',
  );

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
    '[Site](https://example.com/ "Example Site")',
  );
  await expect(markdownHelp.locator(".markdownImages pre")).toContainText(
    '![title](https://example.com/images/sample.png "Sample image")',
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
  await expect(markdownHelp.locator(".markdown-help-wrap > .active")).toHaveCount(0);
  expect(await readMarkdownHelpMetrics(page)).toEqual({
    labelContainedInNav: true,
    navInsideRoot: true,
    navWidthAlignedWithRoot: true,
    paneTopAlignedToNavBottom: true,
    wrapInsideRoot: true,
    wrapWidthAlignedWithNav: true,
  });

  await linkNav.click();
  await expect(linkNav).toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLinks")).toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLinks")).toBeVisible();
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLists")).not.toHaveClass(
    /active/,
  );

  await listNav.click();
  await expect(linkNav).not.toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLinks")).not.toHaveClass(
    /active/,
  );
  await expect(listNav).toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLists")).toHaveClass(/active/);

  await listNav.click();
  await expect(listNav).not.toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLists")).not.toHaveClass(
    /active/,
  );
  await expect(markdownHelp.locator(".markdown-help-wrap > .active")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator(".markdown-help")).toBeVisible();
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
          (className) => className !== "markdown-help-item" && className !== "active",
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
  return page.locator(".qas > .qa .answer a").evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute("href"),
      text: link.textContent?.trim(),
    })),
  );
}

async function renderedHelpAnswerLinkActiveMarkers(page: Page) {
  return page.locator(".qas > .qa .answer a").evaluateAll((links) =>
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
  return page.locator(".qas > .qa .answer a").evaluateAll((links) =>
    links
      .filter((link) => link.getAttribute("href")?.startsWith("https://github.com/"))
      .map((link) => {
        const answer = link.closest(".answer");
        const qa = link.closest(".qa");
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
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const gnbInner = document.querySelector<HTMLElement>(".gnb-inner");
    const logo = document.querySelector<HTMLElement>(".logo-letter");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const breadcrumbHeading = document.querySelector<HTMLElement>(".site-breadcrumb-inner h3");
    const qas = document.querySelector<HTMLElement>(".qas");
    const firstQa = document.querySelector<HTMLElement>(".qas > .qa");
    const questionWrap = document.querySelector<HTMLElement>(".qas > .qa .question-wrap");
    const question = document.querySelector<HTMLElement>(".qas > .qa .question");
    const answerWrap = document.querySelector<HTMLElement>(".qas > .qa .answer-wrap");
    const answer = document.querySelector<HTMLElement>(".qas > .qa .answer");
    const icon = document.querySelector<HTMLElement>(".qas > .qa .question-wrap .icor");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
    const provider = document.querySelector<HTMLElement>(".page-footer-outer .provider");
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

    firstQa.classList.add("open");
    const questionWrapOpenStyle = getComputedStyle(questionWrap);
    const answerWrapOpenStyle = getComputedStyle(answerWrap);
    const answerOpenStyle = getComputedStyle(answer);
    const iconOpenStyle = getComputedStyle(icon);
    const metrics = {
      answerDisplayClosed: closedAnswerDisplay,
      answerPaddingTopOpen: answerWrapOpenStyle.paddingTop,
      answerRightPaddingOpen: answerOpenStyle.paddingRight,
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
      iconMarginOpen: iconOpenStyle.marginTop,
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
      questionMarginBottomOpen: questionWrapOpenStyle.marginBottom,
      questionWidth: questionStyle.width,
    };
    firstQa.classList.remove("open");
    return metrics;
  });
}

async function readMobileHelpMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const siteBreadcrumb = document.querySelector<HTMLElement>(".site-breadcrumb-outer");
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const qas = document.querySelector<HTMLElement>(".qas");
    const firstQa = document.querySelector<HTMLElement>(".qas > .qa");
    const question = document.querySelector<HTMLElement>(".qas > .qa .question");
    const answerWrap = document.querySelector<HTMLElement>(".qas > .qa .answer-wrap");
    const pageFooter = document.querySelector<HTMLElement>(".page-footer");
    const pageFooterOuter = document.querySelector<HTMLElement>(".page-footer-outer");
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
    firstQa.classList.add("open");
    const answerOpenStyle = getComputedStyle(answerWrap);
    const metrics = {
      answerDisplayClosed: closedAnswerDisplay,
      answerDisplayOpen: answerOpenStyle.display,
      answerPaddingTopOpen: answerOpenStyle.paddingTop,
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
    firstQa.classList.remove("open");
    return metrics;
  });
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
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

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      const value = current.getAttribute(name) ?? "";
      if (
        name === "class" &&
        value.split(/\s+/u).includes("gnb-nav") &&
        current.matches('[data-stylex-owner="global-gnb-nav"]')
      ) {
        return value
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
          .join(" ");
      }
      return value;
    }

    function visit(current: Element): string {
      const stableAttributes = [
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "autocomplete",
        "accesskey",
        "placeholder",
        "href",
        "target",
        "title",
        "data-toggle",
        "data-placement",
        "data-login",
        "for",
        "checked",
        "required",
        "style",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map(
          (name) => `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
        )
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
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      ),
    );
    return roots.map((root) => visit(root)).join("");
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
        const value = current.getAttribute(name) ?? "";
        if (
          name === "class" &&
          value.split(/\s+/u).includes("gnb-nav") &&
          current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
          current.querySelector('form[name="gnb-search-form"]') !== null
        ) {
          return value
            .split(/\s+/u)
            .filter((token) => token !== "gnb-nav")
            .join(" ");
        }
        return value;
      }

      function visit(current: Element): string {
        const stableAttributes = [
          "id",
          "class",
          "name",
          "type",
          "method",
          "action",
          "value",
          "autocomplete",
          "accesskey",
          "placeholder",
          "href",
          "target",
          "title",
          "data-toggle",
          "data-placement",
          "data-login",
          "for",
          "checked",
          "required",
          "style",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map(
            (name) =>
              `${name}=${JSON.stringify(normalizeSiteLayoutGnbNavAttribute(current, name))}`,
          )
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
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
