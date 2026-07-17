import * as stylex from "@stylexjs/stylex";

export const postsTheme = stylex.defineVars({ searchSurface: "#ffffff" });

export const styles = stylex.create({
  search: { backgroundColor: postsTheme.searchSurface },
  twoColumnMode: { position: "relative" },
  keymap: { marginLeft: "55px", padding: "10px 0" },
});
