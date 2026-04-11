import { describe, expect, it, vi } from "vitest";
import {
  createPosting,
  createPostingComment,
  listPostings,
  readPostingDetail,
} from "./posting-service";

const authenticatedActor = {
  actorId: 7,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "doortts",
  name: "Door TTS",
};

describe("posting service", () => {
  it("lists, reads, and mutates board postings", async () => {
    const deps = {
      createPostingCommentRecord: vi.fn(),
      createPostingRecord: vi.fn().mockResolvedValue(3),
      listPostingsByProject: vi.fn().mockResolvedValue([
        {
          authorLoginId: "doortts",
          authorName: "Door TTS",
          createdAt: null,
          ownerName: "yona",
          postingNumber: 3,
          projectName: "project-yona",
          title: "Discussion",
        },
      ]),
      readPostingByProjectAndNumber: vi.fn().mockResolvedValue({
        authorLoginId: "doortts",
        authorName: "Door TTS",
        body: "Body",
        comments: [],
        createdAt: null,
        ownerName: "yona",
        postingNumber: 3,
        projectName: "project-yona",
        title: "Discussion",
      }),
      readPostingIdByProjectAndNumber: vi.fn().mockResolvedValue(44),
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
          isOrganizationMember: false,
          isProjectManager: true,
          isProjectMember: true,
        },
      }),
    };

    await expect(
      listPostings(authenticatedActor, { ownerName: "yona", projectName: "project-yona" }, deps),
    ).resolves.toHaveLength(1);
    await expect(
      readPostingDetail(
        authenticatedActor,
        { ownerName: "yona", postingNumber: 3, projectName: "project-yona" },
        deps,
      ),
    ).resolves.toMatchObject({ postingNumber: 3 });
    await expect(
      createPosting(
        authenticatedActor,
        { body: "Body", ownerName: "yona", projectName: "project-yona", title: "Discussion" },
        deps,
      ),
    ).resolves.toMatchObject({ postingNumber: 3 });
    expect(deps.createPostingRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: "Door TTS",
      }),
    );
    await expect(
      createPostingComment(
        authenticatedActor,
        {
          contents: "hello",
          ownerName: "yona",
          postingNumber: 3,
          projectName: "project-yona",
        },
        deps,
      ),
    ).resolves.toMatchObject({ postingNumber: 3 });
    expect(deps.createPostingCommentRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: "Door TTS",
      }),
    );
  });
});
