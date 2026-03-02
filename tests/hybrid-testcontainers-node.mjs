import { spawn } from "node:child_process";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

function runBunDriver(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("bun", ["tests/hybrid-bun-driver.ts", ...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`bun driver failed (${code})\n${stdout}\n${stderr}`));
      }
    });
  });
}

async function runPostgresHybrid() {
  const container = await new PostgreSqlContainer("postgres:13.3-alpine").start();
  try {
    const output = await runBunDriver([`--dialect=pg`, `--url=${container.getConnectionUri()}`]);
    return { dialect: "pg", output: output.stdout.trim() };
  } finally {
    await container.stop();
  }
}

async function runMySqlHybrid() {
  const container = await new MySqlContainer("mysql:8.0.31").start();
  try {
    const output = await runBunDriver([`--dialect=mysql`, `--url=${container.getConnectionUri()}`]);
    return { dialect: "mysql", output: output.stdout.trim() };
  } finally {
    await container.stop();
  }
}

async function runSqliteHybrid() {
  const output = await runBunDriver([`--dialect=sqlite`]);
  return { dialect: "sqlite", output: output.stdout.trim() };
}

async function main() {
  const results = [];
  results.push(await runPostgresHybrid());
  results.push(await runMySqlHybrid());
  results.push(await runSqliteHybrid());

  console.log(JSON.stringify(results, null, 2));
}

await main();
