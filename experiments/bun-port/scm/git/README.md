# Bun Git inbound Smart HTTP experiment

This is a local feasibility spike, not product parity. The server uses Bun's HTTP listener and the installed native `git-http-backend`; the harness uses native `git` clients against a disposable bare repository. Nothing clones from or writes to a remote repository. It does not modify Rust or frontend runtime code.

## Prerequisites

- Bun stable **1.4.2**, release revision `744846f844374847c902b5e7fd59b4342a51ef99`.
- Native Git on `PATH`, including executable `git-http-backend` under `git --exec-path`.
- macOS or Linux (process-group cancellation is used on Unix).

Check the pinned Bun before running:

```sh
bun --version
bun --revision
```

Both must match the version and revision above. Run from the repository root:

```sh
bun run experiments/bun-port/scm/git/reproduce.ts
```

If Apple's command-line Git does not provide `git-http-backend`, install native Git and prefer it explicitly:

```sh
brew install git
PATH="$(brew --prefix git)/bin:$PATH" bun run experiments/bun-port/scm/git/reproduce.ts
```

The script emits one JSON summary to stdout. Each scenario is `PASS`, `FAIL`, or `NOT_RUN`; `RUNNING` means the process was interrupted before it could settle the result. The HTTP suite is `BLOCKED` if Bun, Git, or `git-http-backend` prerequisites are missing. The JSON omits credentials, Git output, hook stderr, and raw logs. The disposable fixture is removed in `finally`. **Evidence path:** this reproduction source plus the JSON stdout from the exact command above; no execution evidence is checked in by this branch because the harness must be run locally.

## Scenarios and server-side checks

- Native Git pushes a binary blob over HTTP and clones it back; the clone bytes must equal the fixture bytes and the bare-repository ref is queried with native Git.
- The native Git clone requests protocol v2; the server requires both the `Git-Protocol: version=2` header and a v2 `command=ls-refs` request body to be observed before reporting metadata preservation.
- A read-only actor's push must fail and leave `refs/heads/main` unchanged; a separate actor without read permission must be denied `ls-remote`.
- An executable `pre-receive` hook rejects a push; its disposable marker must exist and the bare-repository ref must remain unchanged.
- Killing a native Git client during a sleeping pre-receive hook must cancel the backend without changing the ref. A separate sleeping hook exceeds the backend deadline; timeout cancellation must likewise leave the ref unchanged.
- After all scenarios, backend start/reap counts and native Git clients must be balanced; server and client pipe counters must be zero. The fixture's nonexistence is checked after removal.

The harness runs these native client operations against its ephemeral loopback URL (`$URL` stands for that generated URL):

```sh
git push origin main
git -c protocol.version=2 clone "$URL" "$TEMP/reader"
git push origin main                 # read-only actor; must fail
git -c protocol.version=2 ls-remote "$URL"  # actor without read access; must fail
git push origin main                 # pre-receive hook rejection; must fail
git push origin main                 # process killed during disconnect scenario
git push origin main                 # backend timeout scenario; must fail
git --git-dir "$BARE_REPO" rev-parse refs/heads/main
```

The harness compares the cloned binary bytes with the original fixture. Each denied or rejected push must leave the bare repo's `main` ref equal to its previously captured value; the hook case also requires its marker. Timeout must be reported by the server and the disconnect case must be observed from the request abort. None of these expected results are recorded as `PASS` until the checks run.

## Rust parity evidence

Read-only reference points (not edited): `crates/server/src/smart_http.rs` for GET/POST service validation, read/write permission decisions, and forwarding `Git-Protocol`; `crates/vcs/src/lib.rs` for the native `git http-backend` CGI environment and process-pipe handling; `crates/server/tests/smart_http_contract.rs` for native client, authorization, and pre-receive hook expectations. This Bun experiment covers inbound transport only; it does not claim full Rust behavior or product parity.

The bare repository, work trees, hook files, marker files, and client config home are confined to one disposable `mkdtemp` root. Test actors and passwords are generated in memory. Basic-auth values are passed only through the native Git child process environment and never printed.

## SSH status

Inbound Git-over-SSH is intentionally deferred and has no implementation or dependency here. Bun issues #11947 and #4290 block that server path under the current scope. The JSON result reports SSH as `BLOCKED`; no outbound SSH clone or file transport is used as a substitute.
