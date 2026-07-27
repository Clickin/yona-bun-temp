import * as stylex from "@stylexjs/stylex";

export const commitsTheme = stylex.defineVars({
  commitIdLink: "#51aacc",
  commentText: "#666666",
  historySurface: "#ffffff",
  mutedText: "#777777",
});

export const styles = stylex.create({
  branchPicker: { float: "right", width: "220px" },
  branchButton: {
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    textAlign: "left",
    width: "100%",
  },
  // `.select2-drop.branches { width: auto !important; }` is the winning
  // frozen legacy declaration; StyleX owns only the stateful display toggle.
  branchDropdown: { display: "block" },
  tabs: { marginBottom: "20px" },
  paginationLink: { float: "left" },
  history: { backgroundColor: commitsTheme.historySurface },
  table: { color: commitsTheme.mutedText },
  emptyWarning: {
    backgroundColor: "#d4d4d4",
    fontSize: "16px",
    textAlign: "center",
  },
  commitIdCell: {
    position: "relative",
    width: "70px",
    padding: "12px 3px",
    textAlign: "center",
    verticalAlign: "top",
    fontFamily: 'Consolas, Menlo, Monaco, "Ubuntu Mono", source-code-pro, monospace',
    fontSize: "12px",
  },
  commitIdLink: { color: commitsTheme.commitIdLink },
  messagesCell: { verticalAlign: "top" },
  dateCell: {
    width: "100px",
    fontSize: "12px",
    verticalAlign: "top",
  },
  authorCell: {
    width: "40px",
    lineHeight: "1",
    textAlign: "right",
    verticalAlign: "top",
  },
  commitMessage: {
    padding: "5px",
    fontSize: "14px",
    textOverflow: "ellipsis",
    verticalAlign: "middle",
    whiteSpace: "pre-line",
    wordBreak: "break-word",
  },
  commentCount: {
    float: "right",
    marginRight: "8px",
    position: "relative",
    color: commitsTheme.commentText,
  },
});
