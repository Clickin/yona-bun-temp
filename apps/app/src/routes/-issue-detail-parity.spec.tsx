import { describe, expect, it, vi } from "vitest";

const {
  assignIssueMock,
  createIssueCommentMock,
  readIssueDetailMock,
  readProjectDetailMock,
  unassignIssueMock,
  unvoteIssueMock,
  unwatchIssueMock,
  updateIssueStateMock,
  voteIssueMock,
  watchIssueMock,
} = vi.hoisted(() => ({
  assignIssueMock: vi.fn(),
  createIssueCommentMock: vi.fn(),
  readIssueDetailMock: vi.fn(),
  readProjectDetailMock: vi.fn(),
  unassignIssueMock: vi.fn(),
  unvoteIssueMock: vi.fn(),
  unwatchIssueMock: vi.fn(),
  updateIssueStateMock: vi.fn(),
  voteIssueMock: vi.fn(),
  watchIssueMock: vi.fn(),
}));

vi.mock("@app/lib/shell-data", () => ({
  getProtectedShellData: vi.fn(async () => ({
    lanes: [],
    title: "Protected Workspace",
  })),
  getPublicShellData: vi.fn(async () => ({
    workstreams: ["projects", "groups", "search"],
  })),
}));

vi.mock("@app/lib/auth", () => ({
  buildProtectedRedirect: vi.fn(() => null),
  completePasswordReset: vi.fn(),
  readCurrentSession: vi.fn(async () => ({
    actorId: 2,
    emailAddress: "yobi@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: false,
    loginId: "yobi",
    userLabel: "Yobi",
  })),
  registerWithPassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@app/lib/locale", () => ({
  readCurrentLocale: vi.fn(async () => ({
    locale: "en",
  })),
}));

vi.mock("@app/lib/project", () => ({
  readProjectDetail: readProjectDetailMock,
}));

vi.mock("@app/lib/issue", () => ({
  assignIssue: assignIssueMock,
  createIssueComment: createIssueCommentMock,
  readIssueDetail: readIssueDetailMock,
  unassignIssue: unassignIssueMock,
  unvoteIssue: unvoteIssueMock,
  unwatchIssue: unwatchIssueMock,
  updateIssueState: updateIssueStateMock,
  voteIssue: voteIssueMock,
  watchIssue: watchIssueMock,
}));

import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { getRouter } from "@app/router";

describe("issue detail route parity", () => {
  it("renders assignee, watcher and voter state, actions, and timeline", async () => {
    readProjectDetailMock.mockResolvedValue({
      organizationName: null,
      ownerName: "yobi",
      overview: "overview",
      projectName: "projectYobi",
      projectScope: "public",
      viewerCanUpdate: true,
    });
    readIssueDetailMock.mockResolvedValue({
      assignee: {
        loginId: "alecsiel",
        name: "Alec Siel",
      },
      authorLoginId: "nori",
      authorName: "Nori",
      body: "Issue body",
      comments: [
        {
          authorLoginId: "commenter",
          authorName: "Commenter",
          commentId: 10,
          contents: "timeline comment",
          createdAt: new Date("2026-03-10T01:00:00.000Z"),
        },
      ],
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      hasVoted: true,
      isWatching: true,
      issueNumber: 1,
      ownerName: "yobi",
      projectName: "projectYobi",
      state: "open",
      timeline: [
        {
          authorLoginId: "commenter",
          authorName: "Commenter",
          commentId: 10,
          contents: "timeline comment",
          createdAt: new Date("2026-03-10T01:00:00.000Z"),
          kind: "comment",
        },
        {
          createdAt: new Date("2026-03-10T02:00:00.000Z"),
          eventId: 11,
          eventType: "issue.assignee.changed",
          kind: "event",
          newValue: "alecsiel",
          oldValue: "nori",
          senderLoginId: "yobi",
        },
      ],
      title: "Issue title",
      voterCount: 2,
      watcherCount: 4,
    });

    const router = getRouter({
      history: createMemoryHistory({ initialEntries: ["/yobi/projectYobi/issues/1"] }),
    });

    await router.load();
    const html = renderToString(<RouterProvider router={router} />);

    expect(html).toContain("Assignee: alecsiel");
    expect(html).toContain("Watchers: 4");
    expect(html).toContain("Voters: 2");
    expect(html).toContain("Unwatch");
    expect(html).toContain("Unvote");
    expect(html).toContain("Assign Issue");
    expect(html).toContain("Timeline");
    expect(html).toContain("timeline comment");
    expect(html).toContain("issue.assignee.changed");
  });
});
