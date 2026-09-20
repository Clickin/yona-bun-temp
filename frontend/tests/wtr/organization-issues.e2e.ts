import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const ORGANIZATION_ISSUES_ROUTE_SOURCE = new URL(
  "../src/routes/organizations/$organizationName/issues.tsx",
  import.meta.url,
);

test("organization issue aggregate preserves legacy metadata and quick filters", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page);

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  await expect(page).toHaveTitle("weblabs");
  await expect.poll(() => firstHeadTitleText(page)).toBe("weblabs");
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveText("weblabs");
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs`,
  );
  await expect(page.locator(".project-breadcrumb .project-author a")).not.toHaveAttribute(
    "aria-current",
  );
  await expect(page.locator(".project-breadcrumb .project-author a")).not.toHaveAttribute(
    "data-status",
  );
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Issue");
  await expect(page.locator(".project-menu-gruop > li")).toHaveClass(["", "active", "", ""]);
  expect(await hrefs(page, ".project-menu-gruop > li > a")).toEqual([
    `${basePath}/organizations/weblabs`,
    `${basePath}/organizations/weblabs/issues`,
    `${basePath}/organizations/weblabs/boards`,
    `${basePath}/organizations/weblabs/pullrequests`,
  ]);
  expect(await attributes(page, ".project-menu-gruop > li > a", "data-status")).toEqual([
    null,
    null,
    null,
    null,
  ]);
  await expect(page.locator(".project-setting .project-menu-nav > li > a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/settingform`,
  );
  await expect(page.locator(".project-setting .project-menu-nav > li > a")).not.toHaveAttribute(
    "data-status",
  );
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#issue-item-42")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/issue/11`,
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.mlarge")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.mlarge")).not.toHaveAttribute(
    "data-toggle",
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.mlarge")).not.toHaveAttribute(
    "data-placement",
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.mlarge")).toHaveAttribute("title", "dev");
  await expect(page.locator("#issue-item-42 .title-wrap .title")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/issue/11`,
  );
  await expect(page.locator("#issue-item-42 .infos > .infos-link-item").first()).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(
    page.locator("#issue-item-42 .infos > .infos-link-item").first(),
  ).not.toHaveAttribute("data-toggle");
  await expect(
    page.locator("#issue-item-42 .infos > .infos-link-item").first(),
  ).not.toHaveAttribute("data-placement");
  await expect(page.locator("#issue-item-42 .infos > .infos-link-item").first()).toHaveAttribute(
    "title",
    "dev",
  );
  await expect(page.locator("#issue-item-42 .infos > span.infos-item").first()).toHaveAttribute(
    "title",
    "Jul 1, 2026",
  );
  await expect(page.locator("#issue-item-42 .infos > span.infos-item").first()).toHaveText(
    "Jul 1, 2026",
  );
  await expect(page.locator("#issue-item-42 .mileston-tag a")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/milestone/5`,
  );
  await expect(page.locator("#issue-item-42 .mileston-tag a")).not.toHaveAttribute("data-toggle");
  await expect(page.locator("#issue-item-42 .mileston-tag a")).not.toHaveAttribute(
    "data-placement",
  );
  await expect(page.locator("#issue-item-42 .mileston-tag a")).toHaveAttribute(
    "title",
    "Milestone",
  );
  await expect(page.locator("#issue-item-42 .mileston-tag a")).toHaveText("v1.0");
  await expect(page.locator("#issue-item-42 .item-count-groups a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/issue/11#comments`,
  );
  await expect(page.locator("#issue-item-42 .item-count-groups a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/issue/11#vote`,
  );
  await expect(page.locator("#issue-item-42 .group-project-name")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample`,
  );
  await expect(page.locator("#issue-item-42 .group-project-name")).toHaveText("sample");
  await expect(page.locator('a.issue-label[data-label-id="8"]')).toHaveText("bug");
  await expect(page.locator('a.issue-label[data-label-id="8"]')).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/issues?state=open&labelIds=8`,
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee")).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee")).not.toHaveAttribute(
    "data-toggle",
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee")).not.toHaveAttribute(
    "data-placement",
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee")).toHaveAttribute(
    "title",
    "Assignee: Site Admin",
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee img")).toHaveAttribute(
    "alt",
    "Site Admin",
  );
  const issueDueDate = page.locator('#issue-item-42 [data-owner="organization-issues-due-date"]');
  await expect(issueDueDate).not.toHaveAttribute("data-toggle");
  await expect(issueDueDate).not.toHaveAttribute("data-placement");
  await expect(issueDueDate).toHaveAttribute("title", "Jun 30, 2026");
  await expect(issueDueDate).toContainText("Overdue");
  await expect(page.locator('#issue-item-42 [data-toggle="tooltip"]')).toHaveCount(0);
  await expect(page.locator("#issue-item-42 [data-placement]")).toHaveCount(0);
  await expect(page.locator(".issue-list-wrap")).not.toHaveAttribute("pjax-container");
  await expect(page.locator(".lst-stacked [data-assignee-id='1']")).toHaveText("Assigned");
  await expect(page.locator('.lst-stacked button[type="button"]')).toHaveCount(4);
  await expect(page.locator(".lst-stacked [pjax-filter]")).toHaveCount(0);
  await expect(page.locator('.lst-stacked [data-assignee-id="1"]')).toHaveAttribute(
    "data-milestone-id",
    "",
  );
  await expect(page.locator('.lst-stacked [data-author-id="1"]')).toHaveText("Created");
  await expect(page.locator('.lst-stacked [data-mention-id="1"]')).toHaveText("Mentioned");
  await expect(page.locator('.nav-tabs.nm > li > button[state][type="button"]')).toHaveCount(2);
  await expect(page.locator('.nav-tabs.nm > li > a[href="#"][state]')).toHaveCount(0);
});

test("organization issue row tooltip markers are not React-owned DOM", async ({ page }) => {
  const source = readFileSync(ORGANIZATION_ISSUES_ROUTE_SOURCE, "utf8");
  const issueItemSource = source.slice(
    source.indexOf("function OrganizationIssueItem"),
    source.indexOf("function TwoColumnModeCheckbox"),
  );
  expect(issueItemSource).not.toContain("data-placement=");

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page);

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);

  await expect(page.locator("#issue-item-42")).toBeVisible();
  await expect(page.locator('#issue-item-42 [data-toggle="tooltip"]')).toHaveCount(0);
  await expect(page.locator("#issue-item-42 [data-placement]")).toHaveCount(0);
  await expect(page.locator("#issue-item-42 .avatar-wrap.mlarge")).toHaveAttribute("title", "dev");
  await expect(page.locator("#issue-item-42 .infos-link-item").first()).toHaveAttribute(
    "title",
    "dev",
  );
  await expect(page.locator("#issue-item-42 .infos > span.infos-item").first()).toHaveAttribute(
    "title",
    "Jul 1, 2026",
  );
  await expect(page.locator("#issue-item-42 .mileston-tag a")).toHaveAttribute(
    "title",
    "Milestone",
  );
  await expect(page.locator("#issue-item-42 .group-project-name")).toHaveText("sample");
  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee")).toHaveAttribute(
    "title",
    "Assignee: Site Admin",
  );
  await expect(
    page.locator('#issue-item-42 [data-owner="organization-issues-due-date"]'),
  ).toHaveAttribute("title", "Jun 30, 2026");
  await expect(
    page.locator('#issue-item-42 [data-owner="organization-issues-due-date"]'),
  ).toContainText("Overdue");
});

test("organization issues two-column checkbox renders React popover and localStorage toggle", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page);

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();

  const wrapper = page.locator("#two-column-mode-checkbox");
  const toggle = page.locator("#two-column-mode");
  await expect(wrapper).toHaveClass(/two-column-icon mr10 hide-in-mobile/);
  await expect(wrapper).toHaveAttribute("title", "Two Column Mode");
  await expect(wrapper).not.toHaveAttribute("data-content");
  await expect(wrapper.locator("label.checkbox")).toHaveCount(1);
  await expect(wrapper.locator(".two-column-icon-border")).toHaveCount(1);
  await expect(wrapper.locator(".two-column-mode-text")).toHaveText("Column View");
  await expect(wrapper.locator(".popover")).toHaveCount(0);
  await expect(toggle).not.toBeChecked();

  await wrapper.hover();
  const hoverPopover = wrapper.locator(".popover.top");
  await expect(hoverPopover).toBeVisible();
  await expect(hoverPopover.locator(".popover-title")).toHaveText("Two Column Mode");
  await expect(hoverPopover.locator(".popover-content")).toHaveText(
    "Splits list and body into columns respectively",
  );
  expect(await organizationIssuesTwoColumnPopoverMetrics(page)).toEqual({
    // F5 dist-truth (2026-08-11): the popover bottom is computed from the
    // toggle height (37px), not the legacy 100%.
    bottom: "37px",
    contentText: "Splits list and body into columns respectively",
    hasArrow: true,
    position: "absolute",
    placementClass: true,
    popoverBottomIsAboveToggleTop: true,
    role: "tooltip",
    titleText: "Two Column Mode",
  });

  await page.locator("body").hover({ position: { x: 10, y: 10 } });
  await expect(wrapper.locator(".popover")).toHaveCount(0);
  await toggle.focus();
  await expect(wrapper.locator(".popover.top")).toBeVisible();
  await page.locator('#search input[name="filter"]').focus();
  await expect(wrapper.locator(".popover")).toHaveCount(0);

  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("true");

  await page.reload();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  await page.locator("#two-column-mode").click();
  await expect(page.locator("#two-column-mode")).not.toBeChecked();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("false");
});

test("organization issues project selector submits legacy search state through React navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mock = await mockOrganizationIssues(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    `${basePath}/organizations/weblabs/issues?state=open&filter=bug&pageNum=3&orderBy=createdDate&orderDir=desc`,
  );

  const projects = page.locator("#projects");
  const projectSearch = page.getByRole("combobox", { name: "Choose projects" });
  await expect(page.locator("#search")).toBeVisible();
  await expect(projectSearch).toHaveAttribute("placeholder", "Choose projects");
  await projectSearch.click();
  await expect(page.getByRole("option")).toHaveText(["sample", "playground"]);
  await projectSearch.fill("missing-project");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(page.getByRole("listbox")).toHaveText("No matches found");
  await projectSearch.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);

  expect(
    await page.locator("#search").evaluate((form) =>
      Array.from(form.children).map((child) => {
        if (!(child instanceof HTMLElement)) {
          return child.tagName.toLowerCase();
        }
        return (
          child.id || child.getAttribute("name") || child.className || child.tagName.toLowerCase()
        );
      }),
    ),
  ).toEqual([
    "projects",
    "hr",
    "orderBy",
    "orderDir",
    "state",
    "authorId",
    "assigneeId",
    "mentionId",
    "search",
  ]);
  await expect(page.locator(".lst-stacked > li")).toHaveText([
    "All issues",
    "Assigned",
    "Created",
    "Mentioned",
  ]);
  await expect(page.locator("#span10 > .nav-tabs.nm > li").nth(0)).toContainText("Open1");
  await expect(page.locator("#span10 > .nav-tabs.nm > li").nth(1)).toContainText("Closed2");
  await expect(page.locator('#search input[name="filter"]')).toHaveValue("bug");
  await expect(page.locator("#search [data-search]")).toHaveCount(0);
  await expect(page.locator('#search input[type="hidden"][name="authorId"]')).toHaveValue("");
  await expect(page.locator('#search input[type="hidden"][name="assigneeId"]')).toHaveValue("");
  await expect(page.locator('#search input[type="hidden"][name="mentionId"]')).toHaveValue("");
  await expect(page.locator("#search .search-bar .search-btn .yobicon-search")).toHaveCount(1);

  const issueRequestCountBeforeSelect = mock.issueRequestUrls.length;
  await projectSearch.fill("SAMP");
  await expect(page.getByRole("option")).toHaveText(["sample"]);
  await projectSearch.press("Enter");
  await expect(projects.locator('input[name="projectNames[]"]')).toHaveValue("sample");
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({
      filter: "bug",
      orderBy: "createdDate",
      orderDir: "desc",
      pageNum: "1",
      projectNames: "sample",
      state: "open",
    });
  await expect
    .poll(() => mock.issueRequestUrls.length)
    .toBeGreaterThan(issueRequestCountBeforeSelect);
  expect(mock.issueRequestUrls.at(-1)).toContain("projectNames=sample");

  // Live legacy rendering is not available in this harness; these are Scala HTML/LESS-derived
  // containment metrics, not a claim of screenshot-level visual parity.
  const boxes = await page.evaluate(() => {
    const selectors = {
      header: ".project-header-outer",
      leftMenu: ".issue-list-wrap > .left-menu",
      list: ".post-list-wrap",
      menu: ".project-menu-outer",
      pageWrap: ".page-wrap",
      projects: "#projects",
      searchBar: "#search .search-bar",
      searchForm: "#search",
      span10: "#span10",
      tabs: "#span10 > .nav-tabs.nm",
    } as const;
    return Object.fromEntries(
      Object.entries(selectors).map(([name, selector]) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) {
          throw new Error(`Missing ${selector}`);
        }
        const rect = element.getBoundingClientRect();
        return [
          name,
          {
            bottom: rect.bottom,
            height: rect.height,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            width: rect.width,
          },
        ];
      }),
    );
  });

  expect(boxes.header.bottom).toBeLessThanOrEqual(boxes.menu.top + 1);
  expect(boxes.menu.bottom).toBeLessThanOrEqual(boxes.pageWrap.top);
  expect(boxes.leftMenu.left).toBeGreaterThanOrEqual(boxes.pageWrap.left);
  expect(boxes.span10.right).toBeLessThanOrEqual(boxes.pageWrap.right + 1);
  expect(boxes.leftMenu.right).toBeLessThanOrEqual(boxes.span10.left + 1);
  expect(boxes.searchForm.left).toBeGreaterThanOrEqual(boxes.leftMenu.left);
  expect(boxes.searchForm.right).toBeLessThanOrEqual(boxes.leftMenu.right + 1);
  expect(boxes.projects.left).toBeGreaterThanOrEqual(boxes.searchForm.left);
  expect(boxes.projects.right).toBeLessThanOrEqual(boxes.searchForm.right + 1);
  expect(boxes.projects.bottom).toBeLessThanOrEqual(boxes.searchBar.top);
  expect(boxes.tabs.left).toBeGreaterThanOrEqual(boxes.span10.left);
  expect(boxes.tabs.right).toBeLessThanOrEqual(boxes.span10.right + 1);
  expect(boxes.list.left).toBeGreaterThanOrEqual(boxes.span10.left);
  expect(boxes.list.right).toBeLessThanOrEqual(boxes.span10.right + 1);
  expect(boxes.tabs.bottom).toBeLessThanOrEqual(boxes.list.top);
});

test("organization issue aggregate pins the live localhost guest shell title and scope branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page, { isAnonymous: true, viewerCanUpdate: false });

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);

  await expect(page).toHaveTitle("weblabs");
  await expect.poll(() => firstHeadTitleText(page)).toBe("weblabs");
  await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator('[data-owner="global-gnb-nav"] > li > a')).toHaveText([
    "Y",
    "List All",
    "Feedback",
  ]);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  await expect(page.locator(".gnb-usermenu")).toContainText("Log in");
  await expect(page.locator(".gnb-usermenu")).toContainText("Sign up");
  await expect(page.locator(".project-setting a")).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop > li")).toHaveText([
    "Group Home",
    "Issue",
    "Board",
    "Pull request",
  ]);

  const metrics = await page.evaluate(() => {
    const navbar = document.querySelector("header[data-owner=global-gnb-outer]");
    const scopeButton = document.querySelector("#gnb-search-scope-title");
    const searchBox = document.querySelector('[data-owner="global-gnb-search-box"]');
    if (!(navbar instanceof HTMLElement)) {
      throw new Error("Missing header.gnb-outer");
    }
    if (!(scopeButton instanceof HTMLElement)) {
      throw new Error("Missing #gnb-search-scope-title");
    }
    if (!(searchBox instanceof HTMLElement)) {
      throw new Error("Missing global GNB search box owner");
    }
    return {
      navbar: navbar.getBoundingClientRect(),
      scopeButton: scopeButton.getBoundingClientRect(),
      searchBox: searchBox.getBoundingClientRect(),
    };
  });

  expect(metrics.scopeButton.top).toBeGreaterThanOrEqual(metrics.navbar.top);
  expect(metrics.scopeButton.bottom).toBeLessThanOrEqual(metrics.navbar.bottom);
  expect(metrics.searchBox.top).toBeGreaterThanOrEqual(metrics.navbar.top);
  expect(metrics.searchBox.bottom).toBeLessThanOrEqual(metrics.navbar.bottom);
  expect(metrics.searchBox.right).toBeLessThanOrEqual(metrics.navbar.right);

  await page.locator("#gnb-search-scope-title").click();
  await expect(page.locator("[data-owner=global-gnb-search-scope-item] > button")).toHaveText([
    "All Projects",
  ]);
});

test("organization issue row converted links keep SPA marker for detail and hash navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page);

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "detail";
  });
  await page.locator("#issue-item-42 .title-wrap .title").click();
  await expect
    .poll(() => windowPath(page))
    .toEqual({
      hash: "",
      pathname: `${basePath}/weblabs/sample/issue/11`,
    });
  await expect.poll(() => spaMarker(page)).toBe("detail");

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "comments";
  });
  await page.locator("#issue-item-42 .item-count-groups a").first().click();
  await expect
    .poll(() => windowPath(page))
    .toEqual({
      hash: "#comments",
      pathname: `${basePath}/weblabs/sample/issue/11`,
    });
  await expect.poll(() => spaMarker(page)).toBe("comments");
});

test("organization issue aggregate renders legacy pagination links and input behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page);

  await page.goto(
    `${basePath}/organizations/weblabs/issues?state=open&filter=bug&pageNum=1&labelIds=8`,
  );

  const pagination = page.locator("#pagination");
  await expect(pagination).toHaveClass("page-navigation-wrap");
  await expect(pagination).toHaveAttribute("data-total", "3");
  await expect(pagination.locator("ul.page-nums > li.page-num")).toHaveCount(5);
  await expect(pagination.locator("li.page-num.ikon").first()).toContainText("Previous page");
  await expect(pagination.locator("li.page-num.ikon").first().locator("a")).toHaveCount(0);
  await expect(pagination.locator(".btn-pg-prev")).toHaveClass(/off/);

  const input = pagination.locator('input[name="pageNum"]');
  await expect(input).toHaveAttribute("type", "number");
  await expect(input).toHaveAttribute("pattern", "[0-9]*");
  await expect(input).toHaveAttribute("min", "1");
  await expect(input).toHaveAttribute("max", "3");
  await expect(input).toHaveValue("1");
  await expect(pagination.locator(".delimiter")).toHaveText("/");
  await expect(pagination.locator("li.page-num").nth(3)).toHaveText("3");

  const nextPageLink = pagination.locator("a").filter({ hasText: "Next page" });
  await expect(nextPageLink).toHaveAttribute("href", /pageNum=2/);
  await expect(nextPageLink).toHaveAttribute("href", /filter=bug/);
  await expect(nextPageLink).toHaveAttribute("href", /state=open/);
  await expect(nextPageLink).toHaveAttribute("href", /labelIds=8/);
  await expect(nextPageLink).not.toHaveAttribute("aria-current");
  await expect(nextPageLink).not.toHaveAttribute("data-status");
  await expect(nextPageLink.locator(".btn-pg-next")).not.toHaveClass(/off/);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "pagination";
  });
  await nextPageLink.click();
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ filter: "bug", labelIds: "8", pageNum: "2", state: "open" });
  await expect.poll(() => spaMarker(page)).toBe("pagination");
  const previousPageLink = pagination.locator("a").filter({ hasText: "Previous page" });
  await expect(previousPageLink).toHaveAttribute("href", /pageNum=1/);
  await expect(previousPageLink).not.toHaveAttribute("aria-current");
  await expect(previousPageLink).not.toHaveAttribute("data-status");

  await input.fill("9");
  await input.press("Enter");
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ labelIds: "8", pageNum: "3" });
  await expect(input).toHaveValue("3");

  await input.evaluate((element) => {
    (element as HTMLInputElement).value = "not-a-page";
  });
  await input.press("Enter");
  await expect(input).toHaveValue("3");
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ labelIds: "8", pageNum: "3" });
});

test("organization issue row source uses Link for internal row anchors", () => {
  const source = readFileSync(ORGANIZATION_ISSUES_ROUTE_SOURCE, "utf8");
  expect(source).not.toContain("as unknown as");
  expect(source).not.toContain("pjaxContainer");
  expect(source).not.toContain("legacyHref");
  expect(source).not.toContain("rowAttributes");
  expect(source).not.toContain("const projectHref");
  expect(source).not.toContain("const authorHref");
  expect(source).not.toContain("const assigneeHref");
  expect(source).not.toContain("href={`${projectHref}");
  expect(source).not.toContain("href={authorHref}");
  expect(source).not.toContain("href={assigneeHref}");
  expect(source).toContain('hash="comments"');
  expect(source).toContain('hash="vote"');
  expect(source).toContain("to={projectRoutePath}");
  expect(source).toContain("to={authorRoutePath}");
  expect(source).toContain("to={assigneeRoutePath}");
  expect(source).toContain('to="/$ownerName/$projectName/milestone/$milestoneId"');
  expect(source).toContain("search={{}}");
});

test("organization issues two-column source keeps React popover cleanup", () => {
  const source = readFileSync(ORGANIZATION_ISSUES_ROUTE_SOURCE, "utf8");
  const twoColumnSource = source.slice(
    source.indexOf("function TwoColumnModeCheckbox"),
    source.indexOf("function OrganizationHeader"),
  );
  expect(twoColumnSource).toContain("useState(false)");
  expect(twoColumnSource).toContain('localStorage.getItem("useTwoColumnMode") === "true"');
  expect(twoColumnSource).toContain('localStorage.setItem("useTwoColumnMode", String(checked))');
  expect(twoColumnSource).toContain("setTimeout(() => setShowPopover(true), 100)");
  expect(twoColumnSource).toContain("setTimeout(() => setShowPopover(false), 100)");
  expect(twoColumnSource).toContain("popover top");
  expect(twoColumnSource).toContain('role="tooltip"');
  expect(twoColumnSource).toContain('data-owner="organization-issues-two-column-popover"');
  expect(twoColumnSource).not.toContain("data-content=");
  expect(twoColumnSource).not.toContain("document.");
  expect(twoColumnSource).not.toContain("addEventListener");
  expect(twoColumnSource).not.toContain("classList");
  expect(twoColumnSource).not.toContain("style.display");
  expect(twoColumnSource).not.toContain("dangerouslySetInnerHTML");
});

test("organization issues top menu source uses direct Link targets", () => {
  const source = readFileSync(ORGANIZATION_ISSUES_ROUTE_SOURCE, "utf8");
  expect(source).not.toContain("<a ");
  expect(source).not.toContain("organizationHref(");
  expect(source).not.toContain("OrganizationRouteLink");
  expect(source).toContain("function OrganizationHeader");
  expect(source).toContain('to="/organizations/$organizationName"');
  expect(source).toContain('to="/organizations/$organizationName/issues"');
  expect(source).toContain('to="/organizations/$organizationName/boards"');
  expect(source).toContain('to="/organizations/$organizationName/pullrequests"');
  expect(source).toContain('to="/organizations/$organizationName/settingform"');
  expect(source).toContain("params={{ organizationName }}");
  expect(source).toContain('"aria-current": undefined');
  expect(source).toContain('"data-status": undefined');
});

test("organization issues search form drops delegated data-search markers", async ({ page }) => {
  const source = readFileSync(ORGANIZATION_ISSUES_ROUTE_SOURCE, "utf8");
  expect(source).not.toContain("data-search");

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page);

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);

  await expect(page.locator("#search [data-search]")).toHaveCount(0);
  await expect(page.locator('#search input[type="hidden"][name="authorId"]')).toHaveValue("");
  await expect(page.locator('#search input[type="hidden"][name="assigneeId"]')).toHaveValue("");
  await expect(page.locator('#search input[type="hidden"][name="mentionId"]')).toHaveValue("");
});

test("organization issue aggregate filter controls are React buttons with legacy search evidence", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page, { itemCount: 2 });

  await page.goto(
    `${basePath}/organizations/weblabs/issues?state=open&filter=bug&pageNum=3&orderBy=createdDate&orderDir=desc`,
  );
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  const quickButtons = page.locator('.lst-stacked button[type="button"]');
  await expect(quickButtons).toHaveCount(4);
  await expect(page.locator(".issue-list-wrap[pjax-container]")).toHaveCount(0);
  await expect(page.locator(".lst-stacked [pjax-filter]")).toHaveCount(0);
  await expect(page.locator('.lst-stacked a[href="#"]')).toHaveCount(0);
  await expect(quickButtons.nth(0)).toHaveAttribute("data-assignee-id", "");
  await expect(quickButtons.nth(1)).toHaveAttribute("data-assignee-id", "1");
  await expect(quickButtons.nth(2)).toHaveAttribute("data-author-id", "1");
  await expect(quickButtons.nth(3)).toHaveAttribute("data-mention-id", "1");

  const stateButtons = page.locator(".nav-tabs.nm > li > button[state]");
  await expect(stateButtons).toHaveCount(2);
  await expect(stateButtons.nth(0)).toHaveAttribute("type", "button");
  await expect(stateButtons.nth(0)).toHaveAttribute("state", "open");
  await expect(stateButtons.nth(1)).toHaveAttribute("state", "closed");
  await expect(page.locator('.nav-tabs.nm > li > a[href="#"][state]')).toHaveCount(0);

  const sortButtons = page.locator(".filter-wrap .filters button.filter");
  await expect(sortButtons).toHaveCount(4);
  await expect(page.locator('.filter-wrap .filters a[href="#"].filter')).toHaveCount(0);
  await expect(sortButtons.nth(0)).toHaveAttribute("orderby", "dueDate");
  await expect(sortButtons.nth(0)).toHaveAttribute("orderdir", "desc");
  await expect(sortButtons.nth(2)).toHaveClass(/active/);
  await expect(sortButtons.nth(2)).toHaveAttribute("orderby", "createdDate");
  await expect(sortButtons.nth(2)).toHaveAttribute("orderdir", "asc");
  await expect(sortButtons.nth(2).locator("i")).toHaveClass(/down/);

  await quickButtons.nth(1).click();
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ assigneeId: "1", filter: "bug", pageNum: "1", state: "open" });
  await expect(page.locator("#search [data-search]")).toHaveCount(0);
  await expect(page.locator('input[name="assigneeId"]')).toHaveValue("1");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await stateButtons.nth(1).click();
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ assigneeId: "1", filter: "bug", pageNum: "1", state: "closed" });
  await expect(page.locator('input[name="state"]')).toHaveValue("closed");

  await sortButtons.nth(0).click();
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ orderBy: "dueDate", orderDir: "desc", pageNum: "1", state: "closed" });
  await expect(page.locator('input[name="orderBy"]')).toHaveValue("dueDate");
  await expect(page.locator('input[name="orderDir"]')).toHaveValue("desc");
});

test("organization issue aggregate hides user quick filters for anonymous users", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page, { isAnonymous: true });

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  await expect(page.locator(".lst-stacked > li")).toHaveCount(1);
  await expect(page.locator(".lst-stacked > li")).toHaveClass("active");
  await expect(page.locator('.lst-stacked button[type="button"]')).toHaveText("All issues");
  await expect(page.locator(".lst-stacked [pjax-filter]")).toHaveCount(0);
  await expect(page.locator('.lst-stacked [data-assignee-id="1"]')).toHaveCount(0);
  await expect(page.locator('.lst-stacked [data-author-id="1"]')).toHaveCount(0);
  await expect(page.locator('.lst-stacked [data-mention-id="1"]')).toHaveCount(0);
});

test("organization issue aggregate source uses narrow legacy attr types", () => {
  const source = readFileSync(ORGANIZATION_ISSUES_ROUTE_SOURCE, "utf8");
  expect(source).not.toContain('Record<"pjax-filter", string>');
  expect(source).not.toContain('"pjax-container"');
  expect(source).not.toContain('"pjax-filter"');
  expect(source).not.toContain('Record<"state", string>');
  expect(source).not.toContain('Record<"orderby" | "orderdir", string>');
  expect(source).not.toContain("LiHTMLAttributes");
  expect(source).not.toContain("pjaxFilter");
  expect(source).not.toContain("legacyState");
  expect(source).toContain(
    "type LegacyIssueRowAttributes = HTMLAttributes<HTMLLIElement> & { href: string };",
  );
  expect(source).toContain("type LegacyStateTabAttrs");
  expect(source).toContain("type LegacySortFilterAttrs");
  expect(source).toContain("satisfies LegacyStateTabAttrs");
  expect(source).toContain("satisfies LegacySortFilterAttrs");
  expect(source).toContain("} satisfies LegacyIssueRowAttributes;");
});

test("organization issues menu board link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installOrganizationIssuesMenuNativeLinkAudit(page);
  await mockOrganizationIssues(page);

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  const boardLink = page.locator(".project-menu-gruop a").filter({ hasText: "Board" });
  await expect(boardLink).toHaveAttribute("href", `${basePath}/organizations/weblabs/boards`);
  expect(await readOrganizationIssuesMenuNativeLinkAudit(page)).toEqual([]);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await boardLink.click();

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe(`${basePath}/organizations/weblabs/boards`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Board");
  await expect(page.locator("#option_form")).toBeVisible();
  expect(await readOrganizationIssuesMenuNativeLinkAudit(page)).toEqual([]);
});

async function installOrganizationIssuesMenuNativeLinkAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__organizationIssuesMenuNativeLinkListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithOrganizationIssuesMenuAudit(
      type,
      listener,
      options,
    ) {
      if (this instanceof HTMLAnchorElement && this.matches(".project-menu-gruop a")) {
        (
          window as Window &
            typeof globalThis & { __organizationIssuesMenuNativeLinkListeners: string[] }
        ).__organizationIssuesMenuNativeLinkListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readOrganizationIssuesMenuNativeLinkAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __organizationIssuesMenuNativeLinkListeners?: string[] }
      ).__organizationIssuesMenuNativeLinkListeners ?? [],
  );
}

async function organizationIssuesTwoColumnPopoverMetrics(page: Page) {
  return page.locator("#two-column-mode-checkbox").evaluate((wrapper) => {
    const popover = wrapper.querySelector(".popover.top");
    const toggle = wrapper.querySelector("#two-column-mode");
    if (!(popover instanceof HTMLElement)) {
      throw new Error("Missing two-column popover");
    }
    if (!(toggle instanceof HTMLElement)) {
      throw new Error("Missing two-column toggle");
    }
    const popoverRect = popover.getBoundingClientRect();
    const toggleRect = toggle.getBoundingClientRect();
    const popoverStyle = getComputedStyle(popover);
    return {
      contentText: popover.querySelector(".popover-content")?.textContent?.trim() ?? "",
      hasArrow: popover.querySelector(".arrow") !== null,
      position: popoverStyle.position,
      bottom: popoverStyle.bottom,
      placementClass: popover.className === "popover top",
      popoverBottomIsAboveToggleTop: popoverRect.bottom <= toggleRect.top + 1,
      role: popover.getAttribute("role"),
      titleText: popover.querySelector(".popover-title")?.textContent?.trim() ?? "",
    };
  });
}

async function currentOrganizationIssueSearch(page: Page) {
  return page.evaluate(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      assigneeId: params.get("assigneeId") ?? "",
      filter: params.get("filter") ?? "",
      labelIds: params.get("labelIds") ?? "",
      orderBy: params.get("orderBy") ?? "",
      orderDir: params.get("orderDir") ?? "",
      pageNum: params.get("pageNum") ?? "",
      projectNames: params.getAll("projectNames[]").join(","),
      state: params.get("state") ?? "",
    };
  });
}

async function windowPath(page: Page) {
  return page.evaluate(() => ({
    hash: window.location.hash,
    pathname: window.location.pathname,
  }));
}

async function spaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function firstHeadTitleText(page: Page) {
  return page.evaluate(() => document.head.querySelector("title")?.textContent ?? "");
}

async function hrefs(page: Page, selector: string) {
  return page
    .locator(selector)
    .evaluateAll((links) =>
      links.map((link) => (link instanceof HTMLAnchorElement ? link.getAttribute("href") : null)),
    );
}

async function attributes(page: Page, selector: string, name: string) {
  return page
    .locator(selector)
    .evaluateAll(
      (elements, attributeName) => elements.map((element) => element.getAttribute(attributeName)),
      name,
    );
}

async function mockOrganizationIssues(
  page: Page,
  options: { isAnonymous?: boolean; itemCount?: number; viewerCanUpdate?: boolean } = {},
) {
  const issueRequestUrls: string[] = [];
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
    };
  }, process.env.YONA_DEV_BASE_PATH ?? "/yona");
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: options.isAnonymous ? null : 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: options.isAnonymous === true,
        isConfirmed: true,
        isSiteAdmin: options.isAnonymous === true ? false : true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanUpdate: options.viewerCanUpdate ?? true,
        visibleProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/issues**", async (route) => {
    issueRequestUrls.push(route.request().url());
    const itemCount = options.itemCount ?? 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 2,
        filter: "bug",
        items: [
          {
            assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
            assigneeLabel: "Site Admin",
            assigneeLoginId: "admin",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 3,
            createdLabel: "Jul 1, 2026",
            dueDateLabel: "Jun 30, 2026",
            dueDateOverdue: true,
            dueDateText: "Overdue",
            id: 42,
            issueNumber: 11,
            labels: [{ color: "#51aacc", id: 8, name: "bug" }],
            milestoneId: 5,
            milestoneTitle: "v1.0",
            ownerName: "weblabs",
            projectName: "sample",
            state: "open",
            title: "Fix flaky issue",
            updatedLabel: "Jul 1, 2026",
            voterCount: 1,
          },
          ...(itemCount > 1
            ? [
                {
                  assigneeAvatarUrl: "",
                  assigneeLabel: "",
                  assigneeLoginId: "",
                  authorAvatarUrl: "/assets/images/default-avatar-32.png",
                  authorLabel: "Site Admin",
                  authorLoginId: "admin",
                  commentCount: 0,
                  createdLabel: "Jul 2, 2026",
                  dueDateLabel: "",
                  dueDateOverdue: false,
                  dueDateText: "",
                  id: 43,
                  issueNumber: 12,
                  labels: [],
                  milestoneId: null,
                  milestoneTitle: "",
                  ownerName: "weblabs",
                  projectName: "playground",
                  state: "open",
                  title: "Add aggregate issue row",
                  updatedLabel: "Jul 2, 2026",
                  voterCount: 0,
                },
              ]
            : []),
        ],
        openIssueCount: 1,
        orderBy: "createdDate",
        orderDir: "desc",
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        state: "open",
        totalCount: itemCount,
        totalPages: 3,
        viewerUserId: 1,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/boards**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        notices: [],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
  return { issueRequestUrls };
}
