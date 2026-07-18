import * as stylex from "@stylexjs/stylex";

export const projectHomeTheme = stylex.defineVars({ pageSurface: "#ffffff" });
export const styles = stylex.create({
  page: { backgroundColor: projectHomeTheme.pageSurface },
  sectionHeading: { borderLeft: "3px solid #ff7332", marginBottom: "20px", paddingLeft: "10px" },
  empty: { textAlign: "center" },
  emptyMessage: { color: "#999", fontSize: "13px", marginBottom: "15px" },
  overviewNumber: { paddingRight: "15px", textAlign: "right" },
  milestoneProgressWrap: {
    color: "#999",
    fontSize: "11px",
    overflow: "hidden",
  },
  milestoneProgress: { height: "7px", width: "100%" },
  milestoneProgressBar: (width: string) => ({ height: "100%", width }),
  progressBar: (width: string) => ({ width }),
});
