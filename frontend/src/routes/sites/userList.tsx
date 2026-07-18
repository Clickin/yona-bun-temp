import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useState, type MouseEvent, type SyntheticEvent } from "react";
import legacySpriteUrl from "../../assets/legacy/sprite.png";
import {
  deleteSiteUserRest,
  resetSiteUserPasswordRest,
  siteUpdateQueryOptions,
  siteUsersQueryOptions,
  toggleSiteUserAccountLockRest,
  toggleSiteUserAdminRest,
  toggleSiteUserGuestRest,
  type SiteUser,
  type SiteUserListResponse,
  type SiteUserPasswordResetResponse,
  type SiteUserState,
} from "../../api/site-admin";
import { apiQueryKeys } from "../../api/query-keys";
import { RestApiError } from "../../api/rest-client";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";
import { siteUserListColors } from "./-userList.stylex";

type UserListRouteSearch = {
  pageNum?: number;
  query?: string;
  state?: SiteUserState;
};

type UserListSearch = {
  pageNum: number;
  query: string;
  state: SiteUserState;
};

type UserToggleAction = "account-lock" | "guest" | "site-admin";

const USER_STATES: SiteUserState[] = ["ACTIVE", "LOCKED", "DELETED", "GUEST", "SITE_ADMIN"];
const LEGACY_SITE_SETTING_NAV_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS = {
  activeOptions: { explicitUndefined: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const LEGACY_SITE_USER_LIST_SIDEBAR_SEARCH = {
  __legacySiteUserListSidebarActiveMarker: undefined,
};
const styles = stylex.create({
  paginationSprite: (spriteUrl: string) => ({
    "--site-user-list-pagination-sprite": `url(${spriteUrl})`,
  }),
  breadcrumbOuter: {
    boxSizing: "border-box",
    minWidth: {
      default: null,
      "@media (max-width: 720px)": "10px",
    },
    padding: "0px 10px",
    width: "100%",
  },
  breadcrumbInner: {
    margin: "0px auto",
  },
  breadcrumbHeading: {
    lineHeight: "30px",
    padding: "10px 10px 5px",
  },
  stateTabs: {
    borderBottomColor: siteUserListColors.stateTabBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    listStyle: "none",
    marginBottom: "20px",
    marginLeft: "0px",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  stateTabItem: {
    float: "left",
    marginBottom: "-1px",
  },
  stateTabLink: {
    backgroundColor: {
      default: "transparent",
      ":hover": siteUserListColors.stateTabHoverBackground,
      ":focus": siteUserListColors.stateTabHoverBackground,
    },
    borderTopColor: {
      default: "transparent",
      ":hover": siteUserListColors.stateTabHoverBorder,
      ":focus": siteUserListColors.stateTabHoverBorder,
    },
    borderRightColor: {
      default: "transparent",
      ":hover": siteUserListColors.stateTabHoverBorder,
      ":focus": siteUserListColors.stateTabHoverBorder,
    },
    borderBottomColor: {
      default: "transparent",
      ":hover": siteUserListColors.stateTabBorder,
      ":focus": siteUserListColors.stateTabBorder,
    },
    borderLeftColor: {
      default: "transparent",
      ":hover": siteUserListColors.stateTabHoverBorder,
      ":focus": siteUserListColors.stateTabHoverBorder,
    },
    borderRadius: "4px 4px 0px 0px",
    borderStyle: "solid",
    borderWidth: "1px",
    color: siteUserListColors.stateTabText,
    display: "block",
    fontWeight: "700",
    lineHeight: "20px",
    marginRight: "2px",
    padding: {
      default: "8px 30px",
      "@media (max-width: 720px)": "8px 5px",
    },
    textDecoration: "none",
  },
  stateTabLinkActive: {
    backgroundColor: {
      default: siteUserListColors.stateTabActiveBackground,
      ":hover": siteUserListColors.stateTabActiveBackground,
      ":focus": siteUserListColors.stateTabActiveBackground,
    },
    borderTopColor: {
      default: siteUserListColors.stateTabBorder,
      ":hover": siteUserListColors.stateTabBorder,
      ":focus": siteUserListColors.stateTabBorder,
    },
    borderRightColor: {
      default: siteUserListColors.stateTabBorder,
      ":hover": siteUserListColors.stateTabBorder,
      ":focus": siteUserListColors.stateTabBorder,
    },
    borderLeftColor: {
      default: siteUserListColors.stateTabBorder,
      ":hover": siteUserListColors.stateTabBorder,
      ":focus": siteUserListColors.stateTabBorder,
    },
    borderBottomColor: {
      default: "transparent",
      ":hover": "transparent",
      ":focus": "transparent",
    },
    color: siteUserListColors.stateTabActiveText,
    cursor: "default",
  },
  listhead: {
    backgroundColor: siteUserListColors.listheadSurface,
    borderBottomColor: siteUserListColors.listheadBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    lineHeight: "30px",
    marginBottom: "5px",
    padding: "5px 0px",
    width: "100%",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  listheadColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    marginLeft: "2.127659574468085%",
    minHeight: "30px",
    padding: "0px 20px",
  },
  listheadFirstColumn: { marginLeft: "0px" },
  listheadSpan3: { width: "23.404255319148934%" },
  listheadSpan2: { width: "14.893617021276595%" },
  listheadSpan4: { width: "31.914893617021278%" },
  userList: { listStyle: "none" },
  userRow: {
    borderBottomColor: siteUserListColors.rowBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    lineHeight: "70px",
    width: "100%",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  userRowEven: { backgroundColor: siteUserListColors.rowAlternateSurface },
  userColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    fontSize: "12px",
    lineHeight: "20px",
    marginLeft: "2.127659574468085%",
    minHeight: "30px",
    padding: "10px 0px",
    textOverflow: "ellipsis",
    width: "23.404255319148934%",
    wordBreak: "break-all",
  },
  userIdentityColumn: { marginLeft: "0px" },
  userDateColumn: { width: "14.893617021276595%" },
  userLeaveDateColumn: { width: "31.914893617021278%" },
  userActionColumn: { padding: "0px 0px 10px", width: "40.42553191489362%" },
  userEmail: { fontSize: "13px", lineHeight: "43px" },
  userAvatar: {
    backgroundColor: siteUserListColors.avatarSurface,
    borderRadius: "3px",
    display: "inline-block",
    float: "left",
    height: "45px",
    marginRight: "10px",
    marginTop: "3px",
    overflow: "hidden",
    verticalAlign: "middle",
    width: "45px",
  },
  userAvatarImage: { verticalAlign: "top", width: "100%" },
  userName: {
    color: siteUserListColors.identityName,
    display: "block",
    fontSize: "14px",
    fontWeight: "700",
    lineHeight: "20px",
    marginLeft: "5px",
    marginTop: "8px",
  },
  userId: {
    color: siteUserListColors.identityId,
    display: "block",
    fontSize: "13px",
    fontStyle: "italic",
    lineHeight: "20px",
    marginLeft: "5px",
  },
  paginationRoot: {
    clear: "both",
    margin: "20px 0px",
    textAlign: "center",
    width: "100%",
  },
  paginationList: {
    display: "inline-block",
    fontSize: "0px",
    listStyle: "none",
    margin: "0px 0px 0px -120px",
    padding: "0px",
  },
  paginationItem: {
    color: siteUserListColors.paginationText,
    display: "inline-block",
    fontSize: "12px",
    padding: "0px 10px",
  },
  paginationIconItem: { padding: "0px 5px" },
  paginationDelimiter: {
    color: siteUserListColors.paginationDelimiter,
    padding: "0px 5px",
  },
  paginationInput: {
    appearance: "textfield",
    borderColor: {
      default: siteUserListColors.paginationInputBorder,
      ":hover": siteUserListColors.paginationAccent,
      ":focus": siteUserListColors.paginationAccent,
    },
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: {
      default: "none",
      ":hover": siteUserListColors.paginationFocusShadow,
      ":focus": siteUserListColors.paginationFocusShadow,
    },
    color: {
      default: null,
      ":hover": siteUserListColors.paginationAccent,
      ":focus": siteUserListColors.paginationAccent,
    },
    fontWeight: "700",
    margin: "0px",
    textAlign: "center",
    width: "30px",
  },
  paginationIcon: {
    backgroundImage: "var(--site-user-list-pagination-sprite)",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "9px",
    verticalAlign: "middle",
    width: "6px",
  },
  paginationPrevIcon: { backgroundPosition: "-136px -139px", marginRight: "10px" },
  paginationPrevIconDisabled: { backgroundPosition: "-164px -2px" },
  paginationNextIcon: { backgroundPosition: "-146px -139px", marginLeft: "10px" },
  paginationNextIconDisabled: { backgroundPosition: "-23px -13px" },
  paginationLabel: {
    color: siteUserListColors.paginationAccent,
    fontSize: "11px",
  },
  paginationLabelDisabled: { color: siteUserListColors.paginationText },
  sidebarNav: { listStyle: "none" },
  sidebarItem: {
    borderLeftColor: siteUserListColors.sidebarBorder,
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    fontSize: "14px",
    lineHeight: "30px",
    marginTop: "3px",
  },
  sidebarItemFirst: { marginTop: "0px" },
  sidebarItemActive: {
    borderLeftColor: siteUserListColors.sidebarAccent,
    fontWeight: "700",
  },
  sidebarLink: {
    backgroundColor: { default: "transparent", ":hover": siteUserListColors.sidebarHoverSurface },
    display: "block",
    padding: "5px 10px",
    textDecoration: { default: null, ":hover": "none" },
  },
  sidebarLinkActive: {
    backgroundColor: { default: "transparent", ":hover": "transparent" },
  },
  sidebarNotificationBadge: {
    backgroundColor: siteUserListColors.notificationBackground,
    borderColor: siteUserListColors.notificationBorder,
    borderRadius: "10px",
    borderStyle: "solid",
    borderWidth: "2px",
    boxShadow: siteUserListColors.notificationShadow,
    color: siteUserListColors.notificationText,
    fontSize: "12px",
    lineHeight: "20px",
    padding: "0px 5px",
  },
  stateTabNumericBadge: {
    borderRadius: "2px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: "13px",
    fontWeight: "700",
    marginLeft: "3px",
    padding: "2px 4px",
    textShadow: "none",
    verticalAlign: "top",
  },
  deleteModal: {
    backgroundClip: "padding-box",
    backgroundColor: siteUserListColors.modalSurface,
    borderColor: siteUserListColors.modalBorder,
    borderRadius: "6px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: siteUserListColors.modalShadow,
    display: "block",
    left: {
      default: "50%",
      "@media (max-width: 720px)": "auto",
    },
    marginLeft: {
      default: "-280px",
      "@media (max-width: 720px)": "0px",
    },
    outline: "none",
    position: "fixed",
    top: "-25%",
    transition: "opacity 0.3s linear, top 0.3s ease-out",
    width: {
      default: "560px",
      "@media (max-width: 720px)": "auto",
    },
    zIndex: 1050,
  },
  deleteModalOpen: { top: "10%" },
  deleteModalClosed: { display: "none" },
  deleteModalHeader: {
    borderBottomColor: siteUserListColors.modalHeaderBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    padding: "9px 15px",
  },
  deleteModalClose: {
    appearance: "none",
    backgroundColor: "transparent",
    borderWidth: "0px",
    color: siteUserListColors.modalText,
    cursor: "pointer",
    float: "right",
    fontSize: "20px",
    fontWeight: "700",
    lineHeight: "20px",
    marginTop: "2px",
    opacity: { default: 0.2, ":hover": 0.4, ":focus": 0.4 },
    padding: "0px",
    textDecoration: { default: "none", ":hover": "none", ":focus": "none" },
    textShadow: siteUserListColors.modalCloseShadow,
  },
  deleteModalBody: {
    maxHeight: "400px",
    overflowY: "auto",
    padding: "15px",
    position: "relative",
  },
  deleteModalFooter: {
    backgroundColor: siteUserListColors.modalFooterSurface,
    borderRadius: "0px 0px 6px 6px",
    borderTopColor: siteUserListColors.modalFooterBorder,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    boxShadow: siteUserListColors.modalFooterShadow,
    marginBottom: "0px",
    padding: "14px 15px 15px",
    textAlign: "right",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  deleteModalBackdrop: {
    backgroundColor: siteUserListColors.modalBackdrop,
    bottom: "0px",
    left: "0px",
    opacity: 0.5,
    position: "fixed",
    right: "0px",
    top: "0px",
    zIndex: 1040,
  },
  deleteModalButton: {
    backgroundColor: {
      default: siteUserListColors.actionDefaultSurface,
      ":hover": siteUserListColors.actionDefaultSurfaceInteractive,
      ":focus": siteUserListColors.actionDefaultSurfaceInteractive,
      ":active": siteUserListColors.actionDefaultSurfaceInteractive,
    },
    borderColor: {
      default: siteUserListColors.actionBorder,
      ":hover": siteUserListColors.actionBorderInteractive,
      ":focus": siteUserListColors.actionBorderInteractive,
      ":active": siteUserListColors.actionBorderInteractive,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: siteUserListColors.actionShadow,
    color: {
      default: siteUserListColors.actionText,
      ":hover": siteUserListColors.actionTextInteractive,
      ":focus": siteUserListColors.actionTextInteractive,
      ":active": siteUserListColors.actionTextInteractive,
    },
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    marginBottom: "0px",
    marginLeft: "0.3em",
    outline: "0 none",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textDecoration: "none",
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  },
  deleteModalButtonFirst: { marginLeft: "0px" },
  deleteModalButtonDanger: {
    backgroundColor: {
      default: siteUserListColors.actionDanger,
      ":hover": siteUserListColors.actionDangerBorder,
      ":focus": siteUserListColors.actionDangerBorder,
      ":active": siteUserListColors.actionDanger,
    },
    borderColor: siteUserListColors.actionDangerBorder,
    color: siteUserListColors.actionTextInverse,
  },
  passwordResetAlert: {
    backgroundColor: siteUserListColors.alertSurface,
    borderColor: siteUserListColors.alertBorder,
    borderRadius: "4px",
    borderStyle: "solid",
    borderWidth: "1px",
    color: siteUserListColors.alertText,
    marginBottom: "20px",
    padding: "8px 35px 8px 14px",
    textShadow: siteUserListColors.alertTextShadow,
  },
  passwordResetAlertSuccess: {
    backgroundColor: siteUserListColors.alertSuccessSurface,
    borderColor: siteUserListColors.alertSuccessBorder,
    color: siteUserListColors.alertSuccessText,
  },
  passwordResetAlertClose: {
    appearance: "none",
    backgroundColor: "transparent",
    borderWidth: "0px",
    color: siteUserListColors.modalText,
    cursor: "pointer",
    float: "right",
    fontSize: "20px",
    fontWeight: "700",
    lineHeight: "20px",
    opacity: { default: 0.2, ":hover": 0.4, ":focus": 0.4 },
    padding: "0px",
    position: "relative",
    right: "-21px",
    textDecoration: { default: "none", ":hover": "none", ":focus": "none" },
    textShadow: siteUserListColors.modalCloseShadow,
    top: "-2px",
  },
  passwordResetAlertHeading: { color: "inherit", margin: "0px" },
  actionButton: {
    backgroundColor: {
      default: siteUserListColors.actionDefaultSurface,
      ":hover": siteUserListColors.actionDefaultSurfaceInteractive,
      ":focus": siteUserListColors.actionDefaultSurfaceInteractive,
      ":active": siteUserListColors.actionDefaultSurfaceInteractive,
    },
    borderColor: {
      default: siteUserListColors.actionBorder,
      ":hover": siteUserListColors.actionBorderInteractive,
      ":focus": siteUserListColors.actionBorderInteractive,
      ":active": siteUserListColors.actionBorderInteractive,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: siteUserListColors.actionShadow,
    color: {
      default: siteUserListColors.actionText,
      ":hover": siteUserListColors.actionTextInteractive,
      ":focus": siteUserListColors.actionTextInteractive,
      ":active": siteUserListColors.actionTextInteractive,
    },
    cursor: "pointer",
    display: "inline-block",
    fontSize: "13px",
    lineHeight: "20px",
    marginBottom: "2px",
    marginLeft: "2px",
    marginRight: "2px",
    marginTop: "2px",
    outline: "0 none",
    padding: "3px 10px",
    position: "relative",
    textAlign: "center",
    textDecoration: "none",
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  },
  actionSuccessButton: {
    backgroundColor: {
      default: siteUserListColors.actionPrimary,
      ":hover": siteUserListColors.actionPrimaryBorder,
      ":focus": siteUserListColors.actionPrimaryBorder,
      ":active": siteUserListColors.actionPrimaryBorder,
    },
    borderColor: siteUserListColors.actionPrimaryBorder,
    color: siteUserListColors.actionTextInverse,
  },
  actionInfoButton: {
    backgroundColor: {
      default: siteUserListColors.actionInfo,
      ":hover": siteUserListColors.actionInfoBorder,
      ":focus": siteUserListColors.actionInfoBorder,
      ":active": siteUserListColors.actionInfo,
    },
    borderColor: siteUserListColors.actionInfoBorder,
    color: siteUserListColors.actionTextInverse,
  },
  actionLabelInfoButton: {
    backgroundColor: {
      default: siteUserListColors.actionLabelInfo,
      ":hover": siteUserListColors.actionDefaultSurfaceInteractive,
      ":focus": siteUserListColors.actionDefaultSurfaceInteractive,
      ":active": siteUserListColors.actionDefaultSurfaceInteractive,
    },
  },
  actionDangerButton: {
    backgroundColor: {
      default: siteUserListColors.actionDanger,
      ":hover": siteUserListColors.actionDangerBorder,
      ":focus": siteUserListColors.actionDangerBorder,
      ":active": siteUserListColors.actionDanger,
    },
    borderColor: siteUserListColors.actionDangerBorder,
    color: siteUserListColors.actionTextInverse,
  },
  pageWrapOuter: {
    boxSizing: "border-box",
    marginTop: "10px",
    minHeight: "450px",
    minWidth: {
      default: null,
      "@media (max-width: 720px)": "10px",
    },
    padding: {
      default: "0px 10px",
      "@media (max-width: 720px)": "0px",
    },
    width: "100%",
  },
  settingWrap: {
    margin: "0px auto",
    width: "100%",
  },
  settingGrid: {
    width: "100%",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  settingColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    minHeight: "30px",
  },
  settingSidebarColumn: {
    marginLeft: "0px",
    width: "14.893617021276595%",
  },
  settingContentColumn: {
    marginLeft: "2.127659574468085%",
    width: "82.97872340425532%",
  },
  titleArea: {
    overflow: "hidden",
    marginBottom: "29px",
    paddingBottom: "8px",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: siteUserListColors.titleBorder,
  },
  title: {
    margin: "0px",
    fontSize: "1.5em",
    color: siteUserListColors.titleText,
    lineHeight: "30px",
    float: "left",
  },
  titleSearchForm: {
    float: "right",
    margin: "0px",
  },
  titleSearchWrapper: {
    backgroundColor: siteUserListColors.searchSurface,
    borderColor: siteUserListColors.searchBorder,
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    display: "block",
    height: "20px",
    lineHeight: "20px",
    margin: {
      default: "0px",
      "@media (max-width: 720px)": "5px 0px",
    },
    padding: "4px 25px 4px 5px",
    position: "relative",
  },
  titleSearchInput: {
    backgroundColor: siteUserListColors.searchSurface,
    borderColor: {
      default: siteUserListColors.searchText,
      ":focus": siteUserListColors.searchFocusBorder,
    },
    borderRadius: "2px",
    borderStyle: "none",
    borderWidth: "0px",
    boxShadow: "none",
    color: siteUserListColors.searchText,
    display: "inline-block",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: {
      default: "12px",
      "@media (max-width: 720px)": "16px",
    },
    fontWeight: "400",
    height: "20px",
    lineHeight: "20px",
    margin: "0px -5px",
    outline: { default: null, ":focus": "0px" },
    padding: "0px 5px",
    transition: "width 0.15s",
    verticalAlign: "middle",
    width: {
      default: "350px",
      "@media (max-width: 720px)": "inherit",
    },
  },
  titleSearchButton: {
    backgroundColor: "transparent",
    borderStyle: "none",
    borderWidth: "0px",
    height: "20px",
    outline: "0px",
    position: "absolute",
    right: "5px",
    top: "5px",
  },
  titleSearchIcon: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "400",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "baseline",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    "::before": { content: '"\\e225"' },
  },
});
const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);
const titleSearchFormStyleProps = stylex.props(styles.titleSearchForm);
const titleSearchWrapperStyleProps = stylex.props(styles.titleSearchWrapper);
const titleSearchInputStyleProps = stylex.props(styles.titleSearchInput);
const titleSearchButtonStyleProps = stylex.props(styles.titleSearchButton);
const titleSearchIconStyleProps = stylex.props(styles.titleSearchIcon);
const pageWrapOuterStyleProps = stylex.props(styles.pageWrapOuter);
const settingWrapStyleProps = stylex.props(styles.settingWrap);
const settingGridStyleProps = stylex.props(styles.settingGrid);
const settingSidebarColumnStyleProps = stylex.props(
  styles.settingColumn,
  styles.settingSidebarColumn,
);
const settingContentColumnStyleProps = stylex.props(
  styles.settingColumn,
  styles.settingContentColumn,
);
const breadcrumbOuterStyleProps = stylex.props(styles.breadcrumbOuter);
const breadcrumbInnerStyleProps = stylex.props(styles.breadcrumbInner);
const breadcrumbHeadingStyleProps = stylex.props(styles.breadcrumbHeading);
const stateTabsStyleProps = stylex.props(styles.stateTabs);
const listheadStyleProps = stylex.props(styles.listhead);
const listheadColumnStyleProps = [
  stylex.props(styles.listheadColumn, styles.listheadFirstColumn, styles.listheadSpan3),
  stylex.props(styles.listheadColumn, styles.listheadSpan3),
  stylex.props(styles.listheadColumn, styles.listheadSpan2),
  stylex.props(styles.listheadColumn, styles.listheadSpan4),
] as const;
const userListStyleProps = stylex.props(styles.userList);
const userRowStyleProps = stylex.props(styles.userRow);
const userRowEvenStyleProps = stylex.props(styles.userRow, styles.userRowEven);
const identityColumnStyleProps = stylex.props(styles.userColumn, styles.userIdentityColumn);
const emailColumnStyleProps = stylex.props(styles.userColumn);
const dateColumnStyleProps = stylex.props(styles.userColumn, styles.userDateColumn);
const leaveDateColumnStyleProps = stylex.props(styles.userColumn, styles.userLeaveDateColumn);
const actionColumnStyleProps = stylex.props(styles.userColumn, styles.userActionColumn);
const emailStyleProps = stylex.props(styles.userEmail);
const avatarStyleProps = stylex.props(styles.userAvatar);
const avatarImageStyleProps = stylex.props(styles.userAvatarImage);
const userNameStyleProps = stylex.props(styles.userName);
const userIdStyleProps = stylex.props(styles.userId);
const paginationRootStyleProps = stylex.props(styles.paginationRoot);
const paginationListStyleProps = stylex.props(styles.paginationList);
const paginationItemStyleProps = stylex.props(styles.paginationItem);
const paginationIconItemStyleProps = stylex.props(styles.paginationItem, styles.paginationIconItem);
const paginationDelimiterStyleProps = stylex.props(
  styles.paginationItem,
  styles.paginationDelimiter,
);
const paginationInputStyleProps = stylex.props(styles.paginationInput);
const paginationPrevIconStyleProps = stylex.props(styles.paginationIcon, styles.paginationPrevIcon);
const paginationPrevDisabledIconStyleProps = stylex.props(
  styles.paginationIcon,
  styles.paginationPrevIcon,
  styles.paginationPrevIconDisabled,
);
const paginationNextIconStyleProps = stylex.props(styles.paginationIcon, styles.paginationNextIcon);
const paginationNextDisabledIconStyleProps = stylex.props(
  styles.paginationIcon,
  styles.paginationNextIcon,
  styles.paginationNextIconDisabled,
);
const paginationLabelStyleProps = stylex.props(styles.paginationLabel);
const paginationDisabledLabelStyleProps = stylex.props(
  styles.paginationLabel,
  styles.paginationLabelDisabled,
);
const sidebarNavStyleProps = stylex.props(styles.sidebarNav);
const sidebarItemStyleProps = stylex.props(styles.sidebarItem);
const sidebarFirstItemStyleProps = stylex.props(styles.sidebarItem, styles.sidebarItemFirst);
const sidebarActiveItemStyleProps = stylex.props(
  styles.sidebarItem,
  styles.sidebarItemFirst,
  styles.sidebarItemActive,
);
const sidebarLinkStyleProps = stylex.props(styles.sidebarLink);
const sidebarActiveLinkStyleProps = stylex.props(styles.sidebarLink, styles.sidebarLinkActive);
const sidebarNotificationBadgeStyleProps = stylex.props(styles.sidebarNotificationBadge);
const stateTabNumericBadgeStyleProps = stylex.props(styles.stateTabNumericBadge);
const deleteModalHeaderStyleProps = stylex.props(styles.deleteModalHeader);
const deleteModalCloseStyleProps = stylex.props(styles.deleteModalClose);
const deleteModalBodyStyleProps = stylex.props(styles.deleteModalBody);
const deleteModalFooterStyleProps = stylex.props(styles.deleteModalFooter);
const deleteModalBackdropStyleProps = stylex.props(styles.deleteModalBackdrop);
const deleteModalConfirmButtonStyleProps = stylex.props(
  styles.deleteModalButton,
  styles.deleteModalButtonFirst,
  styles.deleteModalButtonDanger,
);
const deleteModalDismissButtonStyleProps = stylex.props(styles.deleteModalButton);
const passwordResetAlertStyleProps = stylex.props(styles.passwordResetAlert);
const passwordResetSuccessAlertStyleProps = stylex.props(
  styles.passwordResetAlert,
  styles.passwordResetAlertSuccess,
);
const passwordResetAlertCloseStyleProps = stylex.props(styles.passwordResetAlertClose);
const passwordResetAlertHeadingStyleProps = stylex.props(styles.passwordResetAlertHeading);
const actionButtonStyleProps = stylex.props(styles.actionButton);
const actionSuccessButtonStyleProps = stylex.props(styles.actionButton, styles.actionSuccessButton);
const actionInfoButtonStyleProps = stylex.props(styles.actionButton, styles.actionInfoButton);
const actionLabelInfoButtonStyleProps = stylex.props(
  styles.actionButton,
  styles.actionLabelInfoButton,
);
const actionDangerButtonStyleProps = stylex.props(styles.actionButton, styles.actionDangerButton);

export const Route = createFileRoute("/sites/userList")({
  component: SiteUserListRoute,
  validateSearch: (search: Record<string, unknown>): UserListRouteSearch => ({
    pageNum: search.pageNum ? Number(search.pageNum) || 1 : undefined,
    query: typeof search.query === "string" ? search.query : undefined,
    state: isSiteUserState(search.state) ? search.state : undefined,
  }),
});

function insulateSiteUserDeleteModalButtonClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function insulateSiteUserDeleteModalBackdropClick(event: SyntheticEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function LegacySiteUserListTitle() {
  const { t } = useLegacyMessages();

  return <title>{t("title.siteSetting")}</title>;
}

function SiteUserListRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteUserListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SiteUserListScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const routeSearch = Route.useSearch();
  const search = normalizeUserListSearch(routeSearch);
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteUser, setDeleteUser] = useState<SiteUser | null>(null);
  const [deleteModalClosed, setDeleteModalClosed] = useState(false);
  const [passwordResetByLoginId, setPasswordResetByLoginId] = useState<
    Record<string, SiteUserPasswordResetResponse | "pending">
  >({});
  const usersQueryOptions = siteUsersQueryOptions(runtimeConfig, {
    page: search.pageNum,
    query: search.query,
    state: search.state,
  });
  const query = useQuery(usersQueryOptions);
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));
  const response = query.data;
  const closeDeleteModal = () => {
    setDeleteUser(null);
    setDeleteModalClosed(true);
  };
  const openDeleteModal = (event: MouseEvent<HTMLButtonElement>, user: SiteUser) => {
    insulateSiteUserDeleteModalButtonClick(event);
    setDeleteUser(user);
    setDeleteModalClosed(false);
  };
  const dismissPasswordResetAlert = (event: MouseEvent<HTMLButtonElement>, loginId: string) => {
    event.preventDefault();
    event.stopPropagation();
    clearPasswordResetAlert(loginId);
  };
  const dismissDeleteModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateSiteUserDeleteModalButtonClick(event);
    closeDeleteModal();
  };
  const dismissDeleteModalBackdrop = (event: SyntheticEvent<HTMLDivElement>) => {
    insulateSiteUserDeleteModalBackdropClick(event);
    closeDeleteModal();
  };
  const submitDelete = (event: MouseEvent<HTMLButtonElement>) => {
    insulateSiteUserDeleteModalButtonClick(event);
    if (deleteUser) {
      deleteMutation.mutate(deleteUser.loginId);
    }
  };
  const deleteMutation = useMutation({
    mutationFn: async (loginId: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteSiteUserRest(runtimeConfig, csrfToken, loginId);
    },
    onSuccess(response) {
      closeDeleteModal();
      queryClient.setQueryData<SiteUserListResponse>(usersQueryOptions.queryKey, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          users: current.users.filter((user) => user.loginId !== response.user.loginId),
        };
      });
    },
    onError(error) {
      if (error instanceof RestApiError && error.status === 403) {
        router.history.go(0);
      }
    },
  });
  const resetPasswordMutation = useMutation({
    mutationFn: async (loginId: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return resetSiteUserPasswordRest(runtimeConfig, csrfToken, loginId);
    },
    onMutate(loginId) {
      setPasswordResetByLoginId((current) => ({ ...current, [loginId]: "pending" }));
    },
    onSuccess(data, loginId) {
      if (data.isSuccess !== true) {
        clearPasswordResetAlert(loginId);
        // oxlint-disable-next-line no-alert -- legacy site/userList.scala.html uses $yobi.alert for reset-password failures.
        window.alert(`password change failed: ${data.reason ?? ""}`);
        return;
      }
      setPasswordResetByLoginId((current) => ({ ...current, [loginId]: data }));
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
    },
    onError(error, loginId) {
      clearPasswordResetAlert(loginId);
      // oxlint-disable-next-line no-alert -- legacy site/userList.scala.html uses $yobi.alert for reset-password failures.
      window.alert(`password change failed: ${error.message}`);
    },
  });
  const toggleUserMutation = useMutation({
    mutationFn: async ({ action, loginId }: { action: UserToggleAction; loginId: string }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      if (action === "guest") {
        return toggleSiteUserGuestRest(runtimeConfig, csrfToken, loginId);
      }
      if (action === "account-lock") {
        return toggleSiteUserAccountLockRest(runtimeConfig, csrfToken, loginId);
      }
      return toggleSiteUserAdminRest(runtimeConfig, csrfToken, loginId);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
      router.history.go(0);
    },
  });

  return (
    <>
      <LegacySiteUserListTitle />
      <div {...breadcrumbOuterStyleProps} data-stylex-owner="site-user-list-breadcrumb-outer">
        <div {...breadcrumbInnerStyleProps} data-stylex-owner="site-user-list-breadcrumb-inner">
          <h3
            {...breadcrumbHeadingStyleProps}
            data-stylex-owner="site-user-list-breadcrumb-heading"
          >
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div {...pageWrapOuterStyleProps} data-stylex-owner="site-user-list-page-wrap-outer">
        <div {...settingWrapStyleProps} data-stylex-owner="site-user-list-setting-wrap">
          <div {...settingGridStyleProps} data-stylex-owner="site-user-list-setting-grid">
            <div
              {...settingSidebarColumnStyleProps}
              data-stylex-owner="site-user-list-setting-sidebar-column"
            >
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div
              {...settingContentColumnStyleProps}
              data-stylex-owner="site-user-list-setting-content-column"
            >
              <div {...titleAreaStyleProps} data-stylex-owner="site-user-list-title-strip">
                <h2 {...titleStyleProps} data-stylex-owner="site-user-list-title-heading">
                  <LegacyMessage messageKey="site.sidebar.userList" />
                </h2>
                <p data-stylex-owner="site-user-list-initial-admin-policy">
                  {t("site.userList.initialAdminPolicy", {
                    fallback:
                      "The first registered user is the initial Site Admin and cannot have this role revoked or be removed.",
                  })}
                </p>
                <form
                  {...titleSearchFormStyleProps}
                  data-stylex-owner="site-user-list-title-search-form"
                  action={prefixBasePath(runtimeConfig.basePath, "/sites/userList")}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const nextState = form.get("state");
                    const nextQuery = String(form.get("query") ?? "");
                    void queryClient.invalidateQueries({
                      queryKey: apiQueryKeys.siteAdmin.usersBase(),
                    });
                    void router.navigate({
                      search: {
                        pageNum: 1,
                        query: nextQuery,
                        state: isSiteUserState(nextState) ? nextState : search.state,
                      },
                      to: "/sites/userList",
                    });
                  }}
                >
                  <input type="hidden" name="state" value={search.state} />
                  <div
                    {...titleSearchWrapperStyleProps}
                    data-stylex-owner="site-user-list-title-search-wrapper"
                  >
                    <input
                      {...titleSearchInputStyleProps}
                      data-stylex-owner="site-user-list-title-search-input"
                      name="query"
                      type="text"
                      placeholder={t("site.userList.search")}
                      defaultValue={search.query}
                    />
                    <button
                      {...titleSearchButtonStyleProps}
                      type="submit"
                      data-stylex-owner="site-user-list-title-search-button"
                    >
                      <i
                        {...titleSearchIconStyleProps}
                        data-stylex-owner="site-user-list-title-search-icon"
                      ></i>
                    </button>
                  </div>
                </form>
              </div>
              <UserStateTabs
                currentState={search.state}
                siteAdminCount={response?.siteAdminCount ?? 0}
              />
              <div {...listheadStyleProps} data-stylex-owner="site-user-list-listhead">
                <div
                  {...listheadColumnStyleProps[0]}
                  data-stylex-owner="site-user-list-listhead-column"
                >
                  <strong>
                    <LegacyMessage messageKey="user.name" />
                  </strong>
                </div>
                <div
                  {...listheadColumnStyleProps[1]}
                  data-stylex-owner="site-user-list-listhead-column"
                >
                  <strong>
                    <LegacyMessage messageKey="user.email" />
                  </strong>
                </div>
                <div
                  {...listheadColumnStyleProps[2]}
                  data-stylex-owner="site-user-list-listhead-column"
                >
                  <strong>
                    <LegacyMessage messageKey="userinfo.since" />
                  </strong>
                </div>
                <div
                  {...listheadColumnStyleProps[3]}
                  data-stylex-owner="site-user-list-listhead-column"
                >
                  <strong>
                    {search.state === "DELETED" ? (
                      <LegacyMessage messageKey="userinfo.leave" />
                    ) : (
                      <>&nbsp;</>
                    )}
                  </strong>
                </div>
              </div>
              <ul
                {...userListStyleProps}
                className={userListStyleProps.className}
                data-stylex-owner="site-user-list-row-list"
              >
                {(response?.users ?? []).map((user, index) => (
                  <UserListItem
                    even={index % 2 === 1}
                    key={user.id}
                    onDeleteClick={openDeleteModal}
                    onResetPasswordClick={(loginId) => resetPasswordMutation.mutate(loginId)}
                    onToggleClick={(loginId, action) =>
                      toggleUserMutation.mutate({ action, loginId })
                    }
                    onDismissPasswordResetAlert={dismissPasswordResetAlert}
                    passwordReset={passwordResetByLoginId[user.loginId]}
                    state={search.state}
                    initialUserId={response?.initialUserId}
                    user={user}
                  />
                ))}
              </ul>

              <UserListPagination
                currentPage={response?.page ?? search.pageNum}
                query={search.query}
                state={search.state}
                totalPages={response?.totalPages ?? 0}
              />

              <div
                {...stylex.props(
                  styles.deleteModal,
                  deleteUser && styles.deleteModalOpen,
                  !deleteUser && deleteModalClosed && styles.deleteModalClosed,
                )}
                id="alertDeletionWrap"
                data-state={deleteUser ? "open" : deleteModalClosed ? "closed" : "initial"}
                data-stylex-owner="site-user-list-delete-modal"
                aria-hidden={deleteUser ? false : deleteModalClosed ? true : undefined}
              >
                <div
                  {...deleteModalHeaderStyleProps}
                  data-stylex-owner="site-user-list-delete-modal-header"
                >
                  <button
                    {...deleteModalCloseStyleProps}
                    data-stylex-owner="site-user-list-delete-modal-close"
                    type="button"
                    onClick={dismissDeleteModal}
                  >
                    ×
                  </button>
                  <span id="userInfo">
                    {deleteUser ? `${deleteUser.displayName}(${deleteUser.loginId})` : ""}
                  </span>
                  <span>
                    <LegacyMessage messageKey="site.user.delete" />
                  </span>
                </div>
                <div
                  {...deleteModalBodyStyleProps}
                  data-stylex-owner="site-user-list-delete-modal-body"
                >
                  <p>
                    <LegacyMessage messageKey="site.user.deleteConfirm" />
                  </p>
                </div>
                <div
                  {...deleteModalFooterStyleProps}
                  data-stylex-owner="site-user-list-delete-modal-footer"
                >
                  <button
                    {...deleteModalConfirmButtonStyleProps}
                    type="button"
                    id="accountToggleBtn"
                    data-stylex-owner="site-user-list-delete-modal-button"
                    data-variant="danger"
                    onClick={submitDelete}
                  >
                    <LegacyMessage messageKey="button.yes" />
                  </button>
                  <button
                    {...deleteModalDismissButtonStyleProps}
                    type="button"
                    data-stylex-owner="site-user-list-delete-modal-button"
                    data-variant="default"
                    onClick={dismissDeleteModal}
                  >
                    <LegacyMessage messageKey="button.no" />
                  </button>
                </div>
              </div>
              {deleteUser ? (
                <div
                  {...deleteModalBackdropStyleProps}
                  data-stylex-owner="site-user-list-delete-modal-backdrop"
                  onClick={dismissDeleteModalBackdrop}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") dismissDeleteModalBackdrop(event);
                  }}
                  role="button"
                  tabIndex={-1}
                ></div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  function clearPasswordResetAlert(loginId: string) {
    setPasswordResetByLoginId((current) => {
      const next = { ...current };
      delete next[loginId];
      return next;
    });
  }
}

function UserListPagination({
  currentPage,
  query,
  state,
  totalPages,
}: {
  currentPage: number;
  query: string;
  state: SiteUserState;
  totalPages: number;
}) {
  const router = useRouter();
  const { t } = useLegacyMessages();

  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const search = (pageNum: number) => ({
    pageNum,
    query: query || undefined,
    state,
  });
  const digitOnly = /^[0-9]+$/u;
  const prevPageLabel = t("button.prevPage");
  const nextPageLabel = t("button.nextPage");

  return (
    <div
      {...paginationRootStyleProps}
      id="pagination"
      data-stylex-owner="site-user-list-pagination"
    >
      <ul {...paginationListStyleProps} data-stylex-owner="site-user-list-pagination-list">
        <li {...paginationIconItemStyleProps} data-stylex-owner="site-user-list-pagination-item">
          {hasPrev ? (
            <Link
              {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
              search={search(currentPage - 1)}
              to="/sites/userList"
            >
              <i
                {...paginationPrevIconStyleProps}
                data-disabled="false"
                data-stylex-owner="site-user-list-pagination-icon"
                {...stylex.props(styles.paginationSprite(legacySpriteUrl))}
              ></i>
              <span
                {...paginationLabelStyleProps}
                data-stylex-owner="site-user-list-pagination-label"
              >
                {prevPageLabel}
              </span>
            </Link>
          ) : (
            <>
              <i
                {...paginationPrevDisabledIconStyleProps}
                data-disabled="true"
                data-stylex-owner="site-user-list-pagination-icon"
                {...stylex.props(styles.paginationSprite(legacySpriteUrl))}
              ></i>
              <span
                {...paginationDisabledLabelStyleProps}
                data-disabled="true"
                data-stylex-owner="site-user-list-pagination-label"
              >
                {prevPageLabel}
              </span>
            </>
          )}
        </li>
        <li {...paginationItemStyleProps} data-stylex-owner="site-user-list-pagination-item">
          <input
            {...paginationInputStyleProps}
            data-stylex-owner="site-user-list-pagination-input"
            defaultValue={currentPage}
            key={`${currentPage}-${totalPages}`}
            max={totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              if (!digitOnly.test(event.currentTarget.value)) {
                event.currentTarget.value = String(currentPage);
                return;
              }

              const pageNum = Number(event.currentTarget.value);
              if (!Number.isInteger(pageNum)) {
                event.currentTarget.value = String(currentPage);
                return;
              }

              const nextPage = Math.min(Math.max(pageNum, 1), totalPages);
              event.currentTarget.value = String(nextPage);
              void router.navigate({
                search: search(nextPage),
                to: "/sites/userList",
              });
            }}
            pattern="[0-9]*"
            type="number"
          />
        </li>
        <li {...paginationDelimiterStyleProps} data-stylex-owner="site-user-list-pagination-item">
          /
        </li>
        <li {...paginationItemStyleProps} data-stylex-owner="site-user-list-pagination-item">
          {totalPages}
        </li>
        <li {...paginationIconItemStyleProps} data-stylex-owner="site-user-list-pagination-item">
          {hasNext ? (
            <Link
              {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
              search={search(currentPage + 1)}
              to="/sites/userList"
            >
              <span
                {...paginationLabelStyleProps}
                data-stylex-owner="site-user-list-pagination-label"
              >
                {nextPageLabel}
              </span>
              <i
                {...paginationNextIconStyleProps}
                data-disabled="false"
                data-stylex-owner="site-user-list-pagination-icon"
                {...stylex.props(styles.paginationSprite(legacySpriteUrl))}
              ></i>
            </Link>
          ) : (
            <>
              <span
                {...paginationDisabledLabelStyleProps}
                data-disabled="true"
                data-stylex-owner="site-user-list-pagination-label"
              >
                {nextPageLabel}
              </span>
              <i
                {...paginationNextDisabledIconStyleProps}
                data-disabled="true"
                data-stylex-owner="site-user-list-pagination-icon"
                {...stylex.props(styles.paginationSprite(legacySpriteUrl))}
              ></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  const items = [
    { active: true, label: "site.sidebar.userList", to: "/sites/userList", update: false },
    { active: false, label: "site.sidebar.postList", to: "/sites/postList", update: false },
    { active: false, label: "site.sidebar.issueList", to: "/sites/issueList", update: false },
    { active: false, label: "site.sidebar.projectList", to: "/sites/projectList", update: false },
    { active: false, label: "site.sidebar.mailSend", to: "/sites/mail", update: false },
    { active: false, label: "site.sidebar.massMail", to: "/sites/massmail", update: false },
    { active: false, label: "site.sidebar.update", to: "/sites/update", update: true },
    { active: false, label: "site.sidebar.diagnostics", to: "/sites/diagnostic", update: false },
  ] as const;
  return (
    <ul {...sidebarNavStyleProps} data-stylex-owner="site-user-list-sidebar-nav">
      {items.map((item, index) => (
        <li
          {...(item.active
            ? sidebarActiveItemStyleProps
            : index === 0
              ? sidebarFirstItemStyleProps
              : sidebarItemStyleProps)}
          data-selected={item.active ? "true" : undefined}
          data-stylex-owner="site-user-list-sidebar-item"
          key={item.to}
        >
          <Link
            {...LEGACY_SITE_SETTING_NAV_LINK_PROPS}
            {...(item.active ? sidebarActiveLinkStyleProps : sidebarLinkStyleProps)}
            data-stylex-owner="site-user-list-sidebar-link"
            to={item.to}
          >
            <LegacyMessage messageKey={item.label} />
            {item.update && showUpdateBadge ? (
              <span
                {...sidebarNotificationBadgeStyleProps}
                data-stylex-owner="site-user-list-sidebar-notification-badge"
              >
                1
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function UserStateTabs({
  currentState,
  siteAdminCount,
}: {
  currentState: SiteUserState;
  siteAdminCount: number;
}) {
  const legacySiteAdminBadgeCount = Math.max(siteAdminCount - 1, 0);
  const items: Array<{ labelKey: string; state: SiteUserState }> = [
    { labelKey: "site.userList.unlocked", state: "ACTIVE" },
    { labelKey: "site.userList.locked", state: "LOCKED" },
    { labelKey: "site.userList.deleted", state: "DELETED" },
    { labelKey: "site.userList.guest", state: "GUEST" },
    { labelKey: "site.userList.siteAdmin", state: "SITE_ADMIN" },
  ];

  return (
    <ul {...stateTabsStyleProps} data-stylex-owner="site-user-list-state-tabs">
      {items.map((item) => {
        const isActive = item.state === currentState;
        const itemStyleProps = stylex.props(styles.stateTabItem);
        const linkStyleProps = stylex.props(
          styles.stateTabLink,
          isActive && styles.stateTabLinkActive,
        );
        return (
          <li
            {...itemStyleProps}
            data-selected={isActive ? "true" : undefined}
            data-stylex-owner="site-user-list-state-tab-item"
            key={item.state}
          >
            <Link
              {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
              {...linkStyleProps}
              data-stylex-owner="site-user-list-state-tab-link"
              search={{ state: item.state }}
              to="/sites/userList"
            >
              <LegacyMessage messageKey={item.labelKey} />
              {item.state === "SITE_ADMIN" ? (
                <span
                  {...stateTabNumericBadgeStyleProps}
                  data-stylex-owner="site-user-list-state-tab-numeric-badge"
                >
                  {legacySiteAdminBadgeCount}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserListItem({
  even,
  initialUserId,
  onDeleteClick,
  onDismissPasswordResetAlert,
  onResetPasswordClick,
  onToggleClick,
  passwordReset,
  state,
  user,
}: {
  even: boolean;
  initialUserId?: number;
  onDeleteClick: (event: MouseEvent<HTMLButtonElement>, user: SiteUser) => void;
  onDismissPasswordResetAlert: (event: MouseEvent<HTMLButtonElement>, loginId: string) => void;
  onResetPasswordClick: (loginId: string) => void;
  onToggleClick: (loginId: string, action: UserToggleAction) => void;
  passwordReset?: SiteUserPasswordResetResponse | "pending";
  state: SiteUserState;
  user: SiteUser;
}) {
  const { t } = useLegacyMessages();
  const rowStyleProps = even ? userRowEvenStyleProps : userRowStyleProps;
  return (
    <li {...rowStyleProps} data-stylex-owner="site-user-list-row">
      <div {...identityColumnStyleProps} data-stylex-owner="site-user-list-row-column">
        <Link
          {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
          {...avatarStyleProps}
          data-stylex-owner="site-user-list-row-avatar"
          params={{ user: user.loginId }}
          to="/$user"
        >
          {isDefaultUserAvatar(user.avatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default avatar branch renders no alt/size attributes. */
            <img
              {...avatarImageStyleProps}
              data-stylex-owner="site-user-list-row-avatar-image"
              src={user.avatarUrl}
            />
          ) : (
            <img
              {...avatarImageStyleProps}
              data-stylex-owner="site-user-list-row-avatar-image"
              src={user.avatarUrl}
              alt={user.displayName}
              width="32"
              height="32"
            />
          )}
        </Link>
        <Link
          {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
          {...userNameStyleProps}
          data-stylex-owner="site-user-list-row-user-name"
          params={{ user: user.loginId }}
          to="/$user"
        >
          {user.displayName}
        </Link>
        <Link
          {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
          {...userIdStyleProps}
          data-stylex-owner="site-user-list-row-user-id"
          params={{ user: user.loginId }}
          to="/$user"
        >
          @{user.loginId}
        </Link>
      </div>
      <div {...emailColumnStyleProps} data-stylex-owner="site-user-list-row-column">
        <span {...emailStyleProps} data-stylex-owner="site-user-list-row-email">
          {user.emailAddress}
        </span>
      </div>
      <div {...dateColumnStyleProps} data-stylex-owner="site-user-list-row-date">
        <span>{user.createdAt}</span>
      </div>
      {state !== "DELETED" ? (
        <div {...actionColumnStyleProps} data-stylex-owner="site-user-list-row-action">
          <button
            {...(user.isGuest ? actionSuccessButtonStyleProps : actionButtonStyleProps)}
            type="button"
            data-action="guest"
            data-stylex-owner="site-user-list-row-action-button"
            onClick={() => onToggleClick(user.loginId, "guest")}
          >
            {user.isGuest ? t("button.user.make.normal.mode") : t("button.user.make.guest.mode")}
          </button>
          <button
            {...actionButtonStyleProps}
            type="button"
            data-action="account-lock"
            data-stylex-owner="site-user-list-row-action-button"
            onClick={() => onToggleClick(user.loginId, "account-lock")}
          >
            {t(`button.user.makeAccountUnlock.${user.state === "LOCKED"}`)}
          </button>
          <button
            {...actionButtonStyleProps}
            type="button"
            id={user.loginId}
            data-action="reset-password"
            data-stylex-owner="site-user-list-row-action-button"
            onClick={() => onResetPasswordClick(user.loginId)}
          >
            {t("title.resetPassword")}
          </button>
          <button
            {...(user.isSiteAdmin ? actionInfoButtonStyleProps : actionLabelInfoButtonStyleProps)}
            type="button"
            disabled={user.id === initialUserId}
            title={
              user.id === initialUserId
                ? t("site.userList.initialAdminPolicy", {
                    fallback:
                      "The first registered user is the initial Site Admin and cannot have this role revoked or be removed.",
                  })
                : undefined
            }
            data-action="site-admin"
            data-stylex-owner="site-user-list-row-action-button"
            onClick={() => onToggleClick(user.loginId, "site-admin")}
          >
            {user.isSiteAdmin
              ? t("button.user.revoke.site.admin.role")
              : t("button.user.upgrade.to.site.admin")}
          </button>
          <button
            {...actionDangerButtonStyleProps}
            type="button"
            disabled={user.id === initialUserId}
            title={
              user.id === initialUserId
                ? t("site.userList.initialAdminPolicy", {
                    fallback:
                      "The first registered user is the initial Site Admin and cannot have this role revoked or be removed.",
                  })
                : undefined
            }
            data-action="delete"
            data-stylex-owner="site-user-list-row-action-button"
            onClick={(event) => onDeleteClick(event, user)}
          >
            {t("button.delete")}
          </button>
          {passwordReset === "pending" ? (
            <RequestWaitingAlert
              onDismiss={(event) => onDismissPasswordResetAlert(event, user.loginId)}
            />
          ) : null}
          {passwordReset && passwordReset !== "pending" ? (
            <PasswordResetAlert
              newPassword={passwordReset.newPassword ?? ""}
              onDismiss={(event) => onDismissPasswordResetAlert(event, user.loginId)}
            />
          ) : null}
        </div>
      ) : (
        <div {...leaveDateColumnStyleProps} data-stylex-owner="site-user-list-row-leave-date">
          {legacyLastStateModifiedDate(user)}
        </div>
      )}
    </li>
  );
}

function legacyLastStateModifiedDate(user: SiteUser) {
  return (
    (user as SiteUser & { lastStateModifiedDate?: string }).lastStateModifiedDate ??
    user.lastStateModifiedAt
  );
}

function normalizeUserListSearch(search: UserListRouteSearch): UserListSearch {
  return {
    pageNum: search.pageNum ?? 1,
    query: search.query ?? "",
    state: search.state ?? "ACTIVE",
  };
}

function isDefaultUserAvatar(avatarUrl: string) {
  return (
    avatarUrl.includes("gravatar.com/avatar/") ||
    /\/assets\/images\/default-avatar-\d+\.png$/u.test(avatarUrl)
  );
}

function PasswordResetAlert({
  newPassword,
  onDismiss,
}: {
  newPassword: string;
  onDismiss: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useLegacyMessages();
  return (
    <div
      {...passwordResetSuccessAlertStyleProps}
      data-stylex-owner="site-user-list-password-reset-alert"
      data-variant="success"
    >
      <button
        {...passwordResetAlertCloseStyleProps}
        type="button"
        data-stylex-owner="site-user-list-password-reset-alert-close"
        onClick={onDismiss}
      >
        &times;
      </button>
      <h4
        {...passwordResetAlertHeadingStyleProps}
        data-stylex-owner="site-user-list-password-reset-alert-heading"
      >
        {t("user.newPassword")}: {newPassword}
      </h4>
    </div>
  );
}

function RequestWaitingAlert({
  onDismiss,
}: {
  onDismiss: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      {...passwordResetAlertStyleProps}
      data-stylex-owner="site-user-list-password-reset-alert"
      data-variant="pending"
    >
      <button
        {...passwordResetAlertCloseStyleProps}
        type="button"
        data-stylex-owner="site-user-list-password-reset-alert-close"
        onClick={onDismiss}
      >
        &times;
      </button>
      <h4
        {...passwordResetAlertHeadingStyleProps}
        data-stylex-owner="site-user-list-password-reset-alert-heading"
      >
        {"sending requestHeader" + "..."}
      </h4>
    </div>
  );
}

function isSiteUserState(value: unknown): value is SiteUserState {
  return typeof value === "string" && USER_STATES.includes(value as SiteUserState);
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
