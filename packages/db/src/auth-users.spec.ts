import { beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { n4user, siteAdmin } from "@drizzle/sqlite/schema";
import {
  createPasswordAuthUser,
  findAuthUserByApiToken,
  findAuthUserById,
  findAuthUserByIdentifier,
  updateUserApiToken,
} from "./index";
import { setupSQLiteTestDatabase } from "./test-utils/database";
import { applySqliteMigrations } from "./test-helpers";

describe("db auth user helpers", () => {
  let db: ReturnType<(typeof drizzle)["sqlite"]>;

  beforeAll(async () => {
    const setup = await setupSQLiteTestDatabase();
    db = (drizzle as any).sqlite(setup.url, {
      schema: await import("@drizzle/sqlite/schema"),
    });
    await applySqliteMigrations(db);
  });

  it("creates and resolves a password-backed auth user", async () => {
    const created = await createPasswordAuthUser(
      {
        emailAddress: "door@example.com",
        loginId: "door",
        name: "Door TTS",
        passwordHash: "hashed-password",
        passwordSalt: "salt",
      },
      db as never,
    );

    expect(created).toMatchObject({
      emailAddress: "door@example.com",
      isSiteAdmin: false,
      loginId: "door",
      name: "Door TTS",
      passwordHash: "hashed-password",
    });
    await expect(findAuthUserByIdentifier("door", db as never)).resolves.toMatchObject({
      id: created.id,
    });
    await expect(findAuthUserByIdentifier("door@example.com", db as never)).resolves.toMatchObject({
      id: created.id,
    });
  });

  it("hydrates token and site-admin flags from persisted rows", async () => {
    await db.insert(n4user).values({
      createdDate: new Date(0),
      email: "admin@example.com",
      isGuest: false,
      lastStateModifiedDate: new Date(0),
      loginId: "admin",
      name: "Admin",
      password: "hashed-password",
      passwordSalt: "salt",
      token: null,
    });
    const [user] = await db
      .select({
        id: n4user.id,
      })
      .from(n4user)
      .where((await import("drizzle-orm")).eq(n4user.loginId, "admin"))
      .limit(1);

    if (!user) {
      throw new Error("Expected admin test user.");
    }

    await updateUserApiToken(user.id, "api-token-1", db as never);
    await db.insert(siteAdmin).values({
      adminId: user.id,
    });

    await expect(findAuthUserByApiToken("api-token-1", db as never)).resolves.toMatchObject({
      id: user.id,
      isSiteAdmin: true,
      loginId: "admin",
    });
    await expect(findAuthUserById(user.id, db as never)).resolves.toMatchObject({
      id: user.id,
      isSiteAdmin: true,
    });
  });

  it("rolls back root auth-user creation when credential bootstrap fails", async () => {
    await createPasswordAuthUser(
      {
        emailAddress: "rollback@example.com",
        loginId: "rollback-primary",
        name: "Rollback Primary",
        passwordHash: "hashed-password",
        passwordSalt: "salt",
      },
      db as never,
    );

    await expect(
      createPasswordAuthUser(
        {
          emailAddress: "rollback@example.com",
          loginId: "rollback-secondary",
          name: "Rollback Secondary",
          passwordHash: "hashed-password",
          passwordSalt: "salt",
        },
        db as never,
      ),
    ).rejects.toThrow();

    await expect(findAuthUserByIdentifier("rollback-secondary", db as never)).resolves.toBeNull();

    const leftoverActors = await db
      .select({
        id: n4user.id,
      })
      .from(n4user)
      .where(eq(n4user.loginId, "rollback-secondary"));

    expect(leftoverActors).toHaveLength(0);
  });
});
