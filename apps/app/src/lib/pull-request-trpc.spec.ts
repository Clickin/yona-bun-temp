import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createPullRequestMock,
  listPullRequestsMock,
  readCurrentSessionMock,
  readPullRequestDetailMock,
  updatePullRequestStateMock,
} = vi.hoisted(() => ({
  createPullRequestMock: vi.fn(),
  listPullRequestsMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
  readPullRequestDetailMock: vi.fn(),
  updatePullRequestStateMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    createPullRequest: createPullRequestMock,
    listPullRequests: listPullRequestsMock,
    readPullRequestDetail: readPullRequestDetailMock,
    updatePullRequestState: updatePullRequestStateMock,
  };
});

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    readCurrentSession: readCurrentSessionMock,
  };
});

import { createPullRequestCaller } from "./pull-request-trpc";

function createContext(cookieValue?: string) {
  const cookies = new Map<string, string>();
  if (cookieValue) {
    cookies.set("yona-session", cookieValue);
  }

  return {
    deleteCookie: vi.fn(),
    getCookie: (name: string) => cookies.get(name),
    setResponseStatus: vi.fn(),
  };
}

describe("pull request tRPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readCurrentSessionMock.mockResolvedValue({
      clearCookie: false,
      projection: {
        actorId: 2,
        emailAddress: "yobi@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "yobi",
        userLabel: "Yobi",
      },
      sessionRecord: {
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        expiresAt: new Date("2026-03-10T00:00:00.000Z"),
        id: "session-1",
        token: "session-token",
        userId: 2,
      },
      token: "session-token",
      user: {
        emailAddress: "yobi@example.com",
        id: 2,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "yobi",
        name: "Yobi",
      },
    });
  });

  it("lists, reads, creates, and updates pull requests", async () => {
    listPullRequestsMock.mockResolvedValue([
      {
        contributorLoginId: "yobi",
        contributorName: "Yobi",
        createdAt: null,
        fromBranch: "feature/pr-baseline",
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "open",
        title: "Hello",
        toBranch: "main",
      },
    ]);

    readPullRequestDetailMock.mockResolvedValue({
      body: "Body",
      contributorLoginId: "yobi",
      contributorName: "Yobi",
      createdAt: null,
      fromBranch: "feature/pr-baseline",
      ownerName: "yobi",
      projectName: "yona",
      pullRequestNumber: 1,
      state: "open",
      title: "Hello",
      toBranch: "main",
    });

    createPullRequestMock.mockResolvedValue({
      body: "Body",
      contributorLoginId: "yobi",
      contributorName: "Yobi",
      createdAt: null,
      fromBranch: "feature/pr-baseline",
      ownerName: "yobi",
      projectName: "yona",
      pullRequestNumber: 1,
      state: "open",
      title: "Hello",
      toBranch: "main",
    });

    updatePullRequestStateMock.mockResolvedValue({
      body: "Body",
      contributorLoginId: "yobi",
      contributorName: "Yobi",
      createdAt: null,
      fromBranch: "feature/pr-baseline",
      ownerName: "yobi",
      projectName: "yona",
      pullRequestNumber: 1,
      state: "closed",
      title: "Hello",
      toBranch: "main",
    });

    const caller = createPullRequestCaller(createContext("session-token"));

    await expect(
      caller.listPullRequests({ ownerName: "yobi", projectName: "yona" }),
    ).resolves.toHaveLength(1);
    await expect(
      caller.readPullRequestDetail({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
      }),
    ).resolves.toMatchObject({ pullRequestNumber: 1 });
    await expect(
      caller.createPullRequest({
        body: "Body",
        fromBranch: "feature/pr-baseline",
        ownerName: "yobi",
        projectName: "yona",
        title: "Hello",
        toBranch: "main",
      }),
    ).resolves.toMatchObject({ pullRequestNumber: 1 });
    await expect(
      caller.updatePullRequestState({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "closed",
      }),
    ).resolves.toMatchObject({ pullRequestNumber: 1 });
  });
});
