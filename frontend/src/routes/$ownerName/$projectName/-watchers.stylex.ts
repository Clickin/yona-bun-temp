import * as stylex from "@stylexjs/stylex";

// Frozen paint evidence: _page.less `.members.project .member` / `.member-id`
// and _yobiUI.less `.avatar-wrap`. Only dark-mode override candidates live here.
export const projectWatchersTheme = stylex.defineVars({
  rowBorder: "#dddddd",
  avatarSurface: "#dddddd",
  memberIdText: "#cccccc",
});
