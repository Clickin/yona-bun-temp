import { z } from "zod";
import { authDisplayNameSchema, authLoginIdSchema } from "./auth";
import { projectRefSchema } from "./project";
import {
  repositoryCommitDiscussionCodeRangeSchema,
  repositoryFilePathSchema,
  repositoryOidSchema,
} from "./repo";

export const pullRequestNumberSchema = z.number().int().positive();
export const pullRequestStateSchema = z.enum(["closed", "merged", "open"]);
export const pullRequestStateTransitionSchema = z.enum(["closed", "open"]);
export const pullRequestReviewThreadStateSchema = z.enum(["closed", "open"]);
export const pullRequestReviewThreadOrderBySchema = z.enum(["createdDate"]);
export const pullRequestReviewThreadOrderDirSchema = z.enum(["asc", "desc"]);

export type PullRequestState = z.infer<typeof pullRequestStateSchema>;
export type PullRequestReviewThreadState = z.infer<typeof pullRequestReviewThreadStateSchema>;
export type PullRequestReviewThreadOrderBy = z.infer<typeof pullRequestReviewThreadOrderBySchema>;
export type PullRequestReviewThreadOrderDir = z.infer<typeof pullRequestReviewThreadOrderDirSchema>;

export const pullRequestReviewSummarySchema = z
  .object({
    closedThreadCount: z.number().int().min(0),
    openThreadCount: z.number().int().min(0),
    reviewerCount: z.number().int().min(0),
  })
  .strict();

export type PullRequestReviewSummary = z.infer<typeof pullRequestReviewSummarySchema>;

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
    reviewSummary: pullRequestReviewSummarySchema,
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
    state: pullRequestStateTransitionSchema,
  })
  .strict();

export type PullRequestStateUpdateInput = z.infer<typeof pullRequestStateUpdateInputSchema>;

export const pullRequestReviewThreadFilterInputSchema = projectRefSchema
  .extend({
    authorLoginId: authLoginIdSchema.optional(),
    filter: z.string().trim().min(1).max(255).optional(),
    orderBy: pullRequestReviewThreadOrderBySchema.optional(),
    orderDir: pullRequestReviewThreadOrderDirSchema.optional(),
    participantLoginId: authLoginIdSchema.optional(),
    pullRequestNumber: pullRequestNumberSchema.optional(),
    state: pullRequestReviewThreadStateSchema.optional(),
  })
  .strict();

export type PullRequestReviewThreadFilterInput = z.infer<
  typeof pullRequestReviewThreadFilterInputSchema
>;

export const pullRequestReviewCommentSchema = z
  .object({
    authorLoginId: authLoginIdSchema,
    authorName: authDisplayNameSchema,
    commentId: z.number().int().positive(),
    contents: z.string().trim().min(1),
    createdAt: z.date().nullable(),
  })
  .strict();

export type PullRequestReviewComment = z.infer<typeof pullRequestReviewCommentSchema>;

export const pullRequestReviewThreadSchema = z
  .object({
    authorLoginId: authLoginIdSchema,
    authorName: authDisplayNameSchema,
    comments: pullRequestReviewCommentSchema.array(),
    commitId: z.string().trim().min(1).nullable(),
    createdAt: z.date().nullable(),
    lastCommentAt: z.date().nullable(),
    participants: authLoginIdSchema.array(),
    path: z.string().trim().min(1).nullable(),
    projectName: z.string().trim().min(1),
    replyCount: z.number().int().min(0),
    state: pullRequestReviewThreadStateSchema,
    text: z.string().trim().min(1),
    threadId: z.string().trim().min(1),
  })
  .strict();

export type PullRequestReviewThread = z.infer<typeof pullRequestReviewThreadSchema>;

export const pullRequestReviewCountsSchema = z
  .object({
    all: z.number().int().min(0),
    closed: z.number().int().min(0),
    createdByYou: z.number().int().min(0),
    involvingYou: z.number().int().min(0),
    open: z.number().int().min(0),
  })
  .strict();

export type PullRequestReviewCounts = z.infer<typeof pullRequestReviewCountsSchema>;

export const pullRequestReviewCommentCreateInputSchema = pullRequestRefSchema
  .extend({
    commitId: repositoryOidSchema.optional(),
    contents: z.string().trim().min(1).max(10000),
    path: repositoryFilePathSchema.optional(),
    range: repositoryCommitDiscussionCodeRangeSchema.optional(),
    threadId: z.number().int().positive().optional(),
  })
  .strict();

export type PullRequestReviewCommentCreateInput = z.infer<
  typeof pullRequestReviewCommentCreateInputSchema
>;

export const pullRequestReviewCommentDeleteInputSchema = pullRequestRefSchema
  .extend({
    commentId: z.number().int().positive(),
  })
  .strict();

export type PullRequestReviewCommentDeleteInput = z.infer<
  typeof pullRequestReviewCommentDeleteInputSchema
>;

export const pullRequestReviewCommentDeleteOutputSchema = z
  .object({
    deletedCommentId: z.number().int().positive(),
    threadDeleted: z.boolean(),
    threadId: z.number().int().positive(),
  })
  .strict();

export type PullRequestReviewCommentDeleteOutput = z.infer<
  typeof pullRequestReviewCommentDeleteOutputSchema
>;

export const pullRequestReviewThreadStateUpdateInputSchema = pullRequestRefSchema
  .extend({
    state: pullRequestReviewThreadStateSchema,
    threadId: z.number().int().positive(),
  })
  .strict();

export type PullRequestReviewThreadStateUpdateInput = z.infer<
  typeof pullRequestReviewThreadStateUpdateInputSchema
>;

export const pullRequestMergePreviewInputSchema = pullRequestRefSchema;

export type PullRequestMergePreviewInput = z.infer<typeof pullRequestMergePreviewInputSchema>;

export const pullRequestMergePreviewOutputSchema = z
  .object({
    blockedReason: z.string().trim().min(1).nullable(),
    conflictedFiles: repositoryFilePathSchema.array(),
    mergeable: z.boolean(),
  })
  .strict();

export type PullRequestMergePreviewOutput = z.infer<typeof pullRequestMergePreviewOutputSchema>;

export const pullRequestMergeInputSchema = pullRequestRefSchema;

export type PullRequestMergeInput = z.infer<typeof pullRequestMergeInputSchema>;

export const pullRequestMergeOutputSchema = z
  .object({
    conflicted: z.boolean(),
    conflictedFiles: repositoryFilePathSchema.array(),
    merged: z.boolean(),
    mergedPullRequestState: z.enum(["merged", "open"]),
  })
  .strict();

export type PullRequestMergeOutput = z.infer<typeof pullRequestMergeOutputSchema>;
