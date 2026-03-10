import { createReadStream } from "node:fs";
import { access, mkdtemp, open, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { Writable } from "node:stream";
import { ensureYonaDataDirectories, getRepositoryRoot } from "./config";
import { resolveRepositoryPath } from "./executable";

const HEADER_BODY_DELIMITER_CRLF = Buffer.from("\r\n\r\n", "utf-8");
const HEADER_BODY_DELIMITER_LF = Buffer.from("\n\n", "utf-8");
export const MAX_SMART_HTTP_RPC_BYTES = 100 * 1024 * 1024;

export interface GitCgiOutput {
  status: number;
  headers: Headers;
  body: Uint8Array;
}

export interface GitHttpBackendEnvInput {
  actorName?: string;
  contentLength?: number;
  repoRoot: string;
  pathInfo: string;
  request: Request;
  remoteAddress: string;
}

export interface SmartHttpAuthorizationContext {
  allowWrite: boolean;
  remoteAddress: string;
  remoteUserName?: string;
}

export class SmartHttpPayloadTooLargeError extends Error {
  constructor(limitBytes: number) {
    super(`Smart HTTP request body exceeds ${limitBytes} bytes.`);
  }
}

export interface SmartHttpRequestBodySource {
  cleanup(): Promise<void>;
  contentLength: number;
  pipeTo(writable: Writable): Promise<void>;
}

function readAnnouncedContentLength(request: Request): null | number {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return null;
  }

  const parsedLength = Number.parseInt(contentLength, 10);
  return Number.isFinite(parsedLength) && parsedLength >= 0 ? parsedLength : null;
}

function endWritable(writable: Writable): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleError = (error: Error) => {
      writable.off("finish", handleFinish);
      reject(error);
    };
    const handleFinish = () => {
      writable.off("error", handleError);
      resolve();
    };

    writable.once("error", handleError);
    writable.once("finish", handleFinish);
    writable.end();
  });
}

async function writeAllToFile(
  handle: Awaited<ReturnType<typeof open>>,
  chunk: Uint8Array,
): Promise<void> {
  let offset = 0;

  while (offset < chunk.byteLength) {
    const { bytesWritten } = await handle.write(chunk, offset, chunk.byteLength - offset);
    offset += bytesWritten;
  }
}

export async function createSmartHttpRequestBodySource(
  request: Request,
): Promise<SmartHttpRequestBodySource> {
  if (request.method.toUpperCase() === "GET" || !request.body) {
    return {
      cleanup: async () => {},
      contentLength: 0,
      pipeTo: (writable) => endWritable(writable),
    };
  }

  const announcedContentLength = readAnnouncedContentLength(request);
  if (announcedContentLength !== null && announcedContentLength > MAX_SMART_HTTP_RPC_BYTES) {
    throw new SmartHttpPayloadTooLargeError(MAX_SMART_HTTP_RPC_BYTES);
  }

  const tempDir = await mkdtemp(join(tmpdir(), "yona-git-http-"));
  const bodyPath = join(tempDir, "request-body");
  let contentLength = 0;

  try {
    const handle = await open(bodyPath, "w");

    try {
      const reader = request.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          contentLength += value.byteLength;
          if (contentLength > MAX_SMART_HTTP_RPC_BYTES) {
            throw new SmartHttpPayloadTooLargeError(MAX_SMART_HTTP_RPC_BYTES);
          }

          await writeAllToFile(handle, value);
        }
      } finally {
        reader.releaseLock();
      }
    } finally {
      await handle.close();
    }

    return {
      cleanup: async () => {
        await rm(tempDir, { force: true, recursive: true });
      },
      contentLength,
      pipeTo: async (writable) => {
        if (contentLength === 0) {
          await endWritable(writable);
          return;
        }

        await pipeline(createReadStream(bodyPath), writable);
      },
    };
  } catch (error) {
    await rm(tempDir, { force: true, recursive: true });
    throw error;
  }
}

function findDelimiterIndex(buffer: Buffer, delimiter: Buffer): number {
  for (let index = 0; index <= buffer.length - delimiter.length; index += 1) {
    let matched = true;
    for (let offset = 0; offset < delimiter.length; offset += 1) {
      if (buffer[index + offset] !== delimiter[offset]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return index;
    }
  }

  return -1;
}

export function parseGitHttpBackendOutput(buffer: Buffer): GitCgiOutput {
  let delimiterIndex = findDelimiterIndex(buffer, HEADER_BODY_DELIMITER_CRLF);
  let delimiterSize = HEADER_BODY_DELIMITER_CRLF.length;

  if (delimiterIndex < 0) {
    delimiterIndex = findDelimiterIndex(buffer, HEADER_BODY_DELIMITER_LF);
    delimiterSize = HEADER_BODY_DELIMITER_LF.length;
  }

  if (delimiterIndex < 0) {
    throw new Error("Invalid git-http-backend CGI output: missing header/body delimiter");
  }

  const headerText = buffer.subarray(0, delimiterIndex).toString("utf-8");
  const body = buffer.subarray(delimiterIndex + delimiterSize);
  const headers = new Headers();
  let status = 200;

  for (const rawLine of headerText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (key.toLowerCase() === "status") {
      const code = Number.parseInt(value.split(" ")[0] ?? "", 10);
      if (Number.isFinite(code)) {
        status = code;
      }
      continue;
    }

    headers.set(key, value);
  }

  return {
    status,
    headers,
    body: new Uint8Array(body),
  };
}

async function runGitHttpBackendCgi(params: {
  authorization: SmartHttpAuthorizationContext;
  repositoryId: string;
  pathInfo: string;
  request: Request;
}): Promise<GitCgiOutput> {
  await ensureYonaDataDirectories();

  const repoRoot = getRepositoryRoot();
  const repoPath = resolveRepositoryPath(repoRoot, params.repositoryId);
  await access(repoPath);
  const requestBodySource = await createSmartHttpRequestBodySource(params.request);

  try {
    const env = buildGitHttpBackendEnv({
      actorName: params.authorization.remoteUserName,
      contentLength: requestBodySource.contentLength,
      pathInfo: params.pathInfo,
      request: params.request,
      remoteAddress: params.authorization.remoteAddress,
      repoRoot,
    });

    const child = spawn("git", ["http-backend"], {
      cwd: repoRoot,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(Buffer.from(chunk));
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(Buffer.from(chunk));
    });

    let inputError: null | unknown = null;
    const inputPromise = requestBodySource.pipeTo(child.stdin).catch((error: unknown) => {
      inputError = error;
    });

    const exitCode = await new Promise<number>((resolveExit, rejectExit) => {
      child.on("error", rejectExit);
      child.on("close", (code) => resolveExit(code ?? -1));
    });

    await inputPromise;

    if (exitCode !== 0) {
      throw new Error(
        `git http-backend failed (${exitCode}): ${Buffer.concat(stderrChunks).toString("utf-8")}`,
      );
    }

    if (inputError) {
      throw inputError;
    }

    return parseGitHttpBackendOutput(Buffer.concat(stdoutChunks));
  } finally {
    await requestBodySource.cleanup();
  }
}

export function requiresReceivePackAuth(request: Request, pathInfo: string): boolean {
  if (pathInfo.endsWith("/git-receive-pack")) {
    return true;
  }

  const url = new URL(request.url);
  const service = url.searchParams.get("service");
  return service === "git-receive-pack";
}

export function buildGitHttpBackendEnv(input: GitHttpBackendEnvInput): Record<string, string> {
  const requestUrl = new URL(input.request.url);
  const query = requestUrl.search.length > 0 ? requestUrl.search.slice(1) : "";

  const env: Record<string, string> = {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    GIT_PROJECT_ROOT: input.repoRoot,
    PATH_INFO: input.pathInfo,
    REQUEST_METHOD: input.request.method.toUpperCase(),
    QUERY_STRING: query,
    CONTENT_TYPE: input.request.headers.get("content-type") ?? "",
    REMOTE_ADDR: input.remoteAddress,
    GIT_HTTP_EXPORT_ALL: "1",
    GIT_TERMINAL_PROMPT: "0",
  };

  const gitProtocol = input.request.headers.get("git-protocol");
  if (gitProtocol) {
    env.HTTP_GIT_PROTOCOL = gitProtocol;
    env.GIT_PROTOCOL = gitProtocol;
  }

  if (input.actorName) {
    env.REMOTE_USER = input.actorName;
  }

  if (input.request.method.toUpperCase() !== "GET") {
    env.CONTENT_LENGTH = String(input.contentLength ?? 0);
  }

  return env;
}

export async function handleSmartHttpRequest(params: {
  authorization: SmartHttpAuthorizationContext;
  repositoryId: string;
  pathInfo: string;
  request: Request;
}): Promise<Response> {
  if (
    requiresReceivePackAuth(params.request, params.pathInfo) &&
    !params.authorization.allowWrite
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const cgiOutput = await runGitHttpBackendCgi(params);
    const binaryBody = Buffer.from(cgiOutput.body);
    return new Response(binaryBody, {
      status: cgiOutput.status,
      headers: cgiOutput.headers,
    });
  } catch (error) {
    if (error instanceof SmartHttpPayloadTooLargeError) {
      return new Response("Request Entity Too Large", { status: 413 });
    }

    const message = error instanceof Error ? error.message : "Unknown smart-http error";
    if (
      message.includes("Invalid repository id") ||
      message.includes("Repository path escapes root")
    ) {
      return new Response(message, { status: 400 });
    }

    if (message.includes("ENOENT") || message.includes("not found")) {
      return new Response("Repository not found", { status: 404 });
    }

    return new Response(message, { status: 500 });
  }
}
