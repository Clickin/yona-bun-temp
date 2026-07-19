import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeBasePath, resolveDevConfig } from "./dev-config.mjs";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

test("normalizeBasePath keeps root as the default local dev mount", () => {
  assert.equal(normalizeBasePath(undefined), "/");
  assert.equal(normalizeBasePath("/"), "/");
});

test("resolveDevConfig defaults pnpm dev entrypoints to repo-root mounting", () => {
  const config = resolveDevConfig({});

  assert.deepEqual(
    {
      backendSessionUrl: config.backendSessionUrl,
      basePath: config.basePath,
      frontendUrl: config.frontendUrl,
    },
    {
      backendSessionUrl: "http://127.0.0.1:8089/api/auth/session",
      basePath: "/",
      frontendUrl: "http://127.0.0.1:3101/",
    },
  );
});

test("resolveDevConfig still supports mounted-base-path smoke runs", () => {
  const config = resolveDevConfig({
    YONA_DEV_BASE_PATH: "/yona/",
    YONA_DEV_BACKEND_TARGET: "http://127.0.0.1:9090",
    YONA_DEV_PUBLIC_ORIGIN: "http://127.0.0.1:4100",
  });

  assert.deepEqual(
    {
      backendSessionUrl: config.backendSessionUrl,
      basePath: config.basePath,
      frontendUrl: config.frontendUrl,
    },
    {
      backendSessionUrl: "http://127.0.0.1:9090/yona/api/auth/session",
      basePath: "/yona",
      frontendUrl: "http://127.0.0.1:4100/yona/",
    },
  );
});

test("vite dev proxy preserves mounted legacy direct compatibility surfaces", () => {
  const source = readFileSync(resolve(repoRoot, "frontend/vite.config.ts"), "utf8");

  assert.match(source, /"-_-api"/u);
  assert.match(source, /"markdown"/u);
  assert.match(source, /"logout"/u);
  assert.match(source, /"user\/sidebar"/u);
  assert.match(source, /"user\/usermenuTabContentList"/u);
  assert.match(source, /"users\/logout"/u);
  assert.match(source, /mentionListAtCommitDiff/u);
  assert.match(source, /acceptValue\.includes\("text\/html"\)/u);
  assert.match(source, /return request\.url/u);
  assert.match(source, /mode === "production" \? "\.\/" : basePath/u);
});
