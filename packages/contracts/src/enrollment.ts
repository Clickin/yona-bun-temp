import { z } from "zod";
import { projectNameSchema, projectOwnerNameSchema } from "./project";

export const enrollmentRequestRefSchema = z
  .object({
    ownerName: projectOwnerNameSchema,
    projectName: projectNameSchema,
  })
  .strict();

export type EnrollmentRequestRef = z.infer<typeof enrollmentRequestRefSchema>;

export const enrollmentMutationResultSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict();

export type EnrollmentMutationResult = z.infer<typeof enrollmentMutationResultSchema>;
