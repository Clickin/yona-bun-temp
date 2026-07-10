import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import {
  extractInitialAssetReferences,
  fetchInitialAssets,
  resolveSmokeBasePath,
} from "./smoke-embedded-assets.mjs";

const execFileAsync = promisify(execFile);
const indexUrl = "http://127.0.0.1:3000/team/yoram/";

test("smoke module import does not build assets or start a server", async () => {
  const moduleUrl = new URL("./smoke-embedded-assets.mjs", import.meta.url);
  const { stderr, stdout } = await execFileAsync(process.execPath, [
    "--input-type=module",
    "--eval",
    `await import(${JSON.stringify(moduleUrl.href)}); process.stdout.write("imported")`,
  ]);

  assert.equal(stdout, "imported");
  assert.equal(stderr, "");
});

test("smoke defaults to an arbitrary nested base path and accepts an override", () => {
  assert.equal(resolveSmokeBasePath({}), "/team/yoram");
  assert.equal(
    resolveSmokeBasePath({ YONA_SMOKE_BASE_PATH: "/division/tools/" }),
    "/division/tools",
  );
});

test("extractInitialAssetReferences structurally finds initial same-origin assets", () => {
  const html = `
    <!doctype html>
    <html>
      <head>
        <LINK href='/team/yoram/legacy-assets/images/favicon.ico' REL="shortcut icon">
        <link href=/team/yoram/legacy-assets/stylesheets/yobi.css rel=stylesheet>
        <link crossorigin rel="modulepreload" href="/team/yoram/assets/vendor.js">
        <script SRC="./assets/app.js" TYPE='module'></script>
        <script type="module" src="https://cdn.example.test/external.js"></script>
      </head>
    </html>
  `;

  assert.deepEqual(extractInitialAssetReferences(html, indexUrl, "/team/yoram"), [
    {
      kind: "icon",
      url: "http://127.0.0.1:3000/team/yoram/legacy-assets/images/favicon.ico",
    },
    {
      kind: "stylesheet",
      url: "http://127.0.0.1:3000/team/yoram/legacy-assets/stylesheets/yobi.css",
    },
    {
      kind: "modulepreload",
      url: "http://127.0.0.1:3000/team/yoram/assets/vendor.js",
    },
    {
      kind: "module-script",
      url: "http://127.0.0.1:3000/team/yoram/assets/app.js",
    },
  ]);
});

test("extractInitialAssetReferences rejects same-origin assets outside the configured base", () => {
  const html = `
    <link rel="icon" href="/team/yoram/favicon.ico">
    <link rel="stylesheet" href="/legacy-assets/yobi.css">
    <script type="module" src="/team/yoram/assets/app.js"></script>
  `;

  assert.throws(
    () => extractInitialAssetReferences(html, indexUrl, "/team/yoram"),
    /outside configured base path.*\/legacy-assets\/yobi\.css/u,
  );
});

test("extractInitialAssetReferences requires the initial icon, stylesheet, and module script", () => {
  const html = `
    <link rel="stylesheet" href="/team/yoram/assets/app.css">
    <script type="module" src="/team/yoram/assets/app.js"></script>
  `;

  assert.throws(
    () => extractInitialAssetReferences(html, indexUrl, "/team/yoram"),
    /missing initial asset references: icon/u,
  );
});

test("fetchInitialAssets accepts non-empty typed assets", async () => {
  const references = [
    { kind: "icon", url: "http://assets.test/favicon.ico" },
    { kind: "stylesheet", url: "http://assets.test/app.css" },
    { kind: "module-script", url: "http://assets.test/app.js" },
  ];
  const responses = new Map([
    ["http://assets.test/favicon.ico", ["icon", "image/x-icon"]],
    ["http://assets.test/app.css", ["body {}", "text/css; charset=utf-8"]],
    ["http://assets.test/app.js", ["export {};", "text/javascript"]],
  ]);

  const results = await fetchInitialAssets(references, async (url) => {
    const [body, contentType] = responses.get(url);
    return new Response(body, { headers: { "content-type": contentType } });
  });

  assert.deepEqual(
    results.map(({ bodyLength, contentType, kind, status }) => ({
      bodyLength,
      contentType,
      kind,
      status,
    })),
    [
      { bodyLength: 4, contentType: "image/x-icon", kind: "icon", status: 200 },
      {
        bodyLength: 7,
        contentType: "text/css; charset=utf-8",
        kind: "stylesheet",
        status: 200,
      },
      {
        bodyLength: 10,
        contentType: "text/javascript",
        kind: "module-script",
        status: 200,
      },
    ],
  );
});

test("fetchInitialAssets rejects a 200 SPA HTML fallback for every asset kind", async () => {
  await assert.rejects(
    fetchInitialAssets(
      [{ kind: "icon", url: "http://assets.test/favicon.ico" }],
      async () =>
        new Response("<html>fallback</html>", { headers: { "content-type": "text/html" } }),
    ),
    /favicon\.ico.*served as text\/html/u,
  );
});

test("fetchInitialAssets requires CSS media type for stylesheets", async () => {
  await assert.rejects(
    fetchInitialAssets(
      [{ kind: "stylesheet", url: "http://assets.test/app.css" }],
      async () => new Response("body {}", { headers: { "content-type": "text/plain" } }),
    ),
    /app\.css.*expected text\/css.*text\/plain/u,
  );
});

test("fetchInitialAssets rejects non-200 and empty asset responses", async () => {
  await assert.rejects(
    fetchInitialAssets(
      [{ kind: "module-script", url: "http://assets.test/missing.js" }],
      async () => new Response("missing", { status: 404 }),
    ),
    /missing\.js returned 404/u,
  );
  await assert.rejects(
    fetchInitialAssets(
      [{ kind: "module-script", url: "http://assets.test/empty.js" }],
      async () => new Response("", { headers: { "content-type": "text/javascript" } }),
    ),
    /empty\.js returned an empty body/u,
  );
});
