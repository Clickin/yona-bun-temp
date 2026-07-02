import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECT_REVIEWS_PAGE_WRAP = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="row-fluid issue-list-wrap"><div class="span2 search-wrap span-hard-wrap"><div class="inner advanced"><ul class="lst-stacked unstyled"><li class="active"><a href="#" data-toggle="filter">All reviews<span class="num-badge pull-right">2</span></a></li><li class=""><a href="#" data-toggle="filter" data-type="participantId" data-value="1">Participated.<span class="num-badge pull-right">1</span></a></li><li class=""><a href="#" data-toggle="filter" data-type="authorId" data-value="1">Created<span class="num-badge pull-right">1</span></a></li></ul><form id="search" name="search" action="__BASE_PATH__/admin/sample/reviews" method="get"><input type="hidden" name="authorId" value=""><input type="hidden" name="participantId" value=""><input type="hidden" name="orderDir" value=""><input type="hidden" name="orderBy" value=""><input type="hidden" name="state" value="open"><hr class="hide-in-mobile"><div class="search-bar span-hard-wrap"><input name="filter" class="textbox full" type="text" value="comment"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></form></div></div><div class="span10 span-hard-wrap"><div class="pull-right filters"><a href="#" data-field="createdDate" data-value="asc" class="filter" data-toggle="order"><i class="ico btn-gray-arrow down"></i>Created</a></div><ul class="nav nav-tabs nm"><li class="active"><a href="#" data-type="state" data-value="open" data-toggle="filter">Open<span class="num-badge">2</span></a></li><li class=""><a href="#" data-type="state" data-value="closed" data-toggle="filter">Closed<span class="num-badge">1</span></a></li></ul><div class="review-list-wrap"><ul class="post-list-wrap"><li class="post-item"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="post-id">31</span><a href="__BASE_PATH__/admin/sample/pullRequest/3/changes#thread-31" class="title">Please check this change</a></div><div class="infos"><a href="__BASE_PATH__/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><span class="infos-item item-count-groups"><a href="__BASE_PATH__/admin/sample/pullRequest/3/changes#thread-31" class="comments-count"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">1</span></a></span></div></li><li class="post-item"><a href="__BASE_PATH__/ghost" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="top" title="ghost"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="post-id">32</span><a href="__BASE_PATH__/admin/sample/commit/fedcba987654#thread-32" class="title">Commit thread without PR</a></div><div class="infos"><span class="infos-item">No author</span><span class="infos-item" title="Jul 2, 2026">Jul 2, 2026</span></div></li></ul></div><div class="pull-left" style="padding:10px"><a href="__BASE_PATH__/admin/sample/reviews?state=open&filter=comment&format=xls" class="ybtn small"><i class="yobicon-file-excel"></i> Download as Excel file</a></div><div id="pagination"></div></div></div></div></div>
`;

test("project reviews list matches legacy reviewthread/list.scala.html shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
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
    titleOverflow: "hidden",
    titleTextOverflow: "ellipsis",
    titleWhiteSpace: "nowrap",
  });

  await page.locator('.lst-stacked a[data-type="participantId"]').click();
  await expect(page).toHaveURL(/participantId=1/u);

  await page.goto(`${basePath}/admin/sample/reviews?state=open&filter=comment`);
  await page.locator('.filters a[data-toggle="order"]').click();
  await expect(page).toHaveURL(/orderBy=createdDate/u);
  await expect(page).toHaveURL(/orderDir=asc/u);

  await page.goto(`${basePath}/admin/sample/reviews?state=open&filter=comment`);
  await page.locator('.nav-tabs a[data-value="closed"]').click();
  await expect(page).toHaveURL(/state=closed/u);

  await page.goto(`${basePath}/admin/sample/reviews?state=open`);
  await page.locator('#search input[name="filter"]').fill("needle");
  await page.locator("#search").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page).toHaveURL(/filter=needle/u);

  expect(requests.some((url) => url.searchParams.get("filter") === "comment")).toBe(true);
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

async function reviewListMetrics(page: Page) {
  return page.evaluate(() => {
    const leftColumn = requireElement(".issue-list-wrap .search-wrap");
    const searchForm = requireElement<HTMLFormElement>("#search");
    const searchInput = requireElement<HTMLInputElement>('#search input[name="filter"]');
    const firstRow = requireElement(".review-list-wrap .post-item");
    const titleWrap = requireElement(".review-list-wrap .post-item .title-wrap");
    const list = requireElement(".review-list-wrap");
    const exportLink = requireElement('.pull-left a[href$="format=xls"]');
    const firstRowStyle = getComputedStyle(firstRow);
    const titleStyle = getComputedStyle(titleWrap);

    return {
      exportTopAfterList: exportLink.getBoundingClientRect().top > list.getBoundingClientRect().top,
      leftColumnWidth: Math.round(leftColumn.getBoundingClientRect().width),
      rowCount: document.querySelectorAll(".review-list-wrap .post-item").length,
      rowPaddingBlock:
        Math.round(parseFloat(firstRowStyle.paddingTop)) +
        Math.round(parseFloat(firstRowStyle.paddingBottom)),
      searchAction: searchForm.getAttribute("action"),
      searchInputWidth: Math.round(searchInput.getBoundingClientRect().width),
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
