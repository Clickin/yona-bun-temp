import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assignIssueMock,
  createIssueCommentMock,
  listIssuesMock,
  readCurrentSessionMock,
  readIssueDetailMock,
  unassignIssueMock,
  unvoteIssueMock,
  unwatchIssueMock,
  updateIssueStateMock,
  voteIssueMock,
  watchIssueMock,
} = vi.hoisted(() => ({
  assignIssueMock: vi.fn(),
  createIssueCommentMock: vi.fn(),
  listIssuesMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
  readIssueDetailMock: vi.fn(),
  unassignIssueMock: vi.fn(),
  unvoteIssueMock: vi.fn(),
  unwatchIssueMock: vi.fn(),
  updateIssueStateMock: vi.fn(),
  voteIssueMock: vi.fn(),
  watchIssueMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    assignIssue: assignIssueMock,
    createIssueComment: createIssueCommentMock,
    listIssues: listIssuesMock,
    readIssueDetail: readIssueDetailMock,
    unassignIssue: unassignIssueMock,
    unvoteIssue: unvoteIssueMock,
    unwatchIssue: unwatchIssueMock,
    updateIssueState: updateIssueStateMock,
    voteIssue: voteIssueMock,
    watchIssue: watchIssueMock,
  };
});

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    readCurrentSession: readCurrentSessionMock,
  };
});

import { createIssueCaller } from "./issue-trpc";

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

function detail() {
  return {
    assignee: {
      loginId: "alecsiel",
      name: "Alec Siel",
    },
    authorLoginId: "nori",
    authorName: "Nori",
    body: "Issue body",
    comments: [],
    createdAt: new Date("2026-03-10T00:00:00.000Z"),
    hasVoted: false,
    isWatching: true,
    issueNumber: 1,
    ownerName: "yobi",
    projectName: "projectYobi",
    state: "open" as const,
    timeline: [],
    title: "Issue title",
    voterCount: 2,
    watcherCount: 4,
  };
}

describe("issue tRPC", () => {
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

  it("lists issue summaries and wires all participation mutations", async () => {
    listIssuesMock.mockResolvedValue([
      {
        assignee: null,
        authorLoginId: "nori",
        authorName: "Nori",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        issueNumber: 1,
        ownerName: "yobi",
        projectName: "projectYobi",
        state: "open",
        title: "Issue title",
        voterCount: 0,
        watcherCount: 1,
      },
    ]);
    readIssueDetailMock.mockResolvedValue(detail());
    createIssueCommentMock.mockResolvedValue(detail());
    updateIssueStateMock.mockResolvedValue(detail());
    watchIssueMock.mockResolvedValue(detail());
    unwatchIssueMock.mockResolvedValue(detail());
    voteIssueMock.mockResolvedValue(detail());
    unvoteIssueMock.mockResolvedValue(detail());
    assignIssueMock.mockResolvedValue(detail());
    unassignIssueMock.mockResolvedValue(detail());

    const caller = createIssueCaller(createContext("session-token"));

    await expect(
      caller.listIssues({ ownerName: "yobi", projectName: "projectYobi" }),
    ).resolves.toHaveLength(1);
    await expect(
      caller.readIssueDetail({ issueNumber: 1, ownerName: "yobi", projectName: "projectYobi" }),
    ).resolves.toMatchObject({
      issueNumber: 1,
      watcherCount: 4,
    });
    await expect(
      caller.createIssueComment({
        contents: "comment",
        issueNumber: 1,
        ownerName: "yobi",
        projectName: "projectYobi",
      }),
    ).resolves.toMatchObject({ issueNumber: 1 });
    await expect(
      caller.updateIssueState({
        issueNumber: 1,
        ownerName: "yobi",
        projectName: "projectYobi",
        state: "closed",
      }),
    ).resolves.toMatchObject({ issueNumber: 1 });
    await expect(
      caller.watchIssue({ issueNumber: 1, ownerName: "yobi", projectName: "projectYobi" }),
    ).resolves.toMatchObject({ isWatching: true });
    await expect(
      caller.unwatchIssue({ issueNumber: 1, ownerName: "yobi", projectName: "projectYobi" }),
    ).resolves.toMatchObject({ isWatching: true });
    await expect(
      caller.voteIssue({ issueNumber: 1, ownerName: "yobi", projectName: "projectYobi" }),
    ).resolves.toMatchObject({ hasVoted: false });
    await expect(
      caller.unvoteIssue({ issueNumber: 1, ownerName: "yobi", projectName: "projectYobi" }),
    ).resolves.toMatchObject({ hasVoted: false });
    await expect(
      caller.assignIssue({
        assigneeLoginId: "alecsiel",
        issueNumber: 1,
        ownerName: "yobi",
        projectName: "projectYobi",
      }),
    ).resolves.toMatchObject({
      assignee: {
        loginId: "alecsiel",
      },
    });
    await expect(
      caller.unassignIssue({ issueNumber: 1, ownerName: "yobi", projectName: "projectYobi" }),
    ).resolves.toMatchObject({
      issueNumber: 1,
    });
  });
});
