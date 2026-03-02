import { afterEach, describe, expect, it } from "vitest";
import {
  canDirectWriteBranch,
  getProtectedBranchWriteRoles,
  getProtectedBranches,
  getUnprotectedBranchWriteRoles,
  isProtectedBranch,
} from "./policy";
import type { MutationActor } from "./auth";

function actor(overrides: Partial<MutationActor> = {}): MutationActor {
  return {
    id: "u-1",
    name: "User",
    email: "user@example.com",
    role: "developer",
    canDirectWrite: false,
    canAdmin: false,
    ipAddress: "127.0.0.1",
    ...overrides,
  };
}

afterEach(() => {
  delete process.env.YONA_PROTECTED_BRANCHES;
  delete process.env.YONA_PROTECTED_BRANCH_WRITE_ROLES;
  delete process.env.YONA_UNPROTECTED_BRANCH_WRITE_ROLES;
});

describe("branch write policy", () => {
  it("uses default protected branches", () => {
    const branches = getProtectedBranches();
    expect(branches.has("main")).toBe(true);
    expect(branches.has("master")).toBe(true);
  });

  it("loads role matrix from defaults", () => {
    expect(getProtectedBranchWriteRoles()).toEqual(new Set(["admin", "maintainer"]));
    expect(getUnprotectedBranchWriteRoles()).toEqual(new Set(["admin", "maintainer", "developer"]));
  });

  it("allows maintainers on protected branch and developers on unprotected branch", () => {
    expect(canDirectWriteBranch("main", actor({ role: "maintainer" }))).toBe(true);
    expect(canDirectWriteBranch("feature/new-ui", actor({ role: "developer" }))).toBe(true);
    expect(canDirectWriteBranch("main", actor({ role: "developer" }))).toBe(false);
  });

  it("always allows canAdmin and canDirectWrite overrides", () => {
    expect(canDirectWriteBranch("main", actor({ role: "reporter", canAdmin: true }))).toBe(true);
    expect(canDirectWriteBranch("main", actor({ role: "reporter", canDirectWrite: true }))).toBe(
      true,
    );
  });

  it("supports custom protected branch and role settings", () => {
    process.env.YONA_PROTECTED_BRANCHES = "release,stable";
    process.env.YONA_PROTECTED_BRANCH_WRITE_ROLES = "admin,release-manager";
    process.env.YONA_UNPROTECTED_BRANCH_WRITE_ROLES = "admin,developer,reviewer";

    expect(isProtectedBranch("release")).toBe(true);
    expect(canDirectWriteBranch("release", actor({ role: "release-manager" }))).toBe(true);
    expect(canDirectWriteBranch("feature/a", actor({ role: "reviewer" }))).toBe(true);
    expect(canDirectWriteBranch("release", actor({ role: "developer" }))).toBe(false);
  });
});
