import * as stylex from "@stylexjs/stylex";

export const postEditFormTheme = stylex.defineVars({
  notificationText: "#777777",
  uploadSurface: "#fafafa",
});

export const styles = stylex.create({
  form: { position: "relative" },
  actions: { textAlign: "right" },
  options: { textAlign: "right" },
  editorWrapper: { position: "relative" },
  editorTabs: { position: "relative" },
  editorContent: { overflow: "visible", position: "relative" },
  notificationReceiver: { color: postEditFormTheme.notificationText },
  upload: { backgroundColor: postEditFormTheme.uploadSurface },
  uploadSaveHelp: { textAlign: "right" },
  pasteHelpVisible: { display: "block" },
});
