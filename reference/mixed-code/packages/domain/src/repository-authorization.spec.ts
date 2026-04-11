import { describe, expect, it } from "vitest";
import { authorizeRepositoryAccess, type RepositoryAccessFacts } from "./repository-authorization";

function facts(overrides: Partial<RepositoryAccessFacts> = {}): RepositoryAccessFacts {
  return {
    isAnonymous: true,
    isCodeAccessibleMemberOnly: false,
    isOrganizationAdmin: false,
    isOrganizationMember: false,
    isProjectManager: false,
    isProjectMember: false,
    isSiteAdmin: false,
    projectScope: "public",
    ...overrides,
  };
}

describe("repository authorization", () => {
  it("keeps public repo reads open to anonymous callers by default", () => {
    expect(authorizeRepositoryAccess(facts(), "read")).toEqual({
      allowed: true,
      reason: "public-read",
    });
    expect(authorizeRepositoryAccess(facts(), "write")).toEqual({
      allowed: false,
      reason: "authentication-required",
    });
  });

  it("upgrades public repo reads to write permission when code is member-only", () => {
    expect(
      authorizeRepositoryAccess(
        facts({
          isCodeAccessibleMemberOnly: true,
        }),
        "read",
      ),
    ).toEqual({
      allowed: false,
      reason: "authentication-required",
    });
    expect(
      authorizeRepositoryAccess(
        facts({
          isAnonymous: false,
          isCodeAccessibleMemberOnly: true,
          isProjectMember: true,
        }),
        "read",
      ),
    ).toEqual({
      allowed: true,
      reason: "project-member-write",
    });
  });

  it("allows protected repo access to project members and organization members", () => {
    expect(
      authorizeRepositoryAccess(
        facts({
          isAnonymous: false,
          isProjectMember: true,
          projectScope: "protected",
        }),
        "read",
      ),
    ).toEqual({
      allowed: true,
      reason: "project-member-read",
    });
    expect(
      authorizeRepositoryAccess(
        facts({
          isAnonymous: false,
          isOrganizationMember: true,
          projectScope: "protected",
        }),
        "write",
      ),
    ).toEqual({
      allowed: true,
      reason: "organization-member-write",
    });
    expect(authorizeRepositoryAccess(facts({ projectScope: "protected" }), "read")).toEqual({
      allowed: false,
      reason: "authentication-required",
    });
  });

  it("denies private repo access to org members while allowing project managers, org admins, and site admins", () => {
    expect(
      authorizeRepositoryAccess(
        facts({
          isAnonymous: false,
          isOrganizationMember: true,
          projectScope: "private",
        }),
        "read",
      ),
    ).toEqual({
      allowed: false,
      reason: "forbidden",
    });
    expect(
      authorizeRepositoryAccess(
        facts({
          isAnonymous: false,
          isProjectManager: true,
          projectScope: "private",
        }),
        "admin",
      ),
    ).toEqual({
      allowed: true,
      reason: "project-manager-admin",
    });
    expect(
      authorizeRepositoryAccess(
        facts({
          isAnonymous: false,
          isOrganizationAdmin: true,
          projectScope: "private",
        }),
        "write",
      ),
    ).toEqual({
      allowed: true,
      reason: "organization-admin-write",
    });
    expect(
      authorizeRepositoryAccess(
        facts({
          isSiteAdmin: true,
          projectScope: "private",
        }),
        "admin",
      ),
    ).toEqual({
      allowed: true,
      reason: "site-admin",
    });
  });
});
