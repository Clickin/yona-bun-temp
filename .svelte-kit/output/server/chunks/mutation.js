import { randomUUID } from "node:crypto";
import { mkdir, appendFile, stat, rm, rename, access } from "node:fs/promises";
import { dirname } from "node:path";
import {
  b as getRefOid,
  c as readFileAtRef,
  d as getGitAuditLogPath,
  f as createInlineEditCommit,
  G as GitCommandError,
} from "./executable.js";
function getAuditMaxBytes() {
  const parsed = Number.parseInt(process.env.YONA_GIT_AUDIT_MAX_BYTES ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 5 * 1024 * 1024;
}
function getAuditMaxFiles() {
  const parsed = Number.parseInt(process.env.YONA_GIT_AUDIT_MAX_FILES ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= 2) {
    return parsed;
  }
  return 3;
}
async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function rotateAuditIfNeeded(filePath, incomingLength) {
  if (!(await pathExists(filePath))) {
    return;
  }
  const maxBytes = getAuditMaxBytes();
  const maxFiles = getAuditMaxFiles();
  const fileStats = await stat(filePath);
  if (fileStats.size + incomingLength <= maxBytes) {
    return;
  }
  for (let index = maxFiles - 1; index >= 1; index -= 1) {
    const fromPath = index === 1 ? filePath : `${filePath}.${index - 1}`;
    const toPath = `${filePath}.${index}`;
    if (!(await pathExists(fromPath))) {
      continue;
    }
    await rm(toPath, { force: true });
    await rename(fromPath, toPath);
  }
}
async function appendGitMutationAuditLog(filePath, record) {
  const entry = `${JSON.stringify(record)}
`;
  await mkdir(dirname(filePath), { recursive: true });
  await rotateAuditIfNeeded(filePath, Buffer.byteLength(entry, "utf-8"));
  await appendFile(filePath, entry, "utf-8");
}
const repositoryWriteTails = /* @__PURE__ */ new Map();
async function withRepositoryWriteLock(repositoryPath, action) {
  const previousTail = repositoryWriteTails.get(repositoryPath) ?? Promise.resolve();
  let releaseCurrent;
  const currentDone = new Promise((resolve) => {
    releaseCurrent = resolve;
  });
  const currentTail = previousTail.then(() => currentDone);
  repositoryWriteTails.set(repositoryPath, currentTail);
  await previousTail;
  try {
    return await action();
  } finally {
    releaseCurrent();
    if (repositoryWriteTails.get(repositoryPath) === currentTail) {
      repositoryWriteTails.delete(repositoryPath);
    }
  }
}
const DEFAULT_PROTECTED_BRANCHES = ["main", "master"];
const DEFAULT_PROTECTED_BRANCH_WRITE_ROLES = ["admin", "maintainer"];
const DEFAULT_UNPROTECTED_BRANCH_WRITE_ROLES = ["admin", "maintainer", "developer"];
function parseList(value) {
  if (!value) {
    return [...DEFAULT_PROTECTED_BRANCHES];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
function getProtectedBranches() {
  return new Set(parseList(process.env.YONA_PROTECTED_BRANCHES));
}
function getProtectedBranchWriteRoles() {
  return new Set(
    parseList(
      process.env.YONA_PROTECTED_BRANCH_WRITE_ROLES ??
        DEFAULT_PROTECTED_BRANCH_WRITE_ROLES.join(","),
    ),
  );
}
function getUnprotectedBranchWriteRoles() {
  return new Set(
    parseList(
      process.env.YONA_UNPROTECTED_BRANCH_WRITE_ROLES ??
        DEFAULT_UNPROTECTED_BRANCH_WRITE_ROLES.join(","),
    ),
  );
}
function isProtectedBranch(branch) {
  return getProtectedBranches().has(branch);
}
function canDirectWriteBranch(branch, actor) {
  if (actor.canAdmin || actor.canDirectWrite) {
    return true;
  }
  if (isProtectedBranch(branch)) {
    return getProtectedBranchWriteRoles().has(actor.role);
  }
  return getUnprotectedBranchWriteRoles().has(actor.role);
}
class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthorizationError";
  }
}
class ConflictError extends Error {
  expectedOid;
  actualOid;
  constructor(expectedOid, actualOid) {
    super(`Reference moved (expected ${expectedOid}, actual ${actualOid})`);
    this.name = "ConflictError";
    this.expectedOid = expectedOid;
    this.actualOid = actualOid;
  }
}
async function readRepositoryFile(params) {
  const refName = `refs/heads/${params.branch}`;
  const oid = await getRefOid(params.repoPath, refName);
  const content = await readFileAtRef(params.repoPath, refName, params.filePath);
  return { content, oid };
}
function isUpdateRefConflict(error) {
  if (!(error instanceof GitCommandError)) {
    return false;
  }
  const commandText = error.command.join(" ");
  if (!commandText.includes(" update-ref ")) {
    return false;
  }
  const stderr = error.stderr.toLowerCase();
  return stderr.includes("cannot lock ref") || stderr.includes("failed to update ref");
}
async function performInlineEditMutation(input) {
  if (!canDirectWriteBranch(input.branch, input.actor)) {
    throw new AuthorizationError(`Direct write denied for protected branch: ${input.branch}`);
  }
  const requestId = input.requestId ?? randomUUID();
  const refName = `refs/heads/${input.branch}`;
  return withRepositoryWriteLock(input.repoPath, async () => {
    const headOid = await getRefOid(input.repoPath, refName);
    if (input.baseOid && input.baseOid !== headOid) {
      await appendGitMutationAuditLog(getGitAuditLogPath(), {
        timestamp: /* @__PURE__ */ new Date().toISOString(),
        requestId,
        action: "inline-edit-conflict",
        repositoryId: input.repositoryId,
        branch: input.branch,
        filePath: input.filePath,
        actorId: input.actor.id,
        actorName: input.actor.name,
        actorEmail: input.actor.email,
        actorIp: input.actor.ipAddress,
        oldOid: input.baseOid,
        message: input.message,
      });
      throw new ConflictError(input.baseOid, headOid);
    }
    try {
      const commit = await createInlineEditCommit({
        repoPath: input.repoPath,
        branch: input.branch,
        filePath: input.filePath,
        content: input.content,
        message: input.message,
        authorName: input.actor.name,
        authorEmail: input.actor.email,
        committerName: input.actor.name,
        committerEmail: input.actor.email,
        expectedOldOid: input.baseOid ?? headOid,
      });
      await appendGitMutationAuditLog(getGitAuditLogPath(), {
        timestamp: /* @__PURE__ */ new Date().toISOString(),
        requestId,
        action: "inline-edit-commit",
        repositoryId: input.repositoryId,
        branch: input.branch,
        filePath: input.filePath,
        actorId: input.actor.id,
        actorName: input.actor.name,
        actorEmail: input.actor.email,
        actorIp: input.actor.ipAddress,
        oldOid: commit.oldOid,
        newOid: commit.newOid,
        message: input.message,
      });
      return { requestId, commit };
    } catch (error) {
      if (isUpdateRefConflict(error)) {
        const actualOid = await getRefOid(input.repoPath, refName);
        throw new ConflictError(input.baseOid ?? headOid, actualOid);
      }
      throw error;
    }
  });
}
export {
  AuthorizationError as A,
  ConflictError as C,
  performInlineEditMutation as p,
  readRepositoryFile as r,
};
