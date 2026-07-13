import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_TAIL_LINES = 80;

export function parseCargoHarnessArgs(argv, config) {
  const options = {
    allowSandbox: false,
    cargoArgs: [],
    cargoBin: "cargo",
    dryRun: false,
    logDir: config.defaultLogDir,
    outsideSandbox: false,
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
    if (arg === "--outside-sandbox") {
      options.outsideSandbox = true;
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

  if (config.requireCargoArgs && options.cargoArgs.length === 0) {
    throw new Error(config.missingArgsMessage);
  }

  return options;
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

export async function runCargoHarness(options, env = process.env, config) {
  const sandboxReason = codexSandboxReason(env);
  if (!options.allowSandbox && !options.dryRun && sandboxReason) {
    console.error(
      `${config.label}: refusing to run cargo inside Codex sandbox (${sandboxReason}). ` +
        config.sandboxHelp,
    );
    return { logPath: null, status: 1 };
  }
  if (!options.allowSandbox && !options.dryRun && !options.outsideSandbox) {
    console.error(
      `${config.label}: refusing to run cargo without --outside-sandbox. ` +
        config.sandboxHelp,
    );
    return { logPath: null, status: 1 };
  }

  const { args, command } = config.command(options);
  const logDir = resolve(process.cwd(), options.logDir);
  mkdirSync(logDir, { recursive: true });
  const logPath = join(logDir, `${config.logPrefix}-${timestampSlug()}.log`);
  mkdirSync(dirname(logPath), { recursive: true });

  const renderedCommand = formatCommand(command, args);
  console.log(`${config.label}: running ${renderedCommand}`);
  console.log(`${config.label}: log ${logPath}`);
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
      log.write(`\n${config.label} spawn error: ${error.message}\n`);
      resolveStatus(1);
    });
    child.on("close", (code, signal) => {
      if (signal) {
        log.write(`\n${config.label} signal: ${signal}\n`);
        resolveStatus(1);
        return;
      }
      resolveStatus(code ?? 1);
    });
  });

  await new Promise((resolveClose) => log.end(resolveClose));

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  if (status === 0) {
    console.log(`${config.label}: passed in ${elapsedSeconds}s`);
    return { logPath, status };
  }

  console.error(`${config.label}: failed with status ${status} after ${elapsedSeconds}s`);
  const tail = tailLines(logPath, options.tailLines);
  if (tail) {
    console.error(`${config.label}: last ${options.tailLines} log line(s):\n${tail}`);
  }
  return { logPath, status };
}
