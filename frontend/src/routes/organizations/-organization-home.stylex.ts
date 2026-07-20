import * as stylex from "@stylexjs/stylex";
import { globalBreakpoints } from "../../theme.stylex";

export const organizationHomeColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
  originProjectText: "#5DBBE0",
  panelSurface: "#f5f5f5",
  headerSurface: "#565656",
  menuSurface: "#ececec",
  menuBorder: "#dddddd",
});

export const styles = stylex.create({
  // yona-original/app/assets/stylesheets/less/_common.less .small-font.
  smallFont: { fontSize: "10px", fontWeight: "normal" },
  projectOrigin: { color: organizationHomeColors.originProjectText },
  projectVisibilityBadge: { color: "#788ba7", fontSize: "14px", marginLeft: "5px" },
  projectUtilWrap: { bottom: "20px", position: "absolute", right: "0" },
  projectUtil: { listStyle: "none", margin: "0" },
  projectUtilItem: { float: "left", marginLeft: "15px", position: "relative" },
  projectUtilIcons: { margin: "10px 0px 10px 25px" },
  projectMenuGroup: { float: "left", marginLeft: "110px" },
  projectSetting: { float: "right" },
  // yona-original/app/assets/stylesheets/less/_page.less .project-header-outer / inner / wrap.
  headerShell: {
    backgroundColor: organizationHomeColors.headerSurface,
    backgroundPosition: "center bottom",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    height: "120px",
  },
  headerInner: { height: "inherit" },
  headerWrap: { height: "inherit", margin: "0 auto", position: "relative", width: "97%" },
  headerAvatar: {
    backgroundColor: "#ffffff",
    borderColor: "#f9f9f9",
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "5px",
    bottom: "-30px",
    height: "80px",
    left: "0px",
    position: "absolute",
    width: "80px",
  },
  headerBreadcrumb: {
    backgroundColor: "rgba(0,0,0,0.55)",
    bottom: "18px",
    display: "inline-block",
    fontWeight: "bold",
    left: "90px",
    padding: "2px 10px",
    position: "absolute",
  },
  // yona-original/app/assets/stylesheets/less/_page.less .project-menu-outer.
  menuShell: {
    backgroundColor: organizationHomeColors.menuSurface,
    borderBottomColor: organizationHomeColors.menuBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    height: "39px",
  },
  // yona-original/app/assets/stylesheets/less/_page.less .project-menu-inner.
  organizationMenuInner: { height: "39px", margin: "0 auto" },
  // yona-original/app/assets/stylesheets/less/_page.less .project-menu-nav.
  organizationMenuNav: { height: "39px", listStyle: "none", margin: "0" },
  headerBackground: (backgroundImage: string) => ({ backgroundImage }),
  // yona-original/app/assets/stylesheets/less/_page.less .page-wrap-outer.
  // yona-original/app/assets/stylesheets/less/_responsive.less .page-wrap-outer.
  home: {
    boxSizing: "border-box",
    color: organizationHomeColors.mutedText,
    marginTop: "10px",
    minHeight: "450px",
    minWidth: { [globalBreakpoints.mobile]: "10px !important" },
    padding: { default: "0 10px", [globalBreakpoints.mobile]: "0 !important" },
    width: "100%",
  },
  projectHomeHeader: { marginBottom: "20px", padding: "5px 0", position: "relative" },
  overview: {
    borderLeftColor: "#fc491e",
    borderLeftStyle: "solid",
    borderLeftWidth: "3px",
    color: organizationHomeColors.accentText,
    padding: "0 10px",
  },
  overviewTitle: { fontSize: "14px", fontWeight: "normal", lineHeight: "30px" },
  // yona-original/app/assets/stylesheets/less/_yobiUI.less .search-bar.
  searchBar: {
    backgroundColor: "#FFF",
    borderColor: "#ccc",
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    height: "20px",
    lineHeight: "20px",
    padding: "4px 25px 4px 5px",
    position: "relative",
    "@media (max-width: 767px)": { margin: "5px 0" },
  },
  searchTextbox: {
    borderStyle: "none",
    borderWidth: "0px",
    height: "20px",
    margin: "0 -5px",
    padding: "0 5px",
    width: "350px",
  },
  searchTextboxFull: { width: "100%" },
  searchButton: {
    backgroundColor: "transparent",
    borderStyle: "none",
    borderWidth: "0px",
    height: "20px",
    outlineStyle: "none",
    outlineWidth: "0px",
    position: "absolute",
    right: "5px",
    top: "5px",
  },
  // yona-original/public/bootstrap/css/bootstrap.css .pull-right.
  createProjectWrapper: { float: "right" },
  // yona-original/app/assets/stylesheets/less/_page.less .all-projects.
  projects: { clear: "both", listStyle: "none", margin: "0 0 20px", minWidth: 0 },
  // organization/view.scala.html + yona-common item-search: an empty query shows every project.
  project: { display: "list-item" },
  projectInfo: { float: "left" },
  // yona-original/app/assets/stylesheets/less/_page.less .all-projects .project .info-wrap.
  projectCardOwnerAvatar: {
    borderRadius: "3px",
    display: "inline",
    float: "left",
    height: "50px",
    marginRight: "10px",
    overflow: "hidden",
    position: "relative",
    width: "50px",
  },
  projectCardHeader: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "5px",
    marginLeft: "10px",
  },
  projectCardDescription: {
    color: "#bababa",
    marginLeft: "10px",
    maxHeight: "100px",
    maxWidth: "647px",
    overflowY: "auto",
    textOverflow: "ellipsis",
  },
  projectCardNameTag: {
    color: "#999",
    fontSize: "11px",
    margin: "0",
    marginLeft: "10px",
  },
  // yona-original/public/bootstrap/css/bootstrap.css .pull-right.
  projectCardStatsWrapper: { float: "right" },
  projectCardStats: { marginTop: "0", textAlign: "right" },
  // yona-original/app/assets/stylesheets/less/_page.less .all-projects .project .stats-wrap .members.
  projectCardMembers: { width: "100%" },
  projectCardMembersList: {
    display: "inline-block",
    overflow: "hidden",
    paddingLeft: "50px",
  },
  // @secondary -> @blue2 in _variables.less.
  projectCardStatsCount: { color: "#51AACC" },
  members: { backgroundColor: organizationHomeColors.panelSurface },
  // yona-original/app/assets/stylesheets/less/_page.less .project-home/.inner.
  memberPanel: { padding: "10px" },
  memberPanelInner: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    boxShadow: "0 1px 0 rgba(0, 0, 0, .05)",
    fontSize: "12px",
    marginBottom: "10px",
    overflow: "hidden",
    verticalAlign: "top",
  },
  memberPanelHeader: { backgroundColor: "#F8F8F8", padding: "10px 0" },
  memberPanelTitle: {
    color: "#4C4C4C",
    display: "inline-block",
    fontSize: "12px",
    lineHeight: "20px",
    margin: "0",
  },
  // yona-original/app/assets/stylesheets/less/_page.less .project-members/.member.
  memberList: { listStyle: "none", margin: "0", padding: "10px" },
  member: {
    borderBottomColor: "#ededed",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    color: "#999",
    display: "block",
    padding: "5px 10px",
  },
  memberFirst: { paddingTop: "0" },
  memberLast: { borderBottomStyle: "none", borderBottomWidth: "0", paddingBottom: "0" },
  leaveModalVisible: { display: "block" },
  projectHidden: { display: "none" },
});
