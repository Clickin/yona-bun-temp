import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  readMyDefaultLandingPreferenceMock,
  readMyFavoritesMock,
  readMyNotificationsMock,
  readMyRecentProjectsMock,
  readMySidebarMock,
  readCurrentSessionMock,
  readPublicUserProfileMock,
  recordRecentProjectVisitMock,
  setMyDefaultLandingPreferenceMock,
  toggleFavoriteProjectMock,
  updateProjectNotificationPreferenceMock,
} = vi.hoisted(() => ({
  readMyDefaultLandingPreferenceMock: vi.fn(),
  readMyFavoritesMock: vi.fn(),
  readMyNotificationsMock: vi.fn(),
  readMyRecentProjectsMock: vi.fn(),
  readMySidebarMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
  readPublicUserProfileMock: vi.fn(),
  recordRecentProjectVisitMock: vi.fn(),
  setMyDefaultLandingPreferenceMock: vi.fn(),
  toggleFavoriteProjectMock: vi.fn(),
  updateProjectNotificationPreferenceMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    readMyDefaultLandingPreference: readMyDefaultLandingPreferenceMock,
    readMyFavorites: readMyFavoritesMock,
    readMyNotifications: readMyNotificationsMock,
    readMyRecentProjects: readMyRecentProjectsMock,
    readMySidebar: readMySidebarMock,
    readPublicUserProfile: readPublicUserProfileMock,
    recordRecentProjectVisit: recordRecentProjectVisitMock,
    setMyDefaultLandingPreference: setMyDefaultLandingPreferenceMock,
    toggleFavoriteProject: toggleFavoriteProjectMock,
    updateProjectNotificationPreference: updateProjectNotificationPreferenceMock,
  };
});

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    readCurrentSession: readCurrentSessionMock,
  };
});

import { createMeCaller } from "./me-trpc";

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

describe("me tRPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readCurrentSessionMock.mockResolvedValue({
      clearCookie: false,
      projection: {
        actorId: 2,
        defaultLandingPath: null,
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

  it("reads sidebar, default landing, and profile projections", async () => {
    readMySidebarMock.mockResolvedValue({
      favorites: [{ ownerName: "yona", projectName: "yona" }],
      recentProjects: [{ ownerName: "yona", projectName: "yona" }],
    });
    readMyDefaultLandingPreferenceMock.mockResolvedValue({
      path: "/me",
    });
    readPublicUserProfileMock.mockResolvedValue({
      joinedAt: null,
      loginId: "yobi",
      userLabel: "Yobi",
    });

    const caller = createMeCaller(createContext("session-token"));

    await expect(caller.readMySidebar()).resolves.toEqual({
      favorites: [{ ownerName: "yona", projectName: "yona" }],
      recentProjects: [{ ownerName: "yona", projectName: "yona" }],
    });

    await expect(caller.readMyDefaultLandingPreference()).resolves.toEqual({
      path: "/me",
    });

    await expect(caller.readPublicUserProfile({ loginId: "yobi" })).resolves.toEqual({
      joinedAt: null,
      loginId: "yobi",
      userLabel: "Yobi",
    });
  });

  it("executes favorite/recent/default-landing/notification mutations", async () => {
    toggleFavoriteProjectMock.mockResolvedValue({
      favorited: true,
      ownerName: "yona",
      projectName: "yona",
    });
    recordRecentProjectVisitMock.mockResolvedValue({
      ownerName: "yona",
      projectName: "yona",
    });
    setMyDefaultLandingPreferenceMock.mockResolvedValue({
      path: "/search?pageSize=20&scope=global&query=yona",
    });
    updateProjectNotificationPreferenceMock.mockResolvedValue({
      allowed: true,
      notificationType: "watch",
      ownerName: "yona",
      projectName: "yona",
    });
    readMyFavoritesMock.mockResolvedValue([{ ownerName: "yona", projectName: "yona" }]);
    readMyRecentProjectsMock.mockResolvedValue([{ ownerName: "yona", projectName: "yona" }]);
    readMyNotificationsMock.mockResolvedValue([]);

    const caller = createMeCaller(createContext("session-token"));

    await expect(
      caller.toggleFavoriteProject({ ownerName: "yona", projectName: "yona" }),
    ).resolves.toMatchObject({ favorited: true });
    await expect(
      caller.recordRecentProjectVisit({ ownerName: "yona", projectName: "yona" }),
    ).resolves.toEqual({ ownerName: "yona", projectName: "yona" });
    await expect(
      caller.setMyDefaultLandingPreference({ path: "/search?pageSize=20&scope=global&query=yona" }),
    ).resolves.toEqual({
      path: "/search?pageSize=20&scope=global&query=yona",
    });
    await expect(
      caller.updateProjectNotificationPreference({
        allowed: true,
        notificationType: "watch",
        ownerName: "yona",
        projectName: "yona",
      }),
    ).resolves.toMatchObject({ allowed: true });
    await expect(caller.readMyFavorites()).resolves.toEqual([
      { ownerName: "yona", projectName: "yona" },
    ]);
    await expect(caller.readMyRecentProjects()).resolves.toEqual([
      { ownerName: "yona", projectName: "yona" },
    ]);
    await expect(caller.readMyNotifications()).resolves.toEqual([]);
  });
});
