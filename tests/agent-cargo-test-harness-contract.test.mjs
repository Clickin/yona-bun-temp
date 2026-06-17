import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cargoCommand,
  codexSandboxReason,
  formatCommand,
  parseArgs,
  runAgentCargoTest,
  shellQuote,
} from "../tools/agent-cargo-test.mjs";

describe("agent cargo test harness contract", () => {
  it("wraps cargo test args without swallowing cargo's test separator", () => {
    const options = parseArgs([
      "--",
      "-p",
      "yona-rust-pilot-server",
      "--test",
      "rest_contract",
      "target_test",
      "--",
      "--nocapture",
    ]);

    assert.deepEqual(options.cargoArgs, [
      "-p",
      "yona-rust-pilot-server",
      "--test",
      "rest_contract",
      "target_test",
      "--",
      "--nocapture",
    ]);
    assert.deepEqual(cargoCommand(options), {
      args: [
        "test",
        "-p",
        "yona-rust-pilot-server",
        "--test",
        "rest_contract",
        "target_test",
        "--",
        "--nocapture",
      ],
      command: "cargo",
    });
  });

  it("accepts harness options before cargo arguments", () => {
    assert.deepEqual(
      parseArgs(["--", "--log-dir", ".tmp/logs", "--tail-lines", "12"]).logDir,
      ".tmp/logs",
    );
    assert.equal(parseArgs(["--", "--cargo-bin", "/opt/cargo", "--dry-run"]).cargoBin, "/opt/cargo");
    assert.equal(parseArgs(["--", "--tail-lines", "0"]).tailLines, 0);
    assert.equal(parseArgs(["--", "--allow-sandbox"]).allowSandbox, true);
    assert.equal(parseArgs(["--", "--dry-run", "-p", "server"]).dryRun, true);
    assert.deepEqual(parseArgs(["--", "--dry-run", "-p", "server"]).cargoArgs, ["-p", "server"]);
  });

  it("formats commands safely for the log header", () => {
    assert.equal(shellQuote("plain-token_1"), "plain-token_1");
    assert.equal(shellQuote("needs space"), "'needs space'");
    assert.equal(formatCommand("cargo", ["test", "filter with space"]), "cargo test 'filter with space'");
  });

  it("rejects invalid harness option values", () => {
    assert.throws(() => parseArgs(["--log-dir"]), /requires a value/u);
    assert.throws(() => parseArgs(["--tail-lines", "-1"]), /non-negative integer/u);
  });

  it("detects Codex sandbox environments", () => {
    assert.equal(codexSandboxReason({}), null);
    assert.equal(codexSandboxReason({ CODEX_SANDBOX: "seatbelt" }), "CODEX_SANDBOX=seatbelt");
    assert.equal(codexSandboxReason({ CODEX_SANDBOX_NETWORK_DISABLED: "1" }), null);
  });

  it("refuses real cargo test execution inside the Codex sandbox", async () => {
    await assert.rejects(
      () =>
        runAgentCargoTest(
          {
            ...parseArgs(["-p", "yona-rust-pilot-server"]),
            logDir: ".tmp/agent-cargo-test-contract",
          },
          { CODEX_SANDBOX: "seatbelt" },
        ),
      /refusing to run cargo test inside the Codex sandbox/u,
    );
  });
});
