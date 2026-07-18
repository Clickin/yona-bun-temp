import * as stylex from "@stylexjs/stylex";

export const pullRequestDetailColors = stylex.defineVars({
  mutedText: "#777777",
  contentBorder: "#eeeeee",
  accentText: "#337581",
});

export const styles = stylex.create({
  page: { minHeight: "100%" },
  body: { minWidth: 0 },
  author: { color: pullRequestDetailColors.accentText, marginTop: "20px" },
  content: { minWidth: 0, borderColor: pullRequestDetailColors.contentBorder },
  state: { color: pullRequestDetailColors.mutedText },
  actions: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" },
  actionWrapper: { display: "inline-block" },
  comments: { minWidth: 0 },
  reviewers: { display: "inline-block", marginRight: "5px" },
  reviewerSummary: { fontSize: "13px", verticalAlign: "middle", margin: "0 10px" },
  helpModalVisible: { display: "block" },
  helpModalHidden: { display: "none" },
  branchInfoCode: {
    backgroundColor: "transparent",
    border: "none",
    color: "#2a7f8f",
    padding: "0",
  },
  branchInfoLink: { color: "#2a7f8f" },
  branchName: { color: "#51aacc" },
  branchInfoIcon: { color: "#2a7f8f", fontSize: "12px", margin: "0 5px" },
});
