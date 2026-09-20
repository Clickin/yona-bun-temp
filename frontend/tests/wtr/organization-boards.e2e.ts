import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const ORGANIZATION_BOARDS_ROUTE_SOURCE = readFileSync(
  "src/routes/organizations/$organizationName/boards.tsx",
  "utf8",
);
const ORGANIZATION_PARENT_ROUTE_SOURCE = readFileSync(
  "src/routes/organizations/$organizationName.tsx",
  "utf8",
);
const LEGACY_GROUP_BOARD_LIST_SOURCE = readFileSync(
  "../yona-original/app/views/organization/group_board_list.scala.html",
  "utf8",
);
const LEGACY_BOARD_APP_SOURCE = readFileSync(
  "../yona-original/app/controllers/BoardApp.java",
  "utf8",
);
const LEGACY_ROUTES_SOURCE = readFileSync("../yona-original/conf/routes", "utf8");

async function assertOrganizationBoardRowTooltipCleanup(page: Page) {
  const rowTooltipTargets = page.locator(
    ".post-list-wrap .post-item .avatar-wrap, .post-list-wrap .post-item .infos > .infos-item.infos-link-item",
  );
  await expect(rowTooltipTargets).toHaveCount(4);
  expect(
    await rowTooltipTargets.evaluateAll((elements) =>
      elements.map((element) => ({
        placement: element.getAttribute("data-placement"),
        title: element.getAttribute("title"),
        toggle: element.getAttribute("data-toggle"),
      })),
    ),
  ).toEqual([
    { placement: null, title: "admin", toggle: null },
    { placement: null, title: "admin", toggle: null },
    { placement: null, title: "dev", toggle: null },
    { placement: null, title: "dev", toggle: null },
  ]);
  await expect(page.locator(".notice-wrap .infos-link-item").first()).toHaveText("Site Admin");
  await expect(
    page.locator(".post-list-wrap:not(.notice-wrap) .infos-link-item").first(),
  ).toHaveText("Dev Member");
  await expect(page.locator(".notice-wrap .group-project-name").first()).toHaveText("sample");
  await expect(page.locator(".notice-wrap .infos > span.infos-item").first()).toHaveAttribute(
    "title",
    "2026-07-01 12:00:00 PM",
  );
  await expect(page.locator(".notice-wrap .infos > span.infos-item").first()).toHaveText(
    "2 days ago",
  );
  await expect(page.locator(".post-list-wrap .post-item [data-placement]")).toHaveCount(0);
}

test("organization board aggregate preserves metadata, ordering and project filtering", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );
  await expect(page).toHaveTitle("weblabs");
  await expect
    .poll(() => page.evaluate(() => document.head.querySelector("title")?.textContent ?? ""))
    .toBe("weblabs");
  await expect(page.locator("#option_form")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Board");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(2);
  await expect(page.locator(".notice-wrap .post-item")).toHaveCount(1);
  await assertOrganizationBoardRowTooltipCleanup(page);
  await expect(page.locator('#projects input[name="projectNames[]"]')).toHaveValue("sample");
  const projectSearch = page.getByRole("combobox", { name: "Choose projects" });
  await projectSearch.click();
  await expect(page.getByRole("option")).toHaveText(["playground"]);
  await expect(page.locator(".filter-wrap.board .filter.active")).toHaveText("Comments");
  await expect(page.locator(".filter-wrap.board .filter.active")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards?orderBy=numOfComments&orderDir=asc`,
  );

  await page.getByRole("option", { name: "playground", exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.getAll("projectNames[]"))
    .toEqual(["sample", "playground"]);
  await expect(page.locator("#option_form")).toBeVisible();
});

test("organization board row metadata keeps native title/date/author/project contract without placement markers", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );

  await assertOrganizationBoardRowTooltipCleanup(page);
});

test("organization board row missing author fallback uses legacy message copy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page, "missingAuthor");

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );

  const missingAuthorRow = page.locator(".post-list-wrap:not(.notice-wrap) .post-item").first();
  await expect(missingAuthorRow.locator(".title-wrap .title")).toHaveText("Release note");
  await expect(missingAuthorRow.locator(".infos > .infos-item").first()).toHaveText("No author");
  await expect(missingAuthorRow.locator(".infos > .infos-item").first()).toHaveClass("infos-item");
  await expect(missingAuthorRow.locator(".infos > .infos-item.infos-link-item")).toHaveCount(0);
  await expect(missingAuthorRow.locator(".group-project-name")).toHaveText("sample");
});

test("organization board projects support search, keyboard selection, removal and form submission", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);
  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&orderBy=numOfComments&orderDir=desc`,
  );
  const search = page.getByRole("combobox", { name: "Choose projects" });
  await expect(search).toHaveAttribute("placeholder", "Choose projects");
  await search.click();
  await expect(page.getByRole("option")).toHaveText(["sample", "playground"]);
  await search.press("ArrowDown");
  await expect(page.getByRole("option", { name: "playground", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await search.press("ArrowUp");
  await expect(page.getByRole("option", { name: "sample", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await search.fill("PLAY");
  await expect(page.getByRole("option")).toHaveText(["playground"]);
  await search.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.locator('#projects input[name="projectNames[]"]')).toHaveCount(0);
  await search.fill("play");
  await search.press("Enter");
  await expect
    .poll(() => new URL(page.url()).searchParams.getAll("projectNames[]"))
    .toEqual(["playground"]);
  await expect(page.locator('#projects input[name="projectNames[]"]')).toHaveValue("playground");
  await expect(page.getByRole("button", { name: "Delete: playground" })).toBeVisible();
  expect(
    await page
      .locator("#option_form")
      .evaluate((form) => new FormData(form as HTMLFormElement).getAll("projectNames[]")),
  ).toEqual(["playground"]);
  await page.getByRole("button", { name: "Delete: playground" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.getAll("projectNames[]")).toEqual([]);
  await expect(page.locator('#option_form input[name="filter"]')).toHaveValue("release");
});

test("organization board two-column checkbox popover follows legacy hover and persisted toggle behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();

  const wrapper = page.locator("#option_form #two-column-mode-checkbox");
  const toggle = page.locator("#two-column-mode");
  await expect(wrapper).toHaveClass(/two-column-icon mr10 hide-in-mobile/);
  await expect(wrapper).toHaveAttribute("title", "Two Column Mode");
  await expect(wrapper).not.toHaveAttribute("data-content", /.+/u);
  await expect(wrapper.locator("label.checkbox")).toHaveCount(1);
  await expect(wrapper.locator(".two-column-icon-border")).toHaveCount(1);
  await expect(wrapper.locator(".two-column-mode-text")).toHaveText("Column View");
  await expect(wrapper.locator(".popover.top")).toHaveCount(0);
  await expect(toggle).not.toBeChecked();
  expect(await organizationBoardTwoColumnMetrics(page)).toEqual({
    borderColor: "rgb(3, 175, 255)",
    borderPadding: "3px 3px 0px",
    borderRadius: "3px",
    borderTextColor: "rgb(3, 169, 244)",
    checkboxId: "two-column-mode",
    checkboxMargin: "4px 4px 0px 2px",
    dataContent: null,
    display: "inline-block",
    followsSearchBar: true,
    lineHeight: "37px",
    marginLeft: "10px",
    text: "Column View",
    textLineHeight: "20px",
    textPadding: "0px 4px 0px 0px",
    title: "Two Column Mode",
    wrapperClass: "two-column-icon mr10 hide-in-mobile",
    wrapperPosition: "relative",
  });

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

  await wrapper.hover();
  const hoverPopover = wrapper.locator(".popover.top");
  await expect(hoverPopover).toBeVisible();
  await expect(hoverPopover.locator(".popover-title")).toHaveText("Two Column Mode");
  await expect(hoverPopover.locator(".popover-content")).toHaveText(
    "Splits list and body into columns respectively",
  );
  expect(await organizationBoardTwoColumnPopoverMetrics(page)).toEqual({
    contentText: "Splits list and body into columns respectively",
    hasArrow: true,
    placementClass: true,
    popoverBottomIsAboveToggleBottom: true,
    role: "tooltip",
    titleText: "Two Column Mode",
  });
  await page.locator("body").hover({ position: { x: 10, y: 10 } });
  await expect(wrapper.locator(".popover")).toHaveCount(0);

  await page.locator('#option_form input[name="filter"]').focus();
  await toggle.focus();
  const focusPopover = wrapper.locator(".popover.top");
  await expect(focusPopover).toBeVisible();
  await page.locator('#option_form input[name="filter"]').focus();
  await expect(wrapper.locator(".popover")).toHaveCount(0);
});

test("organization board aggregate pins the live localhost guest shell title and scope branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page, "default", { isAnonymous: true, viewerCanUpdate: false });

  await page.goto(`${basePath}/organizations/weblabs/boards`);

  await expect(page).toHaveTitle("weblabs");
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

test("organization board aggregate preserves its empty state and filter controls", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page, "empty");

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=empty&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );
  await expect(page.locator("#option_form")).toBeVisible();
  await expect(page.locator(".error-wrap")).toHaveText("No post has been added.");
  await expect(page.locator(".filter-wrap.board")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);
});

test("organization board aggregate renders legacy pagination and input behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page, "paginated");

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc&pageNum=1`,
  );

  const pagination = page.locator("#pagination");
  await expect(pagination).toHaveClass(/(?:^|\s)page-navigation-wrap(?:\s|$)/u);
  await expect(pagination.locator("ul.page-nums > li.page-num")).toHaveCount(5);
  await expect(pagination.locator(".btn-pg-prev.off")).toHaveCount(1);
  await expect(pagination.locator(".page-num.ikon").first()).toHaveText("Previous page");
  await expect(pagination.locator(".page-num.delimiter")).toHaveText("/");
  await expect(pagination.locator("li.page-num").nth(3)).toHaveText("3");

  const input = pagination.locator('input[name="pageNum"]');
  await expect(input).toHaveAttribute("type", "number");
  await expect(input).toHaveAttribute("pattern", "[0-9]*");
  await expect(input).toHaveAttribute("min", "1");
  await expect(input).toHaveAttribute("max", "3");
  await expect(input).toHaveValue("1");

  const nextLink = pagination.locator(".page-num.ikon a").last();
  await expect(nextLink).toHaveText("Next page");
  // the next/prev icon links point at other pages — neither is the active
  // page, so TanStack renders no aria-current (the legacy has none either).
  await expect(nextLink).not.toHaveAttribute("aria-current", /.+/u);
  await expect(nextLink).not.toHaveAttribute("data-status", /.+/u);
  const nextHref = await nextLink.getAttribute("href");
  expect(nextHref).toContain(`${basePath}/organizations/weblabs/boards`);
  expect(nextHref).toContain("filter=release");
  expect(nextHref).toContain("orderBy=numOfComments");
  expect(nextHref).toContain("orderDir=desc");
  expect(nextHref).toContain("pageNum=2");
  expect(nextHref).toContain("sample");

  await input.evaluate((element) => {
    element.setAttribute("type", "text");
    element.value = "abc";
  });
  await input.press("Enter");
  await expect(input).toHaveValue("1");
  // legacy yobi.Pagination.js rejects non-digit input (rxDigit fails) and
  // resets the field without navigating — the URL keeps no pageNum.
  expect(new URL(page.url()).searchParams.get("pageNum")).toBeNull();

  await input.evaluate((element) => {
    element.setAttribute("type", "number");
    element.value = "99";
  });
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(input).toHaveValue("3");
  const prevLink = pagination.locator(".page-num.ikon a").first();
  await expect(prevLink).toHaveText("Previous page");
  await expect(prevLink).not.toHaveAttribute("aria-current", /.+/u);
  await expect(prevLink).not.toHaveAttribute("data-status", /.+/u);
  await expect(pagination.locator(".btn-pg-next.off")).toHaveCount(1);
  await expect(pagination.locator(".page-num.ikon").last()).toHaveText("Next page");
});

test("organization boards menu issue link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__organizationBoardMenuNativeListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithOrganizationMenuAudit(
      type,
      listener,
      options,
    ) {
      if (this instanceof HTMLAnchorElement && this.matches(".project-menu-gruop a")) {
        (
          window as Window &
            typeof globalThis & { __organizationBoardMenuNativeListeners: string[] }
        ).__organizationBoardMenuNativeListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );
  const issueLink = page.locator(".project-menu-gruop a").filter({ hasText: "Issue" });
  await expect(issueLink).toHaveAttribute("href", `${basePath}/organizations/weblabs/issues`);
  expect(
    await page.evaluate(
      () =>
        (
          window as Window &
            typeof globalThis & { __organizationBoardMenuNativeListeners?: string[] }
        ).__organizationBoardMenuNativeListeners ?? [],
    ),
  ).toEqual([]);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await issueLink.click();

  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath}/organizations/weblabs/issues`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Issue");
  await expect(page.locator("#search")).toBeVisible();
});

test("organization boards filter and breadcrumb links preserve legacy hrefs with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  expect(LEGACY_GROUP_BOARD_LIST_SOURCE).toContain(
    '@urlToList?orderBy=@fieldName&orderDir=@if(orderDir.equals("desc")){asc}else{desc}',
  );
  expect(LEGACY_GROUP_BOARD_LIST_SOURCE).toContain("@urlToList?orderBy=@fieldName&orderDir=desc");
  expect(LEGACY_BOARD_APP_SOURCE).toContain(
    "SearchCondition searchCondition = postParamForm.bindFromRequest().get();",
  );
  expect(LEGACY_BOARD_APP_SOURCE).toContain("searchCondition.pageNum = pageNum - 1;");
  expect(LEGACY_ROUTES_SOURCE).toContain("/organizations/:organizationName/boards");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toMatch(
    /type OrganizationBoardsSearchInput = Partial<OrganizationBoardsSearch> &\s+SearchSchemaInput & \{\s+"projectNames\[\]"\?: unknown;\s+\};/u,
  );
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toMatch(
    /type SearchMiddlewareContext<TSearchSchema> = Parameters<SearchMiddleware<TSearchSchema>>\[0\];/u,
  );
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toMatch(
    /const explicit = isRecord\(ctx\.meta\?\.explicit\) \? ctx\.meta\.explicit : \{\};/u,
  );
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc&pageNum=1`,
  );

  const breadcrumbLink = page.locator(".project-breadcrumb .project-author a");
  await expect(breadcrumbLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);

  const updatedFilter = page.locator(".filter-wrap.board .filter").filter({ hasText: "Updated" });
  const createdFilter = page.locator(".filter-wrap.board .filter").filter({ hasText: "Created" });
  const commentsFilter = page.locator(".filter-wrap.board .filter").filter({ hasText: "Comments" });
  await expect(updatedFilter).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards?orderBy=updatedDate&orderDir=desc`,
  );
  await expect(createdFilter).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards?orderBy=createdDate&orderDir=desc`,
  );
  await expect(commentsFilter).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards?orderBy=numOfComments&orderDir=asc`,
  );
  await expect(commentsFilter).toHaveClass("filter active");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await updatedFilter.click();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    console.log("ZZ URL", i, page.url());
  }
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath}/organizations/weblabs/boards`);
  await expect.poll(() => new URL(page.url()).search).toBe("?orderBy=updatedDate&orderDir=desc");
  await expect(updatedFilter).toHaveClass("filter active");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("organization board row links preserve legacy hrefs with SPA transitions", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );

  const releaseRow = page.locator(".post-list-wrap:not(.notice-wrap) .post-item").first();
  await expect(releaseRow.locator(".avatar-wrap")).toHaveAttribute("href", `${basePath}/dev`);
  await expect(releaseRow.locator(".title-wrap .title")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/post/7`,
  );
  await expect(releaseRow.locator(".infos .infos-link-item").first()).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(releaseRow.locator(".group-project-name")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample`,
  );
  await expect(releaseRow.locator(".item-count-groups a")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/post/7#comments`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await releaseRow.locator(".title-wrap .title").click();

  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/weblabs/sample/post/7`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("organization board route source uses direct Links for row navigation", async () => {
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain('declare module "react"');
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("interface LiHTMLAttributes");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("as unknown as");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("legacyHref");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("const projectHref");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("const authorHref");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("href={projectHref}");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("href={authorHref}");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("href={`${postHref}#comments`}");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain(
    'to="/$ownerName/$projectName/post/$postNumber"',
  );
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain('to="/$ownerName/$projectName"');
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain('to="/$user"');
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain('hash="comments"');
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain("function OrganizationBoardPost");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain('data-owner="organization-boards-row"');
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain("post-item title");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain("title={post.authorLoginId}");
});

test("organization board route source uses legacy no-author message key", async () => {
  const rowSource = ORGANIZATION_BOARDS_ROUTE_SOURCE.slice(
    ORGANIZATION_BOARDS_ROUTE_SOURCE.indexOf("function OrganizationBoardPost"),
    ORGANIZATION_BOARDS_ROUTE_SOURCE.indexOf("function stringSearch"),
  );
  expect(rowSource).toContain("useLegacyMessages()");
  expect(rowSource).toContain('t("issue.noAuthor")');
  expect(rowSource).not.toContain(">No author<");
});

test("organization board route source renders two-column popover through React state", async () => {
  const twoColumnSource = readFileSync("src/components/two-column-mode-checkbox.tsx", "utf8");
  expect(twoColumnSource).toContain("useState(false)");
  expect(twoColumnSource).toContain('localStorage.getItem("useTwoColumnMode") === "true"');
  expect(twoColumnSource).toContain('localStorage.setItem("useTwoColumnMode", String(checked))');
  expect(twoColumnSource).toContain("setTimeout(() => setShowPopover(true), 100)");
  expect(twoColumnSource).toContain("setTimeout(() => setShowPopover(false), 100)");
  expect(twoColumnSource).toContain("popover top");
  expect(twoColumnSource).toContain('role="tooltip"');
  expect(twoColumnSource).not.toContain("data-content=");
  expect(twoColumnSource).not.toContain("document.");
  expect(twoColumnSource).not.toContain("addEventListener");
  expect(twoColumnSource).not.toContain("classList");
  expect(twoColumnSource).not.toContain("style.display");
  expect(twoColumnSource).not.toContain("dangerouslySetInnerHTML");
});

test("organization board route keeps only body navigation while the parent owns legacy header/menu Links", async () => {
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toMatch(/<a\b/u);
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toMatch(
    /\b(?:document|globalThis\.document|window\.document|window\.parent\.document)\.title\b/u,
  );
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("htmlDocument.title");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain("<title>{organizationName}</title>");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("boardListHref");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("organizationHref");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("OrganizationRouteLink");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("function OrganizationHeader");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("function OrganizationMenu");
  expect(ORGANIZATION_PARENT_ROUTE_SOURCE).toContain("<OrganizationHeader");
  expect(ORGANIZATION_PARENT_ROUTE_SOURCE).toContain("<OrganizationMenu");
  expect(ORGANIZATION_PARENT_ROUTE_SOURCE).toContain("<Outlet />");
  expect(ORGANIZATION_PARENT_ROUTE_SOURCE).toContain('to="/organizations/$organizationName"');
  // parent-owned menu links use template-literal targets (the parent route at
  // src/routes/organizations/$organizationName.tsx:1060ff keeps the legacy header/menu Links)
  expect(ORGANIZATION_PARENT_ROUTE_SOURCE).toContain(
    "to={`/organizations/${organizationName}/issues` as string}",
  );
  expect(ORGANIZATION_PARENT_ROUTE_SOURCE).toContain(
    "to={`/organizations/${organizationName}/boards` as string}",
  );
  expect(ORGANIZATION_PARENT_ROUTE_SOURCE).toContain(
    "to={`/organizations/${organizationName}/pullrequests` as string}",
  );
  expect(ORGANIZATION_PARENT_ROUTE_SOURCE).toContain(
    'to="/organizations/$organizationName/settingform"',
  );
});

async function organizationBoardTwoColumnMetrics(page: Page) {
  return page.locator("#option_form #two-column-mode-checkbox").evaluate((element) => {
    const wrapperStyle = window.getComputedStyle(element);
    const border = element.querySelector(".two-column-icon-border") as HTMLElement;
    const input = element.querySelector("#two-column-mode") as HTMLInputElement;
    const text = element.querySelector(".two-column-mode-text") as HTMLElement;
    const searchBar = document.querySelector("#option_form .search-bar");
    const missing = Object.entries({ border, input, text })
      .filter(([, node]) => !node)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected organization board two-column targets: ${missing.join(", ")}`);
    }
    const borderStyle = window.getComputedStyle(border);
    const inputStyle = window.getComputedStyle(input);
    const textStyle = window.getComputedStyle(text);

    return {
      borderColor: borderStyle.borderColor,
      borderPadding: borderStyle.padding,
      borderRadius: borderStyle.borderRadius,
      borderTextColor: borderStyle.color,
      checkboxId: input.id,
      checkboxMargin: inputStyle.margin,
      dataContent: element.getAttribute("data-content"),
      display: wrapperStyle.display,
      followsSearchBar: Boolean(
        searchBar &&
        searchBar.compareDocumentPosition(element) === Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      lineHeight: wrapperStyle.lineHeight,
      marginLeft: wrapperStyle.marginLeft,
      text: text.textContent?.trim(),
      textLineHeight: textStyle.lineHeight,
      textPadding: textStyle.padding,
      title: element.getAttribute("title"),
      // the app prepends style tokens to the retained legacy wrapper classes
      // (two-column-mode-checkbox.tsx:102; legacy twoColumnModeCheckboxArea.scala.html:9)
      wrapperClass: element
        .getAttribute("class")
        ?.split(/\s+/u)
        .filter((token) => token && !/^x[0-9a-z]+$/u.test(token))
        .join(" "),
      wrapperPosition: wrapperStyle.position,
    };
  });
}

async function organizationBoardTwoColumnPopoverMetrics(page: Page) {
  return page.locator("#option_form #two-column-mode-checkbox").evaluate((wrapper) => {
    const popover = wrapper.querySelector(".popover") as HTMLElement;
    const arrow = wrapper.querySelector(".popover .arrow") as HTMLElement;
    const title = wrapper.querySelector(".popover-title") as HTMLElement;
    const content = wrapper.querySelector(".popover-content") as HTMLElement;
    const toggle = wrapper.querySelector("#two-column-mode") as HTMLInputElement;
    const missing = Object.entries({ arrow, content, popover, title, toggle })
      .filter(([, node]) => !node)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected organization board two-column popover targets: ${missing.join(", ")}`,
      );
    }

    const popoverBox = popover.getBoundingClientRect();
    const toggleBox = toggle.getBoundingClientRect();
    return {
      contentText: content.textContent?.trim(),
      hasArrow: Boolean(arrow),
      placementClass: popover.classList.contains("top"),
      popoverBottomIsAboveToggleBottom: popoverBox.bottom <= toggleBox.bottom,
      role: popover.getAttribute("role"),
      titleText: title.textContent?.trim(),
    };
  });
}

async function mockOrganizationBoards(
  page: Page,
  state: "default" | "empty" | "missingAuthor" | "paginated" = "default",
  options: { isAnonymous?: boolean; viewerCanUpdate?: boolean } = {},
) {
  page.clock.setFixedTime(new Date(2026, 6, 3, 12));
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
  await page.route("**/api/v1/organizations/weblabs/boards**", async (route) => {
    const isEmpty = state === "empty";
    const isMissingAuthor = state === "missingAuthor";
    const isPaginated = state === "paginated";
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("pageNum")) || 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: isEmpty
          ? []
          : [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorLabel: isMissingAuthor ? "" : "Dev Member",
                authorLoginId: "dev",
                commentCount: 2,
                createdAt: new Date(2026, 6, 1, 12).toISOString(),
                labels: [],
                notice: false,
                ownerName: "weblabs",
                postNumber: "7",
                projectName: "sample",
                readme: false,
                title: "Release note",
                updatedLabel: "Jul 1, 2026",
              },
            ],
        notices: isEmpty
          ? []
          : [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorLabel: "Site Admin",
                authorLoginId: "admin",
                commentCount: 1,
                createdAt: new Date(2026, 6, 1, 12).toISOString(),
                labels: [],
                notice: true,
                ownerName: "weblabs",
                postNumber: "9",
                projectName: "sample",
                readme: false,
                title: "Pinned release notice",
                updatedLabel: "Jul 1, 2026",
              },
            ],
        organizationName: "weblabs",
        pageNum,
        pageSize: 20,
        totalCount: isEmpty ? 0 : isPaginated ? 45 : 2,
        totalPages: isEmpty ? 0 : isPaginated ? 3 : 1,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/issues**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 0,
        filter: "",
        items: [],
        openIssueCount: 0,
        orderBy: "createdDate",
        orderDir: "desc",
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        state: "open",
        totalCount: 0,
        totalPages: 1,
        viewerUserId: 1,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
}
