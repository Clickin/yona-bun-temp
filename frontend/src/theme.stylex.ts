import * as stylex from "@stylexjs/stylex";

export const globalColors = stylex.defineVars({
  // _usermenu.less: #mySidenav top
  sidenavBaseTop: "40px",
  // index/notifications.scala.html: site-admin affix side-nav top
  sidenavAdminAffixTop: "84px",
  // _usermenu.less: #mySidenav background-color
  sidenavSurface: "#ffffff",
  // _usermenu.less: .sidenav color
  sidenavText: "#000000",
  // app.css: .sidenav .user-menu-wrap color (legacy _page.less: .sidebar counterpart)
  sidenavAccountText: "#808080",
  // _usermenu.less: .logout color in the authenticated right side-nav
  sidenavAccountLogoutText: "#ffffff",
  // Bootstrap 2.3.1 .label background-color in the authenticated right side-nav
  sidenavAccountLogoutSurface: "#999999",
  // Bootstrap 2.3.1 .label text-shadow in the authenticated right side-nav
  sidenavAccountLogoutTextShadow: "0 -1px 0 rgba(0, 0, 0, 0.25)",
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
  // _usermenu.less: .sidebar .search-input background-color for the Favorite shell
  leftSidebarFavoriteSearchSurface: "#000000",
  // _usermenu.less: .sidebar .search-input color for the Favorite shell
  leftSidebarFavoriteSearchText: "#ffffff",
  // _usermenu.less: .sidebar .user-project-list .org-list:hover
  leftSidebarFavoriteOrganizationHoverSurface: "rgba(255, 255, 255, 0.15)",
  // _usermenu.less: .all-org-names and the angle glyph in the left Favorite pane
  leftSidebarFavoriteOrganizationText: "#ffffff",
  // _usermenu.less: .project-name.org-name in the left Favorite pane
  leftSidebarFavoriteOrganizationName: "#00bcd4",
  // _usermenu.less: .project-owner in the left Favorite pane
  leftSidebarFavoriteOrganizationCount: "#808080",
  // _usermenu.less: .star-org base color
  leftSidebarFavoriteOrganizationStarIdle: "#eeeeee",
  // _usermenu.less: .starred and .star-org:hover
  leftSidebarFavoriteOrganizationStarActive: "#e91e63",
  // _usermenu.less: .starred:hover
  leftSidebarFavoriteOrganizationStarActiveHover: "#8a123b",
  // _usermenu.less: .user-project-list .etc-favorites border-top
  leftSidebarFavoriteDividerBorder: "#808080",
  // _page.less: .sidebar color inherited by direct project rows
  leftSidebarDirectProjectText: "#ffffff",
  // _usermenu.less: .project-avatar color in direct project rows
  leftSidebarDirectProjectAvatar: "#000000",
  // _usermenu.less: .project-owner color in direct project rows
  leftSidebarDirectProjectOwnerText: "#808080",
  // _usermenu.less: .sidebar .user-project-list .project-list:hover
  leftSidebarDirectProjectHoverSurface: "rgba(255, 255, 255, 0.15)",
  // _usermenu.less: .star-project base color
  leftSidebarDirectProjectStarIdle: "#eeeeee",
  // _usermenu.less: .star-project:hover and .starred
  leftSidebarDirectProjectStarActive: "#e91e63",
  // _usermenu.less: .starred:hover
  leftSidebarDirectProjectStarActiveHover: "#8a123b",
  // _page.less: .sidebar color inherited by Favorite nested project rows
  leftSidebarFavoriteNestedProjectText: "#ffffff",
  // _usermenu.less: .project-avatar color in Favorite nested project rows
  leftSidebarFavoriteNestedProjectAvatar: "#000000",
  // _usermenu.less: .sidebar .user-project-list .project-list:hover
  leftSidebarFavoriteNestedProjectHoverSurface: "rgba(255, 255, 255, 0.15)",
  // _usermenu.less: .star-project base color
  leftSidebarFavoriteNestedProjectStarIdle: "#eeeeee",
  // _usermenu.less: .star-project:hover and .starred
  leftSidebarFavoriteNestedProjectStarActive: "#e91e63",
  // _usermenu.less: .starred:hover
  leftSidebarFavoriteNestedProjectStarActiveHover: "#8a123b",
  // _usermenu.less: .user-li .popover background-color
  leftSidebarFavoriteNestedProjectPopoverSurface: "#03a9f4",
  // Bootstrap 2.3.1 .popover final border color
  leftSidebarFavoriteNestedProjectPopoverBorder: "rgba(0, 0, 0, 0.2)",
  // Bootstrap 2.3.1 .popover.right .arrow final border color
  leftSidebarFavoriteNestedProjectPopoverArrowBorder: "rgba(0, 0, 0, 0.25)",
  // _yobiUI.less: .popover final box-shadow
  leftSidebarFavoriteNestedProjectPopoverShadow: "-2px 2px 1px rgba(0, 0, 0, 0.1)",
  // _page.less: .sidebar background-color
  leftSidebarOuterSurface: "#333333",
  // _usermenu.less: .sidebar color
  leftSidebarOuterText: "#ffffff",
  // _page.less: .sidebar border-right
  leftSidebarOuterBorder: "#000000",
  // _page.less: .sidebar .user-menu-wrap color
  leftSidebarAccountText: "#808080",
  // _page.less: .sidebar .user-menu-wrap a:hover color
  leftSidebarAccountHoverText: "#ffffff",
  // _yobiUI.less: .avatar-wrap background in the left sidebar profile identity
  leftSidebarProfileAvatarSurface: "#dddddd",
  // _usermenu.less: .logout color
  leftSidebarAccountLogoutText: "#ffffff",
  // Bootstrap 2.3.1 .label background-color
  leftSidebarAccountLogoutSurface: "#999999",
  // Bootstrap 2.3.1 .label text-shadow
  leftSidebarAccountLogoutTextShadow: "0 -1px 0 rgba(0, 0, 0, 0.25)",
  // _usermenu.less: .logout:hover background-color
  leftSidebarAccountLogoutHoverSurface: "#9c27b0",
  // _usermenu.less: .nav-subtab.unstyled background-color in the left Project pane
  leftSidebarProjectSubtabSurface: "#eeeeee",
  // _usermenu.less: .nav-subtab.unstyled color in the left Project pane
  leftSidebarProjectSubtabText: "#000000",
  // _variables.less: @primary -> @orange for the left Project subtabs
  leftSidebarProjectSubtabAccent: "#f36c22",
  // _yobiUI.less: .nav-subtab li.active a color in the left Project pane
  leftSidebarProjectSubtabActiveText: "#fcfcfc",
  // _usermenu.less: .sidebar .search-input background-color in the left Project pane
  leftSidebarProjectSearchSurface: "#000000",
  // _usermenu.less: .sidebar .search-input color in the left Project pane
  leftSidebarProjectSearchText: "#ffffff",
  // _page.less: .sidebar .nav-tabs li a color
  leftSidebarTabText: "lightgray",
  // _page.less: .sidebar .nav-tabs active/interaction color
  leftSidebarTabAccent: "#f36c22",
  // _page.less: .sidebar .nav-tabs active/interaction background-color
  leftSidebarTabSurface: "#000000",
  // _page.less: .yobicon-refresh:hover color
  leftSidebarRefreshAccent: "#03a9f4",
  // _page.less: .pin-in-sidebar background-color
  leftSidebarClosePinSurface: "#03a9f4",
  // _page.less: .pin-in-sidebar color
  leftSidebarClosePinText: "#3e2723",
  // _page.less: .pin-in-sidebar icon hover and React button focus color
  leftSidebarClosePinInteractionText: "#ffffff",
  // layout_framed.scala.html: #sidebar-bottom color
  leftSidebarFooterText: "#808080",
  // layout_framed.scala.html: #sidebar-bottom .yobicon-hearts color
  leftSidebarFooterHeart: "#ff0000",
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
