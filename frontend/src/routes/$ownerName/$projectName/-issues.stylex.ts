import * as stylex from "@stylexjs/stylex";

export const issuesTheme = stylex.defineVars({ resultsSurface: "#ffffff" });

export const styles = stylex.create({
  downloadWrap: { padding: "10px" },
  keymapWrap: { marginLeft: "55px", padding: "10px 0" },
  manageLabel: { marginLeft: "2px" },
  relativeAnchor: { position: "relative" },
  results: { backgroundColor: issuesTheme.resultsSurface },
});
