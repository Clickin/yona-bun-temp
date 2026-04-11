import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import {
  n4user,
  organization,
  organizationUser,
  project,
  projectUser,
  role,
  userEnrolledOrganization,
  userEnrolledProject,
} from "@drizzle/sqlite/schema";
import {
  createEnrollmentRequest,
  createOrganizationEnrollmentRequest,
  createProjectRecord,
  deleteEnrollmentRequest,
  deleteOrganizationEnrollmentRequest,
  organizationNameExists,
  projectIdentifierExists,
  readEnrollmentRequest,
  readOrganizationByName,
  readOrganizationEnrollmentRequest,
  readOrganizationMembers,
  readProjectByOwnerAndName,
  readProjectMembers,
  updateOrganizationRecord,
  updateProjectRecord,
} from "./org-project";
import { applySqliteMigrations } from "./test-helpers";
import { setupSQLiteTestDatabase } from "./test-utils/database";

describe("organization and project helpers", () => {
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
    await db.insert(role).values([
      { active: true, id: 1, name: "manager" },
      { active: true, id: 2, name: "member" },
      { active: true, id: 6, name: "org_admin" },
      { active: true, id: 7, name: "org_member" },
    ]);
  });

  afterAll(async () => {
    await closeDatabaseClient();
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

  it("creates, reads, and deletes enrollment requests idempotently", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "enroller@example.com",
      id: 401,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "enroller",
      name: "Enroller",
      token: null,
    });
    await db.insert(project).values({
      id: 402,
      name: "project-enrollment",
      organizationId: null,
      overview: "project enrollment",
      owner: "owner",
      projectScope: "public",
      vcs: "GIT",
    });

    await expect(createEnrollmentRequest(402, 401, db as never)).resolves.toEqual({
      projectId: 402,
      userId: 401,
    });
    await expect(createEnrollmentRequest(402, 401, db as never)).resolves.toEqual({
      projectId: 402,
      userId: 401,
    });
    await expect(readEnrollmentRequest(402, 401, db as never)).resolves.toEqual({
      projectId: 402,
      userId: 401,
    });

    const requests = await db
      .select()
      .from(userEnrolledProject)
      .where(eq(userEnrolledProject.projectId, 402));
    expect(requests).toHaveLength(1);

    await deleteEnrollmentRequest(402, 401, db as never);

    await expect(readEnrollmentRequest(402, 401, db as never)).resolves.toBeNull();
  });
  it("creates, reads, and deletes organization enrollment requests idempotently", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "org-enroller@example.com",
      id: 425,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "org-enroller",
      name: "Org Enroller",
      token: null,
    });
    await db.insert(organization).values({
      descr: "organization enrollment",
      id: 426,
      name: "org-enrollment",
    });

    await expect(createOrganizationEnrollmentRequest(426, 425, db as never)).resolves.toEqual({
      organizationId: 426,
      userId: 425,
    });
    await expect(createOrganizationEnrollmentRequest(426, 425, db as never)).resolves.toEqual({
      organizationId: 426,
      userId: 425,
    });
    await expect(readOrganizationEnrollmentRequest(426, 425, db as never)).resolves.toEqual({
      organizationId: 426,
      userId: 425,
    });

    const requests = await db
      .select()
      .from(userEnrolledOrganization)
      .where(eq(userEnrolledOrganization.organizationId, 426));
    expect(requests).toHaveLength(1);

    await deleteOrganizationEnrollmentRequest(426, 425, db as never);
    await deleteOrganizationEnrollmentRequest(426, 425, db as never);

    await expect(readOrganizationEnrollmentRequest(426, 425, db as never)).resolves.toBeNull();
  });

  it("reads project members together with pending enrollment requests", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "project-manager@example.com",
        id: 410,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "project-manager",
        name: "A Manager",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "project-member@example.com",
        id: 411,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "project-member",
        name: "B Member",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "project-pending@example.com",
        id: 412,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "project-pending",
        name: "C Pending",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "project-accepted@example.com",
        id: 413,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "project-accepted",
        name: "D Accepted",
        token: null,
      },
    ]);
    await db.insert(project).values({
      id: 414,
      name: "member-directory-project",
      organizationId: null,
      overview: "member directory",
      owner: "owner",
      projectScope: "private",
      vcs: "GIT",
    });
    await db.insert(projectUser).values([
      { projectId: 414, roleId: 1, userId: 410 },
      { projectId: 414, roleId: 2, userId: 411 },
      { projectId: 414, roleId: 2, userId: 413 },
    ]);
    await db.insert(userEnrolledProject).values([
      { projectId: 414, userId: 412 },
      { projectId: 414, userId: 413 },
    ]);

    await expect(readProjectMembers(414, db as never)).resolves.toEqual({
      enrollmentRequests: [
        {
          loginId: "project-pending",
          userLabel: "C Pending",
        },
      ],
      members: [
        {
          loginId: "project-manager",
          role: "manager",
          userLabel: "A Manager",
        },
        {
          loginId: "project-member",
          role: "member",
          userLabel: "B Member",
        },
        {
          loginId: "project-accepted",
          role: "member",
          userLabel: "D Accepted",
        },
      ],
    });
  });

  it("reads organization members together with pending enrollment requests", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "org-admin@example.com",
        id: 420,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "org-admin",
        name: "A Admin",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "org-member@example.com",
        id: 421,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "org-member",
        name: "B Member",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "org-pending@example.com",
        id: 422,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "org-pending",
        name: "C Pending",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "org-accepted@example.com",
        id: 423,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "org-accepted",
        name: "D Accepted",
        token: null,
      },
    ]);
    await db.insert(organization).values({
      descr: "member organization",
      id: 424,
      name: "member-org",
    });
    await db.insert(organizationUser).values([
      { organizationId: 424, roleId: 6, userId: 420 },
      { organizationId: 424, roleId: 7, userId: 421 },
      { organizationId: 424, roleId: 7, userId: 423 },
    ]);
    await db.insert(userEnrolledOrganization).values([
      { organizationId: 424, userId: 422 },
      { organizationId: 424, userId: 423 },
    ]);

    await expect(readOrganizationMembers(424, db as never)).resolves.toEqual({
      enrollmentRequests: [
        {
          loginId: "org-pending",
          userLabel: "C Pending",
        },
      ],
      members: [
        {
          loginId: "org-admin",
          role: "org_admin",
          userLabel: "A Admin",
        },
        {
          loginId: "org-member",
          role: "org_member",
          userLabel: "B Member",
        },
        {
          loginId: "org-accepted",
          role: "org_member",
          userLabel: "D Accepted",
        },
      ],
    });
  });
});

