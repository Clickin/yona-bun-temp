import * as stylex from "@stylexjs/stylex";

export const codeBranchTheme = stylex.defineVars({
  listHeaderSurface: "#f7f7f7",
  listBorder: "#efefef",
  listMutedText: "#7e7e7e",
  breadcrumbText: "#555555",
  headerSurface: "#ffffff",
});

export const styles = stylex.create({
  tabs: { marginBottom: "0px" },
  spinner: { left: "50%", position: "fixed", top: "50%" },
  header: {
    backgroundColor: codeBranchTheme.headerSurface,
    display: "block",
    height: "34px",
    marginBottom: "10px",
    marginTop: "10px",
  },
  picker: { width: "220px" },
  pickerChoice: {
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    textAlign: "left",
    width: "100%",
  },
  breadcrumbs: {
    color: codeBranchTheme.breadcrumbText,
    display: "inline-block",
    fontSize: "15px",
    fontWeight: "700",
    lineHeight: "30px",
    padding: "0px 10px 0px 0px",
  },
  list: { overflow: "auto", width: "100%" },
  empty: { borderTopStyle: "none", borderTopWidth: "0px", paddingLeft: "23px" },
  listHeader: {
    backgroundColor: codeBranchTheme.listHeaderSurface,
    boxSizing: "border-box",
    borderBottomColor: codeBranchTheme.listBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "2px",
    height: "40px",
    lineHeight: "40px",
    marginBottom: "5px",
  },
  listHeaderFilename: { paddingLeft: "5px" },
  listHeaderDate: { paddingRight: "5px", textAlign: "right" },
  listRow: {
    borderBottomColor: codeBranchTheme.listBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    lineHeight: "40px",
  },
  listFilename: {
    fontSize: "10pt",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  listMessage: {
    color: codeBranchTheme.listMutedText,
    fontSize: "10pt",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  listDate: {
    color: codeBranchTheme.listMutedText,
    fontSize: "8pt",
    paddingRight: "5px",
    textAlign: "right",
    whiteSpace: "nowrap",
  },
});
