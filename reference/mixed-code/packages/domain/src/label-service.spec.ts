import { describe, expect, it, vi } from "vitest";
import {
  createIssueLabel,
  createLabelCategory,
  listIssueLabels,
  listLabelCategories,
} from "./label-service";

const actor = {
  actorId: 7,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "doortts",
};

describe("label service", () => {
  it("lists and creates label categories and labels", async () => {
    const deps = {
      createIssueLabelRecord: vi.fn().mockResolvedValue(3),
      createLabelCategoryRecord: vi.fn().mockResolvedValue(2),
      deleteIssueLabelRecord: vi.fn(),
      deleteLabelCategoryRecord: vi.fn(),
      listIssueLabelsByProject: vi.fn().mockResolvedValue([
        {
          categoryId: 2,
          categoryName: "type",
          color: "#ff0000",
          labelId: 3,
          name: "bug",
          ownerName: "yona",
          projectName: "project-yona",
        },
      ]),
      listLabelCategoriesByProject: vi.fn().mockResolvedValue([
        {
          categoryId: 2,
          isExclusive: true,
          name: "type",
          ownerName: "yona",
          projectName: "project-yona",
        },
      ]),
      readIssueLabelByProjectAndId: vi.fn().mockResolvedValue({
        categoryId: 2,
        categoryName: "type",
        color: "#ff0000",
        labelId: 3,
        name: "bug",
        ownerName: "yona",
        projectName: "project-yona",
      }),
      readLabelCategoryByProjectAndId: vi.fn().mockResolvedValue({
        categoryId: 2,
        isExclusive: true,
        name: "type",
        ownerName: "yona",
        projectName: "project-yona",
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
      updateIssueLabelRecord: vi.fn(),
      updateLabelCategoryRecord: vi.fn(),
    };

    await expect(
      listLabelCategories(actor, { ownerName: "yona", projectName: "project-yona" }, deps),
    ).resolves.toHaveLength(1);
    await expect(
      createLabelCategory(
        actor,
        { isExclusive: true, name: "type", ownerName: "yona", projectName: "project-yona" },
        deps,
      ),
    ).resolves.toMatchObject({ categoryId: 2 });
    await expect(
      listIssueLabels(actor, { ownerName: "yona", projectName: "project-yona" }, deps),
    ).resolves.toHaveLength(1);
    await expect(
      createIssueLabel(
        actor,
        {
          categoryId: 2,
          color: "#ff0000",
          name: "bug",
          ownerName: "yona",
          projectName: "project-yona",
        },
        deps,
      ),
    ).resolves.toMatchObject({ labelId: 3 });
  });
});
