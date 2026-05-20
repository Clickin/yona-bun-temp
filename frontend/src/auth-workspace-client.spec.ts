import { describe, expect, it, vi } from "vitest";
import {
  acceptOrganizationEnrollment,
  addOrganizationMember,
  addWorkspaceEmail,
  cancelEnrollOrganization,
  cancelEnrollProject,
  changePassword,
  copyProjectLabels,
  createOrganization,
  createIssue,
  createIssueComment,
  createProject,
  createProjectLabel,
  deleteOrganization,
  deleteOrganizationMember,
  deleteIssue,
  deleteIssueComment,
  deleteWorkspaceEmail,
  enrollOrganization,
  enrollProject,
  leaveOrganization,
  listOrganizations,
  listOrganizationIssues,
  listProjects,
  listProjectIssues,
  listProjectMilestones,
  listUserIssues,
  massUpdateIssues,
  readWorkspaceOverview,
  readAuthUiCapabilities,
  readCodeBrowser,
  readCurrentSession,
  readIssueDetail,
  readOrganizationAdmin,
  readOrganizationContainer,
  readOrganizationDetail,
  readOrganizationMembers,
  readOrganizationSettings,
  readProjectContainer,
  readProjectDetail,
  readProjectMembers,
  readProjectSettings,
  readSessionBootstrap,
  recordRecentProjectVisit,
  registerWithPassword,
  resetApiToken,
  resetVisitedProjects,
  sendWorkspaceEmailValidation,
  setDefaultLandingPath,
  setMainWorkspaceEmail,
  shareIssue,
  signInWithPassword,
  signOut,
  listNotifications,
  searchIssueAssignableUsers,
  searchIssueMentionUsers,
  searchIssueSharableUsers,
  searchProjectAssignableUsers,
  searchProjectIssueReferences,
  toggleFavoriteProject,
  toggleProjectWatch,
  toggleWorkspaceNotification,
  updateOrganization,
  updateOrganizationMemberRole,
  updateProfile,
  updateProject,
  updateProjectOverview,
  updateIssue,
  updateIssueComment,
  updateIssueState,
  unshareIssue,
  uploadProfileAvatar,
  verifyUser,
  voteIssueComment,
  watchIssue,
} from "./auth-workspace-client";
import type { RuntimeConfig } from "./runtime-config";

const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
};

function okJsonResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(payload),
  };
}

describe("readSessionBootstrap", () => {
  it("calls the bootstrap route with credentials and reads csrf from the header", async () => {
    const fetchMock = vi.fn(async () => ({
      headers: new Headers({
        "x-csrf-token": "csrf-123",
      }),
      json: async () => ({
        session: null,
        user: null,
      }),
      ok: true,
      status: 200,
    }));

    const result = await readSessionBootstrap(runtimeConfig, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith("/yona/api/auth/session", {
      credentials: "include",
      method: "GET",
    });
    expect(result.csrfToken).toBe("csrf-123");
  });
});

describe("organization and project REST wrappers", () => {
  it("uses REST read endpoints for organization and project directory/detail flows", async () => {
    const fetchMock = vi.fn(async () => okJsonResponse({}));

    await listProjects(runtimeConfig, fetchMock as unknown as typeof fetch);
    await listOrganizations(runtimeConfig, fetchMock as unknown as typeof fetch);
    await readOrganizationDetail(runtimeConfig, "web labs", fetchMock as unknown as typeof fetch);
    await readOrganizationAdmin(runtimeConfig, "web labs", fetchMock as unknown as typeof fetch);
    await readOrganizationContainer(
      runtimeConfig,
      "web labs",
      fetchMock as unknown as typeof fetch,
    );
    await readOrganizationSettings(runtimeConfig, "web labs", fetchMock as unknown as typeof fetch);
    await readOrganizationMembers(runtimeConfig, "web labs", fetchMock as unknown as typeof fetch);
    await readProjectDetail(
      runtimeConfig,
      "owner space",
      "project/name",
      fetchMock as unknown as typeof fetch,
    );
    await readProjectContainer(
      runtimeConfig,
      "owner space",
      "project/name",
      fetchMock as unknown as typeof fetch,
    );
    await readProjectSettings(
      runtimeConfig,
      "owner space",
      "project/name",
      fetchMock as unknown as typeof fetch,
    );
    await readProjectMembers(
      runtimeConfig,
      "owner space",
      "project/name",
      fetchMock as unknown as typeof fetch,
    );

    const readCalls = fetchMock.mock.calls as unknown as Array<
      [string, { credentials: string; headers: Headers; method: string }]
    >;
    expect(readCalls.map(([url]) => url)).toEqual([
      "/yona/api/v1/projects",
      "/yona/api/v1/organizations",
      "/yona/api/v1/organizations/web%20labs",
      "/yona/api/v1/organizations/web%20labs/admin",
      "/yona/api/v1/organizations/web%20labs/container",
      "/yona/api/v1/organizations/web%20labs/settings",
      "/yona/api/v1/organizations/web%20labs/members",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname/container",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname/settings",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname/members",
    ]);
    for (const [, init] of readCalls) {
      expect(init.credentials).toBe("same-origin");
      expect(init.headers.get("Accept")).toBe("application/json");
      expect(init.method).toBe("GET");
    }
  });

  it("uses REST mutation endpoints for organization and project flows", async () => {
    const fetchMock = vi.fn(async () => okJsonResponse({ ok: true }));

    await createOrganization(
      runtimeConfig,
      "csrf-org-create",
      {
        description: "web labs",
        organizationName: "weblabs",
      },
      fetchMock as unknown as typeof fetch,
    );
    await updateOrganization(
      runtimeConfig,
      "csrf-org-update",
      {
        currentOrganizationName: "weblabs",
        description: "updated labs",
        organizationName: "weblabs",
      },
      fetchMock as unknown as typeof fetch,
    );
    await addOrganizationMember(
      runtimeConfig,
      "csrf-org-member",
      {
        loginId: "guest",
        organizationName: "weblabs",
      },
      fetchMock as unknown as typeof fetch,
    );
    await updateOrganizationMemberRole(
      runtimeConfig,
      "csrf-org-role",
      {
        organizationName: "weblabs",
        role: "org_admin",
        userId: 7n,
      },
      fetchMock as unknown as typeof fetch,
    );
    await deleteOrganizationMember(
      runtimeConfig,
      "csrf-org-delete-member",
      {
        organizationName: "weblabs",
        userId: 7n,
      },
      fetchMock as unknown as typeof fetch,
    );
    await acceptOrganizationEnrollment(
      runtimeConfig,
      "csrf-org-accept",
      {
        organizationName: "weblabs",
        userId: 9n,
      },
      fetchMock as unknown as typeof fetch,
    );
    await enrollOrganization(
      runtimeConfig,
      "csrf-org-enroll",
      "weblabs",
      fetchMock as unknown as typeof fetch,
    );
    await cancelEnrollOrganization(
      runtimeConfig,
      "csrf-org-cancel",
      "weblabs",
      fetchMock as unknown as typeof fetch,
    );
    await leaveOrganization(
      runtimeConfig,
      "csrf-org-leave",
      "weblabs",
      fetchMock as unknown as typeof fetch,
    );
    await deleteOrganization(
      runtimeConfig,
      "csrf-org-delete",
      "weblabs",
      fetchMock as unknown as typeof fetch,
    );
    await createProject(
      runtimeConfig,
      "csrf-project-create",
      {
        board: true,
        code: false,
        issue: true,
        milestone: false,
        ownerName: "owner space",
        overview: "project overview",
        pullRequest: false,
        projectName: "project/name",
        projectScope: "public",
        review: false,
      },
      fetchMock as unknown as typeof fetch,
    );
    await updateProject(
      runtimeConfig,
      "csrf-project-update",
      {
        board: false,
        code: true,
        currentOwnerName: "owner space",
        currentProjectName: "project/name",
        issue: false,
        milestone: true,
        ownerName: "owner space",
        overview: "updated overview",
        pullRequest: true,
        projectName: "project/name",
        projectScope: "private",
        review: true,
      },
      fetchMock as unknown as typeof fetch,
    );
    await updateProjectOverview(
      runtimeConfig,
      "csrf-project-overview",
      {
        ownerName: "owner space",
        overview: "overview only",
        projectName: "project/name",
      },
      fetchMock as unknown as typeof fetch,
    );
    await enrollProject(
      runtimeConfig,
      "csrf-project-enroll",
      "owner space",
      "project/name",
      fetchMock as unknown as typeof fetch,
    );
    await cancelEnrollProject(
      runtimeConfig,
      "csrf-project-cancel",
      "owner space",
      "project/name",
      fetchMock as unknown as typeof fetch,
    );
    await toggleFavoriteProject(
      runtimeConfig,
      "csrf-project-favorite",
      "owner space",
      "project/name",
      fetchMock as unknown as typeof fetch,
    );
    await toggleProjectWatch(
      runtimeConfig,
      "csrf-project-watch",
      "owner space",
      "project/name",
      true,
      fetchMock as unknown as typeof fetch,
    );
    await toggleProjectWatch(
      runtimeConfig,
      "csrf-project-unwatch",
      "owner space",
      "project/name",
      false,
      fetchMock as unknown as typeof fetch,
    );

    const mutationCalls = fetchMock.mock.calls as unknown as Array<
      [string, { body?: string; credentials: string; headers: Headers; method: string }]
    >;
    expect(mutationCalls.map(([url]) => url)).toEqual([
      "/yona/api/v1/organizations",
      "/yona/api/v1/organizations/weblabs",
      "/yona/api/v1/organizations/weblabs/members",
      "/yona/api/v1/organizations/weblabs/members/7",
      "/yona/api/v1/organizations/weblabs/members/7",
      "/yona/api/v1/organizations/weblabs/enrollments/9/accept",
      "/yona/api/v1/organizations/weblabs/enroll",
      "/yona/api/v1/organizations/weblabs/enroll",
      "/yona/api/v1/organizations/weblabs/leave",
      "/yona/api/v1/organizations/weblabs",
      "/yona/api/v1/owners/owner%20space/projects",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname/overview",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname/enroll",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname/enroll",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname/favorite",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname/watch",
      "/yona/api/v1/owners/owner%20space/projects/project%2Fname/watch",
    ]);
    expect(mutationCalls.map(([, init]) => init.method)).toEqual([
      "POST",
      "PATCH",
      "POST",
      "PATCH",
      "DELETE",
      "POST",
      "POST",
      "DELETE",
      "POST",
      "DELETE",
      "POST",
      "PATCH",
      "PATCH",
      "POST",
      "DELETE",
      "POST",
      "POST",
      "DELETE",
    ]);

    const createOrgCall = mutationCalls[0]!;
    expect(createOrgCall[1].headers.get("x-csrf-token")).toBe("csrf-org-create");
    expect(JSON.parse(createOrgCall[1].body ?? "")).toEqual({
      description: "web labs",
      organizationName: "weblabs",
    });

    const updateOrgCall = mutationCalls[1]!;
    expect(JSON.parse(updateOrgCall[1].body ?? "")).toEqual({
      description: "updated labs",
      organizationName: "weblabs",
    });

    const addMemberCall = mutationCalls[2]!;
    expect(JSON.parse(addMemberCall[1].body ?? "")).toEqual({
      loginId: "guest",
    });

    const updateRoleCall = mutationCalls[3]!;
    expect(JSON.parse(updateRoleCall[1].body ?? "")).toEqual({
      role: "org_admin",
    });

    expect(mutationCalls[4]![1].body).toBeUndefined();
    expect(mutationCalls[5]![1].body).toBeUndefined();
    expect(mutationCalls[6]![1].body).toBeUndefined();
    expect(mutationCalls[7]![1].body).toBeUndefined();
    expect(mutationCalls[8]![1].body).toBeUndefined();
    expect(mutationCalls[9]![1].body).toBeUndefined();

    const createProjectCall = mutationCalls[10]!;
    expect(JSON.parse(createProjectCall[1].body ?? "")).toEqual({
      board: true,
      code: false,
      issue: true,
      milestone: false,
      overview: "project overview",
      pullRequest: false,
      projectName: "project/name",
      projectScope: "public",
      review: false,
    });

    const updateProjectCall = mutationCalls[11]!;
    expect(JSON.parse(updateProjectCall[1].body ?? "")).toEqual({
      board: false,
      code: true,
      issue: false,
      milestone: true,
      overview: "updated overview",
      pullRequest: true,
      projectName: "project/name",
      projectScope: "private",
      review: true,
    });

    const updateOverviewCall = mutationCalls[12]!;
    expect(JSON.parse(updateOverviewCall[1].body ?? "")).toEqual({
      overview: "overview only",
    });

    expect(mutationCalls[13]![1].body).toBeUndefined();
    expect(mutationCalls[14]![1].body).toBeUndefined();
    expect(mutationCalls[15]![1].body).toBeUndefined();
    expect(mutationCalls[16]![1].body).toBeUndefined();
    expect(mutationCalls[17]![1].body).toBeUndefined();

    for (const [, init] of mutationCalls) {
      expect(init.credentials).toBe("same-origin");
      expect(init.headers.get("Accept")).toBe("application/json");
      expect(init.headers.get("x-csrf-token")).toMatch(/^csrf-/);
    }
  });
});

describe("readCurrentSession", () => {
  it("reads the REST v1 session endpoint with same-origin credentials", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          defaultLandingPath: "/me",
          isAnonymous: true,
        }),
    }));

    const result = await readCurrentSession(runtimeConfig, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/session");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("Accept")).toBe("application/json");
    expect(requestInit.method).toBe("GET");
    expect(result.isAnonymous).toBe(true);
    expect(result.defaultLandingPath).toBe("/me");
  });

  it("throws the REST error envelope for failed v1 requests", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          error: {
            code: "not_found",
            message: "REST endpoint not found.",
            status: 404,
          },
        }),
    }));

    await expect(
      readCurrentSession(runtimeConfig, fetchMock as unknown as typeof fetch),
    ).rejects.toMatchObject({
      code: "not_found",
      message: "REST endpoint not found.",
      status: 404,
    });
  });
});

describe("readCodeBrowser", () => {
  it("reads the REST v1 code browser endpoint with encoded branch and path query params", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          branches: [{ name: "main" }],
          breadcrumbs: [{ name: "src", path: "src" }],
          entries: [],
          noHead: false,
          ownerName: "owner",
          path: "src/main.rs",
          projectName: "projectYobi",
          selectedBranch: "main",
        }),
    }));

    const result = await readCodeBrowser(
      runtimeConfig,
      "owner",
      "projectYobi",
      {
        branch: "feature/main",
        path: "src/main.rs",
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe(
      "/yona/api/v1/projects/owner/projectYobi/code?branch=feature%2Fmain&path=src%2Fmain.rs",
    );
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("Accept")).toBe("application/json");
    expect(requestInit.method).toBe("GET");
    expect(result.selectedBranch).toBe("main");
    expect(result.path).toBe("src/main.rs");
  });
});

describe("workspace REST clients", () => {
  it("reads workspace overview from the v1 workspace endpoint", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ defaultLandingPath: "/me", loginId: "door" }),
    }));

    const result = await readWorkspaceOverview(runtimeConfig, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/workspace");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("Accept")).toBe("application/json");
    expect(requestInit.method).toBe("GET");
    expect(result.defaultLandingPath).toBe("/me");
  });

  it("normalizes sparse workspace overview arrays omitted by REST JSON", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
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
    }));

    const result = await readWorkspaceOverview(runtimeConfig, fetchMock as unknown as typeof fetch);

    expect(result.emails).toEqual([]);
    expect(result.favoriteProjects).toEqual([]);
    expect(result.issueItems).toEqual([]);
    expect(result.memberProjects).toEqual([]);
    expect(result.pullRequestItems).toEqual([]);
    expect(result.recentProjects).toEqual([]);
    expect(result.watchedProjects[0]?.notifications).toEqual([]);
    expect(result.profile?.avatarUrl).toBe("");
    expect(result.profile?.connectedSocialProviders).toEqual([]);
    expect(result.profile?.englishName).toBe("");
    expect(result.profile?.primaryEmailAddress).toBe("");
  });

  it("routes workspace settings mutations through REST v1 endpoints", async () => {
    const fetchMock = vi.fn(async () => okJsonResponse({ ok: true }));

    await setDefaultLandingPath(
      runtimeConfig,
      "csrf-1",
      "/search?scope=global&pageSize=20",
      fetchMock as unknown as typeof fetch,
    );
    await updateProfile(
      runtimeConfig,
      "csrf-2",
      {
        avatarAttachmentId: "55",
        email: "door@example.com",
        name: "Door",
      },
      fetchMock as unknown as typeof fetch,
    );
    await changePassword(
      runtimeConfig,
      "csrf-3",
      {
        loginId: "door",
        oldPassword: "doorpass1",
        password: "doorpass2",
        retypedPassword: "doorpass2",
      },
      fetchMock as unknown as typeof fetch,
    );
    await resetVisitedProjects(runtimeConfig, "csrf-4", fetchMock as unknown as typeof fetch);
    await addWorkspaceEmail(
      runtimeConfig,
      "csrf-5",
      "alt@example.com",
      fetchMock as unknown as typeof fetch,
    );
    await deleteWorkspaceEmail(runtimeConfig, "csrf-6", "7", fetchMock as unknown as typeof fetch);
    await sendWorkspaceEmailValidation(
      runtimeConfig,
      "csrf-7",
      "7",
      fetchMock as unknown as typeof fetch,
    );
    await setMainWorkspaceEmail(runtimeConfig, "csrf-8", "7", fetchMock as unknown as typeof fetch);
    await resetApiToken(runtimeConfig, "csrf-9", fetchMock as unknown as typeof fetch);
    await toggleWorkspaceNotification(
      runtimeConfig,
      "csrf-10",
      "13",
      "NEW_COMMENT",
      fetchMock as unknown as typeof fetch,
    );

    const calls = fetchMock.mock.calls as unknown as Array<
      [string, { body?: string; credentials: string; headers: Headers; method: string }]
    >;
    expect(calls[0]![0]).toBe("/yona/api/v1/workspace/default-landing-path");
    expect(calls[0]![1].method).toBe("PUT");
    expect(JSON.parse(calls[0]![1].body ?? "")).toEqual({
      path: "/search?scope=global&pageSize=20",
    });

    expect(calls[1]![0]).toBe("/yona/api/v1/workspace/profile");
    expect(calls[1]![1].method).toBe("PATCH");
    expect(JSON.parse(calls[1]![1].body ?? "")).toEqual({
      avatarAttachmentId: "55",
      email: "door@example.com",
      name: "Door",
    });

    expect(calls[2]![0]).toBe("/yona/api/v1/workspace/password");
    expect(calls[2]![1].method).toBe("POST");
    expect(JSON.parse(calls[2]![1].body ?? "")).toEqual({
      loginId: "door",
      oldPassword: "doorpass1",
      password: "doorpass2",
      retypedPassword: "doorpass2",
    });

    expect(calls[3]![0]).toBe("/yona/api/v1/workspace/recent-projects");
    expect(calls[3]![1].method).toBe("DELETE");
    expect(calls[4]![0]).toBe("/yona/api/v1/workspace/emails");
    expect(calls[4]![1].method).toBe("POST");
    expect(JSON.parse(calls[4]![1].body ?? "")).toEqual({ email: "alt@example.com" });
    expect(calls[5]![0]).toBe("/yona/api/v1/workspace/emails/7");
    expect(calls[5]![1].method).toBe("DELETE");
    expect(calls[6]![0]).toBe("/yona/api/v1/workspace/emails/7/validation");
    expect(calls[6]![1].method).toBe("POST");
    expect(calls[7]![0]).toBe("/yona/api/v1/workspace/emails/7/main");
    expect(calls[7]![1].method).toBe("POST");
    expect(calls[8]![0]).toBe("/yona/api/v1/workspace/api-token/reset");
    expect(calls[8]![1].method).toBe("POST");
    expect(calls[9]![0]).toBe("/yona/api/v1/workspace/notifications");
    expect(calls[9]![1].method).toBe("POST");
    expect(JSON.parse(calls[9]![1].body ?? "")).toEqual({
      eventType: "NEW_COMMENT",
      projectId: "13",
    });

    for (const [, requestInit] of calls) {
      expect(requestInit.credentials).toBe("same-origin");
      expect(requestInit.headers.get("Accept")).toBe("application/json");
      expect(requestInit.headers.get("x-csrf-token")).toMatch(/^csrf-/);
    }
  });

  it("posts recent project visits to the REST v1 workspace endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        ownerName: "owner",
        projectName: "projectYobi",
      }),
    );

    const result = await recordRecentProjectVisit(
      runtimeConfig,
      "csrf-11",
      "owner",
      "projectYobi",
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/workspace/recent-projects");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.headers.get("x-csrf-token")).toBe("csrf-11");
    expect(JSON.parse(requestInit.body)).toEqual({
      ownerName: "owner",
      projectName: "projectYobi",
    });
    expect(result.ownerName).toBe("owner");
    expect(result.projectName).toBe("projectYobi");
  });
});

describe("issue assignable user REST client", () => {
  it("encodes assignable-user search queries and normalizes sparse responses", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        items: [
          {
            loginId: "door",
          },
        ],
      }),
    );

    const result = await searchIssueAssignableUsers(
      runtimeConfig,
      {
        issueNumber: 7n,
        ownerName: "owner space",
        projectName: "project/Yobi",
        query: "Door Name",
        type: "name",
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe(
      "/yona/api/v1/owners/owner%20space/projects/project%2FYobi/issues/7/assignable-users?query=Door+Name&type=name",
    );
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("Accept")).toBe("application/json");
    expect(requestInit.method).toBe("GET");
    expect(result).toEqual({
      items: [
        {
          avatarUrl: "",
          displayName: "",
          loginId: "door",
          pureNameOnly: "",
          type: "user",
        },
      ],
      total: 1,
      truncated: false,
    });
  });

  it("encodes sharable-user search queries and normalizes sparse responses", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        items: [
          {
            loginId: "guest",
          },
          {
            displayName: "owner/publicProject",
            loginId: "42",
            type: "project",
          },
        ],
      }),
    );

    const result = await searchIssueSharableUsers(
      runtimeConfig,
      {
        issueNumber: 7n,
        ownerName: "owner space",
        projectName: "project/Yobi",
        query: "Guest Name",
        type: "name",
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe(
      "/yona/api/v1/owners/owner%20space/projects/project%2FYobi/issues/7/sharable-users?query=Guest+Name&type=name",
    );
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("Accept")).toBe("application/json");
    expect(requestInit.method).toBe("GET");
    expect(result).toEqual({
      items: [
        {
          avatarUrl: "",
          displayName: "",
          loginId: "guest",
          pureNameOnly: "",
          type: "user",
        },
        {
          avatarUrl: "",
          displayName: "owner/publicProject",
          loginId: "42",
          pureNameOnly: "",
          type: "project",
        },
      ],
      total: 2,
      truncated: false,
    });
  });

  it("sends optional project target type for issue share mutations", async () => {
    const fetchMock = vi.fn(async () => okJsonResponse({}));

    await shareIssue(
      runtimeConfig,
      "csrf-share",
      {
        issueNumber: 7n,
        loginId: "42",
        ownerName: "owner",
        projectName: "projectYobi",
        targetType: "project",
      },
      fetchMock as unknown as typeof fetch,
    );
    await unshareIssue(
      runtimeConfig,
      "csrf-unshare",
      {
        issueNumber: 7n,
        loginId: "42",
        ownerName: "owner",
        projectName: "projectYobi",
        targetType: "project",
      },
      fetchMock as unknown as typeof fetch,
    );

    const calls = fetchMock.mock.calls as unknown as Array<
      [string, { body?: string; headers: Headers; method: string }]
    >;
    expect(calls[0]![0]).toBe("/yona/api/v1/owners/owner/projects/projectYobi/issues/7/sharers");
    expect(calls[0]![1].method).toBe("POST");
    expect(calls[0]![1].headers.get("x-csrf-token")).toBe("csrf-share");
    expect(JSON.parse(calls[0]![1].body ?? "")).toEqual({
      loginId: "42",
      targetType: "project",
    });
    expect(calls[1]![0]).toBe(
      "/yona/api/v1/owners/owner/projects/projectYobi/issues/7/sharers/42?targetType=project",
    );
    expect(calls[1]![1].method).toBe("DELETE");
    expect(calls[1]![1].headers.get("x-csrf-token")).toBe("csrf-unshare");
  });

  it("lists notification inbox items with paging query params", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        hasMore: true,
        items: [
          {
            actor: { displayName: "Owner", loginId: "owner" },
            eventType: "ISSUE_SHARER_CHANGED",
            id: "5",
            message: "Issue is shared with guest",
            targetHref: "/yona/owner/projectYobi/issue/1",
            targetTitle: "Private issue",
          },
        ],
        total: 12,
      }),
    );

    const result = await listNotifications(
      runtimeConfig,
      { from: 20, size: 10 },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/notifications?from=20&size=10");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.method).toBe("GET");
    expect(result).toEqual({
      hasMore: true,
      items: [
        {
          actor: {
            avatarUrl: "",
            displayName: "Owner",
            loginId: "owner",
          },
          createdAt: "",
          createdLabel: "",
          eventType: "ISSUE_SHARER_CHANGED",
          id: "5",
          message: "Issue is shared with guest",
          targetHref: "/yona/owner/projectYobi/issue/1",
          targetTitle: "Private issue",
          typeIcon: "megaphone",
        },
      ],
      total: 12,
    });
  });

  it("encodes issue mention search context and normalizes sparse responses", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        items: [
          {
            displayName: "Project Yobi",
            loginId: "owner/projectYobi",
            type: "project",
          },
        ],
        truncated: true,
      }),
    );

    const result = await searchIssueMentionUsers(
      runtimeConfig,
      {
        context: "issue-comment",
        issueNumber: 9n,
        ownerName: "owner space",
        projectName: "project/Yobi",
        query: "owner/project",
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe(
      "/yona/api/v1/owners/owner%20space/projects/project%2FYobi/issues/9/mention-users?query=owner%2Fproject&context=issue-comment",
    );
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("Accept")).toBe("application/json");
    expect(requestInit.method).toBe("GET");
    expect(result).toEqual({
      items: [
        {
          avatarUrl: "",
          displayName: "Project Yobi",
          loginId: "owner/projectYobi",
          searchText: "",
          type: "project",
        },
      ],
      total: 1,
      truncated: true,
    });
  });

  it("encodes project issue-reference search and normalizes sparse responses", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        items: [
          {
            issueNumber: 12,
            title: "Referenced issue",
          },
        ],
        truncated: true,
      }),
    );

    const result = await searchProjectIssueReferences(
      runtimeConfig,
      {
        ownerName: "owner space",
        projectName: "project/Yobi",
        query: "#12 title",
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe(
      "/yona/api/v1/owners/owner%20space/projects/project%2FYobi/issue-references?query=%2312+title",
    );
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("Accept")).toBe("application/json");
    expect(requestInit.method).toBe("GET");
    expect(result).toEqual({
      items: [
        {
          issueNumber: 12,
          state: "",
          title: "Referenced issue",
        },
      ],
      total: 1,
      truncated: true,
    });
  });

  it("encodes project assignable-user search queries separately from issue-scoped search", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        items: [
          {
            displayName: "Door User",
            loginId: "door",
          },
        ],
        total: 12,
        truncated: true,
      }),
    );

    const result = await searchProjectAssignableUsers(
      runtimeConfig,
      {
        ownerName: "owner space",
        projectName: "project/Yobi",
        query: "Door Name",
        type: "name",
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe(
      "/yona/api/v1/owners/owner%20space/projects/project%2FYobi/assignable-users?query=Door+Name&type=name",
    );
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("Accept")).toBe("application/json");
    expect(requestInit.method).toBe("GET");
    expect(result).toEqual({
      items: [
        {
          avatarUrl: "",
          displayName: "Door User",
          loginId: "door",
          pureNameOnly: "",
          type: "user",
        },
      ],
      total: 12,
      truncated: true,
    });
  });
});

describe("REST auth wrappers", () => {
  it("reads auth capabilities from the v1 REST endpoint", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          emailVerificationEnabled: true,
          loginIdPlaceholder: "Use employee number",
          passwordPlaceholder: "Company password",
          signupRequireConfirm: false,
          socialLoginOnly: false,
        }),
    }));

    const result = await readAuthUiCapabilities(
      runtimeConfig,
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/auth/capabilities");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.method).toBe("GET");
    expect(result.emailVerificationEnabled).toBe(true);
    expect(result.loginIdPlaceholder).toBe("Use employee number");
    expect(result.passwordPlaceholder).toBe("Company password");
  });

  it("posts sign-in payloads with csrf headers to the v1 REST endpoint", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ isAnonymous: false, loginId: "door" }),
    }));

    const result = await signInWithPassword(
      runtimeConfig,
      "csrf-123",
      {
        identifier: "door",
        password: "doorpass1",
        rememberMe: true,
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/auth/sign-in");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("x-csrf-token")).toBe("csrf-123");
    expect(requestInit.headers.get("Content-Type")).toBe("application/json");
    expect(requestInit.method).toBe("POST");
    expect(JSON.parse(requestInit.body)).toEqual({
      identifier: "door",
      password: "doorpass1",
      rememberMe: true,
    });
    expect(result.loginId).toBe("door");
  });

  it("posts register and verify payloads to the v1 REST auth routes", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ isAnonymous: true }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ loginId: "door" }),
      }));

    await registerWithPassword(
      runtimeConfig,
      "csrf-456",
      {
        emailAddress: "door@example.com",
        loginId: "door",
        name: "Door",
        password: "doorpass1",
        retypedPassword: "doorpass1",
      },
      fetchMock as unknown as typeof fetch,
    );
    await verifyUser(
      runtimeConfig,
      {
        loginId: "door",
        verificationCode: "signup:token",
      },
      fetchMock as unknown as typeof fetch,
    );

    const [registerUrl, registerInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; headers: Headers; method: string },
    ];
    expect(registerUrl).toBe("/yona/api/v1/auth/register");
    expect(registerInit.headers.get("x-csrf-token")).toBe("csrf-456");
    expect(registerInit.method).toBe("POST");

    const [verifyUrl, verifyInit] = fetchMock.mock.calls[1] as unknown as [
      string,
      { body: string; headers: Headers; method: string },
    ];
    expect(verifyUrl).toBe("/yona/api/v1/auth/verify");
    expect(verifyInit.method).toBe("POST");
    expect(JSON.parse(verifyInit.body)).toEqual({
      loginId: "door",
      verificationCode: "signup:token",
    });
  });

  it("posts sign-out to the v1 REST auth route without a JSON body", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ isAnonymous: true }),
    }));

    const result = await signOut(runtimeConfig, "csrf-789", fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body?: string; credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/auth/sign-out");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("x-csrf-token")).toBe("csrf-789");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.body).toBeUndefined();
    expect(result.isAnonymous).toBe(true);
  });
});

describe("issue metadata REST clients", () => {
  it("posts watchIssue and voteIssueComment to owner/project v1 endpoints with csrf", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        issueNumber: "7",
      }),
    );

    await watchIssue(
      runtimeConfig,
      "csrf-watch",
      {
        issueNumber: 7n,
        ownerName: "owner",
        projectName: "projectYobi",
      },
      fetchMock as unknown as typeof fetch,
    );
    await voteIssueComment(
      runtimeConfig,
      "csrf-vote",
      {
        commentId: 11n,
        issueNumber: 7n,
        ownerName: "owner",
        projectName: "projectYobi",
      },
      fetchMock as unknown as typeof fetch,
    );

    const calls = fetchMock.mock.calls as unknown as Array<
      [string, { credentials: string; headers: Headers; method: string }]
    >;
    expect(calls[0]![0]).toBe("/yona/api/v1/owners/owner/projects/projectYobi/issues/7/watch");
    expect(calls[0]![1].headers.get("x-csrf-token")).toBe("csrf-watch");
    expect(calls[0]![1].method).toBe("POST");
    expect(calls[1]![0]).toBe(
      "/yona/api/v1/owners/owner/projects/projectYobi/issues/7/comments/11/vote",
    );
    expect(calls[1]![1].headers.get("x-csrf-token")).toBe("csrf-vote");
    expect(calls[1]![1].method).toBe("POST");
  });

  it("posts createProjectLabel to the v1 labels endpoint with a json body", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        created: true,
        label: { id: "3", name: "Bug" },
      }),
    );

    await createProjectLabel(
      runtimeConfig,
      "csrf-label",
      {
        categoryIsExclusive: false,
        categoryName: "Type",
        labelColor: "#f44336",
        labelName: "Bug",
        ownerName: "owner",
        projectName: "projectYobi",
      },
      fetchMock as unknown as typeof fetch,
    );

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/owners/owner/projects/projectYobi/labels");
    expect(requestInit.headers.get("x-csrf-token")).toBe("csrf-label");
    expect(requestInit.method).toBe("POST");
    expect(JSON.parse(requestInit.body)).toEqual({
      categoryIsExclusive: false,
      categoryName: "Type",
      labelColor: "#f44336",
      labelName: "Bug",
    });
  });

  it("posts copyProjectLabels to the v1 label copy endpoint with source project fields", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        copied: 1,
        labels: [],
        skipped: 0,
      }),
    );

    const result = await copyProjectLabels(
      runtimeConfig,
      "csrf-label-copy",
      {
        fromOwnerName: "source",
        fromProjectName: "template",
        ownerName: "owner",
        projectName: "projectYobi",
      },
      fetchMock as unknown as typeof fetch,
    );

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/owners/owner/projects/projectYobi/labels/copy");
    expect(requestInit.headers.get("x-csrf-token")).toBe("csrf-label-copy");
    expect(requestInit.method).toBe("POST");
    expect(JSON.parse(requestInit.body)).toEqual({
      fromOwnerName: "source",
      fromProjectName: "template",
    });
    expect(result.copied).toBe(1);
  });

  it("reads listProjectMilestones from the v1 milestones endpoint with query params", async () => {
    const fetchMock = vi.fn(async () => okJsonResponse({ milestones: [] }));

    const result = await listProjectMilestones(
      runtimeConfig,
      "owner",
      "projectYobi",
      {
        orderBy: "dueDate",
        orderDir: "desc",
        state: "closed",
      },
      fetchMock as unknown as typeof fetch,
    );

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe(
      "/yona/api/v1/owners/owner/projects/projectYobi/milestones?orderBy=dueDate&orderDir=desc&state=closed",
    );
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.method).toBe("GET");
    expect(result.milestones).toEqual([]);
  });
});

describe("uploadProfileAvatar", () => {
  it("posts the cropped avatar blob to /files and returns the attachment id", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        attachmentId: "avatar-attachment-1",
      }),
      ok: true,
      status: 200,
    }));
    const blob = new Blob(["avatar-bytes"], { type: "image/png" });

    const attachmentId = await uploadProfileAvatar(
      runtimeConfig,
      "avatar.png",
      blob,
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: FormData; credentials: string; method: string },
    ];
    expect(requestUrl).toBe("/yona/files");
    expect(requestInit.credentials).toBe("include");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.body).toBeInstanceOf(FormData);
    expect(attachmentId).toBe("avatar-attachment-1");
  });
});

describe("issue REST clients", () => {
  it("routes project, organization, user, and detail reads through /api/v1", async () => {
    const fetchMock = vi.fn(async () => okJsonResponse({ items: [] }));

    await listProjectIssues(
      runtimeConfig,
      "owner space",
      "project/name",
      {
        assigneeLoginId: "guest",
        authorLoginId: "owner",
        labelIds: [1n, 2],
        milestoneId: 3n,
        pageNum: 2,
        state: "open",
      },
      fetchMock as unknown as typeof fetch,
    );
    await listOrganizationIssues(
      runtimeConfig,
      "web labs",
      {
        assigneeId: 9,
        authorId: 7,
        filter: "all",
        itemsPerPage: 20,
        orderBy: "updatedDate",
        orderDir: "desc",
        pageNum: 3,
        projectNames: ["alpha", "beta"],
        state: "closed",
      },
      fetchMock as unknown as typeof fetch,
    );
    await listUserIssues(
      runtimeConfig,
      {
        filter: "assigned",
        orderBy: "updatedDate",
        orderDir: "desc",
        pageNum: 4,
        pageSize: 15,
        query: "pilot",
        state: "open",
      },
      fetchMock as unknown as typeof fetch,
    );
    await readIssueDetail(
      runtimeConfig,
      "owner space",
      "project/name",
      11n,
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const readCalls = fetchMock.mock.calls as unknown as Array<
      [string, { credentials: string; headers: Headers; method: string }]
    >;
    expect(readCalls[0]![0]).toBe(
      "/yona/api/v1/projects/owner%20space/project%2Fname/issues?assigneeLoginId=guest&authorLoginId=owner&labelIds=1&labelIds=2&milestoneId=3&pageNum=2&state=open",
    );
    expect(readCalls[1]![0]).toBe(
      "/yona/api/v1/organizations/web%20labs/issues?assigneeId=9&authorId=7&filter=all&itemsPerPage=20&orderBy=updatedDate&orderDir=desc&pageNum=3&projectNames=alpha&projectNames=beta&state=closed",
    );
    expect(readCalls[2]![0]).toBe(
      "/yona/api/v1/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&pageNum=4&pageSize=15&query=pilot&state=open",
    );
    expect(readCalls[3]![0]).toBe("/yona/api/v1/projects/owner%20space/project%2Fname/issues/11");
    for (const [, requestInit] of readCalls) {
      expect(requestInit.credentials).toBe("same-origin");
      expect(requestInit.headers.get("Accept")).toBe("application/json");
    }
  });

  it("sends issue mutation payloads to REST endpoints with csrf and bigint-safe JSON", async () => {
    const fetchMock = vi.fn(async () =>
      okJsonResponse({
        issueNumber: "1",
      }),
    );

    await createIssue(
      runtimeConfig,
      "csrf-1",
      {
        assigneeLoginId: "guest",
        attachmentIds: [5n],
        bodyMarkdown: "body",
        labelIds: [7n],
        milestoneId: 3n,
        ownerName: "owner",
        projectName: "projectYobi",
        title: "New issue",
      },
      fetchMock as unknown as typeof fetch,
    );
    await updateIssueState(
      runtimeConfig,
      "csrf-2",
      {
        issueNumber: 1n,
        ownerName: "owner",
        projectName: "projectYobi",
        state: "closed",
      },
      fetchMock as unknown as typeof fetch,
    );
    await updateIssue(
      runtimeConfig,
      "csrf-3",
      {
        bodyMarkdown: "updated",
        issueNumber: 2n,
        ownerName: "owner",
        projectName: "projectYobi",
        title: "Updated issue",
      },
      fetchMock as unknown as typeof fetch,
    );
    await createIssueComment(
      runtimeConfig,
      "csrf-4",
      {
        attachmentIds: [9n],
        contentsMarkdown: "comment",
        issueNumber: 2n,
        ownerName: "owner",
        projectName: "projectYobi",
      },
      fetchMock as unknown as typeof fetch,
    );
    await updateIssueComment(
      runtimeConfig,
      "csrf-5",
      {
        commentId: 4n,
        contentsMarkdown: "edited",
        issueNumber: 2n,
        ownerName: "owner",
        projectName: "projectYobi",
      },
      fetchMock as unknown as typeof fetch,
    );
    await massUpdateIssues(
      runtimeConfig,
      "csrf-6",
      {
        issueNumbers: [1n, 2n],
        milestoneId: 6n,
        ownerName: "owner",
        projectName: "projectYobi",
        state: "closed",
      },
      fetchMock as unknown as typeof fetch,
    );

    const createCall = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; credentials: string; headers: Headers; method: string },
    ];
    expect(createCall[0]).toBe("/yona/api/v1/projects/owner/projectYobi/issues");
    expect(createCall[1].method).toBe("POST");
    expect(createCall[1].headers.get("x-csrf-token")).toBe("csrf-1");
    expect(JSON.parse(createCall[1].body)).toEqual({
      assigneeLoginId: "guest",
      attachmentIds: ["5"],
      bodyMarkdown: "body",
      labelIds: ["7"],
      milestoneId: "3",
      title: "New issue",
    });

    const stateCall = fetchMock.mock.calls[1] as unknown as [
      string,
      { body: string; headers: Headers; method: string },
    ];
    expect(stateCall[0]).toBe("/yona/api/v1/projects/owner/projectYobi/issues/1/state");
    expect(stateCall[1].method).toBe("PUT");
    expect(JSON.parse(stateCall[1].body)).toEqual({ state: "closed" });

    const updateCommentCall = fetchMock.mock.calls[4] as unknown as [
      string,
      { body: string; method: string },
    ];
    expect(updateCommentCall[0]).toBe(
      "/yona/api/v1/projects/owner/projectYobi/issues/2/comments/4",
    );
    expect(updateCommentCall[1].method).toBe("PUT");
    expect(JSON.parse(updateCommentCall[1].body)).toEqual({
      attachmentIds: [],
      contentsMarkdown: "edited",
    });

    const massUpdateCall = fetchMock.mock.calls[5] as unknown as [
      string,
      { body: string; method: string },
    ];
    expect(massUpdateCall[0]).toBe("/yona/api/v1/projects/owner/projectYobi/issues/mass-update");
    expect(massUpdateCall[1].method).toBe("POST");
    expect(JSON.parse(massUpdateCall[1].body)).toEqual({
      addLabelIds: [],
      assigneeLoginId: "",
      assigneeUpdate: false,
      issueNumbers: ["1", "2"],
      milestoneId: "6",
      milestoneUpdate: false,
      removeLabelIds: [],
      state: "closed",
    });
  });

  it("uses REST delete endpoints for issues and comments", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "",
    }));

    await deleteIssue(
      runtimeConfig,
      "csrf-7",
      {
        issueNumber: 5n,
        ownerName: "owner",
        projectName: "projectYobi",
      },
      fetchMock as unknown as typeof fetch,
    );
    await deleteIssueComment(
      runtimeConfig,
      "csrf-8",
      {
        commentId: 8n,
        issueNumber: 5n,
        ownerName: "owner",
        projectName: "projectYobi",
      },
      fetchMock as unknown as typeof fetch,
    );

    const deleteCalls = fetchMock.mock.calls as unknown as Array<[string, { method: string }]>;
    expect(deleteCalls[0]![0]).toBe("/yona/api/v1/projects/owner/projectYobi/issues/5");
    expect(deleteCalls[1]![0]).toBe("/yona/api/v1/projects/owner/projectYobi/issues/5/comments/8");
    expect(deleteCalls[0]![1].method).toBe("DELETE");
    expect(deleteCalls[1]![1].method).toBe("DELETE");
  });
});
