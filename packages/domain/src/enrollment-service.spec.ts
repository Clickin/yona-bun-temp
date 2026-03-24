import { describe, expect, it, vi } from "vitest";
import {
  DomainConflictError,
  DomainNotFoundError,
  DomainPermissionError,
  cancelEnrollOrganization,
  cancelEnrollProject,
  enrollOrganization,
  enrollProject,
} from "./enrollment-service";

const authenticatedActor = {
  actorId: 6,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "guest-user",
};

function createGuestAuthorization() {
  return {
    project: {
      id: 31,
      organizationId: null,
      organizationName: null,
      ownerName: "yobi",
      overview: "Yona",
      projectName: "projectYobi",
      projectScope: "public" as const,
    },
    viewer: {
      isAnonymous: false,
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: false,
      isSiteAdmin: false,
    },
  };
}

function createOrganizationGuestAuthorization() {
  return {
    organization: {
      createdAt: new Date("2026-03-09T00:00:00.000Z"),
      description: "We build labs",
      id: 41,
      organizationName: "weblabs",
    },
    viewer: {
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isSiteAdmin: false,
    },
  };
}

describe("enrollment service", () => {
  it("allows guests to enroll into an existing project", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn().mockResolvedValue({
        projectId: 31,
        userId: 6,
      }),
      deleteEnrollmentRequest: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue(createGuestAuthorization()),
    };

    await expect(
      enrollProject(
        authenticatedActor,
        {
          ownerName: "yobi",
          projectName: "projectYobi",
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
    });

    expect(deps.createEnrollmentRequest).toHaveBeenCalledWith(31, 6);
  });

  it("rejects enroll when the actor is already a project member", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      deleteEnrollmentRequest: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue({
        ...createGuestAuthorization(),
        viewer: {
          ...createGuestAuthorization().viewer,
          isProjectMember: true,
        },
      }),
    };

    await expect(
      enrollProject(
        authenticatedActor,
        {
          ownerName: "yobi",
          projectName: "projectYobi",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });

  it("returns not found when the project does not exist during enroll", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      deleteEnrollmentRequest: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue(null),
    };

    await expect(
      enrollProject(
        authenticatedActor,
        {
          ownerName: "yobi",
          projectName: "missing",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("keeps enroll idempotent when the request already exists", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn().mockResolvedValue({
        projectId: 31,
        userId: 6,
      }),
      deleteEnrollmentRequest: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue(createGuestAuthorization()),
    };

    await expect(
      enrollProject(
        authenticatedActor,
        {
          ownerName: "yobi",
          projectName: "projectYobi",
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
    });
    await expect(
      enrollProject(
        authenticatedActor,
        {
          ownerName: "yobi",
          projectName: "projectYobi",
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
    });
  });

  it("allows guests to cancel enrollment requests", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      deleteEnrollmentRequest: vi.fn().mockResolvedValue(undefined),
      readProjectAuthorization: vi.fn().mockResolvedValue(createGuestAuthorization()),
    };

    await expect(
      cancelEnrollProject(
        authenticatedActor,
        {
          ownerName: "yobi",
          projectName: "projectYobi",
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
    });

    expect(deps.deleteEnrollmentRequest).toHaveBeenCalledWith(31, 6);
  });

  it("rejects cancel when the actor is already a project member", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      deleteEnrollmentRequest: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue({
        ...createGuestAuthorization(),
        viewer: {
          ...createGuestAuthorization().viewer,
          isProjectManager: true,
          isProjectMember: true,
        },
      }),
    };

    await expect(
      cancelEnrollProject(
        authenticatedActor,
        {
          ownerName: "yobi",
          projectName: "projectYobi",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });

  it("returns not found when the project does not exist during cancel", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      deleteEnrollmentRequest: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue(null),
    };

    await expect(
      cancelEnrollProject(
        authenticatedActor,
        {
          ownerName: "yobi",
          projectName: "missing",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("rejects anonymous actors before reading project authorization", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      deleteEnrollmentRequest: vi.fn(),
      readProjectAuthorization: vi.fn(),
    };

    await expect(
      enrollProject(
        {
          actorId: null,
          isAnonymous: true,
          isSiteAdmin: false,
          loginId: null,
        },
        {
          ownerName: "yobi",
          projectName: "projectYobi",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);

    expect(deps.readProjectAuthorization).not.toHaveBeenCalled();
  });

  it("allows guests to enroll into an existing organization", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      createOrganizationEnrollmentRequest: vi.fn().mockResolvedValue({
        organizationId: 41,
        userId: 6,
      }),
      deleteEnrollmentRequest: vi.fn(),
      deleteOrganizationEnrollmentRequest: vi.fn(),
      readOrganizationAuthorization: vi.fn().mockResolvedValue(createOrganizationGuestAuthorization()),
      readProjectAuthorization: vi.fn(),
    };

    await expect(
      enrollOrganization(
        authenticatedActor,
        {
          organizationName: "weblabs",
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
    });

    expect(deps.createOrganizationEnrollmentRequest).toHaveBeenCalledWith(41, 6);
  });

  it("rejects organization enroll when the actor is already an organization member", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      createOrganizationEnrollmentRequest: vi.fn(),
      deleteEnrollmentRequest: vi.fn(),
      deleteOrganizationEnrollmentRequest: vi.fn(),
      readOrganizationAuthorization: vi.fn().mockResolvedValue({
        ...createOrganizationGuestAuthorization(),
        viewer: {
          ...createOrganizationGuestAuthorization().viewer,
          isOrganizationMember: true,
        },
      }),
      readProjectAuthorization: vi.fn(),
    };

    await expect(
      enrollOrganization(
        authenticatedActor,
        {
          organizationName: "weblabs",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });

  it("returns not found when the organization does not exist during enroll", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      createOrganizationEnrollmentRequest: vi.fn(),
      deleteEnrollmentRequest: vi.fn(),
      deleteOrganizationEnrollmentRequest: vi.fn(),
      readOrganizationAuthorization: vi.fn().mockResolvedValue(null),
      readProjectAuthorization: vi.fn(),
    };

    await expect(
      enrollOrganization(
        authenticatedActor,
        {
          organizationName: "missing-org",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("allows guests to cancel organization enrollment requests", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      createOrganizationEnrollmentRequest: vi.fn(),
      deleteEnrollmentRequest: vi.fn(),
      deleteOrganizationEnrollmentRequest: vi.fn().mockResolvedValue(undefined),
      readOrganizationAuthorization: vi.fn().mockResolvedValue(createOrganizationGuestAuthorization()),
      readProjectAuthorization: vi.fn(),
    };

    await expect(
      cancelEnrollOrganization(
        authenticatedActor,
        {
          organizationName: "weblabs",
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
    });

    expect(deps.deleteOrganizationEnrollmentRequest).toHaveBeenCalledWith(41, 6);
  });

  it("rejects anonymous actors before reading organization authorization", async () => {
    const deps = {
      createEnrollmentRequest: vi.fn(),
      createOrganizationEnrollmentRequest: vi.fn(),
      deleteEnrollmentRequest: vi.fn(),
      deleteOrganizationEnrollmentRequest: vi.fn(),
      readOrganizationAuthorization: vi.fn(),
      readProjectAuthorization: vi.fn(),
    };

    await expect(
      enrollOrganization(
        {
          actorId: null,
          isAnonymous: true,
          isSiteAdmin: false,
          loginId: null,
        },
        {
          organizationName: "weblabs",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);

    expect(deps.readOrganizationAuthorization).not.toHaveBeenCalled();
  });
});
