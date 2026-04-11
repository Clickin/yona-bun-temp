import { createServerFn } from "@tanstack/react-start";
import {
  enrollmentMutationResultSchema,
  enrollmentRequestRefSchema,
  organizationEnrollmentRequestRefSchema,
} from "@yona/contracts";

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

export const enrollOrganization = createServerFn({ method: "POST" })
  .inputValidator(organizationEnrollmentRequestRefSchema)
  .handler(async ({ data }) => {
    const { createServerEnrollmentCaller } = await import("./enrollment-trpc.server");
    return enrollmentMutationResultSchema.parse(
      await createServerEnrollmentCaller().enrollOrganization(data),
    );
  });

export const cancelEnrollOrganization = createServerFn({ method: "POST" })
  .inputValidator(organizationEnrollmentRequestRefSchema)
  .handler(async ({ data }) => {
    const { createServerEnrollmentCaller } = await import("./enrollment-trpc.server");
    return enrollmentMutationResultSchema.parse(
      await createServerEnrollmentCaller().cancelEnrollOrganization(data),
    );
  });
