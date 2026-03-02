import { describe, expect, it } from "vitest";
import { readMutationActor } from "./auth";

describe("mutation actor header parsing", () => {
  it("returns null without required identity headers", () => {
    const actor = readMutationActor(new Headers());
    expect(actor).toBeNull();
  });

  it("parses role-based capabilities", () => {
    const actor = readMutationActor(
      new Headers({
        "x-yona-user-id": "u-1",
        "x-yona-user-name": "Maintainer",
        "x-yona-user-email": "m@example.com",
        "x-yona-role": "maintainer",
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      }),
    );

    expect(actor).not.toBeNull();
    expect(actor?.role).toBe("maintainer");
    expect(actor?.canDirectWrite).toBe(true);
    expect(actor?.canAdmin).toBe(false);
    expect(actor?.ipAddress).toBe("10.0.0.1");
  });

  it("honors explicit admin/direct-write override headers", () => {
    const actor = readMutationActor(
      new Headers({
        "x-yona-user-id": "u-2",
        "x-yona-user-name": "Reporter",
        "x-yona-user-email": "r@example.com",
        "x-yona-role": "reporter",
        "x-yona-can-admin": "true",
        "x-yona-can-direct-write": "1",
      }),
    );

    expect(actor?.role).toBe("reporter");
    expect(actor?.canAdmin).toBe(true);
    expect(actor?.canDirectWrite).toBe(true);
  });
});
