import * as stylex from "@stylexjs/stylex";

// user/partial_issues.scala.html issue title paint only. Geometry stays in the frozen legacy cascade.
export const userIssuesColors = stylex.defineVars({
  issueTitle: "#333333",
});

export const styles = stylex.create({
  issueTitle: {
    color: userIssuesColors.issueTitle,
    fontSize: "15px",
    fontWeight: 600,
  },
});
