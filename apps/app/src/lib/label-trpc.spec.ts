import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createIssueLabelMock,
  createLabelCategoryMock,
  deleteIssueLabelMock,
  deleteLabelCategoryMock,
  listIssueLabelsMock,
  listLabelCategoriesMock,
  readCurrentSessionMock,
  updateIssueLabelMock,
  updateLabelCategoryMock,
} = vi.hoisted(() => ({
  createIssueLabelMock: vi.fn(),
  createLabelCategoryMock: vi.fn(),
  deleteIssueLabelMock: vi.fn(),
  deleteLabelCategoryMock: vi.fn(),
  listIssueLabelsMock: vi.fn(),
  listLabelCategoriesMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
  updateIssueLabelMock: vi.fn(),
  updateLabelCategoryMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    createIssueLabel: createIssueLabelMock,
    createLabelCategory: createLabelCategoryMock,
    deleteIssueLabel: deleteIssueLabelMock,
    deleteLabelCategory: deleteLabelCategoryMock,
    listIssueLabels: listIssueLabelsMock,
    listLabelCategories: listLabelCategoriesMock,
    updateIssueLabel: updateIssueLabelMock,
    updateLabelCategory: updateLabelCategoryMock,
  };
});

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    readCurrentSession: readCurrentSessionMock,
  };
});

import { createLabelCaller } from "./label-trpc";

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

describe("label tRPC", () => {
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

  it("lists and mutates label categories and labels", async () => {
    listLabelCategoriesMock.mockResolvedValue([
      { categoryId: 1, isExclusive: true, name: "type", ownerName: "yobi", projectName: "yona" },
    ]);
    createLabelCategoryMock.mockResolvedValue({
      categoryId: 2,
      isExclusive: false,
      name: "priority",
      ownerName: "yobi",
      projectName: "yona",
    });
    updateLabelCategoryMock.mockResolvedValue({
      categoryId: 2,
      isExclusive: true,
      name: "priority",
      ownerName: "yobi",
      projectName: "yona",
    });
    listIssueLabelsMock.mockResolvedValue([
      {
        categoryId: 1,
        categoryName: "type",
        color: "#ff0000",
        labelId: 3,
        name: "bug",
        ownerName: "yobi",
        projectName: "yona",
      },
    ]);
    createIssueLabelMock.mockResolvedValue({
      categoryId: 1,
      categoryName: "type",
      color: "#00ff00",
      labelId: 4,
      name: "feature",
      ownerName: "yobi",
      projectName: "yona",
    });
    updateIssueLabelMock.mockResolvedValue({
      categoryId: 1,
      categoryName: "type",
      color: "#0000ff",
      labelId: 4,
      name: "feature",
      ownerName: "yobi",
      projectName: "yona",
    });
    deleteLabelCategoryMock.mockResolvedValue(undefined);
    deleteIssueLabelMock.mockResolvedValue(undefined);

    const caller = createLabelCaller(createContext("session-token"));

    await expect(
      caller.listLabelCategories({ ownerName: "yobi", projectName: "yona" }),
    ).resolves.toHaveLength(1);
    await expect(
      caller.createLabelCategory({
        isExclusive: false,
        name: "priority",
        ownerName: "yobi",
        projectName: "yona",
      }),
    ).resolves.toMatchObject({ categoryId: 2 });
    await expect(
      caller.updateLabelCategory({
        categoryId: 2,
        isExclusive: true,
        name: "priority",
        ownerName: "yobi",
        projectName: "yona",
      }),
    ).resolves.toMatchObject({ isExclusive: true });
    await expect(
      caller.listIssueLabels({ ownerName: "yobi", projectName: "yona" }),
    ).resolves.toHaveLength(1);
    await expect(
      caller.createIssueLabel({
        categoryId: 1,
        color: "#00ff00",
        name: "feature",
        ownerName: "yobi",
        projectName: "yona",
      }),
    ).resolves.toMatchObject({ labelId: 4 });
    await expect(
      caller.updateIssueLabel({
        categoryId: 1,
        color: "#0000ff",
        labelId: 4,
        name: "feature",
        ownerName: "yobi",
        projectName: "yona",
      }),
    ).resolves.toMatchObject({ color: "#0000ff" });
    await expect(
      caller.deleteLabelCategory({ categoryId: 2, ownerName: "yobi", projectName: "yona" }),
    ).resolves.toBe(true);
    await expect(
      caller.deleteIssueLabel({ labelId: 4, ownerName: "yobi", projectName: "yona" }),
    ).resolves.toBe(true);
  });
});
