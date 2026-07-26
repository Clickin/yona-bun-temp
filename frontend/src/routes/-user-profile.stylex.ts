import * as stylex from "@stylexjs/stylex";

export const userProfileColors = stylex.defineVars({
  accentText: "#337581",
  pageBackground: "#ffffff",
  statusText: "#ffffff",
});

export const styles = stylex.create({
  // Frozen less/_page.less and less/_responsive.less .page-wrap-outer cascade.
  pageOuter: {
    boxSizing: "border-box",
    marginTop: "10px",
    minHeight: "450px",
    minWidth: {
      default: null,
      "@media (max-width: 720px)": "10px !important",
    },
    padding: {
      default: "0px 10px",
      "@media (max-width: 720px)": "0px !important",
    },
    width: "100%",
  },
  // Frozen less/_page.less .page-wrap.
  page: {
    backgroundColor: userProfileColors.pageBackground,
    margin: "0px auto",
  },
  // Frozen less/_responsive.less .site-breadcrumb-outer. Keep the legacy
  // outer class until its shared app.css consumers are retired.
  breadcrumbOuter: {
    minWidth: {
      default: null,
      "@media (max-width: 900px)": "10px !important",
    },
    boxSizing: {
      default: null,
      "@media (max-width: 720px)": "border-box",
    },
    padding: {
      default: null,
      "@media (max-width: 720px)": "0px 10px",
    },
    width: {
      default: null,
      "@media (max-width: 720px)": "100%",
    },
  },
  // Frozen less/_page.less .site-breadcrumb-inner.
  breadcrumbInner: { margin: "0px auto" },
  // Frozen less/_page.less .site-breadcrumb-inner h3.
  breadcrumbHeading: { lineHeight: "30px", padding: "10px 10px 5px" },
  // Legacy user/view.scala.html renders the API-provided avatar as a background image.
  avatarBackground: (backgroundImage: string) => ({ backgroundImage }),
  // Legacy less/_page.less .user-box.
  profile: {
    margin: "15px 0px 0px",
    overflow: "hidden",
  },
  // Legacy less/_page.less .user-info-box.
  info: {
    float: "left",
    width: "200px",
  },
  // Frozen less/_page.less .user-info-box .whoami.
  whoami: { marginTop: "15px" },
  // Frozen less/_yobiUI.less .usf-group .loginid.
  loginId: { color: "#999999" },
  // Frozen less/_yobiUI.less .ybtn final cascade plus .ybtn-mini overrides.
  profileEditButton: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: "3px !important",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
    color: "#333333",
    cursor: "pointer",
    display: "inline-block",
    fontSize: "10.5px !important",
    lineHeight: "20px",
    marginBottom: 0,
    marginLeft: ".3em",
    outline: "0 none",
    padding: "0 6px !important",
    position: "relative",
    textAlign: "center",
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: 2,
    ":first-child": { marginLeft: 0 },
    ":hover": {
      backgroundColor: "#f1f1f1",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "#292929",
      textDecoration: "none",
    },
    ":focus": {
      backgroundColor: "#f1f1f1",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "#292929",
      textDecoration: "none",
    },
    ":active": {
      backgroundColor: "#f1f1f1",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "#292929",
      textDecoration: "none",
    },
  },
  // Frozen less/_yobiUI.less .ybtn i.
  profileEditIcon: { lineHeight: "20px" },
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
  // Frozen Bootstrap .label,.badge base with the later less/_page.less .badge overrides.
  statusBadge: {
    borderRadius: "15px",
    color: userProfileColors.statusText,
    display: "inline-block",
    fontSize: "11.844px",
    fontWeight: "700",
    lineHeight: "20px",
    marginRight: "25px",
    padding: "5px 15px",
    textShadow: "0 -1px 0 rgba(0, 0, 0, 0.25)",
    verticalAlign: "baseline",
    whiteSpace: "nowrap",
  },
  // Frozen Bootstrap .label-success.
  siteAdminBadge: { backgroundColor: "#468847" },
  // Frozen Bootstrap .label-important.
  blockedBadge: { backgroundColor: "#b94a48" },
  // Frozen less/_page.less .user-info-box .user-since.
  userSince: { marginTop: "10px", padding: "0px 10px" },
  // Frozen Bootstrap generic img rule. The IE-only width/interpolation
  // declarations are not representable modern browser cascade values.
  // _responsive.less targets only .markdown-wrap img, while
  // _yobiUI.less targets only .avatar-wrap img, so neither matches here.
  providerGoogleImage: {
    borderStyle: "none",
    borderWidth: 0,
    height: "auto",
    maxWidth: "100%",
    verticalAlign: "middle",
  },
  // Legacy less/_page.less .user-stream-box.
  stream: { minWidth: 0, overflow: "hidden", paddingLeft: "20px" },
  // Frozen less/_page.less .user-stream-box declarations that apply to the
  // legacy always-rendered, empty stream root for a guest viewer.
  guestStreamShell: { overflow: "hidden", paddingLeft: "20px" },
  tabs: { color: userProfileColors.accentText },
  // Frozen Bootstrap .tab-content and direct pane/active child rules.
  tabContent: { overflow: "hidden" },
  tabPane: { display: "none" },
  tabPaneActive: { display: "block" },
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
  // Frozen less/_yobiUI.less .num-badge. The later .lst-stacked and
  // .ybtn.blue descendant rules do not match either profile-tab ancestry.
  tabCountBadge: {
    borderRadius: "2px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: "13px",
    fontWeight: "bold",
    marginLeft: "3px",
    padding: "2px 4px",
    textShadow: "none",
    verticalAlign: "top",
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
  // Frozen Bootstrap number-input cascade, less/_page.less .input-mini-min,
  // less/_responsive.less mobile override, less/_yobiUI.less final overrides,
  // and the user/view.scala.html daysAgoBtn inline declarations.
  daysAgoInput: {
    backgroundColor: "#F7F7F7",
    borderColor: "currentColor",
    borderRadius: "2px",
    borderStyle: "none",
    borderWidth: 0,
    boxShadow: "none",
    color: "#555555",
    display: "inline-block",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: "12px",
    fontWeight: "normal",
    height: "20px",
    lineHeight: "20px",
    margin: "0px 5px",
    padding: "4px 6px",
    position: "relative",
    textAlign: "right",
    top: "4px",
    transition: "border 0.2s linear, box-shadow 0.2s linear",
    verticalAlign: "bottom",
    width: "30px",
    ":focus": {
      borderColor: "#f36c22 !important",
      boxShadow: "none",
      outline: 0,
    },
    "@media (max-width: 720px)": {
      fontSize: "16px !important",
    },
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
  // Frozen Bootstrap generic anchor rules followed by less/_common.less a.
  projectTitleLink: {
    color: "inherit",
    outline: "none",
    textDecoration: "none",
    ":hover": {
      color: "#005580",
      outline: "none !important",
      textDecoration: "underline",
    },
    ":focus": {
      color: "#005580",
      outline: "none !important",
      textDecoration: "underline",
    },
  },
  // Frozen public/stylesheets/yobicon/style.css generic base, .yobicon-lock pseudo,
  // and .yobicon-small fontSize; less/_page.less supplies the lock color.
  projectPrivateIcon: {
    backgroundImage: "none",
    color: "#7F8C8D",
    display: "inline-block",
    fontFamily: "yobicon",
    fontSize: "0.7em",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "baseline",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    "::before": { content: '"\\e21e"' },
  },
  // Frozen less/_common.less then later less/_yobiUI.less .avatar-wrap.small cascade.
  projectAvatarLink: {
    width: "24px",
    height: "24px",
    display: "inline-block",
    verticalAlign: "middle",
    overflow: "hidden",
    backgroundColor: "#ddd",
    borderRadius: "3px !important",
  },
  // Frozen later less/_yobiUI.less generic .avatar-wrap img.
  projectAvatarImage: {
    width: "100%",
    verticalAlign: "top",
  },
  // Frozen public/stylesheets/yobicon/style.css generic base and .yobicon-split
  // pseudo, with less/_common.less .vmiddle final alignment.
  projectForkIcon: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "middle !important",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    "::before": { content: '"\\e450"' },
  },
  // Frozen Bootstrap generic anchor rules followed by less/_common.less a.
  projectOriginLink: {
    color: "inherit",
    outline: "none",
    textDecoration: "none",
    ":hover": {
      color: "#005580",
      outline: "none !important",
      textDecoration: "underline",
    },
    ":focus": {
      color: "#005580",
      outline: "none !important",
      textDecoration: "underline",
    },
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
  // Frozen public/stylesheets/yobicon/style.css generic base and .yobicon-friends
  // pseudo, with less/_common.less .yobicon-middle final alignment.
  projectMemberIcon: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: 1,
    marginBottom: "3px",
    textDecoration: "none",
    verticalAlign: "bottom",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    "::before": { content: '"\\e27b"' },
  },
  // The owner link is under .name-tag, so the unmatched .header rule does not apply.
  projectOwnerLink: {
    color: "inherit",
    outline: "none",
    textDecoration: "none",
    ":hover": {
      color: "#005580",
      outline: "none !important",
      textDecoration: "underline",
    },
    ":focus": {
      color: "#005580",
      outline: "none !important",
      textDecoration: "underline",
    },
  },
  projectStats: {
    float: "right",
    marginTop: "0px",
    textAlign: "right",
  },
  // Frozen less/_yobiUI.less .ybtn final cascade.
  projectWatchButton: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: "3px !important",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
    color: "#333333",
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    marginBottom: 0,
    marginLeft: ".3em",
    outline: "0 none",
    padding: "4px 12px !important",
    position: "relative",
    textAlign: "center",
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: 2,
    ":first-child": { marginLeft: 0 },
    ":hover": {
      backgroundColor: "#f1f1f1",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "#292929",
      textDecoration: "none",
    },
    ":focus": {
      backgroundColor: "#f1f1f1",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "#292929",
      textDecoration: "none",
    },
    ":active": {
      backgroundColor: "#f1f1f1",
      borderColor: "rgba(0, 0, 0, 0.25)",
      color: "#292929",
      textDecoration: "none",
    },
  },
  // Frozen public/stylesheets/yobicon/style.css generic base and
  // less/_common.less .yobicon-middle, followed by less/_yobiUI.less .ybtn i.
  // Legacy eye-open/eye-close have no Yobicon pseudo mapping.
  projectWatchIcon: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: "20px",
    marginBottom: "3px",
    textDecoration: "none",
    verticalAlign: "bottom",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
  // Frozen less/_yobiUI.less .num-badge.
  projectWatchBadge: {
    borderRadius: "2px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: "13px",
    fontWeight: "bold",
    marginLeft: "3px",
    padding: "2px 4px",
    textShadow: "none",
    verticalAlign: "top",
  },
  // Frozen public/stylesheets/yobicon/style.css generic base and
  // .yobicon-trash pseudo.
  projectTrashIcon: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "baseline",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    "::before": { content: '"\\e838"' },
  },
  // Frozen less/_yobiUI.less .nbtn, .nbtn.black, .nbtn.last, and a.nbtn.medium,
  // with the final generic anchor hover/focus cascade.
  projectLeaveLink: {
    backgroundColor: "#222222",
    border: 0,
    borderRadius: "2px",
    boxShadow: "inset 0px -1px 1px rgba(0, 0, 0, 0.3)",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "bold",
    lineHeight: "18px",
    marginRight: 0,
    outline: "none",
    padding: "6px 20px",
    textAlign: "center",
    textDecoration: "none",
    textShadow: "none",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    ":hover": {
      backgroundColor: "#000000",
      color: "#005580",
      textDecoration: "none",
    },
    ":focus": {
      color: "#005580",
      outline: "none !important",
      textDecoration: "underline",
    },
  },
  // Legacy user/view.scala.html partial_issues subtask progress width.
  progressBar: (width: string) => ({ width }),
  // Legacy user/partial_issues.scala.html paints each API-provided label color.
  issueLabelBackground: (backgroundColor: string) => ({ backgroundColor }),
  issueLabelPresentation: {
    borderRadius: "1px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "normal",
    lineHeight: "12px",
    outline: "none",
    padding: "2px 3px",
    textDecoration: "none",
    textShadow: "none",
    verticalAlign: "baseline",
    whiteSpace: "nowrap",
    WebkitTransitionDuration: "0.25s",
    ":empty": { display: "none" },
    ":focus": {
      color: "#ffffff",
      cursor: "pointer",
      outline: "none !important",
      textDecoration: "none",
    },
    ":hover": {
      color: "#ffffff",
      cursor: "pointer",
      opacity: 0.7,
      outline: "none !important",
      textDecoration: "none",
    },
    ":last-of-type": { margin: 0 },
  },
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
  // Frozen less/_page.less generic .item-count-groups plus the profile title
  // cell's nested font-size override.
  issueTitleCountGroups: {
    borderColor: "#eeeeee",
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    fontSize: "10px",
    lineHeight: "14px",
    marginTop: "2px",
  },
  // Frozen Bootstrap/common generic anchor cascade plus the later
  // .item-count-groups .comments-count:hover color.
  issueCommentCountLink: {
    color: "inherit",
    outline: "none",
    textDecoration: "none",
    ":hover": {
      color: "#be00be",
      outline: "none !important",
      textDecoration: "underline",
    },
    ":focus": {
      color: "#005580",
      outline: "none !important",
      textDecoration: "underline",
    },
  },
  // Frozen less/_page.less .count-groups.item-icon:first-child.
  issueCommentCountIconGroup: {
    borderLeft: 0,
    display: "inline-block",
    fontSize: "9px",
    lineHeight: "12px",
    margin: "0 auto",
    padding: "2px 5px 0px",
    textAlign: "center",
  },
  // Frozen public/stylesheets/yobicon/style.css generic base and comment2 glyph.
  issueCommentCountGlyph: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "baseline",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    "::before": { content: '"\\e274"' },
  },
  // Frozen less/_page.less .count-groups.item-count.
  issueCommentCountValue: {
    display: "inline-block",
    margin: "0 auto",
    padding: "0px 5px 0px 0px",
    textAlign: "center",
  },
  // Frozen less/_page.less .my-issues .post-item .title-wrap .title.
  issueTitleLink: { fontSize: "14px", fontWeight: "500" },
  // Frozen less/_page.less .project-name-in-my-issues.
  issueProjectNameWrapper: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    flexWrap: "nowrap",
    justifyContent: "space-between",
    lineHeight: "36px",
  },
  // Frozen less/_page.less .project-name-in-my-issues .project-name.
  issueProjectName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // Frozen less/_page.less .for-subtask-progressbar.
  issueSubtaskProgressWrapper: { paddingLeft: "5px" },
  // Frozen less/_page.less .for-subtask-progressbar .subtask-progress.
  issueSubtaskProgressShell: {
    display: "inline-block",
    verticalAlign: "bottom",
    width: "30px",
  },
  // Frozen less/_page.less .for-subtask-progressbar .completion-ratio.
  issueSubtaskCompletionRatio: { fontSize: "0.8em !important" },
  // Frozen less/_page.less .for-subtask-progressbar .subtask.
  issueSubtaskParent: { fontSize: "0.8em !important" },
  // Frozen less/_page.less .subtask-number.
  issueSubtaskNumber: {
    display: "inline-block",
    fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
    fontSize: "12px",
    marginRight: "5px",
    minWidth: "22px",
  },
  // Frozen less/_page.less .child-issue-list matching subtree.
  issueChildList: { color: "#666666" },
  issueChildClosedState: { backgroundColor: "transparent !important" },
  // Frozen public/stylesheets/yobicon/style.css generic base/checkmark pseudo,
  // plus less/_page.less .child-issue-list .yobicon-checkmark color.
  issueChildCheckmark: {
    backgroundImage: "none",
    color: "#fd6956",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "baseline",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    "::before": { content: '"\\e017"' },
  },
  // Frozen less/_page.less .child-issue .child-issue-date.
  issueChildDate: { color: "lightgrey", display: "none" },
  // Frozen less/_page.less .draft-number.
  issueChildDraftNumber: { color: "#0bb53c" },
  // Frozen less/_common.less .font12 around the child count pair.
  issueChildCountPair: { fontSize: "12px" },
  // Frozen less/_page.less generic .item-count-groups followed by
  // .no-border-at-child .item-count-groups.
  issueChildCountGroups: {
    borderColor: "#eeeeee",
    borderRadius: "3px",
    borderStyle: "none !important",
    borderWidth: "1px",
    lineHeight: "14px",
    marginTop: "2px",
  },
  // Frozen Bootstrap/common generic anchor cascade.
  issueChildCountLink: {
    color: "inherit",
    outline: "none",
    textDecoration: "none",
    ":hover": {
      outline: "none !important",
      textDecoration: "underline",
    },
    ":focus": {
      outline: "none !important",
      textDecoration: "underline",
    },
  },
  // Frozen less/_page.less always-colored child comment/vote links.
  issueChildCommentLink: {
    color: "#8b008b",
    ":hover": { color: "#be00be" },
  },
  issueChildVoteLink: {
    color: "#f36c22",
    ":hover": { color: "#f58c52" },
  },
  // Frozen less/_page.less .item-count-groups a:nth-child(2).
  issueChildCountLinkOffset: { marginLeft: "-5px" },
  // Frozen less/_page.less .count-groups.item-icon:first-child.
  issueChildCountIcon: {
    borderLeft: 0,
    display: "inline-block",
    fontSize: "9px",
    lineHeight: "12px",
    margin: "0 auto",
    padding: "2px 5px 0px",
    textAlign: "center",
  },
  // Frozen public/stylesheets/yobicon/style.css generic base.
  issueChildCountGlyph: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "baseline",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
  issueChildCommentGlyph: { "::before": { content: '"\\e274"' } },
  issueChildVoteGlyph: { "::before": { content: '"\\e4b0"' } },
  // Frozen less/_page.less .count-groups.item-count and .strong.
  issueChildCountValue: {
    display: "inline-block",
    margin: "0 auto",
    padding: "0px 5px 0px 0px",
    textAlign: "center",
  },
  issueChildVoteCountValue: { fontWeight: "bold" },
  // Frozen less/_page.less .my-issues .post-item .author.
  issueAuthor: { display: "table", lineHeight: "36px" },
  // Frozen less/_responsive.less .hide-in-mobile.
  issueDesktopPersonVisibility: {
    "@media all and (max-width: 720px)": { display: "none !important" },
  },
  // Frozen Bootstrap .hide plus less/_responsive.less .show-in-mobile.
  issueMobileAssigneeVisibility: {
    display: "none",
    "@media all and (max-width: 720px)": { display: "block !important" },
  },
  // Frozen less/_page.less .my-issues .post-item .author .author-cell.
  issueAuthorCell: {
    display: "table-cell",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  // Frozen less/_page.less .my-issues .post-item .meta.
  issueMeta: { display: "table" },
  // Frozen less/_page.less .my-issues .post-item .meta .meta-cell.
  issueMetaCell: { display: "table-cell", verticalAlign: "middle" },
  // Frozen less/_page.less .post-item .infos .infos-item.
  issueMetadataItem: { float: "left", marginRight: "6px" },
  // Frozen less/_page.less .mileston-tag.
  issueMilestoneTag: {
    borderRadius: "6px",
    color: "#2196f3",
    fontSize: "11px",
    maxWidth: "135px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  // Frozen less/_page.less .my-issues .post-item .post-id.
  issuePostId: {
    color: "#999",
    fontSize: "12px",
    fontWeight: "normal",
    marginRight: "5px",
  },
  // Frozen less/_page.less .my-issues .post-item .infos.
  issueInfos: { marginTop: "4px" },
  // Frozen Bootstrap .pull-right used by user/partial_issues.scala.html.
  issueDueDate: { float: "right" },
  // Frozen less/_page.less .overdue and less/_variables.less @yobi-red.
  issueDueDateOverdue: { color: "#c93426" },
  // Frozen public/stylesheets/yobicon/style.css generic base and clock2 pseudo.
  issueDueDateClock: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "baseline",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    "::before": { content: '"\\e356"' },
  },
  // Frozen Bootstrap .pull-right used by user/partial_pullRequests.scala.html.
  pullRequestReceiverColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    marginLeft: "2.127659574468085%",
    minHeight: "30px",
    width: "14.893617021276595%",
    "@media (max-width: 767px)": {
      display: "block",
      float: "none",
      marginLeft: "0px",
      width: "100%",
    },
  },
  pullRequestReceiverRail: { float: "right", marginTop: "5px" },
  pullRequestReceiverAvatarLink: { marginRight: "0px" },
  pullRequestState: {
    borderRadius: "15px",
    color: "#FFF",
    float: "right",
    fontWeight: "bold",
    marginRight: "16px",
    marginTop: "7px",
    padding: "5px 12px",
  },
  pullRequestStateClosed: { backgroundColor: "#fd6956" },
  pullRequestStateConflict: { backgroundColor: "#c0392b" },
  pullRequestStateMerged: { backgroundColor: "#65c9df" },
  pullRequestStateOpen: { backgroundColor: "#b6da54" },
  pullRequestStateRejected: { backgroundColor: "#fd8658" },
  pullRequestEmptyAvatarWrap: { height: "32px", width: "32px" },
  // Frozen less/_page.less .post-item.
  pullRequestRow: {
    borderBottomColor: "#ddd",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    clear: "both",
    display: "block",
    overflow: "auto",
    padding: "10px",
    "@media (max-width: 767px)": { padding: "10px 0px !important" },
  },
  // Frozen less/_page.less .post-item .avatar-wrap.
  pullRequestProjectAvatarRail: { float: "left", marginRight: "10px" },
  // Frozen less/_page.less .post-item .title-wrap.
  pullRequestTitleWrap: {
    display: "block",
    lineHeight: "20px",
    overflow: "hidden",
    position: "relative",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // Frozen less/_page.less .post-item .title-wrap .post-id.
  pullRequestPostId: {
    color: "#999",
    fontSize: "13px",
    fontWeight: "bold",
    marginRight: "5px",
  },
  // Frozen less/_page.less .post-item .title-wrap .title.
  pullRequestTitleLink: {
    color: "#333",
    fontSize: "15px",
    fontWeight: "600",
  },
  // Frozen less/_page.less .post-item .title-wrap .title.project.
  pullRequestProjectLink: { color: "#3592b5", marginRight: "10px" },
  // Frozen less/_page.less .post-item .title-wrap .title.conflict.
  pullRequestConflictLink: { color: "#b94a48" },
  // Frozen less/_page.less .post-item .infos.
  pullRequestInfos: {
    color: "#999",
    display: "block",
    fontSize: "12px",
    lineHeight: "20px",
    overflow: "hidden",
  },
  pullRequestInfosItem: { float: "left", marginRight: "6px" },
  pullRequestInfosLinkItem: {
    ":hover": {
      color: "#3592b5",
      textDecoration: "none",
    },
  },
  pullRequestInfosIconLink: {
    color: "#3592b5",
    ":hover": {
      color: "#3592b5",
      textDecoration: "none",
    },
  },
  pullRequestInfosIcon: { verticalAlign: "middle" },
  pullRequestInfosCount: { marginRight: "3px" },
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
