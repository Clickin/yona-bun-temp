import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_LOG_DIR = ".agent/cargo-logs";
const DEFAULT_TAIL_LINES = 80;

export function parseArgs(argv) {
  const options = {
    allowSandbox: false,
    cargoArgs: [],
    cargoBin: "cargo",
    dryRun: false,
    logDir: DEFAULT_LOG_DIR,
    tailLines: DEFAULT_TAIL_LINES,
  };

  let consumedPnpmSeparator = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      if (!consumedPnpmSeparator && index === 0) {
        consumedPnpmSeparator = true;
        continue;
      }
      options.cargoArgs.push(...argv.slice(index));
      break;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--allow-sandbox") {
      options.allowSandbox = true;
      continue;
    }
    if (arg === "--cargo-bin") {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error("--cargo-bin requires a value.");
      }
      options.cargoBin = value;
      index += 1;
      continue;
    }
    if (arg === "--log-dir") {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error("--log-dir requires a value.");
      }
      options.logDir = value;
      index += 1;
      continue;
    }
    if (arg === "--tail-lines") {
      const value = Number.parseInt(argv[index + 1] ?? "", 10);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error("--tail-lines requires a non-negative integer.");
      }
      options.tailLines = value;
      index += 1;
      continue;
    }
    options.cargoArgs.push(arg);
  }

  if (options.cargoArgs.length === 0) {
    throw new Error("agent-cargo requires cargo arguments, for example: pnpm agent:cargo -- check --lib");
  }

  return options;
}

export function cargoCommand(options) {
  return {
    args: options.cargoArgs,
    command: options.cargoBin,
  };
}

export function codexSandboxReason(env = process.env) {
  if (env.CODEX_SANDBOX) {
    return `CODEX_SANDBOX=${env.CODEX_SANDBOX}`;
  }
  return null;
}

export function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=@+-]+$/u.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function formatCommand(command, args) {
  return [command, ...args].map(shellQuote).join(" ");
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replaceAll(":", "").replaceAll(".", "-");
}

function tailLines(path, lineCount) {
  if (lineCount === 0) {
    return "";
  }
  const lines = readFileSync(path, "utf8").trimEnd().split(/\r?\n/u);
  return lines.slice(-lineCount).join("\n");
}

export async function runAgentCargo(options, env = process.env) {
  const sandboxReason = codexSandboxReason(env);
  if (!options.allowSandbox && !options.dryRun && sandboxReason) {
    console.error(
      `agent-cargo: refusing to run cargo inside Codex sandbox (${sandboxReason}). ` +
        "Run the whole command with sandbox escalation/require_escalated; this pnpm wrapper is only a guard/log harness and cannot escape the sandbox by itself.",
    );
    return { logPath: null, status: 1 };
  }

  const { args, command } = cargoCommand(options);
  const logDir = resolve(process.cwd(), options.logDir);
  mkdirSync(logDir, { recursive: true });
  const logPath = join(logDir, `cargo-${timestampSlug()}.log`);
  mkdirSync(dirname(logPath), { recursive: true });

  const renderedCommand = formatCommand(command, args);
  console.log(`agent-cargo: running ${renderedCommand}`);
  console.log(`agent-cargo: log ${logPath}`);

  if (options.dryRun) {
    return { logPath, status: 0 };
  }

  const startedAt = Date.now();
  const log = createWriteStream(logPath, { flags: "a" });
  log.write(`$ ${renderedCommand}\n`);
  log.write(`cwd: ${process.cwd()}\n\n`);

  const child = spawn(command, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });

  const status = await new Promise((resolveStatus) => {
    child.on("error", (error) => {
      log.write(`\nagent-cargo spawn error: ${error.message}\n`);
      resolveStatus(1);
    });
    child.on("close", (code, signal) => {
      if (signal) {
        log.write(`\nagent-cargo signal: ${signal}\n`);
        resolveStatus(1);
        return;
      }
      resolveStatus(code ?? 1);
    });
  });

  await new Promise((resolveClose) => log.end(resolveClose));

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  if (status === 0) {
    console.log(`agent-cargo: passed in ${elapsedSeconds}s`);
    return { logPath, status };
  }

  console.error(`agent-cargo: failed with status ${status} after ${elapsedSeconds}s`);
  const tail = tailLines(logPath, options.tailLines);
  if (tail) {
    console.error(`agent-cargo: last ${options.tailLines} log line(s):\n${tail}`);
  }
  return { logPath, status };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runAgentCargo(parseArgs(process.argv.slice(2)));
    process.exitCode = result.status;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
