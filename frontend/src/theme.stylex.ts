import * as stylex from "@stylexjs/stylex";

export const globalBreakpoints = stylex.defineConsts({
  mobile: "@media (max-width: 720px)",
});

export const globalColors = stylex.defineVars({
  // _page.less: .admin-logged-in-affix background-color
  siteAdminAffixSurface: "#ad0000",
  // _variables.less: @yobi-white used by .admin-logged-in-affix
  siteAdminAffixText: "#ffffff",
  // _page.less: .admin-logged-in-affix padding
  siteAdminAffixPadding: "10px",
  // _page.less: .admin-logged-in-affix desktop width
  siteAdminAffixWidth: "100%",
  // _page.less: .admin-logged-in-affix font-size
  siteAdminAffixFontSize: "20px",
  // _page.less: .admin-logged-in-affix bold font-weight
  siteAdminAffixFontWeight: "700",
  // _page.less: .admin-logged-in-affix z-index
  siteAdminAffixZIndex: "1000",
  // _common.less: .small-font font-size
  siteAdminAffixDetailFontSize: "10px",
  // _common.less: .small-font normal font-weight
  siteAdminAffixDetailFontWeight: "400",
  // _page.less and _responsive.less: .gnb-outer base, project, and mobile states
  globalGnbOuterHeight: "40px",
  globalGnbOuterSurface: "#1b1b1b",
  globalGnbOuterPaddingInline: "10px",
  globalGnbOuterZero: "0px",
  globalGnbOuterBoxSizing: "border-box",
  globalGnbOuterProjectSurface: "rgba(0, 0, 0, 0.35)",
  globalGnbOuterProjectPosition: "absolute",
  globalGnbOuterProjectWidth: "100%",
  globalGnbOuterProjectZIndex: "1000",
  globalGnbOuterMobileMinWidth: "10px",
  // _page.less and _responsive.less: SiteLayout .page-footer-outer/.page-footer/.provider
  siteFooterSurface: "#ffffff",
  siteFooterPadding: "10px",
  siteFooterBoxSizing: "content-box",
  siteFooterZero: "0px",
  siteFooterMobileMinWidth: "10px",
  siteFooterInnerWidth: "100%",
  siteFooterInnerMargin: "0px auto",
  siteFooterInnerTextAlign: "center",
  siteFooterInnerLineHeight: "34px",
  siteFooterProviderMarginLeft: "4px",
  siteFooterProviderFontFamily: "Verdana",
  siteFooterProviderFontSize: "9px",
  siteFooterProviderText: "#333333",
  // layout_framed.scala.html flattening of .framed-body, .main, #mainFrame, and mobile height
  framedSiteWidth: "100%",
  framedSiteMinWidth: "0px",
  framedSiteMainSurface: "#ffffff",
  framedSiteOpenDisplay: "flex",
  framedSiteOpenHeight: "100vh",
  framedSiteOpenOverflow: "hidden",
  framedSiteMainFlex: "1 1 auto",
  framedSiteMainAutoWidth: "auto",
  framedSiteMainOverflowY: "auto",
  framedSiteMobilePosition: "relative",
  framedSiteMobileDisplay: "block",
  // _page.less and _responsive.less: authenticated index .page-wrap-outer/.page-wrap
  authenticatedHomePageWrapOuterMinHeight: "450px",
  authenticatedHomePageWrapOuterMarginTop: "10px",
  authenticatedHomePageWrapOuterWidth: "100%",
  authenticatedHomePageWrapOuterPaddingInline: "10px",
  authenticatedHomePageWrapOuterZero: "0px",
  authenticatedHomePageWrapOuterMobileMinWidth: "10px",
  authenticatedHomePageWrapOuterBoxSizing: "border-box",
  authenticatedHomePageWrapSurface: "#ffffff",
  authenticatedHomePageWrapMargin: "0px auto",
  authenticatedHomePageWrapBoxSizing: "content-box",
  // _page.less/_responsive.less/_override.less: authenticated index intro guide owner
  authenticatedHomeIntroGuideMargin: "30px 0px 0px",
  authenticatedHomeIntroGuideMobileMargin: "40px 0px 0px",
  authenticatedHomeIntroGuideHiddenDisplay: "none",
  authenticatedHomeIntroGuideHiddenMarginTop: "0px",
  authenticatedHomeIntroGuideHiddenMobileMarginTop: "40px",
  authenticatedHomeIntroGuideHeadingMargin: "0px",
  authenticatedHomeIntroGuideHeadingPadding: "0px",
  authenticatedHomeIntroGuideHeadingFontSize: "14px",
  authenticatedHomeIntroGuideHeadingFontWeight: "700",
  authenticatedHomeIntroGuideHeadingText: "#333333",
  authenticatedHomeIntroGuideTableMarginBottom: "-1px",
  authenticatedHomeIntroGuideTableBorderBottomColor: "#eeeeee",
  authenticatedHomeIntroGuideTableBorderBottomStyle: "solid",
  authenticatedHomeIntroGuideTableBorderBottomWidth: "1px",
  authenticatedHomeIntroGuideCellFontSize: "14px",
  authenticatedHomeIntroGuideCellVerticalAlign: "middle",
  authenticatedHomeIntroGuideCellBorderTopStyle: "none",
  authenticatedHomeIntroGuideLinkWidth: "85%",
  authenticatedHomeIntroGuideToggleTextAlign: "center",
  authenticatedHomeIntroGuideToggleDisplay: "inline-block",
  authenticatedHomeIntroGuideTogglePadding: "0px 25px",
  authenticatedHomeIntroGuideToggleText: "#95a5a6",
  authenticatedHomeIntroGuideToggleBorderColor: "rgba(0, 0, 0, 0.1)",
  authenticatedHomeIntroGuideToggleBorderStyle: "solid",
  authenticatedHomeIntroGuideToggleBorderWidth: "1px",
  authenticatedHomeIntroGuideToggleBorderTopColor: "#ffffff",
  authenticatedHomeIntroGuideToggleBorderTopWidth: "2px",
  authenticatedHomeIntroGuideToggleRadius: "0px 0px 6px 6px",
  authenticatedHomeIntroGuideIconFontSize: "12px",
  // Bootstrap 2.3.1 grid + _page.less/_responsive.less: authenticated index outer content grid
  authenticatedHomeContentPageRadius: "20px",
  authenticatedHomeContentZero: "0px",
  authenticatedHomeContentGridWidth: "100%",
  authenticatedHomeContentGridPseudoDisplay: "table",
  authenticatedHomeContentGridPseudoContent: '""',
  authenticatedHomeContentGridPseudoClear: "both",
  authenticatedHomeContentColumnDisplay: "block",
  authenticatedHomeContentColumnFloat: "left",
  authenticatedHomeContentColumnBoxSizing: "border-box",
  authenticatedHomeContentColumnMinHeight: "30px",
  authenticatedHomeContentMainWidth: "65.95744680851064%",
  authenticatedHomeContentMainMobileWidth: "100%",
  authenticatedHomeContentMainMarginBottom: "15px",
  authenticatedHomeContentRailWidth: "31.914893617021278%",
  authenticatedHomeContentRailMarginLeft: "2.127659574468085%",
  authenticatedHomeContentRailMarginTop: "10px",
  authenticatedHomeContentRailMobileMinWidth: "95%",
  // Bootstrap 2.3.1 + _yobiUI.less/_responsive.less: authenticated Home series tabs
  authenticatedHomeSeriesTabsZero: "0px",
  authenticatedHomeSeriesTabsMarginBottom: "20px",
  authenticatedHomeSeriesTabsListStyle: "none",
  authenticatedHomeSeriesTabsBorderColor: "#dddddd",
  authenticatedHomeSeriesTabsTransparentBorder: "transparent",
  authenticatedHomeSeriesTabsBorderStyle: "solid",
  authenticatedHomeSeriesTabsBorderWidth: "1px",
  authenticatedHomeSeriesTabsPseudoDisplay: "table",
  authenticatedHomeSeriesTabsPseudoContent: '""',
  authenticatedHomeSeriesTabsPseudoClear: "both",
  authenticatedHomeSeriesTabItemFloat: "left",
  authenticatedHomeSeriesTabItemMarginBottom: "-1px",
  authenticatedHomeSeriesTabActionPosition: "relative",
  authenticatedHomeSeriesTabLinkDisplay: "block",
  authenticatedHomeSeriesTabLinkPaddingBlock: "8px",
  authenticatedHomeSeriesTabLinkPaddingInline: "30px",
  authenticatedHomeSeriesTabLinkMobilePaddingInline: "5px",
  authenticatedHomeSeriesTabLinkMarginRight: "2px",
  authenticatedHomeSeriesTabLinkLineHeight: "20px",
  authenticatedHomeSeriesTabLinkRadius: "4px 4px 0px 0px",
  authenticatedHomeSeriesTabLinkText: "#3592b5",
  authenticatedHomeSeriesTabLinkFontWeight: "700",
  authenticatedHomeSeriesTabLinkCursor: "pointer",
  authenticatedHomeSeriesTabLinkTextDecoration: "none",
  authenticatedHomeSeriesTabLinkHoverSurface: "#f2f2f2",
  authenticatedHomeSeriesTabLinkFocusSurface: "#eeeeee",
  authenticatedHomeSeriesTabLinkInteractionBorderBlockStart: "#eeeeee",
  authenticatedHomeSeriesTabLinkInteractionBorderInline: "#eeeeee",
  authenticatedHomeSeriesTabLinkInteractionBorderBlockEnd: "#dddddd",
  authenticatedHomeSeriesTabActiveText: "#555555",
  authenticatedHomeSeriesTabActiveSurface: "#ffffff",
  authenticatedHomeSeriesTabActiveCursor: "default",
  // Bootstrap 2.3.1 + _yobiUI.less/_responsive.less: authenticated Home default-login action
  authenticatedHomeDefaultLoginZero: "0px",
  authenticatedHomeDefaultLoginButtonDisplay: "inline-block",
  authenticatedHomeDefaultLoginButtonMobileDisplay: "none",
  authenticatedHomeDefaultLoginButtonBoxSizing: "content-box",
  authenticatedHomeDefaultLoginButtonPadding: "4px 12px",
  authenticatedHomeDefaultLoginButtonFontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  authenticatedHomeDefaultLoginButtonFontSize: "14px",
  authenticatedHomeDefaultLoginButtonFontWeight: "400",
  authenticatedHomeDefaultLoginButtonLineHeight: "20px",
  authenticatedHomeDefaultLoginButtonText: "#333333",
  authenticatedHomeDefaultLoginButtonSurface: "#ffffff",
  authenticatedHomeDefaultLoginButtonInteractionText: "#292929",
  authenticatedHomeDefaultLoginButtonInteractionSurface: "#f1f1f1",
  authenticatedHomeDefaultLoginButtonBorderColor: "rgba(0, 0, 0, 0.15)",
  authenticatedHomeDefaultLoginButtonInteractionBorderColor: "rgba(0, 0, 0, 0.25)",
  authenticatedHomeDefaultLoginButtonBorderWidth: "1px",
  authenticatedHomeDefaultLoginButtonBorderStyle: "solid",
  authenticatedHomeDefaultLoginButtonRadius: "3px",
  authenticatedHomeDefaultLoginButtonShadow: "0px 1px 0px rgba(0, 0, 0, 0.05)",
  authenticatedHomeDefaultLoginButtonTransition: "all 0.3s ease",
  authenticatedHomeDefaultLoginButtonTextAlign: "center",
  authenticatedHomeDefaultLoginButtonWhiteSpace: "nowrap",
  authenticatedHomeDefaultLoginButtonTextShadow: "none",
  authenticatedHomeDefaultLoginButtonVerticalAlign: "middle",
  authenticatedHomeDefaultLoginButtonCursor: "pointer",
  authenticatedHomeDefaultLoginButtonPosition: "relative",
  authenticatedHomeDefaultLoginButtonOutline: "0px none",
  authenticatedHomeDefaultLoginButtonZIndex: "2",
  authenticatedHomeDefaultLoginButtonTextDecoration: "none",
  authenticatedHomeDefaultLoginPopoverPosition: "absolute",
  authenticatedHomeDefaultLoginPopoverTop: "100%",
  authenticatedHomeDefaultLoginPopoverLeft: "50%",
  authenticatedHomeDefaultLoginPopoverTransform: "translateX(-50%)",
  authenticatedHomeDefaultLoginPopoverZIndex: "1010",
  authenticatedHomeDefaultLoginPopoverDisplay: "block",
  authenticatedHomeDefaultLoginPopoverIntrinsicWidth: "max-content",
  authenticatedHomeDefaultLoginPopoverMaxWidth: "276px",
  authenticatedHomeDefaultLoginPopoverPadding: "1px",
  authenticatedHomeDefaultLoginPopoverMarginTop: "10px",
  authenticatedHomeDefaultLoginPopoverFontSize: "13px",
  authenticatedHomeDefaultLoginPopoverFontWeight: "400",
  authenticatedHomeDefaultLoginPopoverLineHeight: "13px",
  authenticatedHomeDefaultLoginPopoverText: "#333333",
  authenticatedHomeDefaultLoginPopoverSurface: "#ffffff",
  authenticatedHomeDefaultLoginPopoverBorderColor: "rgba(0, 0, 0, 0.2)",
  authenticatedHomeDefaultLoginPopoverRadius: "2px",
  authenticatedHomeDefaultLoginPopoverShadow: "-2px 2px 1px rgba(0, 0, 0, 0.1)",
  authenticatedHomeDefaultLoginPopoverOpacity: "1",
  authenticatedHomeDefaultLoginPopoverTextAlign: "left",
  authenticatedHomeDefaultLoginPopoverWhiteSpace: "normal",
  authenticatedHomeDefaultLoginPopoverBackgroundClip: "padding-box",
  authenticatedHomeDefaultLoginPopoverTitlePadding: "8px 14px",
  authenticatedHomeDefaultLoginPopoverTitleFontSize: "14px",
  authenticatedHomeDefaultLoginPopoverTitleLineHeight: "18px",
  authenticatedHomeDefaultLoginPopoverTitleSurface: "#f7f7f7",
  authenticatedHomeDefaultLoginPopoverTitleBorderColor: "#ebebeb",
  authenticatedHomeDefaultLoginPopoverTitleRadius: "5px 5px 0px 0px",
  authenticatedHomeDefaultLoginPopoverContentPadding: "9px 10px",
  authenticatedHomeDefaultLoginPopoverContentLineHeight: "15.6px",
  authenticatedHomeDefaultLoginPopoverArrowSize: "11px",
  authenticatedHomeDefaultLoginPopoverArrowInnerSize: "10px",
  authenticatedHomeDefaultLoginPopoverArrowTop: "-11px",
  authenticatedHomeDefaultLoginPopoverArrowLeft: "50%",
  authenticatedHomeDefaultLoginPopoverArrowMarginLeft: "-11px",
  authenticatedHomeDefaultLoginPopoverArrowBorderColor: "rgba(0, 0, 0, 0.25)",
  authenticatedHomeDefaultLoginPopoverArrowTransparent: "transparent",
  authenticatedHomeDefaultLoginPopoverArrowInnerTop: "1px",
  authenticatedHomeDefaultLoginPopoverArrowInnerMarginLeft: "-10px",
  authenticatedHomeDefaultLoginPopoverArrowInnerBorderColor: "#ffffff",
  authenticatedHomeDefaultLoginPopoverArrowContent: '""',
  // Bootstrap 2.3.1 ul.unstyled + _page.less: authenticated Home notification list/empty state
  authenticatedHomeNotificationZero: "0px",
  authenticatedHomeNotificationListStyle: "none",
  authenticatedHomeNotificationEmptyPadding: "15px 20px",
  authenticatedHomeNotificationEmptyText: "#ffffff",
  authenticatedHomeNotificationEmptyFontSize: "16px",
  authenticatedHomeNotificationEmptyTextAlign: "center",
  authenticatedHomeNotificationEmptySurface: "#8b8b8b",
  authenticatedHomeNotificationEmptyBorderStyle: "none",
  authenticatedHomeNotificationEmptyBorderWidth: "0px",
  authenticatedHomeNotificationEmptyRadius: "6px",
  // _page.less #notification-more plus the existing React button parity bridge
  authenticatedHomeNotificationPaginationMarginTop: "20px",
  authenticatedHomeNotificationPaginationWidth: "95%",
  authenticatedHomeNotificationPaginationBoxSizing: "content-box",
  // _page.less: authenticated Home populated notification row and descendants
  authenticatedHomeNotificationRowClear: "both",
  authenticatedHomeNotificationRowText: "#dddddd",
  authenticatedHomeNotificationRowPadding: "5px 5px 5px 25px",
  authenticatedHomeNotificationRowPosition: "relative",
  authenticatedHomeNotificationRowCursor: "pointer",
  authenticatedHomeNotificationRowBorder: "1px",
  authenticatedHomeNotificationRowBorderStyle: "solid",
  authenticatedHomeNotificationRowHoverSurface: "#f5f5f5",
  authenticatedHomeNotificationTypeDisplay: "inline-block",
  authenticatedHomeNotificationTypePadding: "4px 6px",
  authenticatedHomeNotificationTypeBaseText: "#4caf50",
  authenticatedHomeNotificationTypeTextAlign: "center",
  authenticatedHomeNotificationTypeLineHeight: "20px",
  authenticatedHomeNotificationTypeFontSize: "20px",
  authenticatedHomeNotificationTypeFontWeight: "700",
  authenticatedHomeNotificationTypeVerticalAlign: "top",
  authenticatedHomeNotificationTypeMarginTop: "2px",
  authenticatedHomeNotificationTypeClosedText: "#fd6956",
  authenticatedHomeNotificationTypeChangedText: "#65c9df",
  authenticatedHomeNotificationTypeRejectedText: "#fd8658",
  authenticatedHomeNotificationTypeWarningText: "#fcc666",
  authenticatedHomeNotificationTypeMergedText: "#65c9df",
  authenticatedHomeNotificationTypeCommentText: "#8b008b",
  authenticatedHomeNotificationTypeInfoText: "#999999",
  authenticatedHomeNotificationTypeListText: "#795548",
  authenticatedHomeNotificationTypeEllipsisText: "#808080",
  authenticatedHomeNotificationUpdatedFontSize: "12px",
  authenticatedHomeNotificationUpdatedText: "#ffffff",
  authenticatedHomeNotificationUpdatedBorder: "1px",
  authenticatedHomeNotificationUpdatedBorderStyle: "solid",
  authenticatedHomeNotificationUpdatedRadius: "3px",
  authenticatedHomeNotificationUpdatedPadding: "0px 2px",
  authenticatedHomeNotificationUpdatedSurface: "#ff9800",
  authenticatedHomeNotificationUpdatedWidth: "26px",
  authenticatedHomeNotificationDescPadding: "4px 7px 7px",
  authenticatedHomeNotificationDescWidth: "90%",
  authenticatedHomeNotificationTitleText: "#51aacc",
  authenticatedHomeNotificationTitleFontSize: "14px",
  authenticatedHomeNotificationTitleFontWeight: "700",
  authenticatedHomeNotificationTitleOverflow: "hidden",
  authenticatedHomeNotificationTitleTextOverflow: "ellipsis",
  authenticatedHomeNotificationTitleWhiteSpace: "nowrap",
  authenticatedHomeNotificationMessageMarginTop: "3px",
  authenticatedHomeNotificationMessageText: "#888888",
  authenticatedHomeNotificationMessageFontSize: "13px",
  authenticatedHomeNotificationMessageLineHeight: "20px",
  authenticatedHomeNotificationMessageTransition: "all 0.3s ease",
  authenticatedHomeNotificationMessageMinHeight: "20px",
  authenticatedHomeNotificationMessageMaxHeight: "200px",
  authenticatedHomeNotificationMessageWordBreak: "break-all",
  authenticatedHomeNotificationMoreSurface: "#e0e0e0",
  authenticatedHomeNotificationMorePadding: "0px 10px 5px",
  authenticatedHomeNotificationMoreLineHeight: "10px",
  authenticatedHomeNotificationMoreRadius: "2px",
  authenticatedHomeNotificationMoreHiddenDisplay: "none",
  authenticatedHomeNotificationMetaMarginTop: "5px",
  authenticatedHomeNotificationMetaText: "#bbbbbb",
  authenticatedHomeNotificationMetaFontSize: "12px",
  authenticatedHomeNotificationAvatarMarginTop: "3px",
  authenticatedHomeNotificationAuthorText: "#666666",
  authenticatedHomeNotificationAuthorHoverText: "#f36c22",
  authenticatedHomeNotificationAgoFloat: "right",
  // _page.less: .gnb-inner layout with the live legacy box model
  globalGnbInnerBoxSizing: "content-box",
  globalGnbInnerWidth: "98%",
  globalGnbInnerHeight: "40px",
  globalGnbInnerMargin: "0px auto",
  globalGnbInnerText: "#788ba7",
  // _page.less: .gnb-inner .logo-letter background
  globalGnbBrandSurface: "#ff5722",
  // _page.less: .gnb-inner .logo-letter color
  globalGnbBrandText: "#803131",
  // _page.less: .gnb-inner .logo width
  globalGnbBrandWidth: "44px",
  // _page.less: .gnb-inner .logo height and .gnb-nav anchor line-height
  globalGnbBrandHeight: "40px",
  // _page.less: .gnb-inner .logo-letter vertical padding
  globalGnbBrandPaddingBlock: "6px",
  // _page.less: .gnb-inner .logo-letter horizontal padding
  globalGnbBrandPaddingInline: "10px",
  // _page.less: .gnb-inner .logo-letter border-radius
  globalGnbBrandRadius: "2px",
  // _page.less: .gnb-inner .logo-letter opacity
  globalGnbBrandOpacity: "0.7",
  // _page.less: .gnb-inner .logo-letter:hover opacity
  globalGnbBrandInteractionOpacity: "1",
  // _page.less: .gnb-inner .logo background-position
  globalGnbBrandBackgroundPosition: "11px 10px",
  // _page.less: .gnb-inner .logo pseudo-element width
  globalGnbBrandPseudoWidth: "1px",
  // _page.less: .gnb-inner .logo::after margin-left
  globalGnbBrandPseudoAfterMargin: "40px",
  // _responsive.less: max-720 .gnb-inner .logo::after inherited margin-left
  globalGnbBrandResponsivePseudoAfterMargin: "0px",
  // _page.less: .gnb-nav anchor color transition duration
  globalGnbBrandTransitionDuration: "0.15s",
  // _page.less: .gnb-inner .gnb-nav layout and Bootstrap 2.3.1 list reset
  globalGnbNavDisplay: "block",
  globalGnbNavFloat: "left",
  globalGnbNavPosition: "static",
  globalGnbNavZero: "0px",
  globalGnbNavMarginLeft: "15px",
  globalGnbNavText: "#a2a2a2",
  globalGnbNavFontSize: "14px",
  globalGnbNavFontWeight: "400",
  globalGnbNavLineHeight: "20px",
  globalGnbNavListStyle: "none",
  globalGnbNavBoxSizing: "content-box",
  // _page.less: .gnb-nav li float
  globalGnbNavItemFloat: "left",
  // _page.less: .gnb-nav li position
  globalGnbNavItemPosition: "relative",
  // Bootstrap 2.3.1 .input-prepend display
  globalGnbSearchDisplay: "inline-block",
  // _page.less: .gnb-search-form font-size
  globalGnbSearchFontSize: "0px",
  // _page.less: .gnb-search-form line-height
  globalGnbSearchLineHeight: "30px",
  // _page.less: .gnb-search-form margin-top
  globalGnbSearchMarginTop: "5px",
  // _page.less: .gnb-search-form zero margin and padding edges
  globalGnbSearchZero: "0px",
  // Bootstrap 2.3.1 .input-prepend white-space
  globalGnbSearchWhiteSpace: "nowrap",
  // Bootstrap 2.3.1 .input-prepend vertical-align
  globalGnbSearchVerticalAlign: "middle",
  // _page.less: .search-box and the React parity bridge wrapper declarations
  globalGnbSearchBoxSurface: "#ffffff",
  globalGnbSearchBoxBorderStyle: "none",
  globalGnbSearchBoxBoxSizing: "content-box",
  globalGnbSearchBoxDisplay: "inline-block",
  globalGnbSearchBoxHeight: "30px",
  globalGnbSearchBoxRadius: "3px",
  globalGnbSearchBoxVerticalAlign: "middle",
  globalGnbSearchBoxZero: "0px",
  // Bootstrap 2.3.1 generic button, frozen _common.less, _page.less .search-box button,
  // and the React parity bridge rendered by common/navbar.scala.html.
  globalGnbSearchSubmitAppearance: "button",
  globalGnbSearchSubmitBackground: "transparent",
  globalGnbSearchSubmitBorderStyle: "none",
  globalGnbSearchSubmitBoxSizing: "border-box",
  globalGnbSearchSubmitColor: "#000000",
  globalGnbSearchSubmitCursor: "pointer",
  globalGnbSearchSubmitDisplay: "inline-block",
  globalGnbSearchSubmitFontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  globalGnbSearchSubmitFontSize: "12px",
  globalGnbSearchSubmitFontWeight: "400",
  globalGnbSearchSubmitLineHeight: "20px",
  globalGnbSearchSubmitMargin: "5px",
  globalGnbSearchSubmitMinHeight: "0px",
  globalGnbSearchSubmitOutlineStyle: "none",
  globalGnbSearchSubmitPadding: "0px",
  globalGnbSearchSubmitShadow: "none",
  globalGnbSearchSubmitTextAlign: "center",
  globalGnbSearchSubmitVerticalAlign: "middle",
  globalGnbSearchSubmitZero: "0px",
  // Bootstrap 2.3.1 text input, .input-prepend input, frozen _page.less .search-box input,
  // and _yobiUI.less generic text-input declarations rendered by common/navbar.scala.html.
  globalGnbSearchInputBackground: "#ffffff",
  globalGnbSearchInputBorderStyle: "none",
  globalGnbSearchInputBoxSizing: "content-box",
  globalGnbSearchInputColor: "#555555",
  globalGnbSearchInputDisplay: "inline-block",
  globalGnbSearchInputFontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  globalGnbSearchInputFontSize: "12px",
  globalGnbSearchInputFontWeight: "400",
  globalGnbSearchInputHeight: "20px",
  globalGnbSearchInputLineHeight: "30px",
  globalGnbSearchInputMarginBottom: "3px",
  globalGnbSearchInputMaxWidth: "none",
  globalGnbSearchInputMinHeight: "0px",
  globalGnbSearchInputOutlineStyle: "none",
  globalGnbSearchInputPaddingBlock: "5px",
  globalGnbSearchInputPaddingInline: "10px",
  globalGnbSearchInputPosition: "relative",
  globalGnbSearchInputRadius: "2px",
  globalGnbSearchInputShadow: "none",
  globalGnbSearchInputTransitionDuration: "0.3s",
  globalGnbSearchInputTransitionProperty: "width",
  globalGnbSearchInputTransitionTiming: "ease",
  globalGnbSearchInputVerticalAlign: "top",
  globalGnbSearchInputWidth: "50px",
  globalGnbSearchInputZIndex: "auto",
  globalGnbSearchInputZero: "0px",
  // _page.less .search-box input:focus, _responsive.less @media all focus cap,
  // _yobiUI.less primary focus border, and Bootstrap .input-prepend input:focus stacking.
  globalGnbSearchInputFocusBorderColor: "#f36c22",
  globalGnbSearchInputFocusMaxWidth: "250px",
  globalGnbSearchInputFocusWidth: "200px",
  globalGnbSearchInputFocusZIndex: "2",
  // Bootstrap 2.3.1 .btn-group and frozen _yobiUI.less .dropdown-menu.flat search-scope values
  globalGnbSearchScopeZero: "0px",
  globalGnbSearchScopeDisplay: "inline-block",
  globalGnbSearchScopePosition: "relative",
  globalGnbSearchScopeFontSize: "0px",
  globalGnbSearchScopeWhiteSpace: "nowrap",
  globalGnbSearchScopeVerticalAlign: "middle",
  globalGnbSearchScopeToggleAppearance: "button",
  globalGnbSearchScopeToggleBoxSizing: "border-box",
  globalGnbSearchScopeToggleDisplay: "inline-block",
  globalGnbSearchScopeTogglePosition: "relative",
  globalGnbSearchScopeToggleZIndex: "2",
  globalGnbSearchScopeToggleVerticalAlign: "top",
  globalGnbSearchScopeToggleCursor: "pointer",
  globalGnbSearchScopeToggleSurface: "#f7f7f7",
  globalGnbSearchScopeToggleInteractionSurface: "#f1f1f1",
  globalGnbSearchScopeToggleText: "#333333",
  globalGnbSearchScopeToggleInteractionText: "#292929",
  globalGnbSearchScopeToggleBorder: "rgba(0, 0, 0, 0.15)",
  globalGnbSearchScopeToggleInteractionBorder: "rgba(0, 0, 0, 0.25)",
  globalGnbSearchScopeToggleBorderStyle: "solid",
  globalGnbSearchScopeToggleBorderWidth: "1px",
  globalGnbSearchScopeToggleRadius: "3px",
  globalGnbSearchScopeToggleShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
  globalGnbSearchScopeToggleOpenShadow:
    "inset 0 2px 4px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.05)",
  globalGnbSearchScopeTogglePaddingBlock: "4px",
  globalGnbSearchScopeTogglePaddingInline: "12px",
  globalGnbSearchScopeToggleFontFamily: "inherit",
  globalGnbSearchScopeToggleFontSize: "14px",
  globalGnbSearchScopeToggleLineHeight: "20px",
  globalGnbSearchScopeToggleTextAlign: "center",
  globalGnbSearchScopeToggleWhiteSpace: "nowrap",
  globalGnbSearchScopeToggleTextDecoration: "none",
  globalGnbSearchScopeToggleOutline: "none",
  globalGnbSearchScopeToggleTransitionDuration: "0.3s",
  globalGnbSearchScopeToggleTransitionProperty: "all",
  globalGnbSearchScopeToggleTransitionTiming: "ease",
  globalGnbSearchScopeCaretContent: '""',
  globalGnbSearchScopeCaretDisplay: "inline-block",
  globalGnbSearchScopeCaretSize: "4px",
  globalGnbSearchScopeCaretMarginLeft: "5px",
  globalGnbSearchScopeCaretVerticalAlign: "middle",
  globalGnbSearchScopeCaretColor: "#383838",
  globalGnbSearchScopeTransparent: "transparent",
  globalGnbSearchScopeMenuDisplay: "block",
  globalGnbSearchScopeMenuPosition: "absolute",
  globalGnbSearchScopeMenuTop: "100%",
  globalGnbSearchScopeMenuRight: "0px",
  globalGnbSearchScopeMenuLeft: "auto",
  globalGnbSearchScopeMenuZIndex: "1000",
  globalGnbSearchScopeMenuFloat: "none",
  globalGnbSearchScopeMenuMinWidth: "160px",
  globalGnbSearchScopeMenuBoxSizing: "content-box",
  globalGnbSearchScopeMenuListStyle: "none",
  globalGnbSearchScopeMenuSurface: "#ffffff",
  globalGnbSearchScopeMenuBackgroundClip: "padding-box",
  globalGnbSearchScopeMenuBorder: "rgba(0, 0, 0, 0.2)",
  globalGnbSearchScopeMenuBorderStyle: "solid",
  globalGnbSearchScopeMenuBorderWidth: "1px",
  globalGnbSearchScopeMenuRadius: "6px",
  globalGnbSearchScopeMenuShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
  globalGnbSearchScopeMenuOverflow: "visible",
  globalGnbSearchScopeMenuFontSize: "12px",
  globalGnbSearchScopeMenuText: "#ffffff",
  globalGnbSearchScopeMenuPaddingTop: "4px",
  globalGnbSearchScopeMenuPaddingBottom: "6px",
  globalGnbSearchScopeMenuClosedMarginTop: "-10px",
  globalGnbSearchScopeMenuOpenMarginTop: "12px",
  globalGnbSearchScopeMenuClosedOpacity: "0",
  globalGnbSearchScopeMenuOpenOpacity: "1",
  globalGnbSearchScopeMenuClosedVisibility: "hidden",
  globalGnbSearchScopeMenuOpenVisibility: "visible",
  globalGnbSearchScopeMenuTransitionDuration: "0.25s",
  globalGnbSearchScopeMenuTransitionProperty: "all",
  globalGnbSearchScopeMenuTransitionTiming: "ease",
  globalGnbSearchScopeMenuBackfaceVisibility: "hidden",
  globalGnbSearchScopeArrowPosition: "absolute",
  globalGnbSearchScopeArrowRight: "7px",
  globalGnbSearchScopeArrowZIndex: "1",
  globalGnbSearchScopeArrowSideSize: "8px",
  globalGnbSearchScopeArrowBorderDashed: "dashed",
  globalGnbSearchScopeArrowBorderSolid: "solid",
  globalGnbSearchScopeArrowBeforeTop: "-8px",
  globalGnbSearchScopeArrowAfterTop: "-7px",
  globalGnbSearchScopeItemDisplay: "block",
  globalGnbSearchScopeItemClear: "both",
  globalGnbSearchScopeItemFloat: "none",
  globalGnbSearchScopeItemPosition: "relative",
  globalGnbSearchScopeItemMarginInline: "5px",
  globalGnbSearchScopeItemMarginBottom: "2px",
  globalGnbSearchScopeItemWhiteSpace: "nowrap",
  globalGnbSearchScopeItemText: "#292929",
  globalGnbSearchScopeButtonAppearance: "none",
  globalGnbSearchScopeButtonBoxSizing: "border-box",
  globalGnbSearchScopeButtonDisplay: "block",
  globalGnbSearchScopeButtonWidth: "100%",
  globalGnbSearchScopeButtonPaddingLeft: "15px",
  globalGnbSearchScopeButtonPaddingRight: "5px",
  globalGnbSearchScopeButtonEdgePaddingTop: "5px",
  globalGnbSearchScopeButtonEdgePaddingBottom: "7px",
  globalGnbSearchScopeButtonMiddlePaddingTop: "3px",
  globalGnbSearchScopeButtonMiddlePaddingBottom: "5px",
  globalGnbSearchScopeButtonLineHeight: "20px",
  globalGnbSearchScopeButtonFontFamily: "inherit",
  globalGnbSearchScopeButtonFontSize: "12px",
  globalGnbSearchScopeButtonTextAlign: "left",
  globalGnbSearchScopeButtonBorderStyle: "none",
  globalGnbSearchScopeButtonRadius: "2px",
  globalGnbSearchScopeButtonInteractionRadius: "3px",
  globalGnbSearchScopeButtonCursor: "pointer",
  globalGnbSearchScopeButtonTextDecoration: "none",
  globalGnbSearchScopeButtonOutline: "none",
  globalGnbSearchScopeButtonTransitionDuration: "0.2s",
  globalGnbSearchScopeButtonTransitionProperty: "all",
  globalGnbSearchScopeButtonTransitionTiming: "ease",
  globalGnbSearchScopeMenuInteractionSurface: "rgba(0, 0, 0, 0.15)",
  globalGnbSearchScopeMenuInteractionText: "#292929",
  // Bootstrap 2.3.1 anchor display
  globalGnbFeedbackLinkDisplay: "inline",
  // _page.less: .gnb-nav li a float
  globalGnbFeedbackLinkFloat: "none",
  // _page.less: .gnb-nav li a text-decoration
  globalGnbFeedbackTextDecoration: "none",
  // _page.less: .gnb-nav li a transition property
  globalGnbFeedbackTransitionProperty: "color",
  // _page.less: .gnb-nav li.active::before bottom
  globalGnbProjectListTriangleBottom: "-5px",
  // _page.less: .gnb-nav li.active::before margin-left
  globalGnbProjectListTriangleOffset: "-8px",
  // _page.less: .gnb-nav li.active::before left
  globalGnbProjectListTrianglePosition: "50%",
  // _page.less: .gnb-nav li.active::before border width
  globalGnbProjectListTriangleSize: "8px",
  // _page.less: .gnb-nav li.active::before zero-sized box
  globalGnbProjectListTriangleZero: "0px",
  // _page.less: .gnb-nav inherited font-size
  globalGnbBrandFontSize: "14px",
  // _page.less: .gnb-nav li.divider font-size
  globalGnbProjectListDividerFontSize: "12px",
  // _page.less: .gnb-nav li.divider::after opacity
  globalGnbProjectListDividerOpacity: "0.35",
  // _page.less: .gnb-inner .logo-letter bold font-weight
  globalGnbBrandFontWeight: "700",
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
  // _page.less: .pin background-color
  globalSidebarOpenPinSurface: "#03a9f4",
  // _page.less: .pin color
  globalSidebarOpenPinText: "#3e2723",
  // _page.less: .pin i:hover and React button focus color
  globalSidebarOpenPinInteractionText: "#ffffff",
  // _page.less: .pin left
  globalSidebarOpenPinLeft: "-6px",
  // _page.less: .pin top
  globalSidebarOpenPinTop: "6px",
  // _page.less: .pin margin-right
  globalSidebarOpenPinMargin: "0 5px 0 0",
  // _page.less: .pin padding
  globalSidebarOpenPinPadding: "0 1px",
  // _page.less: .pin font-size
  globalSidebarOpenPinFontSize: "18px",
  // Bootstrap 2.3.1 button inherited line-height
  globalSidebarOpenPinLineHeight: "20px",
  // _page.less: .pin right-side border radii
  globalSidebarOpenPinRadius: "0 3px 3px 0",
  // Bootstrap button reset plus _page.less: .pin borderless DIV surface
  globalSidebarOpenPinBorderWidth: "0px",
  // _page.less: .pin i.yobicon-arrow-left/right padding
  globalSidebarOpenPinIconPadding: "4px 0 4px 5px",
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
