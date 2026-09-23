import { Buffer } from "node:buffer";
import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface GitActor {
  username: string;
  password: string;
  read: boolean;
  write: boolean;
}

export interface GitHttpMetrics {
  backendStarted: number;
  backendReaped: number;
  activeBackends: number;
  activePipes: number;
  readDenied: number;
  writeDenied: number;
  disconnected: number;
  timedOut: number;
  gitProtocolV2Seen: boolean;
  gitProtocolV2LsRefsSeen: boolean;
}

export interface GitHttpServer {
  origin: string;
  metrics: GitHttpMetrics;
  stop(): Promise<void>;
}
type GitBackendProcess = Bun.Subprocess<"pipe", "pipe", "pipe">;

const MAX_RPC_BYTES = 64 * 1024 * 1024;
const MAX_CGI_OUTPUT_BYTES = 96 * 1024 * 1024;

export async function resolveGitHttpBackend(): Promise<string | undefined> {
  const git = Bun.which("git");
  if (!git) return undefined;
  const result = Bun.spawnSync([git, "--exec-path"], { stdout: "pipe", stderr: "ignore" });
  if (result.exitCode !== 0) return undefined;
  const path = join(result.stdout.toString().trim(), "git-http-backend");
  try {
    await access(path, fsConstants.X_OK);
    return path;
  } catch {
    return undefined;
  }
}

export function createGitHttpServer(options: {
  backendPath: string;
  repoRoot: string;
  actors: readonly GitActor[];
  backendTimeoutMs?: number;
}): GitHttpServer {
  const repoRoot = resolve(options.repoRoot);
  const actors = new Map(options.actors.map((actor) => [actor.username, actor]));
  const metrics: GitHttpMetrics = {
    backendStarted: 0,
    backendReaped: 0,
    activeBackends: 0,
    activePipes: 0,
    readDenied: 0,
    writeDenied: 0,
    disconnected: 0,
    timedOut: 0,
    gitProtocolV2Seen: false,
    gitProtocolV2LsRefsSeen: false,
  };
  const activeChildren = new Set<GitBackendProcess>();

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      if (request.method !== "GET" && request.method !== "POST") {
        return new Response(null, { status: 405, headers: { allow: "GET, POST" } });
      }

      const match =
        /^\/([A-Za-z0-9_-][A-Za-z0-9._-]*)\/([A-Za-z0-9_-][A-Za-z0-9._-]*)\.git\/([A-Za-z0-9._/-]+)$/.exec(
          url.pathname,
        );
      if (!match || match[3].split("/").some((part) => part === "." || part === "..")) {
        return new Response("Not found", { status: 404 });
      }
      const [, owner, project, gitPath] = match;
      const service = gitPath === "info/refs" ? url.searchParams.get("service") : null;
      if (
        gitPath === "info/refs" &&
        service !== "git-upload-pack" &&
        service !== "git-receive-pack"
      ) {
        return new Response("Unsupported service", { status: 403 });
      }
      const needsWrite = gitPath === "git-receive-pack" || service === "git-receive-pack";
      const authorization = request.headers.get("authorization") ?? "";
      const credentials = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(authorization)?.[1];
      let actor: GitActor | undefined;
      if (credentials) {
        try {
          const decoded = Buffer.from(credentials, "base64").toString("utf8");
          const separator = decoded.indexOf(":");
          if (separator >= 0) {
            const candidate = actors.get(decoded.slice(0, separator));
            if (candidate && candidate.password === decoded.slice(separator + 1)) actor = candidate;
          }
        } catch {
          actor = undefined;
        }
      }
      if (!actor) {
        return new Response("Authentication required", {
          status: 401,
          headers: { "www-authenticate": 'Basic realm="Git experiment"' },
        });
      }
      if (needsWrite ? !actor.write : !actor.read) {
        if (needsWrite) metrics.writeDenied += 1;
        else metrics.readDenied += 1;
        return new Response("Forbidden", { status: 403 });
      }

      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (Number.isFinite(contentLength) && contentLength > MAX_RPC_BYTES) {
        return new Response("Request entity too large", { status: 413 });
      }
      let body: Buffer;
      try {
        const bytes = Buffer.from(await request.arrayBuffer());
        if (bytes.byteLength > MAX_RPC_BYTES)
          return new Response("Request entity too large", { status: 413 });
        body = bytes;
      } catch {
        return new Response(null, { status: 499 });
      }

      const gitProtocol = request.headers.get("git-protocol");
      if (gitProtocol === "version=2") metrics.gitProtocolV2Seen = true;
      if (
        request.method === "POST" &&
        gitPath === "git-upload-pack" &&
        body.includes("command=ls-refs\n")
      ) {
        metrics.gitProtocolV2LsRefsSeen = true;
      }
      const repoPath = join(repoRoot, owner, `${project}.git`);
      const pathInfo = `/${owner}/${project}.git/${gitPath}`;
      return runBackend({
        backendPath: options.backendPath,
        repoRoot,
        repoPath,
        pathInfo,
        method: request.method,
        query: url.search.slice(1),
        contentType: request.headers.get("content-type") ?? "",
        gitProtocol,
        username: actor.username,
        body,
        signal: request.signal,
        timeoutMs: options.backendTimeoutMs ?? 10_000,
        metrics,
        activeChildren,
        serverPort: server.port,
      });
    },
  });

  return {
    origin: `http://127.0.0.1:${server.port}`,
    metrics,
    async stop() {
      await server.stop(true);
      const children = [...activeChildren];
      for (const child of children) killProcessGroup(child);
      await Promise.all(children.map((child) => child.exited));
      while (metrics.activeBackends > 0) await Bun.sleep(1);
    },
  };
}

async function runBackend(input: {
  backendPath: string;
  repoRoot: string;
  repoPath: string;
  pathInfo: string;
  method: string;
  query: string;
  contentType: string;
  gitProtocol: string | null;
  username: string;
  body: Buffer;
  signal: AbortSignal;
  timeoutMs: number;
  metrics: GitHttpMetrics;
  activeChildren: Set<GitBackendProcess>;
  serverPort: number;
}): Promise<Response> {
  try {
    await access(input.repoPath, fsConstants.R_OK);
  } catch {
    return new Response("Repository not found", { status: 404 });
  }
  if (input.signal.aborted) return new Response(null, { status: 499 });

  const env: Record<string, string> = {
    CONTENT_TYPE: input.contentType,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_HTTP_EXPORT_ALL: "1",
    GIT_PROJECT_ROOT: input.repoRoot,
    HOME: input.repoRoot,
    LANG: "C",
    PATH: Bun.env.PATH ?? "/usr/bin:/bin",
    PATH_INFO: input.pathInfo,
    QUERY_STRING: input.query,
    REMOTE_ADDR: "127.0.0.1",
    REMOTE_USER: input.username,
    REQUEST_METHOD: input.method,
    SERVER_NAME: "127.0.0.1",
    SERVER_PORT: String(input.serverPort),
    SERVER_PROTOCOL: "HTTP/1.1",
    GIT_TERMINAL_PROMPT: "0",
  };
  if (input.method === "POST") env.CONTENT_LENGTH = String(input.body.byteLength);
  if (input.gitProtocol) {
    env.HTTP_GIT_PROTOCOL = input.gitProtocol;
    env.GIT_PROTOCOL = input.gitProtocol;
  }

  let child: GitBackendProcess;
  try {
    child = Bun.spawn([input.backendPath], {
      cwd: input.repoRoot,
      env,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      detached: process.platform !== "win32",
    });
  } catch {
    return new Response("Git HTTP backend unavailable", { status: 503 });
  }
  input.activeChildren.add(child);

  input.metrics.backendStarted += 1;
  input.metrics.activeBackends += 1;
  input.metrics.activePipes += 3;
  let outputTooLarge = false;
  const stdoutPromise = readLimited(child.stdout, MAX_CGI_OUTPUT_BYTES).catch(() => {
    outputTooLarge = true;
    killProcessGroup(child);
    return Buffer.alloc(0);
  });
  const stderrPromise = drain(child.stderr).catch(() => undefined);
  const stdinPromise = Promise.resolve()
    .then(() => {
      if (input.body.byteLength) child.stdin.write(input.body);
      child.stdin.end();
    })
    .catch(() => undefined);

  let resolveDisconnect!: () => void;
  const disconnected = new Promise<"disconnect">((resolvePromise) => {
    resolveDisconnect = () => resolvePromise("disconnect");
  });
  const onAbort = () => resolveDisconnect();
  input.signal.addEventListener("abort", onAbort, { once: true });
  if (input.signal.aborted) resolveDisconnect();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolvePromise) => {
    timeoutHandle = setTimeout(() => resolvePromise("timeout"), input.timeoutMs);
  });
  const exited = child.exited.then((exitCode) => ({ kind: "exit" as const, exitCode }));

  let outcome: "disconnect" | "timeout" | { kind: "exit"; exitCode: number };
  try {
    outcome = await Promise.race([exited, disconnected, timeout]);
    if (outcome !== "disconnect" && outcome !== "timeout") {
      clearTimeout(timeoutHandle);
      timeoutHandle = undefined;
    } else {
      if (outcome === "disconnect") input.metrics.disconnected += 1;
      else input.metrics.timedOut += 1;
      killProcessGroup(child);
      await child.exited;
    }
    const [stdout] = await Promise.all([stdoutPromise, stderrPromise, stdinPromise]);
    if (outcome === "disconnect") return new Response(null, { status: 499 });
    if (outcome === "timeout") return new Response("Git backend timed out", { status: 504 });
    if (outcome.exitCode !== 0 || outputTooLarge)
      return new Response("Git HTTP backend failed", { status: 502 });
    return cgiResponse(stdout);
  } catch {
    killProcessGroup(child);
    await child.exited;
    return new Response("Git HTTP backend failed", { status: 502 });
  } finally {
    clearTimeout(timeoutHandle);
    input.signal.removeEventListener("abort", onAbort);
    await child.exited;
    input.activeChildren.delete(child);
    input.metrics.backendReaped += 1;
    input.metrics.activeBackends -= 1;
    input.metrics.activePipes -= 3;
  }
}

function killProcessGroup(child: GitBackendProcess): void {
  try {
    if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
    else child.kill("SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // The child may have exited between the group kill and fallback.
    }
  }
}

async function readLimited(stream: ReadableStream<Uint8Array>, maxBytes: number): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("CGI output limit");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<void> {
  const reader = stream.getReader();
  try {
    while (!(await reader.read()).done) {
      // Drain CGI stderr without retaining or exposing hook output.
    }
  } finally {
    reader.releaseLock();
  }
}

function cgiResponse(output: Buffer): Response {
  const crlf = output.indexOf("\r\n\r\n");
  const lf = output.indexOf("\n\n");
  const split = crlf >= 0 ? crlf : lf;
  if (split < 0) return new Response("Invalid Git backend response", { status: 502 });
  const separatorLength = crlf >= 0 ? 4 : 2;
  const rawHeaders = output.subarray(0, split).toString("utf8");
  const body = output.subarray(split + separatorLength);
  let status = 200;
  const headers = new Headers();
  for (const line of rawHeaders.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (name.toLowerCase() === "status") {
      const parsed = Number(value.split(/\s+/, 1)[0]);
      if (Number.isInteger(parsed) && parsed >= 200 && parsed <= 599) status = parsed;
    } else if (!/^(connection|transfer-encoding)$/i.test(name)) {
      try {
        headers.append(name, value);
      } catch {
        // Ignore malformed CGI headers; the body remains binary and untouched.
      }
    }
  }
  return new Response(body, { status, headers });
}
