// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { MarkdownEditor } from "./markdown-editor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Default client preview replaces the server roundtrip used by legacy issueform/postForm screens.
test("renders typed markdown in the default preview", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MarkdownEditor
        wrapperClassName="markdown-editor"
        tabContentClassName="tab-content"
        help={null}
        editPaneId="edit-body"
        textareaName="body"
        textareaId="editor-body"
        textareaDefaultValue=""
        previewPaneId="preview-body"
      />,
    );
  });

  const textarea = container.querySelector<HTMLTextAreaElement>("textarea");
  if (!textarea) throw new Error("textarea not rendered");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
      textarea,
      "**bold**",
    );
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const previewTab = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Preview",
  );
  if (!previewTab) throw new Error("preview tab not rendered");
  await act(async () => previewTab.click());

  expect(container.querySelector("#preview-body strong")?.textContent).toBe("bold");
  root.unmount();
  container.remove();
});
