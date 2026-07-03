import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  deleteSiteUserRest,
  resetSiteUserPasswordRest,
  siteUpdateQueryOptions,
  siteUsersQueryOptions,
  toggleSiteUserAccountLockRest,
  toggleSiteUserAdminRest,
  toggleSiteUserGuestRest,
  type SiteUser,
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

type UserListSearch = {
  pageNum: number;
  query: string;
  state: SiteUserState;
};

type UserToggleAction = "account-lock" | "guest" | "site-admin";

const USER_STATES: SiteUserState[] = ["ACTIVE", "LOCKED", "DELETED", "GUEST", "SITE_ADMIN"];

export const Route = createFileRoute("/sites/userList")({
  component: SiteUserListRoute,
  validateSearch: (search: Record<string, unknown>): UserListSearch => ({
    pageNum: search.pageNum ? Number(search.pageNum) || 1 : 1,
    query: typeof search.query === "string" ? search.query : "",
    state: isSiteUserState(search.state) ? search.state : "ACTIVE",
  }),
});

function SiteUserListRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SiteUserListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SiteUserListScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const search = Route.useSearch();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteUser, setDeleteUser] = useState<SiteUser | null>(null);
  const [deleteModalClosed, setDeleteModalClosed] = useState(false);
  const [passwordResetByLoginId, setPasswordResetByLoginId] = useState<
    Record<string, SiteUserPasswordResetResponse | "pending">
  >({});
  const query = useQuery(
    siteUsersQueryOptions(runtimeConfig, {
      page: search.pageNum,
      query: search.query,
      state: search.state,
    }),
  );
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));
  const response = query.data;
  const deleteMutation = useMutation({
    mutationFn: async (loginId: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteSiteUserRest(runtimeConfig, csrfToken, loginId);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
      router.history.go(0);
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
                query={search.query}
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
                    query={search.query}
                    runtimeConfig={runtimeConfig}
                    onDeleteClick={(target) => {
                      setDeleteUser(target);
                      setDeleteModalClosed(false);
                    }}
                    onResetPasswordClick={(loginId) => resetPasswordMutation.mutate(loginId)}
                    onToggleClick={(loginId, action) =>
                      toggleUserMutation.mutate({ action, loginId })
                    }
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
                className={
                  deleteUser
                    ? "modal fade in"
                    : deleteModalClosed
                      ? "modal fade hide"
                      : "modal fade"
                }
                style={deleteUser ? { display: "block" } : undefined}
              >
                <div className="modal-header">
                  <button
                    type="button"
                    className="close"
                    data-dismiss="modal"
                    onClick={() => {
                      setDeleteUser(null);
                      setDeleteModalClosed(true);
                    }}
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
                <div className="modal-body">
                  <p>
                    <LegacyMessage messageKey="site.user.deleteConfirm" />
                  </p>
                </div>
                <div className="modal-footer">
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                  <a
                    id="accountToggleBtn"
                    className="ybtn ybtn-danger"
                    onClick={() => {
                      if (deleteUser) {
                        deleteMutation.mutate(deleteUser.loginId);
                      }
                    }}
                  >
                    <LegacyMessage messageKey="button.yes" />
                  </a>
                  <button
                    type="button"
                    className="ybtn"
                    data-dismiss="modal"
                    onClick={() => {
                      setDeleteUser(null);
                      setDeleteModalClosed(true);
                    }}
                  >
                    <LegacyMessage messageKey="button.no" />
                  </button>
                </div>
              </div>
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

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              activeProps={{ className: undefined }}
              search={search(currentPage - 1)}
              to="/sites/userList"
            >
              <i className="ico btn-pg-prev"></i>
              <span>PREV</span>
            </Link>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">PREV</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            max={totalPages}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            readOnly
            type="number"
            value={currentPage}
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <Link
              activeProps={{ className: undefined }}
              search={search(currentPage + 1)}
              to="/sites/userList"
            >
              <span>NEXT</span>
              <i className="ico btn-pg-next"></i>
            </Link>
          ) : (
            <>
              <span className="off">NEXT</span>
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
        <Link activeProps={{ className: undefined }} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/issueList">
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/massmail">
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/diagnostic">
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function UserStateTabs({
  currentState,
  query,
  siteAdminCount,
}: {
  currentState: SiteUserState;
  query: string;
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
            activeProps={{ className: undefined }}
            search={{ query: query || undefined, state: item.state }}
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
  onResetPasswordClick,
  onToggleClick,
  passwordReset,
  query,
  runtimeConfig,
  state,
  user,
}: {
  onDeleteClick: (user: SiteUser) => void;
  onResetPasswordClick: (loginId: string) => void;
  onToggleClick: (loginId: string, action: UserToggleAction) => void;
  passwordReset?: SiteUserPasswordResetResponse | "pending";
  query: string;
  runtimeConfig: RuntimeConfig;
  state: SiteUserState;
  user: SiteUser;
}) {
  const { t } = useLegacyMessages();
  const userPath = prefixBasePath(runtimeConfig.basePath, `/${user.loginId}`);

  return (
    <li className="row-fluid listitem">
      <div className="span3 listitem-col">
        <a href={userPath} className="avatar-wrap list-avatar">
          {isDefaultUserAvatar(user.avatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default avatar branch renders no alt/size attributes. */
            <img src={user.avatarUrl} />
          ) : (
            <img src={user.avatarUrl} alt={user.displayName} width="32" height="32" />
          )}
        </a>
        <a href={userPath} className="user-name">
          {user.displayName}
        </a>
        <a href={userPath} className="user-id">
          @{user.loginId}
        </a>
      </div>
      <div className="span3 listitem-col">
        <span className="email">{user.emailAddress}</span>
      </div>
      <div className="span2 listitem-col created-date">
        <span>{user.createdAt}</span>
      </div>
      {state !== "DELETED" ? (
        <div className="span5 listitem-col action-buttons">
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <a
            className={user.isGuest ? "ybtn ybtn-small ybtn-success" : "ybtn ybtn-small"}
            data-request-method="post"
            data-request-uri={legacyUserMutationPath(
              runtimeConfig.basePath,
              user.loginId,
              "guest",
              state,
              query,
            )}
            onClick={() => onToggleClick(user.loginId, "guest")}
          >
            {user.isGuest ? t("button.user.make.normal.mode") : t("button.user.make.guest.mode")}
          </a>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <a
            className="ybtn ybtn-small"
            data-request-method="post"
            data-request-uri={legacyUserMutationPath(
              runtimeConfig.basePath,
              user.loginId,
              "account-lock",
              state,
              query,
            )}
            onClick={() => onToggleClick(user.loginId, "account-lock")}
          >
            {t(`button.user.makeAccountUnlock.${user.state === "LOCKED"}`)}
          </a>
          <button
            id={user.loginId}
            className="ybtn ybtn-small"
            data-toggle="reset-password"
            data-href={`${userPath}?action=resetPassword`}
            onClick={() => onResetPasswordClick(user.loginId)}
          >
            {t("title.resetPassword")}
          </button>
          {passwordReset === "pending" ? <RequestWaitingAlert /> : null}
          {passwordReset && passwordReset !== "pending" ? (
            <PasswordResetAlert newPassword={passwordReset.newPassword ?? ""} />
          ) : null}
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <a
            className={
              user.isSiteAdmin ? "ybtn ybtn-small ybtn-info" : "ybtn ybtn-small label-info"
            }
            data-request-method="post"
            data-request-uri={prefixBasePath(
              runtimeConfig.basePath,
              `/sites/user/${user.loginId}/site-admin/toggle`,
            )}
            onClick={() => onToggleClick(user.loginId, "site-admin")}
          >
            {user.isSiteAdmin
              ? t("button.user.revoke.site.admin.role")
              : t("button.user.upgrade.to.site.admin")}
          </a>
          <button
            className="ybtn ybtn-small ybtn-danger"
            data-toggle="account-delete"
            data-href={prefixBasePath(runtimeConfig.basePath, `/sites/user/${user.id}`)}
            data-user-id={user.loginId}
            data-user-name={user.displayName}
            onClick={() => onDeleteClick(user)}
          >
            {t("button.delete")}
          </button>
        </div>
      ) : (
        <div className="span4 listitem-col">{user.lastStateModifiedAt}</div>
      )}
    </li>
  );
}

function isDefaultUserAvatar(avatarUrl: string) {
  return avatarUrl.includes("gravatar.com/avatar/");
}

function PasswordResetAlert({ newPassword }: { newPassword: string }) {
  const { t } = useLegacyMessages();
  return (
    <div className="alert alert-success">
      <button type="button" className="close" data-dismiss="alert">
        &times;
      </button>
      <h4>
        {t("user.newPassword")}: {newPassword}
      </h4>
    </div>
  );
}

function RequestWaitingAlert() {
  return (
    <div className="alert alert-fail">
      <button type="button" className="close" data-dismiss="alert">
        &times;
      </button>
      <h4>{"sending requestHeader" + "..."}</h4>
    </div>
  );
}

function legacyUserMutationPath(
  basePath: string,
  loginId: string,
  action: "account-lock" | "guest",
  state: SiteUserState,
  query: string,
) {
  const params = new URLSearchParams();
  params.set("state", state);
  if (query.trim() !== "") {
    params.set("query", query.trim());
  }
  return prefixBasePath(basePath, `/sites/user/${loginId}/${action}/toggle?${params.toString()}`);
}

function isSiteUserState(value: unknown): value is SiteUserState {
  return typeof value === "string" && USER_STATES.includes(value as SiteUserState);
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
