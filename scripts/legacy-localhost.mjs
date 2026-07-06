import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";
import process from "node:process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const frontendRequire = createRequire(new URL("../frontend/package.json", import.meta.url));
const defaultVersion = process.env.YONA_LEGACY_VERSION ?? "1.16.0";
const defaultPort = numberValue(process.env.YONA_LEGACY_PORT, 19100);
const defaultHost = process.env.YONA_LEGACY_HOST ?? "127.0.0.1";
const defaultInstance = process.env.YONA_LEGACY_INSTANCE ?? "default";
const defaultReleaseUrl =
  process.env.YONA_LEGACY_RELEASE_URL ??
  `https://github.com/yona-projects/yona/releases/download/v${defaultVersion}/yona-h2-v${defaultVersion}-bin.zip`;
const defaultWorkspaceDir = resolve(repoRoot, ".agent/legacy-localhost");
const defaultAdminEmail = process.env.YONA_LEGACY_ADMIN_EMAIL ?? "admin@example.com";
const defaultAdminName = process.env.YONA_LEGACY_ADMIN_NAME ?? "Site Admin";
const defaultAdminPassword = process.env.YONA_LEGACY_ADMIN_PASSWORD ?? "admin";
const defaultSecret =
  "VA2v:_I=h9>?FYOH:@ZhW]01P<mWZAKlQ>kk>Bo`mdCiA>pDw64FcBuZdDh<47Ew";

const [, , command = "help", ...rawArgs] = process.argv;
const options = parseArgs(rawArgs);
const layout = buildLayout({
  host: stringValue(options.host, defaultHost),
  instance: stringValue(options.instance, defaultInstance),
  port: numberValue(options.port, defaultPort),
  releaseUrl: stringValue(options.releaseUrl, defaultReleaseUrl),
  version: stringValue(options.version, defaultVersion),
  workspaceDir: stringValue(options.workspaceDir, defaultWorkspaceDir),
});

switch (command) {
  case "help":
    printHelp();
    break;
  case "prepare":
    await prepare(layout, options);
    break;
  case "start":
    await start(layout, options);
    break;
  case "stop":
    await stop(layout);
    break;
  case "status":
    await status(layout);
    break;
  case "seed-admin":
    await seedAdmin(layout, options);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
}

function buildLayout(input) {
  const cacheDir = resolve(input.workspaceDir, "cache");
  const distRoot = resolve(input.workspaceDir, "dist", `yona-h2-v${input.version}`);
  const installDir = resolve(distRoot, `yona-${input.version}`);
  const instanceDir = resolve(input.workspaceDir, "instances", input.instance);
  const jdkCacheDir = resolve(cacheDir, "jdk");
  const jdkRootDir = resolve(input.workspaceDir, "jdks");
  const dataDir = resolve(instanceDir, "data");
  const confDir = resolve(dataDir, "conf");
  const dbDir = resolve(dataDir, "db");
  const logDir = resolve(dataDir, "logs");
  const runDir = resolve(instanceDir, "run");
  const zipPath = resolve(cacheDir, `yona-h2-v${input.version}-bin.zip`);
  const pidFile = resolve(runDir, "legacy-yona.pid");
  const logFile = resolve(runDir, "legacy-yona.log");
  const metadataFile = resolve(instanceDir, "metadata.json");
  return {
    ...input,
    cacheDir,
    confDir,
    dataDir,
    dbDir,
    distRoot,
    installDir,
    instanceDir,
    jdkCacheDir,
    jdkRootDir,
    logDir,
    logFile,
    metadataFile,
    pidFile,
    runDir,
    zipPath,
  };
}

async function prepare(layout, options) {
  mkdirSync(layout.cacheDir, { recursive: true });
  mkdirSync(layout.distRoot, { recursive: true });
  mkdirSync(layout.confDir, { recursive: true });
  mkdirSync(layout.dbDir, { recursive: true });
  mkdirSync(layout.jdkCacheDir, { recursive: true });
  mkdirSync(layout.jdkRootDir, { recursive: true });
  mkdirSync(layout.logDir, { recursive: true });
  mkdirSync(layout.runDir, { recursive: true });

  if (!existsSync(layout.zipPath) || options.forceDownload) {
    if (options.forceDownload && existsSync(layout.zipPath)) {
      rmSync(layout.zipPath);
    }
    runOrThrow("curl", ["-fL", layout.releaseUrl, "-o", layout.zipPath], {
      label: "download legacy Yona release",
    });
  }

  if (!existsSync(layout.installDir) || options.forceExtract) {
    if (options.forceExtract && existsSync(layout.distRoot)) {
      rmSync(layout.distRoot, { force: true, recursive: true });
      mkdirSync(layout.distRoot, { recursive: true });
    }
    runOrThrow("unzip", ["-q", layout.zipPath, "-d", layout.distRoot], {
      label: "extract legacy Yona release",
    });
  }

  const javaHome = ensureJava8Home(layout, options);
  const javaVersion = readJavaVersion(resolve(javaHome, "bin/java"));
  if (!javaVersion.startsWith("1.8") && !javaVersion.startsWith("8")) {
    throw new Error(`Expected Java 8, found ${javaVersion} at ${javaHome}`);
  }

  const forceConfig = Boolean(options.forceConfig);
  const applicationConfPath = resolve(layout.confDir, "application.conf");
  const loggerConfPath = resolve(layout.confDir, "application-logger.xml");
  const socialLoginConfPath = resolve(layout.confDir, "social-login.conf");

  if (forceConfig || !existsSync(applicationConfPath)) {
    const source = readBundledFile(layout, "application.conf.default");
    writeFileSync(applicationConfPath, rewriteApplicationConf(source, layout), "utf8");
  }
  if (forceConfig || !existsSync(loggerConfPath)) {
    writeFileSync(
      loggerConfPath,
      readBundledFile(layout, "application-logger.xml.default"),
      "utf8",
    );
  }
  if (forceConfig || !existsSync(socialLoginConfPath)) {
    writeFileSync(
      socialLoginConfPath,
      readBundledFile(layout, "social-login.conf.default"),
      "utf8",
    );
  }

  writeFileSync(
    layout.metadataFile,
    JSON.stringify(
      {
        preparedAt: new Date().toISOString(),
        host: layout.host,
        instance: layout.instance,
        javaHome,
        port: layout.port,
        releaseUrl: layout.releaseUrl,
        version: layout.version,
        paths: {
          applicationConfPath,
          dataDir: layout.dataDir,
          installDir: layout.installDir,
          logFile: layout.logFile,
          socialLoginConfPath,
          zipPath: layout.zipPath,
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(JSON.stringify({
    applicationConfPath,
    host: layout.host,
    installDir: layout.installDir,
    javaHome,
    logFile: layout.logFile,
    port: layout.port,
    releaseUrl: layout.releaseUrl,
    version: layout.version,
  }, null, 2));
}

async function start(layout, options) {
  await prepare(layout, options);
  const pid = readPid(layout.pidFile);
  if (pid && isProcessAlive(pid)) {
    console.log(`legacy localhost already running with pid ${pid}`);
    return;
  }

  if (!(await isPortAvailable(layout.host, layout.port))) {
    throw new Error(`Port ${layout.port} on ${layout.host} is already in use`);
  }

  const javaHome = ensureJava8Home(layout, options);
  const env = {
    ...process.env,
    YONA_DATA: layout.dataDir,
    YONA_HOME: layout.installDir,
  };
  mkdirSync(layout.runDir, { recursive: true });
  const logFd = openSync(layout.logFile, "a");
  const child = spawn(
    resolve(layout.installDir, "bin/yona"),
    ["-java-home", javaHome, `-Dhttp.address=${layout.host}`, `-Dhttp.port=${layout.port}`],
    {
      cwd: layout.installDir,
      detached: true,
      env,
      stdio: ["ignore", logFd, logFd],
    },
  );
  child.unref();
  writeFileSync(layout.pidFile, `${child.pid}\n`, "utf8");
  await waitForHttp(`http://${layout.host}:${layout.port}/users/loginform`, 30_000);
  console.log(
    `legacy localhost started at http://${layout.host}:${layout.port} (pid ${child.pid}); log: ${layout.logFile}`,
  );
}

async function stop(layout) {
  const pid = readPid(layout.pidFile);
  if (!pid) {
    console.log("legacy localhost is not running");
    return;
  }
  if (!isProcessAlive(pid)) {
    rmSync(layout.pidFile, { force: true });
    console.log(`removed stale pid file for pid ${pid}`);
    return;
  }
  process.kill(pid, "SIGTERM");
  await waitForProcessExit(pid, 15_000);
  rmSync(layout.pidFile, { force: true });
  console.log(`stopped legacy localhost pid ${pid}`);
}

async function status(layout) {
  const pid = readPid(layout.pidFile);
  const javaHome = safeResolveJava8Home(layout);
  const loginProbe = await probeHttp(`http://${layout.host}:${layout.port}/users/loginform`);
  console.log(
    JSON.stringify(
      {
        host: layout.host,
        installDir: layout.installDir,
        instance: layout.instance,
        javaHome,
        loginProbe,
        logFile: layout.logFile,
        pid,
        pidAlive: pid ? isProcessAlive(pid) : false,
        port: layout.port,
        prepared: existsSync(layout.metadataFile),
        running: pid ? isProcessAlive(pid) : false,
        secretRotated: hasRotatedSecret(layout),
        url: `http://${layout.host}:${layout.port}`,
      },
      null,
      2,
    ),
  );
}

async function seedAdmin(layout, options) {
  const { chromium } = frontendRequire("@playwright/test");
  const name = stringValue(options.name, defaultAdminName);
  const email = stringValue(options.email, defaultAdminEmail);
  const password = stringValue(options.password, defaultAdminPassword);
  const restartAfterSeed = Boolean(options.restart);
  const secretPageUrl = `http://${layout.host}:${layout.port}/secret`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.goto(secretPageUrl, { waitUntil: "networkidle", timeout: 30_000 });

  if ((await page.locator("form input#loginId").count()) === 0) {
    const currentUrl = page.url();
    await browser.close();
    console.log(`admin seed step skipped; /secret is no longer active (${currentUrl})`);
    return;
  }

  await page.fill("#uname", name);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#retypedPassword", password);
  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => {}),
    page.locator('button[type="submit"]').click(),
  ]);

  const restartNotice = page.locator(".secret-box");
  await restartNotice.waitFor({ state: "visible", timeout: 30_000 });
  const bodyText = await page.locator("body").innerText();
  await browser.close();

  if (!bodyText.includes("Server needs to be restarted")) {
    throw new Error("Expected restart notice after site-admin setup");
  }
  if (!hasRotatedSecret(layout)) {
    throw new Error("Expected application.secret to change after site-admin setup");
  }

  console.log("site-admin bootstrap submitted successfully; legacy Yona now requires a restart");
  if (restartAfterSeed) {
    await stop(layout);
    await start(layout, options);
  }
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith("--")) {
      continue;
    }
    const key = current.slice(2);
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      options[camelCase(key)] = next;
      index += 1;
    } else {
      options[camelCase(key)] = true;
    }
  }
  return options;
}

function printHelp() {
  console.log(`legacy-localhost usage

Commands:
  node scripts/legacy-localhost.mjs prepare
  node scripts/legacy-localhost.mjs start
  node scripts/legacy-localhost.mjs stop
  node scripts/legacy-localhost.mjs status
  node scripts/legacy-localhost.mjs seed-admin [--name NAME --email EMAIL --password PASSWORD] [--restart]

Options:
  --version <value>        Legacy Yona version. Default: ${defaultVersion}
  --release-url <value>    Release zip URL. Default: ${defaultReleaseUrl}
  --workspace-dir <path>   Working directory. Default: ${defaultWorkspaceDir}
  --instance <name>        Instance name under .agent/legacy-localhost/instances. Default: ${defaultInstance}
  --host <value>           Bind host. Default: ${defaultHost}
  --port <value>           Bind port. Default: ${defaultPort}
  --java-home <path>       Explicit Java 8 home. Overrides auto-detection.
  --java-url <value>       Portable Java 8 archive URL. Used when auto-detection misses.
  --force-download         Re-download the release zip.
  --force-extract          Re-extract the release zip.
  --force-java-download    Re-download the portable Java 8 archive.
  --force-java-extract     Re-extract the portable Java 8 archive.
  --force-config           Rewrite generated conf files.

Environment:
  YONA_LEGACY_VERSION
  YONA_LEGACY_RELEASE_URL
  YONA_LEGACY_INSTANCE
  YONA_LEGACY_HOST
  YONA_LEGACY_PORT
  YONA_LEGACY_JAVA_HOME
  YONA_LEGACY_JAVA_URL
  YONA_LEGACY_ADMIN_NAME
  YONA_LEGACY_ADMIN_EMAIL
  YONA_LEGACY_ADMIN_PASSWORD
`);
}

function readBundledFile(layout, name) {
  const jarPath = resolve(layout.installDir, "lib", `yona.yona-${layout.version}.jar`);
  const result = spawnSync("unzip", ["-p", jarPath, name], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0 || !result.stdout) {
    throw new Error(`Failed to read ${name} from ${jarPath}: ${result.stderr}`);
  }
  return result.stdout;
}

function rewriteApplicationConf(source, layout) {
  const dbPath = resolve(layout.dbDir, "yona");
  return source.replace(
    /db\.default\.url="jdbc:h2:file:[^";]+(;[^"]*)"/,
    `db.default.url="jdbc:h2:file:${dbPath}$1"`,
  );
}

function ensureJava8Home(layout, options = {}) {
  const explicitHome = stringValue(options.javaHome, null);
  const existing = resolveAvailableJava8Home(layout, explicitHome);
  if (existing) {
    return existing;
  }
  if (options.noDownload) {
    throw new Error("Java 8 home is not available without downloading a portable archive.");
  }
  return ensurePortableJava8Home(layout, options);
}

function resolveAvailableJava8Home(layout, explicitHome) {
  const candidates = [];
  if (explicitHome) {
    candidates.push(explicitHome);
  }
  if (process.env.YONA_LEGACY_JAVA_HOME) {
    candidates.push(process.env.YONA_LEGACY_JAVA_HOME);
  }
  if (process.env.JAVA_HOME_8) {
    candidates.push(process.env.JAVA_HOME_8);
  }
  candidates.push(...findJavaHomeCandidates(layout.jdkRootDir));

  const brewOpenJdk8 = brewPrefix("openjdk@8");
  if (brewOpenJdk8) {
    candidates.push(resolve(brewOpenJdk8, "libexec/openjdk.jdk/Contents/Home"));
    candidates.push(resolve(brewOpenJdk8));
  }

  const jvmBase = "/Library/Java/JavaVirtualMachines";
  if (existsSync(jvmBase)) {
    const knownDirs = [
      "zulu-8.jdk",
      "temurin-8.jdk",
      "adoptopenjdk-8.jdk",
      "openjdk-8.jdk",
    ];
    for (const dir of knownDirs) {
      candidates.push(resolve(jvmBase, dir, "Contents/Home"));
    }
  }

  const javaFromPath = spawnSync("java", ["-XshowSettings:properties", "-version"], {
    encoding: "utf8",
  });
  if (javaFromPath.status === 0) {
    const home = /java\.home = (.+)/.exec(javaFromPath.stderr);
    if (home) {
      candidates.push(home[1].trim());
    }
  }

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const javaBin = resolve(candidate, "bin/java");
    if (!existsSync(javaBin)) {
      continue;
    }
    const version = readJavaVersion(javaBin);
    if (version.startsWith("1.8") || version.startsWith("8")) {
      return candidate;
    }
  }

  return null;
}

function ensurePortableJava8Home(layout, options) {
  const archiveUrl = resolvePortableJavaArchiveUrl(options.javaUrl);
  const archiveName = basename(new URL(archiveUrl).pathname);
  const archiveStem = stripArchiveSuffix(archiveName);
  const archivePath = resolve(layout.jdkCacheDir, archiveName);
  const extractDir = resolve(layout.jdkRootDir, archiveStem);

  if (!existsSync(archivePath) || options.forceJavaDownload) {
    if (options.forceJavaDownload && existsSync(archivePath)) {
      rmSync(archivePath, { force: true });
    }
    runOrThrow("curl", ["-fL", archiveUrl, "-o", archivePath], {
      label: "download portable Java 8",
    });
  }

  if (!existsSync(extractDir) || options.forceJavaExtract || options.forceJavaDownload) {
    rmSync(extractDir, { force: true, recursive: true });
    mkdirSync(extractDir, { recursive: true });
    extractArchive(archivePath, extractDir);
  }

  const javaHome = findJavaHomeCandidates(extractDir).find((candidate) => {
    const version = readJavaVersion(resolve(candidate, "bin/java"));
    return version.startsWith("1.8") || version.startsWith("8");
  });
  if (javaHome) {
    return javaHome;
  }

  throw new Error(
    `Unable to find a Java 8 home in ${extractDir}. Set YONA_LEGACY_JAVA_HOME or YONA_LEGACY_JAVA_URL explicitly.`,
  );
}

function safeResolveJava8Home(layout) {
  try {
    return ensureJava8Home(layout, { noDownload: true });
  } catch {
    return null;
  }
}

function resolvePortableJavaArchiveUrl(explicitUrl) {
  const value = stringValue(explicitUrl, process.env.YONA_LEGACY_JAVA_URL);
  if (value) {
    return value;
  }
  if (process.platform === "darwin" && process.arch === "arm64") {
    return "https://cdn.azul.com/zulu/bin/zulu8.94.0.17-ca-jdk8.0.492-macosx_aarch64.tar.gz";
  }
  if (process.platform === "darwin" && process.arch === "x64") {
    return "https://cdn.azul.com/zulu/bin/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64.tar.gz";
  }
  throw new Error(
    `No default portable Java 8 archive is configured for ${process.platform}/${process.arch}. Set YONA_LEGACY_JAVA_URL or YONA_LEGACY_JAVA_HOME.`,
  );
}

function stripArchiveSuffix(name) {
  return name
    .replace(/\.tar\.gz$/u, "")
    .replace(/\.tgz$/u, "")
    .replace(/\.zip$/u, "");
}

function extractArchive(archivePath, outputDir) {
  if (archivePath.endsWith(".zip")) {
    runOrThrow("unzip", ["-q", archivePath, "-d", outputDir], {
      label: "extract portable Java 8 archive",
    });
    return;
  }
  if (archivePath.endsWith(".tar.gz") || archivePath.endsWith(".tgz")) {
    runOrThrow("tar", ["-xzf", archivePath, "-C", outputDir], {
      label: "extract portable Java 8 archive",
    });
    return;
  }
  throw new Error(`Unsupported Java archive format: ${archivePath}`);
}

function findJavaHomeCandidates(rootDir, depth = 0) {
  if (!rootDir || !existsSync(rootDir)) {
    return [];
  }

  const directHome = resolve(rootDir, "bin/java");
  if (existsSync(directHome)) {
    return [rootDir];
  }

  const macBundleHome = resolve(rootDir, "Contents/Home/bin/java");
  if (existsSync(macBundleHome)) {
    return [resolve(rootDir, "Contents/Home")];
  }

  if (depth >= 4) {
    return [];
  }

  const nested = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    nested.push(...findJavaHomeCandidates(resolve(rootDir, entry.name), depth + 1));
  }
  return [...new Set(nested)];
}

function readJavaVersion(javaBin) {
  const result = spawnSync(javaBin, ["-version"], { encoding: "utf8" });
  const output = `${result.stdout}\n${result.stderr}`;
  const match = /version "([^"]+)"/.exec(output);
  if (!match) {
    throw new Error(`Failed to read Java version from ${javaBin}`);
  }
  return match[1];
}

function brewPrefix(name) {
  const result = spawnSync("brew", ["--prefix", name], { encoding: "utf8" });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim();
}

async function isPortAvailable(host, port) {
  const { createServer } = await import("node:net");
  return await new Promise((resolvePromise) => {
    const server = createServer();
    server.once("error", () => resolvePromise(false));
    server.once("listening", () => {
      server.close(() => resolvePromise(true));
    });
    server.listen(port, host);
  });
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok || response.status === 302 || response.status === 303) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function waitForProcessExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for pid ${pid} to exit`);
}

async function probeHttp(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return {
      ok: response.ok || response.status === 302 || response.status === 303,
      status: response.status,
      url,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      url,
    };
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function runOrThrow(commandName, args, { label }) {
  const result = spawnSync(commandName, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.stderr || result.stdout}`);
  }
}

function readPid(pidFile) {
  if (!existsSync(pidFile)) {
    return null;
  }
  const value = readFileSync(pidFile, "utf8").trim();
  if (!value) {
    return null;
  }
  return Number.parseInt(value, 10);
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function hasRotatedSecret(layout) {
  const applicationConfPath = resolve(layout.confDir, "application.conf");
  if (!existsSync(applicationConfPath)) {
    return false;
  }
  return !readFileSync(applicationConfPath, "utf8").includes(defaultSecret);
}

function camelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function stringValue(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberValue(value, fallback) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}
