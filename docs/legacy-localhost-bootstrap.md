# Legacy Localhost Bootstrap

> Status: current bootstrap notes for a repo-local legacy Yona instance.
> Scope: official H2 release zip + Java 8 + first-run site-admin bootstrap.

This repo now carries a small bootstrap harness for running a local legacy Yona
instance without rebuilding `yona-original`.

The harness intentionally uses the official GitHub release asset instead of the
legacy build. That keeps us out of the old build-specific `flatdoc`/packaging
path and matches the user instruction to work from the published binary.

Current parity verification should target the localhost legacy instance at
`http://127.0.0.1:9000`. The harness still keeps a sidecar default on `19100`
for smoke iteration, but the canonical verification target is the `parity`
slot on `9000`.

For the mounted Rust dev runtime, the repo-local startup harness now also
reconciles `.yona-data/dev.db` so an existing `admin` user keeps a
`site_admin` row. That prevents reused local dev databases from drifting away
from the localhost legacy parity assumption that `admin` / `admin` can read the
`/sites/*` admin surfaces.

## Defaults

- Release asset: `yona-h2-v1.16.0-bin.zip`
- Release URL:
  `https://github.com/yona-projects/yona/releases/download/v1.16.0/yona-h2-v1.16.0-bin.zip`
- Local workspace: `.agent/legacy-localhost/`
- Default bind: `127.0.0.1:19100`
- Default admin bootstrap credentials:
  `admin` / `admin@example.com` / `admin`

`19100` remains deliberate for non-canonical smoke runs. The parity target
itself now belongs on `127.0.0.1:9000` through the `parity` slot.

Use the parity-targeted wrappers below, or pass `--port 9000 --instance parity`,
when you want to prepare the canonical verification target.

## Commands

```bash
pnpm legacy:localhost:prepare
pnpm legacy:localhost:start
pnpm legacy:localhost:seed-admin
pnpm legacy:localhost:seed-foundation
pnpm legacy:localhost:seed-content
pnpm legacy:localhost:status
pnpm legacy:localhost:stop
```

The commands are thin wrappers over `scripts/legacy-localhost.mjs`.

For the active localhost parity target on `9000`, use:

```bash
pnpm legacy:localhost:status:parity
pnpm legacy:localhost:prepare:parity
pnpm legacy:localhost:start:parity
pnpm legacy:localhost:seed-admin:parity
pnpm legacy:localhost:seed-foundation:parity
pnpm legacy:localhost:seed-content:parity
pnpm legacy:localhost:stop:parity
```

`status:parity` is useful even when the `9000` instance was not started by this
harness because it also probes `/users/loginform` and reports whether the
current localhost baseline is reachable.

`seed-foundation` is the first reproducible parity seed pass above the
site-admin bootstrap. It drives the legacy product flow through Playwright
instead of dropping in an opaque DB copy and records the result in
`.agent/legacy-localhost/instances/<name>/parity-foundation.json`.

`seed-content` is the next reproducible pass on top of that foundation. It
drives the milestone, issue, issue comment, board post, board comment, label,
and watcher product flows and records the result in
`.agent/legacy-localhost/instances/<name>/parity-content.json`.

## What `prepare` does

`prepare` creates a repo-local workspace under `.agent/legacy-localhost/` and:

1. downloads the official H2 release zip if it is missing
2. extracts it under `.agent/legacy-localhost/dist/`
3. resolves a Java 8 home
4. writes `data/conf/application.conf` from the release jar's bundled
   `application.conf.default`
5. rewrites the bundled H2 JDBC URL so the DB file lives under the instance's
   own `data/db/yona` path instead of the release install root
6. writes `application-logger.xml` and `social-login.conf` into the same
   `YONA_DATA/conf` tree

The bundled release jar already contains an H2-oriented
`application.conf.default`, so we do not need to keep a separate repo-local
fork of the legacy config just to run the embedded distribution.

## Java 8

Legacy Yona still wants Java 8.

The harness resolves Java 8 in this order:

1. `--java-home`
2. `YONA_LEGACY_JAVA_HOME`
3. `JAVA_HOME_8`
4. previously downloaded workspace-local portable JDKs under
   `.agent/legacy-localhost/jdks/`
5. Homebrew `openjdk@8`
6. common macOS JDK bundle paths such as `zulu-8.jdk`
7. the current `java` only if it is already Java 8

If none of those locations provides Java 8, `prepare` now downloads a portable
Azul Zulu 8 archive into `.agent/legacy-localhost/cache/jdk/` and extracts it
under `.agent/legacy-localhost/jdks/`. On Apple Silicon this avoids the
interactive `sudo` path that the macOS `pkg` installer would otherwise need.

You can still pin a specific JDK manually with either:

```bash
export YONA_LEGACY_JAVA_HOME="/Library/Java/JavaVirtualMachines/zulu-8.jdk/Contents/Home"
```

or:

```bash
export YONA_LEGACY_JAVA_URL="https://cdn.azul.com/zulu/bin/<your-archive>.tar.gz"
```

or passing `--java-home ...` / `--java-url ...` to the script.

## First-run bootstrap

Legacy Yona's first-run flow is owned by `Global.java` and the `/secret` page:

- when `application.secret` is still the bundled default, every request is
  intercepted by the site-admin setup flow
- submitting `/secret` creates the site-admin account
- the server rewrites `application.secret` inside
  `YONA_DATA/conf/application.conf`
- after that write, legacy Yona serves the restart notice until the process is
  restarted

That is why the harness splits the steps into:

1. `start`
2. `seed-admin`
3. restart the process

`seed-admin --restart` can do the restart immediately after the form submit if
the process was started through the same harness.

## Parity seed target

The full parity dataset is larger than the first-run admin bootstrap. The live
localhost baseline currently exposes at least these roots and screen families:

- `/admin/sample/**`
- `/admin/svnplayground/**`
- `/alice/sample/**`
- `/weblabs/portal/**`

To recreate that state by using the product rather than copying an opaque DB,
the next seed pass should drive the legacy UI in roughly this order:

1. create user `alice`
2. create user `carol`
3. create organization `weblabs`
4. create project `sample` under `admin`
5. create project `svnplayground` under `admin` with SVN
6. create project `sample` under `alice`
7. create protected project `portal` under `weblabs`
8. add `carol` and `admin` as `weblabs/portal` members
9. create the milestone / issue / board / review / watcher states the parity
   harness currently depends on

The repo now implements the foundation portion of that inventory through:

- `pnpm legacy:localhost:seed-foundation`
- `pnpm legacy:localhost:seed-foundation:parity`

Current foundation seed contents:

1. sign up users `alice` / `alice` and `carol` / `carol`
2. create organization `weblabs`
3. add `carol` to `weblabs`
4. create `admin/sample`
5. create `admin/svnplayground` with `SUBVERSION`
6. log in as `alice` and create `alice/sample`
7. create protected organization project `weblabs/portal`
8. add `carol` to `weblabs/portal`
9. verify that `/admin/sample`, `/admin/svnplayground`, `/alice/sample`,
   `/organizations/weblabs`, and `/weblabs/portal` are reachable

The repo now implements the next content pass through:

- `pnpm legacy:localhost:seed-content`
- `pnpm legacy:localhost:seed-content:parity`

Current content seed contents:

1. sign up user `bob` / `bob`
2. create project labels `type/bug` and `area/parity`
3. create milestone `Parity launch`
4. create issue `Review rail parity check` with assignee, milestone, due date,
   and both labels
5. add Bob's issue comment
6. create notice post `Seed notes`
7. add Alice's board comment
8. ensure `Site Admin` and `Carol Lee` appear on `/weblabs/portal/watchers`
9. verify the seeded milestone, issue, post, and watcher pages by live text

The remaining parity content seed is still intentionally open:

- review threads / pull requests

Those follow-up states should continue to be built through the product flow
next, not by dropping in a foreign DB dump.
