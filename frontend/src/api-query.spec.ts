import { describe, expect, it } from "vitest";
import {
  updatePostCommentRest,
  updateProjectPostRest,
  listOrganizationBoardsQueryOptions,
  listProjectPostsQueryOptions,
  readProjectPostFormOptionsQueryOptions,
  readProjectPostQueryOptions,
} from "./api/boards";
import { projectIssueReferencesQueryOptions } from "./api/issue-meta";
import {
  projectPullRequestListQueryOptions,
  pullRequestDetailQueryOptions,
} from "./api/pull-requests";
import { apiQueryKeys } from "./api/query-keys";
import {
  globalSearchQueryOptions,
  organizationSearchQueryOptions,
  projectSearchQueryOptions,
} from "./api/search";
import {
  deleteSiteProjectRest,
  deleteSiteUserRest,
  readSiteDiagnosticsQueryOptions,
  readSiteMailQueryOptions,
  readSiteMassMailQueryOptions,
  readSiteMassMailRecipientsRest,
  readSiteUpdateQueryOptions,
  sendSiteMailRest,
  listSiteIssuesQueryOptions,
  listSitePostsQueryOptions,
  listSiteProjectsQueryOptions,
  listSiteUsersQueryOptions,
  resetSiteUserPasswordRest,
  toggleSiteUserAccountLockRest,
  toggleSiteUserGuestModeRest,
  toggleSiteUserRoleRest,
  unwatchSiteUpdateRest,
} from "./api/site-admin";

describe("api query keys", () => {
  it("includes owner, project, and query in project issue-reference keys", () => {
    const key = apiQueryKeys.project.issueReferences("owner", "projectYobi", {
      query: "12",
    });

    expect(key).toEqual([
      "api",
      "v1",
      "owners",
      "owner",
      "projects",
      "projectYobi",
      "issue-references",
      { query: "12" },
    ]);
  });

  it("builds project issue-reference query options from the same key", () => {
    const options = projectIssueReferencesQueryOptions(
      { apiBaseUrl: "/yona/api", basePath: "/yona" },
      {
        ownerName: "owner",
        projectName: "projectYobi",
        query: "needle",
      },
    );

    expect(options.queryKey).toEqual(
      apiQueryKeys.project.issueReferences("owner", "projectYobi", {
        query: "needle",
      }),
    );
    expect(options.queryFn).toEqual(expect.any(Function));
  });

  it("includes all project pull-request list filters in the query key", () => {
    expect(
      apiQueryKeys.project.pullRequestList("owner", "projectYobi", {
        category: "sent",
        contributorId: 7,
        filter: "review",
        pageNum: 3,
      }),
    ).toEqual([
      "api",
      "v1",
      "owners",
      "owner",
      "projects",
      "projectYobi",
      "pull-requests",
      { category: "sent", contributorId: 7, filter: "review", pageNum: 3 },
    ]);
  });

  it("builds pull-request query options from the same project keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };

    expect(
      projectPullRequestListQueryOptions(runtimeConfig, {
        category: "open",
        filter: "needle",
        ownerName: "owner",
        pageNum: 2,
        projectName: "projectYobi",
      }).queryKey,
    ).toEqual(
      apiQueryKeys.project.pullRequestList("owner", "projectYobi", {
        category: "open",
        contributorId: 0,
        filter: "needle",
        pageNum: 2,
      }),
    );
    expect(
      pullRequestDetailQueryOptions(runtimeConfig, {
        ownerName: "owner",
        projectName: "projectYobi",
        pullRequestNumber: 9,
      }).queryKey,
    ).toEqual(apiQueryKeys.project.pullRequestDetail("owner", "projectYobi", 9));
  });

  it("includes project board list filters in query keys", () => {
    const key = apiQueryKeys.project.posts("owner", "projectYobi", {
      filter: "readme",
      labelIds: [3, 4],
      orderBy: "createdDate",
      orderDir: "desc",
      pageNum: 2,
    });

    expect(key).toEqual([
      "api",
      "v1",
      "owners",
      "owner",
      "projects",
      "projectYobi",
      "posts",
      {
        filter: "readme",
        labelIds: [3, 4],
        orderBy: "createdDate",
        orderDir: "desc",
        pageNum: 2,
      },
    ]);
  });

  it("builds board query options from canonical query keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const listOptions = listProjectPostsQueryOptions(runtimeConfig, {
      filter: "needle",
      labelIds: [1],
      ownerName: "owner",
      pageNum: 1,
      projectName: "projectYobi",
    });
    const detailOptions = readProjectPostQueryOptions(runtimeConfig, {
      ownerName: "owner",
      postNumber: 12,
      projectName: "projectYobi",
    });
    const formOptions = readProjectPostFormOptionsQueryOptions(runtimeConfig, {
      ownerName: "owner",
      projectName: "projectYobi",
    });
    const orgOptions = listOrganizationBoardsQueryOptions(runtimeConfig, {
      filter: "cross",
      organizationName: "weblabs",
      pageNum: 1,
      projectNames: ["alpha"],
    });

    expect(listOptions.queryKey).toEqual(
      apiQueryKeys.project.posts("owner", "projectYobi", {
        filter: "needle",
        labelIds: [1],
        orderBy: "",
        orderDir: "",
        pageNum: 1,
      }),
    );
    expect(detailOptions.queryKey).toEqual(apiQueryKeys.project.post("owner", "projectYobi", 12));
    expect(formOptions.queryKey).toEqual(
      apiQueryKeys.project.postFormOptions("owner", "projectYobi"),
    );
    expect(orgOptions.queryKey).toEqual(
      apiQueryKeys.organization.boards("weblabs", {
        filter: "cross",
        orderBy: "",
        orderDir: "",
        pageNum: 1,
        projectNames: ["alpha"],
      }),
    );
    expect(listOptions.queryFn).toEqual(expect.any(Function));
    expect(detailOptions.queryFn).toEqual(expect.any(Function));
    expect(formOptions.queryFn).toEqual(expect.any(Function));
    expect(orgOptions.queryFn).toEqual(expect.any(Function));
  });

  it("includes search scope, type, keyword, and page in query keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };

    expect(
      globalSearchQueryOptions(runtimeConfig, {
        keyword: "Needle",
        pageNum: 2,
        searchType: "issue",
      }).queryKey,
    ).toEqual(
      apiQueryKeys.search.global({
        keyword: "Needle",
        pageNum: 2,
        searchType: "issue",
      }),
    );
    expect(
      projectSearchQueryOptions(runtimeConfig, {
        keyword: "Needle",
        ownerName: "owner",
        pageNum: 1,
        projectName: "projectYobi",
        searchType: "review",
      }).queryKey,
    ).toEqual(
      apiQueryKeys.search.project("owner", "projectYobi", {
        keyword: "Needle",
        pageNum: 1,
        searchType: "review",
      }),
    );
    expect(
      organizationSearchQueryOptions(runtimeConfig, {
        keyword: "Needle",
        organizationName: "weblabs",
        searchType: "post",
      }).queryKey,
    ).toEqual(
      apiQueryKeys.search.organization("weblabs", {
        keyword: "Needle",
        pageNum: 1,
        searchType: "post",
      }),
    );
  });

  it("builds site-admin user list query options from canonical query keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const options = listSiteUsersQueryOptions(runtimeConfig, {
      pageNum: 2,
      pageSize: 30,
      query: "needle",
      state: "SITE_ADMIN",
    });

    expect(options.queryKey).toEqual(
      apiQueryKeys.siteAdmin.users({
        pageNum: 2,
        pageSize: 30,
        query: "needle",
        state: "SITE_ADMIN",
      }),
    );
    expect(options.queryFn).toEqual(expect.any(Function));
  });

  it("builds site-admin project list query options from canonical query keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const options = listSiteProjectsQueryOptions(runtimeConfig, {
      filter: "needle",
      pageNum: 2,
      pageSize: 25,
    });

    expect(options.queryKey).toEqual(
      apiQueryKeys.siteAdmin.projects({
        filter: "needle",
        pageNum: 2,
        pageSize: 25,
      }),
    );
    expect(options.queryFn).toEqual(expect.any(Function));
  });

  it("builds site-admin post list query options from canonical query keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const options = listSitePostsQueryOptions(runtimeConfig, {
      pageNum: 2,
      pageSize: 30,
    });

    expect(options.queryKey).toEqual(
      apiQueryKeys.siteAdmin.posts({
        pageNum: 2,
        pageSize: 30,
      }),
    );
    expect(options.queryFn).toEqual(expect.any(Function));
  });

  it("builds site-admin issue list query options from canonical query keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const options = listSiteIssuesQueryOptions(runtimeConfig, {
      pageNum: 2,
      pageSize: 30,
      state: "CLOSED",
    });

    expect(options.queryKey).toEqual(
      apiQueryKeys.siteAdmin.issues({
        pageNum: 2,
        pageSize: 30,
        state: "CLOSED",
      }),
    );
    expect(options.queryFn).toEqual(expect.any(Function));
  });

  it("builds site-admin diagnostics query options from canonical query keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const options = readSiteDiagnosticsQueryOptions(runtimeConfig);

    expect(options.queryKey).toEqual(apiQueryKeys.siteAdmin.diagnostics());
    expect(options.queryFn).toEqual(expect.any(Function));
  });

  it("builds site-admin update query options from canonical query keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const options = readSiteUpdateQueryOptions(runtimeConfig);

    expect(options.queryKey).toEqual(apiQueryKeys.siteAdmin.update());
    expect(options.queryFn).toEqual(expect.any(Function));
  });

  it("builds site-admin mail query options from canonical query keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const options = readSiteMailQueryOptions(runtimeConfig);

    expect(options.queryKey).toEqual(apiQueryKeys.siteAdmin.mail());
    expect(options.queryFn).toEqual(expect.any(Function));
  });

  it("builds site-admin mass-mail query options from canonical query keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const options = readSiteMassMailQueryOptions(runtimeConfig);

    expect(options.queryKey).toEqual(apiQueryKeys.siteAdmin.massMail());
    expect(options.queryFn).toEqual(expect.any(Function));
  });

  it("uses POST for site-admin user action REST mutations", async () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push(`${init?.method ?? ""} ${String(input)}`);
      if (String(input).endsWith("/reset-password")) {
        return new Response(
          JSON.stringify({
            isSuccess: true,
            loginId: "member",
            name: "Member",
            newPassword: "abc123",
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          avatarUrl: "",
          createdAt: "",
          createdLabel: "",
          displayName: "Member",
          emailAddress: "member@example.com",
          id: "2",
          isGuest: false,
          isSiteAdmin: true,
          lastStateModifiedAt: "",
          lastStateModifiedLabel: "",
          loginId: "member",
          state: "active",
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    };

    await toggleSiteUserRoleRest(runtimeConfig, "csrf", "member", fetchImpl);
    await toggleSiteUserAccountLockRest(runtimeConfig, "csrf", "member", fetchImpl);
    await toggleSiteUserGuestModeRest(runtimeConfig, "csrf", "member", fetchImpl);
    await resetSiteUserPasswordRest(runtimeConfig, "csrf", "member", fetchImpl);

    expect(requests).toEqual([
      "POST /yona/api/v1/sites/users/member/toggle-site-admin",
      "POST /yona/api/v1/sites/users/member/toggle-account-lock",
      "POST /yona/api/v1/sites/users/member/toggle-guest-mode",
      "POST /yona/api/v1/sites/users/member/reset-password",
    ]);
  });

  it("uses DELETE for site-admin project delete REST mutations", async () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push(`${init?.method ?? ""} ${String(input)}`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    await deleteSiteProjectRest(runtimeConfig, "csrf", "7", fetchImpl);

    expect(requests).toEqual(["DELETE /yona/api/v1/sites/projects/7"]);
  });

  it("uses DELETE for site-admin user delete REST mutations", async () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push(`${init?.method ?? ""} ${String(input)}`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    await deleteSiteUserRest(runtimeConfig, "csrf", "2", fetchImpl);

    expect(requests).toEqual(["DELETE /yona/api/v1/sites/users/2"]);
  });

  it("uses POST for site-admin update unwatch REST mutations", async () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push(`${init?.method ?? ""} ${String(input)}`);
      return new Response(
        JSON.stringify({
          currentVersion: "0.1.0",
          hasUpdate: false,
          isWatched: false,
          releaseUrl: null,
          versionToUpdate: null,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    };

    await unwatchSiteUpdateRest(runtimeConfig, "csrf", fetchImpl);

    expect(requests).toEqual(["POST /yona/api/v1/sites/update/unwatch"]);
  });

  it("uses POST JSON for site-admin mail REST mutations", async () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const requests: string[] = [];
    const bodies: unknown[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push(`${init?.method ?? ""} ${String(input)}`);
      bodies.push(JSON.parse(String(init?.body ?? "{}")));
      return new Response(
        JSON.stringify({
          errorMessage: null,
          notConfiguredItems: [],
          sender: "site@example.com",
          sended: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    };

    await sendSiteMailRest(
      runtimeConfig,
      "csrf",
      {
        body: "Mail body",
        from: "sender@example.com",
        subject: "Subject",
        to: "recipient@example.com",
      },
      fetchImpl,
    );

    expect(requests).toEqual(["POST /yona/api/v1/sites/mail"]);
    expect(bodies).toEqual([
      {
        body: "Mail body",
        from: "sender@example.com",
        subject: "Subject",
        to: "recipient@example.com",
      },
    ]);
  });

  it("uses POST JSON for site-admin mass-mail recipient resolution", async () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const requests: string[] = [];
    const bodies: unknown[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push(`${init?.method ?? ""} ${String(input)}`);
      bodies.push(JSON.parse(String(init?.body ?? "{}")));
      return new Response(JSON.stringify({ emails: ["member@example.com"] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const response = await readSiteMassMailRecipientsRest(
      runtimeConfig,
      "csrf",
      {
        all: false,
        projects: ["admin/projectYobi"],
      },
      fetchImpl,
    );

    expect(response.emails).toEqual(["member@example.com"]);
    expect(requests).toEqual(["POST /yona/api/v1/sites/mail-list"]);
    expect(bodies).toEqual([{ all: false, projects: ["admin/projectYobi"] }]);
  });

  it("uses PATCH for board update REST mutations", async () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };
    const methods: string[] = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      methods.push(init?.method ?? "");
      return new Response(
        JSON.stringify({
          attachments: [],
          authorId: "1",
          authorLabel: "Owner",
          authorLoginId: "owner",
          bodyHtml: "<p>body</p>",
          bodyMarkdown: "body",
          commentCount: 0,
          comments: [],
          createdLabel: "now",
          id: "10",
          isWatching: false,
          labels: [],
          notice: false,
          ownerName: "owner",
          permissions: {
            canComment: true,
            canCreate: true,
            canDelete: true,
            canRead: true,
            canSetNotice: false,
            canUpdate: true,
            canWatch: true,
          },
          postNumber: "1",
          projectName: "projectYobi",
          readme: false,
          title: "Updated",
          updatedLabel: "now",
          watcherCount: 0,
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    };

    await updateProjectPostRest(
      runtimeConfig,
      "csrf",
      {
        bodyMarkdown: "body",
        labelIds: [],
        notice: false,
        ownerName: "owner",
        postNumber: 1,
        projectName: "projectYobi",
        readme: false,
        title: "Updated",
      },
      fetchImpl,
    );
    await updatePostCommentRest(
      runtimeConfig,
      "csrf",
      {
        commentId: 7,
        contentsMarkdown: "comment",
        ownerName: "owner",
        postNumber: 1,
        projectName: "projectYobi",
      },
      fetchImpl,
    );

    expect(methods).toEqual(["PATCH", "PATCH"]);
  });
});
