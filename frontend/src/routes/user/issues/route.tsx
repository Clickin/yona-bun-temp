import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listUserIssues } from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { toUserIssueListView } from "../../../app-view-models";
import { UserIssueListPage, type UserIssueListQuery } from "../../-issue-views";
import { useDocumentTitle, useRequireAuthenticatedRoute } from "../../-shared";

export const Route = createFileRoute("/user/issues")({
  component: UserIssuesRouteComponent,
});

function UserIssuesRouteComponent() {
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/user/issues");
  const [issueList, setIssueList] = React.useState<ReturnType<typeof toUserIssueListView> | null>(
    null,
  );
  const [query, setQuery] = React.useState<UserIssueListQuery>({
    filter: "assigned",
    orderBy: "updatedDate",
    orderDir: "desc",
    pageNum: 1,
    query: "",
    state: "open",
  });

  useDocumentTitle("User Issues");

  React.useEffect(() => {
    if (!canRender) {
      return;
    }
    let cancelled = false;
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
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Read user issues failed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canRender, runtimeConfig, setErrorMessage]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>Loading...</h1>
      </main>
    );
  }

  return <UserIssueListPage issueList={issueList} query={query} runtimeConfig={runtimeConfig} />;
}
