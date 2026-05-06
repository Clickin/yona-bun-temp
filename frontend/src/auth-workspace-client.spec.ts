import { describe, expect, it, vi } from "vitest";
import {
  createIssue,
  createIssueComment,
  deleteIssue,
  deleteIssueComment,
  listOrganizationIssues,
  listProjectIssues,
  listUserIssues,
  massUpdateIssues,
  readCurrentSession,
  readIssueDetail,
  readSessionBootstrap,
  updateIssue,
  updateIssueComment,
  updateIssueState,
  uploadProfileAvatar,
} from "./auth-workspace-client";
import type { RuntimeConfig } from "./runtime-config";

const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
  rpcBaseUrl: "/yona/rpc",
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
    expect(readCalls[3]![0]).toBe(
      "/yona/api/v1/projects/owner%20space/project%2Fname/issues/11",
    );
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
    expect(massUpdateCall[0]).toBe(
      "/yona/api/v1/projects/owner/projectYobi/issues/mass-update",
    );
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

    const deleteCalls = fetchMock.mock.calls as unknown as Array<
      [string, { method: string }]
    >;
    expect(deleteCalls[0]![0]).toBe(
      "/yona/api/v1/projects/owner/projectYobi/issues/5",
    );
    expect(deleteCalls[1]![0]).toBe(
      "/yona/api/v1/projects/owner/projectYobi/issues/5/comments/8",
    );
    expect(deleteCalls[0]![1].method).toBe("DELETE");
    expect(deleteCalls[1]![1].method).toBe("DELETE");
  });
});
