import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./register/+server";

const mockGetDb = vi.hoisted(() => vi.fn());
const mockAppendAuthAuditLog = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockAllowAuthRequest = vi.hoisted(() => vi.fn());
const mockGetClientIp = vi.hoisted(() => vi.fn());
const mockHasValidSameOrigin = vi.hoisted(() => vi.fn());
const mockReadAuthPayload = vi.hoisted(() => vi.fn());
const mockCreateSession = vi.hoisted(() => vi.fn());
const mockSetSessionCookie = vi.hoisted(() => vi.fn());
const mockGenerateResetToken = vi.hoisted(() => vi.fn());
const mockGetAnonymousCsrfCookieName = vi.hoisted(() => vi.fn());
const mockReadRequestCsrfToken = vi.hoisted(() => vi.fn());
const mockValidateCsrfToken = vi.hoisted(() => vi.fn());

vi.mock("@yona/db", () => ({
  getDb: mockGetDb,
}));

vi.mock("$lib/server/auth/audit", () => ({
  appendAuthAuditLog: mockAppendAuthAuditLog,
}));

vi.mock("$lib/server/auth/password", () => ({
  hashPassword: mockHashPassword,
}));

vi.mock("$lib/server/auth/rate-limit", () => ({
  allowAuthRequest: mockAllowAuthRequest,
}));

vi.mock("$lib/server/auth/request-validation", () => ({
  getClientIp: mockGetClientIp,
  hasValidSameOrigin: mockHasValidSameOrigin,
  readAuthPayload: mockReadAuthPayload,
}));

vi.mock("$lib/server/auth/session", () => ({
  createSession: mockCreateSession,
}));

vi.mock("$lib/server/auth/session-helper", () => ({
  setSessionCookie: mockSetSessionCookie,
}));

vi.mock("$lib/server/auth/tokens", () => ({
  generateResetToken: mockGenerateResetToken,
}));

vi.mock("$lib/server/auth/csrf", () => ({
  getAnonymousCsrfCookieName: mockGetAnonymousCsrfCookieName,
  readRequestCsrfToken: mockReadRequestCsrfToken,
  validateCsrfToken: mockValidateCsrfToken,
}));

function createDbMock(selectResults: unknown[]) {
  let selectIndex = 0;

  return {
    insert: vi.fn(() => ({
      values: vi.fn(async () => undefined),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => (selectResults[selectIndex++] as unknown[]) ?? []),
        })),
      })),
    })),
  };
}

function createEvent(options?: { anonymousCsrfCookie?: string }): Parameters<typeof POST>[0] {
  return {
    cookies: {
      get: vi.fn((name: string) => {
        if (name === "yona_csrf_token") {
          return options?.anonymousCsrfCookie;
        }

        return undefined;
      }),
      set: vi.fn(),
    },
    getClientAddress: () => "127.0.0.1",
    request: new Request("http://localhost/api/auth/register", { method: "POST" }),
  } as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasValidSameOrigin.mockReturnValue(true);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockAllowAuthRequest.mockReturnValue(true);
    mockGetAnonymousCsrfCookieName.mockReturnValue("yona_csrf_token");
    mockReadRequestCsrfToken.mockReturnValue("csrf-token");
    mockValidateCsrfToken.mockReturnValue(true);
    mockReadAuthPayload.mockResolvedValue({
      payload: {
        email: "user@example.com",
        password: "super-secret-password",
        name: "User",
      },
    });
    mockHashPassword.mockResolvedValue("hashed");
    mockGenerateResetToken.mockReturnValue("salt-token");
    mockCreateSession.mockResolvedValue({
      csrfToken: "csrf-token",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      token: "session-token",
      userId: 101,
    });
  });

  it("returns 403 when anonymous csrf cookie exists but request token is missing", async () => {
    mockReadRequestCsrfToken.mockReturnValue("");
    mockValidateCsrfToken.mockReturnValue(false);

    const response = await POST(createEvent({ anonymousCsrfCookie: "csrf-token" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("accepts anonymous csrf token when cookie and request token match", async () => {
    mockGetDb.mockReturnValue(createDbMock([[{ id: 42 }]]));

    const response = await POST(createEvent({ anonymousCsrfCookie: "csrf-token" }));

    expect(response.status).toBe(409);
    expect(mockValidateCsrfToken).toHaveBeenCalledWith("csrf-token", { csrfToken: "csrf-token" });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockAllowAuthRequest.mockReturnValue(false);

    const response = await POST(createEvent());

    expect(response.status).toBe(429);
    expect(mockAppendAuthAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "register", outcome: "denied" }),
    );
  });

  it("returns 409 with generic conflict message when user already exists", async () => {
    mockGetDb.mockReturnValue(createDbMock([[{ id: 42 }]]));

    const response = await POST(createEvent());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to register with the provided credentials",
    });
  });

  it("creates user and session, then returns csrf token", async () => {
    mockGetDb.mockReturnValue(
      createDbMock([
        [],
        [{ email: "user@example.com", id: 101, loginId: "user@example.com", name: "User" }],
      ]),
    );

    const response = await POST(createEvent());

    expect(response.status).toBe(201);
    expect(mockSetSessionCookie).toHaveBeenCalledWith(expect.anything(), "session-token");
    await expect(response.json()).resolves.toMatchObject({
      csrfToken: "csrf-token",
      session: { userId: 101 },
      user: { email: "user@example.com", id: 101 },
    });
  });
});
