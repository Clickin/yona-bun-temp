import * as stylex from "@stylexjs/stylex";

export const issuesTheme = stylex.defineVars({ resultsSurface: "#ffffff" });

export const styles = stylex.create({ results: { backgroundColor: issuesTheme.resultsSurface } });
