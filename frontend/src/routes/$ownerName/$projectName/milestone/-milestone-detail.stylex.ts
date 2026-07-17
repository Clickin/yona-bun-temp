import * as stylex from "@stylexjs/stylex";

export const milestoneDetailColors = stylex.defineVars({
  action: "#51a351",
  badge: "#51aacc",
  bodyText: "#333333",
  progress: "#fd6956",
  searchBorder: "#cccccc",
});

export const styles = stylex.create({
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  wrap: { color: milestoneDetailColors.bodyText },
  progress: { backgroundColor: "#f5f5f5", borderRadius: "4px", height: "8px", overflow: "hidden" },
  progressBar: { backgroundColor: milestoneDetailColors.progress, height: "100%" },
  actions: { clear: "both", margin: "10px 0px", padding: "15px 0px", textAlign: "right" },
  tabs: { borderBottom: "1px solid #ddd", listStyle: "none", margin: "0px", padding: "0px" },
  tabBadge: { color: milestoneDetailColors.badge, fontWeight: "700", marginLeft: "4px" },
  search: {
    backgroundColor: "#fff",
    borderColor: milestoneDetailColors.searchBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    padding: "4px 25px 4px 5px",
  },
});
