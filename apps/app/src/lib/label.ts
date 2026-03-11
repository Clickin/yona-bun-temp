import { createServerFn } from "@tanstack/react-start";
import {
  issueLabelCreateInputSchema,
  issueLabelDeleteInputSchema,
  issueLabelSchema,
  issueLabelUpdateInputSchema,
  labelCategoryCreateInputSchema,
  labelCategoryDeleteInputSchema,
  labelCategorySchema,
  labelCategoryUpdateInputSchema,
  projectRefSchema,
} from "@yona/contracts";
import { z } from "zod";

export const listLabelCategories = createServerFn({ method: "GET" })
  .inputValidator(projectRefSchema)
  .handler(async ({ data }) => {
    const { createServerLabelCaller } = await import("./label-trpc.server");
    return labelCategorySchema
      .array()
      .parse(await createServerLabelCaller().listLabelCategories(data));
  });

export const createLabelCategory = createServerFn({ method: "POST" })
  .inputValidator(labelCategoryCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerLabelCaller } = await import("./label-trpc.server");
    return labelCategorySchema.parse(await createServerLabelCaller().createLabelCategory(data));
  });

export const updateLabelCategory = createServerFn({ method: "POST" })
  .inputValidator(labelCategoryUpdateInputSchema)
  .handler(async ({ data }) => {
    const { createServerLabelCaller } = await import("./label-trpc.server");
    return labelCategorySchema.parse(await createServerLabelCaller().updateLabelCategory(data));
  });

export const deleteLabelCategory = createServerFn({ method: "POST" })
  .inputValidator(labelCategoryDeleteInputSchema)
  .handler(async ({ data }) => {
    const { createServerLabelCaller } = await import("./label-trpc.server");
    return z.boolean().parse(await createServerLabelCaller().deleteLabelCategory(data));
  });

export const listIssueLabels = createServerFn({ method: "GET" })
  .inputValidator(projectRefSchema)
  .handler(async ({ data }) => {
    const { createServerLabelCaller } = await import("./label-trpc.server");
    return issueLabelSchema.array().parse(await createServerLabelCaller().listIssueLabels(data));
  });

export const createIssueLabel = createServerFn({ method: "POST" })
  .inputValidator(issueLabelCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerLabelCaller } = await import("./label-trpc.server");
    return issueLabelSchema.parse(await createServerLabelCaller().createIssueLabel(data));
  });

export const updateIssueLabel = createServerFn({ method: "POST" })
  .inputValidator(issueLabelUpdateInputSchema)
  .handler(async ({ data }) => {
    const { createServerLabelCaller } = await import("./label-trpc.server");
    return issueLabelSchema.parse(await createServerLabelCaller().updateIssueLabel(data));
  });

export const deleteIssueLabel = createServerFn({ method: "POST" })
  .inputValidator(issueLabelDeleteInputSchema)
  .handler(async ({ data }) => {
    const { createServerLabelCaller } = await import("./label-trpc.server");
    return z.boolean().parse(await createServerLabelCaller().deleteIssueLabel(data));
  });
