import type { ProjectScope } from "@yona/contracts";

export interface RepositoryAccessFacts {
  isAnonymous: boolean;
  isCodeAccessibleMemberOnly: boolean;
  isOrganizationAdmin: boolean;
  isOrganizationMember: boolean;
  isProjectManager: boolean;
  isProjectMember: boolean;
  isSiteAdmin: boolean;
  projectScope: ProjectScope;
}

export type RepositoryPermission = "admin" | "read" | "write";

export interface RepositoryAuthorizationDecision {
  allowed: boolean;
  reason:
    | "authentication-required"
    | "forbidden"
    | "organization-admin-write"
    | "organization-member-read"
    | "organization-member-write"
    | "project-manager-admin"
    | "project-member-read"
    | "project-member-write"
    | "public-read"
    | "site-admin";
}

function authenticationRequired(facts: RepositoryAccessFacts): RepositoryAuthorizationDecision {
  return {
    allowed: false,
    reason: facts.isAnonymous ? "authentication-required" : "forbidden",
  };
}

export function authorizeRepositoryAccess(
  facts: RepositoryAccessFacts,
  permission: RepositoryPermission,
): RepositoryAuthorizationDecision {
  if (facts.isSiteAdmin) {
    return {
      allowed: true,
      reason: "site-admin",
    };
  }

  if (facts.isOrganizationAdmin) {
    return {
      allowed: true,
      reason: "organization-admin-write",
    };
  }

  if (facts.isProjectManager) {
    return {
      allowed: true,
      reason: permission === "admin" ? "project-manager-admin" : "project-member-write",
    };
  }

  const requiredPermission =
    permission === "read" && facts.isCodeAccessibleMemberOnly ? "write" : permission;

  if (requiredPermission === "admin") {
    return authenticationRequired(facts);
  }

  if (requiredPermission === "write") {
    if (facts.isProjectMember) {
      return {
        allowed: true,
        reason: "project-member-write",
      };
    }

    if (
      facts.isOrganizationMember &&
      (facts.projectScope === "public" || facts.projectScope === "protected")
    ) {
      return {
        allowed: true,
        reason: "organization-member-write",
      };
    }

    return authenticationRequired(facts);
  }

  if (facts.projectScope === "public") {
    return {
      allowed: true,
      reason: "public-read",
    };
  }

  if (facts.isProjectMember) {
    return {
      allowed: true,
      reason: "project-member-read",
    };
  }

  if (facts.isOrganizationMember && facts.projectScope === "protected") {
    return {
      allowed: true,
      reason: "organization-member-read",
    };
  }

  return authenticationRequired(facts);
}
