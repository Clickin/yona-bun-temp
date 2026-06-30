import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  deleteSiteUserRest,
  resetSiteUserPasswordRest,
  siteUsersQueryOptions,
  type SiteUser,
  type SiteUserPasswordResetResponse,
  type SiteUserState,
} from "../../api/site-admin";
import { apiQueryKeys } from "../../api/query-keys";
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
  const response = query.data;
  const deleteMutation = useMutation({
    mutationFn: async (loginId: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteSiteUserRest(runtimeConfig, csrfToken, loginId);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
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
      setPasswordResetByLoginId((current) => ({ ...current, [loginId]: data }));
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
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
              <SiteAdminSidebar runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">
                  <LegacyMessage messageKey="site.sidebar.userList" />
                </h2>
                <form
                  className="form-search pull-right"
                  action={prefixBasePath(runtimeConfig.basePath, "/sites/userList")}
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
                runtimeConfig={runtimeConfig}
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
                    passwordReset={passwordResetByLoginId[user.loginId]}
                    state={search.state}
                    user={user}
                  />
                ))}
              </ul>

              <div id="pagination"></div>

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
}

function SiteAdminSidebar({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const navItems = [
    { href: "/sites/userList", labelKey: "site.sidebar.userList", active: true },
    { href: "/sites/postList", labelKey: "site.sidebar.postList" },
    { href: "/sites/issueList", labelKey: "site.sidebar.issueList" },
    { href: "/sites/projectList", labelKey: "site.sidebar.projectList" },
    { href: "/sites/mail", labelKey: "site.sidebar.mailSend" },
    { href: "/sites/massmail", labelKey: "site.sidebar.massMail" },
    { href: "/sites/update", labelKey: "site.sidebar.update" },
    { href: "/sites/diagnostic", labelKey: "site.sidebar.diagnostics" },
  ];

  return (
    <ul className="site-setting-nav">
      {navItems.map((item) => (
        <li className={item.active ? "active" : ""} key={item.href}>
          <a href={prefixBasePath(runtimeConfig.basePath, item.href)}>
            <LegacyMessage messageKey={item.labelKey} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function UserStateTabs({
  currentState,
  runtimeConfig,
  siteAdminCount,
}: {
  currentState: SiteUserState;
  runtimeConfig: RuntimeConfig;
  siteAdminCount: number;
}) {
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
          <a href={prefixBasePath(runtimeConfig.basePath, `/sites/userList?state=${item.state}`)}>
            <LegacyMessage messageKey={item.labelKey} />
            {item.state === "SITE_ADMIN" ? (
              <span className="num-badge">{siteAdminCount}</span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

function UserListItem({
  onDeleteClick,
  onResetPasswordClick,
  passwordReset,
  query,
  runtimeConfig,
  state,
  user,
}: {
  onDeleteClick: (user: SiteUser) => void;
  onResetPasswordClick: (loginId: string) => void;
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
          <img src={user.avatarUrl} alt="" />
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
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
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
          >
            {user.isGuest ? t("button.user.make.normal.mode") : t("button.user.make.guest.mode")}
          </a>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
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
            <PasswordResetAlert newPassword={passwordReset.newPassword} />
          ) : null}
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a
            className={
              user.isSiteAdmin ? "ybtn ybtn-small ybtn-info" : "ybtn ybtn-small label-info"
            }
            data-request-method="post"
            data-request-uri={prefixBasePath(
              runtimeConfig.basePath,
              `/sites/user/${user.loginId}/site-admin/toggle`,
            )}
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
