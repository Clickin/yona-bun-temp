import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { apiQueryKeys } from "../../../api/query-keys";
import {
  siteUsersQueryOptions,
  toggleSiteUserAccountLockRest,
  toggleSiteUserAdminRest,
  type SiteUser,
  type SiteUserListInput,
  type SiteUserListResponse,
  type SiteUserState,
} from "../../../api/site-admin";
import { useAppRuntime } from "../../../app-runtime-context";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  PlaceholderPage,
  useCurrentHref,
  useDocumentTitle,
  useRequireAuthenticatedRoute,
} from "../../-shared";

export const Route = createFileRoute("/sites/$pageName")({
  component: SiteAdminRouteComponent,
});

const SITE_USER_STATES: Array<{ label: string; state: SiteUserState }> = [
  { label: "Unlocked", state: "ACTIVE" },
  { label: "Locked", state: "LOCKED" },
  { label: "Deleted", state: "DELETED" },
  { label: "Guest", state: "GUEST" },
  { label: "Site Admin", state: "SITE_ADMIN" },
];

const SITE_ADMIN_NAV = [
  { href: "/sites/userList", label: "User List", pageName: "userList" },
  { href: "/sites/postList", label: "Post List", pageName: "postList" },
  { href: "/sites/issueList", label: "Issue List", pageName: "issueList" },
  { href: "/sites/projectList", label: "Project List", pageName: "projectList" },
  { href: "/sites/mail", label: "Mail Send", pageName: "mail" },
  { href: "/sites/massMail", label: "Mass Mail", pageName: "massMail" },
  { href: "/sites/update", label: "Update", pageName: "update" },
  { href: "/sites/diagnostic", label: "Diagnostics", pageName: "diagnostic" },
];

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSiteUserState(value: string | null): SiteUserState {
  const normalized = (value ?? "ACTIVE").trim().toUpperCase();
  return SITE_USER_STATES.some((state) => state.state === normalized)
    ? (normalized as SiteUserState)
    : "ACTIVE";
}

function siteUserListInputFromHref(href: string): SiteUserListInput {
  const params = new URL(href, "http://yona.local").searchParams;
  return {
    page: parsePositiveInt(params.get("pageNum") ?? params.get("page"), 1),
    query: (params.get("query") ?? "").trim(),
    state: normalizeSiteUserState(params.get("state")),
  };
}

function siteUserListHref(input: SiteUserListInput, page: number = input.page): string {
  const params = new URLSearchParams();
  params.set("state", input.state);
  if (input.query !== "") {
    params.set("query", input.query);
  }
  if (page > 1) {
    params.set("pageNum", String(page));
  }
  const query = params.toString();
  return query ? `/sites/userList?${query}` : "/sites/userList";
}

function apiDataUri(runtimeConfig: RuntimeConfig, loginId: string, action: string): string {
  return appHref(
    runtimeConfig,
    `/api/v1/site/users/${encodeURIComponent(loginId)}/${action}/toggle`,
  );
}

function SiteAdminRouteComponent() {
  const { pageName } = Route.useParams();
  const href = useCurrentHref();
  const { bootstrapping, csrfToken, currentSession, runtimeConfig, setErrorMessage } =
    useAppRuntime();

  useDocumentTitle("Site Admin");

  if (pageName !== "userList") {
    return <PlaceholderPage href={`/sites/${pageName}`} title="Site Admin" />;
  }

  return (
    <SiteUserListRoute
      bootstrapping={bootstrapping}
      csrfToken={csrfToken}
      currentIsSiteAdmin={currentSession?.isSiteAdmin ?? false}
      href={href}
      runtimeConfig={runtimeConfig}
      setErrorMessage={setErrorMessage}
    />
  );
}

function SiteUserListRoute({
  bootstrapping,
  csrfToken,
  currentIsSiteAdmin,
  href,
  runtimeConfig,
  setErrorMessage,
}: {
  bootstrapping: boolean;
  csrfToken: string;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  setErrorMessage: (message: string | null) => void;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const input = React.useMemo(() => siteUserListInputFromHref(href), [href]);
  const queryClient = useQueryClient();
  const query = useQuery({
    ...siteUsersQueryOptions(runtimeConfig, input),
    enabled: canRender && currentIsSiteAdmin,
  });
  const mutationError = React.useCallback(
    (fallback: string) => (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : fallback);
    },
    [setErrorMessage],
  );
  const adminMutation = useMutation({
    mutationFn: (loginId: string) => toggleSiteUserAdminRest(runtimeConfig, csrfToken, loginId),
    onError: mutationError("Site admin role update failed."),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
    },
  });
  const lockMutation = useMutation({
    mutationFn: (loginId: string) =>
      toggleSiteUserAccountLockRest(runtimeConfig, csrfToken, loginId),
    onError: mutationError("Account lock update failed."),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
    },
  });
  const failureKind = classifyConnectFailure(query.error);

  React.useEffect(() => {
    if (query.error && !classifyConnectFailure(query.error)) {
      setErrorMessage(query.error instanceof Error ? query.error.message : "Read users failed.");
    }
  }, [query.error, setErrorMessage]);

  if (bootstrapping || !canRender || (currentIsSiteAdmin && query.isLoading)) {
    return (
      <main className="app-shell site-admin-page">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin || failureKind === "forbidden") {
    return <ForbiddenPage href="/sites/userList" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/userList" />;
  }

  return (
    <SiteAdminUserListPage
      input={input}
      pendingAccountLockLoginId={lockMutation.isPending ? lockMutation.variables : ""}
      pendingSiteAdminLoginId={adminMutation.isPending ? adminMutation.variables : ""}
      response={query.data}
      runtimeConfig={runtimeConfig}
      onToggleAccountLock={(loginId) => lockMutation.mutate(loginId)}
      onToggleSiteAdmin={(loginId) => adminMutation.mutate(loginId)}
    />
  );
}

function SiteAdminUserListPage({
  input,
  pendingAccountLockLoginId,
  pendingSiteAdminLoginId,
  response,
  runtimeConfig,
  onToggleAccountLock,
  onToggleSiteAdmin,
}: {
  input: SiteUserListInput;
  pendingAccountLockLoginId: string | undefined;
  pendingSiteAdminLoginId: string | undefined;
  response: SiteUserListResponse | undefined;
  runtimeConfig: RuntimeConfig;
  onToggleAccountLock: (loginId: string) => void;
  onToggleSiteAdmin: (loginId: string) => void;
}) {
  const users = response?.users ?? [];
  const page = response?.page ?? input.page;
  const totalPages = response?.totalPages ?? 0;

  return (
    <main className="app-shell site-admin-page">
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>Site Admin</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid site-setting-layout">
            <div className="span2">
              <ul className="site-setting-nav">
                {SITE_ADMIN_NAV.map((item) => (
                  <li className={item.pageName === "userList" ? "active" : ""} key={item.pageName}>
                    <a href={appHref(runtimeConfig, item.href)}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">User List</h2>
                <form
                  action={appHref(runtimeConfig, "/sites/userList")}
                  className="form-search pull-right"
                  method="get"
                >
                  <input name="state" type="hidden" value={input.state} />
                  <div className="search-bar">
                    <input
                      className="textbox"
                      defaultValue={input.query}
                      name="query"
                      placeholder="Search users"
                      type="text"
                    />
                    <button className="search-btn" type="submit">
                      Search
                    </button>
                  </div>
                </form>
              </div>
              <SiteUserTabs
                input={input}
                runtimeConfig={runtimeConfig}
                siteAdminCount={response?.siteAdminCount ?? 0}
              />
              <SiteUserListHeader state={input.state} />
              {users.length === 0 ? (
                <div className="warning-none">No users found.</div>
              ) : (
                <ul className="user-list-wrap">
                  {users.map((user) => (
                    <SiteUserRow
                      key={user.id}
                      pendingAccountLock={pendingAccountLockLoginId === user.loginId}
                      pendingSiteAdmin={pendingSiteAdminLoginId === user.loginId}
                      runtimeConfig={runtimeConfig}
                      selectedState={input.state}
                      user={user}
                      onToggleAccountLock={onToggleAccountLock}
                      onToggleSiteAdmin={onToggleSiteAdmin}
                    />
                  ))}
                </ul>
              )}
              <SiteUserPagination
                input={input}
                page={page}
                runtimeConfig={runtimeConfig}
                totalPages={totalPages}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SiteUserTabs({
  input,
  runtimeConfig,
  siteAdminCount,
}: {
  input: SiteUserListInput;
  runtimeConfig: RuntimeConfig;
  siteAdminCount: number;
}) {
  return (
    <ul className="nav nav-tabs">
      {SITE_USER_STATES.map((item) => (
        <li className={item.state === input.state ? "active" : ""} key={item.state}>
          <a
            href={appHref(
              runtimeConfig,
              siteUserListHref({ page: 1, query: input.query, state: item.state }, 1),
            )}
          >
            {item.label}
            {item.state === "SITE_ADMIN" ? (
              <span className="num-badge">{siteAdminCount}</span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

function SiteUserListHeader({ state }: { state: SiteUserState }) {
  return (
    <div className="row-fluid listhead">
      <div className="span3 listhead-title">
        <strong>User</strong>
      </div>
      <div className="span3 listhead-title">
        <strong>Email</strong>
      </div>
      <div className="span2 listhead-title">
        <strong>Since</strong>
      </div>
      <div className="span4 listhead-title">
        <strong>{state === "DELETED" ? "Leave" : "\u00a0"}</strong>
      </div>
    </div>
  );
}

function SiteUserRow({
  pendingAccountLock,
  pendingSiteAdmin,
  runtimeConfig,
  selectedState,
  user,
  onToggleAccountLock,
  onToggleSiteAdmin,
}: {
  pendingAccountLock: boolean;
  pendingSiteAdmin: boolean;
  runtimeConfig: RuntimeConfig;
  selectedState: SiteUserState;
  user: SiteUser;
  onToggleAccountLock: (loginId: string) => void;
  onToggleSiteAdmin: (loginId: string) => void;
}) {
  return (
    <li className="row-fluid listitem">
      <div className="span3 listitem-col">
        <a className="avatar-wrap list-avatar" href={appHref(runtimeConfig, `/${user.loginId}`)}>
          <span className="avatar-initial">{user.displayName.slice(0, 1).toUpperCase()}</span>
        </a>
        <a className="user-name" href={appHref(runtimeConfig, `/${user.loginId}`)}>
          {user.displayName}
        </a>
        <a className="user-id" href={appHref(runtimeConfig, `/${user.loginId}`)}>
          @{user.loginId}
        </a>
      </div>
      <div className="span3 listitem-col">
        <span className="email">{user.emailAddress}</span>
      </div>
      <div className="span2 listitem-col created-date">
        <span>{user.createdAt}</span>
      </div>
      {selectedState === "DELETED" ? (
        <div className="span4 listitem-col">{user.createdAt}</div>
      ) : (
        <div className="span5 listitem-col action-buttons">
          <button
            aria-disabled="true"
            className={`ybtn ybtn-small${user.isGuest ? " ybtn-success" : ""}`}
            type="button"
          >
            {user.isGuest ? "Normal User" : "Guest User"}
          </button>
          <button
            className="ybtn ybtn-small"
            data-request-method="post"
            data-request-uri={apiDataUri(runtimeConfig, user.loginId, "account-lock")}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onToggleAccountLock(user.loginId);
            }}
          >
            {pendingAccountLock ? "Saving..." : user.state === "LOCKED" ? "Unlock" : "Lock"}
          </button>
          <button
            className="ybtn ybtn-small"
            data-href={appHref(runtimeConfig, `/${user.loginId}?action=resetPassword`)}
            data-toggle="reset-password"
            id={user.loginId}
            type="button"
          >
            Reset Password
          </button>
          <button
            className={`ybtn ybtn-small ${user.isSiteAdmin ? "ybtn-info" : "label-info"}`}
            data-request-method="post"
            data-request-uri={apiDataUri(runtimeConfig, user.loginId, "site-admin")}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onToggleSiteAdmin(user.loginId);
            }}
          >
            {pendingSiteAdmin
              ? "Saving..."
              : user.isSiteAdmin
                ? "Revoke Site Admin"
                : "Make Site Admin"}
          </button>
          <button
            className="ybtn ybtn-small ybtn-danger"
            data-toggle="account-delete"
            data-user-id={user.loginId}
            data-user-name={user.displayName}
            type="button"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

function SiteUserPagination({
  input,
  page,
  runtimeConfig,
  totalPages,
}: {
  input: SiteUserListInput;
  page: number;
  runtimeConfig: RuntimeConfig;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return <div id="pagination" />;
  }
  return (
    <div id="pagination">
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
        <a
          className={pageNumber === page ? "active" : ""}
          data-page-num={pageNumber}
          href={appHref(runtimeConfig, siteUserListHref(input, pageNumber))}
          key={pageNumber}
        >
          {pageNumber}
        </a>
      ))}
    </div>
  );
}
