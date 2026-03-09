import { describe, expect, it, vi } from "vitest";
import {
  DomainConflictError,
  DomainPermissionError,
  createOrganization,
  updateOrganization,
} from "./organization-service";

const authenticatedActor = {
  actorId: 7,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "doortts",
};

describe("organization service", () => {
  it("grants creator org-admin ownership when creating an organization", async () => {
    const deps = {
      createOrganizationRecord: vi.fn().mockResolvedValue({
        createdAt: new Date("2026-03-09T00:00:00.000Z"),
        description: "weblab < labs",
        id: 41,
        organizationName: "weblabs",
      }),
      grantOrganizationAdmin: vi.fn().mockResolvedValue(undefined),
      organizationNameExists: vi.fn().mockResolvedValue(false),
      readOrganizationAuthorization: vi.fn().mockResolvedValue({
        organization: {
          createdAt: new Date("2026-03-09T00:00:00.000Z"),
          description: "weblab < labs",
          id: 41,
          organizationName: "weblabs",
        },
        viewer: {
          isOrganizationAdmin: true,
          isOrganizationMember: true,
          isSiteAdmin: false,
        },
      }),
      readOrganizationByName: vi.fn().mockResolvedValue(null),
      updateOrganizationRecord: vi.fn(),
      userLoginIdExists: vi.fn().mockResolvedValue(false),
    };

    const result = await createOrganization(
      authenticatedActor,
      {
        description: "weblab < labs",
        organizationName: "weblabs",
      },
      deps,
    );

    expect(deps.grantOrganizationAdmin).toHaveBeenCalledWith(41, 7);
    expect(result).toEqual({
      description: "weblab < labs",
      organizationName: "weblabs",
      viewerCanUpdate: true,
    });
  });

  it("rejects organization-name conflicts against existing user login ids", async () => {
    const deps = {
      createOrganizationRecord: vi.fn(),
      grantOrganizationAdmin: vi.fn(),
      organizationNameExists: vi.fn().mockResolvedValue(false),
      readOrganizationAuthorization: vi.fn(),
      readOrganizationByName: vi.fn().mockResolvedValue(null),
      updateOrganizationRecord: vi.fn(),
      userLoginIdExists: vi.fn().mockResolvedValue(true),
    };

    await expect(
      createOrganization(
        authenticatedActor,
        {
          description: "duplicate login",
          organizationName: "doortts",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });

  it("requires org-admin authority to update organization settings", async () => {
    const deps = {
      createOrganizationRecord: vi.fn(),
      grantOrganizationAdmin: vi.fn(),
      organizationNameExists: vi.fn().mockResolvedValue(false),
      readOrganizationAuthorization: vi.fn().mockResolvedValue({
        organization: {
          createdAt: new Date("2026-03-09T00:00:00.000Z"),
          description: "labs",
          id: 11,
          organizationName: "labs",
        },
        viewer: {
          isOrganizationAdmin: false,
          isOrganizationMember: false,
          isSiteAdmin: false,
        },
      }),
      readOrganizationByName: vi.fn(),
      updateOrganizationRecord: vi.fn(),
      userLoginIdExists: vi.fn().mockResolvedValue(false),
    };

    await expect(
      updateOrganization(
        authenticatedActor,
        {
          currentOrganizationName: "labs",
          description: "new descr",
          organizationName: "weblabs",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);
  });
});
