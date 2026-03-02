import { afterEach, describe, expect, it } from "vitest";
import { access, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createInlineEditCommit,
  getRefOid,
  initBareRepository,
  readFileAtRef,
  resolveRepositoryPath,
  runGit,
} from "./index";

const TEMP_PATHS: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  TEMP_PATHS.push(path);
  return path;
}

async function setupBareRepository(): Promise<{ barePath: string; workPath: string }> {
  const tempRoot = await createTempDir("yona-git-test-");
  const repoRoot = join(tempRoot, "repo-root");
  await mkdir(repoRoot, { recursive: true });

  const barePath = resolveRepositoryPath(repoRoot, "1001");
  await initBareRepository(barePath);

  const workPath = join(tempRoot, "work");
  await runGit(["clone", barePath, workPath], { cwd: tempRoot });
  await runGit(["config", "user.name", "Test User"], { cwd: workPath });
  await runGit(["config", "user.email", "test@example.com"], { cwd: workPath });

  await writeFile(join(workPath, "README.md"), "initial\n", "utf-8");
  await runGit(["add", "README.md"], { cwd: workPath });
  await runGit(["commit", "-m", "initial commit"], { cwd: workPath });
  await runGit(["checkout", "-B", "main"], { cwd: workPath });
  await runGit(["push", "-u", "origin", "main"], { cwd: workPath });

  return { barePath, workPath };
}

afterEach(async () => {
  await Promise.all(TEMP_PATHS.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("git executable backend", () => {
  it("rejects repository path traversal", () => {
    expect(() => resolveRepositoryPath("/tmp/yona-repo-root", "../escape")).toThrow(
      "Invalid repository id",
    );
  });

  it("runs git command with stdout capture", async () => {
    const tempDir = await createTempDir("yona-git-cmd-");
    await runGit(["init", tempDir], { cwd: tempDir });

    const result = await runGit(["rev-parse", "--is-inside-work-tree"], { cwd: tempDir });
    expect(result.stdout.trim()).toBe("true");
  });

  it("creates bare repository layout with refs and objects (Yona GitRepositoryTest intent)", async () => {
    const tempRoot = await createTempDir("yona-git-bare-");
    const repoRoot = join(tempRoot, "repo-root");
    await mkdir(repoRoot, { recursive: true });

    const barePath = resolveRepositoryPath(repoRoot, "1001");
    await initBareRepository(barePath);

    await access(join(barePath, "objects"));
    await access(join(barePath, "refs"));
    expect(true).toBe(true);
  });

  it("creates inline edit commit and atomically updates ref", async () => {
    const { barePath } = await setupBareRepository();
    const oldOid = await getRefOid(barePath, "refs/heads/main");

    const mutation = await createInlineEditCommit({
      repoPath: barePath,
      branch: "main",
      filePath: "README.md",
      content: "updated from inline edit\n",
      message: "web inline edit",
      authorName: "Web User",
      authorEmail: "web-user@example.com",
      expectedOldOid: oldOid,
    });

    expect(mutation.oldOid).toBe(oldOid);
    expect(mutation.newOid).not.toBe(oldOid);

    const stored = await readFileAtRef(barePath, "refs/heads/main", "README.md");
    expect(stored).toBe("updated from inline edit\n");
  });
});
