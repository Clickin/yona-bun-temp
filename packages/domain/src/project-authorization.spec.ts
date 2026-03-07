import { describe, expect, it } from "vitest";
import { canAccessProject } from "./project-authorization";

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
});
