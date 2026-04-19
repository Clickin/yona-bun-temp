import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  listOrganizationIssues,
  readOrganizationContainer,
} from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import {
  toOrganizationContainerView,
  toOrganizationIssueListView,
} from "../../../../app-view-models";
import {
  OrganizationIssueListPage,
  type OrganizationIssueListQuery,
} from "../../../-organization-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/organizations/$organizationName/issues")({
  component: OrganizationIssuesRouteComponent,
});

function OrganizationIssuesRouteComponent() {
  const { organizationName } = Route.useParams();
  const { bootstrapping, currentSession, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/organizations/${organizationName}/issues`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toOrganizationContainerView> | null>(
    null,
  );
  const [issueList, setIssueList] = React.useState<ReturnType<
    typeof toOrganizationIssueListView
  > | null>(null);
  const [query, setQuery] = React.useState<OrganizationIssueListQuery>({
    assigneeId: 0,
    authorId: 0,
    filter: "",
    orderBy: "",
    orderDir: "",
    pageNum: 1,
    projectNames: [],
    state: "open",
  });
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle("Organization Issues");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const projectNames = [
          ...searchParams.getAll("projectNames"),
          ...searchParams.getAll("projectNames[]"),
        ].filter(Boolean);
        const nextQuery = {
          assigneeId: Number(searchParams.get("assigneeId") || "0"),
          authorId: Number(searchParams.get("authorId") || "0"),
          filter: searchParams.get("filter") ?? "",
          orderBy: searchParams.get("orderBy") ?? "",
          orderDir: searchParams.get("orderDir") ?? "",
          pageNum: Number(searchParams.get("pageNum") || "1"),
          projectNames,
          state: searchParams.get("state") || "open",
        };
        const [nextDetail, nextIssueList] = await Promise.all([
          readOrganizationContainer(runtimeConfig, organizationName),
          listOrganizationIssues(runtimeConfig, organizationName, nextQuery),
        ]);
        if (!cancelled) {
          setDetail(toOrganizationContainerView(nextDetail));
          setIssueList(toOrganizationIssueListView(nextIssueList));
          setQuery(nextQuery);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        const nextFailureKind = classifyConnectFailure(error);
        if (nextFailureKind) {
          setFailureKind(nextFailureKind);
          return;
        }
        setErrorMessage(
          error instanceof Error ? error.message : "Read organization issues failed.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationName, runtimeConfig, setErrorMessage]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>Loading...</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }

  return (
    <OrganizationIssueListPage
      currentUserId={currentSession?.isAnonymous ? 0 : Number(currentSession?.actorId ?? 0)}
      detail={detail}
      issueList={issueList}
      query={query}
      runtimeConfig={runtimeConfig}
    />
  );
}
