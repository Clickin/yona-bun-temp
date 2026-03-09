import { describe, expect, it } from "vitest";
import { authorizeAssetRead, type AssetProjectReadFacts } from "./asset-authorization";

function viewer(overrides: Partial<{ isSiteAdmin: boolean; userId: null | number }> = {}) {
  return {
    isSiteAdmin: false,
    userId: null,
    ...overrides,
  };
}

function projectFacts(overrides: Partial<AssetProjectReadFacts> = {}): AssetProjectReadFacts {
  return {
    isOrganizationAdmin: false,
    isOrganizationMember: false,
    isProjectManager: false,
    isProjectMember: false,
    ...overrides,
  };
}

describe("asset authorization", () => {
  it("keeps temporary uploads visible only to the uploader unless a site admin is reading", () => {
    expect(
      authorizeAssetRead({
        binding: {
          kind: "temporary-upload",
          containerId: 10,
          containerType: "user",
          ownerLoginId: "uploader",
          ownerUserId: 10,
        },
        viewer: viewer({
          userId: 10,
        }),
      }),
    ).toEqual({
      allowed: true,
      reason: "temporary-upload-owner",
    });

    expect(
      authorizeAssetRead({
        binding: {
          kind: "temporary-upload",
          containerId: 10,
          containerType: "user",
          ownerLoginId: "uploader",
          ownerUserId: 10,
        },
        viewer: viewer({
          isSiteAdmin: true,
        }),
      }),
    ).toEqual({
      allowed: true,
      reason: "site-admin",
    });
  });

  it("allows global avatar and organization assets without project facts", () => {
    expect(
      authorizeAssetRead({
        binding: {
          kind: "global",
          containerId: 20,
          containerType: "user_avatar",
        },
        viewer: viewer(),
      }),
    ).toEqual({
      allowed: true,
      reason: "global-read",
    });
  });

  it("preserves public and protected project visibility for bound assets", () => {
    expect(
      authorizeAssetRead({
        binding: {
          kind: "project",
          containerId: 30,
          containerType: "issue_post",
          organizationId: 200,
          projectId: 300,
          projectScope: "public",
        },
        viewer: viewer(),
      }),
    ).toEqual({
      allowed: true,
      reason: "public-read",
    });

    expect(
      authorizeAssetRead({
        binding: {
          kind: "project",
          containerId: 31,
          containerType: "issue_post",
          organizationId: 201,
          projectId: 301,
          projectScope: "protected",
        },
        projectFacts: projectFacts({
          isOrganizationMember: true,
        }),
        viewer: viewer({
          userId: 99,
        }),
      }),
    ).toEqual({
      allowed: true,
      reason: "organization-member-read",
    });
  });

  it("denies private project assets to outsiders while allowing members and admins", () => {
    expect(
      authorizeAssetRead({
        binding: {
          kind: "project",
          containerId: 32,
          containerType: "issue_post",
          organizationId: 202,
          projectId: 302,
          projectScope: "private",
        },
        projectFacts: projectFacts(),
        viewer: viewer({
          userId: 44,
        }),
      }),
    ).toEqual({
      allowed: false,
      reason: "forbidden",
    });

    expect(
      authorizeAssetRead({
        binding: {
          kind: "project",
          containerId: 33,
          containerType: "issue_post",
          organizationId: 203,
          projectId: 303,
          projectScope: "private",
        },
        projectFacts: projectFacts({
          isOrganizationAdmin: true,
        }),
        viewer: viewer({
          userId: 45,
        }),
      }),
    ).toEqual({
      allowed: true,
      reason: "organization-admin",
    });
  });
});
