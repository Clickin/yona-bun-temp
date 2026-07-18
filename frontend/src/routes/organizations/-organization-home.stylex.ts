import * as stylex from "@stylexjs/stylex";

export const organizationHomeColors = stylex.defineVars({
  mutedText: "#777777",
  accentText: "#337581",
  panelSurface: "#f5f5f5",
});

export const styles = stylex.create({
  projectVisibilityBadge: { color: "#788ba7", fontSize: "14px", marginLeft: "5px" },
  projectUtilWrap: { bottom: "20px", position: "absolute", right: "0" },
  projectUtil: { listStyle: "none", margin: "0" },
  projectUtilItem: { float: "left", marginLeft: "15px", position: "relative" },
  projectUtilIcons: { margin: "10px 0px 10px 25px" },
  headerBackground: (backgroundImage: string) => ({ backgroundImage }),
  home: { color: organizationHomeColors.mutedText },
  overview: { color: organizationHomeColors.accentText },
  projects: { minWidth: 0 },
  projectInfo: { float: "left" },
  members: { backgroundColor: organizationHomeColors.panelSurface },
  leaveModalVisible: { display: "block" },
  projectHidden: { display: "none" },
});
