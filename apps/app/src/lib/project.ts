import { createServerFn } from "@tanstack/react-start";
import {
  projectMemberDirectorySchema,
  projectCreateInputSchema,
  projectDetailSchema,
  projectRefSchema,
  projectUpdateInputSchema,
} from "@yona/contracts";

export const readProjectDetail = createServerFn({ method: "GET" })
  .inputValidator(projectRefSchema)
  .handler(async ({ data }) => {
    const { createServerProjectCaller } = await import("./project-trpc.server");
    return projectDetailSchema.parse(await createServerProjectCaller().readProjectDetail(data));
  });

export const readProjectSettings = createServerFn({ method: "GET" })
  .inputValidator(projectRefSchema)
  .handler(async ({ data }) => {
    const { createServerProjectCaller } = await import("./project-trpc.server");
    return projectDetailSchema.parse(await createServerProjectCaller().readProjectSettings(data));
  });

export const readProjectMembers = createServerFn({ method: "GET" })
  .inputValidator(projectRefSchema)
  .handler(async ({ data }) => {
    const { createServerProjectCaller } = await import("./project-trpc.server");
    return projectMemberDirectorySchema.parse(
      await createServerProjectCaller().readProjectMembers(data),
    );
  });

export const createProject = createServerFn({ method: "POST" })
  .inputValidator(projectCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerProjectCaller } = await import("./project-trpc.server");
    return projectDetailSchema.parse(
      await createServerProjectCaller().createProject({
        ownerName: data.ownerName,
        overview: data.overview ?? "",
        projectName: data.projectName,
        projectScope: data.projectScope,
      }),
    );
  });

export const updateProject = createServerFn({ method: "POST" })
  .inputValidator(projectUpdateInputSchema)
  .handler(async ({ data }) => {
    const { createServerProjectCaller } = await import("./project-trpc.server");
    return projectDetailSchema.parse(
      await createServerProjectCaller().updateProject({
        currentOwnerName: data.currentOwnerName,
        currentProjectName: data.currentProjectName,
        overview: data.overview ?? "",
        projectName: data.projectName,
        projectScope: data.projectScope,
      }),
    );
  });
