import * as stylex from "@stylexjs/stylex";

export const postFormColors = stylex.defineVars({
  action: "#51a351",
  editorBorder: "#dddddd",
  inputBorder: "#cccccc",
  inputText: "#555555",
  warning: "#f89406",
});

export const styles = stylex.create({
  editorWrapper: { position: "relative" },
  editorTabContent: { overflow: "visible", position: "relative" },
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  form: { margin: "0px" },
  title: {
    borderColor: postFormColors.inputBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: postFormColors.inputText,
    fontSize: "20px",
    padding: "4px",
    width: "100%",
  },
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
  actions: { margin: "10px 0px", textAlign: "right" },
  pasteHelpVisible: { display: "block" },
  uploadAttachSaveHelp: { display: "block", textAlign: "right" },
  save: {
    backgroundColor: postFormColors.action,
    borderColor: postFormColors.action,
    borderRadius: "4px",
    borderStyle: "solid",
    borderWidth: "1px",
    color: "#fff",
    padding: "4px 12px",
  },
  cancel: {
    borderColor: "#ccc",
    borderRadius: "4px",
    borderStyle: "solid",
    borderWidth: "1px",
    color: "#333",
    marginLeft: "4px",
    padding: "4px 12px",
  },
});
