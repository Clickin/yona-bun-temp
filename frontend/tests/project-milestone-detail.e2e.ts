import { expect, test, type Page } from "@playwright/test";

test("project milestone detail matches legacy milestone/view.scala.html core DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const stateRequests: unknown[] = [];
  const deleteRequests: string[] = [];
  await mockProjectMilestoneDetail(page, stateRequests, deleteRequests);

  await page.goto(`${basePath}/admin/sample/milestone/5?state=open`);
  await expectMilestoneDetailAssets(page, basePath);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveText("v1.0");
  await expect(page.locator(".badge-issue-open")).toHaveText("Open");
  await expect(page.locator(".progress .bar")).toHaveAttribute("style", "width: 50%;");
  await expect(page.locator(".milestone-desc .markdown-wrap")).toContainText("Release scope");
  await expect(page.locator(".milestone-desc .attachments")).toHaveAttribute(
    "data-attachments",
    JSON.stringify([
      {
        id: 501,
        name: "scope.txt",
        url: "/files/501",
      },
    ]),
  );
  await expect(page.locator('.actrow [data-request-uri$="/milestone/5/close"]')).toHaveText(
    "Close milestone",
  );
  await expect(page.locator("#issues .nav-tabs li.active a")).toContainText("Open1");
  await expect(page.locator("#mass-update-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/issues`,
  );
  await expect(page.locator('.search-bar input[data-toggle="item-search"]')).toHaveAttribute(
    "data-items",
    "issue-item",
  );
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#issue-item-41")).toContainText("#11Open milestone issue");
  await expect(page.locator('.issue-label[data-category-id="3"][data-label-id="8"]')).toHaveText(
    "bug",
  );
  expect(await milestoneDetailMetrics(page)).toEqual({
    descBackgroundColor: "rgb(247, 247, 247)",
    descBorderBottomWidth: "1px",
    descBorderTopWidth: "1px",
    descMarginBottom: "15px",
    descMarginTop: "15px",
    descPaddingLeft: "15px",
    descPaddingTop: "10px",
    filterMinHeight: "30px",
    progressBackgroundColor: "rgb(182, 218, 84)",
    progressBarBackgroundColor: "rgb(94, 185, 94)",
  });
  expect(await issueLabelColorMetrics(page, ".post-list-wrap .issue-label")).toEqual({
    backgroundColor: "rgb(81, 170, 204)",
  });
  await page.fill('.search-bar input[name="filter"]', "no-match");
  await expect(page.locator("#issue-item-41")).toBeHidden();

  const closeResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/milestones/5/state") &&
      response.request().method() === "PATCH",
  );
  await page.click('.actrow [data-request-uri$="/milestone/5/close"]');
  await closeResponse;
  expect(stateRequests).toEqual([{ state: "closed" }]);

  await expect(page.locator("#deleteConfirm")).toHaveClass(/modal hide fade/u);
  await expect(page.locator("#deleteConfirm .modal-header h3")).toHaveText("Delete milestone");
  await expect(page.locator("#deleteConfirm [data-request-method='delete']")).toHaveAttribute(
    "data-request-uri",
    `${basePath}/admin/sample/milestone/5`,
  );
  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/milestones/5") &&
      response.request().method() === "DELETE",
  );
  await page.locator("#deleteConfirm [data-request-method='delete']").evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await deleteResponse;
  expect(deleteRequests).toEqual(["DELETE"]);
});

async function expectMilestoneDetailAssets(page: Page, basePath: string) {
  const markdownLink = page.locator(
    `link[href="${basePath}/assets/javascripts/lib/highlight/styles/default.css"]`,
  );
  await expect(markdownLink).toHaveAttribute("rel", "stylesheet");
  await expect(markdownLink).toHaveAttribute("type", "text/css");

  const labelLink = page.locator(`link[href="${basePath}/admin/sample/issue/labels.css"]`);
  await expect(labelLink).toHaveAttribute("rel", "stylesheet");
  await expect(labelLink).toHaveAttribute("type", "text/css");

  for (const src of [
    `${basePath}/assets/javascripts/lib/highlight/highlight.pack.js`,
    `${basePath}/assets/javascripts/lib/marked.js`,
  ]) {
    const script = page.locator(`script[src="${src}"]`);
    await expect(script).toHaveAttribute("type", "text/javascript");
    await expect(script).toHaveAttribute("defer", "");
  }

  const inlineScript = await page.evaluate(() => {
    return [...document.scripts]
      .filter((script) => script.type === "text/javascript")
      .map((script) => script.textContent ?? "")
      .find((text) => text.includes('$yobi.loadModule("milestone.View"'));
  });
  expect(inlineScript).toContain('"sMilestoneId" : "5"');
  expect(inlineScript).toContain(`"sURLLabels"   : "${basePath}/admin/sample/issues"`);
  expect(inlineScript).toContain('$(".title-prefix").on');
  expect(inlineScript).toContain('$(".user-link:contains(\'admin\')").addClass("me")');
}

async function mockProjectMilestoneDetail(
  page: Page,
  stateRequests: unknown[],
  deleteRequests: string[],
) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/5", async (route) => {
    if (route.request().method() === "DELETE") {
      deleteRequests.push("DELETE");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ redirectPath: "/admin/sample/milestones" }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestone: milestoneFixture() }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/5/state", async (route) => {
    stateRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestone: {
          ...milestoneFixture(),
          state: "closed",
        },
      }),
    });
  });
}

function milestoneFixture() {
  return {
    attachments: [
      {
        id: 501,
        name: "scope.txt",
        url: "/files/501",
      },
    ],
    closedIssueCount: 1,
    closedIssues: [
      {
        assigneeLabel: "",
        id: 42,
        issueNumber: 12,
        labels: [],
        state: "closed",
        title: "Closed milestone issue",
      },
    ],
    completionPercent: 50,
    contentsHtml: "<p>Server HTML should not render</p>",
    contentsMarkdown: "Release scope",
    dueDateLabel: "2026-06-30",
    dueDateOverdue: true,
    id: 5,
    openIssueCount: 1,
    openIssues: [
      {
        assigneeLabel: "Dev Member",
        authorLoginId: "dev",
        id: 41,
        issueNumber: 11,
        labels: [
          {
            categoryId: "3",
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
        state: "open",
        title: "Open milestone issue",
      },
    ],
    state: "open",
    title: "v1.0",
    untilLabel: "Overdue",
    viewerCanDelete: true,
    viewerCanUpdate: true,
  };
}

async function issueLabelColorMetrics(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
      };
    });
}

async function milestoneDetailMetrics(page: Page) {
  return page.evaluate(() => {
    const desc = document.querySelector<HTMLElement>(".milestone-desc");
    const filter = document.querySelector<HTMLElement>(".milesion-wrap #issues .filter-wrap");
    const progress = document.querySelector<HTMLElement>(".milesion-wrap .progress");
    const progressBar = document.querySelector<HTMLElement>(".milesion-wrap .progress .bar");
    if (!desc || !filter || !progress || !progressBar) {
      throw new Error("Expected milestone detail metric targets are missing.");
    }
    const descStyle = getComputedStyle(desc);
    return {
      descBackgroundColor: descStyle.backgroundColor,
      descBorderBottomWidth: descStyle.borderBottomWidth,
      descBorderTopWidth: descStyle.borderTopWidth,
      descMarginBottom: descStyle.marginBottom,
      descMarginTop: descStyle.marginTop,
      descPaddingLeft: descStyle.paddingLeft,
      descPaddingTop: descStyle.paddingTop,
      filterMinHeight: getComputedStyle(filter).minHeight,
      progressBackgroundColor: getComputedStyle(progress).backgroundColor,
      progressBarBackgroundColor: getComputedStyle(progressBar).backgroundColor,
    };
  });
}
