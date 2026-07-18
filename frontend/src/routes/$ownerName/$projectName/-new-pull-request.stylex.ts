import * as stylex from "@stylexjs/stylex";

export const newPullRequestTheme = stylex.defineVars({ formSurface: "#ffffff" });

export const styles = stylex.create({
  selectors: { display: "block", marginBottom: "20px", minHeight: "55px", position: "relative" },
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
});
