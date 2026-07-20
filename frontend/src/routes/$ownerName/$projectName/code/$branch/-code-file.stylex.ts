import * as stylex from "@stylexjs/stylex";

// partial_view_file.scala.html paint tokens; geometry stays in the route styles.
export const codeFileColors = stylex.defineVars({
  metadataText: "#555555",
  markdownBorder: "#cccccc",
  binaryMutedText: "#999999",
  actionText: "#333333",
  popoverText: "#333333",
  commentText: "#666666",
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
  commentCount: {
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
});
