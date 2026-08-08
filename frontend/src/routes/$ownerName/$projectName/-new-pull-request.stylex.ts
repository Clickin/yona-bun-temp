import * as stylex from "@stylexjs/stylex";

export const newPullRequestTheme = stylex.defineVars({ formSurface: "#ffffff" });

export const styles = stylex.create({
  selectors: { display: "block", marginBottom: "20px", minHeight: "55px", position: "relative" },
  fromColumn: { float: "left" },
  toColumn: { float: "right" },
  projectSelect: { marginRight: "5px" },
  fieldTitle: { display: "block", fontWeight: "700" },
  arrow: {
    color: "#7e7e7e",
    fontSize: "32px",
    left: "50%",
    marginLeft: "-16px",
    position: "absolute",
    textAlign: "center",
    top: "20px",
  },
  form: { backgroundColor: newPullRequestTheme.formSurface },
  editorWrapper: { position: "relative" },
  markdownEditorWrapper: { marginTop: "10px" },
  branchPicker: { width: "220px" },
  select2Choice: {
    boxSizing: "border-box",
    width: "100%",
    height: "auto",
    textAlign: "left",
  },
  editorTabContent: { position: "relative", overflow: "visible" },
  conflictModalOpen: { display: "block" },
  conflictModalClosed: { display: "none" },
  conflictMessage: { textAlign: "center" },
  conflictActions: { textAlign: "center" },
  uploadSaveHelp: { textAlign: "right" },
  // legacy .upload-wrap{padding:10px !important} + .content-footer
  // (bg #f5f5f5, radius 5px) — _page.less:3606,3821; the app otherwise
  // renders the attach/paste lines without the wrap padding
  // (#upload height 50 vs legacy 70 desktop, 80 vs 100 mobile).
  uploadWrap: {
    backgroundColor: "#f5f5f5",
    borderRadius: "5px",
    padding: "10px",
  },
});
