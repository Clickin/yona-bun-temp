import { sql } from "@sqlbraid/sqlite";
import { database, initializeDatabase } from "./database";
import { legacyPasswordHash } from "./password";

export async function seedSyntheticFixture(): Promise<void> {
  if (Bun.env.YORAM_BUN_SEED_FIXTURE !== "1") {
    throw new Error(
      "Set YORAM_BUN_SEED_FIXTURE=1 to reset only the isolated Bun experiment fixture",
    );
  }

  const fixturePassword = Bun.env.YORAM_BUN_FIXTURE_PASSWORD ?? "local-bun-spike-only";
  const aliceSalt = "fixture-salt-alice";
  const aliceHash = legacyPasswordHash(fixturePassword, aliceSalt);
  const bcryptHash = await Bun.password.hash(fixturePassword, { algorithm: "bcrypt", cost: 10 });

  await initializeDatabase();
  await database.tx(async (tx) => {
    await tx.execute(sql.command`DELETE FROM user_session`);
    await tx.execute(sql.command`DELETE FROM issue_event_outbox`);
    await tx.execute(sql.command`DELETE FROM issue`);
    await tx.execute(sql.command`DELETE FROM project_member`);
    await tx.execute(sql.command`DELETE FROM project`);
    await tx.execute(sql.command`DELETE FROM user_account`);

    await tx.execute(sql.command`
      INSERT INTO user_account
        (id, login_id, email, home_project_id, account_state, password_hash, password_salt)
      VALUES
        ("alice", "alice", "alice@example.test", "project-red", "ACTIVE", ${aliceHash}, ${aliceSalt}),
        ("bob", "bob", "bob@example.test", "project-blue", "ACTIVE", ${bcryptHash}, NULL),
        ("charlie", "charlie", "charlie@example.test", "project-blue", "ACTIVE", ${bcryptHash}, NULL),
        ("locked", "locked", "locked@example.test", "project-red", "LOCKED", ${bcryptHash}, NULL)
    `);
    await tx.execute(sql.command`
      INSERT INTO project (id, scope, last_issue_number)
      VALUES ("project-red", "private", 1), ("project-blue", "public", 1)
    `);
    await tx.execute(sql.command`
      INSERT INTO project_member (user_id, project_id, can_read, can_create, can_update)
      VALUES ("alice", "project-red", 1, 1, 1)
    `);
    await tx.execute(sql.command`
      INSERT INTO issue
        (id, project_id, author_user_id, assignee_user_id, number, title, state,
         is_draft, weight, body, created_at, created_at_precise)
      VALUES
        ("9007199254740993", "project-red", "alice", NULL, 1, "Legacy issue title", "open",
         0, 0, NULL, "2026-09-23T10:11:12.345Z", "2026-09-23T10:11:12.345678Z"),
        ("9007199254740995", "project-blue", "bob", NULL, 1, "Bob issue", "open",
         0, 0, "Private body", "2026-09-23T10:11:12.345Z", "2026-09-23T10:11:12.345678Z")
    `);
  });
}
