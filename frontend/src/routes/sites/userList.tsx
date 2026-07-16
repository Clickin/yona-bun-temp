import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useState, type CSSProperties, type MouseEvent, type SyntheticEvent } from "react";
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
const LEGACY_ACTION_ANCHOR_BUTTON_STYLE: CSSProperties = { margin: 2 };
const styles = stylex.create({
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
  userActionColumn: { padding: "0px 0px 10px", width: "40.42553191489362%" },
  userEmail: { fontSize: "13px", lineHeight: "43px" },
  userAvatar: {
    float: "left",
    height: "45px",
    marginRight: "10px",
    marginTop: "3px",
    width: "45px",
  },
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
  paginationLabel: {
    color: siteUserListColors.paginationAccent,
    fontSize: "11px",
  },
  paginationLabelDisabled: { color: siteUserListColors.paginationText },
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
    margin: "0px",
  },
});
const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);
const titleSearchFormStyleProps = stylex.props(styles.titleSearchForm);
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
const actionColumnStyleProps = stylex.props(styles.userColumn, styles.userActionColumn);
const emailStyleProps = stylex.props(styles.userEmail);
const avatarStyleProps = stylex.props(styles.userAvatar);
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
const paginationLabelStyleProps = stylex.props(styles.paginationLabel);
const paginationDisabledLabelStyleProps = stylex.props(
  styles.paginationLabel,
  styles.paginationLabelDisabled,
);

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
        <div
          {...settingWrapStyleProps}
          className={`site-setting-wrap ${settingWrapStyleProps.className ?? ""}`}
          data-stylex-owner="site-user-list-setting-wrap"
        >
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
                <form
                  {...titleSearchFormStyleProps}
                  className={`form-search pull-right ${titleSearchFormStyleProps.className ?? ""}`}
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
                  <div className="search-bar">
                    <input
                      className="textbox"
                      name="query"
                      type="text"
                      placeholder={t("site.userList.search")}
                      defaultValue={search.query}
                    />
                    <button type="submit" className="search-btn">
                      <i className="yobicon-search"></i>
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
                id="alertDeletionWrap"
                className={deleteUser ? "modal fade in" : "modal fade"}
                aria-hidden={deleteUser ? false : deleteModalClosed ? true : undefined}
                style={
                  deleteUser
                    ? { display: "block" }
                    : deleteModalClosed
                      ? { display: "none" }
                      : undefined
                }
              >
                <div className="modal-header">
                  <button type="button" className="close" onClick={dismissDeleteModal}>
                    ×
                  </button>
                  <span id="userInfo">
                    {deleteUser ? `${deleteUser.displayName}(${deleteUser.loginId})` : ""}
                  </span>
                  <span>
                    <LegacyMessage messageKey="site.user.delete" />
                  </span>
                </div>
                <div className="modal-body">
                  <p>
                    <LegacyMessage messageKey="site.user.deleteConfirm" />
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    id="accountToggleBtn"
                    className="ybtn ybtn-danger"
                    onClick={submitDelete}
                  >
                    <LegacyMessage messageKey="button.yes" />
                  </button>
                  <button type="button" className="ybtn" onClick={dismissDeleteModal}>
                    <LegacyMessage messageKey="button.no" />
                  </button>
                </div>
              </div>
              {deleteUser ? (
                <div
                  className="modal-backdrop fade in"
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
              <i className="ico btn-pg-prev"></i>
              <span
                {...paginationLabelStyleProps}
                data-stylex-owner="site-user-list-pagination-label"
              >
                {prevPageLabel}
              </span>
            </Link>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
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
            className={`input-mini nospinner ${paginationInputStyleProps.className ?? ""}`}
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
              <i className="ico btn-pg-next"></i>
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
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul className="site-setting-nav">
      <li className="active">
        <Link {...LEGACY_SITE_SETTING_NAV_LINK_PROPS} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="">
        <Link {...LEGACY_SITE_SETTING_NAV_LINK_PROPS} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="">
        <Link {...LEGACY_SITE_SETTING_NAV_LINK_PROPS} to="/sites/issueList">
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="">
        <Link {...LEGACY_SITE_SETTING_NAV_LINK_PROPS} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="">
        <Link {...LEGACY_SITE_SETTING_NAV_LINK_PROPS} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="">
        <Link {...LEGACY_SITE_SETTING_NAV_LINK_PROPS} to="/sites/massmail">
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link {...LEGACY_SITE_SETTING_NAV_LINK_PROPS} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link {...LEGACY_SITE_SETTING_NAV_LINK_PROPS} to="/sites/diagnostic">
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
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
                <span className="num-badge">{legacySiteAdminBadgeCount}</span>
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
  onDeleteClick,
  onDismissPasswordResetAlert,
  onResetPasswordClick,
  onToggleClick,
  passwordReset,
  state,
  user,
}: {
  even: boolean;
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
    <li
      {...rowStyleProps}
      className={`${state === "DELETED" ? "row-fluid listitem " : ""}${rowStyleProps.className ?? ""}`}
      data-stylex-owner="site-user-list-row"
    >
      <div {...identityColumnStyleProps} data-stylex-owner="site-user-list-row-column">
        <Link
          {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
          {...avatarStyleProps}
          className={`avatar-wrap ${avatarStyleProps.className ?? ""}`}
          data-stylex-owner="site-user-list-row-avatar"
          params={{ user: user.loginId }}
          to="/$user"
        >
          {isDefaultUserAvatar(user.avatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default avatar branch renders no alt/size attributes. */
            <img src={user.avatarUrl} />
          ) : (
            <img src={user.avatarUrl} alt={user.displayName} width="32" height="32" />
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
        <div
          {...actionColumnStyleProps}
          className={`action-buttons ${actionColumnStyleProps.className ?? ""}`}
          data-stylex-owner="site-user-list-row-action"
        >
          <button
            type="button"
            className={user.isGuest ? "ybtn ybtn-small ybtn-success" : "ybtn ybtn-small"}
            onClick={() => onToggleClick(user.loginId, "guest")}
            style={LEGACY_ACTION_ANCHOR_BUTTON_STYLE}
          >
            {user.isGuest ? t("button.user.make.normal.mode") : t("button.user.make.guest.mode")}
          </button>
          <button
            type="button"
            className="ybtn ybtn-small"
            onClick={() => onToggleClick(user.loginId, "account-lock")}
            style={LEGACY_ACTION_ANCHOR_BUTTON_STYLE}
          >
            {t(`button.user.makeAccountUnlock.${user.state === "LOCKED"}`)}
          </button>
          <button
            type="button"
            id={user.loginId}
            className="ybtn ybtn-small"
            onClick={() => onResetPasswordClick(user.loginId)}
          >
            {t("title.resetPassword")}
          </button>
          <button
            type="button"
            className={
              user.isSiteAdmin ? "ybtn ybtn-small ybtn-info" : "ybtn ybtn-small label-info"
            }
            onClick={() => onToggleClick(user.loginId, "site-admin")}
            style={LEGACY_ACTION_ANCHOR_BUTTON_STYLE}
          >
            {user.isSiteAdmin
              ? t("button.user.revoke.site.admin.role")
              : t("button.user.upgrade.to.site.admin")}
          </button>
          <button
            type="button"
            className="ybtn ybtn-small ybtn-danger"
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
        <div className="span4 listitem-col">{legacyLastStateModifiedDate(user)}</div>
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
    <div className="alert alert-success">
      <button type="button" className="close" onClick={onDismiss}>
        &times;
      </button>
      <h4>
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
    <div className="alert alert-fail">
      <button type="button" className="close" onClick={onDismiss}>
        &times;
      </button>
      <h4>{"sending requestHeader" + "..."}</h4>
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
