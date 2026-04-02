import { z } from "zod";
import { authDisplayNameSchema, authLoginIdSchema } from "./auth";

export const repositoryIdSchema = z.string().trim().min(1, "Repository id is required.");

export const repositoryBranchSchema = z.string().trim().min(1, "Branch is required.");

export const repositoryFilePathSchema = z.string().trim().min(1, "File path is required.");

export const repositoryCommitMessageSchema = z
  .string()
  .trim()
  .min(1, "Commit message is required.");

export const repositoryOidSchema = z.string().trim().min(1);

export const bootstrapRepositoryInputSchema = z
  .object({
    repoId: repositoryIdSchema,
  })
  .strict();

export type BootstrapRepositoryInput = z.infer<typeof bootstrapRepositoryInputSchema>;

export const bootstrapRepositoryOutputSchema = z
  .object({
    created: z.boolean(),
    repositoryId: repositoryIdSchema,
    repositoryPath: z.string().min(1),
  })
  .strict();

export type BootstrapRepositoryOutput = z.infer<typeof bootstrapRepositoryOutputSchema>;

export const readRepositoryFileInputSchema = z
  .object({
    branch: repositoryBranchSchema,
    filePath: repositoryFilePathSchema,
    repoId: repositoryIdSchema,
  })
  .strict();

export type ReadRepositoryFileInput = z.infer<typeof readRepositoryFileInputSchema>;

export const readRepositoryFileOutputSchema = z
  .object({
    baseOid: repositoryOidSchema,
    branch: repositoryBranchSchema,
    content: z.string(),
    filePath: repositoryFilePathSchema,
    repositoryId: repositoryIdSchema,
  })
  .strict();

export type ReadRepositoryFileOutput = z.infer<typeof readRepositoryFileOutputSchema>;

export const repositoryBranchSummarySchema = z
  .object({
    isHead: z.boolean(),
    name: repositoryBranchSchema,
    oid: repositoryOidSchema,
  })
  .strict();

export type RepositoryBranchSummary = z.infer<typeof repositoryBranchSummarySchema>;

export const listRepositoryBranchesInputSchema = z
  .object({
    repoId: repositoryIdSchema,
  })
  .strict();

export type ListRepositoryBranchesInput = z.infer<typeof listRepositoryBranchesInputSchema>;

export const listRepositoryBranchesOutputSchema = repositoryBranchSummarySchema.array();

export type ListRepositoryBranchesOutput = z.infer<typeof listRepositoryBranchesOutputSchema>;

export const repositoryCommitSummarySchema = z
  .object({
    authorName: z.string().trim().min(1),
    authoredAt: z.date(),
    oid: repositoryOidSchema,
    shortOid: repositoryOidSchema,
    subject: z.string(),
  })
  .strict();

export type RepositoryCommitSummary = z.infer<typeof repositoryCommitSummarySchema>;

export const listRepositoryCommitsInputSchema = z
  .object({
    branch: repositoryBranchSchema,
    limit: z.number().int().min(1).max(100).default(20),
    repoId: repositoryIdSchema,
  })
  .strict();

export type ListRepositoryCommitsInput = z.infer<typeof listRepositoryCommitsInputSchema>;

export const listRepositoryCommitsOutputSchema = repositoryCommitSummarySchema.array();

export type ListRepositoryCommitsOutput = z.infer<typeof listRepositoryCommitsOutputSchema>;

export const readRepositoryCommitInputSchema = z
  .object({
    oid: repositoryOidSchema,
    repoId: repositoryIdSchema,
  })
  .strict();

export type ReadRepositoryCommitInput = z.infer<typeof readRepositoryCommitInputSchema>;

export const readRepositoryCommitOutputSchema = z
  .object({
    authorEmail: z.string().trim().min(1),
    authorName: z.string().trim().min(1),
    authoredAt: z.date(),
    body: z.string(),
    oid: repositoryOidSchema,
    shortOid: repositoryOidSchema,
    subject: z.string(),
  })
  .strict();

export type ReadRepositoryCommitOutput = z.infer<typeof readRepositoryCommitOutputSchema>;

export const inlineEditCommitSchema = z
  .object({
    blobOid: repositoryOidSchema,
    newOid: repositoryOidSchema,
    oldOid: repositoryOidSchema,
    refName: z.string().min(1),
    treeOid: repositoryOidSchema,
  })
  .strict();

export const inlineEditRepositoryInputSchema = z
  .object({
    baseOid: repositoryOidSchema.optional(),
    branch: repositoryBranchSchema,
    content: z.string(),
    filePath: repositoryFilePathSchema,
    message: repositoryCommitMessageSchema,
    repoId: repositoryIdSchema,
  })
  .strict();

export type InlineEditRepositoryInput = z.infer<typeof inlineEditRepositoryInputSchema>;

export const inlineEditRepositoryOutputSchema = z
  .object({
    branch: repositoryBranchSchema,
    commit: inlineEditCommitSchema,
    filePath: repositoryFilePathSchema,
    repositoryId: repositoryIdSchema,
    requestId: z.string().min(1),
  })
  .strict();

export type InlineEditRepositoryOutput = z.infer<typeof inlineEditRepositoryOutputSchema>;

export const repositoryCommitDiscussionThreadStateSchema = z.enum(["closed", "open"]);

export type RepositoryCommitDiscussionThreadState = z.infer<
  typeof repositoryCommitDiscussionThreadStateSchema
>;

export const repositoryCommitDiscussionThreadTypeSchema = z.enum(["non_ranged", "ranged"]);

export type RepositoryCommitDiscussionThreadType = z.infer<
  typeof repositoryCommitDiscussionThreadTypeSchema
>;

export const repositoryCommitDiscussionCodeRangeSchema = z
  .object({
    endColumn: z.number().int().min(0),
    endLine: z.number().int().positive(),
    endSide: z.enum(["A", "B"]),
    path: repositoryFilePathSchema,
    startColumn: z.number().int().min(0),
    startLine: z.number().int().positive(),
    startSide: z.enum(["A", "B"]),
  })
  .strict();

export type RepositoryCommitDiscussionCodeRange = z.infer<
  typeof repositoryCommitDiscussionCodeRangeSchema
>;

export const repositoryCommitDiscussionCommentSchema = z
  .object({
    authorLoginId: authLoginIdSchema,
    authorName: authDisplayNameSchema,
    commentId: z.number().int().positive(),
    createdAt: z.date().nullable(),
    contents: z.string().trim().min(1),
  })
  .strict();

export type RepositoryCommitDiscussionComment = z.infer<
  typeof repositoryCommitDiscussionCommentSchema
>;

export const repositoryCommitDiscussionThreadSchema = z
  .object({
    authorLoginId: authLoginIdSchema,
    authorName: authDisplayNameSchema,
    comments: repositoryCommitDiscussionCommentSchema.array(),
    commitId: repositoryOidSchema,
    createdAt: z.date().nullable(),
    path: repositoryFilePathSchema.nullable(),
    prevCommitId: repositoryOidSchema.nullable(),
    range: repositoryCommitDiscussionCodeRangeSchema.nullable(),
    state: repositoryCommitDiscussionThreadStateSchema,
    threadId: z.number().int().positive(),
    threadType: repositoryCommitDiscussionThreadTypeSchema,
  })
  .strict();

export type RepositoryCommitDiscussionThread = z.infer<
  typeof repositoryCommitDiscussionThreadSchema
>;

export const listRepositoryCommitDiscussionThreadsInputSchema = z
  .object({
    oid: repositoryOidSchema,
    repoId: repositoryIdSchema,
    state: repositoryCommitDiscussionThreadStateSchema.optional(),
  })
  .strict();

export type ListRepositoryCommitDiscussionThreadsInput = z.infer<
  typeof listRepositoryCommitDiscussionThreadsInputSchema
>;

export const listRepositoryCommitDiscussionThreadsOutputSchema =
  repositoryCommitDiscussionThreadSchema.array();

export type ListRepositoryCommitDiscussionThreadsOutput = z.infer<
  typeof listRepositoryCommitDiscussionThreadsOutputSchema
>;

export const createRepositoryCommitDiscussionCommentInputSchema = z
  .object({
    contents: z.string().trim().min(1).max(10000),
    oid: repositoryOidSchema,
    range: repositoryCommitDiscussionCodeRangeSchema.optional(),
    repoId: repositoryIdSchema,
    threadId: z.number().int().positive().optional(),
  })
  .strict();

export type CreateRepositoryCommitDiscussionCommentInput = z.infer<
  typeof createRepositoryCommitDiscussionCommentInputSchema
>;

export const createRepositoryCommitDiscussionCommentOutputSchema =
  repositoryCommitDiscussionThreadSchema;

export type CreateRepositoryCommitDiscussionCommentOutput = z.infer<
  typeof createRepositoryCommitDiscussionCommentOutputSchema
>;

export const deleteRepositoryCommitDiscussionCommentInputSchema = z
  .object({
    commentId: z.number().int().positive(),
    oid: repositoryOidSchema,
    repoId: repositoryIdSchema,
  })
  .strict();

export type DeleteRepositoryCommitDiscussionCommentInput = z.infer<
  typeof deleteRepositoryCommitDiscussionCommentInputSchema
>;

export const deleteRepositoryCommitDiscussionCommentOutputSchema = z
  .object({
    deletedCommentId: z.number().int().positive(),
    threadDeleted: z.boolean(),
    threadId: z.number().int().positive(),
  })
  .strict();

export type DeleteRepositoryCommitDiscussionCommentOutput = z.infer<
  typeof deleteRepositoryCommitDiscussionCommentOutputSchema
>;

export const updateRepositoryCommitDiscussionThreadStateInputSchema = z
  .object({
    oid: repositoryOidSchema,
    repoId: repositoryIdSchema,
    state: repositoryCommitDiscussionThreadStateSchema,
    threadId: z.number().int().positive(),
  })
  .strict();

export type UpdateRepositoryCommitDiscussionThreadStateInput = z.infer<
  typeof updateRepositoryCommitDiscussionThreadStateInputSchema
>;

export const updateRepositoryCommitDiscussionThreadStateOutputSchema =
  repositoryCommitDiscussionThreadSchema;

export type UpdateRepositoryCommitDiscussionThreadStateOutput = z.infer<
  typeof updateRepositoryCommitDiscussionThreadStateOutputSchema
>;
