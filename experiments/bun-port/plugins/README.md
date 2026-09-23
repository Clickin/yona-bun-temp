# Trusted Bun plugin spike

This directory is an isolated Bun 1.4.2 experiment, not Yoram's product runtime. It has no package manifest or third-party dependency. It uses Bun's built-in SQLite driver for a temporary host issue/outbox/plugin-storage database and a temp-local filesystem sink.

## Run the scenarios

From the repository root, with stable Bun **1.4.2**, revision `744846f844374847c902b5e7fd59b4342a51ef99`, installed:

```sh
bun --version
bun run experiments/bun-port/plugins/demo.ts \
  --plugin-dir "$PWD/experiments/bun-port/plugins/external"
```

The runner creates a fresh `yoram-trusted-plugins-*` directory under the OS temp directory, uses only that database and sink, exercises the actual local prebuilt plugin artifact, and prints observed scenario evidence. It retains the fixture for inspection: the JSON `evidenceDirectory` field and the `fixture:` stderr line identify the database/sink directory. Remove only that printed temp directory when finished.

The executable-loading scenario builds the host separately from the external artifact directory. The second command copies only the prebuilt plugin directory to another temp location; the compiled executable does not use source-relative plugin paths:

```sh
bun build experiments/bun-port/plugins/demo.ts --compile --outfile /tmp/yoram-plugin-host
mkdir -p /tmp/yoram-plugin-artifacts
cp -R experiments/bun-port/plugins/external/issue-summary /tmp/yoram-plugin-artifacts/
/tmp/yoram-plugin-host --plugin-dir /tmp/yoram-plugin-artifacts
```

The host's bundled event plugin is statically included. `PluginHost.loadPluginDirectory()` reads each local `plugin.json`, checks the API version and SHA-256 of the named `.mjs` artifact, then dynamically imports that file from the supplied directory. The demo also creates isolated malformed local bundles to exercise unavailable-directory, missing-entrypoint, checksum-mismatch, and unsupported-API-version errors. No network/package registry is used.

## Host and plugin boundary

- `sdk.ts` defines manifest API version 1 and the plugin lifecycle/context types. `start()` may register issue-commit listeners and returns a runtime; `stop()`/host disposal awaits `dispose()`.
- `host.ts` owns a temporary SQLite fixture with issues, an outbox, and plugin-namespaced key/value storage. An issue mutation and outbox row commit in one SQLite transaction. Only after commit does dispatch run. Failed dispatch stays pending for explicit retry; delivery is at-least-once, so handlers must be idempotent.
- The plugin context exposes only issue reads, namespaced storage, an atomic `writeOnce` local sink, and post-commit issue events. Issue reads require `issues:read` and an exact actor/project match; permission decisions stay in the host.
- `bundled/issue-events` persists each event once to the host-provided sink and records its event marker in plugin-owned storage. The harness injects one post-write failure, retries it, then explicitly redelivers it to demonstrate stable event-ID deduplication and rollback silence.
- `external/issue-summary` is a prebuilt JavaScript extension with the named client boundary `issue-summary.v1`: input `{ issueId: string }`; output `{ schemaVersion: 1, issueId, title, status, updatedAt: Date }`. It requires `issues:summary`, then uses the host issue service, which separately enforces `issues:read` and project scope. The demo checks the runtime `Date` value and ACL rejection cases.

These extension names and their versioned input/output are an out-of-band schema/client boundary. Dynamic plugins do **not** mutate or become procedures in the static tRPC `AppRouter`; no tRPC router or client generation is implemented here.

## Trust and limitations

Plugins execute as ordinary code in the host's process with the host's OS permissions. The external plugin must be trusted by the operator; it can bypass the provided context and access files, processes, or network directly. This is not a sandbox, capability-secure runtime, or product extension system. The manifest checksum detects artifact drift only; it is not a signature, publisher identity, or trust decision. The demo does not connect to external services or product databases and does not claim product or legacy parity.

The SQLite DB, plugin storage, issue outbox, and sink are all inside the runner's temporary fixture. No company/golden data, credentials, hooks, mail, or webhooks are used.