import { createServerFn } from "@tanstack/react-start";
import {
  milestoneCreateInputSchema,
  milestoneDeleteInputSchema,
  milestoneRefSchema,
  milestoneSchema,
  milestoneUpdateInputSchema,
  projectRefSchema,
} from "@yona/contracts";
import { z } from "zod";

export const listMilestones = createServerFn({ method: "GET" })
  .inputValidator(projectRefSchema)
  .handler(async ({ data }) => {
    const { createServerMilestoneCaller } = await import("./milestone-trpc.server");
    return milestoneSchema.array().parse(await createServerMilestoneCaller().listMilestones(data));
  });

export const readMilestoneDetail = createServerFn({ method: "GET" })
  .inputValidator(milestoneRefSchema)
  .handler(async ({ data }) => {
    const { createServerMilestoneCaller } = await import("./milestone-trpc.server");
    return milestoneSchema.parse(await createServerMilestoneCaller().readMilestoneDetail(data));
  });

export const createMilestone = createServerFn({ method: "POST" })
  .inputValidator(milestoneCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerMilestoneCaller } = await import("./milestone-trpc.server");
    return milestoneSchema.parse(await createServerMilestoneCaller().createMilestone(data));
  });

export const updateMilestone = createServerFn({ method: "POST" })
  .inputValidator(milestoneUpdateInputSchema)
  .handler(async ({ data }) => {
    const { createServerMilestoneCaller } = await import("./milestone-trpc.server");
    return milestoneSchema.parse(await createServerMilestoneCaller().updateMilestone(data));
  });

export const deleteMilestone = createServerFn({ method: "POST" })
  .inputValidator(milestoneDeleteInputSchema)
  .handler(async ({ data }) => {
    const { createServerMilestoneCaller } = await import("./milestone-trpc.server");
    return z.boolean().parse(await createServerMilestoneCaller().deleteMilestone(data));
  });
