import { z } from "zod";
import { projectRefSchema } from "./project";

export const milestoneIdSchema = z.number().int().positive();
export const milestoneStateSchema = z.enum(["closed", "open"]);
export const milestoneTitleSchema = z.string().trim().min(1).max(255);

export type MilestoneState = z.infer<typeof milestoneStateSchema>;

export const milestoneSchema = projectRefSchema
  .extend({
    contents: z.string().nullable(),
    dueDate: z.date().nullable(),
    milestoneId: milestoneIdSchema,
    state: milestoneStateSchema,
    title: milestoneTitleSchema,
  })
  .strict();

export type Milestone = z.infer<typeof milestoneSchema>;

export const milestoneRefSchema = projectRefSchema
  .extend({
    milestoneId: milestoneIdSchema,
  })
  .strict();

export type MilestoneRef = z.infer<typeof milestoneRefSchema>;

export const milestoneCreateInputSchema = projectRefSchema
  .extend({
    contents: z.string().trim().max(10000).nullable(),
    dueDate: z.date().nullable(),
    state: milestoneStateSchema,
    title: milestoneTitleSchema,
  })
  .strict();

export type MilestoneCreateInput = z.infer<typeof milestoneCreateInputSchema>;

export const milestoneUpdateInputSchema = projectRefSchema
  .extend({
    contents: z.string().trim().max(10000).nullable(),
    dueDate: z.date().nullable(),
    milestoneId: milestoneIdSchema,
    state: milestoneStateSchema,
    title: milestoneTitleSchema,
  })
  .strict();

export type MilestoneUpdateInput = z.infer<typeof milestoneUpdateInputSchema>;

export const milestoneDeleteInputSchema = milestoneRefSchema;

export type MilestoneDeleteInput = z.infer<typeof milestoneDeleteInputSchema>;
