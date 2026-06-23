import {
  codexSandboxReason,
  formatCommand,
  parseCargoHarnessArgs,
  runCargoHarness,
  shellQuote,
} from "./agent-cargo-harness.mjs";

const DEFAULT_LOG_DIR = ".agent/cargo-logs";

export { codexSandboxReason, formatCommand, shellQuote };

export function parseArgs(argv) {
  return parseCargoHarnessArgs(argv, {
    defaultLogDir: DEFAULT_LOG_DIR,
    missingArgsMessage:
      "agent-cargo requires cargo arguments, for example: pnpm agent:cargo -- check --lib",
    requireCargoArgs: true,
  });
}

export function cargoCommand(options) {
  return {
    args: options.cargoArgs,
    command: options.cargoBin,
  };
}

export function runAgentCargo(options, env) {
  return runCargoHarness(options, env, {
    command: cargoCommand,
    label: "agent-cargo",
    logPrefix: "cargo",
    sandboxHelp:
      "Run the whole command with sandbox escalation/require_escalated and pass --outside-sandbox; this pnpm wrapper is only a guard/log harness and cannot escape the sandbox by itself.",
  });
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
