import { describe, expect, it, vi } from "vitest";
import {
  createMilestone,
  listMilestones,
  readMilestoneDetail,
  updateMilestone,
} from "./milestone-service";

const actor = {
  actorId: 7,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "doortts",
};

describe("milestone service", () => {
  it("lists, reads, and mutates milestone records", async () => {
    const deps = {
      createMilestoneRecord: vi.fn().mockResolvedValue(5),
      deleteMilestoneRecord: vi.fn(),
      listMilestonesByProject: vi.fn().mockResolvedValue([
        {
          contents: "v1",
          dueDate: null,
          milestoneId: 5,
          ownerName: "yona",
          projectName: "project-yona",
          state: "open",
          title: "v1",
        },
      ]),
      readMilestoneByProjectAndId: vi.fn().mockResolvedValue({
        contents: "v1",
        dueDate: null,
        milestoneId: 5,
        ownerName: "yona",
        projectName: "project-yona",
        state: "open",
        title: "v1",
      }),
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
      updateMilestoneRecord: vi.fn(),
    };

    await expect(
      listMilestones(actor, { ownerName: "yona", projectName: "project-yona" }, deps),
    ).resolves.toHaveLength(1);
    await expect(
      readMilestoneDetail(
        actor,
        { milestoneId: 5, ownerName: "yona", projectName: "project-yona" },
        deps,
      ),
    ).resolves.toMatchObject({ title: "v1" });
    await expect(
      createMilestone(
        actor,
        {
          contents: "v1",
          dueDate: null,
          ownerName: "yona",
          projectName: "project-yona",
          state: "open",
          title: "v1",
        },
        deps,
      ),
    ).resolves.toMatchObject({ milestoneId: 5 });
    await expect(
      updateMilestone(
        actor,
        {
          contents: "v2",
          dueDate: null,
          milestoneId: 5,
          ownerName: "yona",
          projectName: "project-yona",
          state: "closed",
          title: "v2",
        },
        deps,
      ),
    ).resolves.toMatchObject({ milestoneId: 5 });
  });
});
