export interface GitRunOptions {
  cwd: string;
  env?: Record<string, string>;
  stdin?: string | Uint8Array;
  timeoutMs?: number;
  allowedExitCodes?: number[];
}

export interface GitRunResult {
  command: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface InlineEditCommitInput {
  repoPath: string;
  branch: string;
  filePath: string;
  content: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committerName?: string;
  committerEmail?: string;
  expectedOldOid?: string;
}

export interface InlineEditCommitResult {
  refName: string;
  oldOid: string;
  newOid: string;
  treeOid: string;
  blobOid: string;
}
