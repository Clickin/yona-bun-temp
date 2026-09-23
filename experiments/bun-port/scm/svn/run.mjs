#!/usr/bin/env bun
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer, connect } from "node:net";
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EXPECTED_BUN_VERSION = "1.4.2";
const EXPECTED_BUN_REVISION = "744846f844374847c902b5e7fd59b4342a51ef99";
const APACHE_USER = "fixture";
const APACHE_PASSWORD = "fixture-only-password";
const SCENARIOS = [
  "info",
  "checkout",
  "update",
  "log",
  "diff",
  "blame",
  "commit",
  "copy",
  "move",
  "properties",
  "lock/unlock",
  "denied write",
  "hook rejection",
  "interruption and reconnect",
  "revision and file-hash verification",
  "process/lock cleanup",
];
const bigFixtureBytes = 12 * 1024 * 1024;
const rows = [];
const tempRoot = await mkdtemp(join(tmpdir(), "bun-svn-validation-"));

function row(transport, scenario, status = "NOT_RUN", detail = "") {
  const result = { transport, scenario, status, detail };
  rows.push(result);
  return result;
}

async function step(transport, scenario, run) {
  const result = rows.find((entry) => entry.transport === transport && entry.scenario === scenario);
  if (!result) throw new Error(`Missing transport matrix row: ${transport} / ${scenario}`);
  result.status = "RUNNING";
  try {
    await run();
    result.status = "PASS";
  } catch (error) {
    result.status = "FAIL";
    result.detail =
      error instanceof CommandError
        ? `${error.command} exited ${error.code ?? "without an exit code"}${error.diagnosticCode ? ` (${error.diagnosticCode}${error.diagnosticCategory ? `:${error.diagnosticCategory}` : ""})` : ""}`
        : error instanceof Error
          ? error.message
          : String(error);
    throw error;
  }
}

class CommandError extends Error {
  constructor(command, code, diagnosticCode, diagnosticCategory) {
    super(`${command} exited ${code ?? "without an exit code"}`);
    this.command = command;
    this.code = code;
    this.diagnosticCode = diagnosticCode;
    this.diagnosticCategory = diagnosticCategory;
  }
}

function command(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    let stdoutBytes = 0;
    const stderr = [];
    let stderrBytes = 0;
    const maxCapture = options.maxCapture ?? 1024 * 1024;
    child.stdout.on("data", (chunk) => {
      if (stdoutBytes < maxCapture) {
        const accepted = chunk.subarray(0, maxCapture - stdoutBytes);
        stdout.push(accepted);
        stdoutBytes += accepted.length;
      }
    });
    child.stderr.on("data", (chunk) => {
      if (stderrBytes < 4096) {
        const accepted = chunk.subarray(0, 4096 - stderrBytes);
        stderr.push(accepted);
        stderrBytes += accepted.length;
      }
    });
    child.once("error", reject);
    child.once("close", (code) => {
      const result = { code, stdout: Buffer.concat(stdout).toString("utf8") };
      if (options.allowFailure || code === 0) resolvePromise(result);
      else {
        const diagnostic = Buffer.concat(stderr).toString("utf8");
        const diagnosticCode = diagnostic.match(/\bE\d{6}\b/gu)?.join(",");
        const diagnosticCategory = /authorization failed|not authorized|access denied/iu.test(
          diagnostic,
        )
          ? "AUTHORIZATION_FAILED"
          : /authentication failed|password.{0,24}(?:incorrect|wrong)|could not authenticate/iu.test(
                diagnostic,
              )
            ? "AUTHENTICATION_FAILED"
            : /connection refused|could not connect|connection timed out|network is unreachable/iu.test(
                  diagnostic,
                )
              ? "CONNECTION_FAILED"
              : /repository.{0,24}(?:not found|missing)|no repository/iu.test(diagnostic)
                ? "REPOSITORY_NOT_FOUND"
                : undefined;
        reject(new CommandError(command, code, diagnosticCode, diagnosticCategory));
      }
    });
  });
}

async function executable(name) {
  for (const directory of (process.env.PATH ?? "").split(":")) {
    if (!directory) continue;
    try {
      await access(join(directory, name), constants.X_OK);
      return true;
    } catch {}
  }
  return false;
}

function svnArgs(args, configDir, credentials) {
  const global = ["--non-interactive", "--config-dir", configDir, "--no-auth-cache"];
  if (credentials)
    global.push("--username", credentials.username, "--password", credentials.password);
  return [...global, ...args];
}

function svn(configDir, credentials, args, options = {}) {
  return command("svn", svnArgs(args, configDir, credentials), options);
}

async function freePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  await new Promise((resolvePromise) => server.close(resolvePromise));
  if (!address || typeof address === "string")
    throw new Error("Could not reserve a local TCP port");
  return address.port;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitFor(check, description, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(
    `${description} did not become ready${lastError ? ` (${lastError.message})` : ""}`,
  );
}

async function svnserveServer(repoParent, repoName, configPath, configDir, credentials) {
  const port = await freePort();
  let child;
  let childClosed = true;
  const server = {
    url: `svn://127.0.0.1:${port}/${repoName}`,
    port,
    async start() {
      child = spawn(
        "svnserve",
        [
          "--daemon",
          "--foreground",
          "--listen-host",
          "127.0.0.1",
          "--listen-port",
          String(port),
          "--root",
          repoParent,
          "--config-file",
          configPath,
        ],
        { stdio: "ignore" },
      );
      childClosed = false;
      child.once("close", () => {
        childClosed = true;
      });
      child.once("error", () => {
        childClosed = true;
      });
      await waitFor(
        async () => {
          if (childClosed) throw new Error("svnserve exited during startup");
          try {
            await svn(configDir, credentials, ["info", `${server.url}/trunk`]);
            return true;
          } catch {
            return false;
          }
        },
        "svnserve",
        15_000,
      );
    },
    async stop() {
      if (!child || childClosed) return;
      const current = child;
      const closed = new Promise((resolvePromise) => current.once("close", resolvePromise));
      current.kill("SIGTERM");
      const timedOut = await Promise.race([
        closed.then(() => false),
        sleep(3_000).then(() => true),
      ]);
      if (timedOut && !childClosed) {
        current.kill("SIGKILL");
        await closed;
      }
    },
    async isStopped() {
      return !child || childClosed;
    },
    async restart() {
      await server.stop();
      await server.start();
    },
  };
  return server;
}

async function dockerServer(repoParent, repoName, authzPath, configDir) {
  const context = process.env.BUN_SVN_DOCKER_CONTEXT;
  const image = process.env.BUN_SVN_DAV_IMAGE;
  if (!context || context === "default") {
    throw new BlockedError(
      "Set BUN_SVN_DOCKER_CONTEXT to a dedicated non-default disposable Docker context.",
    );
  }
  if (!image)
    throw new BlockedError(
      "Set BUN_SVN_DAV_IMAGE to a locally available Apache mod_dav_svn image.",
    );
  const docker = (args, options = {}) =>
    command("docker", ["--context", context, ...args], options);
  const port = await freePort();
  const suffix = `${process.pid}-${Math.random().toString(16).slice(2, 10)}`;
  const network = `bun-svn-${suffix}`;
  const container = `bun-svn-dav-${suffix}`;
  let running = false;
  let networkCreated = false;
  const server = {
    url: `http://127.0.0.1:${port}/svn/${repoName}`,
    port,
    credentials: { username: APACHE_USER, password: APACHE_PASSWORD },
    async start() {
      const daemon = await docker(["info", "--format", "{{.Name}}"], { allowFailure: true });
      if (daemon.code !== 0)
        throw new BlockedError(`Isolated Docker context ${context} is unavailable.`);
      const imageCheck = await docker(["image", "inspect", image], { allowFailure: true });
      if (imageCheck.code !== 0)
        throw new BlockedError(
          `DAV image is not present locally in Docker context ${context}: ${image}`,
        );
      if (!networkCreated) {
        await docker(["network", "create", "--internal", "--driver", "bridge", network]);
        networkCreated = true;
      }
      await docker([
        "run",
        "--rm",
        "-d",
        "--name",
        container,
        "--network",
        network,
        "--env",
        `BUN_SVN_USER=${APACHE_USER}`,
        "--env",
        `BUN_SVN_PASSWORD=${APACHE_PASSWORD}`,
        "-p",
        `127.0.0.1:${port}:80`,
        "--mount",
        `type=bind,source=${repoParent},target=/repos`,
        "--mount",
        `type=bind,source=${authzPath},target=/etc/apache2/svn.authz,readonly`,
        image,
      ]);
      running = true;
      await waitFor(
        async () => {
          try {
            await svn(configDir, server.credentials, ["info", `${server.url}/trunk`]);
            return true;
          } catch {
            return false;
          }
        },
        "isolated Apache mod_dav_svn container",
        30_000,
      );
    },
    async stop() {
      if (running) {
        await docker(["stop", "--time", "5", container], { allowFailure: true });
        await waitFor(
          async () => {
            const result = await docker(["inspect", container], { allowFailure: true });
            return result.code !== 0;
          },
          "DAV container removal",
          10_000,
        );
        running = false;
      }
      if (networkCreated) {
        await docker(["network", "rm", network], { allowFailure: true });
        const result = await docker(["network", "inspect", network], { allowFailure: true });
        if (result.code === 0) throw new Error("Disposable DAV network remains after cleanup");
        networkCreated = false;
      }
    },
    async isStopped() {
      const daemon = await docker(["info", "--format", "{{.Name}}"], { allowFailure: true });
      if (daemon.code !== 0)
        throw new Error("Docker daemon unavailable during cleanup verification");
      const containerState = await docker(["inspect", container], { allowFailure: true });
      const networkState = await docker(["network", "inspect", network], { allowFailure: true });
      return containerState.code !== 0 && networkState.code !== 0;
    },
    async restart() {
      await docker(["restart", "--time", "5", container]);
      await waitFor(
        async () => {
          try {
            await svn(configDir, server.credentials, ["info", `${server.url}/trunk`]);
            return true;
          } catch {
            return false;
          }
        },
        "restarted Apache mod_dav_svn container",
        30_000,
      );
    },
  };
  return server;
}

class BlockedError extends Error {}

async function createTcpBreakProxy(upstreamPort, byteLimit = 256 * 1024) {
  const proxy = createServer((client) => {
    const upstream = connect(upstreamPort, "127.0.0.1");
    let remaining = byteLimit;
    let tripped = false;
    client.on("data", (chunk) => {
      if (!upstream.destroyed) upstream.write(chunk);
    });
    upstream.on("data", (chunk) => {
      if (tripped) return;
      if (chunk.length >= remaining) {
        if (remaining > 0) client.write(chunk.subarray(0, remaining));
        tripped = true;
        upstream.destroy();
        client.destroy();
        return;
      }
      remaining -= chunk.length;
      client.write(chunk);
    });
    client.on("error", () => upstream.destroy());
    upstream.on("error", () => client.destroy());
    client.on("close", () => upstream.destroy());
    upstream.on("close", () => client.destroy());
  });
  await new Promise((resolvePromise, reject) => {
    proxy.once("error", reject);
    proxy.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = proxy.address();
  if (!address || typeof address === "string")
    throw new Error("Could not start interruption proxy");
  return {
    port: address.port,
    close: () => new Promise((resolvePromise) => proxy.close(resolvePromise)),
  };
}

async function youngest(repoPath) {
  const result = await command("svnlook", ["youngest", repoPath]);
  return Number(result.stdout.trim());
}

async function digestFile(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

async function digestCommand(program, args) {
  return new Promise((resolvePromise, reject) => {
    const hash = createHash("sha256");
    const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => hash.update(chunk));
    child.stderr.resume();
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolvePromise(hash.digest("hex"));
      else reject(new CommandError(program, code));
    });
  });
}

function authzText(repoName, writable) {
  return `[${repoName}:/]\n${APACHE_USER} = ${writable ? "rw" : "r"}\n* =\n`;
}

async function prepareRepository(parent, repoName, configDir) {
  const repoPath = join(parent, repoName);
  const seed = join(parent, "seed");
  const trunk = join(seed, "trunk");
  await mkdir(trunk, { recursive: true });
  await writeFile(join(trunk, "README.txt"), "fixture start\nsecond line\n");
  await writeFile(join(trunk, "lockable.txt"), "lock fixture\n");
  await command("svnadmin", ["create", repoPath]);
  await command("svn", [
    "--non-interactive",
    "--config-dir",
    configDir,
    "--no-auth-cache",
    "import",
    seed,
    pathToFileURL(repoPath).href,
    "--message",
    "isolated fixture seed",
  ]);
  return repoPath;
}

async function runTransport(transport, root, serverFactory, options = {}) {
  for (const scenario of SCENARIOS) row(transport, scenario);
  const configDir = join(root, "svn-config");
  const repoParent = join(root, "repos");
  const repoName = options.repoName ?? "fixture";
  const authzPath = join(root, "svn.authz");
  const configPath = join(root, "svnserve.conf");
  const passwordPath = join(root, "svnserve.passwd");
  await mkdir(configDir, { recursive: true });
  await mkdir(repoParent, { recursive: true });
  await writeFile(
    join(configDir, "config"),
    "[auth]\nstore-auth-creds = no\nstore-passwords = no\n",
  );
  await writeFile(authzPath, authzText(repoName, true));
  await writeFile(passwordPath, `[users]\n${APACHE_USER} = ${APACHE_PASSWORD}\n`);
  const writeSvnserveConfig = (writable) =>
    writeFile(
      configPath,
      `[general]\nanon-access = none\nauth-access = ${writable ? "write" : "read"}\npassword-db = ${passwordPath}\nauthz-db = ${authzPath}\nrealm = bun-svn-local-fixture\n`,
    );
  await writeSvnserveConfig(true);
  const repoPath = await prepareRepository(repoParent, repoName, configDir);
  const server = await serverFactory(repoParent, repoName, authzPath, configDir);
  const credentials = server.credentials;
  const baseUrl = server.url;
  const invoke = (args, commandOptions) => svn(configDir, credentials, args, commandOptions);
  const statusTransport = transport;
  const wc = join(root, "working-copy");
  let observer;
  let authzMode = "rw";
  let blockedTransport = false;

  try {
    await server.start();
    await step(statusTransport, "info", async () => {
      const result = await invoke(["info", `${baseUrl}/trunk`]);
      if (!result.stdout.includes("URL:")) throw new Error("svn info returned no URL");
    });
    await step(statusTransport, "checkout", async () => {
      await invoke(["checkout", `${baseUrl}/trunk`, wc]);
    });
    await step(statusTransport, "update", async () => {
      await invoke(["update", wc]);
    });
    await step(statusTransport, "log", async () => {
      const result = await invoke(["log", "--revision", "HEAD", `${baseUrl}/trunk`]);
      if (!result.stdout.includes("isolated fixture seed"))
        throw new Error("svn log did not include the seeded revision");
    });
    await step(statusTransport, "diff", async () => {
      const readme = join(wc, "README.txt");
      await writeFile(readme, `${await readFile(readme, "utf8")}transport diff marker\n`);
      const result = await invoke(["diff", readme]);
      if (!result.stdout.includes("transport diff marker"))
        throw new Error("svn diff did not show the working-copy change");
    });
    await step(statusTransport, "blame", async () => {
      const result = await invoke(["blame", `${baseUrl}/trunk/README.txt`]);
      if (!result.stdout.includes("fixture start"))
        throw new Error("svn blame did not return fixture content");
    });
    await step(statusTransport, "commit", async () => {
      const before = await youngest(repoPath);
      await invoke(["commit", "--message", "transport fixture commit", wc]);
      if ((await youngest(repoPath)) !== before + 1)
        throw new Error("commit did not advance the server-side revision");
    });
    await step(statusTransport, "copy", async () => {
      await invoke(["copy", join(wc, "README.txt"), join(wc, "copied.txt")]);
      await invoke(["commit", "--message", "transport copy operation", wc]);
      const result = await invoke(["info", `${baseUrl}/trunk/copied.txt`]);
      if (!result.stdout.includes("URL:"))
        throw new Error("copied path is absent from the repository");
    });
    await step(statusTransport, "move", async () => {
      await invoke(["move", join(wc, "copied.txt"), join(wc, "moved.txt")]);
      await invoke(["commit", "--message", "transport move operation", wc]);
      const result = await invoke(["info", `${baseUrl}/trunk/moved.txt`]);
      if (!result.stdout.includes("URL:"))
        throw new Error("moved path is absent from the repository");
    });
    await step(statusTransport, "properties", async () => {
      const moved = join(wc, "moved.txt");
      await invoke(["propset", "fixture-experiment", "fixture-property", moved]);
      await invoke(["commit", "--message", "transport property operation", wc]);
      const result = await invoke(["propget", "fixture-experiment", `${baseUrl}/trunk/moved.txt`]);
      if (result.stdout.trim() !== "fixture-property")
        throw new Error("server-side property value did not round-trip");
    });
    await step(statusTransport, "lock/unlock", async () => {
      const target = `${baseUrl}/trunk/lockable.txt`;
      await invoke(["lock", "--message", "isolated transport lock", target]);
      const locks = await command("svnadmin", ["lslocks", repoPath]);
      if (!locks.stdout.includes("/trunk/lockable.txt"))
        throw new Error("server-side lock was not present");
      await invoke(["unlock", target]);
      const after = await command("svnadmin", ["lslocks", repoPath]);
      if (after.stdout.includes("/trunk/lockable.txt"))
        throw new Error("server-side lock remained after unlock");
    });
    await step(statusTransport, "revision and file-hash verification", async () => {
      const path = join(wc, "README.txt");
      const localHash = await digestFile(path);
      const current = await youngest(repoPath);
      const storedHash = await digestCommand("svnlook", [
        "cat",
        "--revision",
        String(current),
        repoPath,
        "trunk/README.txt",
      ]);
      if (localHash !== storedHash)
        throw new Error("working-copy and server-side file hashes differ");
      const log = await invoke(["log", "--revision", "HEAD", baseUrl]);
      const remoteHead = Number(log.stdout.match(/\br(\d+)\s+\|/)?.[1]);
      if (remoteHead !== current)
        throw new Error("remote HEAD does not match server-side youngest revision");
    });

    await step(statusTransport, "denied write", async () => {
      authzMode = "r";
      await writeFile(authzPath, authzText(repoName, false));
      await writeSvnserveConfig(false);
      await server.restart();
      const before = await youngest(repoPath);
      const readme = join(wc, "README.txt");
      await writeFile(readme, `${await readFile(readme, "utf8")}denied-write marker\n`);
      const attempt = await invoke(["commit", "--message", "must be denied", wc], {
        allowFailure: true,
      });
      if (attempt.code === 0)
        throw new Error("read-only authorization unexpectedly accepted a commit");
      if ((await youngest(repoPath)) !== before)
        throw new Error("denied commit changed the server-side revision");
      await invoke(["revert", readme]);
      authzMode = "rw";
      await writeFile(authzPath, authzText(repoName, true));
      await writeSvnserveConfig(true);
      await server.restart();
    });
    await step(statusTransport, "hook rejection", async () => {
      const before = await youngest(repoPath);
      const hook = join(repoPath, "hooks", "pre-commit");
      await writeFile(hook, "#!/bin/sh\nexit 1\n");
      await chmod(hook, 0o755);
      const readme = join(wc, "README.txt");
      await writeFile(readme, `${await readFile(readme, "utf8")}hook-rejection marker\n`);
      const attempt = await invoke(["commit", "--message", "must be rejected by hook", wc], {
        allowFailure: true,
      });
      await rm(hook, { force: true });
      if (attempt.code === 0) throw new Error("pre-commit hook unexpectedly accepted the commit");
      if ((await youngest(repoPath)) !== before)
        throw new Error("hook-rejected commit changed the server-side revision");
      await invoke(["revert", readme]);
    });
    await step(statusTransport, "interruption and reconnect", async () => {
      observer = join(root, "observer-copy");
      await invoke(["checkout", `${baseUrl}/trunk`, observer]);
      const payload = randomBytes(bigFixtureBytes);
      const payloadHash = createHash("sha256").update(payload).digest("hex");
      const payloadPath = join(wc, "interrupt.bin");
      await writeFile(payloadPath, payload);
      await invoke(["add", payloadPath]);
      const before = await youngest(repoPath);
      await invoke(["commit", "--message", "large interruption fixture", wc]);
      const after = await youngest(repoPath);
      if (after !== before + 1)
        throw new Error("large fixture commit did not advance the repository revision");
      const proxy = await createTcpBreakProxy(server.port);
      try {
        const proxyUrl = new URL(baseUrl);
        proxyUrl.port = String(proxy.port);
        await invoke(["relocate", baseUrl, proxyUrl.toString().replace(/\/$/, ""), observer]);
        const interrupted = await invoke(["update", observer], { allowFailure: true });
        if (interrupted.code === 0)
          throw new Error("connection interruption did not make the in-flight update fail");
        await invoke(["relocate", proxyUrl.toString().replace(/\/$/, ""), baseUrl, observer]);
      } finally {
        await proxy.close();
      }
      await invoke(["cleanup", observer]);
      await invoke(["update", observer]);
      const localHash = await digestFile(join(observer, "interrupt.bin"));
      const storedHash = await digestCommand("svnlook", [
        "cat",
        "--revision",
        String(after),
        repoPath,
        "trunk/interrupt.bin",
      ]);
      if (localHash !== payloadHash || storedHash !== payloadHash)
        throw new Error("reconnected file content failed SHA-256 verification");
    });
  } catch (error) {
    blockedTransport = error instanceof BlockedError;
    let alreadyFailed = rows.some(
      (entry) => entry.transport === statusTransport && entry.status === "FAIL",
    );
    for (const result of rows.filter(
      (entry) => entry.transport === statusTransport && entry.status === "NOT_RUN",
    )) {
      if (blockedTransport) {
        result.status = "BLOCKED";
        result.detail = error.message;
      } else {
        result.status = alreadyFailed ? "NOT_RUN" : "FAIL";
        result.detail = `Not reached after ${error instanceof Error ? error.message : String(error)}`;
        alreadyFailed = true;
      }
    }
    throw error;
  } finally {
    if (authzMode !== "rw") {
      await writeFile(authzPath, authzText(repoName, true)).catch(() => {});
      await writeSvnserveConfig(true).catch(() => {});
    }
    const cleanup = rows.find(
      (entry) => entry.transport === statusTransport && entry.scenario === "process/lock cleanup",
    );
    try {
      await server.stop();
    } catch (error) {
      if (!blockedTransport) {
        cleanup.status = "FAIL";
        cleanup.detail =
          "Native server process or disposable container could not be stopped cleanly.";
      }
      throw error;
    }
    if (!blockedTransport) {
      try {
        const remainingLocks = await command("svnadmin", ["lslocks", repoPath]);
        cleanup.status =
          (await server.isStopped()) && !remainingLocks.stdout.includes("/trunk/lockable.txt")
            ? "PASS"
            : "FAIL";
      } catch {
        cleanup.status = "FAIL";
      }
      cleanup.detail =
        cleanup.status === "PASS"
          ? "Native server process/container and internal network stopped; no repository lock remains."
          : "Native server, internal network, or a repository lock remained after cleanup verification.";
      if (cleanup.status === "FAIL") throw new Error(cleanup.detail);
    }
  }
}

function reportMarkdown() {
  const bunRevision = typeof Bun.revision === "string" ? Bun.revision : "unavailable";
  const output = [
    "# Bun SVN transport experiment run",
    "",
    `- Bun version: ${Bun.version}`,
    `- Bun revision: ${bunRevision}`,
    `- Expected Bun: ${EXPECTED_BUN_VERSION} (${EXPECTED_BUN_REVISION})`,
    `- Generated: ${new Date().toISOString()}`,
    "- No raw command output, credentials, or SSH key material is written to this report.",
    "",
    "| Transport | Scenario | Status | Detail |",
    "| --- | --- | --- | --- |",
  ];
  for (const entry of rows) {
    output.push(
      `| ${entry.transport} | ${entry.scenario} | ${entry.status} | ${entry.detail.replaceAll("|", "\\|")} |`,
    );
  }
  output.push(
    "",
    "A protocol-scenario `PASS` means the native client completed against the named native service. It is not evidence of a Bun SVN server implementation.",
    "",
  );
  return output.join("\n");
}

function addNotRunTransport(transport, reason, status = "BLOCKED") {
  for (const scenario of SCENARIOS) {
    const existing = rows.find(
      (entry) => entry.transport === transport && entry.scenario === scenario,
    );
    if (!existing) row(transport, scenario, status, reason);
    else if (existing.status === "NOT_RUN") {
      existing.status = status;
      existing.detail = reason;
    }
  }
}

async function main() {
  addNotRunTransport(
    "Bun-owned HTTP/DAV handler",
    "No Bun inbound handler is implemented or invoked by this harness.",
  );
  addNotRunTransport(
    "Bun-owned svn:// server",
    "No Bun svn:// server is implemented or invoked by this harness.",
  );
  const bunRevision = typeof Bun.revision === "string" ? Bun.revision : "";
  const bunMatches = Bun.version === EXPECTED_BUN_VERSION && bunRevision === EXPECTED_BUN_REVISION;
  for (const tool of ["svn", "svnadmin", "svnlook"]) {
    if (!(await executable(tool))) {
      const reason = `Required native executable is missing: ${tool}`;
      addNotRunTransport("svn:// via native svnserve", reason);
      addNotRunTransport("HTTP/DAV via Apache mod_dav_svn", reason);
      addNotRunTransport(
        "svn+ssh://",
        "BLOCKED/deferred: no inbound SSH transport is implemented or tested.",
      );
      return;
    }
  }
  if (!bunMatches) {
    const reason = `Runtime mismatch: expected Bun ${EXPECTED_BUN_VERSION} revision ${EXPECTED_BUN_REVISION}; found ${Bun.version} revision ${bunRevision || "unavailable"}.`;
    addNotRunTransport("svn:// via native svnserve", reason);
    addNotRunTransport("HTTP/DAV via Apache mod_dav_svn", reason);
    addNotRunTransport(
      "svn+ssh://",
      "BLOCKED/deferred: no inbound SSH transport is implemented or tested.",
    );
    return;
  }

  const svnVersion = await command("svn", ["--version", "--quiet"]);
  row("environment", "native svn client", "PASS", `svn ${svnVersion.stdout.trim()}`);
  const base = join(tempRoot, "svnserve");
  await mkdir(base, { recursive: true });
  const credentials = { username: APACHE_USER, password: APACHE_PASSWORD };
  const svnserve = (repoParent, repoName, _authzPath, configDir) =>
    svnserveServer(repoParent, repoName, join(base, "svnserve.conf"), configDir, credentials);
  if (!(await executable("svnserve"))) {
    addNotRunTransport(
      "svn:// via native svnserve",
      "BLOCKED: native svnserve executable is unavailable.",
    );
  } else {
    await runTransport("svn:// via native svnserve", base, svnserve);
  }

  if (process.env.BUN_SVN_ENABLE_DAV !== "1") {
    addNotRunTransport(
      "HTTP/DAV via Apache mod_dav_svn",
      "NOT_RUN: opt in with BUN_SVN_ENABLE_DAV=1 and provide a local DAV image in an isolated Docker context.",
      "NOT_RUN",
    );
  } else if (!(await executable("docker"))) {
    addNotRunTransport("HTTP/DAV via Apache mod_dav_svn", "BLOCKED: Docker CLI is unavailable.");
  } else if (
    !process.env.BUN_SVN_DOCKER_CONTEXT ||
    process.env.BUN_SVN_DOCKER_CONTEXT === "default"
  ) {
    addNotRunTransport(
      "HTTP/DAV via Apache mod_dav_svn",
      "BLOCKED: set BUN_SVN_DOCKER_CONTEXT to a dedicated non-default disposable context.",
    );
  } else if (!process.env.BUN_SVN_DAV_IMAGE) {
    addNotRunTransport(
      "HTTP/DAV via Apache mod_dav_svn",
      "BLOCKED: set BUN_SVN_DAV_IMAGE to an already-local Apache mod_dav_svn image matching the documented mount/auth contract.",
    );
  } else {
    const davRoot = join(tempRoot, "dav");
    await mkdir(davRoot, { recursive: true });
    try {
      await runTransport(
        "HTTP/DAV via Apache mod_dav_svn",
        davRoot,
        (repoParent, repoName, authzPath, configDir) =>
          dockerServer(repoParent, repoName, authzPath, configDir),
      );
    } catch (error) {
      if (error instanceof BlockedError) {
        addNotRunTransport("HTTP/DAV via Apache mod_dav_svn", `BLOCKED: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  addNotRunTransport(
    "svn+ssh://",
    "BLOCKED/deferred: no inbound SSH server/tunnel/client-key integration is implemented or tested; reconsider only after Bun issues #11947 and #4290 are resolved and separately authorized.",
  );
}

let topLevelFailure;
try {
  await main();
} catch (error) {
  topLevelFailure = error;
  if (rows.length === 0) {
    row(
      "harness",
      "run",
      error instanceof BlockedError ? "BLOCKED" : "FAIL",
      error instanceof Error ? error.message : String(error),
    );
  } else {
    const active = rows.find((entry) => entry.status === "RUNNING");
    if (active) {
      active.status = error instanceof BlockedError ? "BLOCKED" : "FAIL";
      active.detail = error instanceof Error ? error.message : String(error);
    } else {
      row(
        "harness",
        "run",
        error instanceof BlockedError ? "BLOCKED" : "FAIL",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  if (!rows.some((entry) => entry.transport === "svn:// via native svnserve")) {
    addNotRunTransport(
      "svn:// via native svnserve",
      "NOT_RUN: earlier harness failure prevented this transport scenario.",
      "NOT_RUN",
    );
  }
  if (!rows.some((entry) => entry.transport === "HTTP/DAV via Apache mod_dav_svn")) {
    addNotRunTransport(
      "HTTP/DAV via Apache mod_dav_svn",
      "NOT_RUN: earlier harness failure prevented this transport scenario.",
      "NOT_RUN",
    );
  }
  for (const entry of rows.filter((result) => result.status === "NOT_RUN" && !result.detail)) {
    entry.detail = `Not reached after harness failure: ${error instanceof Error ? error.message : String(error)}`;
  }
  addNotRunTransport(
    "svn+ssh://",
    "BLOCKED/deferred: no SSH transport was attempted or implemented in this scope.",
  );
} finally {
  const requestedEvidence = process.env.BUN_SVN_EVIDENCE_DIR;
  const evidenceDir = requestedEvidence
    ? resolve(requestedEvidence)
    : await mkdtemp(join(tmpdir(), "bun-svn-evidence-"));
  await mkdir(evidenceDir, { recursive: true });
  await rm(tempRoot, { recursive: true, force: true });
  const evidenceFile = join(
    evidenceDir,
    `report-${new Date().toISOString().replaceAll(":", "-")}.md`,
  );
  await writeFile(evidenceFile, reportMarkdown());
  console.log(`Evidence: ${evidenceFile}`);
  for (const entry of rows)
    console.log(
      `${entry.status.padEnd(7)} ${entry.transport} — ${entry.scenario}${entry.detail ? `: ${entry.detail}` : ""}`,
    );
  if (topLevelFailure) process.exitCode = 1;
}
