import { type SQL, sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  customType,
  date,
  timestamp as datetime,
  foreignKey,
  index,
  integer as int,
  text as longtext,
  text,
  timestamp,
  smallint as tinyint,
  uniqueIndex,
  varchar,
  pgTable,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const assignee = pgTable(
  "assignee",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_assignee_project_2").on(table.projectId),
    index("ix_assignee_user_1").on(table.userId),
  ],
);

export const attachment = pgTable(
  "attachment",
  {
    id: bigserial({ mode: "number" }).notNull(),
    name: varchar({ length: 255 }).default("NULL"),
    hash: varchar({ length: 255 }).default("NULL"),
    containerType: varchar("container_type", { length: 20 }).default("NULL"),
    mimeType: varchar("mime_type", { length: 255 }).default("NULL"),
    size: bigint({ mode: "number" }).default(sql`NULL`),
    containerId: bigint("container_id", { mode: "number" }).notNull(),
    createdDate: datetime("created_date").default(sql`NULL`),
    ownerLoginId: varchar("owner_login_id", { length: 255 }).default("NULL"),
  },
  (table) => [
    index("ix_attachment_created_date").on(table.createdDate),
    index("ix_attachment_owner_login_id").on(table.ownerLoginId),
    index("ix_attachment_container").on(table.containerType, table.containerId),
  ],
);

export const commentThread = pgTable(
  "comment_thread",
  {
    dtype: varchar({ length: 10 }).notNull(),
    id: bigserial({ mode: "number" }).notNull(),
    authorId: bigint("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: varchar("author_login_id", { length: 255 }).default("NULL"),
    authorName: varchar("author_name", { length: 255 }).default("NULL"),
    state: varchar({ length: 6 }).default("NULL"),
    createdDate: datetime("created_date").default(sql`NULL`),
    pullRequestId: bigint("pull_request_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => pullRequest.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    prevCommitId: varchar("prev_commit_id", { length: 255 }).default("NULL"),
    commitId: varchar("commit_id", { length: 255 }).default("NULL"),
    path: varchar({ length: 255 }).default("NULL"),
    startSide: varchar("start_side", { length: 1 }).default("NULL"),
    startLine: int("start_line").default(sql`NULL`),
    startColumn: int("start_column").default(sql`NULL`),
    endSide: varchar("end_side", { length: 1 }).default("NULL"),
    endLine: int("end_line").default(sql`NULL`),
    endColumn: int("end_column").default(sql`NULL`),
  },
  (table) => [
    index("ix_comment_thread_pullRequest_3").on(table.pullRequestId),
    index("ix_comment_thread_project_4").on(table.projectId),
  ],
);

export const commentThreadN4user = pgTable("comment_thread_n4user", {
  commentThreadId: bigint("comment_thread_id", { mode: "number" })
    .notNull()
    .references(() => commentThread.id, { onDelete: "restrict", onUpdate: "restrict" }),
  n4userId: bigint("n4user_id", { mode: "number" })
    .notNull()
    .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const commitComment = pgTable(
  "commit_comment",
  {
    id: bigserial({ mode: "number" }).notNull(),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    path: varchar({ length: 255 }).default("NULL"),
    line: int().default(sql`NULL`),
    side: varchar({ length: 1 }).default("NULL"),
    contents: longtext().default(sql`NULL`),
    createdDate: datetime("created_date").default(sql`NULL`),
    authorId: bigint("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: varchar("author_login_id", { length: 255 }).default("NULL"),
    authorName: varchar("author_name", { length: 255 }).default("NULL"),
    commitId: varchar("commit_id", { length: 255 }).default("NULL"),
  },
  (table) => [index("ix_commit_comment_project_5").on(table.projectId)],
);

export const email = pgTable(
  "email",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    email: varchar({ length: 255 }).default("NULL"),
    valid: boolean().default(false),
    token: varchar({ length: 255 }).default("NULL"),
  },
  (table) => [
    index("ix_email_user_6").on(table.userId),
    uniqueIndex("uq_email_email_valid").on(table.email, table.valid),
  ],
);

export const favoriteIssue = pgTable(
  "favorite_issue",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    issueId: bigint("issue_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issue.id, { onDelete: "cascade", onUpdate: "restrict" }),
  },
  (table) => [
    uniqueIndex("uq_favorite_issue_user_id_issue_id_1").on(table.userId, table.issueId),
    index("ix_favorite_issue_user_1").on(table.userId),
    index("ix_favorite_issue_project_2").on(table.issueId),
  ],
);

export const favoriteOrganization = pgTable(
  "favorite_organization",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    organizationId: bigint("organization_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => organization.id, { onDelete: "cascade", onUpdate: "restrict" }),
    organizationName: varchar("organization_name", { length: 255 }).default("NULL"),
  },
  (table) => [
    index("ix_favorite_organization_user_1").on(table.userId),
    uniqueIndex("uq_favorite_organization_user_id_organization_id_1").on(
      table.userId,
      table.organizationId,
    ),
    index("ix_favorite_organization_organization_2").on(table.organizationId),
  ],
);

export const favoriteProject = pgTable(
  "favorite_project",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "restrict" }),
    owner: varchar({ length: 255 }).default("NULL"),
    projectName: varchar("project_name", { length: 255 }).default("NULL"),
  },
  (table) => [
    index("ix_favorite_project_project_2").on(table.projectId),
    uniqueIndex("uq_favorite_project_user_id_project_id_1").on(table.userId, table.projectId),
    index("ix_favorite_project_user_1").on(table.userId),
  ],
);

export const issue = pgTable(
  "issue",
  {
    id: bigserial({ mode: "number" }).notNull(),
    title: varchar({ length: 255 }).default("NULL"),
    body: longtext().default(sql`NULL`),
    createdDate: datetime("created_date").default(sql`NULL`),
    updatedDate: datetime("updated_date").default(sql`NULL`),
    authorId: bigint("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: varchar("author_login_id", { length: 255 }).default("NULL"),
    authorName: varchar("author_name", { length: 255 }).default("NULL"),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "cascade" }),
    number: bigint({ mode: "number" }).default(sql`NULL`),
    numOfComments: int("num_of_comments").default(sql`NULL`),
    state: int().default(sql`NULL`),
    dueDate: datetime("due_date").default(sql`NULL`),
    milestoneId: bigint("milestone_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => milestone.id, { onDelete: "restrict", onUpdate: "restrict" }),
    assigneeId: bigint("assignee_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => assignee.id, { onDelete: "set null", onUpdate: "cascade" }),
    history: longtext().default(sql`NULL`),
    parentId: bigint("parent_id", { mode: "number" }).default(sql`NULL`),
    weight: tinyint().default(0),
    updatedByAuthorId: bigint("updated_by_author_id", { mode: "number" }).default(sql`NULL`),
    isDraft: boolean("is_draft").default(false),
  },
  (table) => [
    index("ix_issue_milestone_8").on(table.milestoneId),
    index("ix_issue_author_id_state").on(table.authorId, table.state),
    index("ix_issue_created_date").on(table.createdDate),
    index("ix_issue_weight").on(table.weight),
    uniqueIndex("uq_issue_1").on(table.projectId, table.number),
    index("ix_issue_project_7").on(table.projectId),
    index("ix_issue_is_draft_2").on(table.isDraft, table.authorLoginId, table.projectId),
    index("ix_issue_assignee_9").on(table.assigneeId),
    index("ix_issue_parent_id").on(table.parentId),
    index("ix_issue_is_draft_1").on(table.weight, table.isDraft, table.number, table.createdDate),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "fk_issue_parent_id_01",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
);

export const issueComment = pgTable(
  "issue_comment",
  {
    id: bigserial({ mode: "number" }).notNull(),
    contents: longtext().default(sql`NULL`),
    createdDate: datetime("created_date").default(sql`NULL`),
    authorId: bigint("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: varchar("author_login_id", { length: 255 }).default("NULL"),
    authorName: varchar("author_name", { length: 255 }).default("NULL"),
    issueId: bigint("issue_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issue.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    parentCommentId: bigint("parent_comment_id", { mode: "number" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_issue_comment_author_id").on(table.authorId),
    index("ix_issue_comment_issue_10").on(table.issueId),
    index("ix_issue_parent_id").on(table.parentCommentId),
    index("ix_issue_comment_project_id").on(table.projectId),
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
      name: "fk_issue_comment_parent_id_01",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
);

export const issueCommentVoter = pgTable(
  "issue_comment_voter",
  {
    issueCommentId: bigint("issue_comment_id", { mode: "number" })
      .notNull()
      .references(() => issueComment.id, { onDelete: "restrict", onUpdate: "restrict" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_issue_comment_voter_user_id").on(table.userId)],
);

export const issueEvent = pgTable(
  "issue_event",
  {
    id: bigserial({ mode: "number" }).notNull(),
    created: datetime().default(sql`NULL`),
    senderLoginId: varchar("sender_login_id", { length: 255 }).default("NULL"),
    senderEmail: varchar("sender_email", { length: 255 }).default("NULL"),
    issueId: bigint("issue_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issue.id, { onDelete: "restrict", onUpdate: "restrict" }),
    eventType: varchar("event_type", { length: 34 }).default("NULL"),
    oldValue: longtext("old_value").default(sql`NULL`),
    newValue: longtext("new_value").default(sql`NULL`),
  },
  (table) => [index("ix_issue_event_issue_11").on(table.issueId)],
);

export const issueIssueLabel = pgTable("issue_issue_label", {
  issueId: bigint("issue_id", { mode: "number" })
    .notNull()
    .references(() => issue.id, { onDelete: "restrict", onUpdate: "restrict" }),
  issueLabelId: bigint("issue_label_id", { mode: "number" })
    .notNull()
    .references(() => issueLabel.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const issueLabel = pgTable(
  "issue_label",
  {
    id: bigserial({ mode: "number" }).notNull(),
    categoryId: bigint("category_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issueLabelCategory.id, { onDelete: "restrict", onUpdate: "restrict" }),
    color: varchar({ length: 255 }).default("NULL"),
    name: varchar({ length: 255 }).default("NULL"),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_issue_label_category_12").on(table.categoryId),
    index("ix_issue_label_project_13").on(table.projectId),
  ],
);

export const issueLabelCategory = pgTable(
  "issue_label_category",
  {
    id: bigserial({ mode: "number" }).notNull(),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    name: varchar({ length: 255 }).default("NULL"),
    isExclusive: boolean("is_exclusive").default(false),
  },
  (table) => [index("ix_issue_label_category_project_14").on(table.projectId)],
);

export const issueSharer = pgTable(
  "issue_sharer",
  {
    id: bigserial({ mode: "number" }).notNull(),
    created: date().default(sql`NULL`),
    loginId: varchar("login_id", { length: 255 }).default("NULL"),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    issueId: bigint("issue_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issue.id, { onDelete: "cascade", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_issue_sharer_user_id").on(table.userId),
    index("ix_issue_sharer_issue_id").on(table.issueId),
    index("ix_issue_sharer_login_id").on(table.loginId),
  ],
);

export const issueVoter = pgTable(
  "issue_voter",
  {
    issueId: bigint("issue_id", { mode: "number" })
      .notNull()
      .references(() => issue.id, { onDelete: "restrict", onUpdate: "restrict" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_issue_voter_user_id").on(table.userId)],
);

export const label = pgTable(
  "label",
  {
    id: bigserial({ mode: "number" }).notNull(),
    category: varchar({ length: 255 }).default("NULL"),
    name: varchar({ length: 255 }).default("NULL"),
  },
  (table) => [uniqueIndex("uq_label_1").on(table.category, table.name)],
);

export const linkedAccount = pgTable(
  "linked_account",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userCredentialId: bigint("user_credential_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => userCredential.id, { onDelete: "cascade", onUpdate: "restrict" }),
    providerUserId: varchar("provider_user_id", { length: 255 }).default("NULL"),
    providerKey: varchar("provider_key", { length: 255 }).default("NULL"),
    providerDisplayName: varchar("provider_display_name", { length: 255 }).default("NULL"),
    avatarUrl: varchar("avatar_url", { length: 255 }).default("NULL"),
    password: varchar({ length: 255 }).default("NULL"),
    accessToken: longtext("access_token").default(sql`NULL`),
    refreshToken: longtext("refresh_token").default(sql`NULL`),
    idToken: longtext("id_token").default(sql`NULL`),
    accessTokenExpiresAt: datetime("access_token_expires_at").default(sql`NULL`),
    refreshTokenExpiresAt: datetime("refresh_token_expires_at").default(sql`NULL`),
    scope: varchar({ length: 255 }).default("NULL"),
    createdAt: datetime("created_at").default(sql`NULL`),
    updatedAt: datetime("updated_at").default(sql`NULL`),
  },
  (table) => [
    index("ix_linked_account_user_credential_1").on(table.userCredentialId),
    uniqueIndex("uq_linked_account_provider_user_id_provider_key").on(
      table.providerUserId,
      table.providerKey,
    ),
  ],
);

export const mention = pgTable(
  "mention",
  {
    id: bigserial({ mode: "number" }).notNull(),
    resourceType: varchar("resource_type", { length: 20 }).default("NULL"),
    resourceId: varchar("resource_id", { length: 255 }).default("NULL"),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_mention_resource_type").on(table.resourceType),
    index("ix_mention_user_15").on(table.userId),
  ],
);

export const milestone = pgTable(
  "milestone",
  {
    id: bigserial({ mode: "number" }).notNull(),
    title: varchar({ length: 255 }).default("NULL"),
    dueDate: datetime("due_date").default(sql`NULL`),
    contents: longtext().default(sql`NULL`),
    state: int().default(sql`NULL`),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    uniqueIndex("uq_milestone_1").on(table.projectId, table.title),
    index("ix_milestone_project_16").on(table.projectId),
  ],
);

export const n4user = pgTable(
  "n4user",
  {
    id: bigserial({ mode: "number" }).notNull(),
    name: varchar({ length: 255 }).default("NULL"),
    loginId: varchar("login_id", { length: 255 }).default("NULL"),
    password: varchar({ length: 255 }).default("NULL"),
    passwordSalt: varchar("password_salt", { length: 255 }).default("NULL"),
    email: varchar({ length: 255 }).default("NULL"),
    rememberMe: boolean("remember_me").default(false),
    state: varchar({ length: 7 }).default("NULL"),
    lastStateModifiedDate: datetime("last_state_modified_date").default(sql`NULL`),
    createdDate: datetime("created_date").default(sql`NULL`),
    lang: varchar({ length: 255 }).default("NULL"),
    token: varchar({ length: 255 }).default("NULL"),
    isGuest: boolean("is_guest").default(false),
    englishName: varchar("english_name", { length: 255 }).default("NULL"),
  },
  (table) => [
    index("ix_n4user_email").on(table.email),
    uniqueIndex("uq_n4user_1").on(table.loginId),
    uniqueIndex("uq_n4user_token").on(table.token),
    index("ix_n4user_is_guest").on(table.isGuest),
  ],
);

export const notificationEvent = pgTable(
  "notification_event",
  {
    id: bigserial({ mode: "number" }).notNull(),
    title: varchar({ length: 255 }).default("NULL"),
    senderId: bigint("sender_id", { mode: "number" }).default(sql`NULL`),
    created: datetime().default(sql`NULL`),
    resourceType: varchar("resource_type", { length: 20 }).default("NULL"),
    resourceId: varchar("resource_id", { length: 255 }).default("NULL"),
    eventType: varchar("event_type", { length: 34 }).default("NULL"),
    oldValue: longtext("old_value").default(sql`NULL`),
    newValue: longtext("new_value").default(sql`NULL`),
  },
  (table) => [index("ix_notification_event_created").on(table.created)],
);

export const notificationEventN4user = pgTable("notification_event_n4user", {
  notificationEventId: bigint("notification_event_id", { mode: "number" })
    .notNull()
    .references(() => notificationEvent.id, { onDelete: "restrict", onUpdate: "restrict" }),
  n4userId: bigint("n4user_id", { mode: "number" })
    .notNull()
    .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const notificationMail = pgTable(
  "notification_mail",
  {
    id: bigserial({ mode: "number" }).notNull(),
    notificationEventId: bigint("notification_event_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => notificationEvent.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_notification_mail_notificationEvent_17").on(table.notificationEventId)],
);

export const organization = pgTable(
  "organization",
  {
    id: bigserial({ mode: "number" }).notNull(),
    name: varchar({ length: 255 }).default("NULL"),
    created: datetime().default(sql`NULL`),
    descr: varchar({ length: 255 }).default("NULL"),
  },
  (table) => [uniqueIndex("uq_organization_name").on(sql`lower(${table.name})`)],
);

export const organizationUser = pgTable(
  "organization_user",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    organizationId: bigint("organization_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => organization.id, { onDelete: "restrict", onUpdate: "restrict" }),
    roleId: bigint("role_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => role.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_organization_user_role_20").on(table.roleId),
    index("ix_organization_user_user_18").on(table.userId),
    index("ix_organization_user_organization_19").on(table.organizationId),
  ],
);

export const originalEmail = pgTable(
  "original_email",
  {
    id: bigserial({ mode: "number" }).notNull(),
    messageId: varchar("message_id", { length: 255 }).default("NULL"),
    resourceType: varchar("resource_type", { length: 20 }).default("NULL"),
    resourceId: varchar("resource_id", { length: 255 }).default("NULL"),
    handledDate: datetime("handled_date").default(sql`NULL`),
  },
  (table) => [
    uniqueIndex("uq_original_email_message_id").on(table.messageId),
    index("ix_original_email_resource_id").on(table.resourceId),
    uniqueIndex("uq_original_email_1").on(table.resourceType, table.resourceId),
  ],
);

export const playEvolutions = pgTable("play_evolutions", {
  id: int().notNull(),
  hash: varchar({ length: 255 }).notNull(),
  appliedAt: timestamp("applied_at")
    .default(sql`current_timestamp()`)
    .notNull(),
  applyScript: text("apply_script").default(sql`NULL`),
  revertScript: text("revert_script").default(sql`NULL`),
  state: varchar({ length: 255 }).default("NULL"),
  lastProblem: text("last_problem").default(sql`NULL`),
});

export const posting = pgTable(
  "posting",
  {
    id: bigserial({ mode: "number" }).notNull(),
    title: varchar({ length: 255 }).default("NULL"),
    body: longtext().default(sql`NULL`),
    createdDate: datetime("created_date").default(sql`NULL`),
    updatedDate: datetime("updated_date").default(sql`NULL`),
    authorId: bigint("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: varchar("author_login_id", { length: 255 }).default("NULL"),
    authorName: varchar("author_name", { length: 255 }).default("NULL"),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    number: bigint({ mode: "number" }).default(sql`NULL`),
    numOfComments: int("num_of_comments").default(sql`NULL`),
    notice: boolean().default(false),
    readme: boolean().default(false),
    history: longtext().default(sql`NULL`),
    parentId: bigint("parent_id", { mode: "number" }).default(sql`NULL`),
    updatedByAuthorId: bigint("updated_by_author_id", { mode: "number" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_posting_project_21").on(table.projectId),
    uniqueIndex("uq_posting_1").on(table.projectId, table.number),
    index("ix_posting_parent_id").on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "fk_posting_parent_id_01",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
);

export const postingComment = pgTable(
  "posting_comment",
  {
    id: bigserial({ mode: "number" }).notNull(),
    contents: longtext().default(sql`NULL`),
    createdDate: datetime("created_date").default(sql`NULL`),
    authorId: bigint("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: varchar("author_login_id", { length: 255 }).default("NULL"),
    authorName: varchar("author_name", { length: 255 }).default("NULL"),
    postingId: bigint("posting_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => posting.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    parentCommentId: bigint("parent_comment_id", { mode: "number" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_posting_comment_posting_22").on(table.postingId),
    index("ix_posting_comment_author_id").on(table.authorId),
    index("ix_posting_comment_project_id").on(table.projectId),
    index("ix_posting_parent_id").on(table.parentCommentId),
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
      name: "fk_posting_comment_parent_id_01",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
);

export const postingIssueLabel = pgTable("posting_issue_label", {
  postingId: bigint("posting_id", { mode: "number" })
    .notNull()
    .references(() => posting.id, { onDelete: "restrict", onUpdate: "restrict" }),
  issueLabelId: bigint("issue_label_id", { mode: "number" })
    .notNull()
    .references(() => issueLabel.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const project = pgTable(
  "project",
  {
    id: bigserial({ mode: "number" }).notNull(),
    name: varchar({ length: 255 }).default("NULL"),
    overview: varchar({ length: 255 }).default("NULL"),
    vcs: varchar({ length: 255 }).default("NULL"),
    siteurl: varchar({ length: 255 }).default("NULL"),
    owner: varchar({ length: 255 }).default("NULL"),
    createdDate: datetime("created_date").default(sql`NULL`),
    lastIssueNumber: bigint("last_issue_number", { mode: "number" }).default(sql`NULL`),
    lastPostingNumber: bigint("last_posting_number", { mode: "number" }).default(sql`NULL`),
    originalProjectId: bigint("original_project_id", { mode: "number" }).default(sql`NULL`),
    lastPushedDate: datetime("last_pushed_date").default(sql`NULL`),
    defaultReviewerCount: int("default_reviewer_count").default(sql`NULL`),
    isUsingReviewerCount: boolean("is_using_reviewer_count").default(false),
    organizationId: bigint("organization_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => organization.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectScope: varchar("project_scope", { length: 9 }).default("NULL"),
    previousOwnerLoginId: varchar("previous_owner_login_id", { length: 255 }).default("NULL"),
    previousName: varchar("previous_name", { length: 255 }).default("NULL"),
    previousNameChangedTime: bigint("previous_name_changed_time", { mode: "number" }).default(
      sql`NULL`,
    ),
    isCodeAccessibleMemberOnly: boolean("is_code_accessible_member_only").default(false),
  },
  (table) => [
    index("ix_project_organization_24").on(table.organizationId),
    index("ix_project_originalProject_23").on(table.originalProjectId),
    uniqueIndex("uq_project_owner_name").on(sql`lower(${table.owner})`, sql`lower(${table.name})`),
    foreignKey({
      columns: [table.originalProjectId],
      foreignColumns: [table.id],
      name: "fk_project_originalProject_23",
    })
      .onUpdate("restrict")
      .onDelete("restrict"),
  ],
);

export const projectLabel = pgTable("project_label", {
  projectId: bigint("project_id", { mode: "number" })
    .notNull()
    .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
  labelId: bigint("label_id", { mode: "number" })
    .notNull()
    .references(() => label.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const projectMenuSetting = pgTable(
  "project_menu_setting",
  {
    id: bigserial({ mode: "number" }).notNull(),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    code: boolean().default(false),
    issue: boolean().default(false),
    pullRequest: boolean("pull_request").default(false),
    review: boolean().default(false),
    milestone: boolean().default(false),
    board: boolean().default(false),
  },
  (table) => [index("ix_project_menu_setting_project_25").on(table.projectId)],
);

export const projectPushedBranch = pgTable(
  "project_pushed_branch",
  {
    id: bigserial({ mode: "number" }).notNull(),
    pushedDate: datetime("pushed_date").default(sql`NULL`),
    name: varchar({ length: 255 }).default("NULL"),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_project_pushed_branch_project_39").on(table.projectId)],
);

export const projectTransfer = pgTable(
  "project_transfer",
  {
    id: bigserial({ mode: "number" }).notNull(),
    senderId: bigint("sender_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    destination: varchar({ length: 255 }).default("NULL"),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    requested: datetime().default(sql`NULL`),
    confirmKey: varchar("confirm_key", { length: 255 }).default("NULL"),
    accepted: boolean().default(false),
    newProjectName: varchar("new_project_name", { length: 255 }).default("NULL"),
  },
  (table) => [
    index("ix_project_transfer_project_27").on(table.projectId),
    index("ix_project_transfer_sender_26").on(table.senderId),
  ],
);

export const projectUser = pgTable(
  "project_user",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    roleId: bigint("role_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => role.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_project_user_user_28").on(table.userId),
    index("ix_project_user_role_30").on(table.roleId),
    index("ix_project_user_project_29").on(table.projectId),
  ],
);

export const projectVisitation = pgTable(
  "project_visitation",
  {
    id: bigserial({ mode: "number" }).notNull(),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "cascade" }),
    recentlyVisitedProjectsId: bigint("recently_visited_projects_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => recentlyVisitedProjects.id, { onDelete: "restrict", onUpdate: "restrict" }),
    visited: datetime().default(sql`NULL`),
  },
  (table) => [
    index("ix_project_visitation_recentlyVisitedProjects_32").on(table.recentlyVisitedProjectsId),
    uniqueIndex("uq_project_visitation_1").on(table.projectId, table.recentlyVisitedProjectsId),
    index("ix_project_visitation_project_31").on(table.projectId),
  ],
);

export const property = pgTable("property", {
  id: bigserial({ mode: "number" }).notNull(),
  name: varchar({ length: 25 }).default("NULL"),
  value: varchar({ length: 255 }).default("NULL"),
});

export const pullRequest = pgTable(
  "pull_request",
  {
    id: bigserial({ mode: "number" }).notNull(),
    title: varchar({ length: 255 }).default("NULL"),
    body: longtext().default(sql`NULL`),
    toProjectId: bigint("to_project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    fromProjectId: bigint("from_project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    toBranch: varchar("to_branch", { length: 255 }).default("NULL"),
    fromBranch: varchar("from_branch", { length: 255 }).default("NULL"),
    contributorId: bigint("contributor_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    receiverId: bigint("receiver_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    created: datetime().default(sql`NULL`),
    updated: datetime().default(sql`NULL`),
    received: datetime().default(sql`NULL`),
    state: int().default(sql`NULL`),
    isConflict: boolean("is_conflict").default(false),
    isMerging: boolean("is_merging").default(false),
    lastCommitId: varchar("last_commit_id", { length: 255 }).default("NULL"),
    mergedCommitIdFrom: varchar("merged_commit_id_from", { length: 255 }).default("NULL"),
    mergedCommitIdTo: varchar("merged_commit_id_to", { length: 255 }).default("NULL"),
    number: bigint({ mode: "number" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_pull_request_toProject_33").on(table.toProjectId),
    index("ix_pull_request_contributor_35").on(table.contributorId),
    index("ix_pull_request_number").on(table.number),
    index("ix_pull_request_fromProject_34").on(table.fromProjectId),
    index("ix_pull_request_receiver_36").on(table.receiverId),
  ],
);

export const pullRequestCommit = pgTable(
  "pull_request_commit",
  {
    id: bigserial({ mode: "number" }).notNull(),
    pullRequestId: bigint("pull_request_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => pullRequest.id, { onDelete: "restrict", onUpdate: "restrict" }),
    commitId: varchar("commit_id", { length: 255 }).default("NULL"),
    authorDate: datetime("author_date").default(sql`NULL`),
    created: datetime().default(sql`NULL`),
    commitMessage: longtext("commit_message").default(sql`NULL`),
    commitShortId: varchar("commit_short_id", { length: 255 }).default("NULL"),
    authorEmail: varchar("author_email", { length: 255 }).default("NULL"),
    state: varchar({ length: 7 }).default("NULL"),
  },
  (table) => [index("ix_pull_request_commit_pullRequest_37").on(table.pullRequestId)],
);

export const pullRequestEvent = pgTable(
  "pull_request_event",
  {
    id: bigserial({ mode: "number" }).notNull(),
    senderLoginId: varchar("sender_login_id", { length: 255 }).default("NULL"),
    pullRequestId: bigint("pull_request_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => pullRequest.id, { onDelete: "restrict", onUpdate: "restrict" }),
    eventType: varchar("event_type", { length: 34 }).default("NULL"),
    created: datetime().default(sql`NULL`),
    oldValue: longtext("old_value").default(sql`NULL`),
    newValue: longtext("new_value").default(sql`NULL`),
  },
  (table) => [index("ix_pull_request_event_pullRequest_38").on(table.pullRequestId)],
);

export const pullRequestReviewers = pgTable("pull_request_reviewers", {
  pullRequestId: bigint("pull_request_id", { mode: "number" })
    .notNull()
    .references(() => pullRequest.id, { onDelete: "restrict", onUpdate: "restrict" }),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const recentlyVisitedProjects = pgTable(
  "recently_visited_projects",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_recently_visited_projects_user_40").on(table.userId)],
);

export const recentIssue = pgTable(
  "recent_issue",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    issueId: bigint("issue_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issue.id, { onDelete: "cascade", onUpdate: "restrict" }),
    postingId: bigint("posting_id", { mode: "number" }).default(sql`NULL`),
    title: varchar({ length: 255 }).default("NULL"),
    url: varchar({ length: 255 }).default("NULL"),
    createdDate: datetime("created_date").default(sql`NULL`),
  },
  (table) => [
    index("ix_recent_issue_user_1").on(table.userId),
    uniqueIndex("uq_recent_issue_user_id_issue_id_1").on(table.userId, table.issueId),
    uniqueIndex("uq_recent_issue_user_id_posting_id_1").on(table.userId, table.postingId),
    index("ix_recent_issue_issue_2").on(table.userId, table.issueId),
    index("ix_recent_issue_posting_3").on(table.userId, table.postingId),
  ],
);

export const recentProject = pgTable(
  "recent_project",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).default(sql`NULL`),
    owner: varchar({ length: 255 }).default("NULL"),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "cascade" }),
    projectName: varchar("project_name", { length: 255 }).default("NULL"),
  },
  (table) => [uniqueIndex("uq_recent_project_1").on(table.userId, table.projectId)],
);

export const reviewComment = pgTable(
  "review_comment",
  {
    id: bigserial({ mode: "number" }).notNull(),
    contents: longtext().default(sql`NULL`),
    createdDate: datetime("created_date").default(sql`NULL`),
    authorId: bigint("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: varchar("author_login_id", { length: 255 }).default("NULL"),
    authorName: varchar("author_name", { length: 255 }).default("NULL"),
    threadId: bigint("thread_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => commentThread.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_review_comment_thread_41").on(table.threadId)],
);

export const searchDocument = pgTable(
  "search_document",
  {
    id: bigserial({ mode: "number" }).notNull(),
    documentType: varchar("document_type", { length: 32 }).notNull(),
    documentId: bigint("document_id", { mode: "number" }).notNull(),
    scopeKind: varchar("scope_kind", { length: 16 }).notNull(),
    accessScope: varchar("access_scope", { length: 32 }).notNull(),
    organizationId: bigint("organization_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => organization.id, { onDelete: "cascade", onUpdate: "cascade" }),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "cascade" }),
    principalUserId: bigint("principal_user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "cascade" }),
    title: varchar({ length: 255 }).default("NULL"),
    body: longtext().default(sql`NULL`),
    path: varchar({ length: 255 }).default("NULL"),
    documentText: longtext("document_text").notNull().default(""),
    updatedDate: datetime("updated_date").default(sql`NULL`),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('simple', coalesce(${searchDocument.title}, '') || ' ' || coalesce(${searchDocument.body}, '') || ' ' || coalesce(${searchDocument.path}, '') || ' ' || coalesce(${searchDocument.documentText}, ''))`,
    ),
  },
  (table) => [
    uniqueIndex("uq_search_document_source").on(table.documentType, table.documentId),
    index("ix_search_document_scope").on(table.scopeKind, table.organizationId, table.projectId),
    index("ix_search_document_access").on(
      table.accessScope,
      table.organizationId,
      table.projectId,
      table.principalUserId,
    ),
    index("ix_search_document_updated_48").on(table.updatedDate),
    index("ix_search_document_vector_49").using("gin", table.searchVector),
  ],
);

export const role = pgTable("role", {
  id: bigserial({ mode: "number" }).notNull(),
  name: varchar({ length: 255 }).default("NULL"),
  active: boolean().default(false),
});

export const siteAdmin = pgTable(
  "site_admin",
  {
    id: bigserial({ mode: "number" }).notNull(),
    adminId: bigint("admin_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_site_admin_admin_42").on(table.adminId)],
);

export const titleHead = pgTable(
  "title_head",
  {
    id: bigserial({ mode: "number" }).notNull(),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "restrict" }),
    headKeyword: varchar("head_keyword", { length: 255 }).default("NULL"),
    frequency: int().default(sql`NULL`),
  },
  (table) => [
    index("ix_title_head_head_keyword").on(table.headKeyword),
    index("ix_title_head_project_id").on(table.projectId),
  ],
);

export const unwatch = pgTable(
  "unwatch",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    resourceType: varchar("resource_type", { length: 20 }).default("NULL"),
    resourceId: varchar("resource_id", { length: 255 }).default("NULL"),
  },
  (table) => [
    index("ix_unwatch_user_43").on(table.userId),
    index("ix_unwatch_resource_id_resource_type").on(table.resourceId, table.resourceType),
  ],
);

export const userCredential = pgTable(
  "user_credential",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    loginId: varchar("login_id", { length: 255 }).default("NULL"),
    email: varchar({ length: 255 }).default("NULL"),
    name: varchar({ length: 255 }).default("NULL"),
    active: boolean().default(false),
    emailValidated: boolean("email_validated").default(false),
    image: varchar({ length: 255 }).default("NULL"),
    createdAt: datetime("created_at").default(sql`NULL`),
    updatedAt: datetime("updated_at").default(sql`NULL`),
  },
  (table) => [
    index("ix_user_credential_user_id_1").on(table.userId),
    uniqueIndex("uq_user_credential_email").on(table.email),
    uniqueIndex("uq_user_credential_login_id").on(table.loginId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: bigserial({ mode: "number" }).notNull(),
    identifier: varchar({ length: 255 }).notNull(),
    value: varchar({ length: 255 }).notNull(),
    expiresAt: datetime("expires_at").notNull(),
    createdAt: datetime("created_at").default(sql`NULL`),
    updatedAt: datetime("updated_at").default(sql`NULL`),
  },
  (table) => [
    uniqueIndex("uq_verification_identifier").on(table.identifier),
    index("ix_verification_expires_at").on(table.expiresAt),
  ],
);

export const userEnrolledOrganization = pgTable("user_enrolled_organization", {
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .references(() => organization.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const userEnrolledProject = pgTable("user_enrolled_project", {
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  projectId: bigint("project_id", { mode: "number" })
    .notNull()
    .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const userProjectNotification = pgTable(
  "user_project_notification",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    notificationType: varchar("notification_type", { length: 34 }).default("NULL"),
    allowed: boolean().default(false),
  },
  (table) => [
    index("ix_user_project_notification_project_45").on(table.projectId),
    uniqueIndex("uq_user_project_notification_1").on(
      table.projectId,
      table.userId,
      table.notificationType,
    ),
    index("ix_user_project_notification_user_44").on(table.userId),
  ],
);

export const userSetting = pgTable(
  "user_setting",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    loginDefaultPage: varchar("login_default_page", { length: 255 }).default("NULL"),
  },
  (table) => [index("ix_user_setting_user_1").on(table.userId)],
);

export const userVerification = pgTable(
  "user_verification",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    loginId: varchar("login_id", { length: 255 }).default("NULL"),
    verificationCode: varchar("verification_code", { length: 255 }).default("NULL"),
    timestamp: bigint({ mode: "number" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_user_verification_user_1").on(table.userId),
    index("ix_user_verification_user_2").on(table.loginId, table.verificationCode),
  ],
);

export const watch = pgTable(
  "watch",
  {
    id: bigserial({ mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    resourceType: varchar("resource_type", { length: 20 }).default("NULL"),
    resourceId: varchar("resource_id", { length: 255 }).default("NULL"),
  },
  (table) => [
    index("ix_watch_resource_id_resource_type").on(table.resourceId, table.resourceType),
    index("ix_watch_user_46").on(table.userId),
  ],
);

export const webhook = pgTable(
  "webhook",
  {
    id: bigserial({ mode: "number" }).notNull(),
    projectId: bigint("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    payloadUrl: varchar("payload_url", { length: 2000 }).default("NULL"),
    secret: varchar({ length: 250 }).default("NULL"),
    createdAt: datetime("created_at").default(sql`NULL`),
    gitPush: boolean("git_push").default(false),
    webhookType: boolean("webhook_type").default(true),
  },
  (table) => [
    index("ix_webhook_project_47").on(table.projectId),
    index("ix_webhook_webhook_type").on(table.webhookType),
    index("ix_webhook_git_push_only").on(table.gitPush),
  ],
);

export const webhookThread = pgTable(
  "webhook_thread",
  {
    id: bigserial({ mode: "number" }).notNull(),
    webhookId: bigint("webhook_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => webhook.id, { onDelete: "cascade", onUpdate: "restrict" }),
    resourceType: varchar("resource_type", { length: 20 }).default("NULL"),
    resourceId: varchar("resource_id", { length: 255 }).default("NULL"),
    threadId: varchar("thread_id", { length: 2000 }).default("NULL"),
    createdAt: datetime("created_at").default(sql`NULL`),
  },
  (table) => [
    index("ix_webhook_thread_webhook_1").on(table.webhookId),
    index("ix_webhook_thread_resource_2").on(table.resourceType, table.resourceId),
  ],
);
