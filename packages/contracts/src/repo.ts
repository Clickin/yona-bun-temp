import { z } from "zod";

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
