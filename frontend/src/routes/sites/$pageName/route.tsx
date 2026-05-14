import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  DEFAULT_SITE_USERS_QUERY,
  listSiteUsersQueryOptions,
  normalizeSiteUsersQuery,
  SITE_USER_STATES,
  type SiteUserListItem,
  type SiteUsersQueryInput,
  type SiteUsersResponse,
  type SiteUserState,
} from "../../../api/site-admin";
import { useAppRuntime } from "../../../app-runtime-context";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
  useRequireAuthenticatedRoute,
} from "../../-shared";

const SITE_ADMIN_MENU = [
  { href: "/sites/userList", label: "Users", pageName: "userList" },
  { href: "/sites/postList", label: "Posts", pageName: "postList" },
  { href: "/sites/issueList", label: "Issues", pageName: "issueList" },
  { href: "/sites/projectList", label: "Projects", pageName: "projectList" },
  { href: "/sites/mail", label: "Send Mail", pageName: "mail" },
  { href: "/sites/massmail", label: "Mass Mail", pageName: "massmail" },
  { href: "/sites/update", label: "Update", pageName: "update" },
  { href: "/sites/diagnostic", label: "Diagnostics", pageName: "diagnostic" },
];

const SITE_USER_STATE_LABELS: Record<SiteUserState, string> = {
  ACTIVE: "Unlocked",
  DELETED: "Deleted",
  GUEST: "Guest",
  LOCKED: "Locked",
  SITE_ADMIN: "Site Admin",
};

export const Route = createFileRoute("/sites/$pageName")({
  component: SiteAdminRouteComponent,
});

function readSiteUsersQuery(): SiteUsersQueryInput {
  if (typeof window === "undefined") {
    return DEFAULT_SITE_USERS_QUERY;
  }

  const params = new URLSearchParams(window.location.search);
  return normalizeSiteUsersQuery({
    pageNum: Number(params.get("pageNum") || DEFAULT_SITE_USERS_QUERY.pageNum),
    pageSize: Number(params.get("pageSize") || DEFAULT_SITE_USERS_QUERY.pageSize),
    query: params.get("query") ?? "",
    state: (params.get("state") ?? DEFAULT_SITE_USERS_QUERY.state) as SiteUserState,
  });
}

function siteHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

function siteUsersHref(
  runtimeConfig: RuntimeConfig,
  input: Partial<SiteUsersQueryInput> = {},
): string {
  const query = normalizeSiteUsersQuery(input);
  const params = new URLSearchParams();
  params.set("state", query.state);
  if (query.query) {
    params.set("query", query.query);
  }
  if (query.pageNum > 1) {
    params.set("pageNum", String(query.pageNum));
  }
  return siteHref(runtimeConfig, `/sites/userList?${params}`);
}

function SiteAdminRouteComponent() {
  const { pageName } = Route.useParams();
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/sites/${pageName}`;
  const canRender = useRequireAuthenticatedRoute(routeHref);
  const query = React.useMemo(readSiteUsersQuery, [pageName]);
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);
  const userListQuery = useQuery({
    ...listSiteUsersQueryOptions(runtimeConfig, query),
    enabled: canRender && pageName === "userList",
  });

  useDocumentTitle(pageName === "userList" ? "Site Users" : "Site Admin");

  React.useEffect(() => {
    setFailureKind(null);
  }, [pageName, query.pageNum, query.pageSize, query.query, query.state]);

  React.useEffect(() => {
    if (!userListQuery.error) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(userListQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setErrorMessage(
      userListQuery.error instanceof Error
        ? userListQuery.error.message
        : "Read site users failed.",
    );
  }, [setErrorMessage, userListQuery.error]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }

  if (pageName !== "userList") {
    return (
      <SiteAdminLayout activePageName={pageName} runtimeConfig={runtimeConfig}>
        <div className="title_area">
          <h2>
            {SITE_ADMIN_MENU.find((item) => item.pageName === pageName)?.label ?? "Site Admin"}
          </h2>
        </div>
        <div className="warning-none">This site-admin page remains a follow-up parity slice.</div>
      </SiteAdminLayout>
    );
  }

  return (
    <SiteAdminUserListPage
      isLoading={userListQuery.isLoading}
      query={query}
      response={userListQuery.data}
      runtimeConfig={runtimeConfig}
    />
  );
}

function SiteAdminLayout(props: {
  activePageName: string;
  children: React.ReactNode;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <main className="site-admin-page">
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>Site Settings</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <ul className="site-setting-nav">
                {SITE_ADMIN_MENU.map((item) => (
                  <li
                    className={item.pageName === props.activePageName ? "active" : ""}
                    key={item.href}
                  >
                    <a href={siteHref(props.runtimeConfig, item.href)}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="span10">{props.children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SiteAdminUserListPage(props: {
  isLoading: boolean;
  query: SiteUsersQueryInput;
  response: SiteUsersResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const response = props.response;
  const items = response?.items ?? [];
  const tabs = response?.tabs ?? SITE_USER_STATES.map((state) => ({ state, total: 0 }));

  return (
    <SiteAdminLayout activePageName="userList" runtimeConfig={props.runtimeConfig}>
      <div className="title_area">
        <h2 className="pull-left">Users</h2>
        <form
          action={siteHref(props.runtimeConfig, "/sites/userList")}
          className="form-search pull-right"
          method="get"
        >
          <input name="state" type="hidden" value={props.query.state} />
          <div className="search-bar">
            <input
              className="textbox"
              defaultValue={props.query.query}
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
      <ul className="nav nav-tabs">
        {tabs.map((tab) => (
          <li className={tab.state === props.query.state ? "active" : ""} key={tab.state}>
            <a
              href={siteUsersHref(props.runtimeConfig, {
                ...props.query,
                pageNum: 1,
                state: tab.state,
              })}
            >
              {SITE_USER_STATE_LABELS[tab.state]}
              {tab.state === "SITE_ADMIN" ? <span className="num-badge">{tab.total}</span> : null}
            </a>
          </li>
        ))}
      </ul>
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
          <strong>{props.query.state === "DELETED" ? "Leave" : "\u00a0"}</strong>
        </div>
      </div>
      {props.isLoading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <div className="warning-none">No users found.</div>
      ) : (
        <ul className="user-list-wrap">
          {items.map((item) => (
            <SiteAdminUserRow
              item={item}
              key={item.id}
              query={props.query}
              runtimeConfig={props.runtimeConfig}
            />
          ))}
        </ul>
      )}
      <div id="pagination">
        <span>{`Page ${response?.pageNum ?? props.query.pageNum}`}</span>
        <span>{`Total ${response?.total ?? 0}`}</span>
        {response?.hasMore ? (
          <a
            className="ybtn"
            href={siteUsersHref(props.runtimeConfig, {
              ...props.query,
              pageNum: props.query.pageNum + 1,
            })}
          >
            Next
          </a>
        ) : null}
      </div>
    </SiteAdminLayout>
  );
}

function SiteAdminUserRow(props: {
  item: SiteUserListItem;
  query: SiteUsersQueryInput;
  runtimeConfig: RuntimeConfig;
}) {
  const profileHref = siteHref(
    props.runtimeConfig,
    `/users/${encodeURIComponent(props.item.loginId)}`,
  );
  return (
    <li className="row-fluid listitem">
      <div className="span3 listitem-col">
        <a className="avatar-wrap list-avatar" href={profileHref}>
          {props.item.avatarUrl ? (
            <img
              alt={`${props.item.displayName} avatar`}
              height="32"
              src={props.item.avatarUrl}
              width="32"
            />
          ) : null}
        </a>
        <a className="user-name" href={profileHref}>
          {props.item.displayName || props.item.loginId}
        </a>
        <a className="user-id" href={profileHref}>{`@${props.item.loginId}`}</a>
      </div>
      <div className="span3 listitem-col">
        <span className="email">{props.item.emailAddress}</span>
      </div>
      <div className="span2 listitem-col created-date">
        <span title={props.item.createdAt}>{props.item.createdLabel}</span>
      </div>
      {props.query.state === "DELETED" ? (
        <div className="span4 listitem-col">
          {props.item.lastStateModifiedLabel || props.item.lastStateModifiedAt}
        </div>
      ) : (
        <div className="span5 listitem-col action-buttons">
          <button
            className={`ybtn ybtn-small ${props.item.isGuest ? "ybtn-success" : ""}`}
            disabled
            type="button"
          >
            {props.item.isGuest ? "Make normal user" : "Make guest"}
          </button>
          <button className="ybtn ybtn-small" disabled type="button">
            {props.item.state === "locked" ? "Unlock account" : "Lock account"}
          </button>
          <button className="ybtn ybtn-small" disabled type="button">
            Reset password
          </button>
          <button
            className={`ybtn ybtn-small ${props.item.isSiteAdmin ? "ybtn-info" : "label-info"}`}
            disabled
            type="button"
          >
            {props.item.isSiteAdmin ? "Revoke site admin" : "Make site admin"}
          </button>
          <button className="ybtn ybtn-small ybtn-danger" disabled type="button">
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
