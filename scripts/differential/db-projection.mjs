// SQL semantic projections.
//
// Legacy H2: the parity instance's H2 file carries credentials we cannot
// recover offline, so read-only access goes through the H2 Recover tool
// (credential-free physical dump) replayed into a scratch database. The live
// instance files are never touched.
//
// Yoram: sqlite3 CLI against the sweep database.

import { execFile } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export function legacyJavaHome(repoRoot) {
  const jdkRoot = path.join(repoRoot, ".agent/legacy-localhost/jdks");
  const first = readdirSync(jdkRoot)[0];
  if (!first) throw new Error("no legacy JDK found under .agent/legacy-localhost/jdks");
  // zulu archives nest Contents/Home one or two levels deep
  for (const candidate of [
    path.join(jdkRoot, first, "Contents/Home"),
    path.join(jdkRoot, first, path.basename(first), "Contents/Home"),
  ]) {
    try {
      readdirSync(path.join(candidate, "bin"));
      return candidate;
    } catch {
      // try next shape
    }
  }
  throw new Error(`no usable JAVA_HOME under ${jdkRoot}`);
}

export function h2JarPath(repoRoot) {
  const libDir = path.join(repoRoot, ".agent/legacy-localhost/dist");
  const stack = [libDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/^com\.h2database\.h2-.*\.jar$/u.test(entry.name)) return full;
    }
  }
  throw new Error(`no h2 jar under ${libDir}`);
}

const LEGACY_PROJECTION_SQL = Object.freeze({
  issues: `SELECT i.TITLE AS title, i.AUTHOR_LOGIN_ID AS authorLoginId, LOWER(i.STATE) AS state
           FROM ISSUE i JOIN PROJECT p ON i.PROJECT_ID = p.ID
           WHERE p.NAME = '{project}'`,
  comments: `SELECT c.AUTHOR_LOGIN_ID AS authorLoginId, c.CONTENTS AS contents
             FROM ISSUE_COMMENT c JOIN PROJECT p ON c.PROJECT_ID = p.ID
             WHERE p.NAME = '{project}'`,
  labels: `SELECT l.NAME AS name, cat.NAME AS category, LOWER(l.COLOR) AS color
           FROM ISSUE_LABEL l
           JOIN PROJECT_LABEL pl ON pl.LABEL_ID = l.ID
           JOIN PROJECT p ON p.ID = pl.PROJECT_ID
           LEFT JOIN ISSUE_LABEL_CATEGORY cat ON cat.ID = l.CATEGORY_ID
           WHERE p.NAME = '{project}'`,
});

const YORAM_PROJECTION_SQL = Object.freeze({
  issues: `SELECT i.title, i.author_login_id AS authorLoginId, lower(i.state) AS state
           FROM issue i JOIN project p ON i.project_id = p.id
           WHERE p.name = $project`,
  comments: `SELECT c.author_login_id AS authorLoginId, c.contents
             FROM issue_comment c JOIN project p ON c.project_id = p.id
             WHERE p.name = $project`,
  labels: `SELECT l.name, cat.name AS category, lower(l.color) AS color
           FROM issue_label l
           JOIN issue_label_category cat ON l.category_id = cat.id
           JOIN project p ON l.project_id = p.id
           WHERE p.name = $project`,
});
// Dump the legacy H2 file into a scratch db and run one projection query.
export async function queryLegacyH2(repoRoot, dbFilePath, kind, projectName) {
  const javaBin = path.join(legacyJavaHome(repoRoot), "bin/java");
  const h2Jar = h2JarPath(repoRoot);
  const workDir = mkdtempSync(path.join(tmpdir(), "differential-h2-"));
  try {
    const baseName = "yona";
    copyFileSync(dbFilePath, path.join(workDir, `${baseName}.h2.db`));
    const tracePath = `${dbFilePath}.trace.db`;
    try {
      copyFileSync(tracePath, path.join(workDir, `${baseName}.trace.db`));
    } catch {
      // trace file is optional
    }

    await run(javaBin, ["-cp", h2Jar, "org.h2.tools.Recover", "-dir", workDir, "-db", baseName]);
    const scriptPath = path.join(workDir, `${baseName}.h2.sql`);
    await run(javaBin, [
      "-cp", h2Jar,
      "org.h2.tools.RunScript",
      "-url", `jdbc:h2:${path.join(workDir, "rebuilt")}`,
      "-user", "sa",
      "-password", "",
      "-script", scriptPath,
    ]);

    const sql = LEGACY_PROJECTION_SQL[kind].replaceAll("{project}", projectName.replace(/'/g, "''"));
    const shellArgs = [
      "-cp", h2Jar,
      "org.h2.tools.Shell",
      "-url", `jdbc:h2:${path.join(workDir, "rebuilt")};IFEXISTS=TRUE`,
      "-user", "sa",
      "-password", "",
      "-sql", sql,
    ];
    const { stdout } = await run(javaBin, shellArgs);
    return parseH2ShellOutput(stdout);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

export function parseH2ShellOutput(output) {
  const lines = output.split("\n").map((line) => line.trimEnd()).filter((line) => line.length > 0);
  const rows = [];
  let headers = null;
  for (const line of lines) {
    if (/^(\(?\d+ rows?|Update count)/u.test(line)) break;
    if (/^-+$/.test(line.trim())) continue;
    const cells = line.split(/\s*\|\s*/).map((cell) => cell.trim());
    if (headers === null) {
      headers = cells;
      continue;
    }
    if (cells.length !== headers.length) continue;
    rows.push(Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
  }
  return rows;
}

export async function queryYoramSqlite(dbPath, kind, projectName) {
  const sql = YORAM_PROJECTION_SQL[kind];
  const { stdout } = await run("sqlite3", [
    "-json",
    dbPath,
    sql.replaceAll("$project", `'${projectName.replace(/'/g, "''")}'`),
  ]);
  return stdout.trim().length > 0 ? JSON.parse(stdout) : [];
}
