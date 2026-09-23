import { closeDatabase, initializeDatabase } from "./database";
import { handleTrpcRequest } from "./rpc";

await initializeDatabase();
const server = Bun.serve({
  hostname: Bun.env.HOST ?? "127.0.0.1",
  port: Number(Bun.env.PORT ?? 3811),
  fetch: handleTrpcRequest,
});

console.log(`Yoram experiment API listening at ${server.url}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await server.stop(true);
    await closeDatabase();
    process.exit(0);
  });
}
