import { describe, expect, it } from "vitest";
import {
  insertMarkdownText,
  markdownTextForAttachment,
} from "./routes/-markdown-attachment-textarea";

describe("markdown attachment upload helpers", () => {
  it("formats uploaded image attachments as legacy markdown images", () => {
    expect(
      markdownTextForAttachment({
        id: 1,
        mimeType: "image/png",
        name: "pasted.png",
        size: 8,
        url: "/yona/files/1",
      }),
    ).toBe("![pasted.png](/yona/files/1) ");
  });

  it("inserts uploaded markdown text at the cursor", () => {
    expect(insertMarkdownText("alpha omega", 6, "![drop.png](/yona/files/2) ")).toEqual({
      cursorIndex: 33,
      value: "alpha ![drop.png](/yona/files/2) omega",
    });
  });
});
