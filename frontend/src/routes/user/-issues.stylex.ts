import * as stylex from "@stylexjs/stylex";

// user/partial_issues.scala.html issue title paint only. Geometry stays in the frozen legacy cascade.
export const userIssuesColors = stylex.defineVars({
  inputBorder: "#cccccc",
  inputText: "#555555",
  tabBorder: "#dddddd",
  issueTitle: "#333333",
});

export const styles = stylex.create({
  issueTitle: {
    color: userIssuesColors.issueTitle,
    fontSize: "15px",
    fontWeight: 600,
  },
  page: { margin: "0px auto", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  searchBar: {
    borderColor: userIssuesColors.inputBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    padding: "4px 25px 4px 5px",
    position: "relative",
  },
  searchInput: {
    borderStyle: "none",
    borderWidth: "0px",
    color: userIssuesColors.inputText,
    height: "20px",
    padding: "0px 5px",
  },
  searchButton: {
    backgroundColor: "transparent",
    borderStyle: "none",
    borderWidth: "0px",
    position: "absolute",
    right: "5px",
    top: "5px",
  },
  tabs: {
    borderBottomColor: userIssuesColors.tabBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
  },
});
