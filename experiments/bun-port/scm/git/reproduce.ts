import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createGitHttpServer,
  resolveGitHttpBackend,
  type GitActor,
  type GitHttpServer,
} from "./server.ts";

const EXPECTED_BUN_REVISION = "744846f844374847c902b5e7fd59b4342a51ef99";
interface GitCommandChild {
  child: Bun.Subprocess<"ignore", "pipe", "ignore">;
  exited: Promise<number>;
  stdout: Promise<string>;
}
const activeGitChildren = new Set<Bun.Subprocess<"ignore", "pipe", "ignore">>();
const activeGitOutputs = new Set<Promise<string>>();

const summary = {
  experiment: "bun-git-smart-http-inbound",
  bunVersion: Bun.version,
  bunRevision: "NOT_CHECKED",
  gitVersion: "NOT_CHECKED",
  http: {
    status: "NOT_RUN",
    blockers: [] as string[],
    scenarios: {
      writerPushAndBinaryClone: "NOT_RUN",
      gitProtocolV2Preserved: "NOT_RUN",
      readerWriteDenied: "NOT_RUN",
      outsiderReadDenied: "NOT_RUN",
      preReceiveHookRejected: "NOT_RUN",
      disconnectCancelled: "NOT_RUN",
      timeoutCancelled: "NOT_RUN",
    } as Record<string, string>,
    cleanup: {
      childrenReaped: "NOT_RUN",
      pipesClosed: "NOT_RUN",
      gitClientsReaped: "NOT_RUN",
      gitClientPipesClosed: "NOT_RUN",
      serverStopped: "NOT_RUN",
      temporaryFixtureRemoved: "NOT_RUN",
    } as Record<string, string>,
    metrics: undefined as Record<string, number | boolean> | undefined,
    failure: undefined as string | undefined,
  },
  ssh: {
    status: "BLOCKED",
    deferred: true,
    reason:
      "Inbound Git-over-SSH is deferred per scope; no SSH server or SSH dependency is included.",
    blockers: ["Bun issues #11947 and #4290 remain unresolved for the required inbound path."],
  },
};

const actors: GitActor[] = [
  { username: "writer", password: randomBytes(24).toString("base64url"), read: true, write: true },
  { username: "reader", password: randomBytes(24).toString("base64url"), read: true, write: false },
  {
    username: "outsider",
    password: randomBytes(24).toString("base64url"),
    read: false,
    write: false,
  },
];

let gitPath: string | undefined;
let backendPath: string | undefined;
let fixtureRoot: string | undefined;
let server: GitHttpServer | undefined;
let activeScenarios: string[] = [];
if (process.platform !== "darwin" && process.platform !== "linux") {
  summary.http.blockers.push("Disconnect and process-group checks require macOS or Linux.");
}

const gitLookup = Bun.which("git");
summary.bunRevision = Bun.revision;
if (Bun.version !== "1.4.2" || !summary.bunRevision.includes(EXPECTED_BUN_REVISION)) {
  summary.http.blockers.push(`Requires Bun 1.4.2 revision ${EXPECTED_BUN_REVISION}.`);
}
if (!gitLookup) {
  summary.http.blockers.push("Native git executable is unavailable on PATH.");
  summary.http.blockers.push(
    'On macOS, run `brew install git`, then `PATH="$(brew --prefix git)/bin:$PATH" bun run experiments/bun-port/scm/git/reproduce.ts`.',
  );
}
if (gitLookup) {
  const version = Bun.spawnSync([gitLookup, "--version"], { stdout: "pipe", stderr: "ignore" });
  if (version.exitCode === 0) summary.gitVersion = version.stdout.toString().trim();
  backendPath = await resolveGitHttpBackend();
  if (!backendPath) {
    summary.http.blockers.push("git-http-backend is unavailable from `git --exec-path`.");
    summary.http.blockers.push(
      'On macOS, install Git with `brew install git`, then run `PATH="$(brew --prefix git)/bin:$PATH" bun run experiments/bun-port/scm/git/reproduce.ts`.',
    );
  }
}

if (summary.http.blockers.length > 0) {
  summary.http.status = "BLOCKED";
} else {
  try {
    gitPath = gitLookup!;
    fixtureRoot = await mkdtemp(join(tmpdir(), "bun-git-smart-http-"));
    const repoRoot = join(fixtureRoot, "repositories");
    const bareRepo = join(repoRoot, "owner", "project.git");
    const seedWork = join(fixtureRoot, "seed-work");
    const readerWork = join(fixtureRoot, "reader-work");
    const hookPath = join(bareRepo, "hooks", "pre-receive");
    await mkdir(join(repoRoot, "owner"), { recursive: true });
    server = createGitHttpServer({
      backendPath: backendPath!,
      repoRoot,
      actors,
      backendTimeoutMs: 1_500,
    });
    const origin = `${server.origin}/owner/project.git`;
    const payload = randomBytes(128 * 1024);

    let command = await runGit(["init", "--bare", bareRepo], fixtureRoot);
    if (command.exitCode !== 0) throw new Error("fixture setup failed");
    command = await runGit(
      ["--git-dir", bareRepo, "symbolic-ref", "HEAD", "refs/heads/main"],
      fixtureRoot,
    );
    if (command.exitCode !== 0) throw new Error("fixture setup failed");
    command = await runGit(["init", seedWork], fixtureRoot);
    if (command.exitCode !== 0) throw new Error("fixture setup failed");
    await writeFile(join(seedWork, "binary.dat"), payload);
    command = await runGit(["add", "binary.dat"], seedWork);
    if (command.exitCode !== 0) throw new Error("fixture setup failed");
    command = await runGit(
      [
        "-c",
        "user.name=Experiment Writer",
        "-c",
        "user.email=writer@example.invalid",
        "commit",
        "-m",
        "seed binary pack",
      ],
      seedWork,
    );
    if (command.exitCode !== 0) throw new Error("fixture setup failed");
    command = await runGit(["branch", "-M", "main"], seedWork);
    if (command.exitCode !== 0) throw new Error("fixture setup failed");
    command = await runGit(["remote", "add", "origin", origin], seedWork);
    if (command.exitCode !== 0) throw new Error("fixture setup failed");
    activeScenarios = ["writerPushAndBinaryClone"];
    summary.http.scenarios.writerPushAndBinaryClone = "RUNNING";
    command = await runGit(["push", "origin", "main"], seedWork, origin, actors[0]);
    if (command.exitCode !== 0) throw new Error("writer push failed");

    activeScenarios = ["writerPushAndBinaryClone", "gitProtocolV2Preserved"];
    summary.http.scenarios.gitProtocolV2Preserved = "RUNNING";
    command = await runGit(
      ["-c", "protocol.version=2", "clone", origin, readerWork],
      fixtureRoot,
      origin,
      actors[1],
    );
    if (command.exitCode !== 0) throw new Error("binary clone failed");
    const clonedPayload = await readFile(join(readerWork, "binary.dat"));
    if (!clonedPayload.equals(payload)) throw new Error("binary clone mismatch");
    summary.http.scenarios.writerPushAndBinaryClone = "PASS";
    if (!server.metrics.gitProtocolV2Seen || !server.metrics.gitProtocolV2LsRefsSeen) {
      throw new Error("Git protocol v2 metadata was not preserved");
    }
    summary.http.scenarios.gitProtocolV2Preserved = "PASS";
    activeScenarios = [];

    const mainBeforeDenial = await gitRef(bareRepo, "refs/heads/main", fixtureRoot);
    activeScenarios = ["readerWriteDenied"];
    summary.http.scenarios.readerWriteDenied = "RUNNING";
    await writeFile(join(readerWork, "reader-write-denied.txt"), "not allowed\n");
    command = await runGit(["add", "reader-write-denied.txt"], readerWork);
    if (command.exitCode !== 0) throw new Error("reader fixture commit failed");
    command = await runGit(
      [
        "-c",
        "user.name=Read Only",
        "-c",
        "user.email=reader@example.invalid",
        "commit",
        "-m",
        "attempt forbidden write",
      ],
      readerWork,
    );
    if (command.exitCode !== 0) throw new Error("reader fixture commit failed");
    const deniedWritesBefore = server.metrics.writeDenied;
    command = await runGit(["push", "origin", "main"], readerWork, origin, actors[1]);
    const mainAfterDenial = await gitRef(bareRepo, "refs/heads/main", fixtureRoot);
    if (
      command.exitCode === 0 ||
      server.metrics.writeDenied !== deniedWritesBefore + 1 ||
      mainAfterDenial !== mainBeforeDenial
    ) {
      throw new Error("read-only write denial failed");
    }
    summary.http.scenarios.readerWriteDenied = "PASS";
    activeScenarios = [];

    const deniedReadsBefore = server.metrics.readDenied;
    activeScenarios = ["outsiderReadDenied"];
    summary.http.scenarios.outsiderReadDenied = "RUNNING";
    command = await runGit(
      ["-c", "protocol.version=2", "ls-remote", origin],
      fixtureRoot,
      origin,
      actors[2],
    );
    if (command.exitCode === 0 || server.metrics.readDenied !== deniedReadsBefore + 1)
      throw new Error("read denial failed");
    summary.http.scenarios.outsiderReadDenied = "PASS";
    activeScenarios = [];

    const hookMarker = `${hookPath}.ran`;
    const quotedHookMarker = `'${hookMarker.replaceAll("'", "'\\''")}'`;
    activeScenarios = ["preReceiveHookRejected"];
    summary.http.scenarios.preReceiveHookRejected = "RUNNING";
    await writeFile(
      hookPath,
      `#!/bin/sh\nprintf ran > ${quotedHookMarker}\nprintf "rejected by experiment hook\\n" >&2\nexit 1\n`,
    );
    await chmod(hookPath, 0o755);
    await rm(hookMarker, { force: true });

    await writeFile(join(seedWork, "hook-rejected.txt"), "pre-receive hook test\n");
    command = await runGit(["add", "hook-rejected.txt"], seedWork);
    if (command.exitCode !== 0) throw new Error("hook fixture setup failed");
    command = await runGit(
      [
        "-c",
        "user.name=Experiment Writer",
        "-c",
        "user.email=writer@example.invalid",
        "commit",
        "-m",
        "exercise pre-receive rejection",
      ],
      seedWork,
    );
    if (command.exitCode !== 0) throw new Error("hook fixture setup failed");
    const mainBeforeHook = await gitRef(bareRepo, "refs/heads/main", fixtureRoot);
    command = await runGit(["push", "origin", "main"], seedWork, origin, actors[0]);
    const mainAfterHook = await gitRef(bareRepo, "refs/heads/main", fixtureRoot);
    if (
      command.exitCode === 0 ||
      !(await fileExists(hookMarker)) ||
      mainAfterHook !== mainBeforeHook
    ) {
      throw new Error("pre-receive hook rejection failed");
    }
    summary.http.scenarios.preReceiveHookRejected = "PASS";
    activeScenarios = [];

    await rm(hookMarker, { force: true });
    activeScenarios = ["disconnectCancelled"];
    summary.http.scenarios.disconnectCancelled = "RUNNING";
    await writeFile(hookPath, `#!/bin/sh\nprintf ran > ${quotedHookMarker}\nsleep 8\nexit 0\n`);
    await chmod(hookPath, 0o755);
    await writeFile(join(seedWork, "disconnect.txt"), "disconnect cancellation\n");
    command = await runGit(["add", "disconnect.txt"], seedWork);
    if (command.exitCode !== 0) throw new Error("disconnect fixture setup failed");
    command = await runGit(
      [
        "-c",
        "user.name=Experiment Writer",
        "-c",
        "user.email=writer@example.invalid",
        "commit",
        "-m",
        "exercise disconnect cancellation",
      ],
      seedWork,
    );
    if (command.exitCode !== 0) throw new Error("disconnect fixture setup failed");
    const disconnectCount = server.metrics.disconnected;
    const disconnectPush = startGit(["push", "origin", "main"], seedWork, origin, actors[0]);
    if (!(await waitForFile(hookMarker, 5_000))) throw new Error("disconnect hook did not start");
    killGit(disconnectPush.child);
    await disconnectPush.child.exited;
    await disconnectPush.stdout;
    const disconnectObserved = await waitUntil(
      () => server!.metrics.disconnected > disconnectCount && server!.metrics.activeBackends === 0,
      4_000,
    );
    const mainAfterDisconnect = await gitRef(bareRepo, "refs/heads/main", fixtureRoot);
    if (!disconnectObserved || mainAfterDisconnect !== mainBeforeHook)
      throw new Error("disconnect cancellation failed");
    summary.http.scenarios.disconnectCancelled = "PASS";
    activeScenarios = [];

    await rm(hookMarker, { force: true });
    activeScenarios = ["timeoutCancelled"];
    summary.http.scenarios.timeoutCancelled = "RUNNING";
    await writeFile(hookPath, `#!/bin/sh\nprintf ran > ${quotedHookMarker}\nsleep 8\nexit 0\n`);
    await chmod(hookPath, 0o755);
    await writeFile(join(seedWork, "timeout.txt"), "timeout cancellation\n");
    command = await runGit(["add", "timeout.txt"], seedWork);
    if (command.exitCode !== 0) throw new Error("timeout fixture setup failed");
    command = await runGit(
      [
        "-c",
        "user.name=Experiment Writer",
        "-c",
        "user.email=writer@example.invalid",
        "commit",
        "-m",
        "exercise timeout cancellation",
      ],
      seedWork,
    );
    if (command.exitCode !== 0) throw new Error("timeout fixture setup failed");
    const timeoutCount = server.metrics.timedOut;
    command = await runGit(["push", "origin", "main"], seedWork, origin, actors[0], 15_000);
    const timedOut = server.metrics.timedOut === timeoutCount + 1;
    const mainAfterTimeout = await gitRef(bareRepo, "refs/heads/main", fixtureRoot);
    if (command.exitCode === 0 || !timedOut || mainAfterTimeout !== mainBeforeHook)
      throw new Error("backend timeout cancellation failed");
    summary.http.scenarios.timeoutCancelled = "PASS";
    activeScenarios = [];

    if (
      server.metrics.backendStarted !== server.metrics.backendReaped ||
      server.metrics.activeBackends !== 0
    ) {
      throw new Error("backend process cleanup failed");
    }
    summary.http.cleanup.childrenReaped = "PASS";
    if (activeGitChildren.size !== 0 || activeGitOutputs.size !== 0)
      throw new Error("native Git client cleanup failed");
    summary.http.cleanup.gitClientsReaped = "PASS";
    summary.http.cleanup.gitClientPipesClosed = "PASS";

    if (server.metrics.activePipes !== 0) throw new Error("backend pipe cleanup failed");
    summary.http.cleanup.pipesClosed = "PASS";
    summary.http.metrics = {
      backendStarted: server.metrics.backendStarted,
      backendReaped: server.metrics.backendReaped,
      disconnected: server.metrics.disconnected,
      timedOut: server.metrics.timedOut,
      readDenied: server.metrics.readDenied,
      writeDenied: server.metrics.writeDenied,
      gitProtocolV2Seen: server.metrics.gitProtocolV2Seen,
      gitProtocolV2LsRefsSeen: server.metrics.gitProtocolV2LsRefsSeen,
      activeBackends: server.metrics.activeBackends,
      activePipes: server.metrics.activePipes,
    };
    summary.http.status = "PASS";
  } catch {
    for (const scenario of activeScenarios) summary.http.scenarios[scenario] = "FAIL";
    summary.http.status = "FAIL";
    summary.http.failure = "reproduction_or_assertion_failed";
  } finally {
    const clientChildren = [...activeGitChildren];
    for (const child of clientChildren) killGit(child);
    await Promise.allSettled(clientChildren.map((child) => child.exited));
    await Promise.allSettled(activeGitOutputs);
    summary.http.cleanup.gitClientsReaped = activeGitChildren.size === 0 ? "PASS" : "FAIL";
    summary.http.cleanup.gitClientPipesClosed = activeGitOutputs.size === 0 ? "PASS" : "FAIL";
    if (activeGitChildren.size !== 0 || activeGitOutputs.size !== 0) summary.http.status = "FAIL";
    if (server) {
      try {
        await server.stop();
        summary.http.cleanup.serverStopped = "PASS";
      } catch {
        summary.http.cleanup.serverStopped = "FAIL";
        summary.http.status = "FAIL";
      }
      summary.http.cleanup.childrenReaped =
        server.metrics.backendStarted === server.metrics.backendReaped &&
        server.metrics.activeBackends === 0
          ? "PASS"
          : "FAIL";
      summary.http.cleanup.pipesClosed = server.metrics.activePipes === 0 ? "PASS" : "FAIL";
      if (
        summary.http.cleanup.childrenReaped !== "PASS" ||
        summary.http.cleanup.pipesClosed !== "PASS"
      )
        summary.http.status = "FAIL";
    }
    if (fixtureRoot) {
      try {
        await rm(fixtureRoot, { recursive: true, force: true });
        await access(fixtureRoot, fsConstants.F_OK).then(
          () => {
            summary.http.cleanup.temporaryFixtureRemoved = "FAIL";
            summary.http.status = "FAIL";
          },
          () => {
            summary.http.cleanup.temporaryFixtureRemoved = "PASS";
          },
        );
      } catch {
        summary.http.cleanup.temporaryFixtureRemoved = "FAIL";
        summary.http.status = "FAIL";
      }
    }
  }
}

console.log(JSON.stringify(summary));
if (summary.http.status === "FAIL") process.exitCode = 1;

async function runGit(
  args: string[],
  cwd: string,
  origin?: string,
  actor?: GitActor,
  timeoutMs = 30_000,
): Promise<{ exitCode: number; output: string }> {
  const running = startGit(args, cwd, origin, actor);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    killGit(running.child);
  }, timeoutMs);
  const exitCode = await running.exited;
  clearTimeout(timer);
  const output = await running.stdout;
  return { exitCode: timedOut ? 124 : exitCode, output };
}

function startGit(args: string[], cwd: string, origin?: string, actor?: GitActor): GitCommandChild {
  const env: Record<string, string> = {
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    HOME: fixtureRoot ?? tmpdir(),
    LANG: "C",
    PATH: Bun.env.PATH ?? "/usr/bin:/bin",
  };
  if (origin && actor) {
    const auth = Buffer.from(`${actor.username}:${actor.password}`).toString("base64");
    env.GIT_CONFIG_COUNT = "1";
    env.GIT_CONFIG_KEY_0 = "http.extraheader";
    env.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${auth}`;
  }
  const child = Bun.spawn([gitPath!, ...args], {
    cwd,
    env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "ignore",
    detached: process.platform !== "win32",
  });
  activeGitChildren.add(child);
  const exited = child.exited.then((code) => {
    activeGitChildren.delete(child);
    return code;
  });
  const stdout = new Response(child.stdout).text();
  activeGitOutputs.add(stdout);
  void stdout.then(
    () => activeGitOutputs.delete(stdout),
    () => activeGitOutputs.delete(stdout),
  );
  return { child, exited, stdout };
}

async function gitRef(bareRepo: string, ref: string, cwd: string): Promise<string> {
  const command = await runGit(["--git-dir", bareRepo, "rev-parse", ref], cwd);
  if (command.exitCode !== 0) throw new Error("server-side ref verification failed");
  return command.output.trim();
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function waitForFile(path: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fileExists(path)) return true;
    await Bun.sleep(25);
  }
  return fileExists(path);
}

async function waitUntil(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await Bun.sleep(25);
  }
  return predicate();
}

function killGit(child: Bun.Subprocess<"ignore", "pipe", "ignore">): void {
  try {
    if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
    else child.kill("SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // The native client may have exited before cancellation was requested.
    }
  }
}
