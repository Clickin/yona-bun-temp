import { z } from "zod";
import { projectRefSchema } from "./project";

export const labelCategoryIdSchema = z.number().int().positive();
export const issueLabelIdSchema = z.number().int().positive();

export const labelCategoryNameSchema = z.string().trim().min(1).max(255);
export const issueLabelNameSchema = z.string().trim().min(1).max(255);
export const issueLabelColorSchema = z.string().trim().min(1).max(20);

export const labelCategorySchema = projectRefSchema
  .extend({
    categoryId: labelCategoryIdSchema,
    isExclusive: z.boolean(),
    name: labelCategoryNameSchema,
  })
  .strict();

export type LabelCategory = z.infer<typeof labelCategorySchema>;

export const issueLabelSchema = projectRefSchema
  .extend({
    categoryId: labelCategoryIdSchema,
    categoryName: labelCategoryNameSchema,
    color: issueLabelColorSchema,
    labelId: issueLabelIdSchema,
    name: issueLabelNameSchema,
  })
  .strict();

export type IssueLabel = z.infer<typeof issueLabelSchema>;

export const labelCategoryCreateInputSchema = projectRefSchema
  .extend({
    isExclusive: z.boolean(),
    name: labelCategoryNameSchema,
  })
  .strict();

export type LabelCategoryCreateInput = z.infer<typeof labelCategoryCreateInputSchema>;

export const labelCategoryUpdateInputSchema = projectRefSchema
  .extend({
    categoryId: labelCategoryIdSchema,
    isExclusive: z.boolean(),
    name: labelCategoryNameSchema,
  })
  .strict();

export type LabelCategoryUpdateInput = z.infer<typeof labelCategoryUpdateInputSchema>;

export const labelCategoryDeleteInputSchema = projectRefSchema
  .extend({
    categoryId: labelCategoryIdSchema,
  })
  .strict();

export type LabelCategoryDeleteInput = z.infer<typeof labelCategoryDeleteInputSchema>;

export const issueLabelCreateInputSchema = projectRefSchema
  .extend({
    categoryId: labelCategoryIdSchema,
    color: issueLabelColorSchema,
    name: issueLabelNameSchema,
  })
  .strict();

export type IssueLabelCreateInput = z.infer<typeof issueLabelCreateInputSchema>;

export const issueLabelUpdateInputSchema = projectRefSchema
  .extend({
    categoryId: labelCategoryIdSchema,
    color: issueLabelColorSchema,
    labelId: issueLabelIdSchema,
    name: issueLabelNameSchema,
  })
  .strict();

export type IssueLabelUpdateInput = z.infer<typeof issueLabelUpdateInputSchema>;

export const issueLabelDeleteInputSchema = projectRefSchema
  .extend({
    labelId: issueLabelIdSchema,
  })
  .strict();

export type IssueLabelDeleteInput = z.infer<typeof issueLabelDeleteInputSchema>;
