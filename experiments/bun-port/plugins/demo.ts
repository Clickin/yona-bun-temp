import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Database } from "bun:sqlite";
import { PluginHost } from "./host";
import { createIssueEventsPlugin } from "./bundled/issue-events";
import type { Actor, Issue } from "./sdk";

const issue: Issue = {
  id: "ISS-1",
  projectId: "project-a",
  title: "Initial title",
  status: "open",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const allowed: Actor = {
  userId: "alice",
  projectId: "project-a",
  permissions: ["issues:read", "issues:summary"],
};

function readStorage(root: string, pluginId: string, key: string): string | undefined {
  const db = new Database(join(root, "host.sqlite"), { readonly: true });
  try {
    const row = db
      .query("SELECT value FROM plugin_storage WHERE plugin_id = ? AND key = ?")
      .get(pluginId, key) as { value: string } | null;
    return row?.value;
  } finally {
    db.close();
  }
}

async function expectCode(operation: () => Promise<unknown>, expectedCode: string): Promise<void> {
  let caught: unknown;
  try {
    await operation();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof Error, `expected ${expectedCode}, operation succeeded`);
  assert.ok("code" in caught, `expected coded ${expectedCode} error`);
  assert.equal(caught.code, expectedCode);
}

function isSummary(value: unknown): value is {
  schemaVersion: 1;
  issueId: string;
  title: string;
  status: string;
  updatedAt: Date;
} {
  if (typeof value !== "object" || value === null) return false;
  return (
    "schemaVersion" in value &&
    value.schemaVersion === 1 &&
    "issueId" in value &&
    typeof value.issueId === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "status" in value &&
    typeof value.status === "string" &&
    "updatedAt" in value &&
    value.updatedAt instanceof Date
  );
}

async function exerciseOfflineFailures(
  host: PluginHost,
  artifactRoot: string,
  tempRoot: string,
): Promise<string[]> {
  const sourceDirectory = join(artifactRoot, "issue-summary");
  const sourceManifest = JSON.parse(
    await readFile(join(sourceDirectory, "plugin.json"), "utf8"),
  ) as {
    id: string;
    apiVersion: number;
    entrypoint: string;
    sha256: string;
  };
  const exercised: string[] = [];

  const checksumDir = join(tempRoot, "bad-checksum");
  await cp(sourceDirectory, join(checksumDir, "issue-summary"), { recursive: true });
  await writeFile(
    join(checksumDir, "issue-summary", sourceManifest.entrypoint),
    "export default {};\n",
    "utf8",
  );
  await expectCode(() => host.loadPluginDirectory(checksumDir), "PLUGIN_CHECKSUM_MISMATCH");
  exercised.push("PLUGIN_CHECKSUM_MISMATCH");

  const apiDir = join(tempRoot, "bad-api");
  await cp(sourceDirectory, join(apiDir, "issue-summary"), { recursive: true });
  await writeFile(
    join(apiDir, "issue-summary", "plugin.json"),
    JSON.stringify({ ...sourceManifest, apiVersion: 999 }),
    "utf8",
  );
  await expectCode(() => host.loadPluginDirectory(apiDir), "API_VERSION_UNSUPPORTED");
  exercised.push("API_VERSION_UNSUPPORTED");

  const missingEntryDir = join(tempRoot, "missing-entrypoint");
  const missingEntryPluginDir = join(missingEntryDir, "issue-summary");
  await mkdir(missingEntryPluginDir, { recursive: true });
  await writeFile(
    join(missingEntryPluginDir, "plugin.json"),
    JSON.stringify(sourceManifest),
    "utf8",
  );
  await expectCode(
    () => host.loadPluginDirectory(missingEntryDir),
    "PLUGIN_ENTRYPOINT_UNAVAILABLE",
  );
  exercised.push("PLUGIN_ENTRYPOINT_UNAVAILABLE");

  const missingDirectory = join(tempRoot, "not-installed");
  await expectCode(
    () => host.loadPluginDirectory(missingDirectory),
    "PLUGIN_DIRECTORY_UNAVAILABLE",
  );
  exercised.push("PLUGIN_DIRECTORY_UNAVAILABLE");
  return exercised;
}

async function run(pluginDirectory: string): Promise<void> {
  const tempRoot = await mkdtemp(join(tmpdir(), "yoram-trusted-plugins-"));
  const databaseRoot = join(tempRoot, "fixture");
  const host = await PluginHost.create({ root: databaseRoot, initialIssues: [issue] });
  console.error(`fixture: ${databaseRoot}`);
  let failAfterFirstWrite = true;
  const eventPlugin = createIssueEventsPlugin({
    afterWrite() {
      if (failAfterFirstWrite) {
        failAfterFirstWrite = false;
        throw new Error("injected transient failure after sink write");
      }
    },
  });

  try {
    await host.start(eventPlugin);
    assert.deepEqual(host.pluginIds(), ["issue-events"]);
    assert.equal(readStorage(databaseRoot, "issue-events", "lifecycle"), "started");

    await assert.rejects(
      host.transactIssues((tx) => {
        tx.updateIssue(issue.id, (draft) => {
          draft.status = "must-rollback";
        });
        throw new Error("rollback fixture");
      }),
      /rollback fixture/,
    );
    const rolledBack = await host.readIssue(allowed, issue.id);
    assert.equal(rolledBack.status, "open");
    assert.equal(readStorage(databaseRoot, "issue-events", "records-created"), undefined);

    const commit = await host.transactIssues((tx) => {
      tx.updateIssue(issue.id, (draft) => {
        draft.title = "Committed from plugin experiment";
        draft.status = "closed";
      });
    });
    assert.equal(commit.eventIds.length, 1);
    const eventId = commit.eventIds[0];
    if (!eventId) throw new Error("Committed transaction did not return its event id");
    assert.ok(
      eventId.endsWith(".1"),
      "rolled-back transaction must not consume an issue event version",
    );
    assert.equal(commit.delivery.attempted, 1);
    assert.equal(commit.delivery.delivered, 0);
    assert.equal(commit.delivery.remaining, 1);
    assert.equal(commit.delivery.errors.length, 1);
    const committed = await host.readIssue(allowed, issue.id);
    assert.equal(committed.status, "closed");
    const eventFile = `${eventId}.json`;
    const firstSinkRecord = await host.sinkFile(eventFile);
    assert.ok(
      firstSinkRecord,
      "sink record must be persisted despite a post-write delivery failure",
    );

    const retry = await host.retryPendingEvents();
    assert.equal(retry.delivered, 1);
    assert.equal(retry.remaining, 0);
    await host.redeliverCommittedEvent(eventId);
    assert.equal(await host.sinkFile(eventFile), firstSinkRecord);
    assert.equal(readStorage(databaseRoot, "issue-events", "records-created"), "1");
    assert.equal(readStorage(databaseRoot, "issue-events", `event.${eventId}`), "written");

    await assert.rejects(
      host.readIssue({ ...allowed, permissions: [] }, issue.id),
      (error: unknown) =>
        error instanceof Error && "code" in error && error.code === "ACL_PERMISSION_DENIED",
    );
    await assert.rejects(
      host.readIssue({ ...allowed, projectId: "project-b" }, issue.id),
      (error: unknown) =>
        error instanceof Error && "code" in error && error.code === "ACL_PROJECT_DENIED",
    );

    await host.loadPluginDirectory(pluginDirectory);
    assert.deepEqual(host.pluginIds(), ["issue-events", "issue-summary"]);
    assert.equal(readStorage(databaseRoot, "issue-summary", "lifecycle"), "started");
    const summaryValue = await host.invokeExtension("issue-summary", "issue-summary.v1", allowed, {
      issueId: issue.id,
    });
    assert.ok(
      isSummary(summaryValue),
      "issue-summary.v1 response must match schema version 1 and preserve Date",
    );
    assert.equal(summaryValue.status, "closed");
    assert.ok(summaryValue.updatedAt instanceof Date);

    await expectCode(
      () =>
        host.invokeExtension(
          "issue-summary",
          "issue-summary.v1",
          { ...allowed, permissions: ["issues:read"] },
          { issueId: issue.id },
        ),
      "ACL_PERMISSION_DENIED",
    );
    await expectCode(
      () =>
        host.invokeExtension(
          "issue-summary",
          "issue-summary.v1",
          { ...allowed, projectId: "project-b" },
          { issueId: issue.id },
        ),
      "ACL_PROJECT_DENIED",
    );
    await expectCode(
      () =>
        host.invokeExtension(
          "issue-summary",
          "issue-summary.v1",
          { ...allowed, permissions: ["issues:summary"] },
          { issueId: issue.id },
        ),
      "ACL_PERMISSION_DENIED",
    );

    const offlineErrors = await exerciseOfflineFailures(host, pluginDirectory, tempRoot);
    await host.stop("issue-summary");
    assert.deepEqual(host.pluginIds(), ["issue-events"]);
    assert.equal(readStorage(databaseRoot, "issue-summary", "lifecycle"), "disposed");
    await host.stop("issue-events");
    assert.deepEqual(host.pluginIds(), []);
    assert.equal(readStorage(databaseRoot, "issue-events", "records-created"), "1");
    assert.equal(readStorage(databaseRoot, "issue-events", "lifecycle"), "disposed");

    console.log(
      JSON.stringify(
        {
          result: "completed",
          evidence: {
            evidenceDirectory: databaseRoot,
            rolledBackStatus: rolledBack.status,
            committedStatus: committed.status,
            committedEventId: commit.eventId,
            retry: { delivered: retry.delivered, remaining: retry.remaining },
            sinkRecord: eventFile,
            dedupedCreatedRecordCount: readStorage(databaseRoot, "issue-events", "records-created"),
            summary: { schemaVersion: summaryValue.schemaVersion, updatedAtType: "Date" },
            lifecycle: ["started", "stopped"],
            offlineErrors,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await host.dispose();
  }
}

if (import.meta.main) {
  if (Bun.version !== "1.4.2" || Bun.revision !== "744846f844374847c902b5e7fd59b4342a51ef99") {
    throw new Error(
      `This spike requires Bun 1.4.2 revision 744846f844374847c902b5e7fd59b4342a51ef99; got ${Bun.version} (${Bun.revision})`,
    );
  }
  const args = process.argv.slice(2);
  const pluginDirIndex = args.indexOf("--plugin-dir");
  if (pluginDirIndex === -1 || !args[pluginDirIndex + 1]) {
    throw new Error("Usage: demo.ts --plugin-dir <offline-plugin-directory>");
  }
  await run(resolve(args[pluginDirIndex + 1]));
}
