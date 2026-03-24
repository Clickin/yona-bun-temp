import { describe, expect, test } from "bun:test";

const parityRuleFragments = [
  "`yona-original`",
  "layout",
  "information architecture",
  "deviation",
  "branding delta",
  "major region",
  "menu",
  "primary action",
  "permission-driven visibility",
];

const files = [
  "G:/programming/yona/SPEC.md",
  "G:/programming/yona/docs/agents/01-frontend-architecture.md",
  "G:/programming/yona/docs/agents/05-agent-execution-guidelines.md",
];

describe("frontend layout parity docs", () => {
  for (const file of files) {
    test(`${file} states the parity guardrail`, async () => {
      const contents = await Bun.file(file).text();

      for (const fragment of parityRuleFragments) {
        expect(contents).toContain(fragment);
      }
    });
  }
});
