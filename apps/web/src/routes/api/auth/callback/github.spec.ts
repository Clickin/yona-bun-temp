import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./github/+server";

const mockGetDb = vi.hoisted(() => vi.fn());
const mockValidateAuthorizationCode = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn());
const mockSetSessionCookie = vi.hoisted(() => vi.fn());

vi.mock("@yona/db", () => ({
  getDb: mockGetDb,
}));

vi.mock("$lib/server/auth/oauth-providers", () => ({
  github: {
    validateAuthorizationCode: mockValidateAuthorizationCode,
  },
}));

vi.mock("$lib/server/auth/session", () => ({
  createSession: mockCreateSession,
}));

vi.mock("$lib/server/auth/session-helper", () => ({
  setSessionCookie: mockSetSessionCookie,
}));

function createDbMock(selectResults: unknown[]) {
  let selectIndex = 0;
  const insertValues = vi.fn(async () => undefined);

  return {
    insert: vi.fn(() => ({
      values: insertValues,
    })),
    insertValues,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => (selectResults[selectIndex++] as unknown[]) ?? []),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
  };
}

function createEvent(
  url: string,
  storedCookies: Record<string, string> = {
    yona_oauth_github_state: "state-123",
    yona_oauth_github_verifier: "verifier-abc",
  },
): Parameters<typeof GET>[0] {
  return {
    cookies: {
      delete: vi.fn(),
      get: (name: string) => storedCookies[name],
    },
    getClientAddress: () => "127.0.0.1",
    request: new Request(url, {
      headers: {
        "user-agent": "vitest",
      },
    }),
    url: new URL(url),
  } as unknown as Parameters<typeof GET>[0];
}

describe("GET /api/auth/callback/github", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    mockCreateSession.mockResolvedValue({
      csrfToken: "csrf-token",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      token: "session-token",
      userId: 77,
    });
  });

  it("returns 400 and clears OAuth cookies when state mismatches", async () => {
    const event = createEvent(
      "http://localhost/api/auth/callback/github?code=test-code&state=wrong-state",
    );

    const response = await GET(event);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid OAuth callback" });
    expect(event.cookies.delete).toHaveBeenCalledWith("yona_oauth_github_state", { path: "/" });
    expect(event.cookies.delete).toHaveBeenCalledWith("yona_oauth_github_verifier", { path: "/" });
  });

  it("logs in with existing linked account and redirects home", async () => {
    const db = createDbMock([[{ id: 1, userCredentialId: 10 }], [{ userId: 77 }]]);
    mockGetDb.mockReturnValue(db);
    mockValidateAuthorizationCode.mockResolvedValue({
      accessToken: () => "github-access-token",
    });
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ avatar_url: "https://example.com/a.png", id: 999, login: "octocat" }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ email: "user@example.com", primary: true, verified: true }]),
          {
            status: 200,
          },
        ),
      );

    const event = createEvent(
      "http://localhost/api/auth/callback/github?code=test-code&state=state-123",
    );
    const response = await GET(event);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(mockSetSessionCookie).toHaveBeenCalledWith(expect.anything(), "session-token");
    expect(event.cookies.delete).toHaveBeenCalledWith("yona_oauth_github_state", { path: "/" });
    expect(event.cookies.delete).toHaveBeenCalledWith("yona_oauth_github_verifier", { path: "/" });
    expect(db.insertValues).not.toHaveBeenCalled();
  });

  it("links GitHub account to an existing user with matching email", async () => {
    const db = createDbMock([[], [{ id: 123 }], [{ id: 321 }], [{ userId: 123 }]]);
    mockGetDb.mockReturnValue(db);
    mockValidateAuthorizationCode.mockResolvedValue({
      accessToken: () => "github-access-token",
    });
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 999, login: "octocat", name: "Octo Cat" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ email: "user@example.com", primary: true, verified: true }]),
          {
            status: 200,
          },
        ),
      );

    const response = await GET(
      createEvent("http://localhost/api/auth/callback/github?code=test-code&state=state-123"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(db.insertValues).toHaveBeenCalledTimes(1);
  });
});
