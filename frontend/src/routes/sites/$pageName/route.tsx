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
  BadRequestPage,
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
  { label: "site.userList.unlocked", state: "ACTIVE" },
  { label: "site.userList.locked", state: "LOCKED" },
  { label: "site.userList.deleted", state: "DELETED" },
  { label: "site.userList.guest", state: "GUEST" },
  { label: "site.userList.siteAdmin", state: "SITE_ADMIN" },
];

const SITE_ISSUE_STATES: Array<{ label: string; state: SiteIssueState }> = [
  { label: "issue.state.open", state: "open" },
  { label: "issue.state.closed", state: "closed" },
];

const SITE_ADMIN_NAV = [
  { href: "/sites/userList", label: "site.sidebar.userList", pageName: "userList" },
  { href: "/sites/postList", label: "site.sidebar.postList", pageName: "postList" },
  { href: "/sites/issueList", label: "site.sidebar.issueList", pageName: "issueList" },
  { href: "/sites/projectList", label: "site.sidebar.projectList", pageName: "projectList" },
  { href: "/sites/mail", label: "site.sidebar.mailSend", pageName: "mail" },
  { href: "/sites/massmail", label: "site.sidebar.massMail", pageName: "massmail" },
  { href: "/sites/update", label: "site.sidebar.update", pageName: "update" },
  { href: "/sites/diagnostic", label: "site.sidebar.diagnostics", pageName: "diagnostic" },
];

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

function legacyLabelName(name: string): React.LabelHTMLAttributes<HTMLLabelElement> {
  return { name } as React.LabelHTMLAttributes<HTMLLabelElement>;
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

function siteMailSentFromHref(href: string): boolean {
  const params = new URL(href, "http://yona.local").searchParams;
  return params.get("sended") === "true";
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

function apiSiteMailListUri(runtimeConfig: RuntimeConfig): string {
  return appHref(runtimeConfig, "/api/v1/site/mail-list");
}

function SiteAdminRouteComponent() {
  const { pageName } = Route.useParams();
  const href = useCurrentHref();
  const { bootstrapping, csrfToken, currentSession, runtimeConfig, setErrorMessage } =
    useAppRuntime();

  useDocumentTitle("title.siteSetting");

  const currentIsSiteAdmin = currentSession?.isSiteAdmin ?? false;
  const updateBadgeQuery = useQuery({
    ...siteUpdateQueryOptions(runtimeConfig),
    enabled: !bootstrapping && currentIsSiteAdmin,
  });
  const updateAvailable = updateBadgeQuery.data?.versionToUpdate != null;

  if (pageName === "userList") {
    return (
      <SiteUserListRoute
        bootstrapping={bootstrapping}
        csrfToken={csrfToken}
        currentIsSiteAdmin={currentIsSiteAdmin}
        href={href}
        runtimeConfig={runtimeConfig}
        setErrorMessage={setErrorMessage}
        updateAvailable={updateAvailable}
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
        updateAvailable={updateAvailable}
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
        updateAvailable={updateAvailable}
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
        updateAvailable={updateAvailable}
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
        updateAvailable={updateAvailable}
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
        updateAvailable={updateAvailable}
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
        updateAvailable={updateAvailable}
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
        updateAvailable={updateAvailable}
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
        updateAvailable={updateAvailable}
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
  updateAvailable = false,
}: {
  bootstrapping: boolean;
  csrfToken: string;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  const canRender = useRequireAuthenticatedRoute(href);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell site-admin-page">
        <h1>common.loading</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin) {
    return <ForbiddenPage href="/sites/data" />;
  }

  return (
    <SiteAdminDataPage
      csrfToken={csrfToken}
      runtimeConfig={runtimeConfig}
      updateAvailable={updateAvailable}
    />
  );
}

function SiteUpdateRoute({
  bootstrapping,
  currentIsSiteAdmin,
  href,
  runtimeConfig,
  updateAvailable = false,
}: {
  bootstrapping: boolean;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const query = useQuery({
    ...siteUpdateQueryOptions(runtimeConfig),
    enabled: canRender && currentIsSiteAdmin,
  });

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell site-admin-page">
        <h1>common.loading</h1>
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
      updateAvailable={updateAvailable}
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
  updateAvailable = false,
}: {
  bootstrapping: boolean;
  csrfToken: string;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  setErrorMessage: (message: string | null) => void;
  updateAvailable?: boolean;
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
    (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
    },
    [setErrorMessage],
  );
  const adminMutation = useMutation({
    mutationFn: (loginId: string) => toggleSiteUserAdminRest(runtimeConfig, csrfToken, loginId),
    onError: mutationError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
    },
  });
  const lockMutation = useMutation({
    mutationFn: (loginId: string) =>
      toggleSiteUserAccountLockRest(runtimeConfig, csrfToken, loginId),
    onError: mutationError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
    },
  });
  const guestMutation = useMutation({
    mutationFn: (loginId: string) => toggleSiteUserGuestRest(runtimeConfig, csrfToken, loginId),
    onError: mutationError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (loginId: string) => deleteSiteUserRest(runtimeConfig, csrfToken, loginId),
    onError: mutationError,
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
    },
  });
  const resetPasswordMutation = useMutation({
    mutationFn: (loginId: string) => resetSiteUserPasswordRest(runtimeConfig, csrfToken, loginId),
    onError: mutationError,
    onSuccess: async (response) => {
      setResetPasswords((current) => ({
        ...current,
        [response.loginId]: response.newPassword,
      }));
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.usersBase() });
    },
  });
  const failureKind = query.error ? (classifyConnectFailure(query.error) ?? "bad-request") : null;

  if (bootstrapping || !canRender || (currentIsSiteAdmin && query.isLoading)) {
    return (
      <main className="app-shell site-admin-page">
        <h1>common.loading</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin || failureKind === "forbidden") {
    return <ForbiddenPage href="/sites/userList" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/userList" />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href="/sites/userList" />;
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
      updateAvailable={updateAvailable}
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
  updateAvailable = false,
}: {
  bootstrapping: boolean;
  csrfToken: string;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  setErrorMessage: (message: string | null) => void;
  updateAvailable?: boolean;
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
      setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.projectsBase() });
    },
  });
  const failureKind = query.error ? (classifyConnectFailure(query.error) ?? "bad-request") : null;

  if (bootstrapping || !canRender || (currentIsSiteAdmin && query.isLoading)) {
    return (
      <main className="app-shell site-admin-page">
        <h1>common.loading</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin || failureKind === "forbidden") {
    return <ForbiddenPage href="/sites/projectList" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/projectList" />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href="/sites/projectList" />;
  }

  return (
    <SiteAdminProjectListPage
      deleteTarget={deleteTarget}
      input={input}
      pendingDeleteProjectId={deleteMutation.isPending ? deleteMutation.variables : undefined}
      response={query.data}
      runtimeConfig={runtimeConfig}
      updateAvailable={updateAvailable}
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
  updateAvailable = false,
}: {
  bootstrapping: boolean;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const input = React.useMemo(() => sitePostListInputFromHref(href), [href]);
  const query = useQuery({
    ...sitePostsQueryOptions(runtimeConfig, input),
    enabled: canRender && currentIsSiteAdmin,
  });
  const failureKind = query.error ? (classifyConnectFailure(query.error) ?? "bad-request") : null;

  if (bootstrapping || !canRender || (currentIsSiteAdmin && query.isLoading)) {
    return (
      <main className="app-shell site-admin-page">
        <h1>common.loading</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin || failureKind === "forbidden") {
    return <ForbiddenPage href="/sites/postList" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/postList" />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href="/sites/postList" />;
  }

  return (
    <SiteAdminPostListPage
      input={input}
      response={query.data}
      runtimeConfig={runtimeConfig}
      updateAvailable={updateAvailable}
    />
  );
}

function SiteIssueListRoute({
  bootstrapping,
  currentIsSiteAdmin,
  href,
  runtimeConfig,
  updateAvailable = false,
}: {
  bootstrapping: boolean;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const input = React.useMemo(() => siteIssueListInputFromHref(href), [href]);
  const query = useQuery({
    ...siteIssuesQueryOptions(runtimeConfig, input),
    enabled: canRender && currentIsSiteAdmin,
  });
  const failureKind = query.error ? (classifyConnectFailure(query.error) ?? "bad-request") : null;

  if (bootstrapping || !canRender || (currentIsSiteAdmin && query.isLoading)) {
    return (
      <main className="app-shell site-admin-page">
        <h1>common.loading</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin || failureKind === "forbidden") {
    return <ForbiddenPage href="/sites/issueList" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/issueList" />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href="/sites/issueList" />;
  }

  return (
    <SiteAdminIssueListPage
      input={input}
      response={query.data}
      runtimeConfig={runtimeConfig}
      updateAvailable={updateAvailable}
    />
  );
}

function SiteMailRoute({
  bootstrapping,
  csrfToken,
  currentIsSiteAdmin,
  href,
  runtimeConfig,
  setErrorMessage,
  updateAvailable = false,
}: {
  bootstrapping: boolean;
  csrfToken: string;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  setErrorMessage: (message: string | null) => void;
  updateAvailable?: boolean;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const queryClient = useQueryClient();
  const [sent, setSent] = React.useState(() => siteMailSentFromHref(href));
  const query = useQuery({
    ...siteMailOptionsQueryOptions(runtimeConfig),
    enabled: canRender && currentIsSiteAdmin,
  });
  const sendMutation = useMutation({
    mutationFn: (input: SiteMailSendInput) => sendSiteMailRest(runtimeConfig, csrfToken, input),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "site.mail.fail");
    },
    onSuccess: (response) => {
      setSent(response.sent);
      queryClient.setQueryData(apiQueryKeys.siteAdmin.mail(), response);
    },
  });
  const failureKind = query.error ? (classifyConnectFailure(query.error) ?? "bad-request") : null;

  if (bootstrapping || !canRender || (currentIsSiteAdmin && query.isLoading)) {
    return (
      <main className="app-shell site-admin-page">
        <h1>common.loading</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin || failureKind === "forbidden") {
    return <ForbiddenPage href="/sites/mail" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/mail" />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href="/sites/mail" />;
  }

  return (
    <SiteAdminMailPage
      pending={sendMutation.isPending}
      response={query.data}
      runtimeConfig={runtimeConfig}
      sent={sent || sendMutation.data?.sent === true}
      updateAvailable={updateAvailable}
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
  updateAvailable = false,
}: {
  bootstrapping: boolean;
  csrfToken: string;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  setErrorMessage: (message: string | null) => void;
  updateAvailable?: boolean;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const queryClient = useQueryClient();
  const [mailtoHref, setMailtoHref] = React.useState("");
  const mailListMutation = useMutation({
    mutationFn: (input: SiteMailListInput) => readSiteMailListRest(runtimeConfig, csrfToken, input),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
    },
    onSuccess: async (response) => {
      setMailtoHref(`mailto:${response.recipients.join(",")}`);
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.siteAdmin.mail() });
    },
  });

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell site-admin-page">
        <h1>common.loading</h1>
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
      updateAvailable={updateAvailable}
      onResolveRecipients={(input) => mailListMutation.mutate(input)}
    />
  );
}

function SiteDiagnosticRoute({
  bootstrapping,
  currentIsSiteAdmin,
  href,
  runtimeConfig,
  updateAvailable = false,
}: {
  bootstrapping: boolean;
  currentIsSiteAdmin: boolean;
  href: string;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  const canRender = useRequireAuthenticatedRoute(href);
  const query = useQuery({
    ...siteDiagnosticsQueryOptions(runtimeConfig),
    enabled: canRender && currentIsSiteAdmin,
  });
  const failureKind = query.error ? (classifyConnectFailure(query.error) ?? "bad-request") : null;

  if (bootstrapping || !canRender || (currentIsSiteAdmin && query.isLoading)) {
    return (
      <main className="app-shell site-admin-page">
        <h1>common.loading</h1>
      </main>
    );
  }
  if (!currentIsSiteAdmin || failureKind === "forbidden") {
    return <ForbiddenPage href="/sites/diagnostic" />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href="/sites/diagnostic" />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href="/sites/diagnostic" />;
  }

  return (
    <SiteAdminDiagnosticPage
      response={query.data}
      runtimeConfig={runtimeConfig}
      updateAvailable={updateAvailable}
    />
  );
}

function SiteAdminSidebar({
  activePageName,
  runtimeConfig,
  updateAvailable = false,
}: {
  activePageName: string;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  return (
    <ul className="site-setting-nav">
      {SITE_ADMIN_NAV.map((item) => (
        <li className={item.pageName === activePageName ? "active" : ""} key={item.pageName}>
          <a href={appHref(runtimeConfig, item.href)}>
            {item.label}
            {item.pageName === "update" && updateAvailable ? (
              <span className="notification-badge">1</span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SiteAdminUserListPage({
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
  updateAvailable = false,
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
  updateAvailable?: boolean;
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
          <h3>site.sidebar</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar
                activePageName="userList"
                runtimeConfig={runtimeConfig}
                updateAvailable={updateAvailable}
              />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">site.sidebar.userList</h2>
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
                      placeholder="site.userList.search"
                      type="text"
                    />
                    <button className="search-btn" type="submit">
                      <i className="yobicon-search" />
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

export function SiteAdminProjectListPage({
  deleteTarget,
  input,
  pendingDeleteProjectId,
  response,
  runtimeConfig,
  updateAvailable = false,
  onCancelDelete,
  onConfirmDelete,
  onRequestDelete,
}: {
  deleteTarget: SiteProject | null;
  input: SiteProjectListInput;
  pendingDeleteProjectId: number | undefined;
  response: SiteProjectListResponse | undefined;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
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
          <h3>site.sidebar</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar
                activePageName="projectList"
                runtimeConfig={runtimeConfig}
                updateAvailable={updateAvailable}
              />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">site.sidebar.projectList</h2>
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
                      placeholder="site.project.filter"
                      type="text"
                    />
                    <button className="search-btn" type="submit">
                      <i className="yobicon-search" />
                    </button>
                  </div>
                </form>
              </div>
              <SiteProjectListHeader />
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

export function SiteAdminPostListPage({
  input,
  response,
  runtimeConfig,
  updateAvailable = false,
}: {
  input: SitePostListInput;
  response: SitePostListResponse | undefined;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  const posts = response?.posts ?? [];
  const page = response?.page ?? input.page;
  const totalPages = response?.totalPages ?? 0;

  return (
    <main className="app-shell site-admin-page">
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>site.sidebar</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar
                activePageName="postList"
                runtimeConfig={runtimeConfig}
                updateAvailable={updateAvailable}
              />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">site.sidebar.postList</h2>
              </div>
              <ul className="post-list-wrap">
                {posts.map((post) => (
                  <SitePostRow
                    key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                    post={post}
                    runtimeConfig={runtimeConfig}
                  />
                ))}
              </ul>
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

export function SiteAdminIssueListPage({
  input,
  response,
  runtimeConfig,
  updateAvailable = false,
}: {
  input: SiteIssueListInput;
  response: SiteIssueListResponse | undefined;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  const issues = response?.issues ?? [];
  const page = response?.page ?? input.page;
  const totalPages = response?.totalPages ?? 0;

  return (
    <main className="app-shell site-admin-page">
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>site.sidebar</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar
                activePageName="issueList"
                runtimeConfig={runtimeConfig}
                updateAvailable={updateAvailable}
              />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">site.sidebar.issueList</h2>
              </div>
              <SiteIssueTabs input={input} runtimeConfig={runtimeConfig} />
              <ul className="post-list-wrap">
                {issues.map((issue) => (
                  <SiteIssueRow
                    issue={issue}
                    key={`${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`}
                    runtimeConfig={runtimeConfig}
                  />
                ))}
              </ul>
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

export function SiteAdminMailPage({
  pending,
  response,
  runtimeConfig,
  sent,
  updateAvailable = false,
  onSend,
}: {
  pending: boolean;
  response: SiteMailOptionsResponse | undefined;
  runtimeConfig: RuntimeConfig;
  sent: boolean;
  updateAvailable?: boolean;
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
          <h3>site.sidebar</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar
                activePageName="mail"
                runtimeConfig={runtimeConfig}
                updateAvailable={updateAvailable}
              />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">title.sendMail</h2>
              </div>
              {notConfiguredItems.length === 0 ? null : (
                <div className="alert alert-error">
                  <p>site.mail.notConfigured /admin/mailconf</p>
                  <ul>
                    {notConfiguredItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sent ? <div className="alert alert-success">site.mail.sended</div> : null}
              <form
                action={appHref(runtimeConfig, "/sites/mail")}
                className="form-horizontal"
                id="mailForm"
                method="post"
                onSubmit={handleSubmit}
              >
                <div className="control-group">
                  <label className="control-label span3" htmlFor="mail-from" {...legacyLabelName("from")}>
                    site.mail.from
                  </label>
                  <div className="controls">
                    <input
                      className="span4"
                      defaultValue={sender}
                      id="mail-from"
                      name="from"
                      placeholder="site.mail.fromPlaceholder"
                      required
                      type="text"
                    />
                  </div>
                </div>
                <div className="control-group">
                  <label className="control-label" htmlFor="mail-to" {...legacyLabelName("to")}>
                    site.mail.to
                  </label>
                  <div className="controls">
                    <input
                      className="span4"
                      id="mail-to"
                      name="to"
                      placeholder="site.mail.toPlaceholder"
                      required
                      type="text"
                    />
                  </div>
                </div>
                <div className="control-group mr10">
                  <label className="control-label" htmlFor="mail-subject" {...legacyLabelName("subject")}>
                    site.mail.subject
                  </label>
                  <div className="controls">
                    <input className="span12" id="mail-subject" name="subject" type="text" />
                  </div>
                </div>
                <div className="control-group mr10">
                  <label className="control-label" htmlFor="body" {...legacyLabelName("body")}>
                    site.mail.body
                  </label>
                  <div className="controls">
                    <textarea className="span12 input-xlarge textbody" id="body" name="body" rows={16} />
                  </div>
                </div>
                <div className="span12 mail-btn-wrap">
                  <button className="ybtn ybtn-primary" disabled={pending} type="submit">
                    <strong>site.mail.send</strong>
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

export function SiteAdminMassMailPage({
  mailtoHref,
  pending,
  runtimeConfig,
  updateAvailable = false,
  onResolveRecipients,
}: {
  mailtoHref: string;
  pending: boolean;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
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
          <h3>site.sidebar</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar
                activePageName="massmail"
                runtimeConfig={runtimeConfig}
                updateAvailable={updateAvailable}
              />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">title.massMail</h2>
              </div>
              <div className="mess-mail-wrap">
                <label className="radio" htmlFor="mailtoAll">
                  <input
                    checked={mode === "all"}
                    data-action="hide"
                    data-toggle="mail-type"
                    id="mailtoAll"
                    name="mailingType"
                    type="radio"
                    value="all"
                    onChange={() => setMode("all")}
                  />
                  site.massMail.toAll
                </label>
                <label className="radio" htmlFor="mailtoPrj">
                  <input
                    checked={mode === "projects"}
                    data-action="show"
                    data-toggle="mail-type"
                    id="mailtoPrj"
                    name="mailingType"
                    type="radio"
                    value="projects"
                    onChange={() => setMode("projects")}
                  />
                  site.massMail.toProjects
                </label>
                <div className={mode === "projects" ? "control-group" : "control-group hide"} id="project-list-wrap">
                  <div className="controls">
                    <input
                      autoComplete="off"
                      className="span3"
                      data-provider="typeahead"
                      id="input-project"
                      placeholder="project.name"
                      type="text"
                      value={projectInput}
                      onChange={(event) => setProjectInput(event.target.value)}
                    />
                    <button
                      className="ybtn"
                      data-loading-text="site.massMail.loading"
                      id="select-project"
                      type="submit"
                      onClick={addProject}
                    >
                      <strong>button.add</strong>
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
                    type="submit"
                    onClick={resolveRecipients}
                  >
                    <strong>site.mail.write</strong>
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

export function SiteAdminDataPage({
  csrfToken,
  runtimeConfig,
  updateAvailable = false,
}: {
  csrfToken: string;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  return (
    <main className="app-shell site-admin-page">
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>site.sidebar</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar
                activePageName="data"
                runtimeConfig={runtimeConfig}
                updateAvailable={updateAvailable}
              />
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
                  <input type="submit" />
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function SiteAdminUpdatePage({
  error,
  response,
  runtimeConfig,
  updateAvailable = false,
}: {
  error: string | null;
  response: SiteUpdateResponse | undefined;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  const branchError = response?.error ?? error;
  const versionToUpdate = response?.versionToUpdate ?? null;
  const currentVersion = response?.currentVersion ?? "";
  const showUpdateBadge = updateAvailable || versionToUpdate !== null;
  return (
    <main className="app-shell site-admin-page">
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>site.sidebar</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar
                activePageName="update"
                runtimeConfig={runtimeConfig}
                updateAvailable={showUpdateBadge}
              />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">site.sidebar.update</h2>
              </div>
              {versionToUpdate ? (
                <p>
                  <strong>{`site.update.isAvailable ${versionToUpdate}`}</strong>{" "}
                  <a
                    className="ybtn ybtn-success"
                    href={appHref(runtimeConfig, "/sites/update/download")}
                  >
                    site.update.download
                  </a>
                </p>
              ) : null}
              {currentVersion ? <p>{`site.update.currentVersion ${currentVersion}`}</p> : null}
              {!versionToUpdate && !branchError ? (
                <p>{`site.update.isNotNecessary ${currentVersion}`}</p>
              ) : null}
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

export function SiteAdminDiagnosticPage({
  response,
  runtimeConfig,
  updateAvailable = false,
}: {
  response: SiteDiagnosticsResponse | undefined;
  runtimeConfig: RuntimeConfig;
  updateAvailable?: boolean;
}) {
  const errors = response?.errors ?? [];
  return (
    <main className="app-shell site-admin-page">
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>site.sidebar</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar
                activePageName="diagnostic"
                runtimeConfig={runtimeConfig}
                updateAvailable={updateAvailable}
              />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">site.sidebar.diagnostics</h2>
              </div>
              {errors.length === 0 ? (
                <p>site.diagnostic.errorNotFound</p>
              ) : (
                <>
                  <p>{`site.diagnostic.errorFound ${response?.errorCount ?? errors.length}`}</p>
                  <ul>
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
        {issue.projectLogoUrl ? (
          <img alt={issue.projectName} src={issue.projectLogoUrl} />
        ) : (
          <span className="avatar-initial">{issue.projectName.slice(0, 1).toUpperCase()}</span>
        )}
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
          {issue.authorAvatarUrl ? (
            <img alt={authorLabel} height={16} src={issue.authorAvatarUrl} width={16} />
          ) : (
            <span className="avatar-initial avatar-initial-small">
              {authorLabel.slice(0, 1).toUpperCase()}
            </span>
          )}
        </a>
        <a className="post-meta-item" href={appHref(runtimeConfig, `/${issue.authorLoginId}`)}>
          {authorLabel}
        </a>
        <span className="post-meta-item" title={issue.createdTitle || issue.createdLabel}>
          {issue.createdLabel}
        </span>
        <span className="post-comments post-meta-item">
          <a href={appHref(runtimeConfig, `${issuePath}#comments`)}>
            <i className="yobicon-comments" />
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
        {post.projectLogoUrl ? (
          <img alt={post.projectName} src={post.projectLogoUrl} />
        ) : (
          <span className="avatar-initial">{post.projectName.slice(0, 1).toUpperCase()}</span>
        )}
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
          {post.authorAvatarUrl ? (
            <img alt={authorLabel} height={16} src={post.authorAvatarUrl} width={16} />
          ) : (
            <span className="avatar-initial avatar-initial-small">
              {authorLabel.slice(0, 1).toUpperCase()}
            </span>
          )}
        </a>
        <a className="post-meta-item" href={appHref(runtimeConfig, `/${post.authorLoginId}`)}>
          {authorLabel}
        </a>
        <span className="post-meta-item" title={post.createdTitle || post.createdLabel}>
          {post.createdLabel}
        </span>
        <span className="post-comments post-meta-item">
          <a href={appHref(runtimeConfig, `${postPath}#comments`)}>
            <i className="yobicon-comments" />
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
        <strong>project.name</strong>
      </div>
      <div className="span4 listhead-title">
        <strong>project.description</strong>
      </div>
      <div className="span2 listhead-title">
        <strong>project.created</strong>
      </div>
      <div className="span1 listhead-title">
        <strong>{"\u00a0"}</strong>
      </div>
    </div>
  );
}

function siteProjectCreatedDateLabel(createdAt: string) {
  return createdAt.split(/[ T]/, 1)[0] ?? createdAt;
}

function siteUserSocialDateLabel(createdAt: string) {
  const match = createdAt.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?/);
  if (!match) {
    return createdAt;
  }
  const [, date, hourText, minute] = match;
  if (!hourText || !minute) {
    return date ?? createdAt;
  }
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) {
    return createdAt;
  }
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${date} ${displayHour}:${minute} ${suffix}`;
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
          {project.projectLogoUrl ? (
            <img alt={project.projectName} src={project.projectLogoUrl} />
          ) : (
            <span className="avatar-initial">{project.projectName.slice(0, 1).toUpperCase()}</span>
          )}
          {projectLabel}
        </a>
        <a className="project-name" href={appHref(runtimeConfig, projectPath)}>
          {projectLabel}
        </a>
      </div>
      <div className="span4 listitem-col project-overview">{project.overview}</div>
      <div className="span2 listitem-col created-date">
        {siteProjectCreatedDateLabel(project.createdAt)}
      </div>
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
          button.delete
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
        <button
          aria-label="button.close"
          className="close"
          data-dismiss="modal"
          type="button"
          onClick={onCancel}
        >
          ×
        </button>
        <span id="project-name">
          {project === null ? "" : `${project.ownerName}/${project.projectName}`}
        </span>
        site.project.delete
      </div>
      <div className="modal-body">
        <p>site.project.deleteConfirm</p>
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
          button.yes
        </button>
        <button
          className="ybtn"
          data-dismiss="modal"
          disabled={pending}
          type="button"
          onClick={onCancel}
        >
          button.no
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
        <strong>user.name</strong>
      </div>
      <div className="span3 listhead-title">
        <strong>user.email</strong>
      </div>
      <div className="span2 listhead-title">
        <strong>userinfo.since</strong>
      </div>
      <div className="span4 listhead-title">
        <strong>{state === "DELETED" ? "userinfo.leave" : "\u00a0"}</strong>
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
          {user.avatarUrl ? (
            <img alt={user.displayName} height={32} src={user.avatarUrl} width={32} />
          ) : (
            <span className="avatar-initial">{user.displayName.slice(0, 1).toUpperCase()}</span>
          )}
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
        <span>{siteUserSocialDateLabel(user.createdAt)}</span>
      </div>
      {selectedState === "DELETED" ? (
        <div className="span4 listitem-col">{user.lastStateModifiedAt || user.createdAt}</div>
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
            {user.isGuest ? "button.user.make.normal.mode" : "button.user.make.guest.mode"}
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
            {`button.user.makeAccountUnlock.${user.state === "LOCKED"}`}
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
            title.resetPassword
          </button>
          {resetPassword === "" ? null : (
            <div className="alert alert-success">
              <h4>{`user.newPassword: ${resetPassword}`}</h4>
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
            {user.isSiteAdmin
              ? "button.user.revoke.site.admin.role"
              : "button.user.upgrade.to.site.admin"}
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
            button.delete
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
        <button
          aria-label="button.close"
          className="close"
          data-dismiss="modal"
          type="button"
          onClick={onCancel}
        >
          ×
        </button>
        <span id="userInfo">{user === null ? "" : `${user.displayName}(${user.loginId})`}</span>
        <span>site.user.delete</span>
      </div>
      <div className="modal-body">
        <p>site.user.deleteConfirm</p>
      </div>
      <div className="modal-footer">
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
          button.yes
        </button>
        <button
          className="ybtn"
          data-dismiss="modal"
          disabled={pending}
          type="button"
          onClick={onCancel}
        >
          button.no
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
  return (
    <SiteAdminPagination
      currentPage={page}
      hrefForPage={(pageNumber) => appHref(runtimeConfig, siteUserListHref(input, pageNumber))}
      totalPages={totalPages}
    />
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
  return (
    <SiteAdminPagination
      currentPage={page}
      hrefForPage={(pageNumber) => appHref(runtimeConfig, siteProjectListHref(input, pageNumber))}
      totalPages={totalPages}
    />
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
  return (
    <SiteAdminPagination
      currentPage={page}
      hrefForPage={(pageNumber) => appHref(runtimeConfig, sitePostListHref(input, pageNumber))}
      totalPages={totalPages}
    />
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
  return (
    <SiteAdminPagination
      currentPage={page}
      hrefForPage={(pageNumber) => appHref(runtimeConfig, siteIssueListHref(input, pageNumber))}
      totalPages={totalPages}
    />
  );
}

function SiteAdminPagination({
  currentPage,
  hrefForPage,
  totalPages,
}: {
  currentPage: number;
  hrefForPage: (page: number) => string;
  totalPages: number;
}) {
  if (totalPages <= 0) {
    return <div id="pagination" />;
  }
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  return (
    <div className="page-navigation-wrap" id="pagination">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <a href={hrefForPage(currentPage - 1)} pjax-page="">
              <i className="ico btn-pg-prev"></i>
              <span>button.prevPage</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">button.prevPage</span>
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
            <a href={hrefForPage(currentPage + 1)} pjax-page="">
              <span>button.nextPage</span>
              <i className="ico btn-pg-next"></i>
            </a>
          ) : (
            <>
              <span className="off">button.nextPage</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}
