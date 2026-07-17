import * as stylex from "@stylexjs/stylex";

export const newPullRequestTheme = stylex.defineVars({ formSurface: "#ffffff" });

export const styles = stylex.create({
  form: { backgroundColor: newPullRequestTheme.formSurface },
  editorWrapper: { position: "relative" },
  branchPicker: { width: "220px" },
  editorTabContent: { position: "relative", overflow: "visible" },
  conflictModalOpen: { display: "block" },
  conflictModalClosed: { display: "none" },
});
