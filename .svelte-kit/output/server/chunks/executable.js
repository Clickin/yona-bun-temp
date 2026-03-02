import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve, sep, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
function getYonaDataRoot() {
  return resolve(process.env.YONA_DATA ?? join(process.cwd(), ".yona-data"));
}
function getRepositoryRoot() {
  return join(getYonaDataRoot(), "repo");
}
function getGitAuditLogPath() {
  return join(getYonaDataRoot(), "logs", "git-mutations.log");
}
async function ensureYonaDataDirectories() {
  await mkdir(getRepositoryRoot(), { recursive: true });
  await mkdir(join(getYonaDataRoot(), "logs"), { recursive: true });
}
class GitCommandError extends Error {
  command;
  cwd;
  exitCode;
  stdout;
  stderr;
  constructor(params) {
    super(
      `Git command failed (${params.exitCode}): ${params.command.join(" ")}
${params.stderr || params.stdout}`,
    );
    this.name = "GitCommandError";
    this.command = params.command;
    this.cwd = params.cwd;
    this.exitCode = params.exitCode;
    this.stdout = params.stdout;
    this.stderr = params.stderr;
  }
}
const DEFAULT_TIMEOUT_MS = 3e4;
const ALLOWED_ENV_KEYS = [
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "SSH_AUTH_SOCK",
  "GIT_SSH_COMMAND",
  "GIT_TERMINAL_PROMPT",
];
function buildSafeEnv(overrides = {}) {
  const env = {};
  for (const key of ALLOWED_ENV_KEYS) {
    const value = process.env[key];
    if (value) {
      env[key] = value;
    }
  }
  return { ...env, ...overrides };
}
function trimNewline(value) {
  return value.trimEnd();
}
function normalizeRelativeFilePath(filePath) {
  if (!filePath || filePath.startsWith("/") || filePath.includes("\\")) {
    throw new Error(`Invalid file path: ${filePath}`);
  }
  const parts = filePath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`Invalid file path: ${filePath}`);
  }
  return filePath;
}
function resolveRepositoryPath(repoRoot, repoId) {
  if (!/^[A-Za-z0-9._-]+$/.test(repoId)) {
    throw new Error(`Invalid repository id: ${repoId}`);
  }
  const rootPath = resolve(repoRoot);
  const candidate = resolve(rootPath, repoId);
  const requiredPrefix = `${rootPath}${sep}`;
  if (candidate !== rootPath && !candidate.startsWith(requiredPrefix)) {
    throw new Error(`Repository path escapes root: ${candidate}`);
  }
  return candidate;
}
async function runGit(command, options) {
  const allowedExitCodes = options.allowedExitCodes ?? [0];
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const childCommand = ["git", ...command];
  const result = await new Promise((resolveResult, rejectResult) => {
    const child = spawn(childCommand[0], childCommand.slice(1), {
      cwd: options.cwd,
      env: buildSafeEnv(options.env),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      rejectResult(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolveResult({
        command: childCommand,
        cwd: options.cwd,
        exitCode: exitCode ?? -1,
        stdout,
        stderr,
      });
    });
    if (options.stdin !== void 0) {
      const body = typeof options.stdin === "string" ? options.stdin : Buffer.from(options.stdin);
      child.stdin.write(body);
    }
    child.stdin.end();
  });
  if (!allowedExitCodes.includes(result.exitCode)) {
    throw new GitCommandError(result);
  }
  return result;
}
async function initBareRepository(repoPath) {
  await runGit(["init", "--bare", repoPath], {
    cwd: dirname(repoPath),
  });
}
async function getRefOid(repoPath, refName = "HEAD") {
  const result = await runGit(["rev-parse", refName], {
    cwd: repoPath,
  });
  return trimNewline(result.stdout);
}
async function readFileAtRef(repoPath, refName, filePath) {
  const normalizedPath = normalizeRelativeFilePath(filePath);
  const spec = `${refName}:${normalizedPath}`;
  const result = await runGit(["show", spec], {
    cwd: repoPath,
  });
  return result.stdout;
}
async function createInlineEditCommit(input) {
  const normalizedPath = normalizeRelativeFilePath(input.filePath);
  const refName = `refs/heads/${input.branch}`;
  const oldOid = input.expectedOldOid ?? (await getRefOid(input.repoPath, refName));
  const tempDir = await mkdtemp(`${tmpdir()}${sep}yona-git-index-`);
  const indexPath = `${tempDir}${sep}index`;
  const mutationEnv = {
    GIT_INDEX_FILE: indexPath,
    GIT_AUTHOR_NAME: input.authorName,
    GIT_AUTHOR_EMAIL: input.authorEmail,
    GIT_COMMITTER_NAME: input.committerName ?? input.authorName,
    GIT_COMMITTER_EMAIL: input.committerEmail ?? input.authorEmail,
  };
  try {
    await runGit(["read-tree", oldOid], {
      cwd: input.repoPath,
      env: mutationEnv,
    });
    const blobResult = await runGit(["hash-object", "-w", "--stdin"], {
      cwd: input.repoPath,
      env: mutationEnv,
      stdin: input.content,
    });
    const blobOid = trimNewline(blobResult.stdout);
    await runGit(["update-index", "--add", "--cacheinfo", "100644", blobOid, normalizedPath], {
      cwd: input.repoPath,
      env: mutationEnv,
    });
    const treeResult = await runGit(["write-tree"], {
      cwd: input.repoPath,
      env: mutationEnv,
    });
    const treeOid = trimNewline(treeResult.stdout);
    const commitResult = await runGit(["commit-tree", treeOid, "-p", oldOid, "-m", input.message], {
      cwd: input.repoPath,
      env: mutationEnv,
    });
    const newOid = trimNewline(commitResult.stdout);
    await runGit(["update-ref", refName, newOid, oldOid], {
      cwd: input.repoPath,
    });
    return {
      refName,
      oldOid,
      newOid,
      treeOid,
      blobOid,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
export {
  GitCommandError as G,
  runGit as a,
  getRefOid as b,
  readFileAtRef as c,
  getGitAuditLogPath as d,
  ensureYonaDataDirectories as e,
  createInlineEditCommit as f,
  getRepositoryRoot as g,
  initBareRepository as i,
  resolveRepositoryPath as r,
};
