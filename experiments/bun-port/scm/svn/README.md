# SVN inbound transport feasibility harness

This directory contains an isolated native-client transport experiment. It does **not** implement SVN transport in Bun. A `PASS` on a protocol scenario means the native `svn` client exercised the named real server; it is not proof of Bun server support, Rust/Bun parity, or product readiness.

## Transport matrix

| Transport / server path | Harness status | Bun-owned inbound implementation | Scope and prerequisites |
| --- | --- | --- | --- |
| `svn://` → native `svnserve` | Executed 2026-09-23; `info` **FAIL**, remaining protocol scenarios **NOT_RUN**, cleanup **PASS** | None implemented or invoked | Requires Bun 1.4.2 at revision `744846f844374847c902b5e7fd59b4342a51ef99` plus native `svn`, `svnadmin`, `svnserve`, and `svnlook`. Uses only a local temporary repository and loopback daemon. |
| HTTP/DAV → Apache `mod_dav_svn` container | **BLOCKED / NOT_RUN** in this environment; optional harness path exists | None implemented or invoked | Requires an explicitly selected dedicated disposable Docker context and a local image matching `Dockerfile`/`dav.conf`. The current `orbstack` context is not authorized as disposable and has no Apache DAV image; the harness will not use it, pull an image, or build one. |
| Yoram Rust smart HTTP/DAV route | Implemented existing Rust route; **not run here** | Rust only—not Bun | `crates/server/src/svn_protocol.rs` serves the existing Axum route and method handlers. This proves neither native-daemon success nor Bun inbound support. |
| `svn+ssh://` | **BLOCKED / deferred** | None; no SSH daemon, tunnel, key access, `node-ssh`, or `ssh2` | Out of scope until Bun issues #11947 and #4290 are resolved and SSH work is separately authorized. No SSH attempt is made. |
| Bun-owned `svn://` and Bun-owned HTTP/DAV handler | **BLOCKED / not implemented** | None | Native `svnserve` and Apache are external candidate daemon paths only. They do not demonstrate an inbound handler running in Bun. |

The harness deliberately does not classify the Rust route as a Bun transport. Rust source is referenced only as route/ACL behavior evidence: `crates/server/src/svn_protocol.rs:48-107` routes `/svn/{owner}/{project}/...`, checks `Subversion` project type, and delegates read/write authorization; lines `334-363` parse the path. `crates/server/tests/svn_protocol_contract.rs:6760-6785` demonstrates the private-project Basic challenge and authenticated response behavior. Those Rust sources/tests are not executed by this harness and do not prove either native-server or Bun transport behavior.

## What the native harness exercises

For each enabled native server, the script creates a fresh `svnadmin` repository and fixture credentials under an operating-system temporary directory, then uses the native `svn` client to exercise:

- `info`, checkout, update, log, diff, blame, and commit;
- copy, move, a custom versioned property, lock, and unlock;
- a read-only ACL denial and a failing `pre-commit` hook, checking that neither advances the repository revision;
- an interrupted in-flight update through a local byte-cutting TCP proxy, then a successful reconnect/update;
- remote HEAD versus `svnlook youngest`, plus SHA-256 comparison of working-copy bytes to server-side `svnlook cat` bytes;
- server/container/network shutdown and absence of repository locks.

The interruption proxy only relays then cuts a loopback connection. It does not implement or emulate SVN. Fixtures, config, hook, credentials, client config, and repositories are temporary and removed at exit. Reports retain scenario status plus sanitized SVN error codes only; raw command output is not saved. Credentials are synthetic and never read from user config. The experiment does not use golden repositories, real user keys, external SVN endpoints, or deployed hooks/mail/webhooks; its only hook is a temporary rejecting `pre-commit` script in the disposable repository. The optional DAV image grants broad write mode only inside the private system-temp fixture mount so Apache can mutate it; never mount a real repository.

## Run `svn://`

From the repository root, with the required Bun release selected:

```sh
BUN_SVN_EVIDENCE_DIR="${TMPDIR:-/tmp}/bun-svn-evidence" \
  bun run experiments/bun-port/scm/svn/run.mjs
```

This runs the real native client against a short-lived local `svnserve`. It leaves a timestamped summary report at `BUN_SVN_EVIDENCE_DIR`; temporary repositories and daemon processes are cleaned up. Without `BUN_SVN_EVIDENCE_DIR`, a new directory under the system temp directory is used and its path is printed. A runtime version/revision mismatch or missing native executable produces `BLOCKED` rows rather than a pass.

## Optional HTTP/DAV run

The harness does not auto-create a Docker context, build/pull an image, or use the current Docker context implicitly. First provision a **dedicated disposable context** and a local image. The image recipe installs Apache `mod_dav_svn`; package provisioning must use an approved local/cache/internal source as appropriate:

```sh
docker --context "$BUN_SVN_DOCKER_CONTEXT" build \
  --tag bun-svn-dav:local \
  experiments/bun-port/scm/svn
```

Then explicitly opt in:

```sh
BUN_SVN_ENABLE_DAV=1 \
BUN_SVN_DOCKER_CONTEXT=svn-dav-isolated \
BUN_SVN_DAV_IMAGE=bun-svn-dav:local \
BUN_SVN_EVIDENCE_DIR="${TMPDIR:-/tmp}/bun-svn-evidence" \
  bun run experiments/bun-port/scm/svn/run.mjs
```

Replace `svn-dav-isolated` with the name of a dedicated disposable Docker context that can bind-mount the host's system temporary directory. The image contract is: Apache listens on port 80; serves `DAV svn` at `/svn` using `SVNParentPath /repos`; reads Basic fixture credentials from `BUN_SVN_USER` / `BUN_SVN_PASSWORD`; reads authorization rules from `/etc/apache2/svn.authz`; and makes the disposable `/repos` bind mount writable by Apache and the host. The provided `Dockerfile` and `dav.conf` implement that contract. The harness publishes only to `127.0.0.1` and puts the container on an internal Docker network; it stops/removes the container and network.

Do not point this at the default/shared Docker context, golden data, or any non-disposable daemon. Do not pull/build if that would contact an unapproved external source. If the context/image prerequisite is absent, the report marks HTTP/DAV `BLOCKED`; if DAV opt-in is omitted, it records `NOT_RUN`.

## Current evidence and blockers

Native `svn://` ran against a disposable loopback `svnserve`. The initial `info` call failed with exit 1 (`E170013`, `E170001`); later protocol scenarios were `NOT_RUN`, and process/lock cleanup passed. The harness source's malformed template literal was corrected before this run; the remaining failure is recorded, not skipped. HTTP/DAV remains `BLOCKED/NOT_RUN` because a dedicated disposable Docker context and local Apache DAV image were unavailable. `svn+ssh://` remains deferred. The generated report is at `/tmp/yoram-bun-svn-evidence-20260923/report-2026-09-23T10-40-49.822Z.md`.

The generated report contains per-scenario statuses and is the run evidence path. Do not commit generated reports or raw command logs.
