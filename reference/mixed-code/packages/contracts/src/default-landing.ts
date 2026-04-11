import { z } from "zod";

export const defaultLandingPathSchema = z.string().trim().min(1).max(255);

export type DefaultLandingPath = z.infer<typeof defaultLandingPathSchema>;

export const defaultLandingPreferenceInputSchema = z
  .object({
    path: defaultLandingPathSchema,
  })
  .strict();

export type DefaultLandingPreferenceInput = z.infer<typeof defaultLandingPreferenceInputSchema>;

export const defaultLandingPreferenceSchema = z
  .object({
    path: defaultLandingPathSchema.nullable(),
  })
  .strict();

export type DefaultLandingPreference = z.infer<typeof defaultLandingPreferenceSchema>;
