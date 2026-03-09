import { beforeAll, describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { n4user, organization, project } from "@drizzle/sqlite/schema";
import {
  createProjectRecord,
  organizationNameExists,
  projectIdentifierExists,
  readOrganizationByName,
  readProjectByOwnerAndName,
  updateOrganizationRecord,
  updateProjectRecord,
} from "./org-project";
import { applySqliteMigrations } from "./test-helpers";
import { setupSQLiteTestDatabase } from "./test-utils/database";

describe("organization and project helpers", () => {
  let db: ReturnType<(typeof drizzle)["sqlite"]>;

  beforeAll(async () => {
    const setup = await setupSQLiteTestDatabase();
    db = (drizzle as any).sqlite(setup.url, {
      schema: await import("@drizzle/sqlite/schema"),
    });
    await applySqliteMigrations(db);
  });

  it("reads and updates organizations by public name while preserving org-owned project owners", async () => {
    await db.insert(organization).values({
      descr: "legacy org",
      id: 200,
      name: "labs",
    });
    await db.insert(project).values({
      id: 300,
      name: "projectYobi",
      organizationId: 200,
      owner: "labs",
      overview: "overview",
      projectScope: "public",
      vcs: "GIT",
    });

    await expect(readOrganizationByName("LABS", db as never)).resolves.toMatchObject({
      description: "legacy org",
      organizationName: "labs",
    });
    await expect(organizationNameExists("labs", {}, db as never)).resolves.toBe(true);

    await updateOrganizationRecord(
      {
        currentOrganizationName: "labs",
        description: "renamed org",
        organizationName: "weblabs",
      },
      db as never,
    );

    await expect(readOrganizationByName("weblabs", db as never)).resolves.toMatchObject({
      description: "renamed org",
      organizationName: "weblabs",
    });
    await expect(
      readProjectByOwnerAndName("weblabs", "projectYobi", db as never),
    ).resolves.toMatchObject({
      ownerName: "weblabs",
      projectName: "projectYobi",
    });
  });

  it("creates, reads, and checks conflicts for user-owned projects", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "yobi@example.com",
      id: 101,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "yobi",
      name: "Yobi",
      token: null,
    });

    const created = await createProjectRecord(
      {
        organizationId: null,
        organizationName: null,
        ownerName: "yobi",
        overview: "Yona project",
        projectName: "projectYobi",
        projectScope: "public",
      },
      db as never,
    );

    expect(created).toMatchObject({
      ownerName: "yobi",
      projectName: "projectYobi",
      projectScope: "public",
    });
    await expect(
      readProjectByOwnerAndName("YOBI", "PROJECTYOBI", db as never),
    ).resolves.toMatchObject({
      ownerName: "yobi",
      projectName: "projectYobi",
    });
    await expect(projectIdentifierExists("yobi", "projectYobi", {}, db as never)).resolves.toBe(
      true,
    );

    await updateProjectRecord(
      {
        currentOwnerName: "yobi",
        currentProjectName: "projectYobi",
        overview: "Updated overview",
        projectName: "projectYobi-1",
        projectScope: "private",
      },
      db as never,
    );

    await expect(
      readProjectByOwnerAndName("yobi", "projectYobi-1", db as never),
    ).resolves.toMatchObject({
      overview: "Updated overview",
      projectName: "projectYobi-1",
      projectScope: "private",
    });
  });
});
