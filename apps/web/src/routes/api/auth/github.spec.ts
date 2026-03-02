import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./github/+server";

const mockGenerateState = vi.hoisted(() => vi.fn());
const mockGenerateCodeVerifier = vi.hoisted(() => vi.fn());
const mockCreateAuthorizationURL = vi.hoisted(() => vi.fn());

vi.mock("arctic", () => ({
  generateCodeVerifier: mockGenerateCodeVerifier,
  generateState: mockGenerateState,
}));

vi.mock("$lib/server/auth/oauth-providers", () => ({
  github: {
    createAuthorizationURL: mockCreateAuthorizationURL,
  },
}));

describe("GET /api/auth/github", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateState.mockReturnValue("state-123");
    mockGenerateCodeVerifier.mockReturnValue("verifier-abc");
    mockCreateAuthorizationURL.mockReturnValue(
      new URL("https://github.com/login/oauth/authorize?client_id=test"),
    );
  });

  it("sets state/verifier cookies and redirects to GitHub", async () => {
    const cookiesSet = vi.fn();
    const event = {
      cookies: {
        set: cookiesSet,
      },
    } as unknown as Parameters<typeof GET>[0];

    const response = await GET(event);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://github.com/login/oauth/authorize?client_id=test",
    );
    expect(cookiesSet).toHaveBeenCalledWith(
      "yona_oauth_github_state",
      "state-123",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 600,
        path: "/",
        sameSite: "lax",
      }),
    );
    expect(cookiesSet).toHaveBeenCalledWith(
      "yona_oauth_github_verifier",
      "verifier-abc",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 600,
        path: "/",
        sameSite: "lax",
      }),
    );
  });
});
