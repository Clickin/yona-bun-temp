import { z } from "zod";
import { authDisplayNameSchema, authLoginIdSchema } from "./auth";
import { projectRefSchema } from "./project";

export const pullRequestNumberSchema = z.number().int().positive();
export const pullRequestStateSchema = z.enum(["closed", "merged", "open"]);

export type PullRequestState = z.infer<typeof pullRequestStateSchema>;

export const pullRequestRefSchema = projectRefSchema
  .extend({
    pullRequestNumber: pullRequestNumberSchema,
  })
  .strict();

export type PullRequestRef = z.infer<typeof pullRequestRefSchema>;

export const pullRequestSummarySchema = z
  .object({
    contributorLoginId: authLoginIdSchema,
    contributorName: authDisplayNameSchema,
    createdAt: z.date().nullable(),
    fromBranch: z.string().trim().min(1),
    ownerName: z.string().trim().min(1),
    projectName: z.string().trim().min(1),
    pullRequestNumber: pullRequestNumberSchema,
    state: pullRequestStateSchema,
    title: z.string().trim().min(1),
    toBranch: z.string().trim().min(1),
  })
  .strict();

export type PullRequestSummary = z.infer<typeof pullRequestSummarySchema>;

export const pullRequestDetailSchema = pullRequestSummarySchema
  .extend({
    body: z.string().nullable(),
  })
  .strict();

export type PullRequestDetail = z.infer<typeof pullRequestDetailSchema>;

export const pullRequestCreateInputSchema = projectRefSchema
  .extend({
    body: z.string().trim().max(10000).nullable(),
    fromBranch: z.string().trim().min(1).max(255),
    title: z.string().trim().min(1).max(255),
    toBranch: z.string().trim().min(1).max(255),
  })
  .strict();

export type PullRequestCreateInput = z.infer<typeof pullRequestCreateInputSchema>;

export const pullRequestStateUpdateInputSchema = pullRequestRefSchema
  .extend({
    state: pullRequestStateSchema,
  })
  .strict();

export type PullRequestStateUpdateInput = z.infer<typeof pullRequestStateUpdateInputSchema>;
