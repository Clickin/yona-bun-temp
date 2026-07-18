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
  state: { color: pullRequestDetailColors.mutedText, marginTop: "15px" },
  alert: {
    padding: "15px",
    fontSize: "13px",
    fontWeight: "bold",
    borderRadius: "3px",
  },
  alertIcon: { marginTop: "-2px", fontSize: "15px", verticalAlign: "middle" },
  alertSuccess: { color: "#468847" },
  alertError: { color: "#b94a48" },
  alertWarning: { color: "#c09853" },
  conflictHelp: {
    padding: "10px",
    fontSize: "12px",
    backgroundColor: "#fefefe",
    borderRadius: "2px",
  },
  conflictList: { marginLeft: "30px" },
  conflictCode: { display: "block", fontWeight: "normal", padding: "5px", margin: "5px 0" },
  conflictButton: { margin: "0 5px", fontWeight: "normal" },
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
