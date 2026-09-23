import embeddedAssets from "./dist/embedded-assets.mjs";
import startServer from "./dist/server/server.js";

const assets = Object.fromEntries(
  Object.entries(embeddedAssets).map(([name, contents]) => [
    `/assets/${name}`,
    {
      body: contents,
      contentType: name.endsWith(".css")
        ? "text/css; charset=utf-8"
        : "text/javascript; charset=utf-8",
    },
  ]),
);

const server = Bun.serve({
  hostname: Bun.env.HOST ?? "127.0.0.1",
  port: Number(Bun.env.PORT ?? 3810),
  async fetch(request) {
    const asset = assets[new URL(request.url).pathname];
    if (asset) {
      return new Response(asset.body, {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": asset.contentType,
        },
      });
    }
    return startServer.fetch(request);
  },
});

console.log(`Yoram Bun Start app listening at ${server.url}`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await server.stop(true);
    process.exit(0);
  });
}
