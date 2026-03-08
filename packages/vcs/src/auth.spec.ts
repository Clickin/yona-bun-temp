import { describe, expect, it } from "vitest";
import { createMutationActor } from "./auth";

describe("mutation actor creation", () => {
  it("normalizes the server-derived actor payload", () => {
    const actor = createMutationActor({
      canDirectWrite: true,
      email: " maintainer@example.com ",
      id: " u-1 ",
      ipAddress: " 127.0.0.1 ",
      name: " Maintainer ",
      role: "Maintainer",
    });

    expect(actor).toEqual({
      canAdmin: false,
      canDirectWrite: true,
      email: "maintainer@example.com",
      id: "u-1",
      ipAddress: "127.0.0.1",
      name: "Maintainer",
      role: "maintainer",
    });
  });

  it("defaults missing capabilities to a developer actor", () => {
    expect(
      createMutationActor({
        email: "user@example.com",
        id: "u-2",
        ipAddress: "",
        name: "User",
      }),
    ).toEqual({
      canAdmin: false,
      canDirectWrite: false,
      email: "user@example.com",
      id: "u-2",
      ipAddress: "unknown",
      name: "User",
      role: "developer",
    });
  });
});
