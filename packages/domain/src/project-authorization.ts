import type { ProjectRole, ProjectScope } from "@yona/contracts";

export type ProjectOperation = "delete" | "read" | "update";

export function canAccessProject(
  scope: ProjectScope,
  role: ProjectRole,
  operation: ProjectOperation,
): boolean {
  if (role === "sitemanager" || role === "manager") {
    return true;
  }

  if (operation === "read") {
    if (scope === "public") {
      return true;
    }

    return role === "member";
  }

  return false;
}
