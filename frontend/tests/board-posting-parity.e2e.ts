import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

const boardLabel = {
  categoryId: "1",
  categoryIsExclusive: false,
  categoryName: "Kind",
  color: "#2c7be5",
  id: "5",
  name: "guide",
};

function boardListItem(overrides: Record<string, unknown> = {}) {
  return {
    authorAvatarUrl: "/avatars/nori.png",
    authorLabel: "Nori",
    authorLoginId: "nori",
    commentCount: 1,
    createdLabel: "2026-05-01",
    labels: [boardLabel],
    notice: false,
    ownerName: "admin",
    postNumber: "1",
    projectName: "projectYobi",
    readme: false,
    title: "Board parity announcement",
    updatedLabel: "2026-05-02",
    ...overrides,
  };
}

function boardDetail(overrides: Record<string, unknown> = {}) {
  return {
    ...boardListItem(overrides),
    attachments: [
      {
        id: "501",
        mimeType: "text/plain",
        name: "board-spec.txt",
        size: 42,
      },
    ],
    authorId: "11",
    bodyHtml: "",
    bodyMarkdown: "Board body from markdown",
    comments: [
      {
        attachments: [
          {
            id: "502",
            mimeType: "image/png",
            name: "comment-proof.png",
            size: 77,
          },
        ],
        authorId: "12",
        authorLabel: "Mona",
        authorLoginId: "mona",
        contentsHtml: "",
        contentsMarkdown: "First board comment",
        createdLabel: "2026-05-03",
        id: "77",
        parentCommentId: "",
      },
    ],
    id: "100",
    historyHtml: "",
    historyMarkdown: "Changed **title** from old board post",
    isWatching: false,
    permissions: {
      canComment: true,
      canCreate: true,
      canDelete: true,
      canRead: true,
      canSetNotice: true,
      canWatch: true,
      canUpdate: true,
    },
    watcherCount: 2,
    ...overrides,
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: null,
        user: null,
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "11",
        defaultLandingPath: "/me",
        emailAddress: "nori@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "nori",
        userLabel: "Nori",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/organizations/weblabs/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        adminMembers: [],
        description: "Web Labs",
        enrollmentRequested: false,
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanEnroll: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 2,
        cloneUrl: "https://example.com/admin/projectYobi.git",
        codeMemberOnly: false,
        defaultTab: "readme",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 0,
        members: [],
        openIssueCount: 1,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Project board parity route",
        ownerName: "admin",
        projectName: "projectYobi",
        projectScope: "public",
        reviewCount: 0,
        showAdmin: false,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        viewerCanEnroll: false,
        viewerCanUpdate: false,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/posts\/form-options(?:\?.*)?$/,
    async (route) => {
      const url = new URL(route.request().url());
      const readme = url.searchParams.has("readme");

      await route.fulfill({
        body: JSON.stringify({
          canAttachFiles: true,
          canMarkNotice: true,
          canMarkReadme: true,
          defaultPermissions: {
            canAttachFiles: true,
            canCreate: true,
            canMarkNotice: true,
            canMarkReadme: true,
          },
          labels: [boardLabel],
          onlineCommit: readme
            ? {
                branch: "",
                edit: false,
                issueTemplate: false,
                path: "",
                preparedBodyMarkdown: "# Existing README\n",
                title: "Update README.md",
              }
            : undefined,
          readme,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  let boardPost = boardDetail();
  let createdPost = boardDetail({
    bodyHtml: "",
    bodyMarkdown: "Created body",
    commentCount: 0,
    comments: [],
    id: "103",
    postNumber: "3",
    title: "Created Playwright post",
  });
  const noticePost = boardListItem({
    commentCount: 0,
    labels: [],
    notice: true,
    postNumber: "2",
    title: "Pinned maintenance note",
  });
  const readmePost = boardDetail({
    bodyHtml: "",
    bodyMarkdown: "README from board DB",
    commentCount: 0,
    comments: [],
    id: "104",
    postNumber: "10",
    readme: true,
    title: "README",
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/posts(?:\?.*)?$/, async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as {
        bodyMarkdown?: string;
        labelIds?: string[];
        notice?: boolean;
        readme?: boolean;
        title?: string;
      };
      createdPost = boardDetail({
        bodyHtml: "",
        bodyMarkdown: body.bodyMarkdown || "",
        commentCount: 0,
        comments: [],
        labels: body.labelIds?.length ? [boardLabel] : [],
        notice: body.notice ?? false,
        postNumber: "3",
        readme: body.readme ?? false,
        title: body.title || "Created Playwright post",
      });
      await route.fulfill({
        body: JSON.stringify(createdPost),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        notices: [noticePost],
        ownerName: "admin",
        items: [boardPost, boardListItem({ postNumber: "10", readme: true, title: "README" })],
        pageNum: 1,
        pageSize: 15,
        projectName: "projectYobi",
        readme: readmePost,
        totalCount: 31,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/posts\/1\/comments$/,
    async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        const body = request.postDataJSON() as { contentsMarkdown?: string };
        boardPost = boardDetail({
          ...boardPost,
          commentCount: 2,
          comments: [
            ...boardPost.comments,
            {
              attachments: [],
              authorId: "13",
              authorLabel: "Door",
              authorLoginId: "door",
              contentsHtml: "",
              contentsMarkdown: body.contentsMarkdown || "",
              createdLabel: "2026-05-04",
              id: "88",
              parentCommentId: "",
            },
          ],
        });
      }
      await route.fulfill({
        body: JSON.stringify(boardPost),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/posts\/1\/comments\/77$/,
    async (route) => {
      const request = route.request();
      if (request.method() === "PATCH") {
        const body = request.postDataJSON() as { contentsMarkdown?: string };
        boardPost = boardDetail({
          ...boardPost,
          comments: boardPost.comments.map((comment) =>
            comment.id === "77"
              ? {
                  ...comment,
                  contentsHtml: "",
                  contentsMarkdown: body.contentsMarkdown || "",
                }
              : comment,
          ),
        });
      }
      if (request.method() === "DELETE") {
        boardPost = boardDetail({
          ...boardPost,
          commentCount: 0,
          comments: [],
        });
      }
      await route.fulfill({
        body: JSON.stringify(boardPost),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/posts\/1\/watch$/, async (route) => {
    const isWatch = route.request().method() === "POST";
    boardPost = boardDetail({
      ...boardPost,
      isWatching: isWatch,
      watcherCount: isWatch ? 3 : 2,
    });
    await route.fulfill({
      body: JSON.stringify(boardPost),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/posts\/1\/labels$/, async (route) => {
    const body = route.request().postDataJSON() as { labelIds?: string[] };
    boardPost = boardDetail({
      ...boardPost,
      labels: body.labelIds?.length ? [boardLabel] : [],
    });
    await route.fulfill({
      body: JSON.stringify(boardPost),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/posts\/(?!form-options(?:\?|$))[^/?]+(?:\?.*)?$/,
    async (route) => {
      const request = route.request();
      const postNumber = new URL(request.url()).pathname.split("/").at(-1);
      const currentPost = postNumber === "3" ? createdPost : boardPost;

      if (request.method() === "PATCH") {
        const body = request.postDataJSON() as {
          bodyMarkdown?: string;
          labelIds?: string[];
          notice?: boolean;
          readme?: boolean;
          title?: string;
        };
        boardPost = boardDetail({
          ...boardPost,
          bodyHtml: "",
          bodyMarkdown: body.bodyMarkdown || "",
          labels: body.labelIds?.length ? [boardLabel] : [],
          notice: body.notice ?? false,
          readme: body.readme ?? false,
          title: body.title || "Updated board post",
        });
        await route.fulfill({
          body: JSON.stringify(boardPost),
          headers: restJsonHeaders,
          status: 200,
        });
        return;
      }

      if (request.method() === "DELETE") {
        await route.fulfill({
          body: "",
          headers: restJsonHeaders,
          status: 204,
        });
        return;
      }

      await route.fulfill({
        body: JSON.stringify(currentPost),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(/\/api\/v1\/organizations\/weblabs\/boards(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        organizationName: "weblabs",
        items: [
          boardListItem({
            authorLabel: "Nori",
            ownerName: "weblabs",
            postNumber: "9",
            projectName: "projectAlpha",
            title: "Organization board update",
          }),
        ],
        pageNum: 1,
        pageSize: 15,
        totalCount: 16,
        visibleProjects: [{ ownerName: "weblabs", projectName: "projectAlpha" }],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("project board list honors filter label sort notice and route parity", async ({ page }) => {
  await page.goto(
    "/yona/admin/projectYobi/posts?filter=guide&labelIds[]=5&orderBy=createdDate&orderDir=asc&pageNum=1",
  );

  await expect(page.locator(".post-list-wrap").last()).toBeVisible();
  await expect(page.locator(".notice-wrap")).toContainText("Pinned maintenance note");
  await expect(page.getByRole("link", { name: "Board parity announcement" })).toBeVisible();
  await expect(
    page.locator('.post-list-wrap .avatar-wrap.mlarge img[alt="Nori"]').first(),
  ).toHaveAttribute("src", "/avatars/nori.png");
  await expect(page.locator(".post-list-wrap .avatar-wrap.mlarge").first()).toHaveAttribute(
    "href",
    "/yona/nori",
  );
  await expect(
    page.locator(".post-list-wrap .board-label", { hasText: "guide" }).first(),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Search current project")).toHaveValue("guide");
  await expect(page.getByLabel("Select label")).toHaveValues(["5"]);
  await expect(page.getByRole("link", { exact: true, name: "Created" })).toBeVisible();
  await expect(page.getByRole("link", { exact: true, name: "Comments" })).toBeVisible();
  await expect(page.locator(".label.label-important", { hasText: "README" })).toBeVisible();
  await expect(page.locator(".board-badge.readme")).toHaveCount(0);
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("Next page");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    /pageNum=2/,
  );
  await expect(page.getByText("PlaceholderPage")).toHaveCount(0);

  const sortHref = await page
    .getByRole("link", { exact: true, name: "Created" })
    .getAttribute("href");
  expect(sortHref).toContain("labelIds%5B%5D=5");
  expect(sortHref).toContain("orderBy=createdDate");
  expect(sortHref).toContain("orderDir=desc");

  await page.setViewportSize({ height: 844, width: 390 });
  await expect(page.locator(".post-list-wrap").last()).toBeVisible();
});

test("project board list keeps legacy layout size and alignment metrics", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto(
    "/yona/admin/projectYobi/posts?filter=guide&labelIds[]=5&orderBy=createdDate&orderDir=asc&pageNum=1",
  );

  await expect(page.locator(".post-list.project-page-wrap")).toBeVisible();
  await expect(page.locator(".post-list-wrap.notice-wrap .post-item.title")).toHaveCount(1);
  await expect(page.locator(".post-list-wrap").last().locator(".post-item.title")).toHaveCount(2);

  const navbar = await layoutBox(page, ".gnb-outer.project-header");
  const header = await layoutBox(page, ".project-header-outer");
  const projectMenu = await layoutBox(page, ".project-menu-outer");
  const pageWrap = await layoutBox(page, ".page-wrap-outer");
  const projectPage = await layoutBox(page, ".post-list.project-page-wrap");
  const toolbar = await layoutBox(page, ".search-wrap.underline.board-toolbar");
  const optionForm = await layoutBox(page, "#option_form");
  const searchBar = await layoutBox(page, "#option_form .search-bar");
  const labelSelect = await layoutBox(page, "#option_form .board-labels select");
  const writeButton = await layoutBox(page, ".board-toolbar .pull-right .ybtn-success");
  const filterWrap = await layoutBox(page, ".filter-wrap.board");
  const noticeList = await layoutBox(page, ".post-list-wrap.notice-wrap");
  const noticeItem = await layoutBox(page, ".post-list-wrap.notice-wrap .post-item.title");
  const postList = await layoutBox(page, ".post-list-wrap:not(.notice-wrap)");
  const firstItem = await layoutBox(page, ".post-list-wrap:not(.notice-wrap) .post-item.title");
  const avatar = await layoutBox(
    page,
    ".post-list-wrap:not(.notice-wrap) .post-item.title .avatar-wrap.mlarge",
  );
  const titleLink = await layoutBox(
    page,
    ".post-list-wrap:not(.notice-wrap) .post-item.title .post-title",
  );
  const infos = await layoutBox(page, ".post-list-wrap:not(.notice-wrap) .post-item.title .infos");
  const pagination = await layoutBox(page, "#pagination.page-navigation-wrap");

  expect(Math.round(header.height)).toBe(120);
  expect(navbar.y).toBeGreaterThanOrEqual(header.y);
  expect(navbar.y + navbar.height).toBeLessThanOrEqual(header.y + header.height + 1);
  expect(projectMenu.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  expect(Math.round(projectMenu.height)).toBe(40);
  expect(pageWrap.y).toBeGreaterThanOrEqual(projectMenu.y + projectMenu.height - 1);
  expect(projectPage.width).toBeGreaterThanOrEqual(1100);
  expect(Math.abs(projectPage.x + projectPage.width / 2 - 640)).toBeLessThanOrEqual(2);

  expect(toolbar.y).toBeGreaterThanOrEqual(projectPage.y);
  expect(toolbar.y - projectPage.y).toBeLessThanOrEqual(20);
  expect(toolbar.width).toBeCloseTo(projectPage.width, 0);
  expect(optionForm.x).toBeCloseTo(toolbar.x, 0);
  expect(writeButton.x).toBeGreaterThan(optionForm.x + optionForm.width - 1);
  expect(searchBar.y).toBeGreaterThanOrEqual(optionForm.y);
  expect(labelSelect.x).toBeGreaterThanOrEqual(optionForm.x);
  expect(labelSelect.y).toBeGreaterThanOrEqual(optionForm.y);
  expect(labelSelect.y).toBeLessThanOrEqual(optionForm.y + optionForm.height);

  expect(filterWrap.y).toBeGreaterThan(toolbar.y + toolbar.height - 1);
  expect(noticeList.y).toBeGreaterThan(filterWrap.y + filterWrap.height - 1);
  expect(noticeItem.y).toBeGreaterThanOrEqual(noticeList.y);
  expect(postList.y).toBeGreaterThan(noticeList.y + noticeList.height - 1);
  expect(firstItem.y).toBeGreaterThanOrEqual(postList.y);
  expect(Math.abs(firstItem.width - postList.width)).toBeLessThanOrEqual(4);
  expect(avatar.x).toBeCloseTo(firstItem.x + 10, 0);
  expect(titleLink.x).toBeGreaterThan(avatar.x + avatar.width - 1);
  expect(infos.y).toBeGreaterThan(titleLink.y);
  expect(pagination.y).toBeGreaterThan(firstItem.y + firstItem.height - 1);
});

test("project board detail supports watch and comment create update delete", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/post/1");
  await expect(page.locator(".board-view")).toBeVisible();
  await expect(page.locator(".board-header .title")).toContainText("Board parity announcement");
  await expect(page.getByText("#1")).toBeVisible();
  await expect(page.locator("#post-body-1")).toContainText("Board body from markdown");
  await expect(page.locator("#attachments")).toHaveAttribute(
    "data-attachments",
    JSON.stringify([
      {
        fileHref: "/yona/files/501",
        fileId: "501",
        fileName: "board-spec.txt",
        fileSize: 42,
        mimeType: "text/plain",
      },
    ]),
  );
  await expect(page.locator("#attachments .attached-file")).toHaveAttribute("data-id", "501");
  await expect(page.locator("#attachments .attached-file .name")).toHaveText("board-spec.txt");
  await expect(page.locator("#comment-77 .attachments")).toHaveAttribute(
    "data-attachments",
    JSON.stringify([
      {
        fileHref: "/yona/files/502",
        fileId: "502",
        fileName: "comment-proof.png",
        fileSize: 77,
        mimeType: "image/png",
      },
    ]),
  );
  await expect(page.locator("#comment-77 .attached-file .name")).toHaveText("comment-proof.png");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-toggle", "select2");
  await expect(page.locator('#labelIds option[value="5"]')).toHaveText("guide");
  await expect(page.locator(".posting-history a")).toHaveAttribute(
    "href",
    "#-yona-posting-history",
  );
  await expect(page.locator("#-yona-posting-history")).toContainText(
    "Changed title from old board post",
  );
  await expect(page.locator("#-yona-posting-history strong")).toHaveText("title");
  await expect(page.locator("#-yona-posting-history .modal-header h5.nm")).toHaveText(
    "Change history",
  );
  await expect(page.locator("#-yona-posting-history .modal-body > p")).toContainText(
    "Changed title from old board post",
  );
  await expect(page.locator("#-yona-posting-history .modal-footer .ybtn-info")).toContainText(
    "Confirm",
  );
  await expect(page.locator(".board-comment-wrap")).toContainText("First board comment");

  const historyLink = await layoutBox(page, ".posting-history a");
  const hiddenHistoryModal = await page.locator("#-yona-posting-history").evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      display: style.display,
      id: element.id,
      modalClass: element.getAttribute("class"),
    };
  });
  await page.locator(".posting-history a").click();
  const historyModal = await layoutBox(page, "#-yona-posting-history.modal");
  const modalHeader = await layoutBox(page, "#-yona-posting-history .modal-header");
  const closeButton = await layoutBox(page, "#-yona-posting-history .modal-header .close");
  const modalTitle = await layoutBox(page, "#-yona-posting-history .modal-header h5.nm");
  const modalBody = await layoutBox(page, "#-yona-posting-history .modal-body");
  const modalParagraph = await layoutBox(page, "#-yona-posting-history .modal-body > p");
  const modalFooter = await layoutBox(page, "#-yona-posting-history .modal-footer");
  const confirmButton = await layoutBox(page, "#-yona-posting-history .modal-footer .ybtn-info");
  const openHistoryModalStyles = await page
    .locator("#-yona-posting-history")
    .evaluate((element) => {
      const modalStyle = window.getComputedStyle(element);
      const bodyStyle = window.getComputedStyle(
        element.querySelector(".modal-body") as HTMLElement,
      );
      const paragraphStyle = window.getComputedStyle(
        element.querySelector(".modal-body > p") as HTMLElement,
      );
      const footerStyle = window.getComputedStyle(
        element.querySelector(".modal-footer") as HTMLElement,
      );
      return {
        bodyDisplay: bodyStyle.display,
        display: modalStyle.display,
        footerDisplay: footerStyle.display,
        paragraphDisplay: paragraphStyle.display,
        position: modalStyle.position,
      };
    });

  expect(hiddenHistoryModal).toEqual({
    display: "none",
    id: "-yona-posting-history",
    modalClass: "modal hide",
  });
  expect(historyLink.y).toBeGreaterThanOrEqual(0);
  expect(Math.round(historyModal.width)).toBe(562);
  expect(Math.abs(historyModal.x + historyModal.width / 2 - 640)).toBeLessThanOrEqual(2);
  expect(modalHeader.y).toBeGreaterThanOrEqual(historyModal.y);
  expect(closeButton.x).toBeGreaterThan(modalHeader.x + modalHeader.width / 2);
  expect(closeButton.y).toBeGreaterThanOrEqual(modalHeader.y);
  expect(modalTitle.x).toBeGreaterThanOrEqual(modalHeader.x);
  expect(modalBody.y).toBeGreaterThan(modalHeader.y + modalHeader.height - 1);
  expect(modalParagraph.x).toBeGreaterThanOrEqual(modalBody.x);
  expect(modalParagraph.width).toBeLessThanOrEqual(modalBody.width + 1);
  expect(modalFooter.y).toBeGreaterThan(modalBody.y + modalBody.height - 1);
  expect(confirmButton.y).toBeGreaterThanOrEqual(modalFooter.y);
  expect(confirmButton.x).toBeGreaterThanOrEqual(modalFooter.x);
  expect(openHistoryModalStyles).toEqual({
    bodyDisplay: "block",
    display: "block",
    footerDisplay: "block",
    paragraphDisplay: "block",
    position: "fixed",
  });
  await page.locator("#-yona-posting-history .modal-footer .ybtn-info").click();
  await expect(page.locator("#-yona-posting-history")).toBeHidden();

  const labelRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/labels") && request.method() === "PATCH",
  );
  await page.locator("#labelIds").evaluate((select) => {
    for (const option of Array.from((select as HTMLSelectElement).options)) {
      option.selected = false;
    }
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const labelMutation = await labelRequest;
  expect(labelMutation.headers()["x-csrf-token"]).toBe("csrf-123");
  expect(labelMutation.postDataJSON()).toEqual({ labelIds: [] });
  await expect(page.locator('#labelIds option[value="5"]')).toHaveCount(0);

  const watchRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/watch") && request.method() === "POST",
  );
  await page.locator("#watch-button").click();
  expect((await watchRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "true");
  await expect(page.locator("#watch-button")).toContainText("Stop watching");
  await expect(page.getByText("Watchers 3")).toHaveCount(0);

  const updateCommentRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/comments/77") && request.method() === "PATCH",
  );
  await page
    .locator(".board-comment", { hasText: "First board comment" })
    .getByRole("button", { name: "Edit comment" })
    .click();
  await page.getByRole("textbox", { name: "Edit comment" }).fill("Edited board comment");
  await page.locator("#comment-77").getByRole("button", { exact: true, name: "Save" }).click();
  expect((await updateCommentRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page.locator("#comment-body-77")).toContainText("Edited board comment");

  const commentRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/comments") && request.method() === "POST",
  );
  await page.locator("#editor-contents-comment-body").fill("Fresh comment");
  await page.locator("#comment-form").getByRole("button", { name: "Add a comment" }).click();
  expect((await commentRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page.locator("#comment-88")).toContainText("Fresh comment");

  const deleteCommentRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/comments/77") && request.method() === "DELETE",
  );
  await page.locator("#comment-77").getByRole("button", { name: "Delete comment" }).click();
  expect((await deleteCommentRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page.locator("#comment-77")).toHaveCount(0);
});

test("project board detail keeps legacy pane and comment alignment metrics", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/admin/projectYobi/post/1");

  await expect(page.locator(".project-page-wrap.board-view")).toBeVisible();
  await expect(page.locator(".board-comment-wrap .comments .board-comment")).toHaveCount(1);

  const navbar = await layoutBox(page, ".gnb-outer.project-header");
  const header = await layoutBox(page, ".project-header-outer");
  const projectMenu = await layoutBox(page, ".project-menu-outer");
  const pageWrap = await layoutBox(page, ".page-wrap-outer");
  const boardView = await layoutBox(page, ".project-page-wrap.board-view");
  const boardHeader = await layoutBox(page, ".board-header.issue");
  const boardTitle = await layoutBox(page, ".board-header.issue .title");
  const boardBody = await layoutBox(page, ".board-body.row-fluid");
  const leftPane = await layoutBox(page, ".board-body .span-left-pane");
  const rightPane = await layoutBox(page, ".board-body .span-right-pane");
  const author = await layoutBox(page, ".board-body .author-info");
  const content = await layoutBox(page, "#post-body-1 .content.markdown-wrap");
  const attachments = await layoutBox(page, "#attachments");
  const actions = await layoutBox(page, ".board-actrow.board-actions");
  const labels = await layoutBox(page, ".span-right-pane .issue-info.board-labels");
  const commentWrap = await layoutBox(page, ".board-comment-wrap");
  const commentHeader = await layoutBox(page, ".board-comment-wrap .comment-header");
  const firstComment = await layoutBox(page, ".board-comment-wrap .comments .board-comment");
  const commentAvatar = await layoutBox(page, "#comment-77 .comment-avatar");
  const commentBody = await layoutBox(page, "#comment-77 .media-body");
  const commentForm = await layoutBox(page, "#comment-form.board-comment-form");

  expect(Math.round(header.height)).toBe(120);
  expect(navbar.y).toBeGreaterThanOrEqual(header.y);
  expect(navbar.y + navbar.height).toBeLessThanOrEqual(header.y + header.height + 1);
  expect(projectMenu.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  expect(Math.round(projectMenu.height)).toBe(40);
  expect(pageWrap.y).toBeGreaterThanOrEqual(projectMenu.y + projectMenu.height - 1);
  expect(boardView.width).toBeGreaterThanOrEqual(1100);

  expect(boardHeader.y).toBeCloseTo(boardView.y, 0);
  expect(boardTitle.width).toBeCloseTo(boardHeader.width, 0);
  expect(boardBody.y).toBeGreaterThan(boardHeader.y + boardHeader.height - 1);
  expect(leftPane.x).toBeCloseTo(boardBody.x, 0);
  expect(rightPane.x).toBeGreaterThan(leftPane.x + leftPane.width - 1);
  expect(leftPane.width).toBeGreaterThan(rightPane.width);
  expect(Math.abs(leftPane.y - rightPane.y)).toBeLessThanOrEqual(12);

  expect(author.y).toBeGreaterThanOrEqual(leftPane.y);
  expect(content.y).toBeGreaterThan(author.y + author.height - 1);
  expect(attachments.y).toBeGreaterThan(content.y);
  expect(actions.y).toBeGreaterThan(attachments.y);
  expect(labels.y).toBeCloseTo(rightPane.y, 0);

  expect(commentWrap.y).toBeGreaterThan(actions.y + actions.height - 1);
  expect(commentHeader.y).toBeGreaterThanOrEqual(commentWrap.y);
  expect(firstComment.y).toBeGreaterThan(commentHeader.y + commentHeader.height - 1);
  expect(commentAvatar.x).toBeCloseTo(firstComment.x, 0);
  expect(commentBody.x).toBeGreaterThan(commentAvatar.x + commentAvatar.width - 1);
  expect(commentForm.y).toBeGreaterThan(firstComment.y + firstComment.height - 1);
});

test("project board post editor inserts pasted and dropped image uploads", async ({ page }) => {
  const uploadedHeaders: string[] = [];
  const uploadedNames: string[] = [];

  await page.route("**/files", async (route) => {
    const uploadIndex = uploadedNames.length + 1;
    uploadedHeaders.push(route.request().headers()["x-csrf-token"] ?? "");
    uploadedNames.push(uploadIndex === 1 ? "post-paste.png" : "post-drop.png");
    await route.fulfill({
      body: JSON.stringify({
        id: 800 + uploadIndex,
        mimeType: "image/png",
        name: uploadIndex === 1 ? "post-paste.png" : "post-drop.png",
        size: 8,
        url: `/yona/files/${800 + uploadIndex}`,
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });

  await page.goto("/yona/admin/projectYobi/postform");
  const bodyEditor = page.locator("#editor-body-content-body");

  await bodyEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "post-paste.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(bodyEditor).toHaveValue("![post-paste.png](/yona/files/801) ");

  await bodyEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["dropped"], "post-drop.png", { type: "image/png" }));
    element.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      }),
    );
  });
  await expect(bodyEditor).toHaveValue(
    "![post-paste.png](/yona/files/801) ![post-drop.png](/yona/files/802) ",
  );

  const createRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts") && request.method() === "POST",
  );
  await page.locator("#title").fill("Created upload post");
  await page.locator(".board-actions").getByRole("button", { name: "Save" }).click();
  const submittedPost = (await createRequest).postDataJSON() as {
    attachmentIds?: number[];
    bodyMarkdown?: string;
  };

  expect(uploadedHeaders).toEqual(["csrf-123", "csrf-123"]);
  expect(submittedPost).toMatchObject({
    attachmentIds: [801, 802],
    bodyMarkdown: "![post-paste.png](/yona/files/801) ![post-drop.png](/yona/files/802) ",
  });
});

test("project board create and edit forms keep legacy editor alignment metrics", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/admin/projectYobi/postform");

  await expect(page.locator(".board-form .content-wrap.frm-wrap")).toBeVisible();

  const createPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const createForm = await layoutBox(page, "form.board-form");
  const createContent = await layoutBox(page, ".board-form .content-wrap.frm-wrap");
  const createTitle = await layoutBox(page, ".board-form #title");
  const createEditor = await layoutBox(page, "#editor-body-content-body");
  const createUploader = await layoutBox(page, '.upload-wrap[data-resource-type="BOARD_POST"]');
  const createOptions = await layoutBox(page, ".board-form .right-txt.mt10.mb10");
  const createActions = await layoutBox(page, ".board-form .actions.board-actions");

  expect(createPage.width).toBeGreaterThanOrEqual(1100);
  expect(createForm.x).toBeCloseTo(createPage.x, 0);
  expect(createForm.width).toBeCloseTo(createPage.width, 0);
  expect(createContent.x).toBeCloseTo(createForm.x, 0);
  expect(createContent.width).toBeCloseTo(createForm.width, 0);
  expect(createTitle.y).toBeGreaterThanOrEqual(createContent.y);
  expect(createTitle.width).toBeGreaterThanOrEqual(createContent.width * 0.95);
  expect(createTitle.width).toBeLessThanOrEqual(createContent.width * 0.99);
  expect(createEditor.y).toBeGreaterThan(createTitle.y + createTitle.height - 1);
  expect(createEditor.width).toBeGreaterThanOrEqual(createContent.width * 0.95);
  expect(createUploader.y).toBeGreaterThan(createEditor.y + createEditor.height - 1);
  expect(createOptions.y).toBeGreaterThan(createUploader.y + createUploader.height - 1);
  expect(createActions.y).toBeGreaterThan(createOptions.y + createOptions.height - 1);

  await page.goto("/yona/admin/projectYobi/post/1/editform");

  await expect(page.locator(".board-form .content-wrap.frm-wrap")).toBeVisible();

  const editContent = await layoutBox(page, ".board-form .content-wrap.frm-wrap");
  const editLabel = await layoutBox(page, '.board-form label[for="title"]');
  const editTitle = await layoutBox(page, ".board-form #title");
  const editEditor = await layoutBox(page, "#editor-body-content-body");
  const editUploader = await layoutBox(page, '.upload-wrap[data-resource-type="BOARD_POST"]');
  const editOptions = await layoutBox(page, ".board-form .right-txt.mt10.mb10");
  const editActions = await layoutBox(page, ".board-form .actions.board-actions");

  expect(editLabel.y).toBeGreaterThanOrEqual(editContent.y);
  expect(editTitle.y).toBeGreaterThan(editLabel.y + editLabel.height - 1);
  expect(editTitle.width).toBeGreaterThanOrEqual(editContent.width * 0.95);
  expect(editTitle.width).toBeLessThanOrEqual(editContent.width * 0.99);
  expect(editEditor.y).toBeGreaterThan(editTitle.y + editTitle.height - 1);
  expect(editEditor.width).toBeGreaterThanOrEqual(editContent.width * 0.95);
  expect(editUploader.y).toBeGreaterThan(editEditor.y + editEditor.height - 1);
  expect(editOptions.y).toBeGreaterThan(editUploader.y + editUploader.height - 1);
  expect(editActions.y).toBeGreaterThan(editOptions.y + editOptions.height - 1);
  expect(editActions.x).toBeCloseTo(editContent.x, 0);
});

test("project board comment editor inserts pasted image uploads", async ({ page }) => {
  await page.route("**/files", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        id: 811,
        mimeType: "image/png",
        name: "comment-paste.png",
        size: 8,
        url: "/yona/files/811",
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });

  await page.goto("/yona/admin/projectYobi/post/1");
  const commentEditor = page.locator("#editor-contents-comment-body");

  await commentEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "comment-paste.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(commentEditor).toHaveValue("![comment-paste.png](/yona/files/811) ");

  const commentRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/comments") && request.method() === "POST",
  );
  await page.locator("#comment-form").getByRole("button", { name: "Add a comment" }).click();
  const submittedComment = (await commentRequest).postDataJSON() as {
    attachmentIds?: number[];
    contentsMarkdown?: string;
  };

  expect(submittedComment).toEqual({
    attachmentIds: [811],
    contentsMarkdown: "![comment-paste.png](/yona/files/811)",
  });
});

test("project board create edit and delete flows send CSRF REST mutations", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/postform");
  await expect(page.getByRole("heading", { name: "New post" })).toBeVisible();
  await page.locator("#title").fill("Created Playwright post");
  await page.locator("#editor-body-content-body").fill("Created body");
  await page.locator("#notice").check();
  await page.locator("#readme").check();
  await expect(page.locator(".board-label-picker")).toHaveCount(0);
  await expect(page.locator('.upload-wrap[data-resource-type="BOARD_POST"]')).toBeVisible();

  const createRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts") && request.method() === "POST",
  );
  await page.locator(".board-actions").getByRole("button", { name: "Save" }).click();
  const createHeaders = (await createRequest).headers();
  expect(createHeaders["x-csrf-token"]).toBe("csrf-123");
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/post\/3$/);

  await page.goto("/yona/admin/projectYobi/post/1/editform");
  await expect(page.getByRole("heading", { name: "Edit post" })).toBeVisible();
  await expect(page.locator("#title")).toHaveValue("Board parity announcement");
  await page.locator("#title").fill("Updated board post");
  await page.locator("#editor-body-content-body").fill("Updated body");
  await page.locator("#readme").check();

  const updateRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1") && request.method() === "PATCH",
  );
  await page.locator(".board-actions").getByRole("button", { name: "Save" }).click();
  expect((await updateRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/post\/1$/);
  await expect(page.locator(".board-header .title")).toContainText("Updated board post");

  const deletePostRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1") && request.method() === "DELETE",
  );
  await page.locator(".board-view .board-actions").getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("#deleteConfirm")).toBeVisible();
  await page.locator("#deleteConfirm").getByRole("button", { name: "Yes" }).click();
  expect((await deletePostRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/posts$/);
});

test("README postform query preloads legacy title body and checked marker", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/postform?readme=true");

  await expect(page.locator("#title")).toHaveValue("Update README.md");
  await expect(page.locator("#editor-body-content-body")).toHaveValue("# Existing README\n");
  await expect(page.locator("#readme")).toBeChecked();
  await expect(page.locator("#path")).toHaveValue("");

  const createRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts") && request.method() === "POST",
  );
  await page.locator(".board-actions").getByRole("button", { name: "Save" }).click();
  const submitted = (await createRequest).postDataJSON() as {
    bodyMarkdown?: string;
    readme?: boolean;
    title?: string;
  };

  expect(submitted).toMatchObject({
    bodyMarkdown: "# Existing README\n",
    readme: true,
    title: "Update README.md",
  });
});

test("organization board route renders cross-project posts and project filters", async ({
  page,
}) => {
  await page.goto(
    "/yona/organizations/weblabs/boards?filter=post&projectNames[]=projectAlpha&orderBy=numOfComments&orderDir=desc",
  );

  await expect(page.getByRole("heading", { name: "Boards" })).toHaveCount(0);
  await expect(page.getByPlaceholder("Search by keyword")).toHaveValue("post");
  await expect(page.getByLabel("Projects")).toHaveValues(["projectAlpha"]);
  await expect(page.getByRole("link", { name: "Organization board update" })).toBeVisible();
  await expect(page.locator('.post-list-wrap .avatar-wrap.mlarge img[alt="Nori"]')).toHaveAttribute(
    "src",
    "/avatars/nori.png",
  );
  await expect(page.locator(".group-project-name")).toHaveText("projectAlpha");
  await expect(page.getByRole("link", { exact: true, name: "Comments" })).toBeVisible();
  const commentsSortHref = await page
    .getByRole("link", { exact: true, name: "Comments" })
    .getAttribute("href");
  expect(commentsSortHref).toContain("orderBy=numOfComments");
  expect(commentsSortHref).toContain("orderDir=asc");
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("Next page");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    /pageNum=2/,
  );
  await expect(page.locator(".post-row-meta .post-id")).toHaveText("#9");
  await expect(page.getByText("PlaceholderPage")).toHaveCount(0);
});
