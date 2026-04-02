import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getGitAuditLogPath } from "./config";
import { getRefOid, initBareRepository, readFileAtRef, runGit } from "./executable";
import { performPullRequestMerge, previewPullRequestMerge } from "./pull-request-merge";

const TEMP_PATHS: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  TEMP_PATHS.push(path);
  return path;
}

async function seedRepository(
  mode: "clean" | "conflict",
): Promise<{ barePath: string; tempRoot: string }> {
  const tempRoot = await createTempDir("yona-git-pr-merge-test-");
  const repoRoot = join(tempRoot, "repo-root");
  const barePath = join(repoRoot, "1001");

  await mkdir(repoRoot, { recursive: true });
  await initBareRepository(barePath);

  const workPath = join(tempRoot, "work");
  await runGit(["clone", barePath, workPath], { cwd: tempRoot });
  await runGit(["config", "user.name", "Seed User"], { cwd: workPath });
  await runGit(["config", "user.email", "seed@example.com"], { cwd: workPath });
  await writeFile(join(workPath, "base.txt"), "base\n", "utf-8");
  await runGit(["add", "base.txt"], { cwd: workPath });
  await runGit(["commit", "-m", "base commit"], { cwd: workPath });
  await runGit(["checkout", "-B", "main"], { cwd: workPath });
  await runGit(["push", "-u", "origin", "main"], { cwd: workPath });

  if (mode === "clean") {
    await runGit(["checkout", "-b", "feature/demo"], { cwd: workPath });
    await writeFile(join(workPath, "feature.txt"), "feature branch change\n", "utf-8");
    await runGit(["add", "feature.txt"], { cwd: workPath });
    await runGit(["commit", "-m", "feature change"], { cwd: workPath });
    await runGit(["push", "-u", "origin", "feature/demo"], { cwd: workPath });
    await runGit(["checkout", "main"], { cwd: workPath });
    await writeFile(join(workPath, "main.txt"), "main branch change\n", "utf-8");
    await runGit(["add", "main.txt"], { cwd: workPath });
    await runGit(["commit", "-m", "main change"], { cwd: workPath });
    await runGit(["push", "origin", "main"], { cwd: workPath });
  } else {
    await runGit(["checkout", "-b", "feature/demo"], { cwd: workPath });
    await writeFile(join(workPath, "conflict.txt"), "base\nleft\n", "utf-8");
    await runGit(["add", "conflict.txt"], { cwd: workPath });
    await runGit(["commit", "-m", "feature conflict"], { cwd: workPath });
    await runGit(["push", "-u", "origin", "feature/demo"], { cwd: workPath });
    await runGit(["checkout", "main"], { cwd: workPath });
    await writeFile(join(workPath, "conflict.txt"), "base\nright\n", "utf-8");
    await runGit(["add", "conflict.txt"], { cwd: workPath });
    await runGit(["commit", "-m", "main conflict"], { cwd: workPath });
    await runGit(["push", "origin", "main"], { cwd: workPath });
  }

  return { barePath, tempRoot };
}

function actor() {
  return {
    canAdmin: false,
    canDirectWrite: true,
    email: "merge@example.com",
    id: "7",
    ipAddress: "127.0.0.1",
    name: "Merge User",
    role: "developer" as const,
  };
}

afterEach(async () => {
  delete process.env.YONA_DATA;
  await Promise.all(TEMP_PATHS.splice(0).map((path) => rm(path, { force: true, recursive: true })));
});

describe("pull request merge helper", () => {
  it("previews a clean branch merge without conflicts", async () => {
    const { barePath } = await seedRepository("clean");

    await expect(
      previewPullRequestMerge({
        repoPath: barePath,
        sourceBranch: "feature/demo",
        targetBranch: "main",
      }),
    ).resolves.toMatchObject({
      conflictedFiles: [],
      mergeable: true,
    });
  });

  it("previews a conflicting branch merge with conflicted files", async () => {
    const { barePath } = await seedRepository("conflict");

    await expect(
      previewPullRequestMerge({
        repoPath: barePath,
        sourceBranch: "feature/demo",
        targetBranch: "main",
      }),
    ).resolves.toMatchObject({
      conflictedFiles: ["conflict.txt"],
      mergeable: false,
    });
  });

  it("creates a merge commit, advances the target branch, and writes an audit record", async () => {
    const { barePath, tempRoot } = await seedRepository("clean");
    process.env.YONA_DATA = join(tempRoot, "yona-data");

    const previousMain = await getRefOid(barePath, "refs/heads/main");
    const result = await performPullRequestMerge({
      actor: actor(),
      message: "Merge pull request #7 from feature/demo",
      repoPath: barePath,
      repositoryId: "1001",
      sourceBranch: "feature/demo",
      targetBranch: "main",
    });

    expect(result.conflicted).toBe(false);
    expect(result.mergeCommitOid).toMatch(/^[a-f0-9]{40}$/);
    expect(await getRefOid(barePath, "refs/heads/main")).not.toBe(previousMain);
    expect(await readFileAtRef(barePath, "refs/heads/main", "feature.txt")).toBe(
      "feature branch change\n",
    );
    expect(await readFileAtRef(barePath, "refs/heads/main", "main.txt")).toBe(
      "main branch change\n",
    );

    const auditLog = await readFile(getGitAuditLogPath(), "utf-8");
    expect(auditLog).toContain('"action":"pull-request-merge"');
    expect(auditLog).toContain('"repositoryId":"1001"');
  });

  it("returns conflicts without advancing the target branch and writes a conflict audit record", async () => {
    const { barePath, tempRoot } = await seedRepository("conflict");
    process.env.YONA_DATA = join(tempRoot, "yona-data");

    const previousMain = await getRefOid(barePath, "refs/heads/main");
    const result = await performPullRequestMerge({
      actor: actor(),
      message: "Merge pull request #8 from feature/demo",
      repoPath: barePath,
      repositoryId: "1001",
      sourceBranch: "feature/demo",
      targetBranch: "main",
    });

    expect(result).toMatchObject({
      conflicted: true,
      conflictedFiles: ["conflict.txt"],
      mergeCommitOid: null,
    });
    expect(await getRefOid(barePath, "refs/heads/main")).toBe(previousMain);

    const auditLog = await readFile(getGitAuditLogPath(), "utf-8");
    expect(auditLog).toContain('"action":"pull-request-merge-conflict"');
    expect(auditLog).toContain('"conflictedFiles":["conflict.txt"]');
  });
});
