export interface RunGitInput {
  repoPath: string;
  args: string[];
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
}

export interface VcsService {
  cloneRepository(remoteUrl: string, repoPath: string): Promise<void>;
  fetchRepository(repoPath: string, remote?: string): Promise<void>;
  initBareRepository(repoPath: string): Promise<void>;
  runGit(input: RunGitInput): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  handleSmartHttpRequest(input: {
    repoPath: string;
    method: string;
    url: string;
    headers: Record<string, string | undefined>;
    body: Uint8Array;
  }): Promise<{ status: number; headers: Record<string, string>; body: Uint8Array }>;
}
