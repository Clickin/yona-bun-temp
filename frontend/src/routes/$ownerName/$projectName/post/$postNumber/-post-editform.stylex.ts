import * as stylex from "@stylexjs/stylex";

export const postEditFormTheme = stylex.defineVars({
  notificationText: "#777777",
});

export const styles = stylex.create({
  form: { position: "relative" },
  actions: { textAlign: "right" },
  options: { textAlign: "right" },
  editorWrapper: { position: "relative" },
  markdownEditorWrapper: { marginTop: "10px" },
  editorTabs: { position: "relative" },
  editorContent: { overflow: "visible", position: "relative" },
  notificationReceiver: { color: postEditFormTheme.notificationText },
  // legacy .upload-wrap{padding:10px !important} + .content-footer
  // (bg #f5f5f5, radius 5px) — _page.less:3606,3821
  upload: {
    backgroundColor: "#f5f5f5",
    borderRadius: "5px",
    padding: "10px",
  },
  uploadSaveHelp: { textAlign: "right" },
  pasteHelpVisible: { display: "block" },
});
