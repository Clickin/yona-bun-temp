import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { GitCommandError } from "./errors";
import type {
  GitRunOptions,
  GitRunResult,
  InlineEditCommitInput,
  InlineEditCommitResult,
} from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;
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
] as const;

function buildSafeEnv(overrides: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};

  for (const key of ALLOWED_ENV_KEYS) {
    const value = process.env[key];
    if (value) {
      env[key] = value;
    }
  }

  return { ...env, ...overrides };
}

function trimNewline(value: string): string {
  return value.trimEnd();
}

function normalizeRelativeFilePath(filePath: string): string {
  if (!filePath || filePath.startsWith("/") || filePath.includes("\\")) {
    throw new Error(`Invalid file path: ${filePath}`);
  }

  const parts = filePath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`Invalid file path: ${filePath}`);
  }

  return filePath;
}

export function resolveRepositoryPath(repoRoot: string, repoId: string): string {
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

export async function runGit(command: string[], options: GitRunOptions): Promise<GitRunResult> {
  const allowedExitCodes = options.allowedExitCodes ?? [0];
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const childCommand = ["git", ...command];

  const result = await new Promise<GitRunResult>((resolveResult, rejectResult) => {
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

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
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

    if (options.stdin !== undefined) {
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

export async function initBareRepository(repoPath: string): Promise<void> {
  await runGit(["init", "--bare", repoPath], {
    cwd: dirname(repoPath),
  });
}

export async function cloneRepository(
  url: string,
  destinationPath: string,
  bare = false,
): Promise<void> {
  const args = bare ? ["clone", "--bare", url, destinationPath] : ["clone", url, destinationPath];

  await runGit(args, {
    cwd: dirname(destinationPath),
  });
}

export async function fetchRepository(repoPath: string, remote = "origin"): Promise<void> {
  await runGit(["fetch", remote], {
    cwd: repoPath,
  });
}

export async function getRefOid(repoPath: string, refName = "HEAD"): Promise<string> {
  const result = await runGit(["rev-parse", refName], {
    cwd: repoPath,
  });

  return trimNewline(result.stdout);
}

export async function getRepositoryStatus(repoPath: string): Promise<string> {
  const result = await runGit(["status", "--porcelain=v1", "--branch"], {
    cwd: repoPath,
  });

  return trimNewline(result.stdout);
}

export async function readFileAtRef(
  repoPath: string,
  refName: string,
  filePath: string,
): Promise<string> {
  const normalizedPath = normalizeRelativeFilePath(filePath);
  const spec = `${refName}:${normalizedPath}`;

  const result = await runGit(["show", spec], {
    cwd: repoPath,
  });

  return result.stdout;
}

export async function createInlineEditCommit(
  input: InlineEditCommitInput,
): Promise<InlineEditCommitResult> {
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
