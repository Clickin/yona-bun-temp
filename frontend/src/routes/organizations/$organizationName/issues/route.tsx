import * as React from "react";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
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
  BadRequestPage,
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
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const navigate = useNavigate();
  const { bootstrapping, currentSession, messages, runtimeConfig } = useAppRuntime();
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
    mentionId: 0,
    orderBy: "",
    orderDir: "",
    pageNum: 1,
    projectNames: [],
    state: "open",
  });
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  useDocumentTitle("title.issueList");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const searchParams = new URL(locationHref, "http://localhost").searchParams;
        const projectNames = [
          ...searchParams.getAll("projectNames"),
          ...searchParams.getAll("projectNames[]"),
        ].filter(Boolean);
        const nextQuery = {
          assigneeId: Number(searchParams.get("assigneeId") || "0"),
          authorId: Number(searchParams.get("authorId") || "0"),
          filter: searchParams.get("filter") ?? "",
          mentionId: Number(searchParams.get("mentionId") || "0"),
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
        setFailureKind("bad-request");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locationHref, organizationName, runtimeConfig]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={routeHref} />;
  }

  return (
    <OrganizationIssueListPage
      currentUserId={currentSession?.isAnonymous ? 0 : Number(currentSession?.actorId ?? 0)}
      detail={detail}
      issueList={issueList}
      messages={messages}
      onNavigate={(href) => {
        void navigate({ href });
      }}
      query={query}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
