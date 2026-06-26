import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  listProjectIssues,
  listProjectLabels,
  listProjectMilestones,
  massUpdateIssues,
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
  BadRequestPage,
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
  const { bootstrapping, csrfToken, currentSession, messages, runtimeConfig } = useAppRuntime();
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
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  useDocumentTitle("menu.issue");

  const loadIssues = React.useCallback(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const nextQuery = issueListQueryFromSearchParams(searchParams);
        const [nextDetail, nextIssueList, nextLabels, nextMilestones] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          listProjectIssues(runtimeConfig, owner, projectName, {
            assigneeId: nextQuery.assigneeId,
            assigneeLoginId: nextQuery.assigneeLoginId,
            authorId: nextQuery.authorId,
            authorLoginId: nextQuery.authorLoginId,
            commenterId: nextQuery.commenterId,
            dueDate: nextQuery.dueDate,
            filter: nextQuery.filter,
            labelIds: nextQuery.labelIds,
            milestoneId: nextQuery.milestoneId,
            orderBy: nextQuery.orderBy,
            orderDir: nextQuery.orderDir,
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
              categoryId: Number(label.categoryId ?? 0) || null,
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
        setFailureKind("bad-request");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, projectName, runtimeConfig]);

  React.useEffect(() => loadIssues(), [loadIssues]);

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
    <ProjectIssueListPage
      detail={detail}
      issueList={issueList}
      labels={labels}
      messages={messages}
      milestones={milestones}
      onMassUpdate={async (input) => {
        await massUpdateIssues(runtimeConfig, csrfToken, {
          ...input,
          ownerName: owner,
          projectName,
        });
        loadIssues();
      }}
      query={query}
      renderShell={false}
      runtimeConfig={runtimeConfig}
      viewerLoginId={currentSession?.loginId}
      viewerUserId={Number(currentSession?.actorId ?? 0) || undefined}
    />
  );
}

function defaultIssueListQuery(): ProjectIssueListQuery {
  return {
    assigneeLoginId: "",
    authorLoginId: "",
    dueDate: "",
    filter: "",
    labelIds: [],
    milestoneId: 0,
    orderBy: "updatedDate",
    orderDir: "desc",
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
    assigneeId: optionalNumber(searchParams.get("assigneeId")),
    authorId: optionalNumber(searchParams.get("authorId")),
    assigneeLoginId: searchParams.get("assigneeLoginId") ?? "",
    authorLoginId: searchParams.get("authorLoginId") ?? "",
    commenterId: optionalNumber(searchParams.get("commenterId")),
    dueDate: searchParams.get("dueDate") ?? "",
    filter: searchParams.get("filter") ?? "",
    labelIds,
    milestoneId: positiveNumber(searchParams.get("milestoneId")),
    orderBy: searchParams.get("orderBy") ?? "updatedDate",
    orderDir: searchParams.get("orderDir") ?? "desc",
    pageNum: positiveNumber(searchParams.get("pageNum")) || 1,
    state: searchParams.get("state") ?? "",
  };
}

function positiveNumber(value: string | null): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function optionalNumber(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
