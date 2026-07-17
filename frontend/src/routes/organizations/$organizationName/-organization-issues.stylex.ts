import * as stylex from "@stylexjs/stylex";

export const organizationIssuesTheme = stylex.defineVars({
  border: "#dddddd",
  inputBorder: "#cccccc",
  inputText: "#555555",
  searchSurface: "#ffffff",
  emptySurface: "#f7f7f7",
  rowBorder: "#eeeeee",
  metaText: "#777777",
  paginationText: "#777777",
});

export const styles = stylex.create({
  search: { backgroundColor: organizationIssuesTheme.searchSurface },
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  searchBar: {
    backgroundColor: organizationIssuesTheme.searchSurface,
    borderColor: organizationIssuesTheme.inputBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    padding: "4px 25px 4px 5px",
    position: "relative",
  },
  searchInput: {
    borderStyle: "none",
    borderWidth: "0px",
    color: organizationIssuesTheme.inputText,
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
    borderBottomColor: organizationIssuesTheme.border,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    listStyle: "none",
    margin: "0px",
    padding: "0px",
  },
  list: { listStyle: "none" },
  empty: { backgroundColor: organizationIssuesTheme.emptySurface },
  row: { borderBottomColor: organizationIssuesTheme.rowBorder },
  meta: { color: organizationIssuesTheme.metaText },
  pagination: { color: organizationIssuesTheme.paginationText },
});
