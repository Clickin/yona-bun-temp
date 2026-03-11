import { and, eq } from "drizzle-orm";
import { getDb, type DatabaseType } from "./index";
import { getDbSchema } from "./runtime-schema";

const PROJECT_MANAGER_ROLE_ID = 1;
const ORG_ADMIN_ROLE_ID = 6;

export interface TemporaryUploadRecord {
  assetId: number;
  containerId: number;
  containerType: string;
  hash: string;
  ownerLoginId: string;
}

export async function createTemporaryUploadRecord(
  input: {
    fileName: string;
    hash: string;
    mimeType: null | string;
    ownerLoginId: string;
    ownerUserId: number;
    size: number;
  },
  db = getDb(),
): Promise<TemporaryUploadRecord> {
  const schema = getDbSchema(db);
  const [inserted] = await (db as any)
    .insert(schema.attachment)
    .values({
      containerId: input.ownerUserId,
      containerType: "user",
      createdDate: new Date(),
      hash: input.hash,
      mimeType: input.mimeType,
      name: input.fileName,
      ownerLoginId: input.ownerLoginId,
      size: input.size,
    })
    .returning({
      assetId: schema.attachment.id,
      containerId: schema.attachment.containerId,
      containerType: schema.attachment.containerType,
      hash: schema.attachment.hash,
      ownerLoginId: schema.attachment.ownerLoginId,
    });

  if (!inserted) {
    throw new Error("Failed to create temporary upload record.");
  }

  return {
    assetId: inserted.assetId,
    containerId: inserted.containerId,
    containerType: String(inserted.containerType ?? "user"),
    hash: String(inserted.hash ?? ""),
    ownerLoginId: String(inserted.ownerLoginId ?? input.ownerLoginId),
  };
}

export async function readTemporaryUploadRecord(
  assetId: number,
  db: DatabaseType = getDb(),
): Promise<null | TemporaryUploadRecord> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      assetId: schema.attachment.id,
      containerId: schema.attachment.containerId,
      containerType: schema.attachment.containerType,
      hash: schema.attachment.hash,
      ownerLoginId: schema.attachment.ownerLoginId,
    })
    .from(schema.attachment)
    .where(eq(schema.attachment.id, assetId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    assetId: row.assetId,
    containerId: row.containerId,
    containerType: String(row.containerType ?? ""),
    hash: String(row.hash ?? ""),
    ownerLoginId: String(row.ownerLoginId ?? ""),
  };
}

export async function finalizeTemporaryUploadRecord(
  input: {
    assetId: number;
    expectedOwnerUserId: number;
    resourceId: number;
    resourceType: string;
  },
  db = getDb(),
): Promise<TemporaryUploadRecord> {
  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.attachment)
    .set({
      containerId: input.resourceId,
      containerType: input.resourceType,
    })
    .where(
      and(
        eq(schema.attachment.id, input.assetId),
        eq(schema.attachment.containerType, "user"),
        eq(schema.attachment.containerId, input.expectedOwnerUserId),
      ),
    );

  const updated = await readTemporaryUploadRecord(input.assetId, db);
  if (!updated) {
    throw new Error("Upload target not found.");
  }

  return updated;
}

export async function resolveUploadBindingProjectId(
  input: {
    resourceId: number;
    resourceType: string;
  },
  db: DatabaseType = getDb(),
): Promise<number | null> {
  const schema = getDbSchema(db);

  if (input.resourceType === "project") {
    const [project] = await (db as any)
      .select({
        projectId: schema.project.id,
      })
      .from(schema.project)
      .where(eq(schema.project.id, input.resourceId))
      .limit(1);
    return project?.projectId ?? null;
  }

  if (input.resourceType === "issue_post") {
    const [issue] = await (db as any)
      .select({
        projectId: schema.issue.projectId,
      })
      .from(schema.issue)
      .where(eq(schema.issue.id, input.resourceId))
      .limit(1);
    return issue?.projectId ?? null;
  }

  if (input.resourceType === "issue_comment") {
    const [issueComment] = await (db as any)
      .select({
        projectId: schema.issueComment.projectId,
      })
      .from(schema.issueComment)
      .where(eq(schema.issueComment.id, input.resourceId))
      .limit(1);
    return issueComment?.projectId ?? null;
  }

  if (input.resourceType === "board_post") {
    const [posting] = await (db as any)
      .select({
        projectId: schema.posting.projectId,
      })
      .from(schema.posting)
      .where(eq(schema.posting.id, input.resourceId))
      .limit(1);
    return posting?.projectId ?? null;
  }

  if (input.resourceType === "nonissue_comment") {
    const [postingComment] = await (db as any)
      .select({
        projectId: schema.postingComment.projectId,
      })
      .from(schema.postingComment)
      .where(eq(schema.postingComment.id, input.resourceId))
      .limit(1);
    return postingComment?.projectId ?? null;
  }

  if (input.resourceType === "milestone") {
    const [milestone] = await (db as any)
      .select({
        projectId: schema.milestone.projectId,
      })
      .from(schema.milestone)
      .where(eq(schema.milestone.id, input.resourceId))
      .limit(1);
    return milestone?.projectId ?? null;
  }

  if (input.resourceType === "issue_label") {
    const [issueLabel] = await (db as any)
      .select({
        projectId: schema.issueLabel.projectId,
      })
      .from(schema.issueLabel)
      .where(eq(schema.issueLabel.id, input.resourceId))
      .limit(1);
    return issueLabel?.projectId ?? null;
  }

  return null;
}

export async function canManageProjectUploadTarget(
  input: {
    actorId: number;
    projectId: number;
  },
  db: DatabaseType = getDb(),
): Promise<boolean> {
  const schema = getDbSchema(db);
  const [projectRow] = await (db as any)
    .select({
      organizationId: schema.project.organizationId,
    })
    .from(schema.project)
    .where(eq(schema.project.id, input.projectId))
    .limit(1);

  if (!projectRow) {
    return false;
  }

  const [projectManager] = await (db as any)
    .select({ value: schema.projectUser.userId })
    .from(schema.projectUser)
    .where(
      and(
        eq(schema.projectUser.projectId, input.projectId),
        eq(schema.projectUser.userId, input.actorId),
        eq(schema.projectUser.roleId, PROJECT_MANAGER_ROLE_ID),
      ),
    )
    .limit(1);

  if (projectManager) {
    return true;
  }

  if (projectRow.organizationId === null) {
    return false;
  }

  const [orgAdmin] = await (db as any)
    .select({ value: schema.organizationUser.userId })
    .from(schema.organizationUser)
    .where(
      and(
        eq(schema.organizationUser.organizationId, projectRow.organizationId),
        eq(schema.organizationUser.userId, input.actorId),
        eq(schema.organizationUser.roleId, ORG_ADMIN_ROLE_ID),
      ),
    )
    .limit(1);

  return Boolean(orgAdmin);
}
