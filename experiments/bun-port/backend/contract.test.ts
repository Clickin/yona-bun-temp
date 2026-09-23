import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "./rpc";

const fixtureRoot = mkdtempSync(join(tmpdir(), "yoram-bun-api-contract-"));
process.env.YORAM_BUN_FIXTURE_ROOT = fixtureRoot;
process.env.YORAM_BUN_DB = join(fixtureRoot, "fixture.sqlite");
process.env.YORAM_BUN_SEED_FIXTURE = "1";

let server: ReturnType<typeof Bun.serve>;
let alice: ReturnType<typeof makeClient>;
let charlie: ReturnType<typeof makeClient>;
let closeDatabase: () => Promise<void>;
let database: typeof import("./database").database;

function makeClient(
  cookie = "",
  csrfToken = "",
  origin?: string,
  onResponse?: (response: Response) => void,
) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: new URL("/api/trpc", server.url).toString(),
        transformer: superjson,
        headers: () => ({
          ...(cookie ? { cookie } : {}),
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          ...(origin ? { origin } : {}),
        }),
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          onResponse?.(response);
          return response;
        },
      }),
    ],
  });
}

async function logIn(identifier: string) {
  const origin = new URL(server.url).origin;
  let responseCookies: string[] = [];
  const client = makeClient("", "", origin, (response) => {
    responseCookies = response.headers.getSetCookie();
  });
  const session = await client.auth.signIn.mutate({ identifier, password: "local-bun-spike-only" });
  expect(session.authenticated).toBe(true);
  expect(
    responseCookies.some(
      (cookie) => cookie.startsWith("bunPortSession=") && cookie.includes("HttpOnly"),
    ),
  ).toBe(true);
  const csrfCookie = responseCookies.find((cookie) => cookie.startsWith("bunPortCsrf="));
  expect(csrfCookie?.includes("HttpOnly")).toBe(false);
  const cookie = responseCookies.map((value) => value.split(";", 1)[0]!).join("; ");
  const csrfToken = decodeURIComponent(csrfCookie!.split(";", 1)[0]!.slice("bunPortCsrf=".length));
  return { client: makeClient(cookie, csrfToken, origin), cookie, csrfToken };
}

beforeAll(async () => {
  const { seedSyntheticFixture } = await import("./fixtures");
  await seedSyntheticFixture();
  const db = await import("./database");
  database = db.database;
  closeDatabase = db.closeDatabase;
  const { handleTrpcRequest } = await import("./rpc");
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: handleTrpcRequest,
  });
  alice = (await logIn("alice@example.test")).client;
  charlie = (await logIn("charlie")).client;
});

afterAll(async () => {
  if (server) await server.stop(true);
  if (closeDatabase) await closeDatabase();
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test("tRPC authentication establishes isolated legacy-compatible sessions", async () => {
  expect(await alice.viewer.query()).toEqual({ userId: "alice", projectId: "project-red" });
  expect(await charlie.viewer.query()).toEqual({ userId: "charlie", projectId: "project-blue" });
  expect(await alice.auth.session.query()).toEqual({
    authenticated: true,
    userId: "alice",
    projectId: "project-red",
  });
  expect(await makeClient().auth.session.query()).toEqual({ authenticated: false });

  const hash = await database.maybeOne(
    (await import("@sqlbraid/sqlite")).sql.rows<{
      password_hash: string;
      password_salt: string | null;
    }>`
      SELECT password_hash, password_salt FROM user_account WHERE id = "alice"
    `,
  );
  expect(hash?.password_hash.startsWith("$argon2id$")).toBe(true);
  expect(hash?.password_salt).toBeNull();

  await expect(
    makeClient("", "", new URL(server.url).origin).auth.signIn.mutate({
      identifier: "locked",
      password: "local-bun-spike-only",
    }),
  ).rejects.toMatchObject({ message: "This user account is locked.", data: { code: "FORBIDDEN" } });
});

test("SuperJSON preserves BigInt, Date, NULL, undefined, and precise timestamp values over HTTP", async () => {
  const [issue] = await alice.issue.list.query({ projectId: "project-red", state: "open" });
  expect(issue).toBeDefined();
  expect(issue!.id).toBe(9007199254740993n);
  expect(typeof issue!.id).toBe("bigint");
  expect(issue!.createdAt).toBeInstanceOf(Date);
  expect(issue!.createdAt.toISOString()).toBe("2026-09-23T10:11:12.345Z");
  expect(issue!.createdAtPrecise).toBe("2026-09-23T10:11:12.345678Z");
  expect(issue!.body).toBeNull();
  expect(Object.hasOwn(issue!, "optionalSummary")).toBe(true);
  expect(issue!.optionalSummary).toBeUndefined();
});

test("private project ACL, public read, author updates, and CSRF protect mutations", async () => {
  await expect(
    charlie.issue.list.query({ projectId: "project-red", state: "all" }),
  ).rejects.toMatchObject({
    data: { code: "FORBIDDEN" },
  });
  const publicIssues = await charlie.issue.list.query({ projectId: "project-blue", state: "open" });
  expect(publicIssues.map((issue) => issue.title)).toEqual(["Bob issue"]);

  await expect(
    charlie.issue.update.mutate({
      projectId: "project-blue",
      id: 9007199254740995n,
      title: "unauthorized edit",
    }),
  ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });

  const noCsrf = makeClient("", "", new URL(server.url).origin);
  await expect(
    noCsrf.issue.create.mutate({
      projectId: "project-red",
      title: "Missing CSRF",
      body: null,
    }),
  ).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });

  const created = await alice.issue.create.mutate({
    projectId: "project-red",
    title: "Created through tRPC",
    body: null,
  });
  expect(created.number).toBe(2n);
  expect(created.body).toBeNull();

  const stored = await database.maybeOne(
    (await import("@sqlbraid/sqlite")).sql.rows<{ title: string; body: string | null }>`
      SELECT title, body FROM issue WHERE id = ${created.id.toString()}
    `,
  );
  expect(stored).toEqual({ title: "Created through tRPC", body: null });
  const outbox = await database.all(
    (await import("@sqlbraid/sqlite")).sql.rows<{ event_type: string }>`
      SELECT event_type FROM issue_event_outbox WHERE issue_id = ${created.id.toString()}
    `,
  );
  expect(outbox).toHaveLength(1);
  expect(outbox[0]?.event_type).toBe("issue.committed");
});

test("tRPC sign-out revokes the session", async () => {
  const session = await logIn("alice");
  await session.client.auth.signOut.mutate();
  expect(await session.client.auth.session.query()).toEqual({ authenticated: false });
});

test("the tRPC Fetch handler rejects oversized request bodies", async () => {
  const response = await fetch(new URL("/api/trpc/auth.session", server.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "x".repeat(8193),
  });
  expect(response.status).toBe(413);
});
