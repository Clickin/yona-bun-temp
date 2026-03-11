import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import {
  n4user,
  notificationEvent,
  notificationEventN4user,
  project,
  recentProject,
  userProjectNotification,
} from "@drizzle/sqlite/schema";
import {
  listFavoriteProjectsForUser,
  listNotificationsForUser,
  listRecentProjectsForUser,
  readUserPublicProfileByLoginId,
  setProjectNotificationAllowed,
  toggleFavoriteProjectForUser,
  trackRecentProjectVisitForUser,
} from "./personal-workspace";
import { applySqliteMigrations } from "./test-helpers";
import { setupSQLiteTestDatabase } from "./test-utils/database";

describe("personal workspace helpers", () => {
  let db: ReturnType<(typeof drizzle)["sqlite"]>;

  const closeDatabaseClient = async () => {
    const client = db.$client as {
      close?: () => Promise<void> | void;
      end?: () => Promise<void> | void;
    };
    if (typeof client.close === "function") {
      await client.close();
      return;
    }

    if (typeof client.end === "function") {
      await client.end();
    }
  };

  beforeAll(async () => {
    const setup = await setupSQLiteTestDatabase();
    db = (drizzle as any).sqlite(setup.url, {
      schema: await import("@drizzle/sqlite/schema"),
    });
    await applySqliteMigrations(db);
  });

  afterAll(async () => {
    await closeDatabaseClient();
  });

  it("reads public profile and toggles favorites", async () => {
    await db.insert(n4user).values({
      createdDate: new Date("2026-03-10T00:00:00.000Z"),
      email: "profile@example.com",
      id: 910,
      isGuest: false,
      lastStateModifiedDate: new Date("2026-03-10T00:00:00.000Z"),
      loginId: "profile-user",
      name: "Profile User",
      token: null,
    });
    await db.insert(project).values({
      id: 911,
      name: "profile-project",
      organizationId: null,
      owner: "profile-user",
      projectScope: "public",
      vcs: "GIT",
    });

    await expect(
      readUserPublicProfileByLoginId("PROFILE-USER", db as never),
    ).resolves.toMatchObject({
      loginId: "profile-user",
      userLabel: "Profile User",
    });

    await expect(
      toggleFavoriteProjectForUser(
        910,
        {
          ownerName: "profile-user",
          projectName: "profile-project",
        },
        db as never,
      ),
    ).resolves.toEqual({
      favorited: true,
      ownerName: "profile-user",
      projectName: "profile-project",
    });

    await expect(listFavoriteProjectsForUser(910, db as never)).resolves.toEqual([
      {
        ownerName: "profile-user",
        projectName: "profile-project",
      },
    ]);

    await expect(
      toggleFavoriteProjectForUser(
        910,
        {
          ownerName: "profile-user",
          projectName: "profile-project",
        },
        db as never,
      ),
    ).resolves.toEqual({
      favorited: false,
      ownerName: "profile-user",
      projectName: "profile-project",
    });
  });

  it("tracks recent projects, notifications, and notification settings", async () => {
    await db.insert(n4user).values({
      createdDate: new Date("2026-03-10T00:00:00.000Z"),
      email: "recent@example.com",
      id: 920,
      isGuest: false,
      lastStateModifiedDate: new Date("2026-03-10T00:00:00.000Z"),
      loginId: "recent-user",
      name: "Recent User",
      token: null,
    });
    await db.insert(project).values({
      id: 921,
      name: "recent-project",
      organizationId: null,
      owner: "recent-user",
      projectScope: "public",
      vcs: "GIT",
    });
    await db.insert(notificationEvent).values({
      created: new Date("2026-03-10T00:00:00.000Z"),
      id: 922,
      title: "Project updated",
    });
    await db.insert(notificationEventN4user).values({
      n4userId: 920,
      notificationEventId: 922,
    });

    await expect(
      trackRecentProjectVisitForUser(
        920,
        {
          ownerName: "recent-user",
          projectName: "recent-project",
        },
        db as never,
      ),
    ).resolves.toEqual({
      ownerName: "recent-user",
      projectName: "recent-project",
    });

    await expect(listRecentProjectsForUser(920, db as never)).resolves.toEqual([
      {
        ownerName: "recent-user",
        projectName: "recent-project",
      },
    ]);
    await expect(listNotificationsForUser(920, db as never)).resolves.toEqual([
      {
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        eventId: 922,
        eventType: null,
        resourceId: null,
        resourceType: null,
        title: "Project updated",
      },
    ]);

    await expect(
      setProjectNotificationAllowed(
        920,
        {
          allowed: true,
          notificationType: "watch",
          ownerName: "recent-user",
          projectName: "recent-project",
        },
        db as never,
      ),
    ).resolves.toEqual({
      allowed: true,
      notificationType: "watch",
      ownerName: "recent-user",
      projectName: "recent-project",
    });

    const rows = await db
      .select()
      .from(userProjectNotification)
      .where(eq(userProjectNotification.userId, 920));
    expect(rows).toHaveLength(1);

    const recentRows = await db.select().from(recentProject).where(eq(recentProject.userId, 920));
    expect(recentRows).toHaveLength(1);
  });
});
