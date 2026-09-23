import { Buffer } from "node:buffer";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SQL } from "bun";
import { createBunSqlDatabase } from "@sqlbraid/bun-sql";
import { type ExecutionEvent, type SqlTag } from "@sqlbraid/core";
import { sql as postgres } from "@sqlbraid/postgres";
import { sql as mysql } from "@sqlbraid/mysql";
import { sql as mariadb } from "@sqlbraid/mariadb";
import { sql as sqlite } from "@sqlbraid/sqlite";

const dialects = { postgres, mysql, mariadb, sqlite } as const;
type Dialect = keyof typeof dialects;
const tags = dialects as Record<Dialect, SqlTag>;
const dialect = process.argv[2] as Dialect;
const privateManagedRun = process.env.SQLBRAID_BUN_SQL_PRIVATE_MANAGED === "1";
const dockerContext = process.env.BUN_PORT_SQL_DOCKER_CONTEXT?.trim();
const checks: {
  name: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  evidence?: unknown;
  error?: unknown;
}[] = [];
const transactionEvents: { phase: string; status: string; depth: number }[] = [];
const queryEvents: {
  sql?: string;
  values: unknown[];
  parameterHints: (string | null)[];
  dialectId: string;
  transport: string;
}[] = [];
let client: InstanceType<typeof SQL> | undefined;
let sqliteDirectory: string | undefined;

function safeValue(value: unknown): { type: string; value: unknown } {
  if (value === null) return { type: "null", value: null };
  if (value === undefined) return { type: "undefined", value: null };
  if (typeof value === "bigint") return { type: "bigint", value: value.toString(10) };
  if (value instanceof Date) return { type: "Date", value: value.toISOString() };
  if (value instanceof Uint8Array)
    return { type: "Uint8Array", value: Buffer.from(value).toString("hex") };
  if (Array.isArray(value)) return { type: "Array", value: value.map((entry) => safeValue(entry)) };
  if (typeof value === "object") {
    return {
      type: "object",
      value: Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, safeValue(entry)]),
      ),
    };
  }
  return { type: typeof value, value };
}

function displayRows(rows: readonly Record<string, unknown>[]) {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeValue(value)])),
  );
}

function failIf(condition: unknown, message: string, evidence?: unknown): void {
  if (condition)
    throw Object.assign(new Error(message), {
      name: "ContractMismatch",
      ...(evidence === undefined ? {} : { evidence }),
    });
}

function classify(error: unknown): "FAIL" | "BLOCKED" {
  const candidate = error as {
    code?: unknown;
    feature?: unknown;
    name?: unknown;
    message?: unknown;
  };
  const code = typeof candidate?.code === "string" ? candidate.code : "";
  const name = typeof candidate?.name === "string" ? candidate.name : "";
  const message = typeof candidate?.message === "string" ? candidate.message : "";
  return candidate?.feature !== undefined ||
    /(?:UNSUPPORTED|RESULT_KIND_AMBIGUOUS|RESULT_EXACTNESS)/u.test(code) ||
    /(?:UnsupportedFeature|ResultExactness)/u.test(name) ||
    /(?:ENOENT|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND)/u.test(`${code} ${name} ${message}`)
    ? "BLOCKED"
    : "FAIL";
}

function errorRecord(error: unknown) {
  const candidate = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    evidence?: unknown;
  };
  const message =
    typeof candidate?.message === "string"
      ? candidate.message
          .replace(/(?:postgres|mysql|mariadb|sqlite):\/\/\S+/giu, "[URL_REDACTED]")
          .replace(/(password|passwd|pwd)\s*[=:]\s*\S+/giu, "$1=[REDACTED]")
          .slice(0, 300)
      : undefined;
  return {
    name: typeof candidate?.name === "string" ? candidate.name : "Error",
    ...(typeof candidate?.code === "string" ? { code: candidate.code } : {}),
    ...(candidate?.name === "SQLiteError" || candidate?.name === "ContractMismatch"
      ? { message }
      : {}),
    ...(candidate?.evidence === undefined ? {} : { evidence: candidate.evidence }),
  };
}

async function check(name: string, work: () => Promise<unknown>) {
  try {
    const evidence = await work();
    checks.push({ name, status: "PASS", ...(evidence === undefined ? {} : { evidence }) });
    return true;
  } catch (error) {
    checks.push({ name, status: classify(error), error: errorRecord(error) });
    return false;
  }
}

function nativeTemplate(segments: readonly string[]): TemplateStringsArray {
  const strings = [...segments] as string[] & { raw: readonly string[] };
  Object.defineProperty(strings, "raw", {
    configurable: false,
    enumerable: false,
    value: Object.freeze([...segments]),
    writable: false,
  });
  return Object.freeze(strings) as unknown as TemplateStringsArray;
}

function textCast(dialectName: Dialect, column: string) {
  return dialectName === "mysql" || dialectName === "mariadb"
    ? `CAST(${column} AS CHAR)`
    : `CAST(${column} AS TEXT)`;
}

function makeProbe(tag: SqlTag, dialectName: Dialect) {
  if (dialectName === "mysql" || dialectName === "mariadb") {
    return tag.rows`SELECT ${"O'Reilly"} AS bound_text, ${null} AS bound_null, CAST(${9007199254740993n} AS CHAR) AS exact_text`;
  }
  return tag.rows`SELECT ${"O'Reilly"} AS bound_text, ${null} AS bound_null, CAST(${9007199254740993n} AS TEXT) AS exact_text`;
}

function reservation(tag: SqlTag, dialectName: Dialect) {
  if (dialectName === "sqlite") {
    return tag.command`UPDATE braid_project SET last_issue_number = MAX(COALESCE(last_issue_number, 0), COALESCE((SELECT MAX(number) FROM braid_numbered WHERE project_id = braid_project.id), 0)) + 1 WHERE id = ${1}`;
  }
  return tag.command`UPDATE braid_project SET last_issue_number = GREATEST(COALESCE(last_issue_number, 0), COALESCE((SELECT MAX(number) FROM braid_numbered WHERE project_id = braid_project.id), 0)) + 1 WHERE id = ${1}`;
}

function finalStateSql(dialectName: Dialect) {
  const text = (column: string) => textCast(dialectName, column);
  return `SELECT 'counter' AS record_kind, ${text("project_id")} AS id, ${text("number")} AS label, '' AS nullable_text, '' AS wide_text FROM braid_numbered
UNION ALL SELECT 'project', ${text("id")}, ${text("last_issue_number")}, '', '' FROM braid_project
UNION ALL SELECT 'command', ${text("id")}, label, '', '' FROM braid_command_probe
UNION ALL SELECT 'native-command', ${text("id")}, label, '', '' FROM braid_native_command_probe
UNION ALL SELECT 'probe', ${text("id")}, label, COALESCE(nullable_text, '<NULL>'), ${text("wide")} FROM braid_probe
ORDER BY record_kind, id, label`;
}

async function nativeFinalState(dialectName: Dialect, databaseFile: string | undefined) {
  const select = finalStateSql(dialectName);
  if (dialectName === "sqlite") {
    if (!databaseFile)
      throw Object.assign(new Error("Fresh SQLite file missing"), {
        code: "BRAID_SQLITE_FIXTURE_MISSING",
      });
    const process = Bun.spawn(
      [
        "sqlite3",
        "-batch",
        "-noheader",
        "-separator",
        "\t",
        "-nullvalue",
        "<NULL>",
        databaseFile,
        select,
      ],
      {
        stdout: "pipe",
        stderr: "ignore",
      },
    );
    const output = await new Response(process.stdout).text();
    const exitCode = await process.exited;
    if (exitCode !== 0)
      throw Object.assign(new Error("sqlite3 CLI is unavailable or failed"), {
        code: "BRAID_NATIVE_CLI_UNAVAILABLE",
      });
    return {
      cli: "sqlite3",
      rows: output
        .replace(/(?:\r?\n)+$/u, "")
        .split(/\r?\n/u)
        .filter(Boolean),
    };
  }

  const raw = process.env.SQLBRAID_BUN_SQL_NATIVE_CLI;
  if (!raw)
    throw Object.assign(new Error("Managed native-client descriptor unavailable"), {
      code: "BRAID_NATIVE_CLI_UNAVAILABLE",
    });
  const fixture = JSON.parse(raw) as {
    container: string;
    token: string;
    password: string;
    hostPort: string;
    database: string;
    dialect: Dialect;
    dockerContext: string;
  };
  failIf(
    !dockerContext ||
      dockerContext === "default" ||
      fixture.dockerContext !== dockerContext ||
      process.env.BUN_PORT_SQL_DOCKER_DISPOSABLE !== "1" ||
      fixture.dialect !== dialectName ||
      fixture.container !== `bun-port-${dialectName}-${fixture.token}` ||
      !/^[a-f0-9]{24}$/u.test(fixture.token),
    "Native CLI target is not this run's dedicated disposable fixture",
  );
  const url = new URL(process.env.SQLBRAID_BUN_SQL_MANAGED_URL ?? "invalid:");
  failIf(
    url.hostname !== "127.0.0.1" ||
      url.port !== fixture.hostPort ||
      url.pathname !== `/${fixture.database}` ||
      fixture.database !== `bun_${fixture.token}`,
    "Managed URL does not point at the disposable loopback fixture",
  );

  const env = { ...process.env };
  const prefix = ["docker", "--context", fixture.dockerContext, "exec"];
  const args =
    dialectName === "postgres"
      ? [
          ...prefix,
          "-e",
          "PGPASSWORD",
          fixture.container,
          "psql",
          "-XAt",
          "-F",
          "\t",
          "-U",
          "sqlbraid",
          "-d",
          fixture.database,
          "-c",
          select,
        ]
      : ((env.MYSQL_PWD = fixture.password),
        [
          ...prefix,
          "-e",
          "MYSQL_PWD",
          fixture.container,
          "mysql",
          "--batch",
          "--raw",
          "--skip-column-names",
          "-u",
          "root",
          fixture.database,
          "-e",
          select,
        ]);
  if (dialectName === "postgres") env.PGPASSWORD = fixture.password;
  const process = Bun.spawn(args, { env, stdout: "pipe", stderr: "ignore" });
  const output = await new Response(process.stdout).text();
  const exitCode = await process.exited;
  if (exitCode !== 0)
    throw Object.assign(new Error("Container-native DB CLI failed or is unavailable"), {
      code: "BRAID_NATIVE_CLI_UNAVAILABLE",
    });
  return {
    cli: dialectName === "postgres" ? "psql" : "mysql",
    rows: output
      .replace(/(?:\r?\n)+$/u, "")
      .split(/\r?\n/u)
      .filter(Boolean),
  };
}

async function main() {
  if (!Object.hasOwn(dialects, dialect)) {
    console.log(
      JSON.stringify({
        dialect: process.argv[2] ?? null,
        status: "BLOCKED",
        reason: "unknown_dialect",
      }),
    );
    process.exitCode = 2;
    return;
  }
  if (Bun.version !== "1.4.2" || Bun.revision !== "744846f844374847c902b5e7fd59b4342a51ef99") {
    console.log(
      JSON.stringify({
        dialect,
        status: "BLOCKED",
        runtime: Bun.version,
        revision: Bun.revision,
        expectedRuntime: "1.4.2",
        expectedRevision: "744846f844374847c902b5e7fd59b4342a51ef99",
        reason: "runtime_pin_mismatch",
      }),
    );
    process.exitCode = 2;
    return;
  }
  if (
    dialect !== "sqlite" &&
    (!privateManagedRun ||
      !dockerContext ||
      dockerContext === "default" ||
      process.env.BUN_PORT_SQL_DOCKER_DISPOSABLE !== "1")
  ) {
    console.log(
      JSON.stringify({
        dialect,
        status: "BLOCKED",
        runtime: Bun.version,
        reason: "remote_dialect_requires_dedicated_disposable_docker_context",
      }),
    );
    process.exitCode = 2;
    return;
  }

  let sqliteFile: string | undefined;
  try {
    if (dialect === "sqlite") {
      sqliteDirectory = await mkdtemp(join(tmpdir(), "bun-port-sqlite-"));
      sqliteFile = join(sqliteDirectory, "fresh.sqlite");
      client = new SQL({ adapter: "sqlite", filename: sqliteFile, safeIntegers: true });
    } else {
      const raw = process.env.SQLBRAID_BUN_SQL_NATIVE_CLI;
      if (!raw)
        throw Object.assign(new Error("Managed disposable database descriptor missing"), {
          code: "BRAID_MANAGED_FIXTURE_MISSING",
        });
      const fixture = JSON.parse(raw) as {
        container: string;
        token: string;
        hostPort: string;
        database: string;
        dialect: Dialect;
        dockerContext: string;
      };
      failIf(
        !dockerContext ||
          dockerContext === "default" ||
          fixture.dockerContext !== dockerContext ||
          process.env.BUN_PORT_SQL_DOCKER_DISPOSABLE !== "1" ||
          fixture.dialect !== dialect ||
          fixture.container !== `bun-port-${dialect}-${fixture.token}` ||
          !/^[a-f0-9]{24}$/u.test(fixture.token),
        "Remote URL is not a dedicated disposable fixture",
      );
      const url = new URL(process.env.SQLBRAID_BUN_SQL_MANAGED_URL ?? "invalid:");
      failIf(
        url.hostname !== "127.0.0.1" ||
          url.port !== fixture.hostPort ||
          url.pathname !== `/${fixture.database}` ||
          fixture.database !== `bun_${fixture.token}`,
        "Managed URL does not target this run's fresh database",
      );
      client = new SQL(url.toString(), { bigint: true, max: 16 });
    }

    const observer = {
      onEvent(event: ExecutionEvent) {
        if (event.type === "transaction")
          transactionEvents.push({ phase: event.phase, status: event.status, depth: event.depth });
        if (event.type === "query:ready")
          queryEvents.push({
            ...(event.sql === undefined ? {} : { sql: event.sql }),
            values: [...event.values],
            parameterHints:
              event.parameterHints?.map((hint) => hint?.databaseType ?? null) ??
              event.values.map(() => null),
            dialectId: event.execution.dialectId,
            transport: event.execution.transport,
          });
      },
    };
    const db = createBunSqlDatabase(client, { dialect, observers: [observer] });
    const tag = tags[dialect];
    const schema =
      dialect === "postgres"
        ? "CREATE TABLE braid_probe (id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL, nullable_text TEXT, wide BIGINT NOT NULL)"
        : dialect === "mysql" || dialect === "mariadb"
          ? "CREATE TABLE braid_probe (id BIGINT AUTO_INCREMENT PRIMARY KEY, label TEXT NOT NULL, nullable_text TEXT, wide BIGINT NOT NULL)"
          : "CREATE TABLE braid_probe (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, nullable_text TEXT, wide INTEGER NOT NULL)";
    const commandSchema =
      dialect === "postgres"
        ? "CREATE TABLE braid_command_probe (id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL)"
        : dialect === "mysql" || dialect === "mariadb"
          ? "CREATE TABLE braid_command_probe (id BIGINT AUTO_INCREMENT PRIMARY KEY, label TEXT NOT NULL)"
          : "CREATE TABLE braid_command_probe (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL)";
    const nativeCommandSchema = commandSchema.replace(
      "braid_command_probe",
      "braid_native_command_probe",
    );

    const setupOk = await check("fresh_schema_and_engine", async () => {
      await db.execute(tag.command`${tag.raw(schema)}`);
      await db.execute(tag.command`${tag.raw(commandSchema)}`);
      await db.execute(tag.command`${tag.raw(nativeCommandSchema)}`);
      await db.execute(
        tag.command`CREATE TABLE braid_project (id INTEGER PRIMARY KEY, last_issue_number BIGINT NOT NULL)`,
      );
      await db.execute(
        tag.command`CREATE TABLE braid_numbered (project_id BIGINT NOT NULL, number BIGINT NOT NULL, PRIMARY KEY (project_id, number))`,
      );
      await db.execute(
        tag.command`INSERT INTO braid_project (id, last_issue_number) VALUES (${1}, ${0})`,
      );
      await db.execute(
        tag.command`INSERT INTO braid_numbered (project_id, number) VALUES (${1}, ${40})`,
      );
      const versionQuery =
        dialect === "postgres"
          ? tag.rows`SELECT version() AS version`
          : dialect === "mysql" || dialect === "mariadb"
            ? tag.rows`SELECT VERSION() AS version`
            : tag.rows`SELECT sqlite_version() AS version`;
      const server = await db.one(versionQuery);
      return { freshSQLiteFile: dialect === "sqlite", serverVersion: String(server.version) };
    });

    if (setupOk) {
      await check("native_and_normalized_command_metadata", async () => {
        const query = tag.command`INSERT INTO braid_command_probe (label) VALUES (${"metadata-probe"})`;
        const nativeQuery = tag.command`INSERT INTO ${tag.raw("braid_native_command_probe")} (label) VALUES (${"metadata-probe"})`;
        const rendered = nativeQuery.render();
        const values = rendered.parameters.map((parameter) => parameter.value);
        const strings = rendered.nativeTemplate ?? nativeTemplate(rendered.segments);
        const raw = (await (
          client as unknown as (
            template: TemplateStringsArray,
            ...args: readonly unknown[]
          ) => PromiseLike<unknown>
        )(strings, ...values)) as Record<string, unknown>;
        const normalized = await db.execute(query);
        const nativeCount = raw.affectedRows ?? raw.changes ?? raw.rowCount ?? raw.count;
        const nativeId = raw.insertId ?? raw.lastInsertRowid;
        const braid = normalized.command as Record<string, unknown>;
        const commandEvidence = {
          kind: safeValue(normalized.kind),
          native: {
            command: safeValue(raw.command),
            affectedRows: safeValue(nativeCount),
            insertId: safeValue(nativeId),
          },
          sqlBraid: safeValue(braid),
        };
        if (nativeCount === undefined)
          throw Object.assign(new Error("Native command metadata is unavailable"), {
            code: "BRAID_RESULT_KIND_AMBIGUOUS",
            evidence: commandEvidence,
          });
        failIf(
          normalized.kind !== "command",
          "SQLBraid did not materialize an INSERT command",
          commandEvidence,
        );
        failIf(
          Number(nativeCount) !== 1 || Number(braid.affectedRows) !== 1,
          "Native and SQLBraid command counts differ from one",
          commandEvidence,
        );
        failIf(
          (raw.command === undefined) !== (braid.command === undefined) ||
            (raw.command !== undefined && String(raw.command) !== String(braid.command)),
          "Native and SQLBraid command names differ",
          commandEvidence,
        );
        failIf(
          (nativeId === undefined) !== (braid.insertId === undefined) ||
            (nativeId !== undefined && String(nativeId) !== String(braid.insertId)),
          "Native and SQLBraid insert identifiers differ",
          commandEvidence,
        );
        return {
          native: {
            sqlSegments: rendered.segments,
            bindings: values.map((value, index) => ({ index: index + 1, ...safeValue(value) })),
            command: safeValue(raw.command),
            affectedRows: safeValue(nativeCount),
            insertId: safeValue(nativeId),
          },
          sqlBraid: safeValue(braid),
        };
      });

      const insertEvidence: unknown[] = [];
      const insertOk = await check("command_metadata_and_seed_rows", async () => {
        for (const row of [
          { label: "dup", nullable: null, wide: 9007199254740993n },
          { label: "dup", nullable: null, wide: 9007199254740993n },
          { label: "unique", nullable: "not-null", wide: 7n },
          { label: "tail", nullable: "x", wide: 8n },
        ]) {
          const result = await db.execute(
            tag.command`INSERT INTO braid_probe (label, nullable_text, wide) VALUES (${row.label}, ${row.nullable}, ${row.wide})`,
          );
          const metadata = result.command as Record<string, unknown>;
          failIf(result.kind !== "command", "INSERT did not materialize as a command");
          failIf(
            Number(metadata.affectedRows) !== 1,
            "INSERT affected-row metadata was not exactly one",
            {
              row: {
                label: row.label,
                nullable: safeValue(row.nullable),
                wide: safeValue(row.wide),
              },
              metadata: safeValue(metadata),
            },
          );
          insertEvidence.push(safeValue(metadata));
        }
        return { inserts: insertEvidence };
      });

      await check("generated_sql_bind_order_and_native_rows", async () => {
        const query = makeProbe(tag, dialect);
        const rendered = query.render();
        const values = rendered.parameters.map((parameter) => parameter.value);
        const bindingEvidence = rendered.parameters.map((parameter, index) => ({
          index: index + 1,
          ...safeValue(parameter.value),
          sqlTypeHint: parameter.hint?.databaseType ?? null,
        }));
        failIf(rendered.dialectId !== dialect, `Rendered dialect mismatch: ${rendered.dialectId}`, {
          actual: rendered.dialectId,
        });
        failIf(
          values.length !== 3 ||
            typeof values[0] !== "string" ||
            values[1] !== null ||
            typeof values[2] !== "bigint",
          "Binding order, values, or JS types changed",
          { bindings: bindingEvidence },
        );
        const strings = rendered.nativeTemplate ?? nativeTemplate(rendered.segments);
        const sqlBraidRows = (await db.all(query)) as readonly Record<string, unknown>[];
        const rawNative = (await (
          client as unknown as (
            template: TemplateStringsArray,
            ...args: readonly unknown[]
          ) => PromiseLike<unknown>
        )(strings, ...values)) as readonly Record<string, unknown>[];
        failIf(
          sqlBraidRows.length !== 1 || rawNative.length !== 1,
          "Bound scalar probe did not return exactly one row",
          { rawBunRows: displayRows(rawNative), sqlBraidRows: displayRows(sqlBraidRows) },
        );
        const expected = {
          bound_text: "O'Reilly",
          bound_null: null,
          exact_text: "9007199254740993",
        };
        for (const row of [...sqlBraidRows, ...rawNative]) {
          failIf(
            row.bound_text !== expected.bound_text ||
              row.bound_null !== expected.bound_null ||
              row.exact_text !== expected.exact_text,
            "Bound scalar, SQL NULL, or exact integer text changed",
            { row: displayRows([row]), expected },
          );
        }
        const observed = queryEvents.findLast(
          (event) => event.transport === "native-value-template" && event.values.length === 3,
        );
        if (observed === undefined)
          throw Object.assign(new Error("SQLBraid query-ready transport evidence missing"), {
            name: "ContractMismatch",
            evidence: { statementSegments: rendered.segments, bindings: bindingEvidence },
          });
        failIf(
          JSON.stringify(observed.values.map((value) => safeValue(value))) !==
            JSON.stringify(bindingEvidence.map(({ type, value }) => ({ type, value }))),
          "Observer binding order/value types differ from rendered SQL",
          { observed: observed.values.map((value) => safeValue(value)), bindings: bindingEvidence },
        );
        failIf(
          JSON.stringify(observed.parameterHints) !==
            JSON.stringify(bindingEvidence.map(({ sqlTypeHint }) => sqlTypeHint)),
          "Observer SQL type hints differ from rendered parameters",
          { observed: observed.parameterHints, bindings: bindingEvidence },
        );
        return {
          dialectId: rendered.dialectId,
          statementSegments: rendered.segments,
          driverSql: observed.sql ?? null,
          bindings: bindingEvidence,
          rawBunRows: displayRows(rawNative),
          sqlBraidRows: displayRows(sqlBraidRows),
        };
      });
      await check("exact_decimal_precision_and_representation", async () => {
        const exactDecimal = "1234567890123456.7890";
        const query = tag.rows`SELECT CAST(${exactDecimal} AS DECIMAL(20, 4)) AS exact_decimal`;
        const rendered = query.render();
        const raw = (await (
          client as unknown as (
            template: TemplateStringsArray,
            ...args: readonly unknown[]
          ) => PromiseLike<unknown>
        )(
          rendered.nativeTemplate ?? nativeTemplate(rendered.segments),
          ...rendered.parameters.map((parameter) => parameter.value),
        )) as readonly Record<string, unknown>[];
        let mapped: readonly Record<string, unknown>[];
        try {
          mapped = (await db.all(query)) as readonly Record<string, unknown>[];
        } catch (error) {
          throw Object.assign(
            new Error("SQLBraid exact decimal could not be materialized losslessly"),
            {
              code: "BRAID_RESULT_EXACTNESS",
              evidence: {
                expected: exactDecimal,
                rawNativeRows: displayRows(raw),
                sqlBraidError: errorRecord(error),
              },
            },
          );
        }
        if (
          typeof raw[0]?.exact_decimal !== "string" ||
          raw[0].exact_decimal !== exactDecimal ||
          typeof mapped[0]?.exact_decimal !== "string" ||
          mapped[0].exact_decimal !== exactDecimal
        ) {
          throw Object.assign(new Error("Exact decimal changed representation or precision"), {
            code: "BRAID_RESULT_EXACTNESS",
            evidence: {
              expected: exactDecimal,
              rawNativeRows: displayRows(raw),
              sqlBraidRows: displayRows(mapped),
            },
          });
        }
        return {
          expected: exactDecimal,
          rawNativeRows: displayRows(raw),
          sqlBraidRows: displayRows(mapped),
        };
      });

      if (insertOk) {
        await check("raw_rows_null_duplicates_order_and_precision", async () => {
          const query = tag.rows`SELECT id, label, nullable_text, ${tag.raw(textCast(dialect, "wide"))} AS wide_text FROM braid_probe ORDER BY id`;
          const rendered = query.render();
          const rawNative = (await (
            client as unknown as (
              template: TemplateStringsArray,
              ...args: readonly unknown[]
            ) => PromiseLike<unknown>
          )(
            rendered.nativeTemplate ?? nativeTemplate(rendered.segments),
            ...rendered.parameters.map((parameter) => parameter.value),
          )) as readonly Record<string, unknown>[];
          const sqlBraidRows = (await db.all(query)) as readonly Record<string, unknown>[];
          const projected = (rows: readonly Record<string, unknown>[]) =>
            rows.map((row) => ({
              id: String(row.id),
              label: row.label,
              nullable_text: row.nullable_text,
              wide_text: String(row.wide_text),
            }));
          const nativeRows = projected(rawNative);
          const mappedRows = projected(sqlBraidRows);
          failIf(
            nativeRows.length !== 4 || mappedRows.length !== 4,
            "A duplicate row or the result count was lost",
          );
          failIf(
            nativeRows.map((row) => row.id).join(",") !== "1,2,3,4" ||
              mappedRows.map((row) => row.id).join(",") !== "1,2,3,4",
            "Explicit ORDER BY id changed",
          );
          failIf(
            nativeRows.filter(
              (row) =>
                row.label === "dup" &&
                row.nullable_text === null &&
                row.wide_text === "9007199254740993",
            ).length !== 2 ||
              mappedRows.filter(
                (row) =>
                  row.label === "dup" &&
                  row.nullable_text === null &&
                  row.wide_text === "9007199254740993",
              ).length !== 2,
            "Identical duplicates, NULL, or exact BIGINT text changed",
          );
          failIf(
            nativeRows.filter((row) => row.nullable_text === null).length !== 2 ||
              mappedRows.filter((row) => row.nullable_text === null).length !== 2,
            "SQL NULL was not preserved",
          );
          return {
            rawNativeRows: displayRows(rawNative),
            sqlBraidRows: displayRows(sqlBraidRows),
            rowCount: mappedRows.length,
            duplicateTupleCount: 2,
            nullCount: 2,
          };
        });

        await check("transaction_savepoint_and_rollback", async () => {
          const start = transactionEvents.length;
          await db.tx(async (tx) => {
            await tx.execute(
              tag.command`INSERT INTO braid_probe (label, nullable_text, wide) VALUES (${"tx-kept"}, ${null}, ${9n})`,
            );
            const savepointFailure = new Error("savepoint rollback probe");
            try {
              await tx.tx(async (nested) => {
                await nested.execute(
                  tag.command`INSERT INTO braid_probe (label, nullable_text, wide) VALUES (${"tx-savepoint-rolled"}, ${null}, ${9n})`,
                );
                throw savepointFailure;
              });
            } catch (error) {
              failIf(
                error !== savepointFailure,
                "Savepoint did not propagate the callback failure",
              );
            }
            const visible = await tx.all(
              tag.rows`SELECT label FROM braid_probe WHERE label LIKE 'tx-%' ORDER BY label`,
            );
            failIf(
              visible.some((row) => row.label === "tx-savepoint-rolled"),
              "Savepoint rollback left its insert visible",
            );
          });
          const outerFailure = new Error("outer rollback probe");
          try {
            await db.tx(async (tx) => {
              await tx.execute(
                tag.command`INSERT INTO braid_probe (label, nullable_text, wide) VALUES (${"tx-outer-rolled"}, ${null}, ${9n})`,
              );
              throw outerFailure;
            });
          } catch (error) {
            failIf(
              error !== outerFailure,
              "Outer transaction did not propagate the callback failure",
            );
          }
          const labels = (
            await db.all(
              tag.rows`SELECT label FROM braid_probe WHERE label LIKE 'tx-%' ORDER BY label`,
            )
          ).map((row) => row.label);
          const events = transactionEvents.slice(start);
          failIf(
            labels.join(",") !== "tx-kept",
            "Savepoint or outer rollback persisted an incorrect row",
          );
          failIf(
            !events.some((event) => event.phase === "savepoint") ||
              !events.some((event) => event.phase === "rollback-to-savepoint") ||
              !events.some((event) => event.phase === "commit") ||
              !events.some((event) => event.phase === "rollback"),
            "Transaction observer missed commit/savepoint/rollback",
          );
          return { committedLabels: labels, events };
        });

        await check("concurrent_number_reservation_and_final_counter", async () => {
          const attempts = Array.from({ length: 16 }, async () => {
            const number = await db.tx(async (tx) => {
              const update = await tx.execute(reservation(tag, dialect));
              failIf(
                Number((update.command as Record<string, unknown>).affectedRows) !== 1,
                "Counter UPDATE affected-row metadata was not one",
              );
              return Number(
                (
                  await tx.one(
                    tag.rows`SELECT last_issue_number AS number FROM braid_project WHERE id = ${1}`,
                  )
                ).number,
              );
            });
            await db.execute(
              tag.command`INSERT INTO braid_numbered (project_id, number) VALUES (${1}, ${number})`,
            );
            return number;
          });
          const settled = await Promise.allSettled(attempts);
          const allocated: number[] = [];
          for (const result of settled) {
            if (result.status === "rejected") throw result.reason;
            allocated.push(result.value);
          }
          const ordered = [...allocated].sort((a, b) => a - b);
          failIf(
            new Set(allocated).size !== 16,
            "Concurrent reservations returned duplicate numbers",
          );
          failIf(
            ordered[0] !== 41 ||
              ordered[15] !== 56 ||
              ordered.some((number, index) => number !== index + 41),
            "Counter did not advance above imported high-water row 40",
          );
          const rows = (
            await db.all(
              tag.rows`SELECT CAST(number AS TEXT) AS number FROM braid_numbered WHERE project_id = ${1} ORDER BY number`,
            )
          ).map((row) => String(row.number));
          failIf(
            rows.length !== 17 ||
              rows[0] !== "40" ||
              rows.slice(1).join(",") !==
                Array.from({ length: 16 }, (_, index) => String(index + 41)).join(","),
            "Persisted reservation rows differ from allocated counter values",
          );
          return {
            concurrentRequests: allocated.length,
            allocated: ordered,
            finalNumberRows: rows.length,
            importedHighWater: 40,
          };
        });

        await check("final_database_state", async () => {
          const rows = (await db.all(
            tag.rows`${tag.raw(finalStateSql(dialect))}`,
          )) as readonly Record<string, unknown>[];
          failIf(rows.length !== 25, `Expected 25 final rows, received ${rows.length}`);
          failIf(
            rows.filter((row) => row.record_kind === "counter").length !== 17,
            "Persisted counter row count changed",
          );
          failIf(
            rows.find((row) => row.record_kind === "project")?.label !== "56",
            "Final high-water counter differs from allocated maximum",
          );
          failIf(
            rows.some(
              (row) => row.label === "tx-savepoint-rolled" || row.label === "tx-outer-rolled",
            ),
            "A rolled-back row remains in final state",
          );
          const cli = await nativeFinalState(dialect, sqliteFile);
          const expected = rows.map((row) =>
            [row.record_kind, row.id, row.label, row.nullable_text, row.wide_text]
              .map(String)
              .join("\t"),
          );
          failIf(
            cli.rows.length !== expected.length ||
              cli.rows.some((line, index) => line !== expected[index]),
            "Native CLI final state differs from Bun.SQL",
            { expected, actual: cli.rows },
          );
          return {
            bunRows: displayRows(rows),
            nativeClient: cli.cli,
            nativeRows: cli.rows.length,
            agrees: true,
          };
        });
      }
    }
  } catch (error) {
    checks.push({ name: "runner", status: classify(error), error: errorRecord(error) });
  } finally {
    try {
      await client?.close?.({ timeout: 2 });
    } catch {
      checks.push({ name: "connection_cleanup", status: "FAIL", error: { name: "CleanupError" } });
    }
    if (sqliteDirectory) {
      try {
        await rm(sqliteDirectory, { recursive: true, force: true });
      } catch {
        checks.push({
          name: "sqlite_fixture_cleanup",
          status: "FAIL",
          error: { name: "CleanupError" },
        });
      }
    }
    const status = checks.some((entry) => entry.status === "FAIL")
      ? "FAIL"
      : checks.some((entry) => entry.status === "BLOCKED")
        ? "BLOCKED"
        : "PASS";
    console.log(
      JSON.stringify({
        dialect,
        runtime: Bun.version,
        revision: Bun.revision,
        sqlbraid: "1.0.0",
        status,
        checks,
      }),
    );
    if (status !== "PASS") process.exitCode = 1;
  }
}

await main();
