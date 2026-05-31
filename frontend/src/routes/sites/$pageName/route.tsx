import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { apiQueryKeys } from "../../../api/query-keys";
import {
  deleteSiteProjectRest,
  deleteSiteUserRest,
  readSiteMailListRest,
  siteDiagnosticsQueryOptions,
  siteIssuesQueryOptions,
  siteMailOptionsQueryOptions,
  sitePostsQueryOptions,
  siteProjectsQueryOptions,
  resetSiteUserPasswordRest,
  sendSiteMailRest,
  siteUpdateQueryOptions,
  siteUsersQueryOptions,
  type SiteDiagnosticsResponse,
  type SiteIssue,
  type SiteIssueListInput,
  type SiteIssueListResponse,
  type SiteIssueState,
  type SiteMailListInput,
  type SiteMailOptionsResponse,
  type SiteMailSendInput,
  type SitePost,
  type SitePostListInput,
  type SitePostListResponse,
  toggleSiteUserAccountLockRest,
  toggleSiteUserAdminRest,
  toggleSiteUserGuestRest,
  type SiteProject,
  type SiteProjectListInput,
  type SiteProjectListResponse,
  type SiteUpdateResponse,
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

const SITE_ISSUE_STATES: Array<{ label: string; state: SiteIssueState }> = [
  { label: "Open", state: "open" },
  { label: "Closed", state: "closed" },
];

const SITE_ADMIN_NAV = [
  { href: "/sites/userList", label: "User List", pageName: "userList" },
  { href: "/sites/postList", label: "Post List", pageName: "postList" },
  { href: "/sites/issueList", label: "Issue List", pageName: "issueList" },
  { href: "/sites/projectList", label: "Project List", pageName: "projectList" },
  { href: "/sites/mail", label: "Mail Send", pageName: "mail" },
  { href: "/sites/massmail", label: "Mass Mail", pageName: "massmail" },
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

function normalizeSiteIssueState(value: string | null): SiteIssueState {
  const normalized = (value ?? "open").trim().toLowerCase();
  return SITE_ISSUE_STATES.some((state) => state.state === normalized)
    ? (normalized as SiteIssueState)
    : "open";
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

function siteProjectListInputFromHref(href: string): SiteProjectListInput {
  const params = new URL(href, "http://yona.local").searchParams;
  return {
    filter: (params.get("filter") ?? "").trim(),
    page: parsePositiveInt(params.get("pageNum") ?? params.get("page"), 1),
  };
}

function siteProjectListHref(input: SiteProjectListInput, page: number = input.page): string {
  const params = new URLSearchParams();
  if (input.filter !== "") {
    params.set("filter", input.filter);
  }
  if (page > 1) {
    params.set("pageNum", String(page));
  }
  const query = params.toString();
  return query ? `/sites/projectList?${query}` : "/sites/projectList";
}

function sitePostListInputFromHref(href: string): SitePostListInput {
  const params = new URL(href, "http://yona.local").searchParams;
  return {
    page: parsePositiveInt(params.get("pageNum") ?? params.get("page"), 1),
  };
}

function sitePostListHref(input: SitePostListInput, page: number = input.page): string {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("pageNum", String(page));
  }
  const query = params.toString();
  return query ? `/sites/postList?${query}` : "/sites/postList";
}

function siteIssueListInputFromHref(href: string): SiteIssueListInput {
  const params = new URL(href, "http://yona.local").searchParams;
  return {
    page: parsePositiveInt(params.get("pageNum") ?? params.get("page"), 1),
    state: normalizeSiteIssueState(params.get("state")),
  };
}

function siteIssueListHref(input: SiteIssueListInput, page: number = input.page): string {
  const params = new URLSearchParams();
  params.set("state", input.state);
  if (page > 1) {
    params.set("pageNum", String(page));
  }
  return `/sites/issueList?${params.toString()}`;
}

function apiToggleUri(runtimeConfig: RuntimeConfig, loginId: string, action: string): string {
  return appHref(
    runtimeConfig,
    `/api/v1/site/users/${encodeURIComponent(loginId)}/${action}/toggle`,
  );
}

function apiPasswordResetUri(runtimeConfig: RuntimeConfig, loginId: string): string {
  return appHref(runtimeConfig, `/api/v1/site/users/${encodeURIComponent(loginId)}/password/reset`);
}

function apiDeleteSiteUserUri(runtimeConfig: RuntimeConfig, loginId: string): string {
  return appHref(runtimeConfig, `/api/v1/site/users/${encodeURIComponent(loginId)}`);
}

function apiDeleteSiteProjectUri(runtimeConfig: RuntimeConfig, projectId: number): string {
  return appHref(runtimeConfig, `/api/v1/site/projects/${projectId}`);
}

function apiSiteMailUri(runtimeConfig: RuntimeConfig): string {
  return appHref(runtimeConfig, "/api/v1/site/mail/test");
}

function apiSiteMailListUri(runtimeConfig: RuntimeConfig): string {
  return appHref(runtimeConfig, "/api/v1/site/mail-list");
}

function SiteAdminRouteComponent() {
  const { pageName } = Route.useParams();
  const href = useCurrentHref();
  const { bootstrapping, csrfToken, currentSession, runtimeConfig, setErrorMessage } =
    useAppRuntime();

  useDocumentTitle("Site Admin");

  const currentIsSiteAdmin = currentSession?.isSiteAdmin ?? false;

  if (pageName === "userList") {
    return (
      <SiteUserListRoute
        bootstrapping={bootstrapping}
        csrfToken={csrfToken}
        currentIsSiteAdmin={currentIsSiteAdmin}
        href={href}
        runtimeConfig={runtimeConfig}
        setErrorMessage={setErrorMessage}
      />
    );
  }

  if (pageName === "projectList") {
    return (
      <SiteProjectListRoute
        bootstrapping={bootstrapping}
        csrfToken={csrfToken}
        currentIsSiteAdmin={currentIsSiteAdmin}
        href={href}
        runtimeConfig={runtimeConfig}
        setErrorMessage={setErrorMessage}
      />
    );
  }

  if (pageName === "postList") {
    return (
      <SitePostListRoute
        bootstrapping={bootstrapping}
        currentIsSiteAdmin={currentIsSiteAdmin}
        href={href}
        runtimeConfig={runtimeConfig}
        setErrorMessage={setErrorMessage}
      />
    );
  }

  if (pageName === "issueList") {
    return (
      <SiteIssueListRoute
        bootstrapping={bootstrapping}
        currentIsSiteAdmin={currentIsSiteAdmin}
        href={href}
        runtimeConfig={runtimeConfig}
        setErrorMessage={setErrorMessage}
      />
    );
  }

  if (pageName === "mail") {
    return (
      <SiteMailRoute
        bootstrapping={bootstrapping}
        csrfToken={csrfToken}
        currentIsSiteAdmin={currentIsSiteAdmin}
        href={href}
        runtimeConfig={runtimeConfig}
        setErrorMessage={setErrorMessage}
      />
    );
  }

  if (pageName === "massmail" || pageName === "massMail") {
    return (
      <SiteMassMailRoute
        bootstrapping={bootstrapping}
        csrfToken={csrfToken}
        currentIsSiteAdmin={currentIsSiteAdmin}
        href={href}
        runtimeConfig={runtimeConfig}
        setErrorMessage={setErrorMessage}
      />
    );
  }

  if (pageName === "data") {
    return (
      <SiteDataRoute
        bootstrapping={bootstrapping}
        csrfToken={csrfToken}
        currentIsSiteAdmin={currentIsSiteAdmin}
        href={href}
        runtimeConfig={runtimeConfig}
      />
    );
  }

  if (pageName === "update") {
    return (
      <SiteUpdateRoute
        bootstrapping={bootstrapping}
        currentIsSiteAdmin={currentIsSiteAdmin}
        href={href}
        runtimeConfig={runtimeConfig}
      />
    );
  }

  if (pageName === "diagnostic") {
    return (
      <SiteDiagnosticRoute
        bootstrapping={bootstrapping}
        currentIsSiteAdmin={currentIsSiteAdmin}
        href={href}
        runtimeConfig={runtimeConfig}
        setErrorMessage={setErrorMessage}
      />
    );
  }

  return <NotFoundPage href={`/sites/${pageName}`} />;
}

function SiteDataRoute({
  bootstrapping,
  csrfToken,
  currentIsSiteAdmin,
  href,
  runtimeConfig,
}: {
  bootstrapping: boolean;
  csrfToken: string;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
}) {
  const canRender = useRequireAuthenticatedRoute(href);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell site-admin-page">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin) {
    return <ForbiddenPage href="/sites/data" />;
  }

  return <SiteAdminDataPage csrfToken={csrfToken} runtimeConfig={runtimeConfig} />;
}

function SiteUpdateRoute({
  bootstrapping,
  currentIsSiteAdmin,
  href,
  runtimeConfig,
}: {
  bootstrapping: boolean;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const query = useQuery({
    ...siteUpdateQueryOptions(runtimeConfig),
    enabled: canRender && currentIsSiteAdmin,
  });

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell site-admin-page">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin) {
    return <ForbiddenPage href="/sites/update" />;
  }

  return (
    <SiteAdminUpdatePage
      error={query.error instanceof Error ? query.error.message : null}
      response={query.data}
      runtimeConfig={runtimeConfig}
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
  const [deleteTarget, setDeleteTarget] = React.useState<SiteUser | null>(null);
  const [resetPasswords, setResetPasswords] = React.useState<Record<string, string>>({});
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
  const guestMutation = useMutation({
    mutationFn: (loginId: string) => toggleSiteUserGuestRest(runtimeConfig, csrfToken, loginId),
    onError: mutationError("Guest mode update failed."),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (loginId: string) => deleteSiteUserRest(runtimeConfig, csrfToken, loginId),
    onError: mutationError("User delete failed."),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
    },
  });
  const resetPasswordMutation = useMutation({
    mutationFn: (loginId: string) => resetSiteUserPasswordRest(runtimeConfig, csrfToken, loginId),
    onError: mutationError("Password reset failed."),
    onSuccess: async (response) => {
      setResetPasswords((current) => ({
        ...current,
        [response.loginId]: response.newPassword,
      }));
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
      deleteTarget={deleteTarget}
      input={input}
      pendingAccountLockLoginId={lockMutation.isPending ? lockMutation.variables : ""}
      pendingDeleteLoginId={deleteMutation.isPending ? deleteMutation.variables : ""}
      pendingGuestLoginId={guestMutation.isPending ? guestMutation.variables : ""}
      pendingResetPasswordLoginId={
        resetPasswordMutation.isPending ? resetPasswordMutation.variables : ""
      }
      pendingSiteAdminLoginId={adminMutation.isPending ? adminMutation.variables : ""}
      response={query.data}
      resetPasswords={resetPasswords}
      runtimeConfig={runtimeConfig}
      onCancelDelete={() => setDeleteTarget(null)}
      onConfirmDelete={(loginId) => deleteMutation.mutate(loginId)}
      onRequestDelete={setDeleteTarget}
      onToggleAccountLock={(loginId) => lockMutation.mutate(loginId)}
      onToggleGuest={(loginId) => guestMutation.mutate(loginId)}
      onResetPassword={(loginId) => resetPasswordMutation.mutate(loginId)}
      onToggleSiteAdmin={(loginId) => adminMutation.mutate(loginId)}
    />
  );
}

function SiteProjectListRoute({
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
  const input = React.useMemo(() => siteProjectListInputFromHref(href), [href]);
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = React.useState<SiteProject | null>(null);
  const query = useQuery({
    ...siteProjectsQueryOptions(runtimeConfig, input),
    enabled: canRender && currentIsSiteAdmin,
  });
  const deleteMutation = useMutation({
    mutationFn: (projectId: number) => deleteSiteProjectRest(runtimeConfig, csrfToken, projectId),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Project delete failed.");
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.projectsBase() });
    },
  });
  const failureKind = classifyConnectFailure(query.error);

  React.useEffect(() => {
    if (query.error && !classifyConnectFailure(query.error)) {
      setErrorMessage(query.error instanceof Error ? query.error.message : "Read projects failed.");
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
    return <ForbiddenPage href="/sites/projectList" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/projectList" />;
  }

  return (
    <SiteAdminProjectListPage
      deleteTarget={deleteTarget}
      input={input}
      pendingDeleteProjectId={deleteMutation.isPending ? deleteMutation.variables : undefined}
      response={query.data}
      runtimeConfig={runtimeConfig}
      onCancelDelete={() => setDeleteTarget(null)}
      onConfirmDelete={(projectId) => deleteMutation.mutate(projectId)}
      onRequestDelete={setDeleteTarget}
    />
  );
}

function SitePostListRoute({
  bootstrapping,
  currentIsSiteAdmin,
  href,
  runtimeConfig,
  setErrorMessage,
}: {
  bootstrapping: boolean;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  setErrorMessage: (message: string | null) => void;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const input = React.useMemo(() => sitePostListInputFromHref(href), [href]);
  const query = useQuery({
    ...sitePostsQueryOptions(runtimeConfig, input),
    enabled: canRender && currentIsSiteAdmin,
  });
  const failureKind = classifyConnectFailure(query.error);

  React.useEffect(() => {
    if (query.error && !classifyConnectFailure(query.error)) {
      setErrorMessage(query.error instanceof Error ? query.error.message : "Read posts failed.");
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
    return <ForbiddenPage href="/sites/postList" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/postList" />;
  }

  return (
    <SiteAdminPostListPage input={input} response={query.data} runtimeConfig={runtimeConfig} />
  );
}

function SiteIssueListRoute({
  bootstrapping,
  currentIsSiteAdmin,
  href,
  runtimeConfig,
  setErrorMessage,
}: {
  bootstrapping: boolean;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  setErrorMessage: (message: string | null) => void;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const input = React.useMemo(() => siteIssueListInputFromHref(href), [href]);
  const query = useQuery({
    ...siteIssuesQueryOptions(runtimeConfig, input),
    enabled: canRender && currentIsSiteAdmin,
  });
  const failureKind = classifyConnectFailure(query.error);

  React.useEffect(() => {
    if (query.error && !classifyConnectFailure(query.error)) {
      setErrorMessage(query.error instanceof Error ? query.error.message : "Read issues failed.");
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
    return <ForbiddenPage href="/sites/issueList" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/issueList" />;
  }

  return (
    <SiteAdminIssueListPage input={input} response={query.data} runtimeConfig={runtimeConfig} />
  );
}

function SiteMailRoute({
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
  const queryClient = useQueryClient();
  const [sent, setSent] = React.useState(false);
  const query = useQuery({
    ...siteMailOptionsQueryOptions(runtimeConfig),
    enabled: canRender && currentIsSiteAdmin,
  });
  const sendMutation = useMutation({
    mutationFn: (input: SiteMailSendInput) => sendSiteMailRest(runtimeConfig, csrfToken, input),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Mail send failed.");
    },
    onSuccess: (response) => {
      setSent(response.sent);
      queryClient.setQueryData(apiQueryKeys.siteAdmin.mail(), response);
    },
  });
  const failureKind = classifyConnectFailure(query.error);

  React.useEffect(() => {
    if (query.error && !classifyConnectFailure(query.error)) {
      setErrorMessage(query.error instanceof Error ? query.error.message : "Read mail failed.");
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
    return <ForbiddenPage href="/sites/mail" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/mail" />;
  }

  return (
    <SiteAdminMailPage
      pending={sendMutation.isPending}
      response={query.data}
      runtimeConfig={runtimeConfig}
      sent={sent || sendMutation.data?.sent === true}
      onSend={(input) => sendMutation.mutate(input)}
    />
  );
}

function SiteMassMailRoute({
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
  const queryClient = useQueryClient();
  const [mailtoHref, setMailtoHref] = React.useState("");
  const mailListMutation = useMutation({
    mutationFn: (input: SiteMailListInput) => readSiteMailListRest(runtimeConfig, csrfToken, input),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Mail recipient lookup failed.");
    },
    onSuccess: async (response) => {
      setMailtoHref(`mailto:${response.recipients.join(",")}`);
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.mail() });
    },
  });

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell site-admin-page">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin) {
    return <ForbiddenPage href="/sites/massmail" />;
  }

  return (
    <SiteAdminMassMailPage
      mailtoHref={mailtoHref}
      pending={mailListMutation.isPending}
      runtimeConfig={runtimeConfig}
      onResolveRecipients={(input) => mailListMutation.mutate(input)}
    />
  );
}

function SiteDiagnosticRoute({
  bootstrapping,
  currentIsSiteAdmin,
  href,
  runtimeConfig,
  setErrorMessage,
}: {
  bootstrapping: boolean;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  setErrorMessage: (message: string | null) => void;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const query = useQuery({
    ...siteDiagnosticsQueryOptions(runtimeConfig),
    enabled: canRender && currentIsSiteAdmin,
  });
  const failureKind = classifyConnectFailure(query.error);

  React.useEffect(() => {
    if (query.error && !classifyConnectFailure(query.error)) {
      setErrorMessage(
        query.error instanceof Error ? query.error.message : "Read diagnostics failed.",
      );
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
    return <ForbiddenPage href="/sites/diagnostic" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/diagnostic" />;
  }

  return <SiteAdminDiagnosticPage response={query.data} runtimeConfig={runtimeConfig} />;
}

function SiteAdminSidebar({
  activePageName,
  runtimeConfig,
}: {
  activePageName: string;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <ul className="site-setting-nav">
      {SITE_ADMIN_NAV.map((item) => (
        <li className={item.pageName === activePageName ? "active" : ""} key={item.pageName}>
          <a href={appHref(runtimeConfig, item.href)}>{item.label}</a>
        </li>
      ))}
    </ul>
  );
}

function SiteAdminUserListPage({
  deleteTarget,
  input,
  pendingAccountLockLoginId,
  pendingDeleteLoginId,
  pendingGuestLoginId,
  pendingResetPasswordLoginId,
  pendingSiteAdminLoginId,
  response,
  resetPasswords,
  runtimeConfig,
  onCancelDelete,
  onConfirmDelete,
  onRequestDelete,
  onResetPassword,
  onToggleAccountLock,
  onToggleGuest,
  onToggleSiteAdmin,
}: {
  deleteTarget: SiteUser | null;
  input: SiteUserListInput;
  pendingAccountLockLoginId: string | undefined;
  pendingDeleteLoginId: string | undefined;
  pendingGuestLoginId: string | undefined;
  pendingResetPasswordLoginId: string | undefined;
  pendingSiteAdminLoginId: string | undefined;
  response: SiteUserListResponse | undefined;
  resetPasswords: Record<string, string>;
  runtimeConfig: RuntimeConfig;
  onCancelDelete: () => void;
  onConfirmDelete: (loginId: string) => void;
  onRequestDelete: (user: SiteUser) => void;
  onResetPassword: (loginId: string) => void;
  onToggleAccountLock: (loginId: string) => void;
  onToggleGuest: (loginId: string) => void;
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
              <SiteAdminSidebar activePageName="userList" runtimeConfig={runtimeConfig} />
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
                      pendingDelete={pendingDeleteLoginId === user.loginId}
                      pendingGuest={pendingGuestLoginId === user.loginId}
                      pendingResetPassword={pendingResetPasswordLoginId === user.loginId}
                      pendingSiteAdmin={pendingSiteAdminLoginId === user.loginId}
                      resetPassword={resetPasswords[user.loginId] ?? ""}
                      runtimeConfig={runtimeConfig}
                      selectedState={input.state}
                      user={user}
                      onRequestDelete={onRequestDelete}
                      onResetPassword={onResetPassword}
                      onToggleAccountLock={onToggleAccountLock}
                      onToggleGuest={onToggleGuest}
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
      <SiteDeleteUserModal
        pending={deleteTarget !== null && pendingDeleteLoginId === deleteTarget.loginId}
        runtimeConfig={runtimeConfig}
        user={deleteTarget}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </main>
  );
}

function SiteAdminProjectListPage({
  deleteTarget,
  input,
  pendingDeleteProjectId,
  response,
  runtimeConfig,
  onCancelDelete,
  onConfirmDelete,
  onRequestDelete,
}: {
  deleteTarget: SiteProject | null;
  input: SiteProjectListInput;
  pendingDeleteProjectId: number | undefined;
  response: SiteProjectListResponse | undefined;
  runtimeConfig: RuntimeConfig;
  onCancelDelete: () => void;
  onConfirmDelete: (projectId: number) => void;
  onRequestDelete: (project: SiteProject) => void;
}) {
  const projects = response?.projects ?? [];
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
              <SiteAdminSidebar activePageName="projectList" runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">Project List</h2>
                <form
                  action={appHref(runtimeConfig, "/sites/projectList")}
                  className="form-search pull-right"
                  method="get"
                >
                  <div className="search-bar">
                    <input
                      className="textbox"
                      defaultValue={input.filter}
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
              <SiteProjectListHeader />
              {projects.length === 0 ? (
                <div className="warning-none">No projects found.</div>
              ) : (
                <ul className="project-list-wrap">
                  {projects.map((project) => (
                    <SiteProjectRow
                      key={project.id}
                      pendingDelete={pendingDeleteProjectId === project.id}
                      project={project}
                      runtimeConfig={runtimeConfig}
                      onRequestDelete={onRequestDelete}
                    />
                  ))}
                </ul>
              )}
              <SiteProjectPagination
                input={input}
                page={page}
                runtimeConfig={runtimeConfig}
                totalPages={totalPages}
              />
            </div>
          </div>
        </div>
      </div>
      <SiteDeleteProjectModal
        pending={deleteTarget !== null && pendingDeleteProjectId === deleteTarget.id}
        project={deleteTarget}
        runtimeConfig={runtimeConfig}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </main>
  );
}

function SiteAdminPostListPage({
  input,
  response,
  runtimeConfig,
}: {
  input: SitePostListInput;
  response: SitePostListResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const posts = response?.posts ?? [];
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
              <SiteAdminSidebar activePageName="postList" runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">Post List</h2>
              </div>
              {posts.length === 0 ? (
                <div className="warning-none">No posts found.</div>
              ) : (
                <ul className="post-list-wrap">
                  {posts.map((post) => (
                    <SitePostRow
                      key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                      post={post}
                      runtimeConfig={runtimeConfig}
                    />
                  ))}
                </ul>
              )}
              <SitePostPagination
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

function SiteAdminIssueListPage({
  input,
  response,
  runtimeConfig,
}: {
  input: SiteIssueListInput;
  response: SiteIssueListResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const issues = response?.issues ?? [];
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
              <SiteAdminSidebar activePageName="issueList" runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">Issue List</h2>
              </div>
              <SiteIssueTabs input={input} runtimeConfig={runtimeConfig} />
              {issues.length === 0 ? (
                <div className="warning-none">No issues found.</div>
              ) : (
                <ul className="post-list-wrap">
                  {issues.map((issue) => (
                    <SiteIssueRow
                      issue={issue}
                      key={`${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`}
                      runtimeConfig={runtimeConfig}
                    />
                  ))}
                </ul>
              )}
              <SiteIssuePagination
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

function SiteAdminMailPage({
  pending,
  response,
  runtimeConfig,
  sent,
  onSend,
}: {
  pending: boolean;
  response: SiteMailOptionsResponse | undefined;
  runtimeConfig: RuntimeConfig;
  sent: boolean;
  onSend: (input: SiteMailSendInput) => void;
}) {
  const notConfiguredItems = response?.notConfiguredItems ?? [];
  const sender = response?.sender ?? "";
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSend({
      body: String(formData.get("body") ?? ""),
      from: String(formData.get("from") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      to: String(formData.get("to") ?? ""),
    });
  };

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
              <SiteAdminSidebar activePageName="mail" runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">Send Mail</h2>
              </div>
              {notConfiguredItems.length === 0 ? null : (
                <div className="alert alert-error">
                  <p>Mail configuration is incomplete.</p>
                  <ul>
                    {notConfiguredItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sent ? <div className="alert alert-success">Mail was sent.</div> : null}
              <form
                action={apiSiteMailUri(runtimeConfig)}
                className="form-horizontal"
                id="mailForm"
                method="post"
                onSubmit={handleSubmit}
              >
                <div className="control-group">
                  <label className="control-label" htmlFor="mail-from">
                    From
                  </label>
                  <div className="controls">
                    <input
                      className="input-xlarge"
                      defaultValue={sender}
                      id="mail-from"
                      name="from"
                      type="text"
                    />
                  </div>
                </div>
                <div className="control-group">
                  <label className="control-label" htmlFor="mail-to">
                    To
                  </label>
                  <div className="controls">
                    <input className="input-xlarge" id="mail-to" name="to" type="email" />
                  </div>
                </div>
                <div className="control-group">
                  <label className="control-label" htmlFor="mail-subject">
                    Subject
                  </label>
                  <div className="controls">
                    <input className="input-xlarge" id="mail-subject" name="subject" type="text" />
                  </div>
                </div>
                <div className="control-group">
                  <label className="control-label" htmlFor="body">
                    Body
                  </label>
                  <div className="controls">
                    <textarea className="input-xxlarge" id="body" name="body" rows={10} />
                  </div>
                </div>
                <div className="mail-btn-wrap">
                  <button className="ybtn ybtn-primary" disabled={pending} type="submit">
                    {pending ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SiteAdminMassMailPage({
  mailtoHref,
  pending,
  runtimeConfig,
  onResolveRecipients,
}: {
  mailtoHref: string;
  pending: boolean;
  runtimeConfig: RuntimeConfig;
  onResolveRecipients: (input: SiteMailListInput) => void;
}) {
  const [mode, setMode] = React.useState<"all" | "projects">("all");
  const [projectInput, setProjectInput] = React.useState("");
  const [selectedProjects, setSelectedProjects] = React.useState<string[]>([]);
  const addProject = () => {
    const project = projectInput.trim();
    if (project === "") {
      return;
    }
    setSelectedProjects((current) => (current.includes(project) ? current : [...current, project]));
    setProjectInput("");
  };
  const resolveRecipients = () => {
    onResolveRecipients({
      all: mode === "all",
      projects: mode === "all" ? [] : selectedProjects,
    });
  };

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
              <SiteAdminSidebar activePageName="massmail" runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">Mass Mail</h2>
              </div>
              <div className="mess-mail-wrap">
                <div className="control-group">
                  <label className="radio" htmlFor="mailtoAll">
                    <input
                      checked={mode === "all"}
                      id="mailtoAll"
                      name="mailto"
                      type="radio"
                      value="all"
                      onChange={() => setMode("all")}
                    />
                    All users
                  </label>
                  <label className="radio" htmlFor="mailtoPrj">
                    <input
                      checked={mode === "projects"}
                      id="mailtoPrj"
                      name="mailto"
                      type="radio"
                      value="projects"
                      onChange={() => setMode("projects")}
                    />
                    Project members
                  </label>
                </div>
                <div hidden={mode !== "projects"} id="project-list-wrap">
                  <div className="project-select-row">
                    <input
                      className="textbox"
                      id="input-project"
                      type="text"
                      value={projectInput}
                      onChange={(event) => setProjectInput(event.target.value)}
                    />
                    <button className="ybtn" id="select-project" type="button" onClick={addProject}>
                      Select
                    </button>
                  </div>
                  <div id="selected-projects">
                    {selectedProjects.map((project) => (
                      <span className="label label-info" key={project}>
                        {project}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mail-btn-wrap">
                  <button
                    className="ybtn ybtn-primary"
                    data-request-method="post"
                    data-request-uri={apiSiteMailListUri(runtimeConfig)}
                    disabled={pending}
                    id="write-email"
                    type="button"
                    onClick={resolveRecipients}
                  >
                    {pending ? "Resolving..." : "Write email"}
                  </button>
                  {mailtoHref === "" ? null : (
                    <a href={mailtoHref} id="mailto-link">
                      {mailtoHref}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SiteAdminDataPage({
  csrfToken,
  runtimeConfig,
}: {
  csrfToken: string;
  runtimeConfig: RuntimeConfig;
}) {
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
              <SiteAdminSidebar activePageName="data" runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">site.sidebar.data</h2>
              </div>
              <div className="cu-desc">
                <ul>
                  <li className="notice">
                    <strong>site.data.warning1</strong>
                  </li>
                  <li className="notice">
                    <strong>site.data.warning2</strong>
                  </li>
                  <li className="notice">
                    <strong>site.data.warning3</strong>
                  </li>
                </ul>
              </div>

              <h3>site.data.export</h3>
              <p>site.data.export.info</p>
              <a className="ybtn ybtn-primary" href={appHref(runtimeConfig, "/sites/export")}>
                <strong>site.data.export</strong>
              </a>

              <h3>site.data.import</h3>
              <p>site.data.import.info</p>
              <form
                action={appHref(runtimeConfig, "/sites/import")}
                encType="multipart/form-data"
                method="post"
              >
                <input name="csrfToken" readOnly type="hidden" value={csrfToken} />
                <input name="data" type="file" />
                <p>
                  <input readOnly type="submit" value="site.data.import" />
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SiteAdminUpdatePage({
  error,
  response,
  runtimeConfig,
}: {
  error: string | null;
  response: SiteUpdateResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const branchError = response?.error ?? error;
  const versionToUpdate = response?.versionToUpdate ?? null;
  const currentVersion = response?.currentVersion ?? "";
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
              <SiteAdminSidebar activePageName="update" runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">Update</h2>
              </div>
              {versionToUpdate ? (
                <p>
                  <strong>{`site.update.isAvailable ${versionToUpdate}`}</strong>{" "}
                  <a
                    className="ybtn ybtn-success"
                    href={appHref(runtimeConfig, "/sites/update/download-file")}
                  >
                    site.update.download
                  </a>
                </p>
              ) : null}
              {currentVersion ? <p>{`site.update.currentVersion ${currentVersion}`}</p> : null}
              {!versionToUpdate && !branchError ? <p>site.update.isNotNecessary</p> : null}
              {branchError ? (
                <>
                  <p>site.update.error</p>
                  <pre>{branchError}</pre>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SiteAdminDiagnosticPage({
  response,
  runtimeConfig,
}: {
  response: SiteDiagnosticsResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const errors = response?.errors ?? [];
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
              <SiteAdminSidebar activePageName="diagnostic" runtimeConfig={runtimeConfig} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">Diagnostics</h2>
              </div>
              {errors.length === 0 ? (
                <p>No errors were found</p>
              ) : (
                <>
                  <p>{`${response?.errorCount ?? errors.length} errors were found`}</p>
                  <ul className="site-diagnostic-errors">
                    {errors.map((error) => (
                      <li key={error}>
                        <pre>{error}</pre>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SiteIssueTabs({
  input,
  runtimeConfig,
}: {
  input: SiteIssueListInput;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <ul className="nav nav-tabs">
      {SITE_ISSUE_STATES.map((item) => (
        <li className={item.state === input.state ? "active" : ""} key={item.state}>
          <a href={appHref(runtimeConfig, siteIssueListHref({ page: 1, state: item.state }, 1))}>
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function SiteIssueRow({
  issue,
  runtimeConfig,
}: {
  issue: SiteIssue;
  runtimeConfig: RuntimeConfig;
}) {
  const projectPath = `/${issue.ownerName}/${issue.projectName}`;
  const issuePath = `${projectPath}/issue/${issue.issueNumber}`;
  const projectLabel = `${issue.ownerName}/${issue.projectName}`;
  const authorLabel = issue.authorLabel || issue.authorLoginId;

  return (
    <li className="row-fluid listitem">
      <a className="avatar-wrap list-avatar" href={appHref(runtimeConfig, projectPath)}>
        <span className="avatar-initial">{issue.projectName.slice(0, 1).toUpperCase()}</span>
      </a>
      <div className="post-info-wrap">
        <a className="post-project" href={appHref(runtimeConfig, projectPath)}>
          {projectLabel}
        </a>
        <span className="post-info-separator">{"\u00b7"}</span>
        <a className="post-title" href={appHref(runtimeConfig, issuePath)}>
          {issue.title}
        </a>
      </div>
      <div className="post-meta-wrap">
        <a className="avatar-wrap" href={appHref(runtimeConfig, `/${issue.authorLoginId}`)}>
          <span className="avatar-initial avatar-initial-small">
            {authorLabel.slice(0, 1).toUpperCase()}
          </span>
        </a>
        <a className="post-meta-item" href={appHref(runtimeConfig, `/${issue.authorLoginId}`)}>
          {authorLabel}
        </a>
        <span className="post-meta-item" title={issue.createdLabel}>
          {issue.createdLabel}
        </span>
        <span className="post-comments post-meta-item">
          <a href={appHref(runtimeConfig, `${issuePath}#comments`)}>
            <span aria-hidden="true" className="yobicon-comments" />
            {issue.commentCount}
          </a>
        </span>
      </div>
    </li>
  );
}

function SitePostRow({ post, runtimeConfig }: { post: SitePost; runtimeConfig: RuntimeConfig }) {
  const projectPath = `/${post.ownerName}/${post.projectName}`;
  const postPath = `${projectPath}/post/${post.postNumber}`;
  const projectLabel = `${post.ownerName}/${post.projectName}`;
  const authorLabel = post.authorLabel || post.authorLoginId;

  return (
    <li className="row-fluid listitem">
      <a className="avatar-wrap list-avatar" href={appHref(runtimeConfig, projectPath)}>
        <span className="avatar-initial">{post.projectName.slice(0, 1).toUpperCase()}</span>
      </a>
      <div className="post-info-wrap">
        <a className="post-project" href={appHref(runtimeConfig, projectPath)}>
          {projectLabel}
        </a>
        <span className="post-info-separator">{"\u00b7"}</span>
        <a className="post-title" href={appHref(runtimeConfig, postPath)}>
          {post.title}
        </a>
      </div>
      <div className="post-meta-wrap">
        <a className="avatar-wrap" href={appHref(runtimeConfig, `/${post.authorLoginId}`)}>
          <span className="avatar-initial avatar-initial-small">
            {authorLabel.slice(0, 1).toUpperCase()}
          </span>
        </a>
        <a className="post-meta-item" href={appHref(runtimeConfig, `/${post.authorLoginId}`)}>
          {authorLabel}
        </a>
        <span className="post-meta-item" title={post.createdLabel}>
          {post.createdLabel}
        </span>
        <span className="post-comments post-meta-item">
          <a href={appHref(runtimeConfig, `${postPath}#comments`)}>
            <span aria-hidden="true" className="yobicon-comments" />
            {post.commentCount}
          </a>
        </span>
      </div>
    </li>
  );
}

function SiteProjectListHeader() {
  return (
    <div className="row-fluid listhead">
      <div className="span5 listhead-title">
        <strong>Project</strong>
      </div>
      <div className="span4 listhead-title">
        <strong>Description</strong>
      </div>
      <div className="span2 listhead-title">
        <strong>Created</strong>
      </div>
      <div className="span1 listhead-title">
        <strong>{"\u00a0"}</strong>
      </div>
    </div>
  );
}

function SiteProjectRow({
  pendingDelete,
  project,
  runtimeConfig,
  onRequestDelete,
}: {
  pendingDelete: boolean;
  project: SiteProject;
  runtimeConfig: RuntimeConfig;
  onRequestDelete: (project: SiteProject) => void;
}) {
  const projectPath = `/${project.ownerName}/${project.projectName}`;
  const projectLabel = `${project.ownerName}/${project.projectName}`;
  return (
    <li className="row-fluid listitem">
      <div className="span5 listitem-col">
        <a className="avatar-wrap list-avatar" href={appHref(runtimeConfig, projectPath)}>
          <span className="avatar-initial">{project.projectName.slice(0, 1).toUpperCase()}</span>
          {projectLabel}
        </a>
        <a className="project-name" href={appHref(runtimeConfig, projectPath)}>
          {projectLabel}
        </a>
      </div>
      <div className="span4 listitem-col project-overview">{project.overview}</div>
      <div className="span2 listitem-col created-date">{project.createdAt}</div>
      <div className="span1 listitem-col action-buttons">
        <button
          className="ybtn ybtn-danger"
          data-href={appHref(runtimeConfig, `/sites/project/delete/${project.id}`)}
          data-project-name={projectLabel}
          data-request-method="delete"
          data-request-uri={apiDeleteSiteProjectUri(runtimeConfig, project.id)}
          data-toggle="delete-project"
          disabled={pendingDelete}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onRequestDelete(project);
          }}
        >
          {pendingDelete ? "Deleting..." : "Delete"}
        </button>
      </div>
    </li>
  );
}

function SiteDeleteProjectModal({
  pending,
  project,
  runtimeConfig,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  project: SiteProject | null;
  runtimeConfig: RuntimeConfig;
  onCancel: () => void;
  onConfirm: (projectId: number) => void;
}) {
  const visible = project !== null;
  return (
    <div
      aria-hidden={!visible}
      className={`modal fade${visible ? " in" : " hide"}`}
      hidden={!visible}
      id="alertDeletionWrap"
      role="dialog"
    >
      <div className="modal-header">
        <button aria-label="Close" className="close" type="button" onClick={onCancel}>
          x
        </button>
        <span id="project-name">
          {project === null ? "" : `${project.ownerName}/${project.projectName}`}
        </span>
        Delete Project
      </div>
      <div className="modal-body">
        <p>Are you sure?</p>
      </div>
      <div className="modal-footer">
        <button
          className="ybtn ybtn-danger"
          data-request-method="delete"
          data-request-uri={
            project === null ? "" : apiDeleteSiteProjectUri(runtimeConfig, project.id)
          }
          disabled={pending || project === null}
          id="projectDeleteBtn"
          type="button"
          onClick={(event) => {
            event.preventDefault();
            if (project !== null) {
              onConfirm(project.id);
            }
          }}
        >
          {pending ? "Deleting..." : "Delete Project"}
        </button>
        <button className="ybtn" disabled={pending} type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
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
  pendingDelete,
  pendingGuest,
  pendingResetPassword,
  pendingSiteAdmin,
  resetPassword,
  runtimeConfig,
  selectedState,
  user,
  onToggleAccountLock,
  onToggleGuest,
  onRequestDelete,
  onResetPassword,
  onToggleSiteAdmin,
}: {
  pendingAccountLock: boolean;
  pendingDelete: boolean;
  pendingGuest: boolean;
  pendingResetPassword: boolean;
  pendingSiteAdmin: boolean;
  resetPassword: string;
  runtimeConfig: RuntimeConfig;
  selectedState: SiteUserState;
  user: SiteUser;
  onToggleAccountLock: (loginId: string) => void;
  onToggleGuest: (loginId: string) => void;
  onRequestDelete: (user: SiteUser) => void;
  onResetPassword: (loginId: string) => void;
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
            className={`ybtn ybtn-small${user.isGuest ? " ybtn-success" : ""}`}
            data-request-method="post"
            data-request-uri={apiToggleUri(runtimeConfig, user.loginId, "guest")}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onToggleGuest(user.loginId);
            }}
          >
            {pendingGuest ? "Saving..." : user.isGuest ? "Normal User" : "Guest User"}
          </button>
          <button
            className="ybtn ybtn-small"
            data-request-method="post"
            data-request-uri={apiToggleUri(runtimeConfig, user.loginId, "account-lock")}
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
            data-request-method="post"
            data-request-uri={apiPasswordResetUri(runtimeConfig, user.loginId)}
            data-toggle="reset-password"
            id={user.loginId}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onResetPassword(user.loginId);
            }}
          >
            {pendingResetPassword ? "Sending..." : "Reset Password"}
          </button>
          {resetPassword === "" ? null : (
            <div className="alert alert-success">
              <h4>New Password: {resetPassword}</h4>
            </div>
          )}
          <button
            className={`ybtn ybtn-small ${user.isSiteAdmin ? "ybtn-info" : "label-info"}`}
            data-request-method="post"
            data-request-uri={apiToggleUri(runtimeConfig, user.loginId, "site-admin")}
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
            data-href={appHref(runtimeConfig, `/sites/user/delete${user.id}`)}
            data-request-method="delete"
            data-request-uri={apiDeleteSiteUserUri(runtimeConfig, user.loginId)}
            data-toggle="account-delete"
            data-user-id={user.loginId}
            data-user-name={user.displayName}
            disabled={pendingDelete}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onRequestDelete(user);
            }}
          >
            {pendingDelete ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </li>
  );
}

function SiteDeleteUserModal({
  pending,
  runtimeConfig,
  user,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  runtimeConfig: RuntimeConfig;
  user: SiteUser | null;
  onCancel: () => void;
  onConfirm: (loginId: string) => void;
}) {
  const visible = user !== null;
  return (
    <div
      aria-hidden={!visible}
      className={`modal fade${visible ? " in" : " hide"}`}
      hidden={!visible}
      id="alertDeletionWrap"
      role="dialog"
    >
      <div className="modal-header">
        <button aria-label="Close" className="close" type="button" onClick={onCancel}>
          x
        </button>
        <h3>Delete User</h3>
      </div>
      <div className="modal-body">
        <p>
          <span id="userInfo">{user === null ? "" : `${user.displayName}(${user.loginId})`}</span>
        </p>
      </div>
      <div className="modal-footer">
        <button className="ybtn" disabled={pending} type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="ybtn ybtn-danger"
          data-request-method="delete"
          data-request-uri={user === null ? "" : apiDeleteSiteUserUri(runtimeConfig, user.loginId)}
          disabled={pending || user === null}
          id="accountToggleBtn"
          type="button"
          onClick={(event) => {
            event.preventDefault();
            if (user !== null) {
              onConfirm(user.loginId);
            }
          }}
        >
          {pending ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
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

function SiteProjectPagination({
  input,
  page,
  runtimeConfig,
  totalPages,
}: {
  input: SiteProjectListInput;
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
          href={appHref(runtimeConfig, siteProjectListHref(input, pageNumber))}
          key={pageNumber}
        >
          {pageNumber}
        </a>
      ))}
    </div>
  );
}

function SitePostPagination({
  input,
  page,
  runtimeConfig,
  totalPages,
}: {
  input: SitePostListInput;
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
          href={appHref(runtimeConfig, sitePostListHref(input, pageNumber))}
          key={pageNumber}
        >
          {pageNumber}
        </a>
      ))}
    </div>
  );
}

function SiteIssuePagination({
  input,
  page,
  runtimeConfig,
  totalPages,
}: {
  input: SiteIssueListInput;
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
          href={appHref(runtimeConfig, siteIssueListHref(input, pageNumber))}
          key={pageNumber}
        >
          {pageNumber}
        </a>
      ))}
    </div>
  );
}
