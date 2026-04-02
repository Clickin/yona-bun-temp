import { randomUUID } from "node:crypto";
import { appendPullRequestMergeAuditLog } from "./audit";
import type { MutationActor } from "./auth";
import { getGitAuditLogPath } from "./config";
import { getRefOid, runGit } from "./executable";
import { withRepositoryWriteLock } from "./locks";

export interface PullRequestMergePreviewInput {
  repoPath: string;
  sourceBranch: string;
  targetBranch: string;
}

export interface PullRequestMergePreviewResult {
  conflictedFiles: string[];
  mergeTreeOid: string;
  mergeable: boolean;
  sourceHeadOid: string;
  targetHeadOid: string;
}

export interface PullRequestMergeInput extends PullRequestMergePreviewInput {
  actor: MutationActor;
  message: string;
  repositoryId: string;
  requestId?: string;
}

export interface PullRequestMergeResult {
  conflicted: boolean;
  conflictedFiles: string[];
  mergeCommitOid: null | string;
  requestId: string;
  sourceHeadOid: string;
  targetHeadOid: string;
}

function toBranchRef(branch: string): string {
  return `refs/heads/${branch}`;
}

function parseMergeTreeOutput(stdout: string): { conflictedFiles: string[]; mergeTreeOid: string } {
  const parts = stdout
    .split("\0")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const mergeTreeOid = parts[0] ?? "";
  const conflictedFiles = parts.slice(1);

  if (!/^[a-f0-9]{40}$/i.test(mergeTreeOid)) {
    throw new Error("Failed to parse merge-tree output.");
  }

  return {
    conflictedFiles: [...new Set(conflictedFiles)],
    mergeTreeOid,
  };
}

async function previewMergeTree(
  input: PullRequestMergePreviewInput,
): Promise<PullRequestMergePreviewResult> {
  const targetHeadOid = await getRefOid(input.repoPath, toBranchRef(input.targetBranch));
  const sourceHeadOid = await getRefOid(input.repoPath, toBranchRef(input.sourceBranch));
  const result = await runGit(
    [
      "merge-tree",
      "--write-tree",
      "--name-only",
      "--no-messages",
      "-z",
      targetHeadOid,
      sourceHeadOid,
    ],
    {
      allowedExitCodes: [0, 1],
      cwd: input.repoPath,
    },
  );
  const parsed = parseMergeTreeOutput(result.stdout);

  return {
    conflictedFiles: parsed.conflictedFiles,
    mergeTreeOid: parsed.mergeTreeOid,
    mergeable: parsed.conflictedFiles.length === 0,
    sourceHeadOid,
    targetHeadOid,
  };
}

export async function previewPullRequestMerge(
  input: PullRequestMergePreviewInput,
): Promise<PullRequestMergePreviewResult> {
  return previewMergeTree(input);
}

export async function performPullRequestMerge(
  input: PullRequestMergeInput,
): Promise<PullRequestMergeResult> {
  const requestId = input.requestId ?? randomUUID();

  return withRepositoryWriteLock(input.repoPath, async () => {
    const preview = await previewMergeTree(input);
    if (!preview.mergeable) {
      await appendPullRequestMergeAuditLog(getGitAuditLogPath(), {
        action: "pull-request-merge-conflict",
        actorEmail: input.actor.email,
        actorId: input.actor.id,
        actorIp: input.actor.ipAddress,
        actorName: input.actor.name,
        conflictedFiles: preview.conflictedFiles,
        message: input.message,
        repositoryId: input.repositoryId,
        requestId,
        sourceBranch: input.sourceBranch,
        sourceHeadOid: preview.sourceHeadOid,
        targetBranch: input.targetBranch,
        targetHeadOid: preview.targetHeadOid,
        timestamp: new Date().toISOString(),
      });

      return {
        conflicted: true,
        conflictedFiles: preview.conflictedFiles,
        mergeCommitOid: null,
        requestId,
        sourceHeadOid: preview.sourceHeadOid,
        targetHeadOid: preview.targetHeadOid,
      };
    }

    const env = {
      GIT_AUTHOR_EMAIL: input.actor.email,
      GIT_AUTHOR_NAME: input.actor.name,
      GIT_COMMITTER_EMAIL: input.actor.email,
      GIT_COMMITTER_NAME: input.actor.name,
    };
    const commitResult = await runGit(
      [
        "commit-tree",
        preview.mergeTreeOid,
        "-p",
        preview.targetHeadOid,
        "-p",
        preview.sourceHeadOid,
        "-m",
        input.message,
      ],
      {
        cwd: input.repoPath,
        env,
      },
    );
    const mergeCommitOid = commitResult.stdout.trim();

    await runGit(
      ["update-ref", toBranchRef(input.targetBranch), mergeCommitOid, preview.targetHeadOid],
      {
        cwd: input.repoPath,
      },
    );

    await appendPullRequestMergeAuditLog(getGitAuditLogPath(), {
      action: "pull-request-merge",
      actorEmail: input.actor.email,
      actorId: input.actor.id,
      actorIp: input.actor.ipAddress,
      actorName: input.actor.name,
      mergeCommitOid,
      message: input.message,
      repositoryId: input.repositoryId,
      requestId,
      sourceBranch: input.sourceBranch,
      sourceHeadOid: preview.sourceHeadOid,
      targetBranch: input.targetBranch,
      targetHeadOid: preview.targetHeadOid,
      timestamp: new Date().toISOString(),
    });

    return {
      conflicted: false,
      conflictedFiles: [],
      mergeCommitOid,
      requestId,
      sourceHeadOid: preview.sourceHeadOid,
      targetHeadOid: preview.targetHeadOid,
    };
  });
}
