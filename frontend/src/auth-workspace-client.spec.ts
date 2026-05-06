import { describe, expect, it, vi } from "vitest";
import {
  createProjectLabel,
  listProjectMilestones,
  readCurrentSession,
  readSessionBootstrap,
  voteIssueComment,
  watchIssue,
  uploadProfileAvatar,
} from "./auth-workspace-client";
import type { RuntimeConfig } from "./runtime-config";

const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
  rpcBaseUrl: "/yona/rpc",
};

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

describe("REST issue meta wrappers", () => {
  it("posts watchIssue to the v1 issue watch endpoint with csrf", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ issueNumber: "7", isWatching: true }),
    }));

    const result = await watchIssue(
      runtimeConfig,
      "csrf-123",
      {
        issueNumber: 7n,
        ownerName: "owner",
        projectName: "projectYobi",
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/owners/owner/projects/projectYobi/issues/7/watch");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("x-csrf-token")).toBe("csrf-123");
    expect(requestInit.method).toBe("POST");
    expect(result.isWatching).toBe(true);
  });

  it("posts voteIssueComment to the nested v1 comment vote endpoint", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ issueNumber: "7" }),
    }));

    await voteIssueComment(
      runtimeConfig,
      "csrf-456",
      {
        commentId: 11n,
        issueNumber: 7n,
        ownerName: "owner",
        projectName: "projectYobi",
      },
      fetchMock as unknown as typeof fetch,
    );

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe(
      "/yona/api/v1/owners/owner/projects/projectYobi/issues/7/comments/11/vote",
    );
    expect(requestInit.headers.get("x-csrf-token")).toBe("csrf-456");
    expect(requestInit.method).toBe("POST");
  });

  it("posts createProjectLabel to the v1 labels endpoint with a json body", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ created: true, label: { id: "3", name: "Bug" } }),
    }));

    const result = await createProjectLabel(
      runtimeConfig,
      "csrf-789",
      {
        categoryIsExclusive: true,
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
      { body: string; credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/owners/owner/projects/projectYobi/labels");
    expect(requestInit.headers.get("Content-Type")).toBe("application/json");
    expect(requestInit.method).toBe("POST");
    expect(JSON.parse(requestInit.body)).toEqual({
      categoryIsExclusive: true,
      categoryName: "Type",
      labelColor: "#f44336",
      labelName: "Bug",
    });
    expect(result.created).toBe(true);
  });

  it("reads listProjectMilestones from the v1 milestones endpoint with query params", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ milestones: [] }),
    }));

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
