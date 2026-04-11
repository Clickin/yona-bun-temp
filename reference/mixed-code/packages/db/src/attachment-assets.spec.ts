import { beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/bun-sql";
import {
  attachment,
  issue,
  n4user,
  organization,
  organizationUser,
  project,
  role,
} from "@drizzle/sqlite/schema";
import {
  loadAttachmentAssetRecord,
  loadAttachmentProjectMembershipFacts,
  type AttachmentProjectBindingRecord,
} from "./index";
import { setupSQLiteTestDatabase } from "./test-utils/database";
import { applySqliteMigrations } from "./test-helpers";

describe("attachment asset readers", () => {
  let db: ReturnType<(typeof drizzle)["sqlite"]>;

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

  it("resolves issue-bound attachments to project binding context", async () => {
    await db.insert(organization).values({
      id: 200,
      name: "asset-org",
    });
    await db.insert(project).values({
      id: 300,
      name: "protected-assets",
      organizationId: 200,
      owner: "asset-org",
      projectScope: "protected",
      vcs: "GIT",
    });
    await db.insert(issue).values({
      id: 400,
      number: 1,
      projectId: 300,
      title: "Asset issue",
    });
    await db.insert(attachment).values({
      containerId: 400,
      containerType: "issue_post",
      hash: "hash-issue-asset",
      id: 500,
      mimeType: "image/png",
      name: "capture.png",
      ownerLoginId: "maker",
      size: 12,
    });

    await expect(loadAttachmentAssetRecord("500", db as never)).resolves.toEqual({
      assetId: 500,
      binding: {
        kind: "project",
        containerId: 400,
        containerType: "issue_post",
        organizationId: 200,
        projectId: 300,
        projectScope: "protected",
      },
      fileName: "capture.png",
      hash: "hash-issue-asset",
      mimeType: "image/png",
      size: 12,
    });
  });

  it("marks user-scoped uploads as temporary uploader-owned assets", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "uploader@example.com",
      id: 101,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "uploader",
      name: "Uploader",
      token: null,
    });
    await db.insert(attachment).values({
      containerId: 101,
      containerType: "user",
      hash: "hash-temp-asset",
      id: 501,
      mimeType: "text/plain",
      name: "draft.txt",
      ownerLoginId: "uploader",
      size: 9,
    });

    await expect(loadAttachmentAssetRecord("501", db as never)).resolves.toEqual({
      assetId: 501,
      binding: {
        kind: "temporary-upload",
        containerId: 101,
        containerType: "user",
        ownerLoginId: "uploader",
        ownerUserId: 101,
      },
      fileName: "draft.txt",
      hash: "hash-temp-asset",
      mimeType: "text/plain",
      size: 9,
    });
  });

  it("returns null when the bound resource is stale", async () => {
    await db.insert(attachment).values({
      containerId: 999,
      containerType: "issue_post",
      hash: "hash-stale-asset",
      id: 502,
      mimeType: "text/plain",
      name: "missing.txt",
      ownerLoginId: "uploader",
      size: 11,
    });

    await expect(loadAttachmentAssetRecord("502", db as never)).resolves.toBeNull();
  });

  it("loads project membership facts for project-bound assets", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "orgmember@example.com",
      id: 102,
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "orgmember",
      name: "Org Member",
      token: null,
    });
    await db.insert(organization).values({
      id: 201,
      name: "membership-org",
    });
    await db.insert(project).values({
      id: 301,
      name: "private-assets",
      organizationId: 201,
      owner: "membership-org",
      projectScope: "private",
      vcs: "GIT",
    });
    await db.insert(organizationUser).values({
      organizationId: 201,
      roleId: 7,
      userId: 102,
    });

    const target: AttachmentProjectBindingRecord = {
      kind: "project",
      containerId: 301,
      containerType: "project",
      organizationId: 201,
      projectId: 301,
      projectScope: "private",
    };

    await expect(loadAttachmentProjectMembershipFacts(target, 102, db as never)).resolves.toEqual({
      isAnonymous: false,
      isOrganizationAdmin: false,
      isOrganizationMember: true,
      isProjectManager: false,
      isProjectMember: false,
    });
  });
});
