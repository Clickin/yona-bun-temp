// SQL semantic projections.
//
// Legacy H2: the parity instance's H2 file carries credentials we cannot
// recover offline, so read-only access goes through the H2 Recover tool
// (credential-free physical dump) replayed into a scratch database. The live
// instance files are never touched.
//
// Yoram: sqlite3 CLI against the sweep database.

import { execFile, spawn } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
           JOIN PROJECT p ON p.ID = l.PROJECT_ID
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
    writeFileSync(scriptPath, dedupeH2RecoverSequences(readFileSync(scriptPath, "utf8")));
    // Multi-head recover dumps may repeat rows; replay via the interactive
    // Shell, which logs per-statement errors and keeps going, unlike RunScript
    // which aborts the whole replay on the first conflict.
    await replayH2Script(javaBin, h2Jar, `jdbc:h2:${path.join(workDir, "rebuilt")}`, readFileSync(scriptPath, "utf8"));
    await dedupeRebuiltTableRows(javaBin, h2Jar, `jdbc:h2:${path.join(workDir, "rebuilt")}`);

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
    // Multi-head recover dumps duplicate every row; collapse identical ones.
    const seen = new Set();
    const uniqueRows = [];
    for (const row of parseH2ShellOutput(stdout)) {
      const key = JSON.stringify(row);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRows.push(row);
      }
    }
    return uniqueRows;
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

// org.h2.tools.Recover replays every transaction-log head, so a file with
// more than one head yields two CREATE SEQUENCE variants per sequence and
// repeated INFORMATION_SCHEMA metadata rows, all of which kill RunScript.
// Collapse them:
//   - CREATE SEQUENCE: keep only the last variant per sequence (it carries
//     the live START WITH value);
//   - INSERT INTO INFORMATION_SCHEMA.*: keep only the first replay of each
//     metadata row set (later heads repeat it).
export function dedupeH2RecoverSequences(text) {
  const lines = text.split("\n");
  const lastSequenceLine = new Map();
  lines.forEach((line, index) => {
    const match = /^CREATE SEQUENCE (PUBLIC\.\S+)/u.exec(line);
    if (match && line.endsWith(";")) lastSequenceLine.set(match[1], index);
  });
  const seenMetadata = new Set();
  return lines
    .filter((line, index) => {
      const sequenceMatch = /^CREATE SEQUENCE (PUBLIC\.\S+)/u.exec(line);
      if (sequenceMatch && line.endsWith(";")) {
        return lastSequenceLine.get(sequenceMatch[1]) === index;
      }
      // System-table replays (LOB registry rows) repeat identically across
      // heads; keep the first copy so LOB references stay resolvable.
      const metadataMatch = /^INSERT INTO INFORMATION_SCHEMA\.\S+ /u.exec(line);
      if (metadataMatch) {
        if (seenMetadata.has(line)) return false;
        seenMetadata.add(line);
      }
      return true;
    })
    .join("\n");
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

// Feed a recovered SQL script to one interactive H2 Shell session. The Shell
// executes statements sequentially, logs per-statement conflicts, and keeps
// going — the tolerant replay that RunScript (abort on first error) cannot do.
export async function replayH2Script(javaBin, h2Jar, url, scriptText) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      javaBin,
      ["-cp", h2Jar, "org.h2.tools.Shell", "-url", url, "-user", "sa", "-password", ""],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("exit", () => resolve());
    child.on("error", reject);
    child.stdin.write(`${scriptText}\nexit\n`);
    child.stdin.end();
    setTimeout(() => child.kill(), 600_000).unref?.();
  });
}

// A multi-head recover dump replays the same logical rows once per head, so
// the rebuilt database can hold exact duplicates. Remove them table by table:
// delete each row whose full column tuple equals another row's (keeping the
// lowest _ROWID_). Tables without duplicates are untouched.
export async function dedupeRebuiltTableRows(javaBin, h2Jar, url) {
  const tables = await new Promise((resolve) => {
    const child = spawn(
      javaBin,
      ["-cp", h2Jar, "org.h2.tools.Shell", "-url", `${url};IFEXISTS=TRUE`, "-user", "sa", "-password", "",
       "-sql", "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC'"],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    let out = "";
    child.stdout.on("data", (c) => {
      out += c;
    });
    child.on("exit", () => resolve(parseH2ShellOutput(out)));
  });
  for (const entry of tables) {
    const table = entry.TABLE_NAME;
    if (!table || table.startsWith("O_")) continue;
    const cols = await new Promise((resolve) => {
      const child = spawn(
        javaBin,
        ["-cp", h2Jar, "org.h2.tools.Shell", "-url", `${url};IFEXISTS=TRUE`, "-user", "sa", "-password", "",
         "-sql", `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = '${table}' ORDER BY ORDINAL_POSITION`],
        { stdio: ["ignore", "pipe", "ignore"] },
      );
      let out = "";
      child.stdout.on("data", (c) => {
        out += c;
      });
      child.on("exit", () => resolve(parseH2ShellOutput(out)));
    });
    if (cols.length === 0) continue;
    const equality = cols
      .map((c) => `(A."${c.COLUMN_NAME}" = B."${c.COLUMN_NAME}" OR (A."${c.COLUMN_NAME}" IS NULL AND B."${c.COLUMN_NAME}" IS NULL))`)
      .join(" AND ");
    await replayH2Script(
      javaBin,
      h2Jar,
      url,
      `DELETE FROM "${table}" WHERE _ROWID_ IN (` +
        `SELECT A._ROWID_ FROM "${table}" A JOIN "${table}" B ON A._ROWID_ > B._ROWID_ WHERE ${equality});\nexit\n`,
    );
  }
}
