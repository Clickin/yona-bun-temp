import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createProjectMock,
  listProjectMembersMock,
  readCurrentSessionMock,
  readProjectDetailMock,
  readProjectSettingsMock,
  updateProjectMock,
} = vi.hoisted(() => ({
  createProjectMock: vi.fn(),
  listProjectMembersMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
  readProjectDetailMock: vi.fn(),
  readProjectSettingsMock: vi.fn(),
  updateProjectMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    createProject: createProjectMock,
    listProjectMembers: listProjectMembersMock,
    readProjectDetail: readProjectDetailMock,
    readProjectSettings: readProjectSettingsMock,
    updateProject: updateProjectMock,
  };
});

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    readCurrentSession: readCurrentSessionMock,
  };
});

import { DomainPermissionError } from "@yona/domain";
import { createProjectCaller } from "./project-trpc";

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

describe("project tRPC", () => {
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

  it("keeps create validation and auth at the tRPC boundary", async () => {
    readCurrentSessionMock.mockResolvedValueOnce({
      clearCookie: false,
      projection: {
        actorId: null,
        emailAddress: null,
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: null,
        userLabel: null,
      },
      sessionRecord: null,
      token: null,
      user: null,
    });
    createProjectMock.mockRejectedValueOnce(
      new DomainPermissionError("Authentication required.", {
        requiresAuthentication: true,
      }),
    );

    await expect(
      createProjectCaller(createContext()).createProject({
        ownerName: "yobi",
        overview: "Yona",
        projectName: "projectYobi",
        projectScope: "public",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    await expect(
      createProjectCaller(createContext("session-token")).createProject({
        ownerName: "yobi",
        overview: "bad",
        projectName: ".git",
        projectScope: "public",
      }),
    ).rejects.toBeTruthy();
  });

  it("creates, reads, and updates projects through the domain service using public identifiers", async () => {
    createProjectMock.mockResolvedValueOnce({
      organizationName: null,
      ownerName: "yobi",
      overview: "Yona",
      projectName: "projectYobi",
      projectScope: "public",
      viewerCanUpdate: true,
    });
    readProjectDetailMock.mockResolvedValueOnce({
      organizationName: null,
      ownerName: "yobi",
      overview: "Yona",
      projectName: "projectYobi",
      projectScope: "public",
      viewerCanUpdate: true,
    });
    updateProjectMock.mockResolvedValueOnce({
      organizationName: null,
      ownerName: "yobi",
      overview: "Updated",
      projectName: "projectYobi-1",
      projectScope: "private",
      viewerCanUpdate: true,
    });
    listProjectMembersMock.mockResolvedValueOnce({
      enrollmentRequests: [
        {
          loginId: "guest-user",
          userLabel: "Guest User",
        },
      ],
      members: [
        {
          loginId: "yobi",
          role: "manager",
          userLabel: "Yobi",
        },
      ],
    });

    const caller = createProjectCaller(createContext("session-token"));

    await expect(
      caller.createProject({
        ownerName: "yobi",
        overview: "Yona",
        projectName: "projectYobi",
        projectScope: "public",
      }),
    ).resolves.toMatchObject({
      ownerName: "yobi",
      projectName: "projectYobi",
    });

    await expect(
      caller.readProjectDetail({
        ownerName: "yobi",
        projectName: "projectYobi",
      }),
    ).resolves.toMatchObject({
      ownerName: "yobi",
      projectName: "projectYobi",
      projectScope: "public",
    });

    await expect(
      caller.readProjectMembers({
        ownerName: "yobi",
        projectName: "projectYobi",
      }),
    ).resolves.toEqual({
      enrollmentRequests: [
        {
          loginId: "guest-user",
          userLabel: "Guest User",
        },
      ],
      members: [
        {
          loginId: "yobi",
          role: "manager",
          userLabel: "Yobi",
        },
      ],
    });

    await expect(
      caller.updateProject({
        currentOwnerName: "yobi",
        currentProjectName: "projectYobi",
        overview: "Updated",
        projectName: "projectYobi-1",
        projectScope: "private",
      }),
    ).resolves.toMatchObject({
      ownerName: "yobi",
      projectName: "projectYobi-1",
      projectScope: "private",
    });
  });
});
