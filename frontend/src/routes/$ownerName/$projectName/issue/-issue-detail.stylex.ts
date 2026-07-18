import * as stylex from "@stylexjs/stylex";

// issue/view.scala.html paint tokens only; legacy geometry remains in frozen CSS.
export const issueDetailColors = stylex.defineVars({
  mutedText: "#777777",
  emptySurface: "#f7f7f7",
  accentText: "#337581",
});

export const styles = stylex.create({
  labelControl: { display: "inline-block" },
  labelSearchInput: { width: "10px" },
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
    width: "0px",
  },
  subtaskProgressBar: (width: string) => ({
    width,
  }),
});
