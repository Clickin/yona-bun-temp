import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBasePath, resolveDevConfig } from "./dev-config.mjs";

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
