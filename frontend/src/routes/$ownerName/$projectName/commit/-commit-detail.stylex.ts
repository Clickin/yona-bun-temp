import * as stylex from "@stylexjs/stylex";

export const commitDetailColors = stylex.defineVars({
  diffBorder: "#bbbbbb",
  diffMetaSurface: "#eeeeee",
  commitText: "#333333",
  diffSurface: "#f5f5f5",
  link: "#3592b5",
  metaText: "#999999",
});

export const styles = stylex.create({
  blockReviewButtonVisible: { display: "block" },
  commentBodyHidden: { display: "none" },
  commentUpdateFormVisible: { display: "block" },
  browseTabs: { marginBottom: "20px" },
  reviewTabs: { marginBottom: "10px" },
  editorTabContent: { overflow: "visible", position: "relative" },
  reviewTextarea: { height: "100px" },
  reviewFormVisible: { display: "block" },
  commentDeleteModalVisible: { display: "block" },
  threadReviewForm: { display: "block" },
  originalMessageToggle: {
    borderWidth: "0px",
    paddingLeft: "5px",
    paddingRight: "5px",
  },
  codediffLayout: { position: "relative" },
  diffsLayout: { display: "block", marginRight: "282px", position: "relative" },
  reviewPanel: {
    display: "block",
    minHeight: "30px",
    position: "absolute",
    right: "0px",
    top: "0px",
    width: "260px",
  },
  reviewContainer: { position: "relative", width: "260px" },
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  browse: { width: "100%" },
  commitInfo: { color: commitDetailColors.commitText, margin: "10px 0px" },
  commitMessage: { color: commitDetailColors.commitText },
  commitDescription: {
    backgroundColor: commitDetailColors.diffSurface,
    color: commitDetailColors.commitText,
    margin: "5px 0px",
    padding: "10px",
    whiteSpace: "pre-wrap",
  },
  diffBody: { overflowX: "auto" },
  file: {
    border: `1px solid ${commitDetailColors.diffBorder}`,
    marginBottom: "20px",
  },
  fileMeta: {
    backgroundColor: commitDetailColors.diffMetaSurface,
    borderBottom: `1px solid ${commitDetailColors.diffBorder}`,
    height: "30px",
    position: "relative",
  },
  fileCode: { overflowX: "auto", overflowY: "hidden" },
});
