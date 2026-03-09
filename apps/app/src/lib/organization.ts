import { createServerFn } from "@tanstack/react-start";
import {
  organizationCreateInputSchema,
  organizationDetailSchema,
  organizationRefSchema,
  organizationUpdateInputSchema,
} from "@yona/contracts";

export const readOrganizationDetail = createServerFn({ method: "GET" })
  .inputValidator(organizationRefSchema)
  .handler(async ({ data }) => {
    const { createServerOrganizationCaller } = await import("./organization-trpc.server");
    return organizationDetailSchema.parse(
      await createServerOrganizationCaller().readOrganizationDetail(data),
    );
  });

export const readOrganizationSettings = createServerFn({ method: "GET" })
  .inputValidator(organizationRefSchema)
  .handler(async ({ data }) => {
    const { createServerOrganizationCaller } = await import("./organization-trpc.server");
    return organizationDetailSchema.parse(
      await createServerOrganizationCaller().readOrganizationSettings(data),
    );
  });

export const createOrganization = createServerFn({ method: "POST" })
  .inputValidator(organizationCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerOrganizationCaller } = await import("./organization-trpc.server");
    return organizationDetailSchema.parse(
      await createServerOrganizationCaller().createOrganization({
        description: data.description ?? "",
        organizationName: data.organizationName,
      }),
    );
  });

export const updateOrganization = createServerFn({ method: "POST" })
  .inputValidator(organizationUpdateInputSchema)
  .handler(async ({ data }) => {
    const { createServerOrganizationCaller } = await import("./organization-trpc.server");
    return organizationDetailSchema.parse(
      await createServerOrganizationCaller().updateOrganization({
        currentOrganizationName: data.currentOrganizationName,
        description: data.description ?? "",
        organizationName: data.organizationName,
      }),
    );
  });
