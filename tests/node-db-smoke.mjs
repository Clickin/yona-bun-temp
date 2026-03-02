import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

async function runPostgresSmoke() {
  const container = await new PostgreSqlContainer().start();

  try {
    const result = await container.exec([
      "psql",
      "-U",
      "test",
      "-d",
      "test",
      "-c",
      "SELECT 1 AS ok;",
    ]);

    return {
      database: "postgres",
      started: true,
      exitCode: result.exitCode,
      output: result.output,
    };
  } finally {
    await container.stop();
  }
}

async function runMySqlSmoke() {
  const container = await new MySqlContainer().start();

  try {
    const result = await container.exec([
      "mysql",
      "-utest",
      "-ptest",
      "-e",
      "SELECT 1 AS ok;",
      "test",
    ]);

    return {
      database: "mysql",
      started: true,
      exitCode: result.exitCode,
      output: result.output,
    };
  } finally {
    await container.stop();
  }
}

async function main() {
  const results = [];

  try {
    results.push(await runPostgresSmoke());
    results.push(await runMySqlSmoke());

    const hasFailure = results.some((result) => result.exitCode !== 0);

    console.log(JSON.stringify(results, null, 2));

    if (hasFailure) {
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Node DB smoke test failed:", message);
    process.exit(1);
  }
}

await main();
