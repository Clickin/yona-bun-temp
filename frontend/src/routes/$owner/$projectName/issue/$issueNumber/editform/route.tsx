import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  listProjectMilestones,
  listIssueParentOptions,
  readIssueDetail,
  readProjectContainer,
  searchIssueMentionUsers,
  searchProjectAssignableUsers,
  updateIssue,
} from "../../../../../../auth-workspace-client";
import { projectIssueReferencesQueryOptions } from "../../../../../../api/issue-meta";
import { useAppRuntime } from "../../../../../../app-runtime-context";
import {
  toProjectContainerView,
  toProjectIssueDetailView,
  toProjectMilestoneListView,
} from "../../../../../../app-view-models";
import { prefixBasePath } from "../../../../../../runtime-config";
import { ProjectIssueFormPage } from "../../../../../-issue-views";
import type {
  ProjectIssueParentOptionViewModel,
  ProjectMilestoneViewModel,
} from "../../../../../-view-models";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/issue/$issueNumber/editform")({
  component: IssueEditRouteComponent,
});

function IssueEditRouteComponent() {
  const { owner, projectName, issueNumber } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();
  const routeHref = `/${owner}/${projectName}/issue/${issueNumber}/editform`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [issue, setIssue] = React.useState<ReturnType<typeof toProjectIssueDetailView> | null>(
    null,
  );
  const [milestones, setMilestones] = React.useState<ProjectMilestoneViewModel[]>([]);
  const [parentIssueOptions, setParentIssueOptions] = React.useState<
    ProjectIssueParentOptionViewModel[]
  >([]);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  useDocumentTitle("title.editIssue");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const [nextDetail, nextIssue, nextMilestones, nextParentOptions] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          readIssueDetail(runtimeConfig, owner, projectName, Number(issueNumber)),
          listProjectMilestones(runtimeConfig, owner, projectName, { state: "all" }),
          listIssueParentOptions(runtimeConfig, owner, projectName, {
            currentIssueNumber: issueNumber,
          }),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setIssue(toProjectIssueDetailView(nextIssue));
          setMilestones(
            toProjectMilestoneListView(nextMilestones, "all", "dueDate", "asc").milestones,
          );
          setParentIssueOptions(
            nextParentOptions.items.map((option) => ({
              id: Number(option.id),
              issueNumber: Number(option.issueNumber),
              selected: option.selected,
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
        setFailureKind("bad-request");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [issueNumber, owner, projectName, runtimeConfig]);

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
      initialIssue={issue}
      milestoneOptions={milestones}
      mode="edit"
      onSearchAssignableUsers={(query) =>
        searchProjectAssignableUsers(runtimeConfig, {
          ownerName: owner,
          projectName,
          query,
        })
      }
      onSearchMentionUsers={(query, context) =>
        searchIssueMentionUsers(runtimeConfig, {
          context,
          issueNumber: BigInt(Number(issueNumber)),
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
        const updated = await updateIssue(runtimeConfig, csrfToken, {
          assigneeLoginId,
          attachmentIds: attachmentIds.map(BigInt),
          bodyMarkdown,
          dueDate,
          isDraft,
          isPublish,
          issueNumber: BigInt(Number(issueNumber)),
          labelIds: labelIds.map(BigInt),
          milestoneId: BigInt(milestoneId),
          ownerName: owner,
          parentIssueId: parentIssueId ? BigInt(parentIssueId) : undefined,
          projectName,
          title,
        });
        void navigate({
          href: prefixBasePath(
            runtimeConfig.basePath,
            `/${owner}/${projectName}/issue/${Number(updated.issueNumber)}`,
          ),
        });
      }}
      parentIssueOptions={parentIssueOptions}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
