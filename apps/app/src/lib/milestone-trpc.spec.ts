import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createMilestoneMock,
  deleteMilestoneMock,
  listMilestonesMock,
  readCurrentSessionMock,
  readMilestoneDetailMock,
  updateMilestoneMock,
} = vi.hoisted(() => ({
  createMilestoneMock: vi.fn(),
  deleteMilestoneMock: vi.fn(),
  listMilestonesMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
  readMilestoneDetailMock: vi.fn(),
  updateMilestoneMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    createMilestone: createMilestoneMock,
    deleteMilestone: deleteMilestoneMock,
    listMilestones: listMilestonesMock,
    readMilestoneDetail: readMilestoneDetailMock,
    updateMilestone: updateMilestoneMock,
  };
});

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    readCurrentSession: readCurrentSessionMock,
  };
});

import { createMilestoneCaller } from "./milestone-trpc";

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

describe("milestone tRPC", () => {
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

  it("lists and mutates milestones", async () => {
    listMilestonesMock.mockResolvedValue([
      {
        contents: null,
        dueDate: null,
        milestoneId: 1,
        ownerName: "yobi",
        projectName: "yona",
        state: "open",
        title: "v1",
      },
    ]);
    readMilestoneDetailMock.mockResolvedValue({
      contents: null,
      dueDate: null,
      milestoneId: 1,
      ownerName: "yobi",
      projectName: "yona",
      state: "open",
      title: "v1",
    });
    createMilestoneMock.mockResolvedValue({
      contents: "desc",
      dueDate: null,
      milestoneId: 2,
      ownerName: "yobi",
      projectName: "yona",
      state: "open",
      title: "v2",
    });
    updateMilestoneMock.mockResolvedValue({
      contents: "desc2",
      dueDate: null,
      milestoneId: 2,
      ownerName: "yobi",
      projectName: "yona",
      state: "closed",
      title: "v2",
    });
    deleteMilestoneMock.mockResolvedValue(undefined);

    const caller = createMilestoneCaller(createContext("session-token"));

    await expect(
      caller.listMilestones({ ownerName: "yobi", projectName: "yona" }),
    ).resolves.toHaveLength(1);
    await expect(
      caller.readMilestoneDetail({ milestoneId: 1, ownerName: "yobi", projectName: "yona" }),
    ).resolves.toMatchObject({ title: "v1" });
    await expect(
      caller.createMilestone({
        contents: "desc",
        dueDate: null,
        ownerName: "yobi",
        projectName: "yona",
        state: "open",
        title: "v2",
      }),
    ).resolves.toMatchObject({ milestoneId: 2 });
    await expect(
      caller.updateMilestone({
        contents: "desc2",
        dueDate: null,
        milestoneId: 2,
        ownerName: "yobi",
        projectName: "yona",
        state: "closed",
        title: "v2",
      }),
    ).resolves.toMatchObject({ state: "closed" });
    await expect(
      caller.deleteMilestone({ milestoneId: 2, ownerName: "yobi", projectName: "yona" }),
    ).resolves.toBe(true);
  });
});
