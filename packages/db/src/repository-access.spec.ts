import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import {
  n4user,
  organization,
  organizationUser,
  project,
  projectUser,
  role,
  siteAdmin,
} from "@drizzle/sqlite/schema";
import { loadRepositoryAccessFacts } from "./index";
import { setupSQLiteTestDatabase } from "./test-utils/database";
import { applySqliteMigrations } from "./test-helpers";

describe("repository access facts", () => {
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
      { id: 1, active: true, name: "manager" },
      { id: 2, active: true, name: "member" },
      { id: 6, active: true, name: "org_admin" },
      { id: 7, active: true, name: "org_member" },
    ]);
  });

  afterAll(async () => {
    await closeDatabaseClient();
  });

  it("loads protected-project access for an organization member", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "member@example.com",
      id: 100,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "member",
      name: "Member",
      token: null,
    });
    await db.insert(organization).values({
      id: 200,
      name: "org",
    });
    await db.insert(project).values({
      id: 300,
      isCodeAccessibleMemberOnly: false,
      name: "protected-project",
      organizationId: 200,
      owner: "org",
      projectScope: "protected",
      vcs: "GIT",
    });
    await db.insert(organizationUser).values({
      organizationId: 200,
      roleId: 7,
      userId: 100,
    });

    const facts = await loadRepositoryAccessFacts("300", 100, db as never);
    expect(facts).toMatchObject({
      isGitRepository: true,
      isAnonymous: false,
      isOrganizationAdmin: false,
      isOrganizationMember: true,
      isProjectMember: false,
      projectId: 300,
      projectScope: "protected",
    });
  });

  it("keeps private-project access narrower than protected-project access", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "member2@example.com",
        id: 101,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "member2",
        name: "Member Two",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "manager@example.com",
        id: 102,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "manager",
        name: "Manager",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "admin@example.com",
        id: 103,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "site-admin",
        name: "Site Admin",
        token: null,
      },
    ]);
    await db.insert(project).values({
      id: 301,
      isCodeAccessibleMemberOnly: true,
      name: "private-project",
      organizationId: 200,
      owner: "org",
      projectScope: "private",
      vcs: "GIT",
    });
    await db.insert(organizationUser).values({
      organizationId: 200,
      roleId: 7,
      userId: 101,
    });
    await db.insert(projectUser).values({
      projectId: 301,
      roleId: 1,
      userId: 102,
    });
    await db.insert(siteAdmin).values({
      adminId: 103,
    });

    const orgMemberFacts = await loadRepositoryAccessFacts("301", 101, db as never);
    expect(orgMemberFacts).toMatchObject({
      isGitRepository: true,
      isCodeAccessibleMemberOnly: true,
      isOrganizationMember: true,
      isProjectManager: false,
      projectScope: "private",
    });
    const projectManagerFacts = await loadRepositoryAccessFacts("301", 102, db as never);
    expect(projectManagerFacts).toMatchObject({
      isProjectManager: true,
    });
    const siteAdminFacts = await loadRepositoryAccessFacts("301", 103, db as never);
    expect(siteAdminFacts).toMatchObject({
      isSiteAdmin: true,
    });
    const anonymousFacts = await loadRepositoryAccessFacts("301", null, db as never);
    expect(anonymousFacts).toMatchObject({
      isAnonymous: true,
      projectScope: "private",
    });
  });

  it("normalizes uppercase legacy project scope values", async () => {
    await db.insert(project).values({
      id: 302,
      isCodeAccessibleMemberOnly: false,
      name: "legacy-public-project",
      owner: "legacy",
      projectScope: "PUBLIC",
      vcs: "GIT",
    });

    await expect(loadRepositoryAccessFacts("302", null, db as never)).resolves.toMatchObject({
      isGitRepository: true,
      isAnonymous: true,
      projectId: 302,
      projectScope: "public",
    });
  });

  it("marks non-git projects so protocol routes can normalize them to 404", async () => {
    await db.insert(project).values({
      id: 303,
      isCodeAccessibleMemberOnly: false,
      name: "legacy-svn-project",
      owner: "legacy",
      projectScope: "public",
      vcs: "SVN",
    });

    await expect(loadRepositoryAccessFacts("303", null, db as never)).resolves.toMatchObject({
      isAnonymous: true,
      isGitRepository: false,
      projectId: 303,
    });
  });
});
