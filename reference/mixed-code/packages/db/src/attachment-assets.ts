import { and, eq, inArray, sql } from "drizzle-orm";
import type { ProjectScope } from "@yona/contracts";
import { getDb, type DatabaseType } from "./index";
import { getDbSchema } from "./runtime-schema";

const PROJECT_MANAGER_ROLE_ID = 1;
const PROJECT_MEMBER_ROLE_ID = 2;
const ORG_ADMIN_ROLE_ID = 6;
const ORG_MEMBER_ROLE_ID = 7;

export interface AttachmentProjectBindingRecord {
  kind: "project";
  containerId: number;
  containerType: string;
  organizationId: null | number;
  projectId: number;
  projectScope: ProjectScope;
}

export interface AttachmentGlobalBindingRecord {
  kind: "global";
  containerId: number;
  containerType: "organization" | "user_avatar";
}

export interface AttachmentTemporaryBindingRecord {
  kind: "temporary-upload";
  containerId: number;
  containerType: "user";
  ownerLoginId: null | string;
  ownerUserId: number;
}

export type AttachmentBindingRecord =
  | AttachmentGlobalBindingRecord
  | AttachmentProjectBindingRecord
  | AttachmentTemporaryBindingRecord;

export interface AttachmentAssetRecord {
  assetId: number;
  binding: AttachmentBindingRecord;
  fileName: string;
  hash: string;
  mimeType: null | string;
  size: null | number;
}

export type AttachmentProjectMembershipTarget = Pick<
  AttachmentProjectBindingRecord,
  "organizationId" | "projectId"
>;

export interface AttachmentProjectMembershipFactsRecord {
  isAnonymous: boolean;
  isOrganizationAdmin: boolean;
  isOrganizationMember: boolean;
  isProjectManager: boolean;
  isProjectMember: boolean;
}

function normalizeProjectScope(value: null | string): ProjectScope {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "public" || normalized === "protected" || normalized === "private") {
    return normalized;
  }

  return "private";
}

function normalizeText(value: null | string): null | string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function parseAssetId(assetId: string): null | number {
  const parsed = Number.parseInt(assetId, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function membershipExists(
  input: {
    predicate: unknown;
    table: unknown;
  },
  db: DatabaseType,
): Promise<boolean> {
  const [row] = await (db as any)
    .select({ value: sql<number>`1` })
    .from(input.table)
    .where(input.predicate)
    .limit(1);
  return row !== undefined;
}

async function loadProjectBinding(
  input: {
    containerId: number;
    containerType: string;
  },
  db: DatabaseType,
): Promise<AttachmentProjectBindingRecord | null> {
  const schema = getDbSchema(db);
  let projectId: null | number = null;

  switch (input.containerType) {
    case "project":
      projectId = input.containerId;
      break;
    case "issue_post": {
      const [issue] = await (db as any)
        .select({
          projectId: schema.issue.projectId,
        })
        .from(schema.issue)
        .where(eq(schema.issue.id, input.containerId))
        .limit(1);
      projectId = issue?.projectId ?? null;
      break;
    }
    case "issue_comment": {
      const [comment] = await (db as any)
        .select({
          projectId: schema.issueComment.projectId,
        })
        .from(schema.issueComment)
        .where(eq(schema.issueComment.id, input.containerId))
        .limit(1);
      projectId = comment?.projectId ?? null;
      break;
    }
    case "board_post": {
      const [posting] = await (db as any)
        .select({
          projectId: schema.posting.projectId,
        })
        .from(schema.posting)
        .where(eq(schema.posting.id, input.containerId))
        .limit(1);
      projectId = posting?.projectId ?? null;
      break;
    }
    case "nonissue_comment": {
      const [comment] = await (db as any)
        .select({
          projectId: schema.postingComment.projectId,
        })
        .from(schema.postingComment)
        .where(eq(schema.postingComment.id, input.containerId))
        .limit(1);
      projectId = comment?.projectId ?? null;
      break;
    }
    case "comment_thread": {
      const [thread] = await (db as any)
        .select({
          projectId: schema.commentThread.projectId,
          pullRequestId: schema.commentThread.pullRequestId,
        })
        .from(schema.commentThread)
        .where(eq(schema.commentThread.id, input.containerId))
        .limit(1);

      if (!thread) {
        return null;
      }

      projectId = thread.projectId ?? null;
      if (projectId === null && thread.pullRequestId !== null) {
        const [pullRequest] = await (db as any)
          .select({
            projectId: schema.pullRequest.toProjectId,
          })
          .from(schema.pullRequest)
          .where(eq(schema.pullRequest.id, thread.pullRequestId))
          .limit(1);
        projectId = pullRequest?.projectId ?? null;
      }
      break;
    }
    case "commit_comment": {
      const [commitComment] = await (db as any)
        .select({
          projectId: schema.commitComment.projectId,
        })
        .from(schema.commitComment)
        .where(eq(schema.commitComment.id, input.containerId))
        .limit(1);
      projectId = commitComment?.projectId ?? null;
      break;
    }
    case "pull_request": {
      const [pullRequest] = await (db as any)
        .select({
          projectId: schema.pullRequest.toProjectId,
        })
        .from(schema.pullRequest)
        .where(eq(schema.pullRequest.id, input.containerId))
        .limit(1);
      projectId = pullRequest?.projectId ?? null;
      break;
    }
    case "milestone": {
      const [milestone] = await (db as any)
        .select({
          projectId: schema.milestone.projectId,
        })
        .from(schema.milestone)
        .where(eq(schema.milestone.id, input.containerId))
        .limit(1);
      projectId = milestone?.projectId ?? null;
      break;
    }
    case "issue_label": {
      const [issueLabel] = await (db as any)
        .select({
          projectId: schema.issueLabel.projectId,
        })
        .from(schema.issueLabel)
        .where(eq(schema.issueLabel.id, input.containerId))
        .limit(1);
      projectId = issueLabel?.projectId ?? null;
      break;
    }
    default:
      return null;
  }

  if (projectId === null) {
    return null;
  }

  const [project] = await (db as any)
    .select({
      id: schema.project.id,
      organizationId: schema.project.organizationId,
      projectScope: schema.project.projectScope,
    })
    .from(schema.project)
    .where(eq(schema.project.id, projectId))
    .limit(1);

  if (!project) {
    return null;
  }

  return {
    kind: "project",
    containerId: input.containerId,
    containerType: input.containerType,
    organizationId: project.organizationId ?? null,
    projectId: project.id,
    projectScope: normalizeProjectScope(project.projectScope),
  };
}

async function loadGlobalBinding(
  input: {
    containerId: number;
    containerType: string;
  },
  db: DatabaseType,
): Promise<AttachmentGlobalBindingRecord | null> {
  const schema = getDbSchema(db);

  if (input.containerType === "organization") {
    const [organization] = await (db as any)
      .select({
        id: schema.organization.id,
      })
      .from(schema.organization)
      .where(eq(schema.organization.id, input.containerId))
      .limit(1);

    if (!organization) {
      return null;
    }

    return {
      kind: "global",
      containerId: input.containerId,
      containerType: "organization",
    };
  }

  if (input.containerType === "user_avatar") {
    const [user] = await (db as any)
      .select({
        id: schema.n4user.id,
      })
      .from(schema.n4user)
      .where(eq(schema.n4user.id, input.containerId))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      kind: "global",
      containerId: input.containerId,
      containerType: "user_avatar",
    };
  }

  return null;
}

export async function loadAttachmentAssetRecord(
  assetId: string,
  db = getDb(),
): Promise<AttachmentAssetRecord | null> {
  const parsedAssetId = parseAssetId(assetId);
  if (parsedAssetId === null) {
    return null;
  }

  const schema = getDbSchema(db);
  const [attachment] = await (db as any)
    .select({
      containerId: schema.attachment.containerId,
      containerType: schema.attachment.containerType,
      hash: schema.attachment.hash,
      id: schema.attachment.id,
      mimeType: schema.attachment.mimeType,
      name: schema.attachment.name,
      ownerLoginId: schema.attachment.ownerLoginId,
      size: schema.attachment.size,
    })
    .from(schema.attachment)
    .where(eq(schema.attachment.id, parsedAssetId))
    .limit(1);

  if (!attachment) {
    return null;
  }

  const fileName = normalizeText(attachment.name);
  const hash = normalizeText(attachment.hash);
  const containerType = normalizeText(attachment.containerType)?.toLowerCase();

  if (!fileName || !hash || !containerType) {
    return null;
  }

  if (containerType === "user") {
    const [user] = await (db as any)
      .select({
        id: schema.n4user.id,
      })
      .from(schema.n4user)
      .where(eq(schema.n4user.id, attachment.containerId))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      assetId: attachment.id,
      binding: {
        kind: "temporary-upload",
        containerId: attachment.containerId,
        containerType: "user",
        ownerLoginId: normalizeText(attachment.ownerLoginId),
        ownerUserId: attachment.containerId,
      },
      fileName,
      hash,
      mimeType: normalizeText(attachment.mimeType),
      size: attachment.size ?? null,
    };
  }

  const globalBinding = await loadGlobalBinding(
    {
      containerId: attachment.containerId,
      containerType,
    },
    db,
  );

  if (globalBinding) {
    return {
      assetId: attachment.id,
      binding: globalBinding,
      fileName,
      hash,
      mimeType: normalizeText(attachment.mimeType),
      size: attachment.size ?? null,
    };
  }

  const projectBinding = await loadProjectBinding(
    {
      containerId: attachment.containerId,
      containerType,
    },
    db,
  );

  if (!projectBinding) {
    return null;
  }

  return {
    assetId: attachment.id,
    binding: projectBinding,
    fileName,
    hash,
    mimeType: normalizeText(attachment.mimeType),
    size: attachment.size ?? null,
  };
}

export async function loadAttachmentProjectMembershipFacts(
  target: AttachmentProjectMembershipTarget,
  userId: null | number,
  db = getDb(),
): Promise<AttachmentProjectMembershipFactsRecord> {
  if (userId === null) {
    return {
      isAnonymous: true,
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: false,
    };
  }

  const schema = getDbSchema(db);
  const isProjectMember = await membershipExists(
    {
      predicate: and(
        eq(schema.projectUser.projectId, target.projectId),
        eq(schema.projectUser.userId, userId),
        inArray(schema.projectUser.roleId, [PROJECT_MANAGER_ROLE_ID, PROJECT_MEMBER_ROLE_ID]),
      ),
      table: schema.projectUser,
    },
    db,
  );
  const isProjectManager = await membershipExists(
    {
      predicate: and(
        eq(schema.projectUser.projectId, target.projectId),
        eq(schema.projectUser.userId, userId),
        eq(schema.projectUser.roleId, PROJECT_MANAGER_ROLE_ID),
      ),
      table: schema.projectUser,
    },
    db,
  );
  const isOrganizationMember =
    target.organizationId === null
      ? false
      : await membershipExists(
          {
            predicate: and(
              eq(schema.organizationUser.organizationId, target.organizationId),
              eq(schema.organizationUser.userId, userId),
              inArray(schema.organizationUser.roleId, [ORG_ADMIN_ROLE_ID, ORG_MEMBER_ROLE_ID]),
            ),
            table: schema.organizationUser,
          },
          db,
        );
  const isOrganizationAdmin =
    target.organizationId === null
      ? false
      : await membershipExists(
          {
            predicate: and(
              eq(schema.organizationUser.organizationId, target.organizationId),
              eq(schema.organizationUser.userId, userId),
              eq(schema.organizationUser.roleId, ORG_ADMIN_ROLE_ID),
            ),
            table: schema.organizationUser,
          },
          db,
        );

  return {
    isAnonymous: false,
    isOrganizationAdmin,
    isOrganizationMember,
    isProjectManager,
    isProjectMember,
  };
}
