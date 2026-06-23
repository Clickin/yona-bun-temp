import {
  codexSandboxReason,
  formatCommand,
  parseCargoHarnessArgs,
  runCargoHarness,
  shellQuote,
} from "./agent-cargo-harness.mjs";

const DEFAULT_LOG_DIR = ".agent/cargo-test-logs";

export { codexSandboxReason, formatCommand, shellQuote };

export function parseArgs(argv) {
  return parseCargoHarnessArgs(argv, {
    defaultLogDir: DEFAULT_LOG_DIR,
    missingArgsMessage: "",
    requireCargoArgs: false,
  });
}

export function cargoCommand(options) {
  return {
    args: ["test", ...options.cargoArgs],
    command: options.cargoBin,
  };
}

export function runAgentCargoTest(options, env) {
  return runCargoHarness(options, env, {
    command: cargoCommand,
    label: "agent-cargo-test",
    logPrefix: "cargo-test",
    sandboxHelp:
      "Run the whole command with sandbox escalation/require_escalated and pass --outside-sandbox; this pnpm wrapper is only a guard/log harness and cannot escape the sandbox by itself. Pass --allow-sandbox only for intentional diagnostics.",
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runAgentCargoTest(parseArgs(process.argv.slice(2)));
    process.exitCode = result.status;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
