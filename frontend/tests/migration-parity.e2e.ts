import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const MIGRATION_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/migration.tsx", import.meta.url),
  "utf8",
);
const APP_CSS_SOURCE = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
const LEGACY_MIGRATION_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/migration/home.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_MIGRATION_LAYOUT_SOURCE = readFileSync(
  new URL(
    "../../yona-original/app/views/migration/migrationPageLayout.scala.html",
    import.meta.url,
  ),
  "utf8",
);
const LEGACY_NAVBAR_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/common/navbar.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_USERMENU_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/common/usermenu.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_FOOTER_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/common/footer.scala.html", import.meta.url),
  "utf8",
);
const LEGACY_USER_SOURCE = readFileSync(
  new URL("../../yona-original/app/models/User.java", import.meta.url),
  "utf8",
);
const LEGACY_NULL_USER_SOURCE = readFileSync(
  new URL("../../yona-original/app/models/NullUser.java", import.meta.url),
  "utf8",
);
const LEGACY_YOBI_LESS_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const LEGACY_PAGE_LESS_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const LEGACY_RESPONSIVE_LESS_SOURCE = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
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
    <button class="pin" title="Sidebar" type="button">
      <i class="yobicon-arrow-left" aria-hidden="true"></i>
      <i class="yobicon-arrow-right" aria-hidden="true"></i>
    </button>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects">List All</a></li>
      <li></li>
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
          <span class="user-menu"><a href="__BASE_PATH__/anonymous">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button">Favorite</button></li>
          <li class="myProjectList"><button type="button">Project</button></li>
          <li class="myRecentIssueList"><button type="button">Recent History</button></li>
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
      <li><a href="__BASE_PATH__/users/signupform">Sign up</a></li>
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
          <div class="bar span10 bar-danger">0/0</div>
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
  expect(MIGRATION_ROUTE_SOURCE).toContain('data-stylex-owner="migration-progress-bar"');
  expect(MIGRATION_ROUTE_SOURCE).toContain(
    "const migrationDisabledShellStyleProps = stylex.props(styles.disabledShell);",
  );
  expect(MIGRATION_ROUTE_SOURCE).toContain(
    "className={`yobi-migration ${migrationDisabledShellStyleProps.className}`}",
  );
  expect(MIGRATION_ROUTE_SOURCE).toContain('data-stylex-owner="migration-source-destination-row"');
  expect(MIGRATION_ROUTE_SOURCE).toContain('data-stylex-owner="migration-source-column-grid"');
  expect(MIGRATION_ROUTE_SOURCE).toContain('data-stylex-owner="migration-destination-column-grid"');
  expect(MIGRATION_ROUTE_SOURCE).toContain('data-stylex-owner="migration-status-column-grid"');
  expect(MIGRATION_ROUTE_SOURCE).toContain('marginLeft: "20px"');
  expect(MIGRATION_ROUTE_SOURCE).toContain('float: "left"');
  expect(MIGRATION_ROUTE_SOURCE).toContain('minHeight: "1px"');
  expect(MIGRATION_ROUTE_SOURCE).toContain('width: "460px"');
  expect(MIGRATION_ROUTE_SOURCE).toContain('width: "300px"');
  expect(MIGRATION_ROUTE_SOURCE).not.toContain('style={{ width: "0%" }}');
  expect(APP_CSS_SOURCE).not.toMatch(/\.yobi-migration \.row\s*\{/u);
  expect(APP_CSS_SOURCE).not.toMatch(/\.yobi-migration \.row::before/u);
  expect(APP_CSS_SOURCE).not.toMatch(/\.yobi-migration \.row::after/u);
  expect(APP_CSS_SOURCE).not.toMatch(/\.yobi-migration \.row > \[class\*="span"\]/u);
  expect(APP_CSS_SOURCE).not.toMatch(/\.yobi-migration \.row > \.span6/u);
  expect(APP_CSS_SOURCE).not.toMatch(/\.yobi-migration \.row > \.span4/u);
  expect(APP_CSS_SOURCE).toContain('.row-fluid [class*="span"]');
  expect(LEGACY_MIGRATION_SOURCE).toContain('@migrationPageLayout(utils.Config.getSiteName)("")');
  expect(LEGACY_MIGRATION_LAYOUT_SOURCE).toContain(
    "@common.navbar(utils.MenuType.SITE_HOME, null, null)",
  );
  expect(LEGACY_NAVBAR_SOURCE).toContain(
    "@if(!Application.HIDE_PROJECT_LISTING && !UserApp.currentUser().isGuest)",
  );
  expect(LEGACY_USER_SOURCE).toContain("public boolean isGuest = false;");
  expect(LEGACY_NULL_USER_SOURCE).toContain("public class NullUser extends User");
  expect(LEGACY_NULL_USER_SOURCE).not.toMatch(/\bboolean\s+isGuest\b/u);
  expect(LEGACY_USERMENU_SOURCE).toContain('href="@routes.UserApp.userInfo(currentUser.loginId)"');
  expect(LEGACY_FOOTER_SOURCE).toContain("Yona authors");
  expect(LEGACY_YOBI_LESS_SOURCE.indexOf('@import "less/_page.less";')).toBeLessThan(
    LEGACY_YOBI_LESS_SOURCE.indexOf('@import "less/_responsive.less";'),
  );
  expect(LEGACY_PAGE_LESS_SOURCE).toMatch(/\.page-footer-outer\s*\{[\s\S]*?padding:\s*10px 0;/u);
  expect(LEGACY_RESPONSIVE_LESS_SOURCE).toMatch(
    /@media all\s*\{[\s\S]*?\.page-footer-outer\s*\{\s*padding:\s*10px;/u,
  );
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
  const progressBar = page.locator('[data-stylex-owner="migration-progress-bar"]');
  await expect(progressBar).toHaveCount(1);
  await expect(progressBar).not.toHaveAttribute("style", /width/);
  await expect(progressBar).toHaveCSS("width", "0px");
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
  const sidebarPin = page.locator('[data-stylex-owner="global-sidebar-open-pin"]');
  await expect(sidebarPin).toHaveJSProperty("tagName", "BUTTON");
  await expect(sidebarPin).toHaveAttribute("type", "button");
  await expect(sidebarPin).toHaveAttribute("aria-controls", "sidebar");
  await expect(sidebarPin).toHaveAttribute("aria-expanded", "false");
  const sidebarPinIcons = sidebarPin.locator("i");
  await expect(sidebarPinIcons).toHaveCount(2);
  expect(
    await sidebarPinIcons.evaluateAll((icons) =>
      icons.every((icon) => icon.getAttribute("aria-hidden") === "true"),
    ),
  ).toBe(true);
  const globalNavItems = page.locator('[data-stylex-owner="global-gnb-nav"] > li');
  expect(
    await globalNavItems.evaluateAll((items) => items.map((item) => item.dataset.stylexOwner)),
  ).toEqual([
    "global-gnb-brand-item",
    "global-gnb-project-list-item",
    "global-gnb-project-list-divider",
    "global-gnb-search-item",
  ]);
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-link"]')).toHaveAttribute(
    "href",
    `${basePath}/projects`,
  );
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-link"]')).toHaveText(
    "List All",
  );
  await expect(page.locator('[data-stylex-owner="global-gnb-project-list-divider"]')).toHaveCount(
    1,
  );
  await expect(page.locator(`#mySidenav a[href="${basePath}/anonymous"]`)).toHaveText("Profile");
  await expect(page.locator('[data-stylex-owner="site-footer-provider"]')).toHaveText(
    "Yoram authors",
  );
  for (const attribute of ["data-login", "data-placement", "data-toggle"]) {
    await expect(page.locator(`[data-stylex-owner="global-gnb-outer"] [${attribute}]`)).toHaveCount(
      0,
    );
  }

  const actual = await canonicalizeScreenRoots(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_MIGRATION_SCREEN.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);

  expect(await readMigrationMetrics(page)).toEqual({
    destinationColumnFloat: "left",
    destinationColumnMarginLeft: "0px",
    destinationColumnMinHeight: "1px",
    destinationWidth: 300,
    footerPadding: "10px",
    gnbOuterHeight: "40px",
    migrationRowBeforeDisplay: "table",
    migrationRowAfterDisplay: "table",
    migrationRowMarginLeft: "20px",
    progressWidth: 0,
    sourceColumnFloat: "left",
    sourceColumnMarginLeft: "20px",
    sourceColumnMinHeight: "1px",
    sourceWidth: 300,
    statusColumnFloat: "left",
    statusColumnMarginLeft: "20px",
    statusColumnMinHeight: "1px",
    statusWidth: 460,
    systemMsgDisplay: "block",
  });
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`migration grid owners preserve ${viewport.name} legacy geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/migration`);
    const row = page.locator('[data-stylex-owner="migration-source-destination-row"]');
    await expect(row).toBeVisible();
    await expect(row).toHaveCSS("margin-left", "20px");
    for (const owner of [
      "migration-source-column-grid",
      "migration-destination-column-grid",
      "migration-status-column-grid",
    ]) {
      await expect(page.locator(`[data-stylex-owner="${owner}"]`)).toHaveCount(1);
    }
    const metrics = await row.evaluate((rowElement) => {
      const source = rowElement.querySelector<HTMLElement>(".source-project");
      const destination = rowElement.querySelector<HTMLElement>(".destination-project");
      const status = rowElement.querySelector<HTMLElement>(":scope > .status");
      if (!source || !destination || !status) throw new Error("Migration grid columns missing.");
      return {
        sourceWidth: Math.round(source.getBoundingClientRect().width),
        destinationWidth: Math.round(destination.getBoundingClientRect().width),
        statusWidth: Math.round(status.getBoundingClientRect().width),
        sourceFloat: getComputedStyle(source).float,
        destinationFloat: getComputedStyle(destination).float,
        statusFloat: getComputedStyle(status).float,
      };
    });
    expect(metrics).toEqual({
      sourceWidth: 300,
      destinationWidth: 300,
      statusWidth: 460,
      sourceFloat: "left",
      destinationFloat: "left",
      statusFloat: "left",
    });
  });
}

async function readMigrationMetrics(page: Page) {
  return page.evaluate(() => {
    const gnbOuter = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
    const row = document.querySelector<HTMLElement>(".yobi-migration .source-destination");
    const source = document.querySelector<HTMLElement>(".source-project.span4");
    const destination = document.querySelector<HTMLElement>(".destination-project.span4");
    const status = document.querySelector<HTMLElement>(".source-destination > .status.span6");
    const progress = document.querySelector<HTMLElement>(".progress .span10");
    const systemMsg = document.querySelector<HTMLElement>("#system-msg");
    const footer = document.querySelector<HTMLElement>("[data-stylex-owner=site-footer]");
    if (
      !gnbOuter ||
      !row ||
      !source ||
      !destination ||
      !status ||
      !progress ||
      !systemMsg ||
      !footer
    ) {
      throw new Error("Expected migration metric targets are missing.");
    }

    return {
      destinationColumnFloat: getComputedStyle(destination).float,
      destinationColumnMarginLeft: getComputedStyle(destination).marginLeft,
      destinationColumnMinHeight: getComputedStyle(destination).minHeight,
      destinationWidth: Math.round(destination.getBoundingClientRect().width),
      footerPadding: getComputedStyle(footer).padding,
      gnbOuterHeight: getComputedStyle(gnbOuter).height,
      migrationRowBeforeDisplay: getComputedStyle(row, "::before").display,
      migrationRowAfterDisplay: getComputedStyle(row, "::after").display,
      migrationRowMarginLeft: getComputedStyle(row).marginLeft,
      progressWidth: Math.round(progress.getBoundingClientRect().width),
      sourceColumnFloat: getComputedStyle(source).float,
      sourceColumnMarginLeft: getComputedStyle(source).marginLeft,
      sourceColumnMinHeight: getComputedStyle(source).minHeight,
      sourceWidth: Math.round(source.getBoundingClientRect().width),
      statusColumnFloat: getComputedStyle(status).float,
      statusColumnMarginLeft: getComputedStyle(status).marginLeft,
      statusColumnMinHeight: getComputedStyle(status).minHeight,
      statusWidth: Math.round(status.getBoundingClientRect().width),
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
          current.matches('[data-stylex-owner="global-gnb-outer"]') ||
          current.matches('[data-stylex-owner="site-footer"]') ||
          current.matches('[data-stylex-owner="site-footer-inner"]') ||
          current.matches('[data-stylex-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      const value = current.getAttribute(name) ?? "";
      if (name === "class") {
        return value
          .split(/\s+/u)
          .filter((token) => token && !/^x[a-z0-9]+$/u.test(token) && !token.includes("__"))
          .join(" ");
      }
      if (name === "href" && current.classList.contains("logo-letter") && value.length > 1) {
        return value.replace(/\/$/u, "");
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
        "aria-hidden",
        "tabindex",
        "disabled",
        "colspan",
        "style",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => {
          const value = normalizeSiteLayoutGnbNavAttribute(current, name);
          return name === "class" && !value ? "" : `${name}=${JSON.stringify(value)}`;
        })
        .filter(Boolean)
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
        ".unsupported, [data-stylex-owner=global-gnb-outer], .yobi-migration, [data-stylex-owner=site-footer]",
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
        const isSiteLayoutFooterOuter =
          name === "class" &&
          value.split(/\s+/u).includes("page-footer-outer") &&
          current.matches("footer.page-footer-outer") &&
          current.querySelector(":scope > div.page-footer > span.provider") !== null;
        const isSiteLayoutFooterInner =
          name === "class" &&
          value.split(/\s+/u).includes("page-footer") &&
          current.matches("footer.page-footer-outer > div.page-footer") &&
          current.querySelector(":scope > span.provider") !== null;
        const isSiteLayoutFooterProvider =
          name === "class" &&
          value.split(/\s+/u).includes("provider") &&
          current.matches("footer.page-footer-outer > div.page-footer > span.provider");
        const retiredToken = isSiteLayoutFooterOuter
          ? "page-footer-outer"
          : isSiteLayoutFooterInner
            ? "page-footer"
            : isSiteLayoutFooterProvider
              ? "provider"
              : isSiteLayoutHeader && value.split(/\s+/u).includes("project-header")
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
        if (name === "class") {
          return value
            .split(/\s+/u)
            .filter((token) => token && !/^x[a-z0-9]+$/u.test(token) && !token.includes("__"))
            .join(" ");
        }
        if (name === "href" && current.classList.contains("logo-letter") && value.length > 1) {
          return value.replace(/\/$/u, "");
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
          "aria-hidden",
          "tabindex",
          "disabled",
          "colspan",
          "style",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => {
            const value = normalizeSiteLayoutGnbNavAttribute(current, name);
            return name === "class" && !value ? "" : `${name}=${JSON.stringify(value)}`;
          })
          .filter(Boolean)
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
