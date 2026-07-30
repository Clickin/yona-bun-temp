import * as stylex from "@stylexjs/stylex";

// code/view.scala.html no-head state and frozen code-alert paint.
export const codeColors = stylex.defineVars({
  alertBorder: "#fbeed5",
  alertSurface: "#fcf8e3",
  alertText: "#c09853",
  headingText: "#333333",
  searchBg: "#ffffff",
  searchBorder: "#e1e4e8",
  textMuted: "#6a737d",
  accentBlue: "#0366d6",
});

export const searchStyles = stylex.create({
  container: {
    padding: "16px",
    backgroundColor: codeColors.searchBg,
    borderRadius: "6px",
    border: `1px solid ${codeColors.searchBorder}`,
    marginTop: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  tabButton: {
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: 600,
    borderRadius: "4px",
    border: `1px solid ${codeColors.searchBorder}`,
    backgroundColor: "#fafbfc",
    color: "#24292e",
    cursor: "pointer",
  },
  tabButtonActive: {
    backgroundColor: codeColors.accentBlue,
    color: "#ffffff",
    borderColor: codeColors.accentBlue,
  },
  form: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },
  searchInput: {
    flexGrow: 1,
    padding: "6px 12px",
    fontSize: "14px",
    border: `1px solid ${codeColors.searchBorder}`,
    borderRadius: "4px",
    outline: "none",
  },
  searchButton: {
    padding: "6px 16px",
    fontSize: "14px",
    fontWeight: 600,
    backgroundColor: codeColors.accentBlue,
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  resultList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  resultItem: {
    padding: "10px 12px",
    borderBottom: `1px solid ${codeColors.searchBorder}`,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  resultItemPath: {
    fontSize: "14px",
    fontWeight: 600,
    color: codeColors.accentBlue,
    textDecoration: "none",
  },
  resultMatchSnippet: {
    fontFamily: 'Consolas, Menlo, Monaco, "Ubuntu Mono", monospace',
    fontSize: "12px",
    backgroundColor: "#f6f8fa",
    padding: "6px 10px",
    borderRadius: "3px",
    color: "#24292e",
    whiteSpace: "pre-wrap",
  },
  lineNumber: {
    color: codeColors.textMuted,
    marginRight: "8px",
    fontWeight: 600,
  },
  emptyState: {
    padding: "20px",
    textAlign: "center",
    color: codeColors.textMuted,
    fontSize: "14px",
  },
});
