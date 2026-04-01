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

export const issueAssigneeSchema = z
  .object({
    loginId: authLoginIdSchema,
    name: authDisplayNameSchema,
  })
  .strict();

export type IssueAssignee = z.infer<typeof issueAssigneeSchema>;

export const issueSummarySchema = z
  .object({
    assignee: issueAssigneeSchema.nullable(),
    authorLoginId: authLoginIdSchema,
    authorName: authDisplayNameSchema,
    createdAt: z.date().nullable(),
    issueNumber: issueNumberSchema,
    projectName: z.string().trim().min(1),
    ownerName: z.string().trim().min(1),
    state: issueStateSchema,
    title: z.string().trim().min(1),
    voterCount: z.number().int().nonnegative(),
    watcherCount: z.number().int().nonnegative(),
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

export const issueTimelineCommentSchema = issueCommentSchema
  .extend({
    kind: z.literal("comment"),
  })
  .strict();

export type IssueTimelineComment = z.infer<typeof issueTimelineCommentSchema>;

export const issueTimelineEventSchema = z
  .object({
    createdAt: z.date().nullable(),
    eventId: z.number().int().positive(),
    eventType: z.string().trim().min(1),
    kind: z.literal("event"),
    newValue: z.string().nullable(),
    oldValue: z.string().nullable(),
    senderLoginId: authLoginIdSchema.nullable(),
  })
  .strict();

export type IssueTimelineEvent = z.infer<typeof issueTimelineEventSchema>;

export const issueTimelineItemSchema = z.discriminatedUnion("kind", [
  issueTimelineCommentSchema,
  issueTimelineEventSchema,
]);

export type IssueTimelineItem = z.infer<typeof issueTimelineItemSchema>;

export const issueDetailSchema = issueSummarySchema
  .extend({
    body: z.string().nullable(),
    comments: z.array(issueCommentSchema),
    hasVoted: z.boolean(),
    isWatching: z.boolean(),
    timeline: z.array(issueTimelineItemSchema),
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

export const issueWatchInputSchema = issueRefSchema;
export type IssueWatchInput = z.infer<typeof issueWatchInputSchema>;

export const issueUnwatchInputSchema = issueRefSchema;
export type IssueUnwatchInput = z.infer<typeof issueUnwatchInputSchema>;

export const issueVoteInputSchema = issueRefSchema;
export type IssueVoteInput = z.infer<typeof issueVoteInputSchema>;

export const issueUnvoteInputSchema = issueRefSchema;
export type IssueUnvoteInput = z.infer<typeof issueUnvoteInputSchema>;

export const issueAssignInputSchema = issueRefSchema
  .extend({
    assigneeLoginId: authLoginIdSchema,
  })
  .strict();

export type IssueAssignInput = z.infer<typeof issueAssignInputSchema>;

export const issueUnassignInputSchema = issueRefSchema;
export type IssueUnassignInput = z.infer<typeof issueUnassignInputSchema>;

export const issueEventTimelineItemSchema = issueTimelineEventSchema;
export const assignIssueInputSchema = issueAssignInputSchema;
export const unassignIssueInputSchema = issueUnassignInputSchema;

export const watchIssueInputSchema = issueWatchInputSchema;
export const unwatchIssueInputSchema = issueUnwatchInputSchema;
export const voteIssueInputSchema = issueVoteInputSchema;
export const unvoteIssueInputSchema = issueUnvoteInputSchema;
export type WatchIssueInput = IssueWatchInput;
export type UnwatchIssueInput = IssueUnwatchInput;
export type VoteIssueInput = IssueVoteInput;
export type UnvoteIssueInput = IssueUnvoteInput;
export type AssignIssueInput = IssueAssignInput;
export type UnassignIssueInput = IssueUnassignInput;
