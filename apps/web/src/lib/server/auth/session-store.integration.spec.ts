import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@web/routes/api/auth/session/+server";
import { createSession, __resetSessionStoreForTests, getSessionCookieName } from "./session";
import { handleSession, setSessionCookie } from "./session-helper";

const mockGetDb = vi.hoisted(() => vi.fn());

vi.mock("$lib/server/db", () => ({
  getDb: mockGetDb,
}));

interface FakeCookies {
  get(name: string): string | undefined;
  set(name: string, value: string): void;
  delete(name: string): void;
  deleted: string[];
}

function createDbMock(selectResults: unknown[]) {
  let selectIndex = 0;

  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => (selectResults[selectIndex++] as unknown[]) ?? []),
        })),
      })),
    })),
  };
}

function createEvent(): Parameters<typeof GET>[0] & { cookies: FakeCookies } {
  const cookieStore = new Map<string, string>();
  const deleted: string[] = [];

  const cookies: FakeCookies = {
    get(name: string): string | undefined {
      return cookieStore.get(name);
    },
    set(name: string, value: string): void {
      cookieStore.set(name, value);
    },
    delete(name: string): void {
      deleted.push(name);
      cookieStore.delete(name);
    },
    deleted,
  };

  return {
    cookies,
    locals: {},
    request: new Request("http://localhost/api/auth/session", { method: "GET" }),
    url: new URL("http://localhost/api/auth/session"),
  } as Parameters<typeof GET>[0] & { cookies: FakeCookies };
}

describe("session store integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetSessionStoreForTests();
  });

  it("supports create -> cookie -> handle -> session endpoint flow", async () => {
    mockGetDb.mockReturnValue(
      createDbMock([
        [{ email: "user@example.com", id: 101, loginId: "user@example.com", name: "User" }],
      ]),
    );

    const createdSession = await createSession({ userId: 101 });
    const event = createEvent();
    setSessionCookie(event, createdSession.token);

    await handleSession({
      event,
      resolve: async () => new Response("ok", { status: 200 }),
    });

    expect(event.locals.session?.userId).toBe(101);

    const response = await GET(event);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      session: {
        userId: 101,
      },
      user: {
        id: 101,
        email: "user@example.com",
      },
    });
  });

  it("clears expired session cookie and returns null session", async () => {
    const createdSession = await createSession({
      now: new Date("2000-01-01T00:00:00.000Z"),
      userId: 101,
    });
    const event = createEvent();
    setSessionCookie(event, createdSession.token);

    await handleSession({
      event,
      resolve: async () => new Response("ok", { status: 200 }),
    });

    expect(event.locals.session).toBeUndefined();
    expect(event.cookies.deleted).toContain(getSessionCookieName());

    const response = await GET(event);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ session: null });
  });

  it("clears cookie after simulated process restart", async () => {
    const createdSession = await createSession({ userId: 101 });
    const event = createEvent();
    setSessionCookie(event, createdSession.token);

    __resetSessionStoreForTests();

    await handleSession({
      event,
      resolve: async () => new Response("ok", { status: 200 }),
    });

    expect(event.locals.session).toBeUndefined();
    expect(event.cookies.deleted).toContain(getSessionCookieName());

    const response = await GET(event);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ session: null });
  });
});
