import { describe, expect, it, vi } from "vitest";
import {
  DomainConflictError,
  DomainNotFoundError,
  DomainPermissionError,
  cancelEnrollProject,
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
});
