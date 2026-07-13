import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
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
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

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
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteUserListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
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
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">
                  <LegacyMessage messageKey="site.sidebar.userList" />
                </h2>
                <form
                  className="form-search pull-right"
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
              <div className="row-fluid listhead">
                <div className="span3 listhead-title">
                  <strong>
                    <LegacyMessage messageKey="user.name" />
                  </strong>
                </div>
                <div className="span3 listhead-title">
                  <strong>
                    <LegacyMessage messageKey="user.email" />
                  </strong>
                </div>
                <div className="span2 listhead-title">
                  <strong>
                    <LegacyMessage messageKey="userinfo.since" />
                  </strong>
                </div>
                <div className="span4 listhead-title">
                  <strong>
                    {search.state === "DELETED" ? (
                      <LegacyMessage messageKey="userinfo.leave" />
                    ) : (
                      <>&nbsp;</>
                    )}
                  </strong>
                </div>
              </div>
              <ul className="user-list-wrap">
                {(response?.users ?? []).map((user) => (
                  <UserListItem
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
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
              search={search(currentPage - 1)}
              to="/sites/userList"
            >
              <i className="ico btn-pg-prev"></i>
              <span>{prevPageLabel}</span>
            </Link>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">{prevPageLabel}</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
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
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <Link
              {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
              search={search(currentPage + 1)}
              to="/sites/userList"
            >
              <span>{nextPageLabel}</span>
              <i className="ico btn-pg-next"></i>
            </Link>
          ) : (
            <>
              <span className="off">{nextPageLabel}</span>
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
    <ul className="nav nav-tabs">
      {items.map((item) => (
        <li className={item.state === currentState ? "active" : ""} key={item.state}>
          <Link
            {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
            search={{ state: item.state }}
            to="/sites/userList"
          >
            <LegacyMessage messageKey={item.labelKey} />
            {item.state === "SITE_ADMIN" ? (
              <span className="num-badge">{legacySiteAdminBadgeCount}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function UserListItem({
  onDeleteClick,
  onDismissPasswordResetAlert,
  onResetPasswordClick,
  onToggleClick,
  passwordReset,
  state,
  user,
}: {
  onDeleteClick: (event: MouseEvent<HTMLButtonElement>, user: SiteUser) => void;
  onDismissPasswordResetAlert: (event: MouseEvent<HTMLButtonElement>, loginId: string) => void;
  onResetPasswordClick: (loginId: string) => void;
  onToggleClick: (loginId: string, action: UserToggleAction) => void;
  passwordReset?: SiteUserPasswordResetResponse | "pending";
  state: SiteUserState;
  user: SiteUser;
}) {
  const { t } = useLegacyMessages();
  return (
    <li className="row-fluid listitem">
      <div className="span3 listitem-col">
        <Link
          {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
          className="avatar-wrap list-avatar"
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
          className="user-name"
          params={{ user: user.loginId }}
          to="/$user"
        >
          {user.displayName}
        </Link>
        <Link
          {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
          className="user-id"
          params={{ user: user.loginId }}
          to="/$user"
        >
          @{user.loginId}
        </Link>
      </div>
      <div className="span3 listitem-col">
        <span className="email">{user.emailAddress}</span>
      </div>
      <div className="span2 listitem-col created-date">
        <span>{user.createdAt}</span>
      </div>
      {state !== "DELETED" ? (
        <div className="span5 listitem-col action-buttons">
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
