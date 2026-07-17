import * as stylex from "@stylexjs/stylex";

// Frozen `_page.less` `.branch-list-wrap` paint declarations.  Only values
// which may change with a dark theme are tokens; table geometry stays in the
// route declarations so this screen does not turn the global theme into a
// layout registry.
export const projectBranchesTheme = stylex.defineVars({
  headerBackground: "#f5f5f5",
  headRowBackground: "#fafafa",
  rowBorder: "#e5e5e5",
  headerBorder: "#cccccc",
  branchLink: "#51aacc",
  defaultBadgeBackground: "#ffffff",
  defaultBadgeBorder: "rgba(0, 0, 0, 0.1)",
  defaultBadgeText: "#0088cc",
  commitDateText: "#777777",
  disabledPullRequestText: "#cdcdcd",
  openDot: "#b6da54",
  closedDot: "#fd6956",
  mergedDot: "#65c9df",
});
