import { z } from "zod";

const ORGANIZATION_NAME_PATTERN = /^[a-zA-Z0-9가-힣-]+([_.][a-z_.A-Z0-9가-힣-]+)*$/;

function normalizeOptionalText(value: string): null | string {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export const organizationNameSchema = z
  .string()
  .trim()
  .min(1, "Organization name is required.")
  .max(255, "Organization name must be at most 255 characters.")
  .regex(ORGANIZATION_NAME_PATTERN, "Organization name is invalid.");

export const organizationDescriptionSchema = z.string().max(255).nullable();

export const organizationDescriptionInputSchema = z
  .string()
  .transform(normalizeOptionalText)
  .refine(
    (value) => value === null || value.length <= 255,
    "Organization description must be at most 255 characters.",
  );

export const organizationRefSchema = z
  .object({
    organizationName: organizationNameSchema,
  })
  .strict();

export type OrganizationRef = z.infer<typeof organizationRefSchema>;

export const organizationCreateInputSchema = z
  .object({
    description: organizationDescriptionInputSchema,
    organizationName: organizationNameSchema,
  })
  .strict();

export type OrganizationCreateInput = z.infer<typeof organizationCreateInputSchema>;

export const organizationUpdateInputSchema = z
  .object({
    currentOrganizationName: organizationNameSchema,
    description: organizationDescriptionInputSchema,
    organizationName: organizationNameSchema,
  })
  .strict();

export type OrganizationUpdateInput = z.infer<typeof organizationUpdateInputSchema>;

export const organizationSummarySchema = z
  .object({
    description: organizationDescriptionSchema,
    organizationName: organizationNameSchema,
  })
  .strict();

export type OrganizationSummary = z.infer<typeof organizationSummarySchema>;

export const organizationDetailSchema = organizationSummarySchema
  .extend({
    viewerCanUpdate: z.boolean(),
  })
  .strict();

export type OrganizationDetail = z.infer<typeof organizationDetailSchema>;
