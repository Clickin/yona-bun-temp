import { expect, test, type Page } from "@playwright/test";

const EXPECTED_MIGRATION_SCREEN = `
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
          <li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li>
          <li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li>
          <li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li>
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
<div class="yobi-migration">
  <div class="header-pannel">
    <div class="comeback-text pull-right">Yona to Github<span class="midium-font"></span></div>
    <div class="row title-text-bg">
      <div id="system-msg" class="well board">
        <div class="messages">Request forbidden or not allowed</div>
      </div>
    </div>
    <div class="status">
      <div class="row">
        <div class="head-title row-fluid">
          <div class="source-title span5">
            <div class="project-name warn">Source 프로젝트를 선택해 주세요</div>
          </div>
          <div class="arrow span1"><i class="yobicon-arrow-right-alt"></i></div>
          <div class="destination-title span6">
            <div class="project-name warn">Destination 프로젝트를 선택해 주세요</div>
          </div>
        </div>
      </div>
    </div>
    <div class="row source-destination">
      <div class="source-project span4">
        <div class="header">Source 0 개</div>
        <div class="search left-border"><input tabindex="1" type="text" class="search-query" name="target-filter" placeholder="Search.." disabled></div>
        <div class="left-project-list"></div>
      </div>
      <div class="destination-project span4">
        <div class="header">Destination 0 개</div>
        <div class="search"><input type="text" tabindex="2" class="search-query" name="target-filter" placeholder="Search.." disabled></div>
        <div class="destination-project-list"></div>
      </div>
      <div class="span6 status">
        <div class="progress row">
          <div class="bar span10 bar-danger" style="width: 0%">0/0</div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th colspan="2">Migration 대상</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="left-title">마일스톤</td>
              <td class="left-title">0</td>
              <td><div class="btn-group"><button class="btn btn-danger" disabled>마일스톤 옮기기</button></div></td>
            </tr>
            <tr>
              <td class="left-title">이슈</td>
              <td class="left-title"><span>0</span></td>
              <td><div class="btn-group"><button class="btn btn-danger" disabled>이슈 옮기기</button></div></td>
            </tr>
            <tr>
              <td class="left-title">게시글</td>
              <td class="left-title"><span>0</span></td>
              <td><div class="btn-group"><button class="btn btn-danger" disabled>게시글 옮기기</button></div></td>
            </tr>
            <tr>
              <td class="td-title left-title">주의 사항!!</td>
              <td colspan="2" class="text-align-left">
                <div class="caution">작업 시작전에 Yona to Githbub 마이그레이션 가이드를 꼭 읽어주세요.</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="left-title">기존 이슈 담당자</div>
        <div></div>
      </div>
    </div>
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

test("migration disabled shell matches legacy migration/home.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/migration`);
  await expect(page.locator(".yobi-migration")).toBeVisible();
  await expect(page.locator("form.gnb-search-form")).toHaveCount(1);
  await expect(page.locator(".yobi-migration form")).toHaveCount(0);
  await expect(page.locator(".source-project input.search-query")).toBeDisabled();
  await expect(page.locator(".destination-project input.search-query")).toBeDisabled();
  await expect(page.locator('head meta[name="viewport"]')).toHaveAttribute(
    "content",
    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
  );
  await expect(page.locator(".yobi-migration button.btn-danger")).toHaveCount(3);
  expect(
    await page
      .locator(".yobi-migration button.btn-danger")
      .evaluateAll((buttons) => buttons.every((button) => button.hasAttribute("disabled"))),
  ).toBe(true);

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_MIGRATION_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);

  expect(await readMigrationMetrics(page)).toEqual({
    destinationWidth: 300,
    footerPadding: "10px 0px",
    gnbOuterHeight: "40px",
    migrationRowMarginLeft: "-20px",
    progressWidth: 0,
    sourceWidth: 300,
    systemMsgDisplay: "block",
  });
});

async function readMigrationMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>(".gnb-outer");
    const row = document.querySelector<HTMLElement>(".yobi-migration .source-destination");
    const source = document.querySelector<HTMLElement>(".source-project.span4");
    const destination = document.querySelector<HTMLElement>(".destination-project.span4");
    const progress = document.querySelector<HTMLElement>(".progress .span10");
    const systemMsg = document.querySelector<HTMLElement>("#system-msg");
    const footer = document.querySelector<HTMLElement>(".page-footer-outer");
    if (!gnbOuter || !row || !source || !destination || !progress || !systemMsg || !footer) {
      throw new Error("Expected migration metric targets are missing.");
    }

    return {
      destinationWidth: Math.round(destination.getBoundingClientRect().width),
      footerPadding: getComputedStyle(footer).padding,
      gnbOuterHeight: getComputedStyle(gnbOuter).height,
      migrationRowMarginLeft: getComputedStyle(row).marginLeft,
      progressWidth: Math.round(progress.getBoundingClientRect().width),
      sourceWidth: Math.round(source.getBoundingClientRect().width),
      systemMsgDisplay: getComputedStyle(systemMsg).display,
    };
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
        "tabindex",
        "disabled",
        "data-toggle",
        "data-placement",
        "data-login",
        "colspan",
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
      document.querySelectorAll(".unsupported, .gnb-outer, .yobi-migration, .page-footer-outer"),
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
          "tabindex",
          "disabled",
          "data-toggle",
          "data-placement",
          "data-login",
          "colspan",
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
