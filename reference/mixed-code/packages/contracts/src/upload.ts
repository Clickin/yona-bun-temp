import { z } from "zod";

export const uploadBindResourceTypeSchema = z
  .enum([
    "organization",
    "project",
    "user_avatar",
    "user",
    "issue_post",
    "issue_comment",
    "board_post",
    "nonissue_comment",
    "milestone",
    "issue_label",
  ])
  .describe("Attachment container type for finalized binding.");

export type UploadBindResourceType = z.infer<typeof uploadBindResourceTypeSchema>;

export const createUploadSessionOutputSchema = z
  .object({
    assetId: z.number().int().positive(),
    fileName: z.string().trim().min(1),
    hash: z.string().trim().min(1),
    mimeType: z.string().trim().min(1).nullable(),
    ownerLoginId: z.string().trim().min(1),
    size: z.number().int().nonnegative(),
    uploadId: z.string().trim().min(1),
  })
  .strict();

export type CreateUploadSessionOutput = z.infer<typeof createUploadSessionOutputSchema>;

export const finalizeUploadSessionInputSchema = z
  .object({
    resourceId: z.number().int().positive(),
    resourceType: uploadBindResourceTypeSchema,
    uploadId: z.string().trim().min(1),
  })
  .strict();

export type FinalizeUploadSessionInput = z.infer<typeof finalizeUploadSessionInputSchema>;

export const finalizeUploadSessionOutputSchema = z
  .object({
    assetId: z.number().int().positive(),
    containerId: z.number().int().positive(),
    containerType: uploadBindResourceTypeSchema,
    uploadId: z.string().trim().min(1),
  })
  .strict();

export type FinalizeUploadSessionOutput = z.infer<typeof finalizeUploadSessionOutputSchema>;
