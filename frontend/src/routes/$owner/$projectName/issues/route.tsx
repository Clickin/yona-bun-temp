import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  listProjectIssues,
  listProjectLabels,
  listProjectMilestones,
  readProjectContainer,
} from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView, toProjectIssueListView } from "../../../../app-view-models";
import type {
  IssueListFilterLabel,
  IssueListFilterMilestone,
  ProjectIssueListQuery,
} from "../../../-issue-views";
import { ProjectIssueListPage } from "../../../-issue-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/issues")({
  component: ProjectIssuesRouteComponent,
});

function ProjectIssuesRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/issues`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [issueList, setIssueList] = React.useState<ReturnType<
    typeof toProjectIssueListView
  > | null>(null);
  const [query, setQuery] = React.useState<ProjectIssueListQuery>(() => defaultIssueListQuery());
  const [labels, setLabels] = React.useState<IssueListFilterLabel[]>([]);
  const [milestones, setMilestones] = React.useState<IssueListFilterMilestone[]>([]);
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle("Issues");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const nextQuery = issueListQueryFromSearchParams(searchParams);
        const [nextDetail, nextIssueList, nextLabels, nextMilestones] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          listProjectIssues(runtimeConfig, owner, projectName, {
            assigneeLoginId: nextQuery.assigneeLoginId,
            authorLoginId: nextQuery.authorLoginId,
            labelIds: nextQuery.labelIds,
            milestoneId: nextQuery.milestoneId,
            pageNum: nextQuery.pageNum,
            state: nextQuery.state,
          }),
          listProjectLabels(runtimeConfig, owner, projectName),
          listProjectMilestones(runtimeConfig, owner, projectName, { state: "all" }),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setIssueList(toProjectIssueListView(nextIssueList));
          setQuery(nextQuery);
          setLabels(
            nextLabels.labels.map((label) => ({
              categoryName: label.categoryName,
              color: label.color,
              id: Number(label.id),
              name: label.name,
            })),
          );
          setMilestones(
            nextMilestones.milestones.map((milestone) => ({
              id: Number(milestone.id),
              state: milestone.state,
              title: milestone.title,
            })),
          );
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
        setErrorMessage(error instanceof Error ? error.message : "Read project issues failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, projectName, runtimeConfig, setErrorMessage]);

  if (bootstrapping) {
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

  return (
    <ProjectIssueListPage
      detail={detail}
      issueList={issueList}
      labels={labels}
      milestones={milestones}
      query={query}
      runtimeConfig={runtimeConfig}
    />
  );
}

function defaultIssueListQuery(): ProjectIssueListQuery {
  return {
    assigneeLoginId: "",
    authorLoginId: "",
    labelIds: [],
    milestoneId: 0,
    pageNum: 1,
    state: "",
  };
}

function issueListQueryFromSearchParams(searchParams: URLSearchParams): ProjectIssueListQuery {
  const labelIds: number[] = [];
  for (const value of searchParams.getAll("labelIds").concat(searchParams.getAll("labelIds[]"))) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      labelIds.push(parsed);
    }
  }

  return {
    assigneeLoginId: searchParams.get("assigneeLoginId") ?? "",
    authorLoginId: searchParams.get("authorLoginId") ?? "",
    labelIds,
    milestoneId: positiveNumber(searchParams.get("milestoneId")),
    pageNum: positiveNumber(searchParams.get("pageNum")) || 1,
    state: searchParams.get("state") ?? "",
  };
}

function positiveNumber(value: string | null): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
