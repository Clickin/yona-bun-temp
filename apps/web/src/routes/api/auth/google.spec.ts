import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./google/+server";

const mockGenerateState = vi.hoisted(() => vi.fn());
const mockGenerateCodeVerifier = vi.hoisted(() => vi.fn());
const mockCreateAuthorizationURL = vi.hoisted(() => vi.fn());

vi.mock("arctic", () => ({
  generateCodeVerifier: mockGenerateCodeVerifier,
  generateState: mockGenerateState,
}));

vi.mock("$lib/server/auth/oauth-providers", () => ({
  google: {
    createAuthorizationURL: mockCreateAuthorizationURL,
  },
}));

describe("GET /api/auth/google", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateState.mockReturnValue("google-state-123");
    mockGenerateCodeVerifier.mockReturnValue("google-verifier-abc");
    mockCreateAuthorizationURL.mockReturnValue(
      new URL("https://accounts.google.com/o/oauth2/v2/auth?client_id=test"),
    );
  });

  it("sets state/verifier cookies and redirects to Google", async () => {
    const cookiesSet = vi.fn();
    const event = {
      cookies: {
        set: cookiesSet,
      },
    } as unknown as Parameters<typeof GET>[0];

    const response = await GET(event);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
    );
    expect(cookiesSet).toHaveBeenCalledWith(
      "yona_oauth_google_state",
      "google-state-123",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 600,
        path: "/",
        sameSite: "lax",
      }),
    );
    expect(cookiesSet).toHaveBeenCalledWith(
      "yona_oauth_google_verifier",
      "google-verifier-abc",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 600,
        path: "/",
        sameSite: "lax",
      }),
    );
  });
});
