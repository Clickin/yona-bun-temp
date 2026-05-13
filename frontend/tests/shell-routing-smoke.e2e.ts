import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

function restErrorEnvelope(code: string, message: string, status: number) {
  return {
    error: {
      code,
      message,
      status,
    },
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
        defaultLandingPath: "/me",
        isAnonymous: true,
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

  await page.route(apiV1Route("/projects"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            overview: "Yona project",
            ownerName: "yobi",
            projectName: "projectYobi",
            projectScope: "public",
          },
        ],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/organizations"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            description: "web labs",
            organizationName: "weblabs",
          },
        ],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/issues(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            assigneeLabel: "",
            authorLabel: "Nori",
            commentCount: 3,
            issueNumber: "1",
            labels: [],
            milestoneTitle: "",
            ownerName: "admin",
            projectName: "projectYobi",
            state: "open",
            title: "Pilot issue",
            updatedLabel: "2026-04-15",
            voterCount: 0,
            watcherCount: 0,
          },
        ],
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "projectYobi",
        totalCount: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/labels"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        labels: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/labels/categories"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          categories: [],
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/milestones(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          milestones: [
            {
              closedIssueCount: 1,
              closedIssues: [
                {
                  assigneeLabel: "Nori",
                  commentCount: 0,
                  issueNumber: "2",
                  labels: [],
                  state: "closed",
                  title: "Closed milestone issue",
                  updatedLabel: "2026-04-16",
                },
              ],
              completionPercent: 50,
              dueDateLabel: "2026-05-09",
              id: "7",
              openIssueCount: 1,
              openIssues: [
                {
                  assigneeLabel: "Nori",
                  commentCount: 1,
                  issueNumber: "1",
                  labels: [],
                  state: "open",
                  title: "Open milestone issue",
                  updatedLabel: "2026-04-15",
                },
              ],
              state: "open",
              title: "v1.0",
            },
          ],
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/milestones/7"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        milestone: {
          closedIssueCount: 1,
          closedIssues: [
            {
              assigneeLabel: "Nori",
              commentCount: 0,
              issueNumber: "2",
              labels: [],
              state: "closed",
              title: "Closed milestone issue",
              updatedLabel: "2026-04-16",
            },
          ],
          completionPercent: 50,
          contentsHtml: "<p>Ship parity</p>",
          contentsMarkdown: "Ship parity",
          dueDateLabel: "2026-05-09",
          id: "7",
          openIssueCount: 1,
          openIssues: [
            {
              assigneeLabel: "Nori",
              commentCount: 1,
              issueNumber: "1",
              labels: [],
              state: "open",
              title: "Open milestone issue",
              updatedLabel: "2026-04-15",
            },
          ],
          state: "open",
          title: "v1.0",
          viewerCanDelete: true,
          viewerCanUpdate: true,
        },
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 0,
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
        overview: "Project issue parity route",
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

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        assigneeLabel: "",
        assigneeLoginId: "",
        attachments: [],
        authorLabel: "Nori",
        bodyHtml: "<p>Issue body</p>",
        bodyMarkdown: "Issue body",
        commentCount: 0,
        comments: [],
        hasVoted: false,
        isFavorited: false,
        isWatching: false,
        issueNumber: "1",
        labels: [],
        milestoneTitle: "",
        ownerName: "admin",
        projectName: "projectYobi",
        sharers: [],
        state: "open",
        timeline: [],
        title: "Pilot issue",
        viewerCanComment: true,
        viewerCanDelete: false,
        viewerCanManageSharers: false,
        viewerCanUpdate: false,
        viewerHasInheritedShare: false,
        viewerIsDirectSharer: false,
        voterCount: 0,
        watcherCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/code(?:\?.*)?$/, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.searchParams.has("path")) {
      await route.fulfill({
        body: JSON.stringify({
          branches: [{ name: "main" }],
          breadcrumbs: [
            { name: "src", path: "src" },
            { name: "main.rs", path: "src/main.rs" },
          ],
          entries: [],
          file: {
            isBinary: false,
            mimeType: "text/plain",
            name: "main.rs",
            path: "src/main.rs",
            size: "13",
            text: "fn main() {}\n",
          },
          noHead: false,
          ownerName: "admin",
          path: "src/main.rs",
          projectName: "projectYobi",
          selectedBranch: "main",
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        branches: [{ name: "main" }],
        breadcrumbs: [],
        entries: [
          {
            commitDate: "2026-04-20",
            commitMessage: "Initial commit",
            commitShortId: "abc1234",
            kind: "folder",
            name: "src",
            path: "src",
          },
          {
            commitDate: "2026-04-20",
            commitMessage: "Initial commit",
            commitShortId: "abc1234",
            kind: "file",
            name: "README.md",
            path: "README.md",
            size: "12",
          },
        ],
        ownerName: "admin",
        projectName: "projectYobi",
        selectedBranch: "main",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/commits(?:\?.*)?$/, async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.searchParams.get("path") ?? "";
    await route.fulfill({
      body: JSON.stringify({
        branches: [{ name: "main" }],
        breadcrumbs: path
          ? [
              { name: "src", path: "src" },
              { name: "main.rs", path: "src/main.rs" },
            ]
          : [],
        commits: [
          {
            authorDate: "2026-04-21",
            authorEmail: "author@example.com",
            authorName: "Author",
            commentCount: 0,
            commitId: "abcdef1234567890abcdef1234567890abcdef12",
            commitShortId: "abcdef1",
            message: "Update main function",
            shortMessage: "Update main function",
          },
          {
            authorDate: "2026-04-20",
            authorEmail: "seed@example.com",
            authorName: "Seed",
            commentCount: 0,
            commitId: "1234567890abcdef1234567890abcdef12345678",
            commitShortId: "1234567",
            message: "Initial commit",
            shortMessage: "Initial commit",
          },
        ],
        hasNewer: false,
        hasOlder: path !== "",
        noHead: false,
        ownerName: "admin",
        page: 0,
        path,
        projectName: "projectYobi",
        selectedBranch: requestUrl.searchParams.get("branch") ?? "main",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/commit\/[^/?]+(?:\?.*)?$/,
    async (route) => {
      const requestUrl = new URL(route.request().url());
      await route.fulfill({
        body: JSON.stringify({
          branches: [{ name: "main" }],
          breadcrumbs: [
            { name: "src", path: "src" },
            { name: "main.rs", path: "src/main.rs" },
          ],
          commit: {
            authorDate: "2026-04-21",
            authorEmail: "author@example.com",
            authorName: "Author",
            commentCount: 0,
            commitId: "abcdef1234567890abcdef1234567890abcdef12",
            commitShortId: "abcdef1",
            message: "Update main function",
            shortMessage: "Update main function",
          },
          files: [
            {
              patch:
                'diff --git a/src/main.rs b/src/main.rs\n--- a/src/main.rs\n+++ b/src/main.rs\n@@ -1 +1,3 @@\n fn main() {\n+    println!("detail");\n }\n',
              path: "src/main.rs",
            },
          ],
          noHead: false,
          ownerName: "admin",
          parentCommit: {
            commitId: "1234567890abcdef1234567890abcdef12345678",
            commitShortId: "1234567",
          },
          path: requestUrl.searchParams.get("path") ?? "",
          projectName: "projectYobi",
          selectedBranch: requestUrl.searchParams.get("branch") ?? "main",
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(apiV1Route("/auth/sign-out"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: true,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("shell routing smoke covers home, auth, public directories, and deep placeholders", async ({
  page,
}) => {
  await page.goto("/yona/");
  await expect(page).toHaveTitle("Yona");
  await expect(page.getByRole("heading", { name: "Legacy Route Foundation" })).toBeVisible();

  await page.goto("/yona/users/loginform");
  await expect(page).toHaveTitle("Login");
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();

  await page.goto("/yona/projects?filter=yobi&pageNum=1");
  await expect(page).toHaveTitle("Project List");
  await expect(page.getByText("projectYobi")).toBeVisible();

  await page.goto("/yona/orgs?filter=lab&pageNum=1");
  await expect(page).toHaveTitle("Organization List");
  await expect(page.getByText("weblabs")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/issues?pageNum=2");
  await expect(page).toHaveTitle("Issues");
  await expect(page.getByRole("heading", { name: "Issue List" })).toBeVisible();
});

test("signup submit refreshes a sparse workspace overview without client map errors", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  let authenticated = false;

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        emailAddress: authenticated ? "door@example.com" : "",
        isAnonymous: !authenticated,
        isConfirmed: authenticated,
        isSiteAdmin: false,
        loginId: authenticated ? "door" : "",
        userLabel: authenticated ? "Door" : "",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/register"), async (route) => {
    authenticated = true;
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        userLabel: "Door",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        profile: {
          displayName: "Door",
          loginId: "door",
        },
        watchedProjects: [
          {
            ownerName: "owner",
            projectId: "1",
            projectName: "projectYobi",
          },
        ],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/users/signupform");
  await page.getByLabel("Login ID").fill("door");
  await page.getByLabel("Name").fill("Door");
  await page.getByLabel("Email").fill("door@example.com");
  await page.getByLabel("Password", { exact: true }).fill("doorpass1");
  await page.getByLabel("Retype password").fill("doorpass1");

  await Promise.all([
    page.waitForURL(/\/yona\/me$/),
    page.getByRole("button", { name: "Sign up" }).click(),
  ]);

  await expect(page.getByRole("heading", { name: "Door" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("programmatic internal navigation keeps browser URL in sync under the mounted base path", async ({
  page,
}) => {
  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        userLabel: "Door",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        favoriteProjects: [],
        recentProjects: [],
        session: {
          defaultLandingPath: "/me",
          emailAddress: "door@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          userLabel: "Door",
        },
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.goto("/yona/me");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/yona\/users\/loginform$/);
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();
});

test("canonical user settings path stays mounted under the base path", async ({ page }) => {
  await page.goto("/yona/user/editform/password");
  await expect(page).toHaveURL(
    /\/yona\/users\/loginform\?redirectUrl=%2Fuser%2Feditform%2Fpassword$/,
  );
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();
});

test("organization admin routes redirect anonymous viewers to login with a return path", async ({
  page,
}) => {
  await page.goto("/yona/organizations/weblabs/members");
  await expect(page).toHaveURL(
    /\/yona\/users\/loginform\?redirectUrl=%2Forganizations%2Fweblabs%2Fmembers$/,
  );
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();

  await page.goto("/yona/organizations/weblabs/deleteForm");
  await expect(page).toHaveURL(
    /\/yona\/users\/loginform\?redirectUrl=%2Forganizations%2Fweblabs%2FdeleteForm$/,
  );
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();
});

test("organization admin routes render forbidden and not-found shells for authenticated viewers", async ({
  page,
}) => {
  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        userLabel: "Door",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        favoriteProjects: [],
        recentProjects: [],
        session: {
          defaultLandingPath: "/me",
          emailAddress: "door@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          userLabel: "Door",
        },
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/organizations/*/admin"), async (route) => {
    if (route.request().url().includes("/organizations/missinglabs/admin")) {
      await route.fulfill({
        body: JSON.stringify(restErrorEnvelope("not_found", "organization not found", 404)),
        headers: restJsonHeaders,
        status: 404,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify(
        restErrorEnvelope("permission_denied", "organization update is not allowed", 403),
      ),
      headers: restJsonHeaders,
      status: 403,
    });
  });

  await page.goto("/yona/organizations/weblabs/members");
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
  await expect(page.getByText("/organizations/weblabs/members")).toBeVisible();

  await page.goto("/yona/organizations/missinglabs/deleteForm");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(page.getByText("/organizations/missinglabs/deleteForm")).toBeVisible();
});

test("project issue routes render data-backed issue list and detail screens", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/issues?pageNum=1");
  await expect(page.getByText("Pilot issue")).toBeVisible();
  await expect(page.getByText("2026-04-15")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.getByRole("heading", { name: "Pilot issue" })).toBeVisible();
  await expect(page.getByText("#1")).toBeVisible();
  await expect(page.getByText("open")).toBeVisible();
});

test("project code routes render branch folder and text file views", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/code");
  await expect(page.getByRole("heading", { name: "Code" })).toBeVisible();
  await expect(page.getByLabel("Branch")).toHaveValue("main");
  await expect(page.getByRole("link", { name: "Download" })).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/code/main/download",
  );
  await expect(page.getByRole("link", { name: "Folder: src" })).toBeVisible();
  await expect(page.getByRole("link", { name: "File: README.md" })).toBeVisible();
  await expect(page.getByText("Initial commit").first()).toBeVisible();

  await page.goto("/yona/admin/projectYobi/code/main/src/main.rs");
  await expect(page.locator(".file-header strong", { hasText: "main.rs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Raw" })).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/rawcode/main/src/main.rs",
  );
  await expect(page.locator("#open-in-browser")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/files/main/src/main.rs",
  );
  await expect(page.locator("#showCode")).toHaveAttribute("data-language", "rust");
  await expect(page.locator(".code-line-wrap").first()).toHaveAttribute("data-line-number", "1");
  await expect(page.locator(".line-number").first()).toHaveText("1");
  await expect(page.locator(".syntax-keyword").first()).toHaveText("fn");
  await expect(page.getByText("fn main() {}")).toBeVisible();
});

test("project commit history routes render branch and path-scoped lists", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/commits");
  await expect(page.getByRole("heading", { name: "Commit History" })).toBeVisible();
  await expect(page.getByLabel("Branch")).toHaveValue("main");
  await expect(page.getByRole("link", { name: "Files" })).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/code/main",
  );
  await expect(page.getByRole("link", { name: "Commits" })).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/commits/main",
  );
  await expect(page.getByRole("link", { name: "Branches" })).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/branches",
  );
  await expect(page.getByText("Initial commit").first()).toBeVisible();

  await page.goto("/yona/admin/projectYobi/commits/main/src/main.rs");
  await expect(page.locator("#history")).toBeVisible();
  await expect(page.locator(".code-table.commits.mt10")).toBeVisible();
  await expect(page.locator(".btn-copy-commitId").first()).toHaveAttribute(
    "data-commit-id",
    "abcdef1234567890abcdef1234567890abcdef12",
  );
  await expect(page.getByRole("link", { name: "abcdef1" })).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/commit/abcdef1234567890abcdef1234567890abcdef12?branch=main&path=src%2Fmain.rs#src-main-rs",
  );
  await expect(page.getByRole("link", { name: "Show code" }).first()).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/code/abcdef1/src/main.rs",
  );
  await expect(page.getByRole("link", { name: "Older" })).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/commits/main/src/main.rs?page=1",
  );

  await page.goto(
    "/yona/admin/projectYobi/commit/abcdef1234567890abcdef1234567890abcdef12?branch=main&path=src%2Fmain.rs",
  );
  await expect(page.getByRole("heading", { name: "Update main function" })).toBeVisible();
  await expect(page.locator("#code-browse-wrap")).toBeVisible();
  await expect(page.locator(".codediff-wrap")).toBeVisible();
  await expect(page.locator(".commitAuthor")).toContainText("Author");
  await expect(page.locator(".commitId-wrap")).toContainText(
    "@abcdef1234567890abcdef1234567890abcdef12",
  );
  await expect(page.locator(".diff-body")).toContainText('println!("detail")');
  await expect(page.locator(".board-comment-wrap")).toBeVisible();
  await expect(page.locator("#reviewcards-open")).toBeVisible();
  await expect(page.locator("#watch-button")).toBeVisible();
  await expect(page.getByRole("link", { name: "List" })).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/commits/main/src/main.rs",
  );
});

test("organization issue route renders cross-project issue inbox", async ({ page }) => {
  await page.route(apiV1Route("/organizations/weblabs/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        adminMembers: [],
        description: "web labs",
        enrollmentRequested: false,
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanEnroll: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [
          {
            createdLabel: "2026-04-18",
            isWatching: false,
            lastPushedLabel: "2026-04-19",
            logoUrl: "",
            memberCount: 3,
            originOwnerName: "",
            originProjectName: "",
            overview: "Alpha overview",
            ownerName: "weblabs",
            projectName: "projectAlpha",
            projectScope: "public",
            watchCount: 3,
          },
        ],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(/\/api\/v1\/organizations\/weblabs\/issues(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        closedIssueCount: 1,
        items: [
          {
            assigneeLabel: "",
            authorLabel: "Nori",
            commentCount: 2,
            issueNumber: "7",
            labels: [],
            milestoneTitle: "",
            ownerName: "weblabs",
            projectName: "projectAlpha",
            state: "open",
            title: "Organization inbox issue",
            updatedLabel: "2026-04-19",
            voterCount: 1,
            watcherCount: 3,
          },
        ],
        openIssueCount: 1,
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 15,
        totalCount: 1,
        visibleProjects: [{ ownerName: "weblabs", projectName: "projectAlpha" }],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/organizations/weblabs/issues?state=open&pageNum=1");
  await expect(page.getByRole("heading", { name: "Organization Issues" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Closed/ })).toBeVisible();
  await expect(page.getByLabel("Projects")).toBeVisible();
  await expect(page.getByPlaceholder("Search issues")).toBeVisible();
  await expect(page.getByRole("link", { name: "Organization inbox issue" })).toBeVisible();
  await expect(page.getByRole("link", { name: "projectAlpha" })).toBeVisible();
  await expect(page.getByText("#7")).toBeVisible();
});

test("project issue label management route renders the legacy label editor shell", async ({
  page,
}) => {
  await page.goto("/yona/admin/projectYobi/issue/labelsform");
  await expect(page.getByRole("heading", { name: "Issue Labels" })).toBeVisible();
  await expect(page.getByText("Add new label")).toBeVisible();
  await expect(page.getByPlaceholder("Category")).toBeVisible();
  await expect(page.getByPlaceholder("Name")).toBeVisible();
  await expect(page.getByText("No label exists")).toBeVisible();
});

test("project milestone routes render list detail and form shells", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/milestones?state=open");
  await expect(page.getByRole("heading", { name: "Milestones" })).toBeVisible();
  await expect(page.getByText("v1.0")).toBeVisible();
  await expect(page.getByText("Open milestone issue")).toBeVisible();
  await expect(page.getByText("50%")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/milestone/7?state=all");
  await expect(page.getByRole("heading", { exact: true, name: "v1.0" })).toBeVisible();
  await expect(page.getByText("Ship parity")).toBeVisible();
  await expect(page.getByText("Closed milestone issue")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/newMilestoneForm");
  await expect(page.getByRole("heading", { name: "New Milestone" })).toBeVisible();
  await expect(page.getByPlaceholder("yyyy-MM-dd")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/milestone/7/editform");
  await expect(page.getByRole("heading", { name: "Edit Milestone" })).toBeVisible();
  await expect(page.locator('input[name="title"]')).toHaveValue("v1.0");
});

test("project issue routes render forbidden and not-found shells when issue reads fail", async ({
  page,
}) => {
  await page.route(/\/api\/v1\/projects\/[^/]+\/[^/]+\/issues(?:\?.*)?$/, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (
      requestUrl.pathname.includes("/projects/missing/") ||
      requestUrl.pathname.includes("/projects/admin/missingYobi/")
    ) {
      await route.fulfill({
        body: JSON.stringify(restErrorEnvelope("not_found", "project not found", 404)),
        headers: restJsonHeaders,
        status: 404,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify(
        restErrorEnvelope("permission_denied", "issue list is not allowed", 403),
      ),
      headers: restJsonHeaders,
      status: 403,
    });
  });

  await page.route(/\/api\/v1\/projects\/[^/]+\/[^/]+\/issues\/[^/?]+(?:\?.*)?$/, async (route) => {
    if (route.request().url().endsWith("/issues/999")) {
      await route.fulfill({
        body: JSON.stringify(restErrorEnvelope("not_found", "issue not found", 404)),
        headers: restJsonHeaders,
        status: 404,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify(
        restErrorEnvelope("permission_denied", "issue read is not allowed", 403),
      ),
      headers: restJsonHeaders,
      status: 403,
    });
  });

  await page.goto("/yona/admin/projectYobi/issues?pageNum=1");
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
  await expect(page.getByText("/admin/projectYobi/issues")).toBeVisible();

  await page.goto("/yona/missing/projectYobi/issues?pageNum=1");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(page.getByText("/missing/projectYobi/issues")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
  await expect(page.getByText("/admin/projectYobi/issue/1")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/issue/999");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(page.getByText("/admin/projectYobi/issue/999")).toBeVisible();
});
