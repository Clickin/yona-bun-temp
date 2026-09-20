import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar, siteSettingWrapClassName } from "../../components/site-admin-sidebar";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type MouseEvent, type SyntheticEvent } from "react";
import type { CSSProperties } from "react";
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
import { formatLegacyTimestamp, LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
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
      window.alert(`password change failed: ${t(error.message)}`);
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
      <div data-owner="site-user-list-breadcrumb-outer">
        <div data-owner="site-user-list-breadcrumb-inner">
          <h3 data-owner="site-user-list-breadcrumb-heading">
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-owner="site-user-list-page-wrap-outer">
        <div className={siteSettingWrapClassName} data-owner="site-user-list-setting-wrap">
          <div className="row-fluid" data-owner="site-user-list-setting-grid">
            <div className="span2" data-owner="site-user-list-setting-sidebar-column">
              <SiteAdminSidebar
                activeTo="/sites/userList"
                badgeOwner="site-user-list-sidebar-notification-badge"
                baseLinkProps={LEGACY_SITE_SETTING_NAV_LINK_PROPS}
                dataSelected="active-only"
                navOwner="site-user-list-sidebar-nav"
                ownerPrefix="site-user-list-sidebar"
                showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)}
                styleSlots={{
                  activeItem: [],
                  activeLink: [],
                  badge: [],
                  firstItem: [],
                  item: [],
                  link: [],
                  nav: [],
                }}
                ulClassName="site-setting-nav"
              />
            </div>
            <div className="span10" data-owner="site-user-list-setting-content-column">
              <div data-owner="site-user-list-title-strip">
                <h2 data-owner="site-user-list-title-heading">
                  <LegacyMessage messageKey="site.sidebar.userList" />
                </h2>
                <form
                  data-owner="site-user-list-title-search-form"
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
                  <div className="search-bar" data-owner="site-user-list-title-search-wrapper">
                    <input
                      className="textbox"
                      data-owner="site-user-list-title-search-input"
                      name="query"
                      type="text"
                      placeholder={t("site.userList.search")}
                      defaultValue={search.query}
                    />
                    <button
                      type="submit"
                      className="search-btn"
                      data-owner="site-user-list-title-search-button"
                    >
                      <i data-owner="site-user-list-title-search-icon"></i>
                    </button>
                  </div>
                </form>
              </div>
              <UserStateTabs
                currentState={search.state}
                siteAdminCount={response?.siteAdminCount ?? 0}
              />
              <div className="row-fluid listhead" data-owner="site-user-list-listhead">
                <div className="span3 listhead-title" data-owner="site-user-list-listhead-column">
                  <strong>
                    <LegacyMessage messageKey="user.name" />
                  </strong>
                </div>
                <div className="span3 listhead-title" data-owner="site-user-list-listhead-column">
                  <strong>
                    <LegacyMessage messageKey="user.email" />
                  </strong>
                </div>
                <div className="span2 listhead-title" data-owner="site-user-list-listhead-column">
                  <strong>
                    <LegacyMessage messageKey="userinfo.since" />
                  </strong>
                </div>
                <div className="span4 listhead-title" data-owner="site-user-list-listhead-column">
                  <strong>
                    {search.state === "DELETED" ? (
                      <LegacyMessage messageKey="userinfo.leave" />
                    ) : (
                      <>&nbsp;</>
                    )}
                  </strong>
                </div>
              </div>
              <ul className="user-list-wrap" data-owner="site-user-list-row-list">
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
                id="alertDeletionWrap"
                data-state={deleteUser ? "open" : deleteModalClosed ? "closed" : "initial"}
                data-owner="site-user-list-delete-modal"
                aria-hidden={deleteUser ? false : deleteModalClosed ? true : undefined}
              >
                <div data-owner="site-user-list-delete-modal-header">
                  <button
                    data-owner="site-user-list-delete-modal-close"
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
                <div data-owner="site-user-list-delete-modal-body">
                  <p>
                    <LegacyMessage messageKey="site.user.deleteConfirm" />
                  </p>
                </div>
                <div data-owner="site-user-list-delete-modal-footer">
                  <button
                    type="button"
                    id="accountToggleBtn"
                    data-owner="site-user-list-delete-modal-button"
                    data-variant="danger"
                    onClick={submitDelete}
                  >
                    <LegacyMessage messageKey="button.yes" />
                  </button>
                  <button
                    type="button"
                    data-owner="site-user-list-delete-modal-button"
                    data-variant="default"
                    onClick={dismissDeleteModal}
                  >
                    <LegacyMessage messageKey="button.no" />
                  </button>
                </div>
              </div>
              {deleteUser ? (
                <div
                  data-owner="site-user-list-delete-modal-backdrop"
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
    <div id="pagination" data-owner="site-user-list-pagination">
      <ul data-owner="site-user-list-pagination-list">
        <li data-owner="site-user-list-pagination-item">
          {hasPrev ? (
            <Link
              {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
              search={search(currentPage - 1)}
              to="/sites/userList"
            >
              <i
                data-disabled="false"
                style={
                  {
                    "--site-user-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-owner="site-user-list-pagination-icon"
              ></i>
              <span data-owner="site-user-list-pagination-label">{prevPageLabel}</span>
            </Link>
          ) : (
            <>
              <i
                data-disabled="true"
                style={
                  {
                    "--site-user-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-owner="site-user-list-pagination-icon"
              ></i>
              <span data-disabled="true" data-owner="site-user-list-pagination-label">
                {prevPageLabel}
              </span>
            </>
          )}
        </li>
        <li data-owner="site-user-list-pagination-item">
          <input
            data-owner="site-user-list-pagination-input"
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
        <li className="delimiter" data-owner="site-user-list-pagination-item">
          /
        </li>
        <li data-owner="site-user-list-pagination-item">{totalPages}</li>
        <li data-owner="site-user-list-pagination-item">
          {hasNext ? (
            <Link
              {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
              search={search(currentPage + 1)}
              to="/sites/userList"
            >
              <span data-owner="site-user-list-pagination-label">{nextPageLabel}</span>
              <i
                data-disabled="false"
                style={
                  {
                    "--site-user-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-owner="site-user-list-pagination-icon"
              ></i>
            </Link>
          ) : (
            <>
              <span data-disabled="true" data-owner="site-user-list-pagination-label">
                {nextPageLabel}
              </span>
              <i
                data-disabled="true"
                style={
                  {
                    "--site-user-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
                data-owner="site-user-list-pagination-icon"
              ></i>
            </>
          )}
        </li>
      </ul>
    </div>
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
    <ul className="nav nav-tabs" data-owner="site-user-list-state-tabs">
      {items.map((item) => {
        const isActive = item.state === currentState;
        return (
          <li
            className={isActive ? "active" : undefined}
            data-selected={isActive ? "true" : undefined}
            data-owner="site-user-list-state-tab-item"
            key={item.state}
          >
            <Link
              {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
              data-owner="site-user-list-state-tab-link"
              search={{ state: item.state }}
              to="/sites/userList"
            >
              <LegacyMessage messageKey={item.labelKey} />
              {item.state === "SITE_ADMIN" ? (
                <span className="num-badge" data-owner="site-user-list-state-tab-numeric-badge">
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
  const createdDate = formatLegacyTimestamp(user.createdAt, t);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  // JodaDateUtil.socialDate uses the full local date/time after yesterday.
  const createdLabel =
    Date.parse(user.createdAt) < yesterday.getTime()
      ? createdDate.title.replace(/(:\d{2}):\d{2}/u, "$1")
      : createdDate.label;
  return (
    <li className="row-fluid listitem" data-owner="site-user-list-row">
      <div className="span3 listitem-col" data-owner="site-user-list-row-column">
        <Link
          {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
          className="avatar-wrap list-avatar"
          data-owner="site-user-list-row-avatar"
          params={{ user: user.loginId }}
          to="/$user"
        >
          {isDefaultUserAvatar(user.avatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default avatar branch renders no alt/size attributes. */
            <img data-owner="site-user-list-row-avatar-image" src={user.avatarUrl} />
          ) : (
            <img
              data-owner="site-user-list-row-avatar-image"
              src={user.avatarUrl}
              alt={user.displayName}
              width="32"
              height="32"
            />
          )}
        </Link>
        <Link
          {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
          className="user-name"
          data-owner="site-user-list-row-user-name"
          params={{ user: user.loginId }}
          to="/$user"
        >
          {user.displayName}
        </Link>
        <Link
          {...LEGACY_LINK_ACTIVE_MARKER_SUPPRESSION_PROPS}
          className="user-id"
          data-owner="site-user-list-row-user-id"
          params={{ user: user.loginId }}
          to="/$user"
        >
          @{user.loginId}
        </Link>
      </div>
      <div className="span3 listitem-col" data-owner="site-user-list-row-column">
        <span data-owner="site-user-list-row-email">{user.emailAddress}</span>
      </div>
      <div className="span2 listitem-col created-date" data-owner="site-user-list-row-date">
        <span>{createdLabel}</span>
      </div>
      {state !== "DELETED" ? (
        <div className="span5 listitem-col action-buttons" data-owner="site-user-list-row-action">
          <button
            className={`ybtn ybtn-small${user.isGuest ? " ybtn-success" : ""}`}
            type="button"
            data-action="guest"
            data-owner="site-user-list-row-action-button"
            onClick={() => onToggleClick(user.loginId, "guest")}
          >
            {user.isGuest ? t("button.user.make.normal.mode") : t("button.user.make.guest.mode")}
          </button>{" "}
          <button
            className="ybtn ybtn-small"
            data-action="account-lock"
            data-owner="site-user-list-row-action-button"
            onClick={() => onToggleClick(user.loginId, "account-lock")}
          >
            {t(`button.user.makeAccountUnlock.${user.state === "LOCKED"}`)}
          </button>{" "}
          <button
            className="ybtn ybtn-small"
            id={user.loginId}
            data-action="reset-password"
            data-owner="site-user-list-row-action-button"
            onClick={() => onResetPasswordClick(user.loginId)}
          >
            {t("title.resetPassword")}
          </button>{" "}
          <button
            className={`ybtn ybtn-small ${user.isSiteAdmin ? "ybtn-info" : "label-info"}`}
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
            data-owner="site-user-list-row-action-button"
            onClick={() => onToggleClick(user.loginId, "site-admin")}
          >
            {user.isSiteAdmin
              ? t("button.user.revoke.site.admin.role")
              : t("button.user.upgrade.to.site.admin")}
          </button>{" "}
          <button
            className="ybtn ybtn-small ybtn-danger"
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
            data-owner="site-user-list-row-action-button"
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
        <div data-owner="site-user-list-row-leave-date">{legacyLastStateModifiedDate(user)}</div>
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
    <div data-owner="site-user-list-password-reset-alert" data-variant="success">
      <button
        type="button"
        data-owner="site-user-list-password-reset-alert-close"
        onClick={onDismiss}
      >
        &times;
      </button>
      <h4 data-owner="site-user-list-password-reset-alert-heading">
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
    <div data-owner="site-user-list-password-reset-alert" data-variant="pending">
      <button
        type="button"
        data-owner="site-user-list-password-reset-alert-close"
        onClick={onDismiss}
      >
        &times;
      </button>
      <h4 data-owner="site-user-list-password-reset-alert-heading">
        {"sending requestHeader" + "..."}
      </h4>
    </div>
  );
}

function isSiteUserState(value: unknown): value is SiteUserState {
  return typeof value === "string" && USER_STATES.includes(value as SiteUserState);
}
