import { createHash, randomUUID } from "node:crypto";
import { Database } from "bun:sqlite";
import { link, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { HOST_PLUGIN_API_VERSION } from "./sdk";
import type {
  Actor,
  Issue,
  IssueCommittedEvent,
  PluginContext,
  PluginDefinition,
  PluginManifest,
  PluginRuntime,
} from "./sdk";

export class PluginHostError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PluginHostError";
  }
}

interface HostOptions {
  root: string;
  initialIssues?: readonly Issue[];
}

interface Subscription {
  handler: (event: IssueCommittedEvent) => void | Promise<void>;
}

interface StartedPlugin {
  runtime: PluginRuntime;
  subscriptions: Subscription[];
}

interface EventRow {
  event_id: string;
  payload: string;
  delivered_at: string | null;
}

interface IssueRow {
  id: string;
  project_id: string;
  title: string;
  status: string;
  updated_at: string;
  version: number;
}

const SAFE_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/;

function assertSegment(value: string, label: string): string {
  if (!SAFE_SEGMENT.test(value) || value === "." || value === "..") {
    throw new PluginHostError("INVALID_PATH_SEGMENT", `Invalid ${label}: ${value}`);
  }
  return value;
}

function assertManifest(manifest: PluginManifest): void {
  if (!manifest || typeof manifest.id !== "string" || !SAFE_SEGMENT.test(manifest.id)) {
    throw new PluginHostError("INVALID_MANIFEST", "Plugin manifest has an invalid id");
  }
  if (manifest.apiVersion !== HOST_PLUGIN_API_VERSION) {
    throw new PluginHostError(
      "API_VERSION_UNSUPPORTED",
      `Plugin ${manifest.id} requires API ${manifest.apiVersion}; host supports ${HOST_PLUGIN_API_VERSION}`,
    );
  }
}
function parseManifest(value: unknown): PluginManifest {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    !("apiVersion" in value) ||
    typeof value.id !== "string" ||
    typeof value.apiVersion !== "number" ||
    !Number.isSafeInteger(value.apiVersion)
  ) {
    throw new PluginHostError(
      "INVALID_MANIFEST",
      "Plugin manifest needs a string id and integer apiVersion",
    );
  }
  if (
    ("entrypoint" in value && typeof value.entrypoint !== "string") ||
    ("sha256" in value && typeof value.sha256 !== "string")
  ) {
    throw new PluginHostError(
      "INVALID_MANIFEST",
      "Plugin manifest entrypoint and sha256 must be strings",
    );
  }
  return {
    id: value.id,
    apiVersion: value.apiVersion,
    ...(typeof value.entrypoint === "string" ? { entrypoint: value.entrypoint } : {}),
    ...(typeof value.sha256 === "string" ? { sha256: value.sha256 } : {}),
  };
}

function isPluginDefinition(value: unknown): value is PluginDefinition {
  if (
    typeof value !== "object" ||
    value === null ||
    !("manifest" in value) ||
    !("start" in value) ||
    typeof value.start !== "function"
  )
    return false;
  const manifest = value.manifest;
  return (
    typeof manifest === "object" &&
    manifest !== null &&
    "id" in manifest &&
    typeof manifest.id === "string" &&
    "apiVersion" in manifest &&
    typeof manifest.apiVersion === "number"
  );
}

function issueFromRow(row: IssueRow): Issue {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    status: row.status,
    updatedAt: new Date(row.updated_at),
  };
}

export class PluginHost {
  readonly #db: Database;
  readonly #root: string;
  readonly #plugins = new Map<string, StartedPlugin>();
  #closed = false;

  private constructor(root: string, db: Database) {
    this.#root = root;
    this.#db = db;
  }

  static async create(options: HostOptions): Promise<PluginHost> {
    await mkdir(options.root, { recursive: true });
    await mkdir(join(options.root, "sink"), { recursive: true });
    const db = new Database(join(options.root, "host.sqlite"));
    db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS issue_outbox (
        event_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        delivered_at TEXT,
        last_error TEXT
      );
      CREATE TABLE IF NOT EXISTS plugin_storage (
        plugin_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (plugin_id, key)
      );
    `);
    for (const issue of options.initialIssues ?? []) {
      db.query(`INSERT OR IGNORE INTO issues (id, project_id, title, status, updated_at, version)
        VALUES (?, ?, ?, ?, ?, 0)`).run(
        issue.id,
        issue.projectId,
        issue.title,
        issue.status,
        issue.updatedAt.toISOString(),
      );
    }
    return new PluginHost(options.root, db);
  }

  pluginIds(): string[] {
    return [...this.#plugins.keys()];
  }

  async start(definition: PluginDefinition): Promise<void> {
    this.#assertOpen();
    assertManifest(definition.manifest);
    const pluginId = definition.manifest.id;
    if (this.#plugins.has(pluginId)) {
      throw new PluginHostError("PLUGIN_ALREADY_STARTED", `Plugin ${pluginId} is already started`);
    }

    const subscriptions: Subscription[] = [];
    const runtime = await definition.start(this.#context(pluginId, subscriptions));
    for (const [name, handler] of Object.entries(runtime.extensions ?? {})) {
      if (
        !SAFE_SEGMENT.test(name) ||
        name === "." ||
        name === ".." ||
        typeof handler !== "function"
      ) {
        subscriptions.length = 0;
        await runtime.dispose?.();
        throw new PluginHostError(
          "INVALID_EXTENSION",
          `Plugin ${pluginId} registered invalid extension ${name}`,
        );
      }
    }
    this.#plugins.set(pluginId, { runtime, subscriptions });
  }

  async loadPluginDirectory(directory: string): Promise<void> {
    this.#assertOpen();
    const absoluteDirectory = resolve(directory);
    let entries;
    try {
      entries = await readdir(absoluteDirectory, { withFileTypes: true });
    } catch (error) {
      throw new PluginHostError(
        "PLUGIN_DIRECTORY_UNAVAILABLE",
        `Cannot read local plugin directory ${absoluteDirectory}: ${String(error)}`,
      );
    }

    const loadedHere: string[] = [];
    try {
      for (const entry of entries
        .filter((item) => item.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        const pluginDirectory = join(absoluteDirectory, entry.name);
        const manifestPath = join(pluginDirectory, "plugin.json");
        let manifest: PluginManifest;
        try {
          manifest = parseManifest(JSON.parse(await readFile(manifestPath, "utf8")) as unknown);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw new PluginHostError(
            "INVALID_MANIFEST",
            `Cannot parse ${manifestPath}: ${String(error)}`,
          );
        }
        assertManifest(manifest);
        if (
          typeof manifest.entrypoint !== "string" ||
          !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.mjs$/.test(manifest.entrypoint) ||
          typeof manifest.sha256 !== "string" ||
          !/^[a-f0-9]{64}$/.test(manifest.sha256)
        ) {
          throw new PluginHostError(
            "INVALID_MANIFEST",
            `Plugin ${manifest.id} needs a .mjs entrypoint and SHA-256`,
          );
        }
        const entryPath = join(pluginDirectory, manifest.entrypoint);
        let bytes: Buffer;
        try {
          bytes = await readFile(entryPath);
        } catch (error) {
          throw new PluginHostError(
            "PLUGIN_ENTRYPOINT_UNAVAILABLE",
            `Cannot read ${entryPath}: ${String(error)}`,
          );
        }
        const actualHash = createHash("sha256").update(bytes).digest("hex");
        if (actualHash !== manifest.sha256) {
          throw new PluginHostError(
            "PLUGIN_CHECKSUM_MISMATCH",
            `SHA-256 mismatch for ${manifest.id}`,
          );
        }

        let moduleValue: unknown;
        try {
          // Runtime-selected external artifact: static imports would embed it in the compiled host.
          moduleValue = await import(pathToFileURL(entryPath).href);
        } catch (error) {
          throw new PluginHostError(
            "PLUGIN_IMPORT_FAILED",
            `Cannot import ${entryPath}: ${String(error)}`,
          );
        }
        if (typeof moduleValue !== "object" || moduleValue === null) {
          throw new PluginHostError(
            "INVALID_PLUGIN_ENTRYPOINT",
            `${manifest.id} entry point must export an object`,
          );
        }
        const exported =
          "default" in moduleValue
            ? moduleValue.default
            : "plugin" in moduleValue
              ? moduleValue.plugin
              : undefined;
        if (!isPluginDefinition(exported)) {
          throw new PluginHostError(
            "INVALID_PLUGIN_ENTRYPOINT",
            `${manifest.id} must export a plugin definition`,
          );
        }
        const definition = exported;
        assertManifest(definition.manifest);
        if (
          definition.manifest.id !== manifest.id ||
          definition.manifest.apiVersion !== manifest.apiVersion
        ) {
          throw new PluginHostError(
            "PLUGIN_MANIFEST_MISMATCH",
            `Entry point identity differs from ${manifest.id} manifest`,
          );
        }
        await this.start(definition);
        loadedHere.push(manifest.id);
      }
    } catch (error) {
      for (const pluginId of loadedHere.reverse()) await this.stop(pluginId).catch(() => undefined);
      throw error;
    }
  }

  async stop(pluginId: string): Promise<void> {
    const plugin = this.#plugins.get(pluginId);
    if (!plugin) return;
    this.#plugins.delete(pluginId);
    try {
      await plugin.runtime.dispose?.();
    } finally {
      plugin.subscriptions.length = 0;
    }
  }

  async dispose(): Promise<void> {
    if (this.#closed) return;
    const failures: unknown[] = [];
    for (const pluginId of [...this.#plugins.keys()].reverse()) {
      try {
        await this.stop(pluginId);
      } catch (error) {
        failures.push(error);
      }
    }
    this.#db.close();
    this.#closed = true;
    if (failures.length)
      throw new AggregateError(failures, "One or more plugins failed to dispose");
  }

  async transactIssues(
    operation: (tx: {
      updateIssue(issueId: string, change: (draft: Issue) => void): string;
    }) => void,
  ): Promise<{
    eventIds: string[];
    delivery: { attempted: number; delivered: number; remaining: number; errors: string[] };
  }> {
    this.#assertOpen();
    const eventIds: string[] = [];
    const commit = this.#db.transaction(() => {
      operation({
        updateIssue: (issueId, change) => {
          const row = this.#db
            .query("SELECT * FROM issues WHERE id = ?")
            .get(issueId) as IssueRow | null;
          if (!row) throw new PluginHostError("ISSUE_NOT_FOUND", `Issue ${issueId} was not found`);
          const before = issueFromRow(row);
          const draft = { ...before, updatedAt: new Date(before.updatedAt) };
          change(draft);
          if (draft.id !== before.id || draft.projectId !== before.projectId) {
            throw new PluginHostError(
              "IMMUTABLE_ISSUE_IDENTITY",
              "Issue id and project id cannot change",
            );
          }
          const committedAt = new Date();
          const version = row.version + 1;
          this.#db
            .query(
              "UPDATE issues SET title = ?, status = ?, updated_at = ?, version = ? WHERE id = ?",
            )
            .run(draft.title, draft.status, committedAt.toISOString(), version, issueId);
          const event: IssueCommittedEvent = {
            eventId: `${createHash("sha256").update(issueId).digest("hex")}.${version}`,
            type: "issue.committed",
            issueId,
            projectId: draft.projectId,
            committedAt: committedAt.toISOString(),
          };
          this.#db
            .query("INSERT INTO issue_outbox (event_id, payload) VALUES (?, ?)")
            .run(event.eventId, JSON.stringify(event));
          eventIds.push(event.eventId);
          return event.eventId;
        },
      });
    });
    commit();
    const delivery = await this.retryPendingEvents();
    return { eventIds, delivery };
  }

  async retryPendingEvents(): Promise<{
    attempted: number;
    delivered: number;
    remaining: number;
    errors: string[];
  }> {
    this.#assertOpen();
    const rows = this.#db
      .query(`SELECT event_id, payload, delivered_at FROM issue_outbox
      WHERE delivered_at IS NULL ORDER BY rowid`)
      .all() as EventRow[];
    let attempted = 0;
    let delivered = 0;
    const errors: string[] = [];
    for (const row of rows) {
      attempted += 1;
      try {
        await this.#dispatch(row.event_id, JSON.parse(row.payload) as IssueCommittedEvent);
        delivered += 1;
      } catch (error) {
        errors.push(`${row.event_id}: ${String(error)}`);
      }
    }
    const remaining = (
      this.#db
        .query("SELECT COUNT(*) AS count FROM issue_outbox WHERE delivered_at IS NULL")
        .get() as { count: number }
    ).count;
    return { attempted, delivered, remaining, errors };
  }

  async redeliverCommittedEvent(eventId: string): Promise<void> {
    this.#assertOpen();
    const row = this.#db
      .query("SELECT event_id, payload, delivered_at FROM issue_outbox WHERE event_id = ?")
      .get(eventId) as EventRow | null;
    if (!row)
      throw new PluginHostError("EVENT_NOT_FOUND", `Committed event ${eventId} does not exist`);
    await this.#dispatch(row.event_id, JSON.parse(row.payload) as IssueCommittedEvent);
  }

  async invokeExtension(
    pluginId: string,
    extensionName: string,
    actor: Actor,
    input: unknown,
  ): Promise<unknown> {
    this.#assertOpen();
    const handler = this.#plugins.get(pluginId)?.runtime.extensions?.[extensionName];
    if (!handler) {
      throw new PluginHostError(
        "EXTENSION_NOT_FOUND",
        `Extension ${pluginId}.${extensionName} is not registered`,
      );
    }
    return handler(actor, input);
  }

  async readIssue(actor: Actor, issueId: string): Promise<Issue> {
    this.#assertOpen();
    if (!actor || !Array.isArray(actor.permissions) || !actor.permissions.includes("issues:read")) {
      throw new PluginHostError("ACL_PERMISSION_DENIED", "Actor lacks issues:read permission");
    }
    const row = this.#db.query("SELECT * FROM issues WHERE id = ?").get(issueId) as IssueRow | null;
    if (!row) throw new PluginHostError("ISSUE_NOT_FOUND", `Issue ${issueId} was not found`);
    if (actor.projectId !== row.project_id) {
      throw new PluginHostError(
        "ACL_PROJECT_DENIED",
        "Actor cannot read issues outside its project",
      );
    }
    return issueFromRow(row);
  }

  async sinkFile(fileName: string): Promise<string | undefined> {
    this.#assertOpen();
    assertSegment(fileName, "sink filename");
    try {
      return await readFile(join(this.#root, "sink", fileName), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async #dispatch(eventId: string, event: IssueCommittedEvent): Promise<void> {
    const listeners = [...this.#plugins.values()].flatMap((plugin) => [...plugin.subscriptions]);
    const failures: unknown[] = [];
    for (const listener of listeners) {
      try {
        await listener.handler(event);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) {
      this.#db
        .query("UPDATE issue_outbox SET last_error = ? WHERE event_id = ?")
        .run(failures.map(String).join("; "), eventId);
      throw new AggregateError(failures, `Delivery failed for ${eventId}`);
    }
    this.#db
      .query(
        "UPDATE issue_outbox SET delivered_at = COALESCE(delivered_at, ?), last_error = NULL WHERE event_id = ?",
      )
      .run(new Date().toISOString(), eventId);
  }

  #context(pluginId: string, subscriptions: Subscription[]): PluginContext {
    return {
      pluginId,
      issues: { read: (actor, issueId) => this.readIssue(actor, issueId) },
      storage: {
        get: async (key) => {
          assertSegment(key, "storage key");
          const row = this.#db
            .query("SELECT value FROM plugin_storage WHERE plugin_id = ? AND key = ?")
            .get(pluginId, key) as { value: string } | null;
          return row?.value;
        },
        put: async (key, value) => {
          assertSegment(key, "storage key");
          this.#db
            .query(`INSERT INTO plugin_storage (plugin_id, key, value) VALUES (?, ?, ?)
            ON CONFLICT(plugin_id, key) DO UPDATE SET value = excluded.value`)
            .run(pluginId, key, value);
        },
      },
      sink: {
        writeOnce: async (fileName, content) => {
          assertSegment(fileName, "sink filename");
          const sinkPath = join(this.#root, "sink", fileName);
          const temporaryPath = join(this.#root, "sink", `.${randomUUID()}.tmp`);
          await writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx" });
          try {
            try {
              await link(temporaryPath, sinkPath);
              return "created";
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
              const existing = await readFile(sinkPath, "utf8");
              if (existing !== content) {
                throw new PluginHostError(
                  "SINK_IDEMPOTENCY_CONFLICT",
                  `Sink entry ${fileName} has different content`,
                );
              }
              return "existing";
            }
          } finally {
            await unlink(temporaryPath).catch(() => undefined);
          }
        },
      },
      onIssueCommitted: (handler) => {
        const subscription = { handler };
        subscriptions.push(subscription);
        return () => {
          const index = subscriptions.indexOf(subscription);
          if (index !== -1) subscriptions.splice(index, 1);
        };
      },
    };
  }

  #assertOpen(): void {
    if (this.#closed) throw new PluginHostError("HOST_CLOSED", "Plugin host is disposed");
  }
}
