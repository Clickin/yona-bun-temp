import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAuthenticatedAppSessionServerMock } = vi.hoisted(() => ({
  requireAuthenticatedAppSessionServerMock: vi.fn(),
}));

vi.mock("./auth-trpc.server", () => ({
  requireAuthenticatedAppSessionServer: requireAuthenticatedAppSessionServerMock,
}));

import { loadProtectedShellData } from "./protected-shell-data";

describe("protected shell server data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks authentication at the server-function boundary", async () => {
    requireAuthenticatedAppSessionServerMock.mockRejectedValueOnce(
      new Error("Authentication required."),
    );

    await expect(loadProtectedShellData()).rejects.toThrow("Authentication required.");
  });

  it("returns shell data only after the auth guard passes", async () => {
    requireAuthenticatedAppSessionServerMock.mockResolvedValueOnce({
      actorId: 1,
      emailAddress: "door@example.com",
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: false,
      loginId: "door",
      userLabel: "Door TTS",
    });

    await expect(loadProtectedShellData()).resolves.toMatchObject({
      title: "Protected Workspace",
    });
  });
});
