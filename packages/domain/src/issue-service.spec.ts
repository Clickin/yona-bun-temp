import { describe, expect, it, vi } from "vitest";
import {
  assignIssue,
  createIssue,
  createIssueComment,
  listIssues,
  readIssueDetail,
  unassignIssue,
  unvoteIssue,
  unwatchIssue,
  updateIssueState,
  voteIssue,
  watchIssue,
} from "./issue-service";

const authenticatedActor = {
  actorId: 11,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "door",
  name: "Door TTS",
};

function createDeps() {
  return {
    assignIssueByProjectAndNumber: vi.fn().mockResolvedValue(undefined),
    createIssueCommentRecord: vi.fn().mockResolvedValue(undefined),
    createIssueRecord: vi.fn().mockResolvedValue(1),
    listIssuesByProject: vi.fn().mockResolvedValue([
      {
        assignee: {
          loginId: "assignee",
          name: "Assignee User",
        },
        authorLoginId: "door",
        authorName: "Door",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        issueNumber: 1,
        ownerName: "door",
        projectName: "yona",
        state: "open",
        title: "Issue title",
        voterCount: 1,
        watcherCount: 3,
      },
    ]),
    readIssueByProjectAndNumber: vi.fn().mockResolvedValue({
      assignee: {
        loginId: "assignee",
        name: "Assignee User",
      },
      authorLoginId: "door",
      authorName: "Door",
      body: "Issue body",
      comments: [],
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      hasVoted: false,
      isWatching: false,
      issueNumber: 1,
      ownerName: "door",
      projectName: "yona",
      state: "open",
      timeline: [],
      title: "Issue title",
      voterCount: 1,
      watcherCount: 3,
    }),
    readIssueIdByProjectAndNumber: vi.fn().mockResolvedValue(99),
    readProjectAuthorization: vi.fn().mockResolvedValue({
      project: {
        id: 7,
        ownerName: "door",
        projectName: "yona",
        projectScope: "public",
      },
      viewer: {
        isOrganizationAdmin: false,
        isOrganizationMember: false,
        isProjectManager: true,
        isProjectMember: true,
      },
    }),
    unassignIssueByProjectAndNumber: vi.fn().mockResolvedValue(undefined),
    unvoteIssueRecord: vi.fn().mockResolvedValue(undefined),
    updateIssueStateByProjectAndNumber: vi.fn().mockResolvedValue(undefined),
    unwatchIssueRecord: vi.fn().mockResolvedValue(undefined),
    voteIssueRecord: vi.fn().mockResolvedValue(undefined),
    watchIssueRecord: vi.fn().mockResolvedValue(undefined),
  };
}

describe("issue service", () => {
  it("lists and reads issues", async () => {
    const deps = createDeps();
    await expect(
      listIssues(authenticatedActor, { ownerName: "door", projectName: "yona" }, deps),
    ).resolves.toHaveLength(1);

    await expect(
      readIssueDetail(
        authenticatedActor,
        { issueNumber: 1, ownerName: "door", projectName: "yona" },
        deps,
      ),
    ).resolves.toMatchObject({
      issueNumber: 1,
      title: "Issue title",
    });
  });

  it("creates issue, comment, and updates state", async () => {
    const deps = createDeps();

    await expect(
      createIssue(
        authenticatedActor,
        { body: "body", ownerName: "door", projectName: "yona", title: "Issue title" },
        deps,
      ),
    ).resolves.toMatchObject({
      issueNumber: 1,
    });
    expect(deps.createIssueRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: "Door TTS",
      }),
    );

    await expect(
      createIssueComment(
        authenticatedActor,
        {
          contents: "comment",
          issueNumber: 1,
          ownerName: "door",
          projectName: "yona",
        },
        deps,
      ),
    ).resolves.toMatchObject({
      issueNumber: 1,
    });
    expect(deps.createIssueCommentRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: "Door TTS",
      }),
    );

    await expect(
      updateIssueState(
        authenticatedActor,
        {
          issueNumber: 1,
          ownerName: "door",
          projectName: "yona",
          state: "closed",
        },
        deps,
      ),
    ).resolves.toMatchObject({
      issueNumber: 1,
    });
    expect(deps.updateIssueStateByProjectAndNumber).toHaveBeenCalledWith({
      issueNumber: 1,
      projectId: 7,
      senderLoginId: "door",
      state: "closed",
    });
  });

  it("wires watch, unwatch, vote, and unvote through the bounded deps", async () => {
    const deps = createDeps();

    await expect(
      watchIssue(
        authenticatedActor,
        { issueNumber: 1, ownerName: "door", projectName: "yona" },
        deps,
      ),
    ).resolves.toMatchObject({ issueNumber: 1 });
    expect(deps.watchIssueRecord).toHaveBeenCalledWith({
      issueId: 99,
      userId: 11,
    });

    await expect(
      unwatchIssue(
        authenticatedActor,
        { issueNumber: 1, ownerName: "door", projectName: "yona" },
        deps,
      ),
    ).resolves.toMatchObject({ issueNumber: 1 });
    expect(deps.unwatchIssueRecord).toHaveBeenCalledWith({
      issueId: 99,
      userId: 11,
    });

    await expect(
      voteIssue(
        authenticatedActor,
        { issueNumber: 1, ownerName: "door", projectName: "yona" },
        deps,
      ),
    ).resolves.toMatchObject({ issueNumber: 1 });
    expect(deps.voteIssueRecord).toHaveBeenCalledWith({
      issueId: 99,
      userId: 11,
    });

    await expect(
      unvoteIssue(
        authenticatedActor,
        { issueNumber: 1, ownerName: "door", projectName: "yona" },
        deps,
      ),
    ).resolves.toMatchObject({ issueNumber: 1 });
    expect(deps.unvoteIssueRecord).toHaveBeenCalledWith({
      issueId: 99,
      userId: 11,
    });
  });

  it("assigns and unassigns using the current write boundary", async () => {
    const deps = createDeps();

    await expect(
      assignIssue(
        authenticatedActor,
        {
          assigneeLoginId: "assignee-user",
          issueNumber: 1,
          ownerName: "door",
          projectName: "yona",
        },
        deps,
      ),
    ).resolves.toMatchObject({ issueNumber: 1 });
    expect(deps.assignIssueByProjectAndNumber).toHaveBeenCalledWith({
      assigneeLoginId: "assignee-user",
      issueNumber: 1,
      projectId: 7,
      senderLoginId: "door",
    });

    await expect(
      unassignIssue(
        authenticatedActor,
        { issueNumber: 1, ownerName: "door", projectName: "yona" },
        deps,
      ),
    ).resolves.toMatchObject({ issueNumber: 1 });
    expect(deps.unassignIssueByProjectAndNumber).toHaveBeenCalledWith({
      issueNumber: 1,
      projectId: 7,
      senderLoginId: "door",
    });
  });

  it("rejects participation mutations when the issue is missing", async () => {
    const deps = createDeps();
    deps.readIssueIdByProjectAndNumber.mockResolvedValueOnce(null);

    await expect(
      voteIssue(
        authenticatedActor,
        { issueNumber: 1, ownerName: "door", projectName: "yona" },
        deps,
      ),
    ).rejects.toMatchObject({
      message: "Issue not found.",
      name: "DomainNotFoundError",
    });
  });
});
