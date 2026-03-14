import { describe, expect, it, vi } from "vitest";
import * as pullRequestService from "./pull-request-service";
import {
  createPullRequest,
  listPullRequests,
  readPullRequestDetail,
  updatePullRequestState,
} from "./pull-request-service";
import { DomainNotFoundError, DomainPermissionError, DomainValidationError } from "./errors";

const authenticatedActor = {
  actorId: 7,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "doortts",
};

function createAuthorizedProjectAuthorization() {
  return {
    project: {
      id: 11,
      organizationName: null,
      ownerName: "yona",
      overview: null,
      projectName: "project-yona",
      projectScope: "public" as const,
    },
    viewer: {
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: true,
      isProjectMember: true,
    },
  };
}

function createReadOnlyProjectAuthorization() {
  return {
    ...createAuthorizedProjectAuthorization(),
    viewer: {
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: false,
    },
  };
}

function createPullRequestDetail(state: "closed" | "open") {
  return {
    body: "Body",
    contributorLoginId: "doortts",
    contributorName: "Door TTS",
    createdAt: null,
    fromBranch: "feature/pr-baseline",
    ownerName: "yona",
    projectName: "project-yona",
    pullRequestNumber: 5,
    state,
    title: "Add PR baseline",
    toBranch: "main",
  };
}

function createPrivateProjectAuthorization() {
  return {
    ...createReadOnlyProjectAuthorization(),
    project: {
      ...createAuthorizedProjectAuthorization().project,
      projectScope: "private" as const,
    },
  };
}

function reviewThreadFixture(threadId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    authorLoginId: "admin",
    authorName: "Admin",
    commitId: "commit-111",
    createdAt: null,
    lastCommentAt: null,
    participants: ["admin", "laziel"],
    path: "/app/controllers/IssueApp.java",
    projectName: "project-yona",
    state: "open",
    text: "Comment #1 : 111",
    threadId,
    ...overrides,
  };
}

function expectReadPullRequestReviewThreads() {
  const readPullRequestReviewThreads = (pullRequestService as Record<string, unknown>)
    .readPullRequestReviewThreads;

  expect(readPullRequestReviewThreads).toBeTypeOf("function");

  return readPullRequestReviewThreads as (
    actor: Parameters<typeof listPullRequests>[0],
    input: Record<string, unknown>,
    deps: Record<string, unknown>,
  ) => Promise<unknown>;
}

describe("pull request service PR transition provenance: docs/provenance/phase-0b/pull-request-review.md", () => {
  it("lists, reads, creates, and updates pull requests", async () => {
    const deps = {
      createPullRequestRecord: vi.fn().mockResolvedValue(5),
      listPullRequestReviewThreadsByProject: vi.fn(),
      listPullRequestsByProject: vi.fn().mockResolvedValue([
        {
          contributorLoginId: "doortts",
          contributorName: "Door TTS",
          createdAt: null,
          fromBranch: "feature/pr-baseline",
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "open",
          title: "Add PR baseline",
          toBranch: "main",
        },
      ]),
      readProjectAuthorization: vi.fn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestByProjectAndNumber: vi
        .fn()
        .mockResolvedValueOnce(createPullRequestDetail("open"))
        .mockResolvedValueOnce(createPullRequestDetail("open"))
        .mockResolvedValueOnce(createPullRequestDetail("open"))
        .mockResolvedValueOnce(createPullRequestDetail("closed")),
      updatePullRequestStateByProjectAndNumber: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      listPullRequests(
        authenticatedActor,
        { ownerName: "yona", projectName: "project-yona" },
        deps,
      ),
    ).resolves.toHaveLength(1);

    await expect(
      readPullRequestDetail(
        authenticatedActor,
        { ownerName: "yona", projectName: "project-yona", pullRequestNumber: 5 },
        deps,
      ),
    ).resolves.toMatchObject({ pullRequestNumber: 5 });

    await expect(
      createPullRequest(
        authenticatedActor,
        {
          body: "Body",
          fromBranch: "feature/pr-baseline",
          ownerName: "yona",
          projectName: "project-yona",
          title: "Add PR baseline",
          toBranch: "main",
        },
        deps,
      ),
    ).resolves.toMatchObject({ pullRequestNumber: 5 });

    await expect(
      updatePullRequestState(
        authenticatedActor,
        { ownerName: "yona", projectName: "project-yona", pullRequestNumber: 5, state: "closed" },
        deps,
      ),
    ).resolves.toMatchObject({ pullRequestNumber: 5 });
  });

  it("rejects anonymous transition attempts before reading authorization", async () => {
    const deps = {
      createPullRequestRecord: vi.fn(),
      listPullRequestReviewThreadsByProject: vi.fn(),
      listPullRequestsByProject: vi.fn(),
      readProjectAuthorization: vi.fn(),
      readPullRequestByProjectAndNumber: vi.fn(),
      updatePullRequestStateByProjectAndNumber: vi.fn(),
    };

    await expect(
      updatePullRequestState(
        {
          actorId: null,
          isAnonymous: true,
          isSiteAdmin: false,
          loginId: null,
        },
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "closed",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);

    expect(deps.readProjectAuthorization).not.toHaveBeenCalled();
  });

  it("returns not found when the pull request does not exist during close", async () => {
    const deps = {
      createPullRequestRecord: vi.fn(),
      listPullRequestReviewThreadsByProject: vi.fn(),
      listPullRequestsByProject: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestByProjectAndNumber: vi.fn().mockResolvedValue(null),
      updatePullRequestStateByProjectAndNumber: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 404,
          state: "closed",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("rejects close when the actor lacks transition permission", async () => {
    const deps = {
      createPullRequestRecord: vi.fn(),
      listPullRequestReviewThreadsByProject: vi.fn(),
      listPullRequestsByProject: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue(createReadOnlyProjectAuthorization()),
      readPullRequestByProjectAndNumber: vi.fn(),
      updatePullRequestStateByProjectAndNumber: vi.fn(),
    };

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "closed",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);

    expect(deps.updatePullRequestStateByProjectAndNumber).not.toHaveBeenCalled();
  });

  it("closes and reopens pull requests for authorized actors", async () => {
    const deps = {
      createPullRequestRecord: vi.fn(),
      listPullRequestReviewThreadsByProject: vi.fn(),
      listPullRequestsByProject: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestByProjectAndNumber: vi
        .fn()
        .mockResolvedValueOnce(createPullRequestDetail("open"))
        .mockResolvedValueOnce(createPullRequestDetail("closed"))
        .mockResolvedValueOnce(createPullRequestDetail("closed"))
        .mockResolvedValueOnce(createPullRequestDetail("open")),
      updatePullRequestStateByProjectAndNumber: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "closed",
        },
        deps,
      ),
    ).resolves.toMatchObject({ pullRequestNumber: 5, state: "closed" });

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "open",
        },
        deps,
      ),
    ).resolves.toMatchObject({ pullRequestNumber: 5, state: "open" });

    expect(deps.updatePullRequestStateByProjectAndNumber).toHaveBeenNthCalledWith(1, {
      projectId: 11,
      pullRequestNumber: 5,
      state: "closed",
    });
    expect(deps.updatePullRequestStateByProjectAndNumber).toHaveBeenNthCalledWith(2, {
      projectId: 11,
      pullRequestNumber: 5,
      state: "open",
    });
  });

  it("rejects reopen when the pull request is already open", async () => {
    const deps = {
      createPullRequestRecord: vi.fn(),
      listPullRequestReviewThreadsByProject: vi.fn(),
      listPullRequestsByProject: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestByProjectAndNumber: vi.fn().mockResolvedValue(createPullRequestDetail("open")),
      updatePullRequestStateByProjectAndNumber: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "open",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);

    expect(deps.updatePullRequestStateByProjectAndNumber).not.toHaveBeenCalled();
  });

  it("rejects merged transition input before authorization or persistence", async () => {
    const deps = {
      createPullRequestRecord: vi.fn(),
      listPullRequestReviewThreadsByProject: vi.fn(),
      listPullRequestsByProject: vi.fn(),
      readProjectAuthorization: vi.fn(),
      readPullRequestByProjectAndNumber: vi.fn(),
      updatePullRequestStateByProjectAndNumber: vi.fn(),
    };

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "merged" as "closed",
        },
        deps,
      ),
    ).rejects.toThrow();

    expect(deps.readProjectAuthorization).not.toHaveBeenCalled();
    expect(deps.updatePullRequestStateByProjectAndNumber).not.toHaveBeenCalled();
  });

  it("keeps 13.7 PR review-thread reads project-authorized and leaves 13.6 repository discussion outside this slice", async () => {
    const anonymousActor = {
      actorId: null,
      isAnonymous: true,
      isSiteAdmin: false,
      loginId: null,
    };
    const deps = {
      listPullRequestReviewThreadsByProject: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue(createPrivateProjectAuthorization()),
    };
    const readPullRequestReviewThreads = expectReadPullRequestReviewThreads();

    await expect(
      readPullRequestReviewThreads(
        anonymousActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          state: "open",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);

    expect(deps.listPullRequestReviewThreadsByProject).not.toHaveBeenCalled();
  });

  it("filters 13.7 PR review-thread reads by legacy state, text, commit/path, author, and participant dimensions", async () => {
    const deps = {
      listPullRequestReviewThreadsByProject: vi.fn().mockResolvedValue([
        reviewThreadFixture("thread-open-comment", {
          authorLoginId: "admin",
          commitId: "commit-111",
          participants: ["admin", "laziel"],
          path: "/app/controllers/IssueApp.java",
          state: "open",
          text: "Comment #1 : 111",
        }),
        reviewThreadFixture("thread-open-controllers", {
          authorLoginId: "admin",
          commitId: "controllers",
          participants: ["admin", "doortts"],
          path: "/app/controllers/BoardApp.java",
          state: "open",
          text: "Comment #2 : /app/controllers/BoardApp.java",
        }),
        reviewThreadFixture("thread-closed-nonparticipant", {
          authorLoginId: "laziel",
          commitId: "commit-300",
          participants: ["laziel"],
          path: "/docs/README.md",
          state: "closed",
          text: "Comment #3",
        }),
      ]),
      readProjectAuthorization: vi.fn().mockResolvedValue(createAuthorizedProjectAuthorization()),
    };
    const readPullRequestReviewThreads = expectReadPullRequestReviewThreads();

    await expect(
      readPullRequestReviewThreads(
        authenticatedActor,
        {
          authorLoginId: "admin",
          filter: "controllers",
          ownerName: "yona",
          participantLoginId: "doortts",
          projectName: "project-yona",
          state: "open",
        },
        deps,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        authorLoginId: "admin",
        commitId: "controllers",
        participants: ["admin", "doortts"],
        path: "/app/controllers/BoardApp.java",
        state: "open",
        threadId: "thread-open-controllers",
      }),
    ]);

    await expect(
      readPullRequestReviewThreads(
        authenticatedActor,
        {
          filter: "111",
          ownerName: "yona",
          projectName: "project-yona",
          state: "open",
        },
        deps,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        text: "Comment #1 : 111",
        threadId: "thread-open-comment",
      }),
    ]);
  });
});
