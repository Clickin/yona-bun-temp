import * as stylex from "@stylexjs/stylex";

// issue/view.scala.html paint tokens only; legacy geometry remains in frozen CSS.
export const issueDetailColors = stylex.defineVars({
  mutedText: "#777777",
  emptySurface: "#f7f7f7",
  accentText: "#337581",
  taskProgressSurface: "#d4d4d4",
  taskProgressRed: "red",
});

export const styles = stylex.create({
  legacyPopoverPosition: (left: number, top: number) => ({
    display: "block",
    left,
    position: "fixed",
    top,
    transform: "translate(-50%, -100%)",
  }),
  labelControl: { display: "inline-block" },
  labelSearchInput: { width: "10px" },
  keymapWrapper: { marginLeft: 55, padding: "10px 0px" },
  shareLinkHidden: { display: "none" },
  votersModalVisible: { display: "block" },
  keymapModalVisible: { display: "block" },
  commentBodyHidden: { display: "none" },
  replyVisible: { display: "block" },
  childCommentFormVisible: { display: "block", visibility: "visible" },
  notificationVisible: { display: "block" },
  voterSummary: { marginRight: "2px" },
  labelColor: (backgroundColor: string) => ({
    backgroundColor,
  }),
  page: {
    minHeight: "100%",
  },
  header: {
    borderBottomColor: issueDetailColors.mutedText,
  },
  mobileMetadata: {
    fontSize: "0.7em",
  },
  body: {
    minWidth: 0,
  },
  childCommentVoteText: {
    fontSize: "12px",
  },
  modal: {
    position: "fixed",
    top: "18%",
    left: "50vw",
    zIndex: 1000,
    width: "min(480px, calc(100vw - 32px))",
    marginLeft: "0",
    color: "#333",
    backgroundColor: "#fff",
    border: "1px solid #999",
    borderRadius: "4px",
    boxShadow: "0 3px 12px rgb(0 0 0 / 24%)",
    transform: "translateX(-50%)",
  },
  keymapModal: {
    top: "10%",
    left: "50vw",
    width: "640px",
    padding: "20px",
    marginLeft: "-320px",
    lineHeight: "30px",
    borderRadius: "6px",
    transform: "none",
  },
  modalSection: { padding: "12px 16px" },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #ddd",
  },
  modalTitle: { order: 1, margin: "0", fontSize: "18px", fontWeight: 400 },
  modalClose: {
    order: 2,
    padding: "0",
    fontSize: "20px",
    lineHeight: "20px",
    color: "#777",
    backgroundColor: "transparent",
    border: "0",
    boxShadow: "none",
  },
  modalBodyText: { margin: "0" },
  modalFooter: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    backgroundColor: "#f7f7f7",
    borderTop: "1px solid #ddd",
  },
  content: {
    minWidth: 0,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  sidebar: {
    minWidth: 0,
  },
  emptyContent: {
    backgroundColor: issueDetailColors.emptySurface,
  },
  author: {
    color: issueDetailColors.accentText,
  },
  timelineEvent: {
    padding: "2px 0 2px 55px",
    color: "#666",
    fontSize: "1em",
    lineHeight: "30px",
  },
  timelineEventDate: { color: "#aaa", fontSize: "11px" },
  disabledVote: {
    color: issueDetailColors.mutedText,
  },
  timeline: {
    display: "block",
    clear: "both",
    fontFamily: "inherit",
  },
  commentForm: {
    padding: "0 0 15px 54px",
    fontFamily: "inherit",
  },
  sidebarMeta: {
    padding: "15px 0 0 52px",
  },
  sidebarMetaDl: { marginBottom: "20px" },
  sidebarMetaDd: { padding: "5px 0px" },
  sidebarMetaAssigneeName: { fontSize: "11px" },
  indexTimeline: {
    display: "block",
    clear: "both",
    fontFamily: "inherit",
  },
  originalMessageToggle: {
    paddingLeft: "5px",
    paddingRight: "5px",
    borderWidth: "0px",
  },
  editorTabContent: {
    position: "relative",
    overflow: "visible",
  },
  taskProgressBar: {
    backgroundColor: issueDetailColors.taskProgressRed,
    height: "2px",
    transitionDuration: "0.2s",
    width: "0px",
  },
  tasklist: {
    boxShadow: "none",
    display: "none",
    filter: "none",
    padding: "10px 20px 0px",
  },
  taskTitle: { fontWeight: "500" },
  taskDoneCounter: { marginLeft: "5px" },
  taskProgress: { backgroundColor: issueDetailColors.taskProgressSurface },
  subtaskProgressBar: (width: string) => ({
    width,
  }),
  subtaskProgressShell: {
    boxShadow: "none",
    display: "inline-block",
    marginTop: "3px",
    overflow: "hidden",
    verticalAlign: "middle",
    width: "30px",
  },
  parentIssueState: {
    borderRadius: "0",
    color: "#fff",
    fontSize: "12px",
    lineHeight: "17px",
    padding: "2px",
    verticalAlign: "text-bottom",
  },
  parentIssueStateOpen: { backgroundColor: "#8bc34a" },
  parentIssueStateClosed: { backgroundColor: "#f68c52" },
  selectedChild: {
    backgroundColor: "#f5f5f5",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontWeight: "bold",
  },
  subtasks: {
    marginTop: "40px",
    marginBottom: "15px",
  },
  subtaskItem: {
    padding: "0 3px",
  },
  parentIssue: {
    fontSize: "16px",
  },
  parentIssueDelimiter: {
    margin: "5px 0 0",
    borderTop: "1px dashed #ddd",
  },
  itemCountGroup: {
    border: "1px solid #eee",
    borderRadius: "3px",
    lineHeight: "14px",
    marginTop: "2px",
  },
  itemCountGroupNoBorder: { border: "none" },
  itemCountLinkComment: {
    color: "#8b008b",
    ":hover": { color: "#be00be" },
  },
  itemCountLinkVote: {
    color: "#f36c22",
    ":hover": { color: "#f58c52" },
  },
  itemCountLinkOffset: { marginLeft: "-5px" },
  countGroup: {
    display: "inline-block",
    margin: "0 auto",
    padding: "0 5px",
    textAlign: "center",
  },
  countGroupIcon: {
    borderLeft: "1px solid #eee",
    fontSize: "9px",
    lineHeight: "12px",
    paddingTop: "2px",
  },
  countGroupIconFirst: { borderLeft: "none" },
  countGroupCount: { padding: "0 5px 0 0" },
});
