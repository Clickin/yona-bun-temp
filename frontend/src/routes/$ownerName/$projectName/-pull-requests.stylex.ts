import * as stylex from "@stylexjs/stylex";

export const pullRequestColors = stylex.defineVars({
  badge: "#51aacc",
  border: "#ddd",
  inputBorder: "#ccc",
  inputText: "#555",
  link: "#3592b5",
  grayText: "#ccc",
});
export const styles = stylex.create({
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  searchColumn: { paddingTop: "0px" },
  searchColumnHidden: { display: "none" },
  searchBar: {
    borderColor: pullRequestColors.inputBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    padding: "4px 25px 4px 5px",
    position: "relative",
  },
  searchInput: {
    borderStyle: "none",
    borderWidth: "0px",
    color: pullRequestColors.inputText,
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
    borderBottomColor: pullRequestColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    listStyle: "none",
    margin: "0px",
    padding: "0px",
  },
  recentlyPushedBranch: { fontWeight: "700", marginLeft: "5px" },
  reviewProgressItem: { marginRight: "10px" },
  reviewProgressBar: (width) => ({ width }),
  reviewerCount: { marginTop: "-1px" },
  badge: { color: pullRequestColors.badge, fontWeight: "700", marginLeft: "4px" },
  content: { clear: "both", paddingTop: "15px" },
  twoColumnPopover: { display: "block", left: "-75px", top: "-74px" },
  rowPointer: { cursor: "pointer" },
  grayTextSeparator: { color: pullRequestColors.grayText },
});
