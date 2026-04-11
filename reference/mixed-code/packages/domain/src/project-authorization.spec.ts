import { describe, expect, it } from "vitest";
import { DomainNotFoundError, DomainPermissionError } from "./errors";
import {
  canAccessProject,
  requireProjectReadAuthorization,
  requireProjectWriteAuthorization,
} from "./project-authorization";

const anonymousActor = {
  actorId: null,
  isAnonymous: true,
  isSiteAdmin: false,
  loginId: null,
  name: null,
};

const memberActor = {
  actorId: 7,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "door",
  name: "Door TTS",
};

function createAuthorization(
  overrides?: Partial<{
    projectScope: "private" | "protected" | "public";
    isOrganizationAdmin: boolean;
    isOrganizationMember: boolean;
    isProjectManager: boolean;
    isProjectMember: boolean;
  }>,
) {
  return {
    project: {
      projectScope: overrides?.projectScope ?? "public",
    },
    viewer: {
      isOrganizationAdmin: overrides?.isOrganizationAdmin ?? false,
      isOrganizationMember: overrides?.isOrganizationMember ?? false,
      isProjectManager: overrides?.isProjectManager ?? false,
      isProjectMember: overrides?.isProjectMember ?? false,
    },
  };
}

describe("project authorization baseline", () => {
  it("keeps public-project reads open while denying outsider writes", () => {
    expect(canAccessProject("public", "anonymous", "read")).toBe(true);
    expect(canAccessProject("public", "anonymous", "update")).toBe(false);
    expect(canAccessProject("public", "anonymous", "delete")).toBe(false);
  });

  it("allows protected-project reads for members and denies outsiders", () => {
    expect(canAccessProject("protected", "member", "read")).toBe(true);
    expect(canAccessProject("protected", "anonymous", "read")).toBe(false);
  });

  it("preserves creator/admin write authority for project-scoped resources", () => {
    expect(canAccessProject("protected", "manager", "update")).toBe(true);
    expect(canAccessProject("protected", "manager", "delete")).toBe(true);
    expect(canAccessProject("protected", "sitemanager", "update")).toBe(true);
    expect(canAccessProject("protected", "member", "update")).toBe(false);
  });

  it("returns the authorization record when shared read authorization succeeds", async () => {
    const authorization = createAuthorization({
      isProjectMember: true,
      projectScope: "public",
    });

    await expect(
      requireProjectReadAuthorization(
        memberActor,
        { ownerName: "door", projectName: "yona" },
        {
          readProjectAuthorization: async () => authorization,
        },
      ),
    ).resolves.toBe(authorization);
  });

  it("throws not found when shared read authorization cannot load a project", async () => {
    await expect(
      requireProjectReadAuthorization(
        memberActor,
        { ownerName: "door", projectName: "missing" },
        {
          readProjectAuthorization: async () => null,
        },
      ),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("marks anonymous private-project reads as authentication-required", async () => {
    let capturedError: unknown;

    try {
      await requireProjectReadAuthorization(
        anonymousActor,
        { ownerName: "door", projectName: "private-yona" },
        {
          readProjectAuthorization: async () => createAuthorization({ projectScope: "private" }),
        },
      );
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(DomainPermissionError);
    expect((capturedError as DomainPermissionError).requiresAuthentication).toBe(true);
  });

  it("denies writes for authenticated members without manager privileges", async () => {
    await expect(
      requireProjectWriteAuthorization(
        memberActor,
        { ownerName: "door", projectName: "yona" },
        {
          readProjectAuthorization: async () =>
            createAuthorization({
              isProjectMember: true,
              projectScope: "public",
            }),
        },
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);
  });

  it("returns the authorization record when shared write authorization succeeds", async () => {
    const authorization = createAuthorization({
      isProjectManager: true,
      isProjectMember: true,
      projectScope: "protected",
    });

    await expect(
      requireProjectWriteAuthorization(
        memberActor,
        { ownerName: "door", projectName: "yona" },
        {
          readProjectAuthorization: async () => authorization,
        },
      ),
    ).resolves.toBe(authorization);
  });
});
