import { z } from "zod";
import { authDisplayNameSchema, authLoginIdSchema } from "./auth";
import { projectRefSchema } from "./project";

export const issueNumberSchema = z.number().int().positive();

export const issueRefSchema = projectRefSchema
  .extend({
    issueNumber: issueNumberSchema,
  })
  .strict();

export type IssueRef = z.infer<typeof issueRefSchema>;

export const issueStateSchema = z.enum(["closed", "open"]);

export type IssueState = z.infer<typeof issueStateSchema>;

export const issueSummarySchema = z
  .object({
    authorLoginId: authLoginIdSchema,
    authorName: authDisplayNameSchema,
    createdAt: z.date().nullable(),
    issueNumber: issueNumberSchema,
    projectName: z.string().trim().min(1),
    ownerName: z.string().trim().min(1),
    state: issueStateSchema,
    title: z.string().trim().min(1),
  })
  .strict();

export type IssueSummary = z.infer<typeof issueSummarySchema>;

export const issueCommentSchema = z
  .object({
    authorLoginId: authLoginIdSchema,
    authorName: authDisplayNameSchema,
    commentId: z.number().int().positive(),
    contents: z.string(),
    createdAt: z.date().nullable(),
  })
  .strict();

export type IssueComment = z.infer<typeof issueCommentSchema>;

export const issueDetailSchema = issueSummarySchema
  .extend({
    body: z.string().nullable(),
    comments: z.array(issueCommentSchema),
  })
  .strict();

export type IssueDetail = z.infer<typeof issueDetailSchema>;

export const issueCreateInputSchema = projectRefSchema
  .extend({
    body: z.string().trim().max(10000).nullable(),
    title: z.string().trim().min(1).max(255),
  })
  .strict();

export type IssueCreateInput = z.infer<typeof issueCreateInputSchema>;

export const issueCommentCreateInputSchema = issueRefSchema
  .extend({
    contents: z.string().trim().min(1).max(10000),
  })
  .strict();

export type IssueCommentCreateInput = z.infer<typeof issueCommentCreateInputSchema>;

export const issueStateUpdateInputSchema = issueRefSchema
  .extend({
    state: issueStateSchema,
  })
  .strict();

export type IssueStateUpdateInput = z.infer<typeof issueStateUpdateInputSchema>;
