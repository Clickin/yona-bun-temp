import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const MIGRATION_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/migration.tsx", import.meta.url),
  "utf8",
);

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
          <div class="bar span10 bar-danger" style="width: 0%;">0/0</div>
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
    <span class="provider">Yoram authors</span>
  </div>
</footer>
`;

test("migration route source keeps tabindex, progress width, and title declarative", () => {
  expect(MIGRATION_ROUTE_SOURCE).toContain('<title>{runtimeConfig.siteName ?? "Yoram"}</title>');
  expect(MIGRATION_ROUTE_SOURCE).not.toContain("document.title");
  expect(MIGRATION_ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(MIGRATION_ROUTE_SOURCE).not.toContain("window.document");
  expect(MIGRATION_ROUTE_SOURCE).not.toMatch(
    /use(?:Layout)?Effect\s*\([\s\S]*?(?:document\s*\.\s*title|globalThis\s*\.\s*document|window\s*\.\s*document|title\s*=)/u,
  );
  expect(MIGRATION_ROUTE_SOURCE).not.toMatch(
    /(?:document|globalThis\.document|window\.document)\s*\.\s*querySelector\s*\(\s*["']title["']/su,
  );
  expect(MIGRATION_ROUTE_SOURCE).not.toMatch(/setAttribute\(["'](?:style|tabindex)["']/u);
  expect(MIGRATION_ROUTE_SOURCE).toContain("tabIndex={1}");
  expect(MIGRATION_ROUTE_SOURCE).toContain("tabIndex={2}");
  expect(MIGRATION_ROUTE_SOURCE).toContain('style={{ width: "0%" }}');
});

test("migration disabled shell matches legacy migration/home.scala.html screen DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.goto(`${basePath}/migration`);
  await expect(page).toHaveTitle("Yoram");
  const headTitles = await page
    .locator("head > title")
    .evaluateAll((titles) => titles.map((title) => title.textContent ?? ""));
  expect(headTitles).toContain("Yoram");
  expect(new Set(headTitles)).toEqual(new Set(["Yoram"]));
  await expect(page.locator(".yobi-migration")).toBeVisible();
  await expect(page.locator("form.gnb-search-form")).toHaveCount(1);
  await expect(page.locator(".yobi-migration form")).toHaveCount(0);
  await expect(page.locator(".source-project input.search-query")).toBeDisabled();
  await expect(page.locator(".destination-project input.search-query")).toBeDisabled();
  await expect(page.locator(".source-project input.search-query")).toHaveAttribute("tabindex", "1");
  await expect(page.locator(".destination-project input.search-query")).toHaveAttribute(
    "tabindex",
    "2",
  );
  await expect(page.locator(".progress .span10")).toHaveAttribute("style", "width: 0%;");
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
    const gnbOuter = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
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
    function normalizeSiteLayoutGnbNavAttribute(current: Element, name: string) {
      if (
        name === "class" &&
        (current.matches('[data-stylex-owner="global-gnb-inner"]') ||
          current.matches('[data-stylex-owner="global-gnb-outer"]'))
      ) {
        return "";
      }
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
        ".unsupported, [data-stylex-owner=global-gnb-outer], .yobi-migration, .page-footer-outer",
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
        const isSiteLayoutHeader =
          name === "class" &&
          value.split(/\s+/u).includes("gnb-outer") &&
          current.matches("header.gnb-outer") &&
          current.querySelector(':scope > div.gnb-inner form[name="gnb-search-form"]') !== null;
        const retiredToken =
          isSiteLayoutHeader && value.split(/\s+/u).includes("project-header")
            ? "project-header"
            : isSiteLayoutHeader
              ? "gnb-outer"
              : name === "class" &&
                  value.split(/\s+/u).includes("gnb-inner") &&
                  current.matches("header.gnb-outer > div.gnb-inner") &&
                  current.querySelector('form[name="gnb-search-form"]') !== null
                ? "gnb-inner"
                : name === "class" &&
                    value.split(/\s+/u).includes("gnb-nav") &&
                    current.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                    current.querySelector('form[name="gnb-search-form"]') !== null
                  ? "gnb-nav"
                  : null;
        if (retiredToken) {
          return value
            .split(/\s+/u)
            .filter((token) => token !== retiredToken)
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
