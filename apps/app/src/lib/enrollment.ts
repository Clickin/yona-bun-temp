import { createServerFn } from "@tanstack/react-start";
import { enrollmentMutationResultSchema, enrollmentRequestRefSchema } from "@yona/contracts";

export const enrollProject = createServerFn({ method: "POST" })
  .inputValidator(enrollmentRequestRefSchema)
  .handler(async ({ data }) => {
    const { createServerEnrollmentCaller } = await import("./enrollment-trpc.server");
    return enrollmentMutationResultSchema.parse(
      await createServerEnrollmentCaller().enrollProject(data),
    );
  });

export const cancelEnrollProject = createServerFn({ method: "POST" })
  .inputValidator(enrollmentRequestRefSchema)
  .handler(async ({ data }) => {
    const { createServerEnrollmentCaller } = await import("./enrollment-trpc.server");
    return enrollmentMutationResultSchema.parse(
      await createServerEnrollmentCaller().cancelEnrollProject(data),
    );
  });
