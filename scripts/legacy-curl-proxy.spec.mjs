import test from "node:test";
import assert from "node:assert/strict";
import { parseCurlHeaderBlock, upstreamUrlForRequest } from "./legacy-curl-proxy.mjs";

test("upstreamUrlForRequest preserves path and query against the legacy origin", () => {
  assert.equal(
    upstreamUrlForRequest("http://127.0.0.1:9000", "/admin/sample?tab=issues"),
    "http://127.0.0.1:9000/admin/sample?tab=issues",
  );
});

test("parseCurlHeaderBlock keeps response headers while dropping hop-by-hop headers", () => {
  const parsed = parseCurlHeaderBlock(
    [
      "HTTP/1.1 200 OK",
      "Content-Type: text/html; charset=utf-8",
      "Set-Cookie: PLAY_SESSION=abc; Path=/",
      "Transfer-Encoding: chunked",
      "Connection: keep-alive",
      "",
    ].join("\r\n"),
  );

  assert.equal(parsed.status, 200);
  assert.deepEqual(parsed.headers, [
    ["Content-Type", "text/html; charset=utf-8"],
    ["Set-Cookie", "PLAY_SESSION=abc; Path=/"],
  ]);
});
