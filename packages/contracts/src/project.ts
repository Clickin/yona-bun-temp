import { z } from "zod";
import { projectScopeSchema } from "./acl";
import { organizationNameSchema } from "./org";

const PROJECT_NAME_PATTERN = /^[a-zA-Z0-9-_.가-힣]+$/;
const RESERVED_PROJECT_NAMES = new Set([".", "..", ".git"]);

function normalizeOptionalText(value: string): null | string {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export const projectOwnerNameSchema = organizationNameSchema;

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required.")
  .max(255, "Project name must be at most 255 characters.")
  .regex(PROJECT_NAME_PATTERN, "Project name is invalid.")
  .refine((value) => !RESERVED_PROJECT_NAMES.has(value), "Project name is reserved.");

export const projectOverviewSchema = z.string().max(255).nullable();

export const projectOverviewInputSchema = z
  .string()
  .transform(normalizeOptionalText)
  .refine(
    (value) => value === null || value.length <= 255,
    "Project overview must be at most 255 characters.",
  );

export const projectRefSchema = z
  .object({
    ownerName: projectOwnerNameSchema,
    projectName: projectNameSchema,
  })
  .strict();

export type ProjectRef = z.infer<typeof projectRefSchema>;

export const projectCreateInputSchema = z
  .object({
    ownerName: projectOwnerNameSchema,
    overview: projectOverviewInputSchema,
    projectName: projectNameSchema,
    projectScope: projectScopeSchema,
  })
  .strict();

export type ProjectCreateInput = z.infer<typeof projectCreateInputSchema>;

export const projectUpdateInputSchema = z
  .object({
    currentOwnerName: projectOwnerNameSchema,
    currentProjectName: projectNameSchema,
    overview: projectOverviewInputSchema,
    projectName: projectNameSchema,
    projectScope: projectScopeSchema,
  })
  .strict();

export type ProjectUpdateInput = z.infer<typeof projectUpdateInputSchema>;

export const projectSummarySchema = z
  .object({
    ownerName: projectOwnerNameSchema,
    overview: projectOverviewSchema,
    projectName: projectNameSchema,
    projectScope: projectScopeSchema,
  })
  .strict();

export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectDetailSchema = projectSummarySchema
  .extend({
    organizationName: organizationNameSchema.nullable(),
    viewerCanUpdate: z.boolean(),
  })
  .strict();

export type ProjectDetail = z.infer<typeof projectDetailSchema>;
