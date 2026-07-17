import * as stylex from "@stylexjs/stylex";

export const postsTheme = stylex.defineVars({ searchSurface: "#ffffff" });

export const styles = stylex.create({ search: { backgroundColor: postsTheme.searchSurface } });
