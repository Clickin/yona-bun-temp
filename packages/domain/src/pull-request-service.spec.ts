import { describe, expect, it, vi } from "vitest";
import {
  createPullRequest,
  listPullRequests,
  readPullRequestDetail,
  updatePullRequestState,
} from "./pull-request-service";

const authenticatedActor = {
  actorId: 7,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "doortts",
};

describe("pull request service", () => {
  it("lists, reads, creates, and updates pull requests", async () => {
    const deps = {
      createPullRequestRecord: vi.fn().mockResolvedValue(5),
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
      readProjectAuthorization: vi.fn().mockResolvedValue({
        project: {
          id: 11,
          organizationName: null,
          ownerName: "yona",
          overview: null,
          projectName: "project-yona",
          projectScope: "public",
        },
        viewer: {
          actorId: 7,
          isOrganizationAdmin: false,
          isProjectManager: true,
          isProjectMember: true,
        },
      }),
      readPullRequestByProjectAndNumber: vi.fn().mockResolvedValue({
        body: "Body",
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
      }),
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
});
