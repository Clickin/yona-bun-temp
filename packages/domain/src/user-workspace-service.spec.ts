import { describe, expect, it, vi } from "vitest";
import {
  readMyFavorites,
  readMyRecentProjects,
  readPublicUserProfile,
  recordRecentProjectVisit,
  toggleFavoriteProject,
  updateProjectNotificationPreference,
} from "./user-workspace-service";
import { DomainPermissionError } from "./errors";

const authenticatedActor = {
  actorId: 7,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "doortts",
};

describe("user workspace service", () => {
  it("requires authentication for personal workspace procedures", async () => {
    const anonymousActor = {
      actorId: null,
      isAnonymous: true,
      isSiteAdmin: false,
      loginId: null,
    };

    await expect(readMyFavorites(anonymousActor)).rejects.toBeInstanceOf(DomainPermissionError);
  });

  it("toggles favorite projects and records recent visits", async () => {
    const deps = {
      listFavoriteProjectsForUser: vi.fn().mockResolvedValue([
        {
          ownerName: "yona",
          projectName: "yona",
        },
      ]),
      listNotificationsForUser: vi.fn().mockResolvedValue([]),
      listRecentProjectsForUser: vi.fn().mockResolvedValue([
        {
          ownerName: "yona",
          projectName: "yona",
        },
      ]),
      readUserPublicProfileByLoginId: vi.fn(),
      setProjectNotificationAllowed: vi.fn().mockResolvedValue({
        allowed: true,
        notificationType: "watch",
        ownerName: "yona",
        projectName: "yona",
      }),
      toggleFavoriteProjectForUser: vi.fn().mockResolvedValue({
        favorited: true,
        ownerName: "yona",
        projectName: "yona",
      }),
      trackRecentProjectVisitForUser: vi.fn().mockResolvedValue({
        ownerName: "yona",
        projectName: "yona",
      }),
    };

    await expect(
      toggleFavoriteProject(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "yona",
        },
        deps,
      ),
    ).resolves.toMatchObject({
      favorited: true,
      ownerName: "yona",
      projectName: "yona",
    });

    await expect(
      recordRecentProjectVisit(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "yona",
        },
        deps,
      ),
    ).resolves.toMatchObject({
      ownerName: "yona",
      projectName: "yona",
    });

    await expect(readMyRecentProjects(authenticatedActor, deps)).resolves.toEqual([
      {
        ownerName: "yona",
        projectName: "yona",
      },
    ]);
  });

  it("updates project notification preferences", async () => {
    const deps = {
      listFavoriteProjectsForUser: vi.fn(),
      listNotificationsForUser: vi.fn(),
      listRecentProjectsForUser: vi.fn(),
      readUserPublicProfileByLoginId: vi.fn(),
      setProjectNotificationAllowed: vi.fn().mockResolvedValue({
        allowed: false,
        notificationType: "watch",
        ownerName: "yona",
        projectName: "yona",
      }),
      toggleFavoriteProjectForUser: vi.fn(),
      trackRecentProjectVisitForUser: vi.fn(),
    };

    await expect(
      updateProjectNotificationPreference(
        authenticatedActor,
        {
          allowed: false,
          notificationType: "watch",
          ownerName: "yona",
          projectName: "yona",
        },
        deps,
      ),
    ).resolves.toEqual({
      allowed: false,
      notificationType: "watch",
      ownerName: "yona",
      projectName: "yona",
    });
  });

  it("reads public user profile by login id", async () => {
    const deps = {
      listFavoriteProjectsForUser: vi.fn(),
      listNotificationsForUser: vi.fn(),
      listRecentProjectsForUser: vi.fn(),
      readUserPublicProfileByLoginId: vi.fn().mockResolvedValue({
        joinedAt: null,
        loginId: "doortts",
        userLabel: "Door TTS",
      }),
      setProjectNotificationAllowed: vi.fn(),
      toggleFavoriteProjectForUser: vi.fn(),
      trackRecentProjectVisitForUser: vi.fn(),
    };

    await expect(readPublicUserProfile({ loginId: "doortts" }, deps)).resolves.toEqual({
      joinedAt: null,
      loginId: "doortts",
      userLabel: "Door TTS",
    });
  });
});
