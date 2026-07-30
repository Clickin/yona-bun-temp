import * as stylex from "@stylexjs/stylex";

// partial_view_file.scala.html paint tokens; geometry stays in the route styles.
export const codeFileColors = stylex.defineVars({
  metadataText: "#555555",
  markdownBorder: "#cccccc",
  binaryMutedText: "#999999",
  actionText: "#333333",
  popoverText: "#333333",
  commentText: "#666666",
  codeHoverBg: "#f5f5f5",
  codeSelectedBg: "#fffbdd",
  codeSelectedHoverBg: "#fff8b3",
  codeLineNumberText: "#999999",
  codeLineNumberBorder: "#efefef",
  codeLineNumberHoverText: "#333333",
  hljsKeyword: "#d73a49",
  hljsString: "#032f62",
  hljsComment: "#6a737d",
  hljsTitle: "#6f42c1",
  hljsNumber: "#005cc5",
  hljsOperator: "#d73a49",
  hljsAttr: "#005cc5",
  hljsVariable: "#e36209",
  hljsBuiltIn: "#005cc5",
  hljsMeta: "#032f62",
  hljsTag: "#22863a",
  hljsName: "#22863a",
  hljsLiteral: "#005cc5",
  hljsType: "#6f42c1",
});

export const highlightStyles = stylex.create({
  keyword: { color: codeFileColors.hljsKeyword, fontWeight: "bold" },
  string: { color: codeFileColors.hljsString },
  comment: { color: codeFileColors.hljsComment, fontStyle: "italic" },
  title: { color: codeFileColors.hljsTitle, fontWeight: "bold" },
  number: { color: codeFileColors.hljsNumber },
  operator: { color: codeFileColors.hljsOperator },
  attr: { color: codeFileColors.hljsAttr },
  variable: { color: codeFileColors.hljsVariable },
  builtIn: { color: codeFileColors.hljsBuiltIn },
  meta: { color: codeFileColors.hljsMeta },
  tag: { color: codeFileColors.hljsTag },
  name: { color: codeFileColors.hljsName },
  literal: { color: codeFileColors.hljsLiteral },
  type: { color: codeFileColors.hljsType },
  symbol: { color: codeFileColors.hljsNumber },
  bullet: { color: codeFileColors.hljsString },
  params: { color: codeFileColors.metadataText },
});

export const styles = stylex.create({
  errorWrap: {
    padding: "100px 0px",
    textAlign: "center",
  },
  errorIcon: (spriteUrl: string) => ({
    backgroundImage: `url(${spriteUrl})`,
    backgroundPosition: "-80px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "80px",
    verticalAlign: "middle",
    width: "50px",
  }),
  errorMessage: {
    color: "#898989",
    fontSize: "16px",
    fontWeight: "bold",
    margin: "30px 0px",
  },
  folderListWrap: { display: "block" },
  folderRowFluid: { lineHeight: "40px" },
  folderListHead: {
    height: "40px",
    marginBottom: "5px",
    lineHeight: "40px",
    backgroundColor: "#f7f7f7",
    borderBottom: "2px solid #efefef",
  },
  folderRow: { borderBottom: "1px solid #efefef" },
  folderText: { overflow: "hidden", textOverflow: "ellipsis" },
  folderFilename: { fontSize: "10pt", whiteSpace: "nowrap" },
  folderCommitMessage: { color: "#7e7e7e", fontSize: "10pt" },
  folderCommitMessageWrapper: {
    marginLeft: "5px",
  },
  folderCommitDate: {
    paddingRight: "5px",
    color: "#7e7e7e",
    fontSize: "8pt",
    textAlign: "right",
    whiteSpace: "nowrap",
  },
  // view.scala.html #spin inline rule; the loading marker remains React-owned.
  spinner: { left: "50%", position: "fixed", top: "50%" },
  noFiles: {
    borderTop: 0,
    paddingLeft: "23px",
  },
  fileWrap: {
    display: "block",
    width: "100%",
  },
  fileHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "10px",
  },
  fileInfo: {
    color: codeFileColors.metadataText,
    minWidth: 0,
  },
  breadcrumbs: {
    float: "left",
    marginLeft: "10px",
  },
  branchPicker: {
    float: "left",
  },
  downloadAction: {
    float: "right",
  },
  newFileAction: {
    float: "right",
  },
  // partial_view_file.scala.html author link; frozen _common.less .ml5.
  authorLink: {
    marginLeft: "5px",
  },
  commentCount: {
    marginLeft: "5px",
    marginRight: "8px",
    color: codeFileColors.commentText,
  },
  fileActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
    justifyContent: "flex-end",
  },
  imageWrap: {
    padding: "10px",
  },
  image: {
    maxWidth: "100%",
  },
  binaryFile: {
    display: "block",
    width: "100%",
  },
  binarySize: {
    display: "block",
    marginBottom: "20px",
    color: codeFileColors.binaryMutedText,
    fontSize: "13px",
  },
  markdown: {
    border: `1px solid ${codeFileColors.markdownBorder}`,
    borderTop: "none",
    padding: "0 20px 15px 20px",
  },
  code: {
    border: "none",
    margin: "0",
    padding: "0",
    lineHeight: "16px",
  },
  action: { color: codeFileColors.actionText },
  // React-owned replacement for the legacy #open-in-browser popover anchor.
  openBrowserWrap: { display: "inline-block", position: "relative" },
  popover: {
    bottom: "100%",
    color: codeFileColors.popoverText,
    display: "block",
    left: "50%",
    marginBottom: "5px",
    position: "absolute",
    transform: "translateX(-50%)",
  },
  codeTable: {
    borderCollapse: "collapse",
    width: "100%",
    tableLayout: "fixed",
  },
  codeRow: {
    lineHeight: "20px",
    ":hover": {
      backgroundColor: codeFileColors.codeHoverBg,
    },
  },
  codeRowSelected: {
    backgroundColor: codeFileColors.codeSelectedBg,
    lineHeight: "20px",
    ":hover": {
      backgroundColor: codeFileColors.codeSelectedHoverBg,
    },
  },
  lineNumberCell: {
    width: "50px",
    minWidth: "50px",
    paddingRight: "10px",
    paddingLeft: "10px",
    textAlign: "right",
    color: codeFileColors.codeLineNumberText,
    userSelect: "none",
    verticalAlign: "top",
    whiteSpace: "nowrap",
    borderRight: `1px solid ${codeFileColors.codeLineNumberBorder}`,
    cursor: "pointer",
  },
  lineNumberLink: {
    color: codeFileColors.codeLineNumberText,
    textDecoration: "none",
    ":hover": {
      color: codeFileColors.codeLineNumberHoverText,
      textDecoration: "none",
    },
  },
  lineContentCell: {
    paddingLeft: "10px",
    paddingRight: "10px",
    verticalAlign: "top",
    whiteSpace: "pre",
    wordBreak: "break-all",
    fontFamily: 'Consolas, "Liberation Mono", Menlo, Courier, monospace',
    fontSize: "12px",
  },
});
