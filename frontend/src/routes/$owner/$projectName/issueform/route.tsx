import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  createIssue,
  listIssueParentOptions,
  listProjectMilestones,
  readProjectContainer,
  searchProjectAssignableUsers,
} from "../../../../auth-workspace-client";
import { projectIssueReferencesQueryOptions } from "../../../../api/issue-meta";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView, toProjectMilestoneListView } from "../../../../app-view-models";
import { ProjectIssueFormPage } from "../../../-issue-views";
import type { ProjectIssueParentOptionViewModel, ProjectMilestoneViewModel } from "../../../-view-models";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/issueform")({
  component: IssueCreateRouteComponent,
});

function IssueCreateRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/issueform`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [milestones, setMilestones] = React.useState<ProjectMilestoneViewModel[]>([]);
  const [parentIssueOptions, setParentIssueOptions] = React.useState<
    ProjectIssueParentOptionViewModel[]
  >([]);
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle("New Issue");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const initialParentIssueId = Number(searchParams.get("parentIssueId") ?? 0);
        const [nextDetail, nextMilestones, nextParentOptions] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          listProjectMilestones(runtimeConfig, owner, projectName, { state: "all" }),
          listIssueParentOptions(runtimeConfig, owner, projectName),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setMilestones(
            toProjectMilestoneListView(nextMilestones, "all", "dueDate", "asc").milestones,
          );
          setParentIssueOptions(
            nextParentOptions.items.map((option) => ({
              id: Number(option.id),
              issueNumber: Number(option.issueNumber),
              selected: Number(option.id) === initialParentIssueId || option.selected,
              title: option.title,
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
        setErrorMessage(error instanceof Error ? error.message : "Read project failed.");
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
    <ProjectIssueFormPage
      csrfToken={csrfToken}
      detail={detail}
      getIssueReferencesQueryOptions={(query) =>
        projectIssueReferencesQueryOptions(runtimeConfig, {
          ownerName: owner,
          projectName,
          query,
        })
      }
      milestoneOptions={milestones}
      mode="create"
      onSearchAssignableUsers={(query) =>
        searchProjectAssignableUsers(runtimeConfig, {
          ownerName: owner,
          projectName,
          query,
        })
      }
      onSubmit={async ({
        assigneeLoginId,
        attachmentIds,
        bodyMarkdown,
        dueDate,
        isDraft,
        isPublish,
        labelIds,
        milestoneId,
        parentIssueId,
        title,
      }) => {
        const issue = await createIssue(runtimeConfig, csrfToken, {
          assigneeLoginId,
          attachmentIds: attachmentIds.map(BigInt),
          bodyMarkdown,
          dueDate,
          isDraft,
          isPublish,
          labelIds: labelIds.map(BigInt),
          milestoneId: BigInt(milestoneId),
          ownerName: owner,
          parentIssueId: parentIssueId ? BigInt(parentIssueId) : undefined,
          projectName,
          title,
        });
        window.location.assign(`/${owner}/${projectName}/issue/${Number(issue.issueNumber)}`);
      }}
      initialParentIssueId={Number(new URLSearchParams(window.location.search).get("parentIssueId") ?? 0)}
      parentIssueOptions={parentIssueOptions}
      runtimeConfig={runtimeConfig}
    />
  );
}
