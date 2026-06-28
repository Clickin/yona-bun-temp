import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { setDefaultLandingPathRest } from "../../../api/workspace";
import { listUserIssues } from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { toUserIssueListView } from "../../../app-view-models";
import { UserIssueListPage, type UserIssueListQuery } from "../../-issue-views";
import { BadRequestPage, useDocumentTitle, useRequireAuthenticatedRoute } from "../../-shared";

export const Route = createFileRoute("/user/issues")({
  component: UserIssuesRouteComponent,
});

function UserIssuesRouteComponent() {
  const routePathname = useRouterState({ select: (state) => state.location.pathname });
  if (routePathname.includes("/user/issues/new")) {
    return <Outlet />;
  }

  return <UserIssuesLeafRouteComponent />;
}

function UserIssuesLeafRouteComponent() {
  const {
    bootstrapping,
    csrfToken,
    currentSession,
    messages,
    runtimeConfig,
    setErrorMessage,
    syncWorkspaceFromOverview,
  } = useAppRuntime();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const navigate = useNavigate();
  const canRender = useRequireAuthenticatedRoute("/user/issues");
  const queryClient = useQueryClient();
  const query = React.useMemo<UserIssueListQuery>(() => {
    const searchParams = new URL(locationHref, "http://localhost").searchParams;
    return {
      filter: searchParams.get("filter") || "assigned",
      orderBy: searchParams.get("orderBy") || "updatedDate",
      orderDir: searchParams.get("orderDir") || "desc",
      pageNum: Number(searchParams.get("pageNum") || "1"),
      query: searchParams.get("query") ?? "",
      state: searchParams.get("state") || "open",
    };
  }, [locationHref]);
  const issueListQuery = useQuery({
    enabled: canRender,
    queryFn: async () => toUserIssueListView(await listUserIssues(runtimeConfig, query)),
    queryKey: [
      "user-issues",
      runtimeConfig.apiBaseUrl,
      runtimeConfig.basePath,
      query.filter,
      query.orderBy,
      query.orderDir,
      query.pageNum,
      query.query,
      query.state,
    ],
  });
  const routePath: string = "/user/issues";
  const setDefaultLoginPageMutation = useMutation({
    mutationFn: () => setDefaultLandingPathRest(runtimeConfig, csrfToken, routePath),
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "set Default page failed: ");
    },
    onSuccess: async (overview) => {
      await syncWorkspaceFromOverview(overview);
      void queryClient.invalidateQueries();
    },
  });

  useDocumentTitle("issue.myIssue");

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (issueListQuery.isError) {
    return <BadRequestPage href="/user/issues" />;
  }

  const normalizedDefaultLandingPath = currentSession?.defaultLandingPath?.startsWith("/")
    ? currentSession.defaultLandingPath
    : currentSession?.defaultLandingPath
      ? `/${currentSession.defaultLandingPath}`
      : "";
  const canSetDefaultLoginPage = routePath !== "/" && normalizedDefaultLandingPath !== routePath;

  return (
    <UserIssueListPage
      canSetDefaultLoginPage={canSetDefaultLoginPage}
      issueList={issueListQuery.data ?? null}
      onNavigate={(href) => {
        void navigate({ href });
      }}
      onSetDefaultLoginPage={() => setDefaultLoginPageMutation.mutate()}
      query={query}
      runtimeConfig={runtimeConfig}
    />
  );
}
