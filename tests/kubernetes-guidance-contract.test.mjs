import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const guidance = readFileSync("docs/deployment/kubernetes-reference.md", "utf8");
const deploymentStrategy = readFileSync("docs/agents/08-rust-deployment-strategy.md", "utf8");
const spec = readFileSync("SPEC.md", "utf8");

test("kubernetes guidance remains reference-only and non-baseline", () => {
  assert.match(guidance, /reference-only, non-baseline/u);
  assert.match(guidance, /SFX, Docker/u);
  assert.match(guidance, /no canonical Kubernetes, k8s, Helm, Deployment, Service, or\s+Ingress manifests/u);
  assert.match(deploymentStrategy, /release baseline.*SFX.*Docker\/base-path/u);
  assert.match(spec, /Deployment\s+\|\s+Single-file executable \(SFX\) \+ Docker/u);
});

test("kubernetes guidance tracks current runtime and volume contract", () => {
  for (const token of [
    "yona-rust-pilot-server",
    "YONA_BIND_ADDR=0.0.0.0:8089",
    "YONA_BASE_PATH",
    "YONA_PUBLIC_ORIGIN",
    "YONA_CONFIG_TOML=/etc/yona/yona.toml",
    "YONA_DATABASE_URL",
    "YONA_SCHEMA_POLICY=adopt",
    "YONA_USE_EMBEDDED_ASSETS=1",
    "YONA_DATA=/var/lib/yona/data",
    "repo/",
    "uploads/",
    "git",
    "subversion",
    "curl",
    "ca-certificates",
  ]) {
    assert.ok(guidance.includes(token), `expected guidance to include ${token}`);
  }
});

test("kubernetes guidance points operators at existing release smokes", () => {
  assert.match(guidance, /pnpm smoke:embedded-assets/u);
  assert.match(guidance, /pnpm smoke:docker/u);
  assert.match(guidance, /\/api\/auth\/session/u);
  assert.match(guidance, /\/api\/v1\/projects/u);
});
