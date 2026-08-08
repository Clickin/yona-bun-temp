import * as stylex from "@stylexjs/stylex";

export const postEditFormTheme = stylex.defineVars({
  notificationText: "#777777",
});

export const styles = stylex.create({
  form: { position: "relative" },
  // legacy _page.less:3810-3814 — .frm-wrap .actions centers its buttons.
  actions: { textAlign: "center" },
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
    // legacy inherits bootstrap body line-height 20px (bootstrap.css:180);
    // the app :root line-height 18px would shrink the droppable-hint line
    // box (#upload height 70 -> 68 desktop, 100 -> 98 mobile) — mirror the
    // postform uploadWrap compensation (-postform.stylex.ts).
    lineHeight: "20px",
    padding: "10px",
  },
  uploadSaveHelp: { textAlign: "right" },
  pasteHelpVisible: { display: "block" },
});
