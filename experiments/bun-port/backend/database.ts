import { mkdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { SQL } from "bun";
import { createBunSqlDatabase } from "@sqlbraid/bun-sql";
import { sql } from "@sqlbraid/sqlite";

const fixtureRoot = resolve(Bun.env.YORAM_BUN_FIXTURE_ROOT ?? ".local/bun-port");
mkdirSync(fixtureRoot, { recursive: true });
const filename = resolve(Bun.env.YORAM_BUN_DB ?? resolve(fixtureRoot, "issues.sqlite"));
const fixtureRelativePath = relative(fixtureRoot, filename);
if (
  fixtureRelativePath.length === 0 ||
  fixtureRelativePath === ".." ||
  fixtureRelativePath.startsWith(`..${sep}`) ||
  isAbsolute(fixtureRelativePath)
) {
  throw new Error("YORAM_BUN_DB must be a file inside YORAM_BUN_FIXTURE_ROOT");
}
mkdirSync(dirname(filename), { recursive: true });
const canonicalRoot = realpathSync(fixtureRoot);
const canonicalParent = realpathSync(dirname(filename));
if (canonicalParent !== canonicalRoot && !canonicalParent.startsWith(`${canonicalRoot}${sep}`)) {
  throw new Error("YORAM_BUN_DB resolves outside YORAM_BUN_FIXTURE_ROOT");
}

const client = new SQL({ adapter: "sqlite", filename, safeIntegers: true });
export const database = createBunSqlDatabase(client, { dialect: "sqlite" });

let initialized: Promise<void> | undefined;

export function initializeDatabase(): Promise<void> {
  return (initialized ??= initialize());
}

async function initialize(): Promise<void> {
  await database.execute(sql.command`PRAGMA foreign_keys = ON`);
  await database.execute(sql.command`
    CREATE TABLE IF NOT EXISTS user_account (
      id TEXT PRIMARY KEY,
      login_id TEXT NOT NULL UNIQUE,
      email TEXT,
      home_project_id TEXT NOT NULL,
      account_state TEXT NOT NULL DEFAULT 'ACTIVE',
      password_hash TEXT NOT NULL,
      password_salt TEXT
    )
  `);
  await database.execute(sql.command`
    CREATE TABLE IF NOT EXISTS project (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL CHECK (scope IN ('public', 'private')),
      last_issue_number INTEGER NOT NULL DEFAULT 0
    )
  `);
  await database.execute(sql.command`
    CREATE TABLE IF NOT EXISTS project_member (
      user_id TEXT NOT NULL REFERENCES user_account(id),
      project_id TEXT NOT NULL REFERENCES project(id),
      can_read INTEGER NOT NULL,
      can_create INTEGER NOT NULL,
      can_update INTEGER NOT NULL,
      PRIMARY KEY (user_id, project_id)
    )
  `);
  await database.execute(sql.command`
    CREATE TABLE IF NOT EXISTS issue (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES project(id),
      author_user_id TEXT NOT NULL REFERENCES user_account(id),
      assignee_user_id TEXT REFERENCES user_account(id),
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'open',
      is_draft INTEGER NOT NULL DEFAULT 0,
      weight INTEGER NOT NULL DEFAULT 0,
      body TEXT,
      created_at TEXT NOT NULL,
      created_at_precise TEXT NOT NULL,
      UNIQUE (project_id, number)
    )
  `);
  await database.execute(sql.command`
    CREATE TABLE IF NOT EXISTS user_session (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user_account(id),
      csrf_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);
  await database.execute(sql.command`
    CREATE TABLE IF NOT EXISTS issue_event_outbox (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
}

export async function closeDatabase(): Promise<void> {
  await client.close({ timeout: 1 });
}
