import * as React from "react";
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
  const [issueList, setIssueList] = React.useState<ReturnType<typeof toUserIssueListView> | null>(
    null,
  );
  const [readFailed, setReadFailed] = React.useState(false);
  const [query, setQuery] = React.useState<UserIssueListQuery>({
    filter: "assigned",
    orderBy: "updatedDate",
    orderDir: "desc",
    pageNum: 1,
    query: "",
    state: "open",
  });

  useDocumentTitle("issue.myIssue");

  React.useEffect(() => {
    if (!canRender) {
      return;
    }
    let cancelled = false;
    setReadFailed(false);
    void (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const nextQuery = {
          filter: searchParams.get("filter") || "assigned",
          orderBy: searchParams.get("orderBy") || "updatedDate",
          orderDir: searchParams.get("orderDir") || "desc",
          pageNum: Number(searchParams.get("pageNum") || "1"),
          query: searchParams.get("query") ?? "",
          state: searchParams.get("state") || "open",
        };
        const nextIssueList = await listUserIssues(runtimeConfig, nextQuery);
        if (!cancelled) {
          setIssueList(toUserIssueListView(nextIssueList));
          setQuery(nextQuery);
        }
      } catch {
        if (!cancelled) {
          setReadFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canRender, locationHref, runtimeConfig, setErrorMessage]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (readFailed) {
    return <BadRequestPage href="/user/issues" />;
  }

  const routePath: string = "/user/issues";
  const normalizedDefaultLandingPath = currentSession?.defaultLandingPath?.startsWith("/")
    ? currentSession.defaultLandingPath
    : currentSession?.defaultLandingPath
      ? `/${currentSession.defaultLandingPath}`
      : "";
  const canSetDefaultLoginPage = routePath !== "/" && normalizedDefaultLandingPath !== routePath;
  const setDefaultLoginPage = async () => {
    try {
      const overview = await setDefaultLandingPathRest(runtimeConfig, csrfToken, routePath);
      await syncWorkspaceFromOverview(overview);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "set Default page failed: ");
    }
  };

  return (
    <UserIssueListPage
      canSetDefaultLoginPage={canSetDefaultLoginPage}
      issueList={issueList}
      onNavigate={(href) => {
        void navigate({ href });
      }}
      onSetDefaultLoginPage={setDefaultLoginPage}
      query={query}
      runtimeConfig={runtimeConfig}
    />
  );
}
