import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const EXPECTED_PROJECT_REVIEWS_PAGE_WRAP = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="row-fluid issue-list-wrap"><div class="span2 search-wrap span-hard-wrap"><div class="inner advanced"><ul class="lst-stacked unstyled"><li class="active"><button type="button" data-toggle="filter" style="background:none;border:0px;color:inherit;cursor:pointer;display:block;font:inherit;margin:0px;padding:0px;text-align:inherit;width:100%">All reviews<span class="num-badge pull-right">2</span></button></li><li class=""><button type="button" data-toggle="filter" data-type="participantId" data-value="1" style="background:none;border:0px;color:inherit;cursor:pointer;display:block;font:inherit;margin:0px;padding:0px;text-align:inherit;width:100%">Participated.<span class="num-badge pull-right">1</span></button></li><li class=""><button type="button" data-toggle="filter" data-type="authorId" data-value="1" style="background:none;border:0px;color:inherit;cursor:pointer;display:block;font:inherit;margin:0px;padding:0px;text-align:inherit;width:100%">Created<span class="num-badge pull-right">1</span></button></li></ul><form id="search" name="search" action="__BASE_PATH__/admin/sample/reviews" method="get"><input type="hidden" name="authorId" value=""><input type="hidden" name="participantId" value=""><input type="hidden" name="orderDir" value=""><input type="hidden" name="orderBy" value=""><input type="hidden" name="state" value="open"><hr class="hide-in-mobile"><div class="search-bar span-hard-wrap"><input name="filter" class="textbox full" type="text" value="comment"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></form></div></div><div class="span10 span-hard-wrap"><div class="pull-right filters"><button type="button" data-field="createdDate" data-value="asc" class="filter" data-toggle="order" style="background:none;border:0px;color:inherit;cursor:pointer;display:inline;font:inherit;margin:0px;padding:0px;text-align:inherit;width:auto"><i class="ico btn-gray-arrow down"></i>Created</button></div><ul class="nav nav-tabs nm"><li class="active"><button type="button" data-type="state" data-value="open" data-toggle="filter" style="background:rgb(255,255,255);border-style:solid;border-width:1px;border-color:rgb(221,221,221)rgb(221,221,221)transparent;border-radius:4px4px0px0px;color:rgb(85,85,85);cursor:default;display:block;font-family:inherit;font-size:inherit;font-weight:bold;line-height:20px;margin:0px2px0px0px;padding:8px30px;text-align:inherit;width:100%">Open<span class="num-badge">2</span></button></li><li class=""><button type="button" data-type="state" data-value="closed" data-toggle="filter" style="background:transparent;border-style:solid;border-width:1px;border-color:transparent;border-radius:4px4px0px0px;color:rgb(53,146,181);cursor:pointer;display:block;font-family:inherit;font-size:inherit;font-weight:bold;line-height:20px;margin:0px2px0px0px;padding:8px30px;text-align:inherit;width:100%">Closed<span class="num-badge">1</span></button></li></ul><div class="review-list-wrap"><ul class="post-list-wrap"><li class="post-item"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="post-id">31</span><a href="__BASE_PATH__/admin/sample/pullRequest/3/changes#thread-31" class="title">Please check this change</a></div><div class="infos"><a href="__BASE_PATH__/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><span class="infos-item item-count-groups"><a href="__BASE_PATH__/admin/sample/pullRequest/3/changes#thread-31" class="comments-count"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">1</span></a></span></div></li><li class="post-item"><a href="__BASE_PATH__/ghost" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="top" title="ghost"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="post-id">32</span><a href="__BASE_PATH__/admin/sample/commit/fedcba987654#thread-32" class="title">Commit thread without PR</a></div><div class="infos"><span class="infos-item">No author</span><span class="infos-item" title="Jul 2, 2026">Jul 2, 2026</span></div></li></ul></div><div class="pull-left" style="padding:10px"><a href="__BASE_PATH__/admin/sample/reviews?state=open&filter=comment&format=xls" class="ybtn small"><i class="yobicon-file-excel"></i> Download as Excel file</a></div><div id="pagination"></div></div></div></div></div>
`;

test("project reviews list matches legacy reviewthread/list.scala.html shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await auditNativeClickListeners(page);
  const requests = await mockProjectReviews(page);

  await page.goto(`${basePath}/admin/sample/reviews?state=open&filter=comment`);

  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Review");
  await expect(page.locator(".review-list-wrap .post-item")).toHaveCount(2);
  await expect(page.locator(".review-list-wrap .post-item").first().locator(".title")).toHaveText(
    "Please check this change",
  );
  await expect(page.locator(".review-list-wrap .post-item").nth(1).locator(".infos")).toContainText(
    "No author",
  );
  await expect(page.locator('.pull-left a[href$="format=xls"]')).toHaveText(
    "Download as Excel file",
  );

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_REVIEWS_PAGE_WRAP.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await reviewListMetrics(page)).toEqual({
    exportTopAfterList: true,
    leftColumnWidth: 188,
    rowCount: 2,
    rowPaddingBlock: 20,
    searchAction: `${basePath}/admin/sample/reviews`,
    searchInputWidth: 156,
    stateTabBorderBottomColor: "rgba(0, 0, 0, 0)",
    stateTabLineHeight: "20px",
    stateTabPadding: "8px 30px",
    titleOverflow: "hidden",
    titleTextOverflow: "ellipsis",
    titleWhiteSpace: "nowrap",
  });
  await expect(page.locator('.lst-stacked a[href="#"]')).toHaveCount(0);
  await expect(page.locator('.filters a[href="#"]')).toHaveCount(0);
  await expect(page.locator('.nav-tabs a[href="#"]')).toHaveCount(0);
  await expect(
    page.locator('.lst-stacked button[type="button"][data-toggle="filter"]'),
  ).toHaveCount(3);
  await expect(
    page.locator('.lst-stacked button[data-type="participantId"][data-value="1"]'),
  ).toHaveText("Participated.1");
  await expect(page.locator('.filters button.filter[data-toggle="order"]')).toHaveText("Created");
  await expect(page.locator('.filters button.filter[data-field="createdDate"]')).toHaveAttribute(
    "data-value",
    "asc",
  );
  await expect(page.locator('.nav-tabs button[data-type="state"][data-value="open"]')).toHaveText(
    "Open2",
  );
  await expect(page.locator('.nav-tabs button[data-type="state"][data-value="closed"]')).toHaveText(
    "Closed1",
  );
  expect(
    await nativeClickListenerCount(page, ".lst-stacked button, .filters button, .nav-tabs button"),
  ).toBe(0);
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".title"),
  ).toHaveAttribute("href", `${basePath}/admin/sample/pullRequest/3/changes#thread-31`);
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".comments-count"),
  ).toHaveAttribute("href", `${basePath}/admin/sample/pullRequest/3/changes#thread-31`);
  await expect(
    page.locator(".review-list-wrap .post-item").nth(1).locator(".title"),
  ).toHaveAttribute("href", `${basePath}/admin/sample/commit/fedcba987654#thread-32`);

  const titleSpaMarker = `review-title-${Date.now()}`;
  await page.evaluate((marker) => {
    (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker = marker;
  }, titleSpaMarker);
  await page.locator(".review-list-wrap .post-item").first().locator(".title").click();
  await expect(page).toHaveURL(
    new RegExp(`${escapeRegExp(basePath)}/admin/sample/pullRequest/3/changes#thread-31$`, "u"),
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker,
    ),
  ).toBe(titleSpaMarker);

  await page.goto(`${basePath}/admin/sample/reviews?state=open&filter=comment`);
  const commentsSpaMarker = `review-comments-${Date.now()}`;
  await page.evaluate((marker) => {
    (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker = marker;
  }, commentsSpaMarker);
  await page.locator(".review-list-wrap .post-item").first().locator(".comments-count").click();
  await expect(page).toHaveURL(
    new RegExp(`${escapeRegExp(basePath)}/admin/sample/pullRequest/3/changes#thread-31$`, "u"),
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker,
    ),
  ).toBe(commentsSpaMarker);

  await page.goto(`${basePath}/admin/sample/reviews?state=open&filter=comment`);
  const spaMarker = `reviews-${Date.now()}`;
  await page.evaluate((marker) => {
    (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker = marker;
  }, spaMarker);
  await page.locator('.lst-stacked button[data-type="participantId"]').click();
  await expect(page).toHaveURL(/participantId=1/u);
  await expect(page).not.toHaveURL(/pageNum=/u);
  expect(
    await page.evaluate(
      () => (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker,
    ),
  ).toBe(spaMarker);

  await page.goto(`${basePath}/admin/sample/reviews?state=open&filter=comment`);
  await page.locator('.filters button[data-toggle="order"]').click();
  await expect(page).toHaveURL(/orderBy=createdDate/u);
  await expect(page).toHaveURL(/orderDir=asc/u);
  await expect(page).not.toHaveURL(/pageNum=/u);

  await page.goto(`${basePath}/admin/sample/reviews?state=open&filter=comment`);
  await page.locator('.nav-tabs button[data-value="closed"]').click();
  await expect(page).toHaveURL(/state=closed/u);
  await expect(page).not.toHaveURL(/pageNum=/u);

  await page.goto(`${basePath}/admin/sample/reviews?state=open`);
  await page.locator('#search input[name="filter"]').fill("needle");
  await page.locator("#search").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page).toHaveURL(/filter=needle/u);

  expect(requests.some((url) => url.searchParams.get("filter") === "comment")).toBe(true);
});

test("project review row source uses TanStack Link for internal row navigation", () => {
  const source = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");
  const rowSource = source.slice(
    source.indexOf("function ProjectReviewRow("),
    source.indexOf("function ProjectReviewPagination("),
  );

  expect(rowSource).toContain("<Link");
  expect(rowSource).not.toContain("<a");
  expect(rowSource).not.toContain("threadHref");
  expect(rowSource).not.toContain("prefixBasePath(basePath");
});

async function mockProjectReviews(page: Page) {
  const requests: URL[] = [];
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
        viewerUserId: 1,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/reviews**", async (route) => {
    requests.push(new URL(route.request().url()));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        allCount: 2,
        authorCount: 1,
        closedCount: 1,
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorId: 2,
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            comments: [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorId: 2,
                authorLabel: "Dev Member",
                authorLoginId: "dev",
                contentsMarkdown: "Please check this change",
                createdLabel: "Jul 1, 2026",
                id: 1001,
                threadId: 31,
              },
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorId: 1,
                authorLabel: "Site Admin",
                authorLoginId: "admin",
                contentsMarkdown: "Follow-up",
                createdLabel: "Jul 1, 2026",
                id: 1002,
                threadId: 31,
              },
            ],
            commitId: "abcdef123456",
            createdLabel: "Jul 1, 2026",
            id: 31,
            path: "app/controllers/Foo.java",
            pullRequestNumber: 3,
            state: "open",
          },
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorId: 9,
            authorLabel: "",
            authorLoginId: "ghost",
            comments: [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorId: 9,
                authorLabel: "",
                authorLoginId: "ghost",
                contentsMarkdown: "Commit thread without PR",
                createdLabel: "Jul 2, 2026",
                id: 2001,
                threadId: 32,
              },
            ],
            commitId: "fedcba987654",
            createdLabel: "Jul 2, 2026",
            id: 32,
            path: "README.md",
            state: "open",
          },
        ],
        openCount: 2,
        pageNum: 1,
        pageSize: 15,
        participantCount: 1,
        state: "open",
        totalCount: 2,
      }),
    });
  });
  return requests;
}

async function auditNativeClickListeners(page: Page) {
  await page.addInitScript(() => {
    const clickListenerCounts = new WeakMap<EventTarget, number>();
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === "click") {
        clickListenerCounts.set(this, (clickListenerCounts.get(this) ?? 0) + 1);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    (
      window as Window & {
        __nativeClickListenerCount?: (selector: string) => number;
      }
    ).__nativeClickListenerCount = (selector: string) =>
      Array.from(document.querySelectorAll(selector)).reduce(
        (total, element) => total + (clickListenerCounts.get(element) ?? 0),
        0,
      );
  });
}

async function nativeClickListenerCount(page: Page, selector: string) {
  return page.evaluate((input) => {
    const counter = (
      window as Window & {
        __nativeClickListenerCount?: (selector: string) => number;
      }
    ).__nativeClickListenerCount;
    if (!counter) {
      throw new Error("Native click listener audit was not installed");
    }
    return counter(input);
  }, selector);
}

async function reviewListMetrics(page: Page) {
  return page.evaluate(() => {
    const leftColumn = requireElement(".issue-list-wrap .search-wrap");
    const searchForm = requireElement<HTMLFormElement>("#search");
    const searchInput = requireElement<HTMLInputElement>('#search input[name="filter"]');
    const stateTab = requireElement<HTMLButtonElement>('.nav-tabs button[data-value="open"]');
    const firstRow = requireElement(".review-list-wrap .post-item");
    const titleWrap = requireElement(".review-list-wrap .post-item .title-wrap");
    const list = requireElement(".review-list-wrap");
    const exportLink = requireElement('.pull-left a[href$="format=xls"]');
    const firstRowStyle = getComputedStyle(firstRow);
    const titleStyle = getComputedStyle(titleWrap);
    const stateTabStyle = getComputedStyle(stateTab);

    return {
      exportTopAfterList: exportLink.getBoundingClientRect().top > list.getBoundingClientRect().top,
      leftColumnWidth: Math.round(leftColumn.getBoundingClientRect().width),
      rowCount: document.querySelectorAll(".review-list-wrap .post-item").length,
      rowPaddingBlock:
        Math.round(parseFloat(firstRowStyle.paddingTop)) +
        Math.round(parseFloat(firstRowStyle.paddingBottom)),
      searchAction: searchForm.getAttribute("action"),
      searchInputWidth: Math.round(searchInput.getBoundingClientRect().width),
      stateTabBorderBottomColor: stateTabStyle.borderBottomColor,
      stateTabLineHeight: stateTabStyle.lineHeight,
      stateTabPadding: stateTabStyle.padding,
      titleOverflow: titleStyle.overflow,
      titleTextOverflow: titleStyle.textOverflow,
      titleWhiteSpace: titleStyle.whiteSpace,
    };

    function requireElement<T extends HTMLElement = HTMLElement>(selector: string) {
      const element = document.querySelector<T>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'");
      }
      return attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'");
      }
      return attr.value;
    }
  }, html);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
