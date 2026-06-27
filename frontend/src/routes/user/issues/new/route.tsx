import * as React from "react";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  createIssue,
  listProjectMilestones,
  readDirectIssueFormOptions,
  readProjectContainer,
  searchProjectAssignableUsers,
} from "@/auth-workspace-client";
import { projectIssueReferencesQueryOptions } from "@/api/issue-meta";
import { useAppRuntime } from "@/app-runtime-context";
import { toProjectContainerView, toProjectMilestoneListView } from "@/app-view-models";
import { prefixBasePath } from "@/runtime-config";
import { ProjectIssueFormPage } from "@/routes/-issue-views";
import type { ProjectMilestoneViewModel } from "@/routes/-view-models";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
  useRequireAuthenticatedRoute,
} from "@/routes/-shared";

export const Route = createFileRoute("/user/issues/new")({
  component: DirectIssueCreateRouteComponent,
});

function DirectIssueCreateRouteComponent() {
  if (window.location.pathname.endsWith("/mine")) {
    return <Outlet />;
  }

  return <DirectIssueCreateFormRouteComponent routeHref="/user/issues/new" />;
}

export function DirectIssueCreateFormRouteComponent(props: { mine?: boolean; routeHref: string }) {
  const { bootstrapping, csrfToken, messages, runtimeConfig } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute(props.routeHref);
  const navigate = useNavigate();
  const [options, setOptions] = React.useState<Awaited<
    ReturnType<typeof readDirectIssueFormOptions>
  > | null>(null);
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [milestones, setMilestones] = React.useState<ProjectMilestoneViewModel[]>([]);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  useDocumentTitle("title.newIssue");

  React.useEffect(() => {
    if (!canRender) {
      return;
    }
    let cancelled = false;
    setFailureKind(null);
    setOptions(null);
    setDetail(null);
    void (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const nextOptions = await readDirectIssueFormOptions(runtimeConfig, {
          commentId: searchParams.get("commentId"),
          mine: props.mine,
        });
        if (cancelled) {
          return;
        }
        setOptions(nextOptions);
        const [nextDetail, nextMilestones] = await Promise.all([
          readProjectContainer(
            runtimeConfig,
            nextOptions.selectedProject.ownerName,
            nextOptions.selectedProject.projectName,
          ),
          listProjectMilestones(
            runtimeConfig,
            nextOptions.selectedProject.ownerName,
            nextOptions.selectedProject.projectName,
            { state: "all" },
          ),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setMilestones(
            toProjectMilestoneListView(nextMilestones, "all", "dueDate", "asc").milestones,
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
  }, [canRender, props.mine, runtimeConfig]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={props.routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={props.routeHref} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={props.routeHref} />;
  }
  if (!options) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  const ownerName = options.selectedProject.ownerName;
  const projectName = options.selectedProject.projectName;
  return (
    <ProjectIssueFormPage
      csrfToken={csrfToken}
      detail={detail}
      getIssueReferencesQueryOptions={(query) =>
        projectIssueReferencesQueryOptions(runtimeConfig, {
          ownerName,
          projectName,
          query,
        })
      }
      initialBodyMarkdown={options.bodyMarkdown}
      milestoneOptions={milestones}
      mode="create"
      onSearchAssignableUsers={(query) =>
        searchProjectAssignableUsers(runtimeConfig, {
          ownerName,
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
          ownerName,
          projectName,
          referCommentId: options.referCommentId,
          title,
        });
        void navigate({
          href: prefixBasePath(
            runtimeConfig.basePath,
            `/${ownerName}/${projectName}/issue/${Number(issue.issueNumber)}`,
          ),
        });
      }}
      referCommentId={options.referCommentId}
      runtimeConfig={runtimeConfig}
    />
  );
}
