import { z } from "zod";
import { authDisplayNameSchema, authLoginIdSchema } from "./auth";
import { projectRefSchema } from "./project";

export const postingNumberSchema = z.number().int().positive();

export const postingRefSchema = projectRefSchema
  .extend({
    postingNumber: postingNumberSchema,
  })
  .strict();

export type PostingRef = z.infer<typeof postingRefSchema>;

export const postingSummarySchema = z
  .object({
    authorLoginId: authLoginIdSchema,
    authorName: authDisplayNameSchema,
    createdAt: z.date().nullable(),
    ownerName: z.string().trim().min(1),
    postingNumber: postingNumberSchema,
    projectName: z.string().trim().min(1),
    title: z.string().trim().min(1),
  })
  .strict();

export type PostingSummary = z.infer<typeof postingSummarySchema>;

export const postingCommentSchema = z
  .object({
    authorLoginId: authLoginIdSchema,
    authorName: authDisplayNameSchema,
    commentId: z.number().int().positive(),
    contents: z.string(),
    createdAt: z.date().nullable(),
  })
  .strict();

export type PostingComment = z.infer<typeof postingCommentSchema>;

export const postingDetailSchema = postingSummarySchema
  .extend({
    body: z.string().nullable(),
    comments: z.array(postingCommentSchema),
  })
  .strict();

export type PostingDetail = z.infer<typeof postingDetailSchema>;

export const postingCreateInputSchema = projectRefSchema
  .extend({
    body: z.string().trim().max(10000).nullable(),
    title: z.string().trim().min(1).max(255),
  })
  .strict();

export type PostingCreateInput = z.infer<typeof postingCreateInputSchema>;

export const postingCommentCreateInputSchema = postingRefSchema
  .extend({
    contents: z.string().trim().min(1).max(10000),
  })
  .strict();

export type PostingCommentCreateInput = z.infer<typeof postingCommentCreateInputSchema>;
