import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { r as readMutationActor, g as getRemoteAddress } from "../../../../../../../chunks/auth.js";
import {
  e as ensureYonaDataDirectories,
  g as getRepositoryRoot,
  r as resolveRepositoryPath,
} from "../../../../../../../chunks/executable.js";
const HEADER_BODY_DELIMITER_CRLF = Buffer.from("\r\n\r\n", "utf-8");
const HEADER_BODY_DELIMITER_LF = Buffer.from("\n\n", "utf-8");
function findDelimiterIndex(buffer, delimiter) {
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
function parseGitHttpBackendOutput(buffer) {
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
async function runGitHttpBackendCgi(params) {
  await ensureYonaDataDirectories();
  const repoRoot = getRepositoryRoot();
  const repoPath = resolveRepositoryPath(repoRoot, params.repositoryId);
  await access(repoPath);
  const actor = readMutationActor(params.request.headers);
  const env = buildGitHttpBackendEnv({
    repoRoot,
    pathInfo: params.pathInfo,
    request: params.request,
    actorName: actor?.name,
    remoteAddr: getRemoteAddress(params.request.headers),
  });
  const child = spawn("git", ["http-backend"], {
    cwd: repoRoot,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const stdoutChunks = [];
  const stderrChunks = [];
  child.stdout.on("data", (chunk) => {
    stdoutChunks.push(Buffer.from(chunk));
  });
  child.stderr.on("data", (chunk) => {
    stderrChunks.push(Buffer.from(chunk));
  });
  if (params.request.method.toUpperCase() !== "GET") {
    const body = Buffer.from(await params.request.arrayBuffer());
    if (body.length > 0) {
      child.stdin.write(body);
    }
  }
  child.stdin.end();
  const exitCode = await new Promise((resolveExit, rejectExit) => {
    child.on("error", rejectExit);
    child.on("close", (code) => resolveExit(code ?? -1));
  });
  if (exitCode !== 0) {
    throw new Error(
      `git http-backend failed (${exitCode}): ${Buffer.concat(stderrChunks).toString("utf-8")}`,
    );
  }
  return parseGitHttpBackendOutput(Buffer.concat(stdoutChunks));
}
function requiresReceivePackAuth(request, pathInfo) {
  if (pathInfo.endsWith("/git-receive-pack")) {
    return true;
  }
  const url = new URL(request.url);
  const service = url.searchParams.get("service");
  return service === "git-receive-pack";
}
function buildGitHttpBackendEnv(input) {
  const requestUrl = new URL(input.request.url);
  const query = requestUrl.search.length > 0 ? requestUrl.search.slice(1) : "";
  const env = {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    GIT_PROJECT_ROOT: input.repoRoot,
    PATH_INFO: input.pathInfo,
    REQUEST_METHOD: input.request.method.toUpperCase(),
    QUERY_STRING: query,
    CONTENT_TYPE: input.request.headers.get("content-type") ?? "",
    REMOTE_ADDR: input.remoteAddr,
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
  return env;
}
async function handleSmartHttpRequest(params) {
  if (requiresReceivePackAuth(params.request, params.pathInfo)) {
    const actor = readMutationActor(params.request.headers);
    if (!actor || !actor.canDirectWrite) {
      return new Response("Forbidden", { status: 403 });
    }
  }
  try {
    const cgiOutput = await runGitHttpBackendCgi(params);
    const binaryBody = Buffer.from(cgiOutput.body);
    return new Response(binaryBody, {
      status: cgiOutput.status,
      headers: cgiOutput.headers,
    });
  } catch (error) {
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
function getPathInfo(repoId, gitPath) {
  const cleanedPath = gitPath.replace(/^\/+/, "");
  return `/${repoId}/${cleanedPath}`;
}
const GET = async ({ params, request }) => {
  const repoId = params.repoId;
  const gitPath = params.gitPath;
  if (!repoId || !gitPath) {
    return new Response("Not Found", { status: 404 });
  }
  return handleSmartHttpRequest({
    repositoryId: repoId,
    pathInfo: getPathInfo(repoId, gitPath),
    request,
  });
};
const POST = async ({ params, request }) => {
  const repoId = params.repoId;
  const gitPath = params.gitPath;
  if (!repoId || !gitPath) {
    return new Response("Not Found", { status: 404 });
  }
  return handleSmartHttpRequest({
    repositoryId: repoId,
    pathInfo: getPathInfo(repoId, gitPath),
    request,
  });
};
export { GET, POST };
