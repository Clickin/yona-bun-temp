import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const HELP_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/[_]help.tsx", import.meta.url),
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
      <li><a href="__BASE_PATH__/" class="logo logo-letter">Y</a></li>
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
        <a href="__BASE_PATH__/users/loginform" class="user-item-btn">Log in</a>
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
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; padding: 0px; text-align: left;">Yona를 설치하고 싶어요.</button>
          <i class="ico icor"></i>
        </div>
        <div class="answer-wrap">
          <i class="yobicon-a a"></i>
          <div class="answer" style="width: 100%;">
            Yona를 설치하고자 하면 <a href="https://github.com/doortts/yona#korean">https://github.com/doortts/yona#korean</a>를 참고해 주세요.
          </div>
        </div>
      </li>
      <li class="qa">
        <div class="question-wrap">
          <i class="yobicon-q q"></i>
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; padding: 0px; text-align: left;">프로젝트를 새로 생성하고 싶어요.</button>
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
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; padding: 0px; text-align: left;">내가 참여하는 프로젝트들은 어디서 볼수 있나요?</button>
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
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; padding: 0px; text-align: left;">프로젝트 탈퇴는 어떻게 하나요.</button>
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
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; padding: 0px; text-align: left;">게시판에서는 어떠한 것들을 할수 있나요?</button>
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
          <button type="button" class="question" style="background: transparent; border: 0px; box-shadow: none; padding: 0px; text-align: left;">Yona의 버그를 발견했어요.</button>
          <i class="ico icor"></i>
        </div>
        <div class="answer-wrap">
          <i class="yobicon-a a"></i>
          <div class="answer" style="width: 100%;">
            Yona는 현재 Open Source로 진행되고 있습니다. 버그를 발견하셨다면
            <a href="https://github.com/nforge/yobi/issues">Yona 이슈트래커에 등록</a>해 주시거나 패치를 만들어 보내주시면 됩니다.
          </div>
        </div>
      </li>
    </ul>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a>
      &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a>
      &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

test("anonymous help FAQ matches legacy help/toc.scala.html screen DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(HELP_ROUTE_SOURCE).not.toMatch(/<a\b/);
  expect(HELP_ROUTE_SOURCE).not.toContain(
    '<Link to={"https://github.com/doortts/yona#korean" as never}>',
  );
  expect(HELP_ROUTE_SOURCE).toContain('href="https://github.com/doortts/yona#korean"');
  expect(HELP_ROUTE_SOURCE).toContain('<Link to="/"');
  expect(HELP_ROUTE_SOURCE).toContain('<Link to={"/info" as never}');
  expect(HELP_ROUTE_SOURCE).not.toContain(
    '<Link to={"https://github.com/nforge/yobi/issues" as never}>',
  );
  expect(HELP_ROUTE_SOURCE).toContain('href="https://github.com/nforge/yobi/issues"');

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
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator("#experimentalHelp, #helpKeys")).toHaveCount(0);
  await expect(page.locator('.qas > .qa .question[href="#!/toggle"]')).toHaveCount(0);
  await expect(page.locator(".qas > .qa .question").first()).toHaveJSProperty("tagName", "BUTTON");
  await expect(page.locator(".qas > .qa .answer a")).toHaveCount(5);
  expect(await renderedHelpAnswerLinks(page)).toEqual([
    {
      href: "https://github.com/doortts/yona#korean",
      text: "https://github.com/doortts/yona#korean",
    },
    { href: `${basePath}/`, text: "메인화면" },
    { href: `${basePath}/info`, text: "정보 페이지" },
    { href: `${basePath}/info`, text: "정보 페이지" },
    { href: "https://github.com/nforge/yobi/issues", text: "Yona 이슈트래커에 등록" },
  ]);

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

async function renderedHelpAnswerLinks(page: Page) {
  return page.locator(".qas > .qa .answer a").evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute("href"),
      text: link.textContent?.trim(),
    })),
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

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
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
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
