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
