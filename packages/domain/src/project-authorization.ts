import type { ProjectRole, ProjectScope } from "@yona/contracts";

export type ProjectOperation = "delete" | "read" | "update";

export interface ProjectAccessFacts {
  isAnonymous: boolean;
  isOrganizationAdmin: boolean;
  isOrganizationMember: boolean;
  isProjectManager: boolean;
  isProjectMember: boolean;
  isSiteAdmin: boolean;
  projectScope: ProjectScope;
}

export type ProjectAccessReason =
  | "organization-admin-read"
  | "organization-admin-update"
  | "organization-member-read"
  | "private-project-denied"
  | "project-manager-read"
  | "project-manager-update"
  | "project-member-read"
  | "project-update-denied"
  | "public-read"
  | "site-admin-read"
  | "site-admin-update";

export interface ProjectAccessDecision {
  allowed: boolean;
  reason: ProjectAccessReason;
}

export function authorizeProjectAccess(
  facts: ProjectAccessFacts,
  operation: Exclude<ProjectOperation, "delete">,
): ProjectAccessDecision {
  if (facts.isSiteAdmin) {
    return {
      allowed: true,
      reason: operation === "read" ? "site-admin-read" : "site-admin-update",
    };
  }

  if (operation === "update") {
    if (facts.isOrganizationAdmin) {
      return {
        allowed: true,
        reason: "organization-admin-update",
      };
    }

    if (facts.isProjectManager) {
      return {
        allowed: true,
        reason: "project-manager-update",
      };
    }

    return {
      allowed: false,
      reason: "project-update-denied",
    };
  }

  if (facts.isOrganizationAdmin) {
    return {
      allowed: true,
      reason: "organization-admin-read",
    };
  }

  if (facts.isProjectManager) {
    return {
      allowed: true,
      reason: "project-manager-read",
    };
  }

  if (facts.isProjectMember) {
    return {
      allowed: true,
      reason: "project-member-read",
    };
  }

  if (facts.projectScope === "public") {
    return {
      allowed: true,
      reason: "public-read",
    };
  }

  if (facts.projectScope === "protected" && facts.isOrganizationMember) {
    return {
      allowed: true,
      reason: "organization-member-read",
    };
  }

  return {
    allowed: false,
    reason: "private-project-denied",
  };
}

export function canAccessProject(
  scope: ProjectScope,
  role: ProjectRole,
  operation: ProjectOperation,
): boolean {
  const decision = authorizeProjectAccess(
    {
      isAnonymous: role === "anonymous",
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: role === "manager",
      isProjectMember: role === "member" || role === "manager",
      isSiteAdmin: role === "sitemanager",
      projectScope: scope,
    },
    operation === "delete" ? "update" : operation,
  );

  return decision.allowed;
}
