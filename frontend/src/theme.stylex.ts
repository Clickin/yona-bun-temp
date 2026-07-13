import * as stylex from "@stylexjs/stylex";

export const globalColors = stylex.defineVars({
  // _usermenu.less: #mySidenav background-color
  sidenavSurface: "#ffffff",
  // _usermenu.less: .sidenav color
  sidenavText: "#000000",
  // app.css: .sidenav .user-menu-wrap color (legacy _page.less: .sidebar counterpart)
  sidenavAccountText: "#808080",
  // _usermenu.less: @violet used by .logout:hover
  sidenavLogoutHover: "#9c27b0",
  // yona.Usermenu.js: openSidebar border
  sidenavBorder: "#cccccc",
  // _usermenu.less: #mySidenav box-shadow
  sidenavShadow: "2px 2px 10px #888888",
  // _yobiUI.less: .nav-tabs li a color
  sidenavTabAccent: "#3592b5",
  // Bootstrap 2.3.1 bootstrap.css: .nav-tabs border and active tab border
  sidenavTabBorder: "#dddddd",
  // Bootstrap 2.3.1 bootstrap.css: .nav-tabs li a:hover side/top border
  sidenavTabHoverBorder: "#eeeeee",
  // _variables.less: @yobi-white-dark used by .nav-tabs li a:hover
  sidenavTabHoverSurface: "#f2f2f2",
  // Bootstrap 2.3.1 bootstrap.css: .nav-tabs > .active > a color
  sidenavTabActiveText: "#555555",
  // Bootstrap 2.3.1 bootstrap.css: inactive/active-bottom tab borders and button background
  transparent: "transparent",
  // _usermenu.less: .user-project-list .no-result color
  sidenavNoResultText: "mediumvioletred",
  // _usermenu.less: .search-input focus bar background
  sidenavSearchFocusAccent: "#e91e63",
  // _usermenu.less: .user-ul::-webkit-scrollbar background
  sidenavScrollbarTrack: "#d3d3d3",
  // _usermenu.less: .user-ul::-webkit-scrollbar-thumb background
  sidenavScrollbarThumb: "#2788ba",
  // _usermenu.less: .nav-subtab.unstyled background-color
  sidenavSubtabSurface: "#eeeeee",
  // _usermenu.less: .nav-subtab.unstyled color
  sidenavSubtabText: "#000000",
  // _variables.less: @primary used by .nav-subtab active/interaction borders
  sidenavSubtabAccent: "#f36c22",
  // _yobiUI.less: .nav-subtab li.active a color
  sidenavSubtabActiveText: "#fcfcfc",
  // _usermenu.less: .user-project-list .org-list:hover background-color
  sidenavOrganizationHoverSurface: "#f1f1f1",
  // _usermenu.less: .sidebar .user-project-list .project-list:hover background-color
  leftSidebarRecentIssueHoverSurface: "rgba(255, 255, 255, 0.15)",
  // _usermenu.less: .sidebar .search-input background-color
  leftSidebarRecentSearchSurface: "#000000",
  // _page.less: .sidebar color inherited by Recent issue rows
  leftSidebarRecentIssueText: "#ffffff",
  // _usermenu.less: .issue-title-start color
  sidenavIssueTitleMarker: "darkgray",
  // _usermenu.less: .user-project-list .project-name.org-name color
  sidenavOrganizationName: "#00bcd4",
  // _usermenu.less: .star-project/.star-org base color
  sidenavFavoriteStarIdle: "#eeeeee",
  // _usermenu.less: .starred and star wrapper hover color
  sidenavFavoriteStarActive: "#e91e63",
  // _usermenu.less: .starred:hover color
  sidenavFavoriteStarActiveHover: "#8a123b",
  // _usermenu.less: .user-li .popover background-color
  sidenavPopoverSurface: "#03a9f4",
  // Bootstrap 2.3.1 .popover final border color
  sidenavPopoverBorder: "rgba(0, 0, 0, 0.2)",
  // Bootstrap 2.3.1 .popover.right .arrow final border color
  sidenavPopoverArrowBorder: "rgba(0, 0, 0, 0.25)",
  // _yobiUI.less: .popover final box-shadow
  sidenavPopoverShadow: "-2px 2px 1px rgba(0, 0, 0, 0.1)",
  // _variables.less: @blue
  navigationAccent: "#5dbbe0",
  // _variables.less: @primary -> @orange
  navigationCreateAction: "#f36c22",
  // _page.less: .gnb-usermenu > li.divider::after
  navigationDivider: "#788ba7",
  // _variables.less: @low-white
  navigationDropdownText: "#efefef",
  // _page.less: .gnb-usermenu-item
  textMuted: "#a2a2a2",
  // _variables.less: @white
  textOnAccent: "#ffffff",
  // _page.less: .gnb-usermenu-item a:hover
  textOnDarkHover: "#fcfcfc",
});
