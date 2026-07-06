import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeBasePath } from "./dev-config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..");
const defaultAdminLoginId = process.env.YONA_DEV_DEFAULT_ADMIN_LOGIN_ID ?? "admin";

function hasTable(database, tableName) {
  return Boolean(
    database
      .prepare("select 1 from sqlite_master where type = 'table' and name = ? limit 1")
      .get(tableName),
  );
}

export function reconcileDefaultDevSiteAdmin(databasePath, loginId = defaultAdminLoginId) {
  const normalizedLoginId = (loginId ?? "").trim();
  if (normalizedLoginId === "") {
    return { reason: "empty-login-id", status: "skipped" };
  }

  const database = new DatabaseSync(databasePath);
  try {
    if (!hasTable(database, "n4user") || !hasTable(database, "site_admin")) {
      return { reason: "missing-schema", status: "skipped" };
    }

    const adminUser = database
      .prepare("select id from n4user where login_id = ? limit 1")
      .get(normalizedLoginId);
    if (!adminUser?.id) {
      return { loginId: normalizedLoginId, reason: "missing-admin-user", status: "skipped" };
    }

    const existingSiteAdmin = database
      .prepare("select id from site_admin where admin_id = ? limit 1")
      .get(adminUser.id);
    if (existingSiteAdmin?.id) {
      return {
        adminUserId: Number(adminUser.id),
        loginId: normalizedLoginId,
        status: "unchanged",
      };
    }

    database.prepare("insert into site_admin (admin_id) values (?)").run(adminUser.id);
    return {
      adminUserId: Number(adminUser.id),
      loginId: normalizedLoginId,
      status: "inserted",
    };
  } finally {
    database.close();
  }
}

export function runDevBackendOnce(env = process.env) {
  const runtimeDirectory = env.YONA_DEV_RUNTIME_DIR
    ? path.resolve(env.YONA_DEV_RUNTIME_DIR)
    : path.join(repoRoot, ".yona-data");
  const configPath = path.join(runtimeDirectory, "dev.toml");
  const databasePath = path.join(runtimeDirectory, "dev.db");
  const basePath = normalizeBasePath(env.YONA_DEV_BASE_PATH);
  const publicOrigin = env.YONA_DEV_PUBLIC_ORIGIN ?? "http://127.0.0.1:3101";

  fs.mkdirSync(runtimeDirectory, { recursive: true });
  const shouldSeed = !fs.existsSync(databasePath) || fs.statSync(databasePath).size === 0;
  fs.closeSync(fs.openSync(databasePath, "a"));

  let siteAdminReconcile = null;
  if (!shouldSeed) {
    siteAdminReconcile = reconcileDefaultDevSiteAdmin(
      databasePath,
      env.YONA_DEV_DEFAULT_ADMIN_LOGIN_ID ?? defaultAdminLoginId,
    );
    if (siteAdminReconcile.status === "inserted") {
      console.log(
        `Reconciled dev site-admin ACL for ${siteAdminReconcile.loginId} in ${path.relative(
          repoRoot,
          databasePath,
        )}`,
      );
    }
  }

  const relativeDatabasePath = path.relative(repoRoot, databasePath).replace(/\\/g, "/");
  const normalizedDatabasePath = relativeDatabasePath.startsWith(".")
    ? relativeDatabasePath
    : `./${relativeDatabasePath}`;

  const config = [
    `base_path = ${JSON.stringify(basePath)}`,
    `database_url = ${JSON.stringify(`sqlite://${normalizedDatabasePath}?mode=rwc`)}`,
    `public_origin = ${JSON.stringify(publicOrigin)}`,
    'schema_policy = "up"',
    `seed_pilot = ${shouldSeed ? "true" : "false"}`,
    "use_embedded_assets = false",
  ].join("\n");

  fs.writeFileSync(configPath, `${config}\n`);

  const child = spawn("cargo", ["run", "-p", "yoram-server", "--bin", "yoram"], {
    cwd: repoRoot,
    env: {
      ...env,
      YORAM_CONFIG_TOML: configPath,
    },
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  return {
    configPath,
    databasePath,
    runtimeDirectory,
    shouldSeed,
    siteAdminReconcile,
  };
}

const isMainModule =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  runDevBackendOnce();
}
