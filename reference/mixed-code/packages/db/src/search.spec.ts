import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import type { SearchResult } from "@yona/contracts";
import {
  commentThread,
  issue,
  n4user,
  organization,
  organizationUser,
  posting,
  project,
  projectUser,
  reviewComment,
  role,
  searchDocument,
} from "@drizzle/sqlite/schema";
import { searchDocuments } from "./search";
import { applySqliteMigrations } from "./test-helpers";
import { setupSQLiteTestDatabase } from "./test-utils/database";

describe("search helpers", () => {
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

  it("filters hidden documents before ranking, counts, and pagination while keeping the bounded type set visible", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "visible-user@example.com",
        id: 1001,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "visible-user",
        name: "Visible User",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "hidden-user@example.com",
        id: 1002,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "hidden-user",
        name: "Hidden User",
        token: null,
      },
    ]);
    await db.insert(organization).values({
      descr: "Labs",
      id: 1100,
      name: "labs",
    });
    await db.insert(project).values([
      {
        id: 1201,
        name: "public-alpha",
        organizationId: 1100,
        overview: "Alpha public project",
        owner: "labs",
        projectScope: "public",
        vcs: "GIT",
      },
      {
        id: 1202,
        name: "private-alpha",
        organizationId: 1100,
        overview: "alpha alpha alpha private project",
        owner: "labs",
        projectScope: "private",
        vcs: "GIT",
      },
    ]);
    await db.insert(issue).values([
      {
        authorId: 1001,
        authorLoginId: "visible-user",
        authorName: "Visible User",
        body: "public alpha issue body",
        id: 1301,
        number: 1,
        projectId: 1201,
        title: "Public alpha issue",
      },
      {
        authorId: 1002,
        authorLoginId: "hidden-user",
        authorName: "Hidden User",
        body: "alpha alpha alpha secret issue body",
        id: 1302,
        number: 1,
        projectId: 1202,
        title: "Hidden alpha alpha alpha issue",
      },
    ]);
    await db.insert(posting).values([
      {
        authorId: 1001,
        authorLoginId: "visible-user",
        authorName: "Visible User",
        body: "public alpha posting body",
        id: 1401,
        number: 1,
        projectId: 1201,
        title: "Public alpha posting",
      },
      {
        authorId: 1002,
        authorLoginId: "hidden-user",
        authorName: "Hidden User",
        body: "alpha alpha alpha private posting body",
        id: 1402,
        number: 1,
        projectId: 1202,
        title: "Hidden alpha alpha alpha posting",
      },
    ]);
    await db.insert(commentThread).values([
      {
        createdDate: new Date(0),
        dtype: "NonRangedCodeCommentThread",
        id: 1501,
        projectId: 1201,
      },
      {
        createdDate: new Date(0),
        dtype: "NonRangedCodeCommentThread",
        id: 1502,
        projectId: 1202,
      },
    ]);
    await db.insert(reviewComment).values([
      {
        contents: "public alpha review body",
        id: 1601,
        threadId: 1501,
      },
      {
        contents: "alpha alpha alpha private review body",
        id: 1602,
        threadId: 1502,
      },
    ]);
    await db.insert(searchDocument).values([
      {
        accessScope: "public",
        body: "Public alpha user body",
        documentId: 1001,
        documentText: "Public alpha user body",
        documentType: "user",
        id: 1701,
        scopeKind: "global",
        title: "Visible User alpha",
      },
      {
        accessScope: "private_actor",
        body: "alpha alpha alpha hidden user body",
        documentId: 1002,
        documentText: "alpha alpha alpha hidden user body",
        documentType: "user",
        id: 1702,
        principalUserId: 1002,
        scopeKind: "global",
        title: "Hidden alpha alpha alpha user",
      },
      {
        accessScope: "public",
        body: "Alpha public project body",
        documentId: 1201,
        documentText: "Alpha public project body",
        documentType: "project",
        id: 1703,
        organizationId: 1100,
        projectId: 1201,
        scopeKind: "project",
        title: "Public alpha project",
      },
      {
        accessScope: "project_member",
        body: "alpha alpha alpha hidden project body",
        documentId: 1202,
        documentText: "alpha alpha alpha hidden project body",
        documentType: "project",
        id: 1704,
        organizationId: 1100,
        projectId: 1202,
        scopeKind: "project",
        title: "Hidden alpha alpha alpha project",
      },
      {
        accessScope: "public",
        body: "Alpha public issue body",
        documentId: 1301,
        documentText: "Alpha public issue body",
        documentType: "issue",
        id: 1705,
        organizationId: 1100,
        projectId: 1201,
        scopeKind: "project",
        title: "Public alpha issue",
      },
      {
        accessScope: "project_member",
        body: "alpha alpha alpha hidden issue body",
        documentId: 1302,
        documentText: "alpha alpha alpha hidden issue body",
        documentType: "issue",
        id: 1706,
        organizationId: 1100,
        projectId: 1202,
        scopeKind: "project",
        title: "Hidden alpha alpha alpha issue",
      },
      {
        accessScope: "public",
        body: "Alpha public posting body",
        documentId: 1401,
        documentText: "Alpha public posting body",
        documentType: "posting",
        id: 1707,
        organizationId: 1100,
        projectId: 1201,
        scopeKind: "project",
        title: "Public alpha posting",
      },
      {
        accessScope: "project_member",
        body: "alpha alpha alpha hidden posting body",
        documentId: 1402,
        documentText: "alpha alpha alpha hidden posting body",
        documentType: "posting",
        id: 1708,
        organizationId: 1100,
        projectId: 1202,
        scopeKind: "project",
        title: "Hidden alpha alpha alpha posting",
      },
      {
        accessScope: "public",
        body: "Alpha public review body",
        documentId: 1601,
        documentText: "Alpha public review body",
        documentType: "review_comment",
        id: 1709,
        organizationId: 1100,
        projectId: 1201,
        scopeKind: "project",
        title: "Public alpha review",
      },
      {
        accessScope: "project_member",
        body: "alpha alpha alpha hidden review body",
        documentId: 1602,
        documentText: "alpha alpha alpha hidden review body",
        documentType: "review_comment",
        id: 1710,
        organizationId: 1100,
        projectId: 1202,
        scopeKind: "project",
        title: "Hidden alpha alpha alpha review",
      },
    ]);

    const page = await searchDocuments(
      {
        pageSize: 5,
        query: "alpha",
        scope: "global",
      },
      {
        actorId: null,
        isSiteAdmin: false,
      },
      db as never,
    );

    expect(page.counts).toEqual({
      returned: 5,
      total: 5,
    });
    const itemTypes: SearchResult["type"][] = [];
    for (const item of page.items) {
      itemTypes.push(item.type);
    }

    expect(itemTypes.sort()).toEqual(["issue", "posting", "project", "review_comment", "user"]);
    expect(page.nextCursor).toBeNull();
  });

  it("keeps organization scope narrower than global and honors organization-member visibility", async () => {
    await db.insert(n4user).values([
      {
        createdDate: new Date(0),
        email: "org-viewer@example.com",
        id: 2001,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "org-viewer",
        name: "Org Viewer",
        token: null,
      },
      {
        createdDate: new Date(0),
        email: "org-person@example.com",
        id: 2002,
        isGuest: false,
        lastStateModifiedDate: new Date(0),
        loginId: "org-person",
        name: "Org Person",
        token: null,
      },
    ]);
    await db.insert(organization).values([
      { descr: "Labs", id: 2101, name: "scope-labs" },
      { descr: "Other", id: 2102, name: "scope-other" },
    ]);
    await db.insert(project).values([
      {
        id: 2201,
        name: "org-scope-project",
        organizationId: 2101,
        owner: "scope-labs",
        projectScope: "protected",
        vcs: "GIT",
      },
      {
        id: 2202,
        name: "other-scope-project",
        organizationId: 2102,
        owner: "scope-other",
        projectScope: "public",
        vcs: "GIT",
      },
    ]);
    await db.insert(organizationUser).values({
      organizationId: 2101,
      roleId: 7,
      userId: 2001,
    });
    await db.insert(searchDocument).values([
      {
        accessScope: "organization_member",
        body: "Scopeorg user body",
        documentId: 2002,
        documentText: "Scopeorg user body",
        documentType: "user",
        id: 2301,
        organizationId: 2101,
        scopeKind: "organization",
        title: "Scopeorg user",
      },
      {
        accessScope: "organization_member",
        body: "Scopeorg labs project body",
        documentId: 2201,
        documentText: "Scopeorg labs project body",
        documentType: "project",
        id: 2302,
        organizationId: 2101,
        projectId: 2201,
        scopeKind: "project",
        title: "Scopeorg labs project",
      },
      {
        accessScope: "public",
        body: "Scopeorg other project body",
        documentId: 2202,
        documentText: "Scopeorg other project body",
        documentType: "project",
        id: 2303,
        organizationId: 2102,
        projectId: 2202,
        scopeKind: "project",
        title: "Scopeorg other project",
      },
    ]);

    const globalPage = await searchDocuments(
      {
        pageSize: 10,
        query: "Scopeorg",
        scope: "global",
      },
      {
        actorId: 2001,
        isSiteAdmin: false,
      },
      db as never,
    );
    const organizationPage = await searchDocuments(
      {
        organizationName: "scope-labs",
        pageSize: 10,
        query: "Scopeorg",
        scope: "organization",
      },
      {
        actorId: 2001,
        isSiteAdmin: false,
      },
      db as never,
    );

    expect(globalPage.counts.total).toBe(3);
    expect(organizationPage.counts.total).toBe(2);
    expect(organizationPage.items).toEqual([
      {
        ownerName: "scope-labs",
        projectName: "org-scope-project",
        scope: "organization",
        snippets: ["Scopeorg labs project body"],
        type: "project",
      },
      {
        loginId: "org-person",
        scope: "organization",
        snippets: ["Scopeorg user body"],
        type: "user",
        userLabel: "Org Person",
      },
    ]);
  });

  it("keeps project scope narrower than organization and includes project-member-only documents only for members", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "project-viewer@example.com",
      id: 3001,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "project-viewer",
      name: "Project Viewer",
      token: null,
    });
    await db.insert(organization).values({
      descr: "Project Scope Org",
      id: 3101,
      name: "project-scope-org",
    });
    await db.insert(project).values([
      {
        id: 3201,
        name: "member-project",
        organizationId: 3101,
        owner: "project-scope-org",
        projectScope: "private",
        vcs: "GIT",
      },
      {
        id: 3202,
        name: "sibling-project",
        organizationId: 3101,
        owner: "project-scope-org",
        projectScope: "public",
        vcs: "GIT",
      },
    ]);
    await db.insert(projectUser).values({
      projectId: 3201,
      roleId: 2,
      userId: 3001,
    });
    await db.insert(issue).values({
      authorId: 3001,
      authorLoginId: "project-viewer",
      authorName: "Project Viewer",
      body: "membertoken issue body",
      id: 3301,
      number: 7,
      projectId: 3201,
      title: "membertoken issue",
    });
    await db.insert(posting).values({
      authorId: 3001,
      authorLoginId: "project-viewer",
      authorName: "Project Viewer",
      body: "membertoken sibling posting body",
      id: 3302,
      number: 8,
      projectId: 3202,
      title: "membertoken sibling posting",
    });
    await db.insert(searchDocument).values([
      {
        accessScope: "project_member",
        body: "membertoken issue body",
        documentId: 3301,
        documentText: "membertoken issue body",
        documentType: "issue",
        id: 3401,
        organizationId: 3101,
        projectId: 3201,
        scopeKind: "project",
        title: "membertoken issue",
      },
      {
        accessScope: "public",
        body: "membertoken sibling posting body",
        documentId: 3302,
        documentText: "membertoken sibling posting body",
        documentType: "posting",
        id: 3402,
        organizationId: 3101,
        projectId: 3202,
        scopeKind: "project",
        title: "membertoken sibling posting",
      },
    ]);

    const organizationPage = await searchDocuments(
      {
        organizationName: "project-scope-org",
        pageSize: 10,
        query: "membertoken",
        scope: "organization",
      },
      {
        actorId: 3001,
        isSiteAdmin: false,
      },
      db as never,
    );
    const projectPage = await searchDocuments(
      {
        ownerName: "project-scope-org",
        pageSize: 10,
        projectName: "member-project",
        query: "membertoken",
        scope: "project",
      },
      {
        actorId: 3001,
        isSiteAdmin: false,
      },
      db as never,
    );

    expect(organizationPage.counts.total).toBe(2);
    expect(projectPage.counts.total).toBe(1);
    expect(projectPage.items).toEqual([
      {
        issueNumber: 7,
        ownerName: "project-scope-org",
        projectName: "member-project",
        scope: "project",
        snippets: ["membertoken issue body"],
        title: "membertoken issue",
        type: "issue",
      },
    ]);
  });

  it("matches bounded search case-insensitively and preserves original snippet casing", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "caps-user@example.com",
      id: 4001,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "caps-user",
      name: "Caps User",
      token: null,
    });
    await db.insert(searchDocument).values({
      accessScope: "public",
      body: "Capsalpha review body",
      documentId: 4001,
      documentText: "Capsalpha review body",
      documentType: "user",
      id: 4002,
      scopeKind: "global",
      title: "Capsalpha Reviewer",
    });

    const page = await searchDocuments(
      {
        pageSize: 10,
        query: "capsalpha",
        scope: "global",
        types: ["user"],
      },
      {
        actorId: null,
        isSiteAdmin: false,
      },
      db as never,
    );

    expect(page.counts.total).toBe(1);
    expect(page.items).toEqual([
      {
        loginId: "caps-user",
        scope: "global",
        snippets: ["Capsalpha review body"],
        type: "user",
        userLabel: "Caps User",
      },
    ]);
  });
});
