import type { ProjectScope } from "@yona/contracts";

export interface AssetViewer {
  isSiteAdmin: boolean;
  userId: null | number;
}

export interface AssetProjectReadFacts {
  isOrganizationAdmin: boolean;
  isOrganizationMember: boolean;
  isProjectManager: boolean;
  isProjectMember: boolean;
}

export type AssetBinding =
  | {
      kind: "global";
      containerId: number;
      containerType: "organization" | "user_avatar";
    }
  | {
      kind: "project";
      containerId: number;
      containerType: string;
      organizationId: null | number;
      projectId: number;
      projectScope: ProjectScope;
    }
  | {
      kind: "temporary-upload";
      containerId: number;
      containerType: "user";
      ownerLoginId: null | string;
      ownerUserId: number;
    };

export interface AssetReadAuthorizationDecision {
  allowed: boolean;
  reason:
    | "authentication-required"
    | "forbidden"
    | "global-read"
    | "organization-admin"
    | "organization-member-read"
    | "project-member-read"
    | "public-read"
    | "site-admin"
    | "temporary-upload-owner";
}

function deny(viewer: AssetViewer): AssetReadAuthorizationDecision {
  return {
    allowed: false,
    reason: viewer.userId === null ? "authentication-required" : "forbidden",
  };
}

export function authorizeAssetRead(input: {
  binding: AssetBinding;
  projectFacts?: AssetProjectReadFacts;
  viewer: AssetViewer;
}): AssetReadAuthorizationDecision {
  if (input.viewer.isSiteAdmin) {
    return {
      allowed: true,
      reason: "site-admin",
    };
  }

  if (input.binding.kind === "temporary-upload") {
    if (input.viewer.userId === input.binding.ownerUserId) {
      return {
        allowed: true,
        reason: "temporary-upload-owner",
      };
    }

    return deny(input.viewer);
  }

  if (input.binding.kind === "global") {
    return {
      allowed: true,
      reason: "global-read",
    };
  }

  const projectFacts = input.projectFacts ?? {
    isOrganizationAdmin: false,
    isOrganizationMember: false,
    isProjectManager: false,
    isProjectMember: false,
  };

  if (projectFacts.isOrganizationAdmin) {
    return {
      allowed: true,
      reason: "organization-admin",
    };
  }

  if (projectFacts.isProjectManager || projectFacts.isProjectMember) {
    return {
      allowed: true,
      reason: "project-member-read",
    };
  }

  if (
    projectFacts.isOrganizationMember &&
    (input.binding.projectScope === "public" || input.binding.projectScope === "protected")
  ) {
    return {
      allowed: true,
      reason: "organization-member-read",
    };
  }

  if (input.binding.projectScope === "public") {
    return {
      allowed: true,
      reason: "public-read",
    };
  }

  return deny(input.viewer);
}
