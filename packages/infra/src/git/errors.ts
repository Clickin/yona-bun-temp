export class GitCommandError extends Error {
  public readonly command: string[];
  public readonly cwd: string;
  public readonly exitCode: number;
  public readonly stdout: string;
  public readonly stderr: string;

  constructor(params: {
    command: string[];
    cwd: string;
    exitCode: number;
    stdout: string;
    stderr: string;
  }) {
    super(
      `Git command failed (${params.exitCode}): ${params.command.join(" ")}\n${params.stderr || params.stdout}`,
    );
    this.name = "GitCommandError";
    this.command = params.command;
    this.cwd = params.cwd;
    this.exitCode = params.exitCode;
    this.stdout = params.stdout;
    this.stderr = params.stderr;
  }
}
