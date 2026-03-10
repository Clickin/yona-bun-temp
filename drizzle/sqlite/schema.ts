import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
  foreignKey,
  int,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const assignee = sqliteTable(
  "assignee",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_assignee_project_2").on(table.projectId),
    index("ix_assignee_user_1").on(table.userId),
  ],
);

export const attachment = sqliteTable(
  "attachment",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: text().default("NULL"),
    hash: text().default("NULL"),
    containerType: text("container_type").default("NULL"),
    mimeType: text("mime_type").default("NULL"),
    size: integer({ mode: "number" }).default(sql`NULL`),
    containerId: integer("container_id", { mode: "number" }).notNull(),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    ownerLoginId: text("owner_login_id").default("NULL"),
  },
  (table) => [
    index("ix_attachment_created_date").on(table.createdDate),
    index("ix_attachment_owner_login_id").on(table.ownerLoginId),
    index("ix_attachment_container").on(table.containerType, table.containerId),
  ],
);

export const commentThread = sqliteTable(
  "comment_thread",
  {
    dtype: text().notNull(),
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    authorId: integer("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: text("author_login_id").default("NULL"),
    authorName: text("author_name").default("NULL"),
    state: text().default("NULL"),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    pullRequestId: integer("pull_request_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => pullRequest.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    prevCommitId: text("prev_commit_id").default("NULL"),
    commitId: text("commit_id").default("NULL"),
    path: text().default("NULL"),
    startSide: text("start_side").default("NULL"),
    startLine: integer("start_line").default(sql`NULL`),
    startColumn: integer("start_column").default(sql`NULL`),
    endSide: text("end_side").default("NULL"),
    endLine: integer("end_line").default(sql`NULL`),
    endColumn: integer("end_column").default(sql`NULL`),
  },
  (table) => [
    index("ix_comment_thread_pullRequest_3").on(table.pullRequestId),
    index("ix_comment_thread_project_4").on(table.projectId),
  ],
);

export const commentThreadN4user = sqliteTable("comment_thread_n4user", {
  commentThreadId: integer("comment_thread_id", { mode: "number" })
    .notNull()
    .references(() => commentThread.id, { onDelete: "restrict", onUpdate: "restrict" }),
  n4userId: integer("n4user_id", { mode: "number" })
    .notNull()
    .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const commitComment = sqliteTable(
  "commit_comment",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    path: text().default("NULL"),
    line: integer().default(sql`NULL`),
    side: text().default("NULL"),
    contents: text().default(sql`NULL`),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    authorId: integer("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: text("author_login_id").default("NULL"),
    authorName: text("author_name").default("NULL"),
    commitId: text("commit_id").default("NULL"),
  },
  (table) => [index("ix_commit_comment_project_5").on(table.projectId)],
);

export const email = sqliteTable(
  "email",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    email: text().default("NULL"),
    valid: integer({ mode: "boolean" }).default(false),
    token: text().default("NULL"),
  },
  (table) => [
    index("ix_email_user_6").on(table.userId),
    uniqueIndex("uq_email_email_valid").on(table.email, table.valid),
  ],
);

export const favoriteIssue = sqliteTable(
  "favorite_issue",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    issueId: integer("issue_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issue.id, { onDelete: "cascade", onUpdate: "restrict" }),
  },
  (table) => [
    uniqueIndex("uq_favorite_issue_user_id_issue_id_1").on(table.userId, table.issueId),
    index("ix_favorite_issue_user_1").on(table.userId),
    index("ix_favorite_issue_project_2").on(table.issueId),
  ],
);

export const favoriteOrganization = sqliteTable(
  "favorite_organization",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    organizationId: integer("organization_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => organization.id, { onDelete: "cascade", onUpdate: "restrict" }),
    organizationName: text("organization_name").default("NULL"),
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

export const favoriteProject = sqliteTable(
  "favorite_project",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "restrict" }),
    owner: text().default("NULL"),
    projectName: text("project_name").default("NULL"),
  },
  (table) => [
    index("ix_favorite_project_project_2").on(table.projectId),
    uniqueIndex("uq_favorite_project_user_id_project_id_1").on(table.userId, table.projectId),
    index("ix_favorite_project_user_1").on(table.userId),
  ],
);

export const issue = sqliteTable(
  "issue",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    title: text().default("NULL"),
    body: text().default(sql`NULL`),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    updatedDate: integer("updated_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    authorId: integer("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: text("author_login_id").default("NULL"),
    authorName: text("author_name").default("NULL"),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "cascade" }),
    number: integer({ mode: "number" }).default(sql`NULL`),
    numOfComments: integer("num_of_comments").default(sql`NULL`),
    state: integer().default(sql`NULL`),
    dueDate: integer("due_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    milestoneId: integer("milestone_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => milestone.id, { onDelete: "restrict", onUpdate: "restrict" }),
    assigneeId: integer("assignee_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => assignee.id, { onDelete: "set null", onUpdate: "cascade" }),
    history: text().default(sql`NULL`),
    parentId: integer("parent_id", { mode: "number" }).default(sql`NULL`),
    weight: int().default(0),
    updatedByAuthorId: integer("updated_by_author_id", { mode: "number" }).default(sql`NULL`),
    isDraft: integer("is_draft", { mode: "boolean" }).default(false),
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

export const issueComment = sqliteTable(
  "issue_comment",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    contents: text().default(sql`NULL`),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    authorId: integer("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: text("author_login_id").default("NULL"),
    authorName: text("author_name").default("NULL"),
    issueId: integer("issue_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issue.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: integer("project_id", { mode: "number" }).notNull(),
    parentCommentId: integer("parent_comment_id", { mode: "number" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_issue_comment_author_id").on(table.authorId),
    index("ix_issue_comment_issue_10").on(table.issueId),
    index("ix_issue_comment_parent_id").on(table.parentCommentId),
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

export const issueCommentVoter = sqliteTable(
  "issue_comment_voter",
  {
    issueCommentId: integer("issue_comment_id", { mode: "number" })
      .notNull()
      .references(() => issueComment.id, { onDelete: "restrict", onUpdate: "restrict" }),
    userId: integer("user_id", { mode: "number" })
      .notNull()
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_issue_comment_voter_user_id").on(table.userId)],
);

export const issueEvent = sqliteTable(
  "issue_event",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    created: integer({ mode: "timestamp" }).default(new Date("NULLZ")),
    senderLoginId: text("sender_login_id").default("NULL"),
    senderEmail: text("sender_email").default("NULL"),
    issueId: integer("issue_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issue.id, { onDelete: "restrict", onUpdate: "restrict" }),
    eventType: text("event_type").default("NULL"),
    oldValue: text("old_value").default(sql`NULL`),
    newValue: text("new_value").default(sql`NULL`),
  },
  (table) => [index("ix_issue_event_issue_11").on(table.issueId)],
);

export const issueIssueLabel = sqliteTable("issue_issue_label", {
  issueId: integer("issue_id", { mode: "number" })
    .notNull()
    .references(() => issue.id, { onDelete: "restrict", onUpdate: "restrict" }),
  issueLabelId: integer("issue_label_id", { mode: "number" })
    .notNull()
    .references(() => issueLabel.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const issueLabel = sqliteTable(
  "issue_label",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issueLabelCategory.id, { onDelete: "restrict", onUpdate: "restrict" }),
    color: text().default("NULL"),
    name: text().default("NULL"),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_issue_label_category_12").on(table.categoryId),
    index("ix_issue_label_project_13").on(table.projectId),
  ],
);

export const issueLabelCategory = sqliteTable(
  "issue_label_category",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    name: text().default("NULL"),
    isExclusive: integer("is_exclusive", { mode: "boolean" }).default(false),
  },
  (table) => [index("ix_issue_label_category_project_14").on(table.projectId)],
);

export const issueSharer = sqliteTable(
  "issue_sharer",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    created: integer({ mode: "timestamp" }).default(new Date("NULL")),
    loginId: text("login_id").default("NULL"),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    issueId: integer("issue_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issue.id, { onDelete: "cascade", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_issue_sharer_user_id").on(table.userId),
    index("ix_issue_sharer_issue_id").on(table.issueId),
    index("ix_issue_sharer_login_id").on(table.loginId),
  ],
);

export const issueVoter = sqliteTable(
  "issue_voter",
  {
    issueId: integer("issue_id", { mode: "number" })
      .notNull()
      .references(() => issue.id, { onDelete: "restrict", onUpdate: "restrict" }),
    userId: integer("user_id", { mode: "number" })
      .notNull()
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_issue_voter_user_id").on(table.userId)],
);

export const label = sqliteTable(
  "label",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    category: text().default("NULL"),
    name: text().default("NULL"),
  },
  (table) => [uniqueIndex("uq_label_1").on(table.category, table.name)],
);

export const linkedAccount = sqliteTable(
  "linked_account",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userCredentialId: integer("user_credential_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => userCredential.id, { onDelete: "cascade", onUpdate: "restrict" }),
    providerUserId: text("provider_user_id").default("NULL"),
    providerKey: text("provider_key").default("NULL"),
    providerDisplayName: text("provider_display_name").default("NULL"),
    avatarUrl: text("avatar_url").default("NULL"),
    password: text().default("NULL"),
    accessToken: text("access_token").default("NULL"),
    refreshToken: text("refresh_token").default("NULL"),
    idToken: text("id_token").default("NULL"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }).default(
      sql`NULL`,
    ),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }).default(
      sql`NULL`,
    ),
    scope: text().default("NULL"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`NULL`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_linked_account_user_credential_1").on(table.userCredentialId),
    uniqueIndex("uq_linked_account_provider_user_id_provider_key").on(
      table.providerUserId,
      table.providerKey,
    ),
  ],
);

export const mention = sqliteTable(
  "mention",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    resourceType: text("resource_type").default("NULL"),
    resourceId: text("resource_id").default("NULL"),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_mention_resource_type").on(table.resourceType),
    index("ix_mention_user_15").on(table.userId),
  ],
);

export const milestone = sqliteTable(
  "milestone",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    title: text().default("NULL"),
    dueDate: integer("due_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    contents: text().default(sql`NULL`),
    state: integer().default(sql`NULL`),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    uniqueIndex("uq_milestone_1").on(table.projectId, table.title),
    index("ix_milestone_project_16").on(table.projectId),
  ],
);

export const n4user = sqliteTable(
  "n4user",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: text().default("NULL"),
    loginId: text("login_id").default("NULL"),
    password: text().default("NULL"),
    passwordSalt: text("password_salt").default("NULL"),
    email: text().default("NULL"),
    rememberMe: integer("remember_me", { mode: "boolean" }).default(false),
    state: text().default("NULL"),
    lastStateModifiedDate: integer("last_state_modified_date", { mode: "timestamp" }).default(
      new Date("NULLZ"),
    ),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    lang: text().default("NULL"),
    token: text().default("NULL"),
    isGuest: integer("is_guest", { mode: "boolean" }).default(false),
    englishName: text("english_name").default("NULL"),
  },
  (table) => [
    index("ix_n4user_email").on(table.email),
    uniqueIndex("uq_n4user_1").on(table.loginId),
    uniqueIndex("uq_n4user_token").on(table.token),
    index("ix_n4user_is_guest").on(table.isGuest),
  ],
);

export const notificationEvent = sqliteTable(
  "notification_event",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    title: text().default("NULL"),
    senderId: integer("sender_id", { mode: "number" }).default(sql`NULL`),
    created: integer({ mode: "timestamp" }).default(new Date("NULLZ")),
    resourceType: text("resource_type").default("NULL"),
    resourceId: text("resource_id").default("NULL"),
    eventType: text("event_type").default("NULL"),
    oldValue: text("old_value").default(sql`NULL`),
    newValue: text("new_value").default(sql`NULL`),
  },
  (table) => [index("ix_notification_event_created").on(table.created)],
);

export const notificationEventN4user = sqliteTable("notification_event_n4user", {
  notificationEventId: integer("notification_event_id", { mode: "number" })
    .notNull()
    .references(() => notificationEvent.id, { onDelete: "restrict", onUpdate: "restrict" }),
  n4userId: integer("n4user_id", { mode: "number" })
    .notNull()
    .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const notificationMail = sqliteTable(
  "notification_mail",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    notificationEventId: integer("notification_event_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => notificationEvent.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_notification_mail_notificationEvent_17").on(table.notificationEventId)],
);

export const organization = sqliteTable(
  "organization",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: text().default("NULL"),
    created: integer({ mode: "timestamp" }).default(new Date("NULLZ")),
    descr: text().default("NULL"),
  },
  (table) => [uniqueIndex("uq_organization_name").on(sql`lower(${table.name})`)],
);

export const organizationUser = sqliteTable(
  "organization_user",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    organizationId: integer("organization_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => organization.id, { onDelete: "restrict", onUpdate: "restrict" }),
    roleId: integer("role_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => role.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_organization_user_role_20").on(table.roleId),
    index("ix_organization_user_user_18").on(table.userId),
    index("ix_organization_user_organization_19").on(table.organizationId),
  ],
);

export const originalEmail = sqliteTable(
  "original_email",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    messageId: text("message_id").default("NULL"),
    resourceType: text("resource_type").default("NULL"),
    resourceId: text("resource_id").default("NULL"),
    handledDate: integer("handled_date", { mode: "timestamp" }).default(new Date("NULLZ")),
  },
  (table) => [
    uniqueIndex("uq_original_email_message_id").on(table.messageId),
    index("ix_original_email_resource_id").on(table.resourceId),
    uniqueIndex("uq_original_email_1").on(table.resourceType, table.resourceId),
  ],
);

export const playEvolutions = sqliteTable("play_evolutions", {
  id: integer().notNull(),
  hash: text().notNull(),
  appliedAt: integer("applied_at", { mode: "timestamp" })
    .default(new Date("current_timestamp()Z"))
    .notNull(),
  applyScript: text("apply_script").default(sql`NULL`),
  revertScript: text("revert_script").default(sql`NULL`),
  state: text().default("NULL"),
  lastProblem: text("last_problem").default(sql`NULL`),
});

export const posting = sqliteTable(
  "posting",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    title: text().default("NULL"),
    body: text().default(sql`NULL`),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    updatedDate: integer("updated_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    authorId: integer("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: text("author_login_id").default("NULL"),
    authorName: text("author_name").default("NULL"),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    number: integer({ mode: "number" }).default(sql`NULL`),
    numOfComments: integer("num_of_comments").default(sql`NULL`),
    notice: integer({ mode: "boolean" }).default(false),
    readme: integer({ mode: "boolean" }).default(false),
    history: text().default(sql`NULL`),
    parentId: integer("parent_id", { mode: "number" }).default(sql`NULL`),
    updatedByAuthorId: integer("updated_by_author_id", { mode: "number" }).default(sql`NULL`),
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

export const postingComment = sqliteTable(
  "posting_comment",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    contents: text().default(sql`NULL`),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    authorId: integer("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: text("author_login_id").default("NULL"),
    authorName: text("author_name").default("NULL"),
    postingId: integer("posting_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => posting.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: integer("project_id", { mode: "number" }).notNull(),
    parentCommentId: integer("parent_comment_id", { mode: "number" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_posting_comment_posting_22").on(table.postingId),
    index("ix_posting_comment_author_id").on(table.authorId),
    index("ix_posting_comment_project_id").on(table.projectId),
    index("ix_posting_comment_parent_id").on(table.parentCommentId),
    foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
      name: "fk_posting_comment_parent_id_01",
    })
      .onUpdate("restrict")
      .onDelete("set null"),
  ],
);

export const postingIssueLabel = sqliteTable("posting_issue_label", {
  postingId: integer("posting_id", { mode: "number" })
    .notNull()
    .references(() => posting.id, { onDelete: "restrict", onUpdate: "restrict" }),
  issueLabelId: integer("issue_label_id", { mode: "number" })
    .notNull()
    .references(() => issueLabel.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const project = sqliteTable(
  "project",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: text().default("NULL"),
    overview: text().default("NULL"),
    vcs: text().default("NULL"),
    siteurl: text().default("NULL"),
    owner: text().default("NULL"),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    lastIssueNumber: integer("last_issue_number", { mode: "number" }).default(sql`NULL`),
    lastPostingNumber: integer("last_posting_number", { mode: "number" }).default(sql`NULL`),
    originalProjectId: integer("original_project_id", { mode: "number" }).default(sql`NULL`),
    lastPushedDate: integer("last_pushed_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    defaultReviewerCount: integer("default_reviewer_count").default(sql`NULL`),
    isUsingReviewerCount: integer("is_using_reviewer_count", { mode: "boolean" }).default(false),
    organizationId: integer("organization_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => organization.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectScope: text("project_scope").default("NULL"),
    previousOwnerLoginId: text("previous_owner_login_id").default("NULL"),
    previousName: text("previous_name").default("NULL"),
    previousNameChangedTime: integer("previous_name_changed_time", { mode: "number" }).default(
      sql`NULL`,
    ),
    isCodeAccessibleMemberOnly: integer("is_code_accessible_member_only", {
      mode: "boolean",
    }).default(false),
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

export const projectLabel = sqliteTable("project_label", {
  projectId: integer("project_id", { mode: "number" })
    .notNull()
    .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
  labelId: integer("label_id", { mode: "number" })
    .notNull()
    .references(() => label.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const projectMenuSetting = sqliteTable(
  "project_menu_setting",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    code: integer({ mode: "boolean" }).default(false),
    issue: integer({ mode: "boolean" }).default(false),
    pullRequest: integer("pull_request", { mode: "boolean" }).default(false),
    review: integer({ mode: "boolean" }).default(false),
    milestone: integer({ mode: "boolean" }).default(false),
    board: integer({ mode: "boolean" }).default(false),
  },
  (table) => [index("ix_project_menu_setting_project_25").on(table.projectId)],
);

export const projectPushedBranch = sqliteTable(
  "project_pushed_branch",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    pushedDate: integer("pushed_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    name: text().default("NULL"),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_project_pushed_branch_project_39").on(table.projectId)],
);

export const projectTransfer = sqliteTable(
  "project_transfer",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    senderId: integer("sender_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    destination: text().default("NULL"),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    requested: integer({ mode: "timestamp" }).default(new Date("NULLZ")),
    confirmKey: text("confirm_key").default("NULL"),
    accepted: integer({ mode: "boolean" }).default(false),
    newProjectName: text("new_project_name").default("NULL"),
  },
  (table) => [
    index("ix_project_transfer_project_27").on(table.projectId),
    index("ix_project_transfer_sender_26").on(table.senderId),
  ],
);

export const projectUser = sqliteTable(
  "project_user",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    roleId: integer("role_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => role.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [
    index("ix_project_user_user_28").on(table.userId),
    index("ix_project_user_role_30").on(table.roleId),
    index("ix_project_user_project_29").on(table.projectId),
  ],
);

export const projectVisitation = sqliteTable(
  "project_visitation",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "cascade" }),
    recentlyVisitedProjectsId: integer("recently_visited_projects_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => recentlyVisitedProjects.id, { onDelete: "restrict", onUpdate: "restrict" }),
    visited: integer({ mode: "timestamp" }).default(new Date("NULLZ")),
  },
  (table) => [
    index("ix_project_visitation_recentlyVisitedProjects_32").on(table.recentlyVisitedProjectsId),
    uniqueIndex("uq_project_visitation_1").on(table.projectId, table.recentlyVisitedProjectsId),
    index("ix_project_visitation_project_31").on(table.projectId),
  ],
);

export const property = sqliteTable("property", {
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text().default("NULL"),
  value: text().default("NULL"),
});

export const pullRequest = sqliteTable(
  "pull_request",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    title: text().default("NULL"),
    body: text().default(sql`NULL`),
    toProjectId: integer("to_project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    fromProjectId: integer("from_project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    toBranch: text("to_branch").default("NULL"),
    fromBranch: text("from_branch").default("NULL"),
    contributorId: integer("contributor_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    receiverId: integer("receiver_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    created: integer({ mode: "timestamp" }).default(new Date("NULLZ")),
    updated: integer({ mode: "timestamp" }).default(new Date("NULLZ")),
    received: integer({ mode: "timestamp" }).default(new Date("NULLZ")),
    state: integer().default(sql`NULL`),
    isConflict: integer("is_conflict", { mode: "boolean" }).default(false),
    isMerging: integer("is_merging", { mode: "boolean" }).default(false),
    lastCommitId: text("last_commit_id").default("NULL"),
    mergedCommitIdFrom: text("merged_commit_id_from").default("NULL"),
    mergedCommitIdTo: text("merged_commit_id_to").default("NULL"),
    number: integer({ mode: "number" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_pull_request_toProject_33").on(table.toProjectId),
    index("ix_pull_request_contributor_35").on(table.contributorId),
    index("ix_pull_request_number").on(table.number),
    index("ix_pull_request_fromProject_34").on(table.fromProjectId),
    index("ix_pull_request_receiver_36").on(table.receiverId),
  ],
);

export const pullRequestCommit = sqliteTable(
  "pull_request_commit",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    pullRequestId: integer("pull_request_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => pullRequest.id, { onDelete: "restrict", onUpdate: "restrict" }),
    commitId: text("commit_id").default("NULL"),
    authorDate: integer("author_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    created: integer({ mode: "timestamp" }).default(new Date("NULLZ")),
    commitMessage: text("commit_message").default(sql`NULL`),
    commitShortId: text("commit_short_id").default("NULL"),
    authorEmail: text("author_email").default("NULL"),
    state: text().default("NULL"),
  },
  (table) => [index("ix_pull_request_commit_pullRequest_37").on(table.pullRequestId)],
);

export const pullRequestEvent = sqliteTable(
  "pull_request_event",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    senderLoginId: text("sender_login_id").default("NULL"),
    pullRequestId: integer("pull_request_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => pullRequest.id, { onDelete: "restrict", onUpdate: "restrict" }),
    eventType: text("event_type").default("NULL"),
    created: integer({ mode: "timestamp" }).default(new Date("NULLZ")),
    oldValue: text("old_value").default(sql`NULL`),
    newValue: text("new_value").default(sql`NULL`),
  },
  (table) => [index("ix_pull_request_event_pullRequest_38").on(table.pullRequestId)],
);

export const pullRequestReviewers = sqliteTable("pull_request_reviewers", {
  pullRequestId: integer("pull_request_id", { mode: "number" })
    .notNull()
    .references(() => pullRequest.id, { onDelete: "restrict", onUpdate: "restrict" }),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const recentlyVisitedProjects = sqliteTable(
  "recently_visited_projects",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_recently_visited_projects_user_40").on(table.userId)],
);

export const recentIssue = sqliteTable(
  "recent_issue",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    issueId: integer("issue_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => issue.id, { onDelete: "cascade", onUpdate: "restrict" }),
    postingId: integer("posting_id", { mode: "number" }).default(sql`NULL`),
    title: text().default("NULL"),
    url: text().default("NULL"),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
  },
  (table) => [
    index("ix_recent_issue_user_1").on(table.userId),
    uniqueIndex("uq_recent_issue_user_id_issue_id_1").on(table.userId, table.issueId),
    uniqueIndex("uq_recent_issue_user_id_posting_id_1").on(table.userId, table.postingId),
    index("ix_recent_issue_issue_2").on(table.userId, table.issueId),
    index("ix_recent_issue_posting_3").on(table.userId, table.postingId),
  ],
);

export const recentProject = sqliteTable(
  "recent_project",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" }).default(sql`NULL`),
    owner: text().default("NULL"),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "cascade" }),
    projectName: text("project_name").default("NULL"),
  },
  (table) => [uniqueIndex("uq_recent_project_1").on(table.userId, table.projectId)],
);

export const reviewComment = sqliteTable(
  "review_comment",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    contents: text().default(sql`NULL`),
    createdDate: integer("created_date", { mode: "timestamp" }).default(new Date("NULLZ")),
    authorId: integer("author_id", { mode: "number" }).default(sql`NULL`),
    authorLoginId: text("author_login_id").default("NULL"),
    authorName: text("author_name").default("NULL"),
    threadId: integer("thread_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => commentThread.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_review_comment_thread_41").on(table.threadId)],
);

export const role = sqliteTable("role", {
  id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text().default("NULL"),
  active: integer({ mode: "boolean" }).default(false),
});

export const siteAdmin = sqliteTable(
  "site_admin",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    adminId: integer("admin_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  (table) => [index("ix_site_admin_admin_42").on(table.adminId)],
);

export const titleHead = sqliteTable(
  "title_head",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "cascade", onUpdate: "restrict" }),
    headKeyword: text("head_keyword").default("NULL"),
    frequency: integer().default(sql`NULL`),
  },
  (table) => [
    index("ix_title_head_head_keyword").on(table.headKeyword),
    index("ix_title_head_project_id").on(table.projectId),
  ],
);

export const unwatch = sqliteTable(
  "unwatch",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    resourceType: text("resource_type").default("NULL"),
    resourceId: text("resource_id").default("NULL"),
  },
  (table) => [
    index("ix_unwatch_user_43").on(table.userId),
    index("ix_unwatch_resource_id_resource_type").on(table.resourceId, table.resourceType),
  ],
);

export const userCredential = sqliteTable(
  "user_credential",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    loginId: text("login_id").default("NULL"),
    email: text().default("NULL"),
    name: text().default("NULL"),
    active: integer({ mode: "boolean" }).default(false),
    emailValidated: integer("email_validated", { mode: "boolean" }).default(false),
    image: text().default("NULL"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`NULL`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_user_credential_user_id_1").on(table.userId),
    uniqueIndex("uq_user_credential_email").on(table.email),
    uniqueIndex("uq_user_credential_login_id").on(table.loginId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`NULL`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`NULL`),
  },
  (table) => [
    uniqueIndex("uq_verification_identifier").on(table.identifier),
    index("ix_verification_expires_at").on(table.expiresAt),
  ],
);

export const userEnrolledOrganization = sqliteTable("user_enrolled_organization", {
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  organizationId: integer("organization_id", { mode: "number" })
    .notNull()
    .references(() => organization.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const userEnrolledProject = sqliteTable("user_enrolled_project", {
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
  projectId: integer("project_id", { mode: "number" })
    .notNull()
    .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
});

export const userProjectNotification = sqliteTable(
  "user_project_notification",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    notificationType: text("notification_type").default("NULL"),
    allowed: integer({ mode: "boolean" }).default(false),
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

export const userSetting = sqliteTable(
  "user_setting",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    loginDefaultPage: text("login_default_page").default("NULL"),
  },
  (table) => [index("ix_user_setting_user_1").on(table.userId)],
);

export const userVerification = sqliteTable(
  "user_verification",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "cascade", onUpdate: "restrict" }),
    loginId: text("login_id").default("NULL"),
    verificationCode: text("verification_code").default("NULL"),
    timestamp: integer({ mode: "number" }).default(sql`NULL`),
  },
  (table) => [
    index("ix_user_verification_user_1").on(table.userId),
    index("ix_user_verification_user_2").on(table.loginId, table.verificationCode),
  ],
);

export const watch = sqliteTable(
  "watch",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: integer("user_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => n4user.id, { onDelete: "restrict", onUpdate: "restrict" }),
    resourceType: text("resource_type").default("NULL"),
    resourceId: text("resource_id").default("NULL"),
  },
  (table) => [
    index("ix_watch_resource_id_resource_type").on(table.resourceId, table.resourceType),
    index("ix_watch_user_46").on(table.userId),
  ],
);

export const webhook = sqliteTable(
  "webhook",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    projectId: integer("project_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => project.id, { onDelete: "restrict", onUpdate: "restrict" }),
    payloadUrl: text("payload_url").default("NULL"),
    secret: text().default("NULL"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(new Date("NULLZ")),
    gitPush: integer("git_push", { mode: "boolean" }).default(false),
    webhookType: integer("webhook_type", { mode: "boolean" }).default(true),
  },
  (table) => [
    index("ix_webhook_project_47").on(table.projectId),
    index("ix_webhook_webhook_type").on(table.webhookType),
    index("ix_webhook_git_push_only").on(table.gitPush),
  ],
);

export const webhookThread = sqliteTable(
  "webhook_thread",
  {
    id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    webhookId: integer("webhook_id", { mode: "number" })
      .default(sql`NULL`)
      .references(() => webhook.id, { onDelete: "cascade", onUpdate: "restrict" }),
    resourceType: text("resource_type").default("NULL"),
    resourceId: text("resource_id").default("NULL"),
    threadId: text("thread_id").default("NULL"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(new Date("NULLZ")),
  },
  (table) => [
    index("ix_webhook_thread_webhook_1").on(table.webhookId),
    index("ix_webhook_thread_resource_2").on(table.resourceType, table.resourceId),
  ],
);
