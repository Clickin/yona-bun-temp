import { describe, expect, it } from "vitest";
import {
  highlightCodeBlock,
  MAX_HIGHLIGHTED_CODE_BLOCK_LENGTH,
  MAX_HIGHLIGHTED_CODE_BLOCK_LINES,
} from "./routes/-syntax-highlighting";

describe("syntax highlighting safety limits", () => {
  it("highlights small SQL blocks", () => {
    const highlighted = highlightCodeBlock("SELECT id FROM issue WHERE id = 1;", "sql");

    expect(JSON.stringify(highlighted)).toContain("syntax-token");
  });

  it("returns plain source for oversized code blocks", () => {
    const sqlLine = "SELECT body FROM issue WHERE body LIKE '%markdown%';";
    const code = `${`${sqlLine}\n`.repeat(
      Math.ceil((MAX_HIGHLIGHTED_CODE_BLOCK_LENGTH + 1) / sqlLine.length),
    )}SELECT tail;`;

    expect(code.length).toBeGreaterThan(MAX_HIGHLIGHTED_CODE_BLOCK_LENGTH);
    expect(highlightCodeBlock(code, "sql")).toBe(code);
  });

  it("returns plain source for high-line-count code blocks", () => {
    const code = Array.from(
      { length: MAX_HIGHLIGHTED_CODE_BLOCK_LINES + 1 },
      (_, index) => `SELECT ${index};`,
    ).join("\n");

    expect(highlightCodeBlock(code, "sql")).toBe(code);
  });
});
