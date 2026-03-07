import { z } from "zod";

export const projectScopeValues = ["public", "protected", "private"] as const;

export const projectScopeSchema = z.enum(projectScopeValues);

export type ProjectScope = z.infer<typeof projectScopeSchema>;

export const projectRoleValues = ["anonymous", "member", "manager", "sitemanager"] as const;

export const projectRoleSchema = z.enum(projectRoleValues);

export type ProjectRole = z.infer<typeof projectRoleSchema>;
