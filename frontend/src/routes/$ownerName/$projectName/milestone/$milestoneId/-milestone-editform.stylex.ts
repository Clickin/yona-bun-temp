import * as stylex from "@stylexjs/stylex";

// Paint-only owners for frozen milestone/edit output. Form geometry and editor
// sizing remain in the route/contextual legacy cascade.
export const milestoneEditFormTheme = stylex.defineVars({
  inputText: "#555555",
  inputBorder: "#cccccc",
  editorSurface: "transparent",
  mutedText: "#777777",
  optionText: "#333333",
  uploadSurface: "#fafafa",
});

export const milestoneEditFormStyles = stylex.create({
  pasteHelpVisible: { display: "block" },
  editorWrapper: { position: "relative" },
  editorContent: {
    backgroundColor: milestoneEditFormTheme.editorSurface,
    overflow: "visible",
    position: "relative",
  },
});
