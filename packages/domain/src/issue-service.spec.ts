import { describe, expect, it, vi } from "vitest";
import {
  createIssue,
  createIssueComment,
  listIssues,
  readIssueDetail,
  updateIssueState,
} from "./issue-service";

const authenticatedActor = {
  actorId: 11,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "door",
};

function createDeps() {
  return {
    createIssueCommentRecord: vi.fn().mockResolvedValue(undefined),
    createIssueRecord: vi.fn().mockResolvedValue(1),
    listIssuesByProject: vi.fn().mockResolvedValue([
      {
        authorLoginId: "door",
        authorName: "Door",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        issueNumber: 1,
        ownerName: "door",
        projectName: "yona",
        state: "open",
        title: "Issue title",
      },
    ]),
    readIssueByProjectAndNumber: vi.fn().mockResolvedValue({
      authorLoginId: "door",
      authorName: "Door",
      body: "Issue body",
      comments: [],
      createdAt: new Date("2026-03-10T00:00:00.000Z"),
      issueNumber: 1,
      ownerName: "door",
      projectName: "yona",
      state: "open",
      title: "Issue title",
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
    updateIssueStateByProjectAndNumber: vi.fn().mockResolvedValue(undefined),
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
  });
});
