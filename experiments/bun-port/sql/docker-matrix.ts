import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const dialects = ["postgres", "mysql", "mariadb", "sqlite"] as const;
type Dialect = (typeof dialects)[number];
const only = process.argv.indexOf("--only");
const selected = only < 0 ? [...dialects] : [process.argv[only + 1] as Dialect];
const runner = fileURLToPath(new URL("./run.ts", import.meta.url));
const dockerContext = process.env.BUN_PORT_SQL_DOCKER_CONTEXT?.trim();
const disposableDocker = process.env.BUN_PORT_SQL_DOCKER_DISPOSABLE === "1";
type Result = Record<string, unknown> & { status: "PASS" | "FAIL" | "BLOCKED" };

async function command(args: string[], extraEnv?: Record<string, string>) {
  const child = Bun.spawn(args, {
    ...(extraEnv ? { env: { ...process.env, ...extraEnv } } : {}),
    stdout: "pipe",
    stderr: "ignore",
  });
  const stdout = await new Response(child.stdout).text();
  return { code: await child.exited, stdout: stdout.trim() };
}

async function docker(args: string[], extraEnv?: Record<string, string>) {
  if (!dockerContext || dockerContext === "default" || !disposableDocker)
    throw new Error("Dedicated disposable Docker context required");
  return command(["docker", "--context", dockerContext, ...args], extraEnv);
}

function blocked(dialect: string, reason: string): Result {
  return { dialect, status: "BLOCKED", reason };
}

async function runSqlite(): Promise<Result> {
  const child = Bun.spawn([process.execPath, "run", runner, "sqlite"], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const stdout = await new Response(child.stdout).text();
  const code = await child.exited;
  try {
    const result = JSON.parse(stdout.trim()) as Result;
    return code === 0 || result.status !== "PASS" ? result : { ...result, status: "FAIL" };
  } catch {
    return {
      dialect: "sqlite",
      status: "FAIL",
      reason: code === 0 ? "runner_emitted_no_json" : "fresh_sqlite_runner_failed",
    };
  }
}

async function runRemote(dialect: Exclude<Dialect, "sqlite">): Promise<Result> {
  const token = randomBytes(12).toString("hex");
  const name = `bun-port-${dialect}-${token}`;
  const database = `bun_${token}`;
  const password = randomBytes(24).toString("hex");
  const postgres = dialect === "postgres";
  const passwordEnv = postgres
    ? "POSTGRES_PASSWORD"
    : dialect === "mysql"
      ? "MYSQL_ROOT_PASSWORD"
      : "MARIADB_ROOT_PASSWORD";
  const databaseEnv = dialect === "mariadb" ? "MARIADB_DATABASE" : "MYSQL_DATABASE";
  const containerPort = postgres ? "5432" : "3306";
  const image = postgres
    ? "postgres:16-alpine"
    : dialect === "mysql"
      ? "mysql:8.4"
      : "mariadb:11.4";
  const dockerArgs = [
    "run",
    "--detach",
    "--rm",
    "--name",
    name,
    "--label",
    `com.yoram.bun-port-sql=${token}`,
    "--publish",
    `127.0.0.1::${containerPort}`,
  ];
  if (postgres)
    dockerArgs.push(
      "--env",
      "POSTGRES_USER=sqlbraid",
      "--env",
      passwordEnv,
      "--env",
      `POSTGRES_DB=${database}`,
    );
  else dockerArgs.push("--env", passwordEnv, "--env", `${databaseEnv}=${database}`);
  dockerArgs.push(image);

  let started = false;
  let result: Result | undefined;
  try {
    const start = await docker(dockerArgs, { [passwordEnv]: password });
    started = start.code === 0;
    if (!started) result = blocked(dialect, "disposable_container_start_failed");

    if (started) {
      const published = await docker(["port", name, `${containerPort}/tcp`]);
      const hostPort = published.stdout.startsWith("127.0.0.1:")
        ? published.stdout.slice(10)
        : undefined;
      if (published.code !== 0 || !hostPort)
        result = blocked(dialect, "random_loopback_port_unavailable");

      if (hostPort && published.code === 0) {
        const readiness = postgres
          ? ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "sqlbraid", "-d", database]
          : [
              "exec",
              "-e",
              "MYSQL_PWD",
              name,
              "mysqladmin",
              "ping",
              "-h",
              "127.0.0.1",
              "-u",
              "root",
              "--silent",
            ];
        let ready = false;
        for (let attempt = 0; attempt < 120; attempt += 1) {
          if (
            (await docker(readiness, postgres ? undefined : { MYSQL_PWD: password })).code === 0
          ) {
            ready = true;
            break;
          }
          const { promise, resolve } = Promise.withResolvers<void>();
          setTimeout(resolve, 1000);
          await promise;
        }
        if (!ready) result = blocked(dialect, "disposable_database_readiness_timeout");

        if (ready) {
          const url = postgres
            ? `postgres://sqlbraid:${password}@127.0.0.1:${hostPort}/${database}`
            : `mysql://root:${password}@127.0.0.1:${hostPort}/${database}`;
          const cliDescriptor = JSON.stringify({
            container: name,
            token,
            password,
            hostPort,
            database,
            dialect,
            dockerContext,
          });
          const child = Bun.spawn([process.execPath, "run", runner, dialect], {
            env: {
              ...process.env,
              SQLBRAID_BUN_SQL_PRIVATE_MANAGED: "1",
              BUN_PORT_SQL_DOCKER_DISPOSABLE: "1",
              SQLBRAID_BUN_SQL_MANAGED_URL: url,
              SQLBRAID_BUN_SQL_NATIVE_CLI: cliDescriptor,
            },
            stdout: "pipe",
            stderr: "ignore",
          });
          const stdout = await new Response(child.stdout).text();
          const code = await child.exited;
          try {
            result = JSON.parse(stdout.trim()) as Result;
            if (code !== 0 && result.status === "PASS") result = { ...result, status: "FAIL" };
          } catch {
            result = {
              dialect,
              status: "FAIL",
              reason: code === 0 ? "runner_emitted_no_json" : "sql_contract_runner_failed",
            };
          }
        }
      }
    }
  } catch {
    result ??= {
      dialect,
      status: started ? "FAIL" : "BLOCKED",
      reason: started ? "docker_matrix_runner_failed" : "disposable_container_unavailable",
    };
  } finally {
    if (started) {
      const daemon = await docker(["info", "--format", "{{.ServerVersion}}"]);
      if (daemon.code !== 0)
        result = { ...(result ?? { dialect }), status: "FAIL", cleanup: "UNCONFIRMED" };
      else {
        const exists = await docker(["inspect", name]);
        if (exists.code === 0) {
          const removed = await docker(["rm", "--force", name]);
          if (removed.code !== 0)
            result = { ...(result ?? { dialect }), status: "FAIL", cleanup: "FAIL" };
          else if (result) result.cleanup = "PASS";
        } else if (result) result.cleanup = "PASS";
      }
    }
  }
  return result ?? { dialect, status: "FAIL", reason: "runner_missing_result" };
}

let results: Result[];
if (!selected.length || selected.some((dialect) => !dialects.includes(dialect))) {
  results = [blocked(String(selected[0] ?? ""), "unknown_dialect")];
} else if (Bun.version !== "1.4.2" || Bun.revision !== "744846f844374847c902b5e7fd59b4342a51ef99") {
  results = selected.map((dialect) => blocked(dialect, "runtime_pin_mismatch"));
} else if (selected.length === 1 && selected[0] === "sqlite") {
  results = [await runSqlite()];
} else if (Bun.which("docker") === null) {
  results = [];
  for (const dialect of selected)
    results.push(
      dialect === "sqlite" ? await runSqlite() : blocked(dialect, "docker_cli_unavailable"),
    );
} else if (!dockerContext || dockerContext === "default" || !disposableDocker) {
  results = [];
  for (const dialect of selected)
    results.push(
      dialect === "sqlite"
        ? await runSqlite()
        : blocked(dialect, "dedicated_disposable_docker_context_required"),
    );
} else {
  const daemon = await docker(["info", "--format", "{{.ServerVersion}}"]);
  results = [];
  for (const dialect of selected) {
    results.push(
      dialect === "sqlite"
        ? await runSqlite()
        : daemon.code === 0
          ? await runRemote(dialect)
          : blocked(dialect, "dedicated_docker_context_unavailable"),
    );
  }
}

const status = results.some((result) => result.status === "FAIL")
  ? "FAIL"
  : results.some((result) => result.status === "BLOCKED")
    ? "BLOCKED"
    : "PASS";
console.log(
  JSON.stringify({
    runtime: Bun.version,
    revision: Bun.revision,
    sqlbraid: "1.0.0",
    status,
    results,
  }),
);
if (status !== "PASS") process.exitCode = 1;
