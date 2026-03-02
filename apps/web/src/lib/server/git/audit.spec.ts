import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendGitMutationAuditLog, type GitMutationAuditRecord } from "./audit";

const TEMP_PATHS: string[] = [];

async function createTempPath(): Promise<string> {
  const temp = await mkdtemp(join(tmpdir(), "yona-git-audit-"));
  TEMP_PATHS.push(temp);
  return temp;
}

function makeRecord(message: string): GitMutationAuditRecord {
  return {
    timestamp: new Date().toISOString(),
    requestId: "req-1",
    action: "inline-edit-commit",
    repositoryId: "1001",
    branch: "main",
    filePath: "README.md",
    actorId: "u-1",
    actorName: "Editor",
    actorEmail: "editor@example.com",
    actorIp: "127.0.0.1",
    oldOid: "old",
    newOid: "new",
    message,
  };
}

afterEach(async () => {
  delete process.env.YONA_GIT_AUDIT_MAX_BYTES;
  delete process.env.YONA_GIT_AUDIT_MAX_FILES;
  await Promise.all(TEMP_PATHS.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("git mutation audit log", () => {
  it("appends JSON lines", async () => {
    const temp = await createTempPath();
    const filePath = join(temp, "git-mutations.log");

    await appendGitMutationAuditLog(filePath, makeRecord("first"));
    await appendGitMutationAuditLog(filePath, makeRecord("second"));

    const lines = (await readFile(filePath, "utf-8")).trim().split("\n");
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0] ?? "{}").message).toBe("first");
    expect(JSON.parse(lines[1] ?? "{}").message).toBe("second");
  });

  it("rotates logs when max bytes is exceeded", async () => {
    const temp = await createTempPath();
    const filePath = join(temp, "git-mutations.log");

    process.env.YONA_GIT_AUDIT_MAX_BYTES = "220";
    process.env.YONA_GIT_AUDIT_MAX_FILES = "3";

    await appendGitMutationAuditLog(filePath, makeRecord("a".repeat(120)));
    await appendGitMutationAuditLog(filePath, makeRecord("b".repeat(120)));

    const current = await readFile(filePath, "utf-8");
    const rotated = await readFile(`${filePath}.1`, "utf-8");

    expect(current).toContain('"message":"' + "b".repeat(120));
    expect(rotated).toContain('"message":"' + "a".repeat(120));
  });

  it("caps rotation depth to configured max files", async () => {
    const temp = await createTempPath();
    const filePath = join(temp, "git-mutations.log");

    process.env.YONA_GIT_AUDIT_MAX_BYTES = "220";
    process.env.YONA_GIT_AUDIT_MAX_FILES = "2";

    await appendGitMutationAuditLog(filePath, makeRecord("x".repeat(120)));
    await appendGitMutationAuditLog(filePath, makeRecord("y".repeat(120)));
    await appendGitMutationAuditLog(filePath, makeRecord("z".repeat(120)));

    const newest = await readFile(filePath, "utf-8");
    const previous = await readFile(`${filePath}.1`, "utf-8");
    expect(newest).toContain('"message":"' + "z".repeat(120));
    expect(previous).toContain('"message":"' + "y".repeat(120));

    await expect(stat(`${filePath}.2`)).rejects.toThrow();
  });
});
