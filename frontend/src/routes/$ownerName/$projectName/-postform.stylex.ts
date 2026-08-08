import * as stylex from "@stylexjs/stylex";

export const postFormColors = stylex.defineVars({
  attachedFilesBorder: "#e0e0e0",
  editorBorder: "#dddddd",
  inputBorder: "#cccccc",
  inputText: "#555555",
  uploadSurface: "#f5f5f5",
  warning: "#f89406",
});

export const styles = stylex.create({
  attachedFiles: {
    borderTopColor: postFormColors.attachedFilesBorder,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    display: "none",
    marginBottom: "0px",
    marginTop: "15px",
    paddingBottom: "15px",
    paddingTop: "15px",
  },
  attachWrap: { textAlign: "center" },
  editorWrapper: { position: "relative" },
  markdownEditorWrapper: { marginTop: "10px" },
  editorTabContent: { overflow: "visible", position: "relative" },
  form: { margin: "0px" },
  editor: {
    borderColor: postFormColors.editorBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    minHeight: "300px",
    width: "100%",
  },
  options: {
    marginBottom: "10px",
    marginTop: "10px",
    textAlign: "right",
  },
  uploadButtonWrap: {
    display: "inline-block",
    marginLeft: "5px",
    marginRight: "5px",
    verticalAlign: "top",
  },
  uploadPlain: { display: "inline-block", lineHeight: "30px" },
  uploadWrap: {
    backgroundColor: postFormColors.uploadSurface,
    borderRadius: "5px",
    // legacy .upload-wrap{padding:10px !important} (_page.less:3606)
    padding: "10px",
    // legacy inherits bootstrap body line-height 20px (bootstrap.css:180);
    // the app :root line-height 18px would shrink the droppable-hint line
    // box (mobile #upload height 100 -> 98) — mirror the write-comment-box
    // compensation (app.css:3059).
    lineHeight: "20px",
  },
  actions: { margin: "10px 0px", textAlign: "right" },
  pasteHelpVisible: { display: "block" },
  uploadAttachSaveHelp: { textAlign: "right" },
});
