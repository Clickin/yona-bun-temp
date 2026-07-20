import * as stylex from "@stylexjs/stylex";

export const organizationHomeColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
  panelSurface: "#f5f5f5",
  headerSurface: "#565656",
  menuSurface: "#ececec",
  menuBorder: "#dddddd",
});

export const styles = stylex.create({
  // yona-original/app/assets/stylesheets/less/_common.less .small-font.
  smallFont: { fontSize: "10px", fontWeight: "normal" },
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
  headerBackground: (backgroundImage: string) => ({ backgroundImage }),
  home: { color: organizationHomeColors.mutedText },
  overview: { color: organizationHomeColors.accentText },
  projects: { minWidth: 0 },
  // organization/view.scala.html + yona-common item-search: an empty query shows every project.
  project: { display: "list-item" },
  projectInfo: { float: "left" },
  members: { backgroundColor: organizationHomeColors.panelSurface },
  leaveModalVisible: { display: "block" },
  projectHidden: { display: "none" },
});
