import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  cargoCommand,
  codexSandboxReason,
  formatCommand,
  parseArgs,
  runAgentCargo,
  shellQuote,
} from "../tools/agent-cargo.mjs";

describe("agent cargo harness contract", () => {
  it("wraps arbitrary cargo args without injecting a subcommand", () => {
    const options = parseArgs(["--", "check", "-p", "yona-rust-pilot-server", "--lib"]);

    assert.deepEqual(options.cargoArgs, ["check", "-p", "yona-rust-pilot-server", "--lib"]);
    assert.deepEqual(cargoCommand(options), {
      args: ["check", "-p", "yona-rust-pilot-server", "--lib"],
      command: "cargo",
    });
  });

  it("preserves cargo's own separator after the pnpm separator", () => {
    const options = parseArgs(["--", "test", "-p", "server", "target_test", "--", "--nocapture"]);

    assert.deepEqual(options.cargoArgs, [
      "test",
      "-p",
      "server",
      "target_test",
      "--",
      "--nocapture",
    ]);
  });

  it("accepts harness options before cargo arguments", () => {
    assert.equal(parseArgs(["--log-dir", ".tmp/logs", "check"]).logDir, ".tmp/logs");
    assert.equal(parseArgs(["--cargo-bin", "/opt/cargo", "--dry-run", "check"]).cargoBin, "/opt/cargo");
    assert.equal(parseArgs(["--tail-lines", "0", "check"]).tailLines, 0);
    assert.equal(parseArgs(["--allow-sandbox", "check"]).allowSandbox, true);
    assert.equal(parseArgs(["--dry-run", "check"]).dryRun, true);
  });

  it("formats commands safely for the log header", () => {
    assert.equal(shellQuote("plain-token_1"), "plain-token_1");
    assert.equal(shellQuote("needs space"), "'needs space'");
    assert.equal(formatCommand("cargo", ["check", "filter with space"]), "cargo check 'filter with space'");
  });

  it("rejects missing or invalid harness values", () => {
    assert.throws(() => parseArgs([]), /requires cargo arguments/u);
    assert.throws(() => parseArgs(["--log-dir"]), /requires a value/u);
    assert.throws(() => parseArgs(["--tail-lines", "-1", "check"]), /non-negative integer/u);
  });

  it("detects Codex sandbox environments", () => {
    assert.equal(codexSandboxReason({}), null);
    assert.equal(codexSandboxReason({ CODEX_SANDBOX: "seatbelt" }), "CODEX_SANDBOX=seatbelt");
    assert.equal(
      codexSandboxReason({ CODEX_SANDBOX_NETWORK_DISABLED: "1" }),
      "CODEX_SANDBOX_NETWORK_DISABLED=1",
    );
  });

  it("refuses execution when a Codex sandbox marker is present", async () => {
    const result = await runAgentCargo(
      {
        ...parseArgs(["check"]),
        cargoBin: "/bin/echo",
      },
      { CODEX_SANDBOX: "seatbelt" },
    );

    assert.equal(result.status, 1);
    assert.equal(result.logPath, null);
  });

  it("allows intentional sandbox execution when explicitly requested", async () => {
    const logDir = mkdtempSync(join(tmpdir(), "agent-cargo-contract-"));
    try {
      const result = await runAgentCargo(
        {
          ...parseArgs(["--allow-sandbox", "check"]),
          cargoBin: "/bin/echo",
          logDir,
        },
        { CODEX_SANDBOX: "seatbelt" },
      );

      assert.equal(result.status, 0);
    } finally {
      rmSync(logDir, { force: true, recursive: true });
    }
  });
});
