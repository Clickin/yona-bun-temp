# Kubernetes Reference Guidance

Status: reference-only, non-baseline deployment note.

This page closes the P0-D guidance gap without adding maintained Kubernetes or
Helm manifests. `SPEC.md` Section 1.4 remains the release baseline:
single-binary/SFX, Docker, runtime `YONA_BASE_PATH`, separated embedded assets
and user-uploaded files, and env/TOML config. Kubernetes is only an operator
packaging target for the existing Docker image contract.

## Current Repo Boundary

- The repo has no canonical Kubernetes, k8s, Helm, Deployment, Service, or
  Ingress manifests.
- Local Kubernetes smoke is not a release blocker while no repo-owned manifests
  exist.
- Do not use this page to introduce a second deployment architecture or a new
  runtime configuration surface.

## Operator Checklist

Use the current Docker image shape as the contract:

- Container command: `yoram`.
- Container port: `8089`.
- Listen address: `YONA_BIND_ADDR=0.0.0.0:8089`.
- Base path: set `YONA_BASE_PATH` to the external mount path, for example
  `/yona`; keep reverse proxy path rewriting consistent with that value.
- Public origin: set `YONA_PUBLIC_ORIGIN` when generated links need an external
  scheme/host.
- Config file: mount `yoram.toml` read-only and set
  `YORAM_CONFIG_TOML=/etc/yona/yoram.toml`, or inject equivalent `YONA_*`
  environment variables.
- Database: inject `YONA_DATABASE_URL` from a Secret or an operator-managed
  secret source. Use `YONA_SCHEMA_POLICY=adopt` for existing databases and `up`
  only for new managed schemas.
- Embedded frontend assets: keep `YONA_USE_EMBEDDED_ASSETS=1` for the Docker
  image built by this repo unless an operator intentionally mounts an
  `YONA_ASSET_ROOT`.
- Writable data: set `YONA_DATA=/var/lib/yona/data` and mount a persistent
  volume there. Runtime repositories live under `repo/`; user-uploaded files
  live under `uploads/`.
- Runtime executables: the current Docker runtime installs `git`, `subversion`,
  `curl`, and `ca-certificates`; Kubernetes images must preserve those
  dependencies for Git/SVN and smoke behavior.

Run one replica unless the operator has provided a shared database and shared
`YONA_DATA` storage semantics suitable for repository and upload writes. This
repo does not define leader election, object storage, or multi-writer volume
coordination as a canonical deployment layer.

## Validation

For repo-owned release evidence, keep using:

```text
pnpm smoke:embedded-assets
pnpm smoke:docker
```

If an operator keeps local manifests outside this repo, the useful smoke target
is the same base-path surface covered by `scripts/smoke-docker.mjs`: the SPA
index, `/projects`, an emitted JS asset, `/api/auth/session` with CSRF header,
and `/api/v1/projects`.
