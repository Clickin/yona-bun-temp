import * as stylex from "@stylexjs/stylex";

export const issueEditColors = stylex.defineVars({
  action: "#49afcd",
  inputBorder: "#cccccc",
  inputText: "#555555",
  editorBorder: "#dddddd",
  optionBorder: "#dddddd",
});

export const styles = stylex.create({
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  form: { margin: "0px" },
  title: {
    borderColor: issueEditColors.inputBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: issueEditColors.inputText,
    fontSize: "20px",
    padding: "4px",
    width: "100%",
  },
  editor: {
    borderColor: issueEditColors.editorBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    minHeight: "300px",
    width: "100%",
  },
  editorPositioned: { position: "relative" },
  editorTabContent: { position: "relative", overflow: "visible" },
  assigneeInput: { width: "100%" },
  assigneePicker: { width: "100%" },
  labelPicker: { display: "inline-block" },
  labelSearchInput: { width: "10px" },
  pasteHelp: { display: "block" },
  actions: { margin: "10px 0px", textAlign: "right" },
  issueOption: {
    borderTopColor: issueEditColors.optionBorder,
    width: "100%",
  },
  sidebar: { minWidth: "0px" },
  subtask: { display: "block" },
  save: {
    backgroundColor: issueEditColors.action,
    borderColor: issueEditColors.action,
    borderRadius: "4px",
    borderStyle: "solid",
    borderWidth: "1px",
    color: "#fff",
    padding: "4px 12px",
  },
});
