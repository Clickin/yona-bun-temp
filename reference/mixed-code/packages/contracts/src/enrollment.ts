import { z } from "zod";
import { organizationRefSchema } from "./org";
import { projectNameSchema, projectOwnerNameSchema } from "./project";

export const enrollmentRequestRefSchema = z
  .object({
    ownerName: projectOwnerNameSchema,
    projectName: projectNameSchema,
  })
  .strict();

export type EnrollmentRequestRef = z.infer<typeof enrollmentRequestRefSchema>;

export const organizationEnrollmentRequestRefSchema = organizationRefSchema;

export type OrganizationEnrollmentRequestRef = z.infer<
  typeof organizationEnrollmentRequestRefSchema
>;

export const enrollmentMutationResultSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict();

export type EnrollmentMutationResult = z.infer<typeof enrollmentMutationResultSchema>;
