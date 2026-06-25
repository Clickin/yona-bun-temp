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
  let branchDefault = "main";
  let deleteMeVisible = true;
  const branchListPayload = () => {
    const branches = [
      {
        commitDate: "2026-04-21",
        commitId: "abcdef1234567890abcdef1234567890abcdef12",
        commitMessage: "Initial commit",
        commitShortId: "abcdef1",
        isDefault: branchDefault === "main",
        name: "main",
        pullRequest: null,
        shortName: "main",
      },
      {
        commitDate: "2026-04-22",
        commitId: "1234567890abcdef1234567890abcdef12345678",
        commitMessage: "Prepare branch admin",
        commitShortId: "1234567",
        isDefault: branchDefault === "topic/default",
        name: "topic/default",
        pullRequest: {
          ownerName: "admin",
          projectName: "projectYobi",
          pullRequestNumber: 7,
          state: "open",
        },
        shortName: "topic/default",
      },
      ...(deleteMeVisible
        ? [
            {
              commitDate: "2026-04-23",
              commitId: "fedcba1234567890abcdef1234567890abcdef12",
              commitMessage: "Delete candidate",
              commitShortId: "fedcba1",
              isDefault: false,
              name: "topic/delete-me",
              pullRequest: null,
              shortName: "topic/delete-me",
            },
          ]
        : []),
    ].sort((left, right) => {
      if (left.isDefault) {
        return -1;
      }
      if (right.isDefault) {
        return 1;
      }
      return left.name.localeCompare(right.name);
    });
    return {
      branches,
      defaultBranch: branchDefault,
      noHead: false,
      ownerName: "admin",
      permissions: {
        canDelete: true,
        canUpdate: true,
      },
      projectName: "projectYobi",
    };
  };

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
            childClosedCount: 0,
            childIssues: [
              {
                assigneeLabel: "Door",
                createdLabel: "2026-04-16",
                isDraft: false,
                issueNumber: "2",
                labels: [
                  {
                    color: "#2196f3",
                    id: "8",
                    name: "subtask",
                  },
                ],
                state: "open",
                title: "Child issue row",
              },
            ],
            childOpenCount: 1,
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
        labels: [
          {
            categoryId: "4",
            categoryIsExclusive: false,
            categoryName: "Type",
            color: "#f44336",
            id: "5",
            name: "bug",
          },
        ],
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
                  id: 102,
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
                  id: 101,
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
              id: 102,
              issueNumber: "2",
              labels: [],
              state: "closed",
              title: "Closed milestone issue",
              updatedLabel: "2026-04-16",
            },
          ],
          completionPercent: 50,
          contentsHtml: "",
          contentsMarkdown: "Ship parity",
          dueDateLabel: "2026-05-09",
          id: "7",
          openIssueCount: 1,
          openIssues: [
            {
              assigneeLabel: "Nori",
              commentCount: 1,
              id: 101,
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

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/watchers"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        ownerName: "admin",
        projectName: "projectYobi",
        totalCount: 2,
        watchers: [
          {
            avatarUrl: "/avatars/admin.png",
            loginId: "admin",
            userId: 1,
            userLabel: "Admin",
          },
          {
            avatarUrl: "/avatars/nori.png",
            loginId: "nori",
            userId: 2,
            userLabel: "Nori",
          },
        ],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        assigneeAvatarUrl: "/avatars/door.png",
        assigneeLabel: "Door",
        assigneeLoginId: "door",
        attachments: [],
        authorAvatarUrl: "/avatars/nori.png",
        authorLabel: "Nori",
        authorLoginId: "nori",
        bodyHtml: "",
        bodyMarkdown: "Issue body",
        commentCount: 1,
        comments: [
          {
            attachments: [],
            authorAvatarUrl: "/avatars/nori.png",
            authorLabel: "Nori",
            authorLoginId: "nori",
            contentsHtml: "",
            contentsMarkdown: "First issue comment",
            createdLabel: "now",
            id: 55,
            viewerCanDelete: true,
            viewerCanUpdate: true,
            viewerHasVoted: false,
            voterCount: 0,
            voters: [],
          },
        ],
        hasVoted: false,
        historyHtml: "",
        historyMarkdown: "Changed issue **title** from old value",
        isFavorited: false,
        isWatching: false,
        issueNumber: "1",
        labels: [],
        milestoneTitle: "",
        ownerName: "admin",
        projectName: "projectYobi",
        sharers: [],
        state: "open",
        timeline: [
          {
            createdLabel: "1 minute ago",
            eventType: "ISSUE_STATE_CHANGED",
            id: 54,
            kind: "event",
            newValue: "closed",
            oldValue: "open",
            senderLoginId: "nori",
          },
          {
            comment: {
              attachments: [],
              authorAvatarUrl: "/avatars/nori.png",
              authorLabel: "Nori",
              authorLoginId: "nori",
              contentsHtml: "",
              contentsMarkdown: "First issue comment",
              createdLabel: "now",
              id: 55,
              viewerCanDelete: true,
              viewerCanUpdate: true,
              viewerHasVoted: false,
              voterCount: 0,
              voters: [],
            },
            createdLabel: "now",
            eventType: "",
            id: 55,
            kind: "comment",
            newValue: "",
            oldValue: "",
            senderLoginId: "",
          },
        ],
        title: "Pilot issue",
        viewerCanComment: true,
        viewerCanDelete: false,
        viewerCanManageSharers: true,
        viewerCanUpdate: true,
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
    /\/api\/v1\/projects\/admin\/projectYobi\/branches(?:\/default)?$/,
    async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        branchDefault = "topic/default";
      }
      if (method === "DELETE") {
        deleteMeVisible = false;
      }
      await route.fulfill({
        body: JSON.stringify(branchListPayload()),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

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

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/compare\/[^/?]+(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          commitA: {
            authorDate: "2026-04-20",
            authorEmail: "seed@example.com",
            authorName: "Seed",
            commentCount: 0,
            commitId: "1234567890abcdef1234567890abcdef12345678",
            commitShortId: "1234567",
            message: "Initial commit",
            shortMessage: "Initial commit",
          },
          commitB: {
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
                'diff --git a/src/main.rs b/src/main.rs\n--- a/src/main.rs\n+++ b/src/main.rs\n@@ -1 +1,3 @@\n fn main() {\n+    println!("compare");\n }\n',
              path: "src/main.rs",
            },
          ],
          noHead: false,
          ownerName: "admin",
          projectName: "projectYobi",
          revA: "1234567890abcdef1234567890abcdef12345678",
          revB: "abcdef1234567890abcdef1234567890abcdef12",
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
  await expect(page.locator(".siteintro-bg.row")).toBeVisible();
  await expect(page.locator(".site-heading")).toHaveText(
    "21st Century Software Development Platform",
  );
  await expect(page.getByText("Just focus on what you have to do")).toBeVisible();

  await page.goto("/yona/users/loginform");
  await expect(page).toHaveTitle("Log in");
  await expect(page.getByRole("heading", { name: "Log in to Yona" })).toBeVisible();

  await page.goto("/yona/projects?filter=yobi&pageNum=1");
  await expect(page).toHaveTitle("Project list");
  await expect(page.getByText("projectYobi")).toBeVisible();

  await page.goto("/yona/orgs?filter=lab&pageNum=1");
  await expect(page).toHaveTitle("Group List");
  await expect(page.getByText("weblabs")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/issues?pageNum=2");
  await expect(page).toHaveTitle("Issue");
  await expect(page.locator(".row-fluid.issue-list-wrap")).toBeVisible();
  await expect(page.locator(".post-list-wrap.row-fluid")).toBeVisible();
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
  await page.locator("#loginId").fill("door");
  await page.locator("#uname").fill("Door");
  await page.locator("#email").fill("door@example.com");
  await page.locator("#password").fill("doorpass1");
  await page.locator("#retypedPassword").fill("doorpass1");

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
  await expect(page.getByRole("heading", { name: "Log in to Yona" })).toBeVisible();
});

test("canonical user settings path stays mounted under the base path", async ({ page }) => {
  await page.goto("/yona/user/editform/password");
  await expect(page).toHaveURL(
    /\/yona\/users\/loginform\?redirectUrl=%2Fuser%2Feditform%2Fpassword$/,
  );
  await expect(page.getByRole("heading", { name: "Log in to Yona" })).toBeVisible();
});

test("organization admin routes redirect anonymous viewers to login with a return path", async ({
  page,
}) => {
  await page.goto("/yona/organizations/weblabs/members");
  await expect(page).toHaveURL(
    /\/yona\/users\/loginform\?redirectUrl=%2Forganizations%2Fweblabs%2Fmembers$/,
  );
  await expect(page.getByRole("heading", { name: "Log in to Yona" })).toBeVisible();

  await page.goto("/yona/organizations/weblabs/deleteForm");
  await expect(page).toHaveURL(
    /\/yona\/users\/loginform\?redirectUrl=%2Forganizations%2Fweblabs%2FdeleteForm$/,
  );
  await expect(page.getByRole("heading", { name: "Log in to Yona" })).toBeVisible();
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
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap > p").first()).toHaveText("You are not authorized");
  await expect(page.locator(".error-wrap a.ybtn")).toHaveAttribute(
    "href",
    "/organizations/weblabs/members",
  );

  await page.goto("/yona/organizations/missinglabs/deleteForm");
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap > p").first()).toHaveText("Page not found");
  await expect(page.locator(".error-wrap a.ybtn")).toHaveAttribute(
    "href",
    "/organizations/missinglabs/deleteForm",
  );
});

test("project issue routes render data-backed issue list filters and detail screens", async ({
  page,
}) => {
  let issueListUrl = "";
  const massUpdateRequests: unknown[] = [];
  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/issues\/mass-update$/,
    async (route) => {
      massUpdateRequests.push(route.request().postDataJSON());
      await route.fulfill({
        body: JSON.stringify({ items: [] }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );
  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/issues(?:\?.*)?$/, async (route) => {
    issueListUrl = route.request().url();
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            assigneeAvatarUrl: "/avatars/door.png",
            assigneeLabel: "Door",
            authorLabel: "Nori",
            authorLoginId: "nori",
            childClosedCount: 0,
            childIssues: [
              {
                assigneeLabel: "Door",
                createdLabel: "2026-04-16",
                isDraft: false,
                issueNumber: "2",
                labels: [
                  {
                    color: "#2196f3",
                    id: "8",
                    name: "subtask",
                  },
                ],
                state: "open",
                title: "Child issue row",
              },
            ],
            childOpenCount: 1,
            commentCount: 3,
            dueDateLabel: "2026-05-09",
            dueDateOverdue: false,
            id: "101",
            issueNumber: "1",
            labels: [
              {
                color: "#f44336",
                id: "5",
                name: "bug",
              },
            ],
            milestoneTitle: "v1.0",
            ownerName: "admin",
            projectName: "projectYobi",
            state: "open",
            title: "Pilot issue",
            updatedLabel: "2026-04-15",
            voterCount: 0,
            watcherCount: 0,
            weight: 2,
          },
        ],
        ownerName: "admin",
        pageNum: 2,
        pageSize: 15,
        projectName: "projectYobi",
        totalCount: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto(
    "/yona/admin/projectYobi/issues?state=open&authorLoginId=nori&assigneeLoginId=door&labelIds=5&milestoneId=7&pageNum=2",
  );
  await expect(page.getByText("Pilot issue")).toBeVisible();
  await expect(page.getByText("2026-04-15")).toBeVisible();
  await expect(page.locator("#issue-item-101")).toHaveAttribute("data-value", "nori 1 Pilot issue");
  await expect(page.locator("#issue-101")).toHaveAttribute("data-issue-id", "101");
  await expect(page.locator('.issue-item-row[data-for="issue-101"]')).toBeAttached();
  await expect(page.locator(".weight-up-arrow")).toHaveAttribute("title", "Issue weight 2");
  await expect(page.locator('.avatar-wrap.assinee img[alt="Door"]')).toHaveAttribute(
    "src",
    "/avatars/door.png",
  );
  await expect(page.locator(".yobicon-clock2.mr3.vmiddle")).toBeAttached();
  await expect(page.locator(".span3.hide-in-mobile span.vmiddle")).toHaveText("2026-05-09");
  await expect(
    page.locator(".subtask-progress.upload-progress.red-outline .bar.red"),
  ).toHaveAttribute("style", "width: 0%;");
  await expect(page.locator(".subtask-progress.completion-ratio")).toHaveText("0/1");
  await expect(page.locator(".child-issue-list.hide .child-issue")).toContainText(
    "Child issue row",
  );
  await expect(page.locator(".child-issue-list.hide .child-issue .subtask-number")).toHaveText(
    "#2",
  );
  await expect(page.locator('input[name="state"]')).toHaveValue("open");
  await expect(page.locator('input[name="authorLoginId"]')).toHaveValue("nori");
  await expect(page.locator('input[name="assigneeLoginId"]')).toHaveValue("door");
  await expect(page.locator('select[name="milestoneId"]')).toHaveValue("7");
  await expect(page.locator('select[name="labelIds"] option[value="5"]')).toHaveJSProperty(
    "selected",
    true,
  );
  const issueListSearchParams = new URL(issueListUrl).searchParams;
  expect(issueListSearchParams.get("labelIds")).toBe("5");
  expect(issueListSearchParams.get("milestoneId")).toBe("7");
  await expect(page.locator("#mass-update-form")).toBeVisible();
  await page.locator("#check-all").check();
  await expect(page.locator("#state button.dropdown-toggle")).toBeEnabled();
  await page.locator("#state button.dropdown-toggle").click();
  await page.locator('#state li[data-value="CLOSED"] button').click();
  await expect.poll(() => massUpdateRequests.length).toBe(1);
  expect(massUpdateRequests[0]).toMatchObject({
    issueNumbers: [1],
    state: "closed",
  });

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.getByRole("heading", { name: "Pilot issue" })).toBeVisible();
  await expect(page.getByText("#1")).toBeVisible();
  await expect(page.locator(".board-body.row-fluid")).toBeVisible();
  await expect(page.locator(".board-header.issue .board-id")).toHaveText("#1");
  await expect(
    page.locator(".board-header.issue .pull-right.hide-in-mobile .badge-issue-open"),
  ).toHaveText("open");
  await expect(page.locator(".board-body.row-fluid .span9.span-left-pane")).toBeVisible();
  await expect(page.locator(".board-body.row-fluid .span3.right-menu")).toBeVisible();
  await expect(page.locator(".board-actrow.right-txt")).toBeVisible();
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "false");
  await expect(page.locator("#watch-button")).toContainText("Subscribe");
  await expect(page.locator("#issue-share-button")).toContainText("Issue Sharing");
  await expect(page.locator(".project-btn-item.show-in-mobile-inline a")).toHaveAttribute(
    "href",
    /parentIssueId=/,
  );
  await expect(page.locator(".issue-weight #upvote-issue-weight")).toBeVisible();
  await expect(page.locator(".issue-weight #down-vote-issue-weight")).toBeVisible();
  await expect(page.locator("#vote.vote-wrap .heart .yobicon-hearts")).toBeAttached();
  await expect(page.getByText("Voters: 0")).toHaveCount(0);
  await expect(page.locator(".watcher-list")).toBeAttached();
  await expect(page.getByText("Watchers: 0")).toHaveCount(0);
  await expect(page.locator("#event-54 .state.closed")).toContainText("Closed");
  await expect(page.locator('#event-54 .date a[href="#event-54"]')).toContainText("1 minute ago");
  await expect(page.locator('#event-54 a[href="/yona/nori"]').first()).toBeVisible();
  await expect(page.locator(".posting-history a")).toHaveAttribute(
    "href",
    "#-yona-posting-history",
  );
  await expect(page.locator("#-yona-posting-history")).toContainText(
    "Changed issue title from old value",
  );
  await expect(page.locator("#-yona-posting-history strong")).toHaveText("title");
  await expect(page.locator(".author-info a.usf-group")).toHaveAttribute("href", "/yona/nori");
  await expect(page.locator(".author-info .avatar-wrap.smaller img")).toHaveAttribute(
    "src",
    "/avatars/nori.png",
  );
  await expect(page.locator(".author-info .name")).toContainText("Nori");
  await expect(page.locator(".author-info .loginid")).toContainText("@nori");
  await expect(page.locator(".assignee-info a.usf-group")).toHaveAttribute("href", "/yona/door");
  await expect(page.locator(".assignee-info .avatar-wrap.smaller img")).toHaveAttribute(
    "src",
    "/avatars/door.png",
  );
  await expect(page.locator(".assignee-info .name")).toContainText("Door");
  await expect(page.locator(".assignee-info .loginid")).toContainText("@door");
  await expect(page.locator("#comments.board-comment-wrap")).toBeVisible();
  await expect(page.locator("#comments .comment-header .num")).toHaveText("1");
  await expect(page.locator("#comment-55 .comment-avatar a.avatar-wrap")).toHaveAttribute(
    "href",
    "/yona/nori",
  );
  await expect(page.locator("#comment-55 .comment-avatar img")).toHaveAttribute(
    "src",
    "/avatars/nori.png",
  );
  await expect(page.locator("#comment-55 .comment_author")).toContainText("Nori");
  await expect(page.locator('#comment-55 .ago-date a.ago[href="#comment-55"]')).toContainText(
    "now",
  );
  await expect(page.locator('#comment-55 .ago-date a.share-link[href="#comment-55"]')).toHaveCSS(
    "display",
    "none",
  );
  await expect(page.locator("#comment-55 .act-row.pull-right")).toBeVisible();
  await expect(page.locator("#comment-55 .new-issue-by a")).toHaveAttribute(
    "href",
    "/yona/user/issues/new?commentId=55",
  );
  await expect(page.locator("#comment-55 .comment-vote")).toHaveAttribute(
    "data-request-type",
    "comment-vote",
  );
  await expect(page.locator("#comment-55 .comment-vote")).toHaveAttribute(
    "data-request-uri",
    "/yona/admin/projectYobi/issue/1/comment/55/vote",
  );
  await expect(page.locator("#comment-body-55 .comment-body")).toHaveAttribute(
    "data-allowed-update",
    "true",
  );
  await expect(page.locator("#comment-body-55 .comment-body")).toContainText("First issue comment");
  await expect(page.locator('#comment-55 [data-toggle="comment-edit"]')).toHaveAttribute(
    "data-comment-id",
    "55",
  );
  await page.locator('#comment-55 [data-toggle="comment-edit"]').click();
  await expect(page.locator("#comment-editform-55.comment-update-form")).toBeVisible();
  await expect(page.locator("#comment-editform-55 form")).toHaveAttribute(
    "action",
    "/yona/admin/projectYobi/issue/1/comments/55",
  );
  await expect(page.locator("#comment-editform-55 .ybtn-cancel")).toHaveAttribute(
    "data-comment-id",
    "55",
  );
  await expect(page.locator("#comment-editform-55 .ybtn-info")).toContainText("Save");
  await expect(page.locator("#comment-body-55")).toHaveCSS("display", "none");
  await expect(page.locator('#comment-55 [data-toggle="comment-delete"]')).toHaveAttribute(
    "data-request-uri",
    "/yona/admin/projectYobi/issue/1/comment/55/delete",
  );
  await page.locator('#comment-55 [data-toggle="comment-delete"]').click();
  await expect(page.locator("#comment-delete-modal.modal.hide.fade.in")).toBeVisible();
  await expect(page.locator("#comment-delete-modal")).toContainText(
    "Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?",
  );
  await expect(page.locator("#comment-delete-confirm")).toHaveAttribute(
    "data-request-method",
    "delete",
  );
  await expect(page.locator("#comment-delete-confirm")).toHaveAttribute(
    "data-request-uri",
    "/yona/admin/projectYobi/issue/1/comment/55/delete",
  );
});

test("project issue routes render direct issue form from comment for authenticated users", async ({
  page,
}) => {
  let directIssueCreateBody: null | {
    bodyMarkdown?: string;
    referCommentId?: string;
    title?: string;
  } = null;

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
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
  await page.route(/\/api\/v1\/user\/issues\/new-options\?commentId=55$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        bodyMarkdown:
          "First issue comment\n\n_Originally posted by @nori in http://localhost:3001/yona/admin/projectYobi/issue/1#comment-55_",
        referCommentId: "55",
        selectedProject: {
          ownerName: "admin",
          projectName: "projectYobi",
        },
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/issues$/, async (route) => {
    directIssueCreateBody = route.request().postDataJSON() as {
      bodyMarkdown?: string;
      referCommentId?: string;
      title?: string;
    };
    await route.fulfill({
      body: JSON.stringify({
        issueNumber: "2",
        ownerName: "admin",
        projectName: "projectYobi",
        title: directIssueCreateBody.title ?? "Derived issue",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/user/issues/new?commentId=55");
  await expect(page.getByRole("heading", { name: "New issue" })).toBeVisible();
  await expect(page.locator('input[name="referCommentId"]')).toHaveValue("55");
  await expect(page.locator('textarea[name="body"]')).toHaveValue(/First issue comment/);
  await expect(page.locator('textarea[name="body"]')).toHaveValue(/Originally posted by @nori/);
  await page.locator('input[name="title"]').fill("Derived issue");
  await page.locator("#button-save").click();
  await expect.poll(() => directIssueCreateBody?.referCommentId).toBe("55");
  expect(directIssueCreateBody?.title).toBe("Derived issue");
  expect(directIssueCreateBody?.bodyMarkdown).toContain("First issue comment");
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/issue\/2$/);
});

test("project issue routes render direct my-issue form for authenticated users", async ({
  page,
}) => {
  let directIssueCreateBody: null | {
    bodyMarkdown?: string;
    referCommentId?: string;
    title?: string;
  } = null;

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
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
  await page.route(/\/api\/v1\/user\/issues\/new-options\?mine=true$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        bodyMarkdown: "",
        referCommentId: "",
        selectedProject: {
          ownerName: "nori",
          projectName: "inbox",
        },
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/nori/projects/inbox/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 0,
        cloneUrl: "https://example.com/nori/inbox.git",
        codeMemberOnly: false,
        defaultTab: "issues",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 0,
        members: [],
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "My issue inbox",
        ownerName: "nori",
        projectName: "inbox",
        projectScope: "private",
        reviewCount: 0,
        showAdmin: false,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        viewerCanEnroll: false,
        viewerCanUpdate: true,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/nori/projects/inbox/milestones?*"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        milestones: [],
        ownerName: "nori",
        projectName: "inbox",
        state: "all",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(/\/api\/v1\/projects\/nori\/inbox\/issues$/, async (route) => {
    directIssueCreateBody = route.request().postDataJSON() as {
      bodyMarkdown?: string;
      referCommentId?: string;
      title?: string;
    };
    await route.fulfill({
      body: JSON.stringify({
        issueNumber: "3",
        ownerName: "nori",
        projectName: "inbox",
        title: directIssueCreateBody.title ?? "My issue",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/user/issues/new/mine");
  await expect(page.getByRole("heading", { name: "New issue" })).toBeVisible();
  await expect(page.locator('input[name="referCommentId"]')).toHaveValue("");
  await expect(page.locator('textarea[name="body"]')).toHaveValue("");
  await page.locator('input[name="title"]').fill("My issue");
  await page.locator("#button-save").click();
  await expect.poll(() => directIssueCreateBody?.referCommentId).toBeUndefined();
  expect(directIssueCreateBody?.title).toBe("My issue");
  expect(directIssueCreateBody?.bodyMarkdown).toBe("");
  await expect(page).toHaveURL(/\/yona\/nori\/inbox\/issue\/3$/);
});

test("project issue comment editor inserts pasted and dropped image uploads", async ({ page }) => {
  const uploadedHeaders: string[] = [];
  const uploadedNames: string[] = [];
  let submittedComment: null | { attachmentIds?: string[]; contentsMarkdown?: string } = null;

  await page.route("**/files", async (route) => {
    const uploadIndex = uploadedNames.length + 1;
    uploadedHeaders.push(route.request().headers()["x-csrf-token"] ?? "");
    uploadedNames.push(`image-${uploadIndex}.png`);
    await route.fulfill({
      body: JSON.stringify({
        id: 900 + uploadIndex,
        mimeType: "image/png",
        name: uploadIndex === 1 ? "paste.png" : "drop.png",
        size: 8,
        url: `/yona/files/${900 + uploadIndex}`,
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1/comments"), async (route) => {
    submittedComment = route.request().postDataJSON() as {
      attachmentIds?: string[];
      contentsMarkdown?: string;
    };
    await route.fulfill({
      body: JSON.stringify({
        assigneeLabel: "",
        assigneeLoginId: "",
        attachments: [],
        authorAvatarUrl: "/avatars/nori.png",
        authorLabel: "Nori",
        authorLoginId: "nori",
        bodyHtml: "",
        bodyMarkdown: "Issue body",
        commentCount: 1,
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
        timeline: [
          {
            comment: {
              attachments: [],
              authorAvatarUrl: "/avatars/nori.png",
              authorLabel: "Nori",
              authorLoginId: "nori",
              contentsHtml: "",
              contentsMarkdown: submittedComment?.contentsMarkdown ?? "",
              createdLabel: "now",
              id: 99,
              viewerCanDelete: false,
              viewerCanUpdate: false,
              viewerHasVoted: false,
              voterCount: 0,
              voters: [],
            },
            createdLabel: "now",
            eventType: "",
            id: 99,
            kind: "comment",
          },
        ],
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

  await page.goto("/yona/admin/projectYobi/issue/1");
  const editor = page.locator("#editor-contents-comment-body");

  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "paste.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(editor).toHaveValue("![paste.png](/yona/files/901) ");

  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["dropped"], "drop.png", { type: "image/png" }));
    element.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      }),
    );
  });
  await expect(editor).toHaveValue("![paste.png](/yona/files/901) ![drop.png](/yona/files/902) ");

  await page.locator("#comment-form").getByRole("button", { name: "Add a comment" }).click();

  expect(uploadedHeaders).toEqual(["csrf-123", "csrf-123"]);
  expect(submittedComment).toEqual({
    attachmentIds: ["901", "902"],
    contentsMarkdown: "![paste.png](/yona/files/901) ![drop.png](/yona/files/902)",
  });
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
    "data-commitId",
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

  await page.goto("/yona/admin/projectYobi/compare/1234567..abcdef1");
  await expect(page.getByRole("heading", { name: "Compare" })).toBeVisible();
  await expect(page.locator(".commitInfo")).toContainText(
    "@1234567890abcdef1234567890abcdef12345678..abcdef1234567890abcdef1234567890abcdef12",
  );
  await expect(page.locator(".diff-body.discommentable")).toContainText('println!("compare")');
  await expect(page.locator("#src-main-rs")).toBeVisible();
});

test("project branch routes render and mutate the legacy branch table", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/branches");
  await expect(page.getByRole("heading", { name: "Branches" })).toBeVisible();
  await expect(page.locator(".branch-list-wrap")).toBeVisible();
  await expect(page.locator("tr.head .branchName")).toContainText("main");
  await expect(page.locator(".headBranch")).toContainText("Default branch");
  await expect(page.locator(".commitId").first()).toHaveAttribute(
    "title",
    "abcdef1234567890abcdef1234567890abcdef12",
  );
  await expect(page.locator(".pullrequest-state.open")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/pullRequest/7",
  );
  await expect(
    page.locator('[data-request-uri="/yona/admin/projectYobi/code/topic%2Fdefault/setAsDefault"]'),
  ).toBeVisible();
  await expect(
    page.locator(
      'a[data-request-method="delete"][href="/yona/admin/projectYobi/code/topic%2Fdelete-me/"]',
    ),
  ).toBeVisible();

  await page
    .locator('[data-request-uri="/yona/admin/projectYobi/code/topic%2Fdefault/setAsDefault"]')
    .click();
  await expect(page.locator("tr.head .branchName")).toContainText("topic/default");

  await page
    .locator(
      'a[data-request-method="delete"][href="/yona/admin/projectYobi/code/topic%2Fdelete-me/"]',
    )
    .click();
  await expect(page.locator(".branchName", { hasText: "topic/delete-me" })).toHaveCount(0);
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
            assigneeAvatarUrl: "/avatars/door.png",
            assigneeLabel: "Door",
            assigneeLoginId: "door",
            authorAvatarUrl: "/avatars/nori.png",
            authorLabel: "Nori",
            authorLoginId: "nori",
            commentCount: 2,
            dueDateLabel: "2026-05-30",
            dueDateOverdue: true,
            id: "207",
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
  await expect(page.locator(".row-fluid.issue-list-wrap")).toBeVisible();
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator("#projects")).toBeVisible();
  await expect(page.locator('.nav.nav-tabs.nm a[data-state="open"]')).toContainText("Open 1");
  await expect(page.locator('.nav.nav-tabs.nm a[data-state="closed"]')).toContainText("Closed 1");
  await expect(page.getByRole("link", { name: "Organization inbox issue" })).toBeVisible();
  await expect(page.locator("#issue-item-207")).toBeAttached();
  await expect(page.locator('.avatar-wrap.mlarge img[alt="Nori"]')).toHaveAttribute(
    "src",
    "/avatars/nori.png",
  );
  await expect(page.locator(".infos-link-item", { hasText: "Nori" })).toHaveAttribute(
    "href",
    "/yona/nori",
  );
  await expect(page.locator('.avatar-wrap.assinee img[alt="Door"]')).toHaveAttribute(
    "src",
    "/avatars/door.png",
  );
  await expect(page.locator(".avatar-wrap.assinee")).toHaveAttribute("href", "/yona/door");
  await expect(page.locator(".span2.hide-in-mobile .yobicon-clock2")).toBeAttached();
  await expect(page.locator(".span2.hide-in-mobile .mr20.mt10.pull-right.overdue")).toContainText(
    "2026-05-30",
  );
  await expect(page.locator(".group-project-name")).toHaveText("projectAlpha");
  await expect(page.locator(".post-id.margin-right-5")).toHaveText("#7");
});

test("project issue label management route renders the legacy label editor shell", async ({
  page,
}) => {
  let copied = false;
  await page.route(apiV1Route("/owners/admin/projects/projectYobi/labels"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        labels: copied
          ? [
              {
                categoryId: "11",
                categoryIsExclusive: true,
                categoryName: "FromSource",
                color: "#2196f3",
                id: "17",
                name: "Copied",
              },
            ]
          : [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/admin/projects/projectYobi/labels/copy"), async (route) => {
    copied = true;
    await route.fulfill({
      body: JSON.stringify({
        copied: 1,
        labels: [
          {
            categoryId: "11",
            categoryIsExclusive: true,
            categoryName: "FromSource",
            color: "#2196f3",
            id: "17",
            name: "Copied",
          },
        ],
        skipped: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/admin/projectYobi/issue/labelsform");
  await expect(page.locator(".project-page-wrap.label-editor-wrap")).toBeVisible();
  await expect(page.locator("#copyLabel")).toBeVisible();
  await expect(
    page.getByText("Copy all labels from a project and append to current project"),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Owner Name")).toBeVisible();
  await expect(page.getByPlaceholder("Project name")).toBeVisible();
  await expect(page.locator("#frmNewLabel")).toBeVisible();
  await expect(page.getByText("Add new label")).toBeVisible();
  await expect(page.locator("#frmNewLabel").getByPlaceholder("Category")).toBeVisible();
  await expect(
    page.locator("#frmNewLabel").getByPlaceholder("Name", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("#frmNewLabel .label-preset-colors")).toBeVisible();
  await expect(page.locator("#labelsList .error-wrap")).toContainText("No label exists");
  await page.locator('#copyLabel input[name="owner"]').fill("owner");
  await page.locator('#copyLabel input[name="projectName"]').fill("sourceLabels");
  await page.locator("#copyLabel").getByRole("button", { name: "Copy labels" }).click();
  await expect(page.locator("#labelsList .issue-label.active")).toHaveText("Copied");
  await expect(
    page.locator('#labelsList .category-wrap[data-category-name="FromSource"]'),
  ).toBeVisible();
});

test("project watchers route renders the legacy watcher directory shell", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/watchers");
  await expect(page.getByText("This project's watcher list.")).toBeVisible();
  await expect(
    page.getByText("* This list contains only those who can access this project."),
  ).toBeVisible();
  await expect(page.locator(".page-wrap-outer .project-page-wrap")).toBeVisible();
  await expect(page.locator("ul.members.project.row-fluid")).toBeVisible();
  await expect(page.locator("li.member.span6.span-hard-wrap")).toHaveCount(2);
  await expect(page.locator(".member-name", { hasText: "Admin" })).toBeVisible();
  await expect(page.locator(".member-id", { hasText: "@nori" })).toBeVisible();
  await expect(page.locator('a.avatar-wrap[href="/yona/admin"] img')).toHaveAttribute(
    "src",
    "/avatars/admin.png",
  );
});

test("project milestone routes render list detail and form shells", async ({ page }) => {
  const milestoneMassUpdateRequests: unknown[] = [];
  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/issues\/mass-update$/,
    async (route) => {
      milestoneMassUpdateRequests.push(route.request().postDataJSON());
      await route.fulfill({
        body: JSON.stringify({ items: [] }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.goto("/yona/admin/projectYobi/milestones?state=open");
  await expect(page.locator(".project-page-wrap .tab-wrap")).toBeVisible();
  await expect(page.locator(".nav.nav-tabs a", { hasText: "Open" })).toBeVisible();
  await expect(page.locator(".nav.nav-tabs a", { hasText: "Closed" })).toBeVisible();
  await expect(page.locator(".nav.nav-tabs a", { hasText: "All" })).toBeVisible();
  await expect(page.locator(".milestones .milestone")).toHaveCount(1);
  await expect(page.locator(".milestone-name")).toHaveText("v1.0");
  await expect(page.locator(".issue-link", { hasText: "Open milestone issue" })).toBeVisible();
  await expect(page.locator(".completion-rate")).toContainText("50%");
  await expect(page.locator(".progress.progress-success .bar")).toHaveAttribute(
    "style",
    "width: 50%;",
  );

  await page.goto("/yona/admin/projectYobi/milestone/7?state=all");
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveText("v1.0");
  await expect(page.locator(".milestone-desc .markdown-wrap")).toContainText("Ship parity");
  await expect(page.locator(".badge.badge-issue-open")).toContainText("Open");
  await expect(page.locator("#issues .nav.nav-tabs a", { hasText: "Open" })).toBeVisible();
  await expect(page.locator("#issues .nav.nav-tabs a", { hasText: "Closed" })).toBeVisible();
  await expect(page.locator("#issues .nav.nav-tabs a", { hasText: "All" })).toBeVisible();
  await expect(page.getByPlaceholder("search at current milestone")).toBeVisible();
  await expect(page.getByRole("link", { name: "Closed milestone issue" })).toBeVisible();
  await expect(page.locator(".actrow .ybtn", { hasText: "List" })).toBeVisible();
  await expect(page.locator(".actrow .ybtn", { hasText: "Edit" })).toBeVisible();
  await expect(page.locator(".actrow .ybtn", { hasText: "Close milestone" })).toBeVisible();
  await expect(page.locator("#mass-update-form")).toBeVisible();
  await page.locator("#issue-101").check();
  await expect(page.locator("#state button.dropdown-toggle")).toBeEnabled();
  await page.locator("#state button.dropdown-toggle").click();
  await page.locator('#state li[data-value="CLOSED"] button').click();
  await expect.poll(() => milestoneMassUpdateRequests.length).toBe(1);
  expect(milestoneMassUpdateRequests[0]).toMatchObject({
    issueNumbers: ["1"],
    state: "closed",
  });

  await page.goto("/yona/admin/projectYobi/newMilestoneForm");
  await expect(page.locator(".milestone-form-page #milestone-form")).toBeVisible();
  await expect(page.locator('#milestone-form input[name="title"]')).toHaveAttribute(
    "placeholder",
    "Title",
  );
  await expect(page.locator('#milestone-form textarea[name="contents"]')).toBeVisible();
  await expect(page.locator("#milestone-open")).toBeChecked();
  await expect(page.locator('label[for="milestone-open"]')).toHaveText("Open");
  await expect(page.locator('label[for="milestone-close"]')).toHaveText("Closed");
  await expect(page.locator("#dueDate")).toBeVisible();
  await expect(page.locator("#datepicker.date-picker")).toBeAttached();
  await expect(page.locator('#milestone-form button[type="submit"]')).toHaveText("Save");

  await page.goto("/yona/admin/projectYobi/milestone/7/editform");
  await expect(page.locator(".milestone-form-page #milestone-form")).toBeVisible();
  await expect(page.locator('input[name="title"]')).toHaveValue("v1.0");
  await expect(page.locator('textarea[name="contents"]')).toHaveValue("Ship parity");
  await expect(page.locator("#dueDate")).toHaveValue("2026-05-09");
});

test("project milestone create editor inserts pasted and dropped image uploads", async ({
  page,
}) => {
  const uploadedHeaders: string[] = [];

  await page.route("**/files", async (route) => {
    const uploadIndex = uploadedHeaders.length + 1;
    uploadedHeaders.push(route.request().headers()["x-csrf-token"] ?? "");
    await route.fulfill({
      body: JSON.stringify({
        id: 840 + uploadIndex,
        mimeType: "image/png",
        name: uploadIndex === 1 ? "milestone-paste.png" : "milestone-drop.png",
        size: 8,
        url: `/yona/files/${840 + uploadIndex}`,
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });
  await page.route(apiV1Route("/owners/admin/projects/projectYobi/milestones"), async (route) => {
    const body = route.request().postDataJSON() as {
      contentsMarkdown?: string;
      title?: string;
    };
    await route.fulfill({
      body: JSON.stringify({
        milestone: {
          contentsHtml: "",
          contentsMarkdown: body.contentsMarkdown ?? "",
          dueDateLabel: "",
          id: "8",
          state: "open",
          title: body.title ?? "Created milestone",
        },
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });

  await page.goto("/yona/admin/projectYobi/newMilestoneForm");
  const contentsEditor = page.locator('textarea[name="contents"]');

  await contentsEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "milestone-paste.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(contentsEditor).toHaveValue("![milestone-paste.png](/yona/files/841) ");

  await contentsEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["dropped"], "milestone-drop.png", { type: "image/png" }));
    element.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      }),
    );
  });
  await expect(contentsEditor).toHaveValue(
    "![milestone-paste.png](/yona/files/841) ![milestone-drop.png](/yona/files/842) ",
  );

  const createRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/owners/admin/projects/projectYobi/milestones") &&
      request.method() === "POST",
  );
  await page.getByPlaceholder("Title").fill("Created upload milestone");
  await page.getByRole("button", { name: "Save" }).click();
  const submittedMilestone = (await createRequest).postDataJSON() as {
    attachmentIds?: number[];
    contentsMarkdown?: string;
  };

  expect(uploadedHeaders).toEqual(["csrf-123", "csrf-123"]);
  expect(submittedMilestone).toMatchObject({
    attachmentIds: [841, 842],
    contentsMarkdown:
      "![milestone-paste.png](/yona/files/841) ![milestone-drop.png](/yona/files/842) ",
  });
});

test("project milestone edit editor submits pasted image uploads", async ({ page }) => {
  await page.route("**/files", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        id: 843,
        mimeType: "image/png",
        name: "milestone-edit.png",
        size: 8,
        url: "/yona/files/843",
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });
  await page.route(apiV1Route("/owners/admin/projects/projectYobi/milestones/7"), async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as {
        contentsMarkdown?: string;
        title?: string;
      };
      await route.fulfill({
        body: JSON.stringify({
          milestone: {
            contentsHtml: "",
            contentsMarkdown: body.contentsMarkdown ?? "",
            dueDateLabel: "2026-05-09",
            id: "7",
            state: "open",
            title: body.title ?? "v1.0",
          },
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        milestone: {
          contentsHtml: "",
          contentsMarkdown: "Ship parity",
          dueDateLabel: "2026-05-09",
          id: "7",
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

  await page.goto("/yona/admin/projectYobi/milestone/7/editform");
  const contentsEditor = page.locator('textarea[name="contents"]');
  await contentsEditor.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "milestone-edit.png", { type: "image/png" }));
    textarea.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(contentsEditor).toHaveValue("Ship parity![milestone-edit.png](/yona/files/843) ");

  const updateRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/owners/admin/projects/projectYobi/milestones/7") &&
      request.method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save" }).click();
  const submittedMilestone = (await updateRequest).postDataJSON() as {
    attachmentIds?: number[];
    contentsMarkdown?: string;
  };

  expect(submittedMilestone).toMatchObject({
    attachmentIds: [843],
    contentsMarkdown: "Ship parity![milestone-edit.png](/yona/files/843) ",
  });
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
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap > p").first()).toHaveText("You are not authorized");
  await expect(page.getByRole("link", { name: "Home" })).toHaveAttribute(
    "href",
    "/admin/projectYobi/issues",
  );

  await page.goto("/yona/missing/projectYobi/issues?pageNum=1");
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap > p").first()).toHaveText("Page not found");
  await expect(page.getByRole("link", { name: "Home" })).toHaveAttribute(
    "href",
    "/missing/projectYobi/issues",
  );

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap > p").first()).toHaveText("You are not authorized");
  await expect(page.getByRole("link", { name: "Home" })).toHaveAttribute(
    "href",
    "/admin/projectYobi/issue/1",
  );

  await page.goto("/yona/admin/projectYobi/issue/999");
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap > p").first()).toHaveText("Page not found");
  await expect(page.getByRole("link", { name: "Home" })).toHaveAttribute(
    "href",
    "/admin/projectYobi/issue/999",
  );
});
