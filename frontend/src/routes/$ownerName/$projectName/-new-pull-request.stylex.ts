import * as stylex from "@stylexjs/stylex";

export const newPullRequestTheme = stylex.defineVars({ formSurface: "#ffffff" });

export const styles = stylex.create({ form: { backgroundColor: newPullRequestTheme.formSurface } });
