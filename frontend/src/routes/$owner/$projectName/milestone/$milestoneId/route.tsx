import * as React from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  closeProjectMilestone,
  deleteProjectMilestone,
  openProjectMilestone,
  readProjectContainer,
  readProjectMilestone,
} from "../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../app-runtime-context";
import {
  toProjectContainerView,
  toProjectMilestoneDetailView,
} from "../../../../../app-view-models";
import { ProjectMilestoneDetailPage } from "../../../../-milestone-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/milestone/$milestoneId")({
  component: ProjectMilestoneDetailRouteComponent,
});

function ProjectMilestoneDetailRouteComponent() {
  const { owner, projectName, milestoneId } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/milestone/${milestoneId}`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [milestone, setMilestone] =
    React.useState<ReturnType<typeof toProjectMilestoneDetailView>>(null);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const isEditFormRoute = window.location.pathname.endsWith("/editform");
  const issueState = new URLSearchParams(window.location.search).get("state") || "open";

  useDocumentTitle(milestone?.title ?? "milestone");

  const reload = React.useCallback(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const [nextDetail, nextMilestone] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          readProjectMilestone(runtimeConfig, owner, projectName, Number(milestoneId)),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setMilestone(toProjectMilestoneDetailView(nextMilestone));
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
  }, [milestoneId, owner, projectName, runtimeConfig]);

  React.useEffect(() => reload(), [reload]);

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
  if (isEditFormRoute) {
    return <Outlet />;
  }

  return (
    <ProjectMilestoneDetailPage
      detail={detail}
      issueState={issueState}
      messages={messages}
      milestone={milestone}
      onClose={async () => {
        const response = await closeProjectMilestone(runtimeConfig, csrfToken, {
          milestoneId: BigInt(Number(milestoneId)),
          ownerName: owner,
          projectName,
        });
        setMilestone(toProjectMilestoneDetailView(response));
      }}
      onDelete={async () => {
        await deleteProjectMilestone(runtimeConfig, csrfToken, {
          milestoneId: BigInt(Number(milestoneId)),
          ownerName: owner,
          projectName,
        });
        navigateToAppHref(runtimeConfig.basePath, `/${owner}/${projectName}/milestones`);
      }}
      onOpen={async () => {
        const response = await openProjectMilestone(runtimeConfig, csrfToken, {
          milestoneId: BigInt(Number(milestoneId)),
          ownerName: owner,
          projectName,
        });
        setMilestone(toProjectMilestoneDetailView(response));
      }}
      owner={owner}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    />
  );
}
