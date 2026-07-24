import * as stylex from "@stylexjs/stylex";

export const userProfileColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
  statusText: "#ffffff",
});

export const styles = stylex.create({
  // Legacy user/view.scala.html renders the API-provided avatar as a background image.
  avatarBackground: (backgroundImage: string) => ({ backgroundImage }),
  // Legacy less/_page.less .user-box.
  profile: {
    color: userProfileColors.mutedText,
    margin: "15px 0px 0px",
    overflow: "hidden",
  },
  // Legacy less/_page.less .user-info-box.
  info: {
    color: userProfileColors.accentText,
    float: "left",
    width: "200px",
  },
  // Frozen less/_page.less .user-info-box .whoami.
  whoami: { marginTop: "15px" },
  // Frozen less/_page.less .user-info-box .guest-user.
  guestUser: {
    backgroundColor: "rgba(255, 165, 0, 0.8)",
    borderRadius: "3px",
    color: "white",
    textAlign: "center",
    width: "20px",
  },
  // Frozen less/_page.less .user-info-box .guest-user .left-mark.
  guestLeftMark: {
    fontSize: "10px",
    marginLeft: "10px",
    paddingTop: "5px",
    WebkitTextOrientation: "upright",
    width: "10px",
    WebkitWritingMode: "vertical-rl",
  },
  // Frozen less/_page.less .user-info-box .user-since .since.
  since: {
    color: "rgb(243, 108, 34)",
    display: "block",
    fontSize: "14px",
    fontWeight: "700",
    marginLeft: "5px",
  },
  // Frozen less/_page.less .user-info-box .user-status.
  userStatus: { marginTop: "20px" },
  // Frozen less/_page.less .user-info-box .user-since.
  userSince: { marginTop: "10px", padding: "0px 10px" },
  // Legacy less/_page.less .user-stream-box.
  stream: { minWidth: 0, overflow: "hidden", paddingLeft: "20px" },
  tabs: { color: userProfileColors.accentText },
  // Frozen less/_yobiUI.less .nav-tabs li a and _responsive.less mobile override.
  profileTabButton: {
    paddingLeft: "30px",
    paddingRight: "30px",
    color: "#3592b5",
    fontWeight: "bold",
    ":hover": {
      textDecoration: "none",
      backgroundColor: "#F2F2F2",
    },
    "@media (max-width: 720px)": {
      paddingLeft: "5px",
      paddingRight: "5px",
    },
  },
  // Frozen less/_common.less .nm reset on the nested issue-tab wrapper.
  issueTabs: { margin: "0 !important" },
  // Frozen less/_yobiUI.less .nav-tabs li a and _responsive.less mobile override.
  issueTabButton: {
    marginRight: "2px",
    paddingLeft: "30px",
    paddingRight: "30px",
    color: "#3592b5",
    fontWeight: "bold",
    ":hover": {
      textDecoration: "none",
      backgroundColor: "#F2F2F2",
    },
    "@media (max-width: 720px)": {
      paddingLeft: "5px",
      paddingRight: "5px",
    },
  },
  // Legacy user/view.scala.html daysAgoBtn inline declaration.
  daysAgoInput: {
    margin: "0px 5px",
    verticalAlign: "bottom",
  },
  // Frozen Bootstrap .pull-right from user/view.scala.html daysAgo controls.
  daysAgoControls: { float: "right" },
  // Frozen less/_page.less .all-projects list shell.
  projectsList: {
    margin: "0px 0px 20px",
    listStyle: "none",
    clear: "both",
  },
  // Legacy user/partial_projectlist.scala.html project info wrapper spacing.
  projectAvatarRail: { float: "left" },
  projectInfo: {
    float: "left",
    marginLeft: "10px",
  },
  projectRow: {
    borderBottom: "1px solid #dcdcdc",
    overflow: "hidden",
    padding: "15px 0px 10px",
  },
  // Frozen less/_page.less .all-projects.user-streams .project:first-of-type.
  firstProjectRow: { paddingTop: "5px" },
  projectHeader: {
    fontSize: "20px",
    fontWeight: "700",
    marginBottom: "5px",
    marginLeft: "10px",
  },
  projectDescription: {
    color: "#bababa",
    marginLeft: "10px",
    maxHeight: "100px",
    maxWidth: "647px",
    overflowY: "auto",
    textOverflow: "ellipsis",
  },
  projectNameTag: {
    color: "#999999",
    fontSize: "11px",
    marginLeft: "10px",
  },
  projectStats: {
    float: "right",
    marginTop: "0px",
    textAlign: "right",
  },
  // Legacy user/view.scala.html partial_issues subtask progress width.
  progressBar: (width: string) => ({ width }),
  // Legacy user/partial_issues.scala.html paints each API-provided label color.
  issueLabelBackground: (backgroundColor: string) => ({ backgroundColor }),
  // Frozen less/_common.less .mr10 plus the positioned anchor required by the
  // React-owned popovers for the legacy two-column and show-subtasks wrappers.
  popoverAnchor: { marginRight: "10px", position: "relative" },
  // Legacy less/_page.less .my-issues .post-item.
  issueRow: { color: "#999999", padding: "0px 10px" },
  // Legacy less/_page.less .my-issues .post-item .title-wrap.
  issueTitleWrap: {
    display: "table",
    marginTop: "2px",
    overflow: "auto",
    whiteSpace: "normal",
  },
  // Frozen less/_page.less .my-issues .post-item .title-wrap .title-cell.
  issueTitleCell: {
    display: "table-cell",
    padding: "5px 0px",
    verticalAlign: "middle",
  },
  // Frozen less/_page.less .my-issues .post-item .title-wrap .item-count-groups.
  issueTitleCountGroups: { fontSize: "10px" },
  // Frozen less/_page.less .my-issues .post-item .title-wrap .title.
  issueTitleLink: { fontSize: "14px", fontWeight: "500" },
  // Frozen Bootstrap .pull-right used by user/partial_issues.scala.html.
  issueDueDate: { float: "right" },
  // Frozen Bootstrap .pull-right used by user/partial_pullRequests.scala.html.
  pullRequestReceiverRail: { float: "right" },
  pullRequestState: { float: "right" },
  // Frozen less/_page.less .error-wrap and its nested message paragraph.
  emptyErrorWrap: { padding: "100px 0px", textAlign: "center" },
  emptyErrorMessage: {
    color: "#898989",
    fontSize: "16px",
    fontWeight: "bold",
    margin: "30px 0px",
  },
});

export const userProfileNotFoundStyles = stylex.create({
  errorWrap: { padding: "100px 0px", textAlign: "center" },
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
});
