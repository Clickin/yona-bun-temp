import * as stylex from "@stylexjs/stylex";

export const projectHomeTheme = stylex.defineVars({ pageSurface: "#ffffff" });
export const styles = stylex.create({
  page: { backgroundColor: projectHomeTheme.pageSurface },
  sectionHeading: { borderLeft: "3px solid #ff7332", marginBottom: "20px", paddingLeft: "10px" },
  empty: { textAlign: "center" },
  progressBar: (width: string) => ({ width }),
});
