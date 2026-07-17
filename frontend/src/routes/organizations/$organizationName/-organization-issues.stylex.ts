import * as stylex from "@stylexjs/stylex";

export const organizationIssuesTheme = stylex.defineVars({
  searchSurface: "#ffffff",
});

export const styles = stylex.create({
  search: { backgroundColor: organizationIssuesTheme.searchSurface },
});
