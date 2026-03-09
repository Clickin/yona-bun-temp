import { describe, expect, it, vi } from "vitest";
import { authorizeProjectAccess } from "./project-authorization";
import {
  DomainConflictError,
  DomainPermissionError,
  listProjectMembers,
  updateProject,
} from "./project-service";

describe("project authorization", () => {
  it("preserves the project visibility read matrix for public, protected, and private scopes", () => {
    expect(
      authorizeProjectAccess(
        {
          isAnonymous: true,
          isOrganizationAdmin: false,
          isOrganizationMember: false,
          isProjectManager: false,
          isProjectMember: false,
          isSiteAdmin: false,
          projectScope: "public",
        },
        "read",
      ),
    ).toEqual({
      allowed: true,
      reason: "public-read",
    });

    expect(
      authorizeProjectAccess(
        {
          isAnonymous: false,
          isOrganizationAdmin: false,
          isOrganizationMember: true,
          isProjectManager: false,
          isProjectMember: false,
          isSiteAdmin: false,
          projectScope: "protected",
        },
        "read",
      ),
    ).toEqual({
      allowed: true,
      reason: "organization-member-read",
    });

    expect(
      authorizeProjectAccess(
        {
          isAnonymous: false,
          isOrganizationAdmin: false,
          isOrganizationMember: true,
          isProjectManager: false,
          isProjectMember: false,
          isSiteAdmin: false,
          projectScope: "private",
        },
        "read",
      ),
    ).toEqual({
      allowed: false,
      reason: "private-project-denied",
    });
  });

  it("keeps update authority narrower than read authority", () => {
    expect(
      authorizeProjectAccess(
        {
          isAnonymous: false,
          isOrganizationAdmin: false,
          isOrganizationMember: false,
          isProjectManager: true,
          isProjectMember: true,
          isSiteAdmin: false,
          projectScope: "private",
        },
        "update",
      ),
    ).toEqual({
      allowed: true,
      reason: "project-manager-update",
    });

    expect(
      authorizeProjectAccess(
        {
          isAnonymous: false,
          isOrganizationAdmin: true,
          isOrganizationMember: true,
          isProjectManager: false,
          isProjectMember: false,
          isSiteAdmin: false,
          projectScope: "private",
        },
        "update",
      ),
    ).toEqual({
      allowed: true,
      reason: "organization-admin-update",
    });

    expect(
      authorizeProjectAccess(
        {
          isAnonymous: false,
          isOrganizationAdmin: false,
          isOrganizationMember: false,
          isProjectManager: false,
          isProjectMember: true,
          isSiteAdmin: false,
          projectScope: "public",
        },
        "update",
      ),
    ).toEqual({
      allowed: false,
      reason: "project-update-denied",
    });
  });
});

describe("project service", () => {
  it("rejects duplicate project identifiers within the same owner", async () => {
    const deps = {
      createProjectRecord: vi.fn(),
      grantProjectManager: vi.fn(),
      projectIdentifierExists: vi.fn().mockResolvedValue(true),
      readOrganizationAuthorization: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue({
        project: {
          id: 31,
          organizationId: null,
          organizationName: null,
          ownerName: "yobi",
          overview: "Yona",
          projectName: "projectYobi",
          projectScope: "public",
        },
        viewer: {
          isAnonymous: false,
          isOrganizationAdmin: false,
          isOrganizationMember: false,
          isProjectManager: true,
          isProjectMember: true,
          isSiteAdmin: false,
        },
      }),
      readProjectByOwnerAndName: vi.fn(),
      updateProjectRecord: vi.fn(),
      userLoginIdExists: vi.fn().mockResolvedValue(true),
    };

    await expect(
      updateProject(
        {
          actorId: 2,
          isAnonymous: false,
          isSiteAdmin: false,
          loginId: "yobi",
        },
        {
          currentOwnerName: "yobi",
          currentProjectName: "projectYobi",
          overview: "new overview",
          projectName: "HelloSocialApp",
          projectScope: "public",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });

  it("returns member lists for actors with project update authority", async () => {
    const deps = {
      createProjectRecord: vi.fn(),
      grantProjectManager: vi.fn(),
      projectIdentifierExists: vi.fn().mockResolvedValue(false),
      readOrganizationAuthorization: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue({
        project: {
          id: 31,
          organizationId: null,
          organizationName: null,
          ownerName: "yobi",
          overview: "Yona",
          projectName: "projectYobi",
          projectScope: "public",
        },
        viewer: {
          isAnonymous: false,
          isOrganizationAdmin: false,
          isOrganizationMember: false,
          isProjectManager: true,
          isProjectMember: true,
          isSiteAdmin: false,
        },
      }),
      readProjectMembers: vi.fn().mockResolvedValue({
        enrollmentRequests: [
          {
            loginId: "guest-user",
            userLabel: "Guest User",
          },
        ],
        members: [
          {
            loginId: "yobi",
            role: "manager",
            userLabel: "Yobi",
          },
        ],
      }),
      updateProjectRecord: vi.fn(),
      userLoginIdExists: vi.fn().mockResolvedValue(true),
    };

    await expect(
      listProjectMembers(
        {
          actorId: 2,
          isAnonymous: false,
          isSiteAdmin: false,
          loginId: "yobi",
        },
        {
          ownerName: "yobi",
          projectName: "projectYobi",
        },
        deps,
      ),
    ).resolves.toEqual({
      enrollmentRequests: [
        {
          loginId: "guest-user",
          userLabel: "Guest User",
        },
      ],
      members: [
        {
          loginId: "yobi",
          role: "manager",
          userLabel: "Yobi",
        },
      ],
    });
  });

  it("rejects project member list reads without update authority", async () => {
    const deps = {
      createProjectRecord: vi.fn(),
      grantProjectManager: vi.fn(),
      projectIdentifierExists: vi.fn().mockResolvedValue(false),
      readOrganizationAuthorization: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue({
        project: {
          id: 31,
          organizationId: null,
          organizationName: null,
          ownerName: "yobi",
          overview: "Yona",
          projectName: "projectYobi",
          projectScope: "public",
        },
        viewer: {
          isAnonymous: false,
          isOrganizationAdmin: false,
          isOrganizationMember: false,
          isProjectManager: false,
          isProjectMember: true,
          isSiteAdmin: false,
        },
      }),
      readProjectMembers: vi.fn(),
      updateProjectRecord: vi.fn(),
      userLoginIdExists: vi.fn().mockResolvedValue(true),
    };

    await expect(
      listProjectMembers(
        {
          actorId: 3,
          isAnonymous: false,
          isSiteAdmin: false,
          loginId: "member",
        },
        {
          ownerName: "yobi",
          projectName: "projectYobi",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);
  });
});
