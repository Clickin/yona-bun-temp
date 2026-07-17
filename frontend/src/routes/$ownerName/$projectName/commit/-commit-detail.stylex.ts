import * as stylex from "@stylexjs/stylex";

export const commitDetailColors = stylex.defineVars({
  commitText: "#333333",
  diffSurface: "#f5f5f5",
  link: "#3592b5",
  metaText: "#999999",
});

export const styles = stylex.create({
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  browse: { width: "100%" },
  commitInfo: { color: commitDetailColors.commitText, margin: "10px 0px" },
  commitMessage: { color: commitDetailColors.commitText },
  commitDescription: {
    backgroundColor: commitDetailColors.diffSurface,
    color: commitDetailColors.commitText,
    margin: "5px 0px",
    padding: "10px",
    whiteSpace: "pre-wrap",
  },
  diffBody: { overflowX: "auto" },
});
