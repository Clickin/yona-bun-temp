import * as stylex from "@stylexjs/stylex";

export const pullRequestChangesColors = stylex.defineVars({
  surface: "#fff",
  diffSurface: "#333",
  meta: "#999",
  accent: "#49afcd",
  commitHash: "#5DBBE0",
  threadOpen: "#b6da54",
  threadClosed: "#fd6956",
});
export const styles = stylex.create({
  page: { margin: "20px auto 0px", padding: "0px 10px", width: "100%", boxSizing: "border-box" },
  codediffWrap: { marginTop: "10px" },
  errorWrap: { padding: "100px 0px", textAlign: "center" },
  errorIcon: (backgroundImage: string) => ({
    backgroundImage,
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
  browse: { width: "100%" },
  author: { color: pullRequestChangesColors.meta, marginTop: "20px" },
  commitHash: { color: pullRequestChangesColors.commitHash, marginRight: "10px" },
  diffs: {
    backgroundColor: pullRequestChangesColors.diffSurface,
    color: pullRequestChangesColors.surface,
    overflowX: "auto",
  },
  reviewTabs: { marginBottom: "10px" },
  threadActions: { textAlign: "right" },
  commentActions: { textAlign: "right" },
  reviewActions: { textAlign: "right" },
  uploadHelp: { textAlign: "right" },
  reviewEditorWrapper: { marginTop: "10px" },
  editorTabContent: { position: "relative", overflow: "visible" },
  originalMessageToggle: { border: 0, paddingLeft: 5, paddingRight: 5 },
  diffMeta: { cursor: "pointer" },
  threadReviewForm: { display: "block" },
  reviewTextarea: { height: "100px" },
  diffCodeHidden: { display: "none" },
  visibleForm: { display: "block" },
  commentDeleteModalVisible: { display: "block" },
  pendingBlockVisible: { display: "block" },
  pendingBlockPosition: (top: number, left: number) => ({ top, left }),
  rangedThreadWrap: {
    backgroundColor: "#fefefe",
    borderBottom: "1px solid #e5e5e5",
    borderTop: "1px solid #e5e5e5",
    maxWidth: 876,
    padding: "5px 5px 0",
    position: "relative",
  },
  rangedThreadOpen: {
    boxShadow: `inset 5px 0 0 ${pullRequestChangesColors.threadOpen}`,
  },
  rangedThreadClosed: {
    boxShadow: `inset 5px 0 0 ${pullRequestChangesColors.threadClosed}`,
  },
  rangedThreadClosedFold: {
    backgroundColor: "transparent",
    border: 0,
    boxShadow: "none",
    margin: 0,
    padding: 0,
    position: "static",
  },
  rangedThreadHeader: {
    padding: "5px 10px 10px",
  },
  rangedThreadBadge: {
    margin: 0,
    padding: "2px 10px",
  },
  rangedThreadMinimize: {
    position: "absolute",
    right: 10,
    top: 8,
  },
  rangedThreadFoldHere: {
    display: "block",
    marginTop: 0,
    position: "absolute",
    right: 0,
    zIndex: 99,
  },
  rangedThreadFoldHereOpen: {
    borderLeft: `3px solid ${pullRequestChangesColors.threadOpen}`,
    borderLeftColor: pullRequestChangesColors.threadOpen,
    borderLeftStyle: "solid",
    borderLeftWidth: 3,
  },
  rangedThreadFoldHereClosed: {
    borderLeft: `3px solid ${pullRequestChangesColors.threadClosed}`,
    borderLeftColor: pullRequestChangesColors.threadClosed,
    borderLeftStyle: "solid",
    borderLeftWidth: 3,
  },
  rangedThreadFoldHiddenHeader: {
    display: "none",
  },
  rangedThreadFoldHiddenComments: {
    display: "none",
  },
  rangedThreadFoldHiddenForm: {
    display: "none",
  },
  reviewCard: {
    display: "block",
    border: "1px solid #ddd",
    padding: "10px",
    paddingLeft: "15px",
    marginBottom: "5px",
    borderRadius: "0 3px 3px 0",
    ":last-of-type": {
      marginBottom: 0,
    },
    ":hover": {
      textDecoration: "none",
      backgroundColor: "#fafafa",
    },
  },
  reviewCardOpen: {
    boxShadow: "inset 5px 0 0 #b6da54",
  },
  reviewCardClosed: {
    boxShadow: "inset 5px 0 0 #ddd",
  },
  reviewCardOutdatedLabel: {
    borderRadius: "3px",
    padding: "3px 6px",
    backgroundColor: "#777",
    color: "#fff",
  },
  reviewCardOutdatedLabelHidden: {
    display: "none",
  },
  reviewCardContent: {
    display: "-webkit-box",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "justify",
    maxHeight: "60px",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    wordBreak: "break-all",
  },
  reviewCardInfo: {
    display: "block",
    textAlign: "right",
    marginTop: "10px",
  },
  reviewCardDate: {
    color: "#999",
    verticalAlign: "middle",
  },
  reviewCardAvatar: {
    marginLeft: "5px",
  },
  reviewCardComments: {
    color: "#3592b5",
    marginTop: "2px",
    marginLeft: "1px",
  },
});
