import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  DEFAULT_SITE_ISSUES_QUERY,
  DEFAULT_SITE_POSTS_QUERY,
  DEFAULT_SITE_PROJECTS_QUERY,
  DEFAULT_SITE_USERS_QUERY,
  listSiteIssuesQueryOptions,
  listSitePostsQueryOptions,
  listSiteProjectsQueryOptions,
  listSiteUsersQueryOptions,
  normalizeSiteIssuesQuery,
  normalizeSitePostsQuery,
  normalizeSiteProjectsQuery,
  normalizeSiteUsersQuery,
  SITE_ISSUE_STATES,
  SITE_USER_STATES,
  toggleSiteUserAccountLockRest,
  toggleSiteUserGuestModeRest,
  toggleSiteUserRoleRest,
  type SiteIssueListItem,
  type SiteIssuesQueryInput,
  type SiteIssuesResponse,
  type SiteIssueState,
  type SitePostListItem,
  type SitePostsQueryInput,
  type SitePostsResponse,
  type SiteProjectListItem,
  type SiteProjectsQueryInput,
  type SiteProjectsResponse,
  type SiteUserListItem,
  type SiteUsersQueryInput,
  type SiteUsersResponse,
  type SiteUserState,
} from "../../../api/site-admin";
import { useAppRuntime } from "../../../app-runtime-context";
import { apiQueryKeys } from "../../../api/query-keys";
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

const SITE_ISSUE_STATE_LABELS: Record<SiteIssueState, string> = {
  CLOSED: "Closed",
  OPEN: "Open",
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

function readSiteProjectsQuery(): SiteProjectsQueryInput {
  if (typeof window === "undefined") {
    return DEFAULT_SITE_PROJECTS_QUERY;
  }

  const params = new URLSearchParams(window.location.search);
  return normalizeSiteProjectsQuery({
    filter: params.get("filter") ?? "",
    pageNum: Number(params.get("pageNum") || DEFAULT_SITE_PROJECTS_QUERY.pageNum),
    pageSize: Number(params.get("pageSize") || DEFAULT_SITE_PROJECTS_QUERY.pageSize),
  });
}

function readSitePostsQuery(): SitePostsQueryInput {
  if (typeof window === "undefined") {
    return DEFAULT_SITE_POSTS_QUERY;
  }

  const params = new URLSearchParams(window.location.search);
  return normalizeSitePostsQuery({
    pageNum: Number(params.get("pageNum") || DEFAULT_SITE_POSTS_QUERY.pageNum),
    pageSize: Number(params.get("pageSize") || DEFAULT_SITE_POSTS_QUERY.pageSize),
  });
}

function readSiteIssuesQuery(): SiteIssuesQueryInput {
  if (typeof window === "undefined") {
    return DEFAULT_SITE_ISSUES_QUERY;
  }

  const params = new URLSearchParams(window.location.search);
  return normalizeSiteIssuesQuery({
    pageNum: Number(params.get("pageNum") || DEFAULT_SITE_ISSUES_QUERY.pageNum),
    pageSize: Number(params.get("pageSize") || DEFAULT_SITE_ISSUES_QUERY.pageSize),
    state: (params.get("state") ?? DEFAULT_SITE_ISSUES_QUERY.state) as SiteIssueState,
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

function siteProjectsHref(
  runtimeConfig: RuntimeConfig,
  input: Partial<SiteProjectsQueryInput> = {},
): string {
  const query = normalizeSiteProjectsQuery(input);
  const params = new URLSearchParams();
  if (query.filter) {
    params.set("filter", query.filter);
  }
  if (query.pageNum > 1) {
    params.set("pageNum", String(query.pageNum));
  }
  return siteHref(runtimeConfig, `/sites/projectList?${params}`);
}

function sitePostsHref(
  runtimeConfig: RuntimeConfig,
  input: Partial<SitePostsQueryInput> = {},
): string {
  const query = normalizeSitePostsQuery(input);
  const params = new URLSearchParams();
  if (query.pageNum > 1) {
    params.set("pageNum", String(query.pageNum));
  }
  return siteHref(runtimeConfig, `/sites/postList?${params}`);
}

function siteIssuesHref(
  runtimeConfig: RuntimeConfig,
  input: Partial<SiteIssuesQueryInput> = {},
): string {
  const query = normalizeSiteIssuesQuery(input);
  const params = new URLSearchParams();
  params.set("state", query.state.toLowerCase());
  if (query.pageNum > 1) {
    params.set("pageNum", String(query.pageNum));
  }
  return siteHref(runtimeConfig, `/sites/issueList?${params}`);
}

function siteUserActionApiHref(
  runtimeConfig: RuntimeConfig,
  loginId: string,
  action: "toggle-account-lock" | "toggle-guest-mode" | "toggle-site-admin",
): string {
  return prefixBasePath(
    runtimeConfig.basePath,
    `/api/v1/sites/users/${encodeURIComponent(loginId)}/${action}`,
  );
}

function SiteAdminRouteComponent() {
  const { pageName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const queryClient = useQueryClient();
  const routeHref = `/sites/${pageName}`;
  const canRender = useRequireAuthenticatedRoute(routeHref);
  const userQuery = React.useMemo(readSiteUsersQuery, [pageName]);
  const projectQuery = React.useMemo(readSiteProjectsQuery, [pageName]);
  const postQuery = React.useMemo(readSitePostsQuery, [pageName]);
  const issueQuery = React.useMemo(readSiteIssuesQuery, [pageName]);
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);
  const userListQuery = useQuery({
    ...listSiteUsersQueryOptions(runtimeConfig, userQuery),
    enabled: canRender && pageName === "userList",
  });
  const projectListQuery = useQuery({
    ...listSiteProjectsQueryOptions(runtimeConfig, projectQuery),
    enabled: canRender && pageName === "projectList",
  });
  const postListQuery = useQuery({
    ...listSitePostsQueryOptions(runtimeConfig, postQuery),
    enabled: canRender && pageName === "postList",
  });
  const issueListQuery = useQuery({
    ...listSiteIssuesQueryOptions(runtimeConfig, issueQuery),
    enabled: canRender && pageName === "issueList",
  });
  const userActionError = React.useCallback(
    (error: Error, fallback: string) => {
      setErrorMessage(error instanceof Error ? error.message : fallback);
    },
    [setErrorMessage],
  );
  const toggleGuestMutation = useMutation({
    mutationFn: (loginId: string) => toggleSiteUserGuestModeRest(runtimeConfig, csrfToken, loginId),
    onError: (error) => userActionError(error, "Toggle guest mode failed."),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [...apiQueryKeys.v1(), "sites", "users"] }),
  });
  const toggleAccountLockMutation = useMutation({
    mutationFn: (loginId: string) =>
      toggleSiteUserAccountLockRest(runtimeConfig, csrfToken, loginId),
    onError: (error) => userActionError(error, "Toggle account lock failed."),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [...apiQueryKeys.v1(), "sites", "users"] }),
  });
  const toggleSiteAdminMutation = useMutation({
    mutationFn: (loginId: string) => toggleSiteUserRoleRest(runtimeConfig, csrfToken, loginId),
    onError: (error) => userActionError(error, "Toggle site-admin role failed."),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [...apiQueryKeys.v1(), "sites", "users"] }),
  });

  useDocumentTitle(
    pageName === "userList"
      ? "Site Users"
      : pageName === "projectList"
        ? "Site Projects"
        : pageName === "postList"
          ? "Site Posts"
          : pageName === "issueList"
            ? "Site Issues"
            : "Site Admin",
  );

  React.useEffect(() => {
    setFailureKind(null);
  }, [
    pageName,
    issueQuery.pageNum,
    issueQuery.pageSize,
    issueQuery.state,
    postQuery.pageNum,
    postQuery.pageSize,
    projectQuery.filter,
    projectQuery.pageNum,
    projectQuery.pageSize,
    userQuery.pageNum,
    userQuery.pageSize,
    userQuery.query,
    userQuery.state,
  ]);

  React.useEffect(() => {
    const error =
      pageName === "projectList"
        ? projectListQuery.error
        : pageName === "postList"
          ? postListQuery.error
          : pageName === "issueList"
            ? issueListQuery.error
            : userListQuery.error;
    if (!error) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setErrorMessage(
      error instanceof Error
        ? error.message
        : pageName === "projectList"
          ? "Read site projects failed."
          : pageName === "postList"
            ? "Read site posts failed."
            : pageName === "issueList"
              ? "Read site issues failed."
              : "Read site users failed.",
    );
  }, [
    issueListQuery.error,
    pageName,
    postListQuery.error,
    projectListQuery.error,
    setErrorMessage,
    userListQuery.error,
  ]);

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

  if (pageName === "projectList") {
    return (
      <SiteAdminProjectListPage
        isLoading={projectListQuery.isLoading}
        query={projectQuery}
        response={projectListQuery.data}
        runtimeConfig={runtimeConfig}
      />
    );
  }

  if (pageName === "postList") {
    return (
      <SiteAdminPostListPage
        isLoading={postListQuery.isLoading}
        query={postQuery}
        response={postListQuery.data}
        runtimeConfig={runtimeConfig}
      />
    );
  }

  if (pageName === "issueList") {
    return (
      <SiteAdminIssueListPage
        isLoading={issueListQuery.isLoading}
        query={issueQuery}
        response={issueListQuery.data}
        runtimeConfig={runtimeConfig}
      />
    );
  }

  if (pageName !== "userList") {
    return (
      <SiteAdminLayout activePageName={pageName} runtimeConfig={runtimeConfig}>
        <div className="title_area">
          <h2>
            {SITE_ADMIN_MENU.find((item) => item.pageName === pageName)?.label ?? "Site Admin"}
          </h2>
        </div>
        <div className="warning-none">This site-admin surface is still deferred.</div>
      </SiteAdminLayout>
    );
  }

  return (
    <SiteAdminUserListPage
      isLoading={userListQuery.isLoading}
      isMutating={
        toggleGuestMutation.isPending ||
        toggleAccountLockMutation.isPending ||
        toggleSiteAdminMutation.isPending
      }
      onToggleAccountLock={(loginId) => toggleAccountLockMutation.mutate(loginId)}
      onToggleGuestMode={(loginId) => toggleGuestMutation.mutate(loginId)}
      onToggleSiteAdminRole={(loginId) => toggleSiteAdminMutation.mutate(loginId)}
      query={userQuery}
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

function SiteAdminPostListPage(props: {
  isLoading: boolean;
  query: SitePostsQueryInput;
  response: SitePostsResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const response = props.response;
  const items = response?.items ?? [];

  return (
    <SiteAdminLayout activePageName="postList" runtimeConfig={props.runtimeConfig}>
      <div className="title_area">
        <h2 className="pull-left">Posts</h2>
      </div>
      {props.isLoading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <div className="warning-none">No posts found.</div>
      ) : (
        <ul className="post-list-wrap">
          {items.map((item) => (
            <SiteAdminPostRow item={item} key={item.id} runtimeConfig={props.runtimeConfig} />
          ))}
        </ul>
      )}
      <div id="pagination">
        <span>{`Page ${response?.pageNum ?? props.query.pageNum}`}</span>
        <span>{`Total ${response?.total ?? 0}`}</span>
        {response?.hasMore ? (
          <a
            className="ybtn"
            href={sitePostsHref(props.runtimeConfig, {
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

function SiteAdminPostRow(props: { item: SitePostListItem; runtimeConfig: RuntimeConfig }) {
  const projectHref = siteHref(props.runtimeConfig, props.item.projectPath);
  const postHref = siteHref(props.runtimeConfig, props.item.postPath);
  const commentsHref = siteHref(props.runtimeConfig, props.item.commentsPath);
  const authorHref = siteHref(
    props.runtimeConfig,
    `/users/${encodeURIComponent(props.item.authorLoginId)}`,
  );
  return (
    <li className="row-fluid listitem">
      <a className="avatar-wrap list-avatar" href={projectHref}>
        {`${props.item.ownerName}/${props.item.projectName}`}
      </a>
      <div className="post-info-wrap">
        <a className="post-project" href={projectHref}>
          {`${props.item.ownerName}/${props.item.projectName}`}
        </a>
        <span className="post-info-separator">·</span>
        <a className="post-title" href={postHref}>
          {props.item.title}
        </a>
      </div>
      <div className="post-meta-wrap">
        <a className="avatar-wrap" href={authorHref}>
          {props.item.authorAvatarUrl ? (
            <img
              alt={props.item.authorLabel}
              height="16"
              src={props.item.authorAvatarUrl}
              width="16"
            />
          ) : null}
        </a>
        <a className="post-meta-item" href={authorHref}>
          {props.item.authorLabel}
        </a>
        <span className="post-meta-item" title={props.item.createdAt}>
          {props.item.createdLabel}
        </span>
        <span className="post-comments post-meta-item">
          <a href={commentsHref}>{props.item.commentCount}</a>
        </span>
      </div>
    </li>
  );
}

function SiteAdminIssueListPage(props: {
  isLoading: boolean;
  query: SiteIssuesQueryInput;
  response: SiteIssuesResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const response = props.response;
  const items = response?.items ?? [];
  const tabs = response?.tabs ?? SITE_ISSUE_STATES.map((state) => ({ state, total: 0 }));

  return (
    <SiteAdminLayout activePageName="issueList" runtimeConfig={props.runtimeConfig}>
      <div className="title_area">
        <h2 className="pull-left">Issues</h2>
      </div>
      <ul className="nav nav-tabs">
        {tabs.map((tab) => (
          <li className={tab.state === props.query.state ? "active" : ""} key={tab.state}>
            <a
              href={siteIssuesHref(props.runtimeConfig, {
                ...props.query,
                pageNum: 1,
                state: tab.state,
              })}
            >
              {SITE_ISSUE_STATE_LABELS[tab.state]}
            </a>
          </li>
        ))}
      </ul>
      {props.isLoading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <div className="warning-none">No issues found.</div>
      ) : (
        <ul className="post-list-wrap">
          {items.map((item) => (
            <SiteAdminIssueRow item={item} key={item.id} runtimeConfig={props.runtimeConfig} />
          ))}
        </ul>
      )}
      <div id="pagination">
        <span>{`Page ${response?.pageNum ?? props.query.pageNum}`}</span>
        <span>{`Total ${response?.total ?? 0}`}</span>
        {response?.hasMore ? (
          <a
            className="ybtn"
            href={siteIssuesHref(props.runtimeConfig, {
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

function SiteAdminIssueRow(props: { item: SiteIssueListItem; runtimeConfig: RuntimeConfig }) {
  const projectHref = siteHref(props.runtimeConfig, props.item.projectPath);
  const issueHref = siteHref(props.runtimeConfig, props.item.issuePath);
  const commentsHref = siteHref(props.runtimeConfig, props.item.commentsPath);
  const authorHref = siteHref(
    props.runtimeConfig,
    `/users/${encodeURIComponent(props.item.authorLoginId)}`,
  );
  return (
    <li className="row-fluid listitem" data-state={props.item.state.toLowerCase()}>
      <a className="avatar-wrap list-avatar" href={projectHref}>
        {`${props.item.ownerName}/${props.item.projectName}`}
      </a>
      <div className="post-info-wrap">
        <a className="post-project" href={projectHref}>
          {`${props.item.ownerName}/${props.item.projectName}`}
        </a>
        <span className="post-info-separator">·</span>
        <a className="post-title" href={issueHref}>
          {props.item.title}
        </a>
      </div>
      <div className="post-meta-wrap">
        <a className="avatar-wrap" href={authorHref}>
          {props.item.authorAvatarUrl ? (
            <img
              alt={props.item.authorLabel}
              height="16"
              src={props.item.authorAvatarUrl}
              width="16"
            />
          ) : null}
        </a>
        <a className="post-meta-item" href={authorHref}>
          {props.item.authorLabel}
        </a>
        <span className="post-meta-item" title={props.item.createdAt}>
          {props.item.createdLabel}
        </span>
        <span className="post-comments post-meta-item">
          <a href={commentsHref}>{props.item.commentCount}</a>
        </span>
      </div>
    </li>
  );
}

function SiteAdminProjectListPage(props: {
  isLoading: boolean;
  query: SiteProjectsQueryInput;
  response: SiteProjectsResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const response = props.response;
  const items = response?.items ?? [];

  return (
    <SiteAdminLayout activePageName="projectList" runtimeConfig={props.runtimeConfig}>
      <div className="title_area">
        <h2 className="pull-left">Projects</h2>
        <form
          action={siteHref(props.runtimeConfig, "/sites/projectList")}
          className="form-search pull-right"
          method="get"
        >
          <div className="search-bar">
            <input
              className="textbox"
              defaultValue={props.query.filter}
              name="filter"
              placeholder="Search projects"
              type="text"
            />
            <button className="search-btn" type="submit">
              Search
            </button>
          </div>
        </form>
      </div>
      <div className="row-fluid listhead project-list-head">
        <div className="span5 listhead-title">
          <strong>Project name</strong>
        </div>
        <div className="span4 listhead-title">
          <strong>Project description</strong>
        </div>
        <div className="span2 listhead-title">
          <strong>Created</strong>
        </div>
        <div className="span1 listhead-title">
          <strong>&nbsp;</strong>
        </div>
      </div>
      {props.isLoading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <div className="warning-none">No projects found.</div>
      ) : (
        <ul className="project-list-wrap">
          {items.map((item) => (
            <SiteAdminProjectRow item={item} key={item.id} runtimeConfig={props.runtimeConfig} />
          ))}
        </ul>
      )}
      <div id="pagination">
        <span>{`Page ${response?.pageNum ?? props.query.pageNum}`}</span>
        <span>{`Total ${response?.total ?? 0}`}</span>
        {response?.hasMore ? (
          <a
            className="ybtn"
            href={siteProjectsHref(props.runtimeConfig, {
              ...props.query,
              pageNum: props.query.pageNum + 1,
            })}
          >
            Next
          </a>
        ) : null}
      </div>
      <div aria-hidden="true" className="modal fade" id="alertDeletionWrap">
        <div className="modal-header">
          <button className="close" disabled type="button">
            ×
          </button>
          <span id="project-name" />
          Delete project
        </div>
        <div className="modal-body">
          <p>Project delete remains a follow-up parity slice.</p>
        </div>
        <div className="modal-footer">
          <button
            aria-label="Delete project"
            className="ybtn ybtn-danger"
            disabled
            id="projectDeleteBtn"
            type="button"
          >
            Delete project
          </button>
          <button aria-label="Cancel project deletion" className="ybtn" disabled type="button">
            Cancel deletion
          </button>
        </div>
      </div>
    </SiteAdminLayout>
  );
}

function SiteAdminProjectRow(props: { item: SiteProjectListItem; runtimeConfig: RuntimeConfig }) {
  const projectHref = siteHref(props.runtimeConfig, props.item.projectPath);
  const projectLabel = `${props.item.ownerName}/${props.item.projectName}`;
  return (
    <li className="row-fluid listitem">
      <div className="span5 listitem-col">
        <a className="avatar-wrap list-avatar" href={projectHref}>
          {props.item.logoUrl ? (
            <img alt={props.item.projectName} src={props.item.logoUrl} />
          ) : null}
          {projectLabel}
        </a>
        <a className="project-name" href={projectHref}>
          {projectLabel}
        </a>
      </div>
      <div className="span4 listitem-col">
        <span className="project-overview">{props.item.overview}</span>
      </div>
      <div className="span2 listitem-col created-date">
        <span title={props.item.createdAt}>{props.item.createdLabel}</span>
      </div>
      <div className="span1 listitem-col">
        <button
          className="ybtn ybtn-danger"
          data-href={siteHref(props.runtimeConfig, props.item.deletePath)}
          data-project-name={projectLabel}
          data-toggle="delete-project"
          disabled
          type="button"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function SiteAdminUserListPage(props: {
  isLoading: boolean;
  isMutating: boolean;
  onToggleAccountLock: (loginId: string) => void;
  onToggleGuestMode: (loginId: string) => void;
  onToggleSiteAdminRole: (loginId: string) => void;
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
              isMutating={props.isMutating}
              item={item}
              key={item.id}
              onToggleAccountLock={props.onToggleAccountLock}
              onToggleGuestMode={props.onToggleGuestMode}
              onToggleSiteAdminRole={props.onToggleSiteAdminRole}
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
  isMutating: boolean;
  item: SiteUserListItem;
  onToggleAccountLock: (loginId: string) => void;
  onToggleGuestMode: (loginId: string) => void;
  onToggleSiteAdminRole: (loginId: string) => void;
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
            data-request-method="post"
            data-request-uri={siteUserActionApiHref(
              props.runtimeConfig,
              props.item.loginId,
              "toggle-guest-mode",
            )}
            disabled={props.isMutating}
            onClick={() => props.onToggleGuestMode(props.item.loginId)}
            type="button"
          >
            {props.item.isGuest ? "Make normal user" : "Make guest"}
          </button>
          <button
            className="ybtn ybtn-small"
            data-request-method="post"
            data-request-uri={siteUserActionApiHref(
              props.runtimeConfig,
              props.item.loginId,
              "toggle-account-lock",
            )}
            disabled={props.isMutating}
            onClick={() => props.onToggleAccountLock(props.item.loginId)}
            type="button"
          >
            {props.item.state === "locked" ? "Unlock account" : "Lock account"}
          </button>
          <button className="ybtn ybtn-small" disabled type="button">
            Reset password
          </button>
          <button
            className={`ybtn ybtn-small ${props.item.isSiteAdmin ? "ybtn-info" : "label-info"}`}
            data-request-method="post"
            data-request-uri={siteUserActionApiHref(
              props.runtimeConfig,
              props.item.loginId,
              "toggle-site-admin",
            )}
            disabled={props.isMutating}
            onClick={() => props.onToggleSiteAdminRole(props.item.loginId)}
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
