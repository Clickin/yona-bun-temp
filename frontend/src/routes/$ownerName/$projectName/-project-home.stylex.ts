import * as stylex from "@stylexjs/stylex";

export const projectHomeTheme = stylex.defineVars({ pageSurface: "#ffffff" });
export const styles = stylex.create({
  page: { backgroundColor: projectHomeTheme.pageSurface },
  progressBar: (width: string) => ({ width }),
});
