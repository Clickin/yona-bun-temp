import * as stylex from "@stylexjs/stylex";

export const milestoneDetailColors = stylex.defineVars({
  action: "#51a351",
  badge: "#51aacc",
  bodyText: "#333333",
  descriptionBorder: "#dddddd",
  descriptionSurface: "#f7f7f7",
  descriptionShadow: "inset 0 0 5px #ffffff",
  progress: "#fd6956",
  searchBorder: "#cccccc",
});

export const styles = stylex.create({
  labelColor: (backgroundColor: string) => ({ backgroundColor }),
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  wrap: { color: milestoneDetailColors.bodyText },
  progress: { backgroundColor: "#f5f5f5", borderRadius: "4px", height: "8px", overflow: "hidden" },
  progressBar: (width: string) => ({
    backgroundColor: milestoneDetailColors.progress,
    height: "100%",
    width,
  }),
  description: {
    backgroundColor: milestoneDetailColors.descriptionSurface,
    borderBottomColor: milestoneDetailColors.descriptionBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderTopColor: milestoneDetailColors.descriptionBorder,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    boxShadow: milestoneDetailColors.descriptionShadow,
    margin: "15px 0px",
    padding: "10px 15px",
  },
  actions: {
    clear: "both",
    display: "block",
    margin: "10px 0px",
    padding: "15px 0px",
    textAlign: "right",
  },
  tabs: { borderBottom: "1px solid #ddd", listStyle: "none", margin: "0px", padding: "0px" },
  tabBadge: { color: milestoneDetailColors.badge, fontWeight: "700", marginLeft: "4px" },
  issueList: { clear: "both", listStyle: "none", margin: "0px", padding: "0px" },
  issueRow: {
    borderBottomColor: milestoneDetailColors.descriptionBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    clear: "both",
    display: "block",
    overflow: "auto",
    padding: "10px 0px",
  },
  issueMeta: { lineHeight: "20px" },
  massUpdate: { position: "relative", transitionDuration: "0.5s", transitionProperty: "padding" },
  search: {
    backgroundColor: "#fff",
    borderColor: milestoneDetailColors.searchBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    padding: "4px 25px 4px 5px",
  },
});
