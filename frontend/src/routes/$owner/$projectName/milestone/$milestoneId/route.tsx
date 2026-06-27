import * as React from "react";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  closeProjectMilestone,
  deleteProjectMilestone,
  massUpdateIssues,
  openProjectMilestone,
  readProjectContainer,
  readProjectMilestone,
} from "../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../app-runtime-context";
import {
  toProjectContainerView,
  toProjectMilestoneDetailView,
} from "../../../../../app-view-models";
import { prefixBasePath } from "../../../../../runtime-config";
import { ProjectMilestoneDetailPage } from "../../../../-milestone-views";
import type { MilestoneIssueMassUpdateInput } from "../../../../-milestone-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/milestone/$milestoneId")({
  component: ProjectMilestoneDetailRouteComponent,
});

function ProjectMilestoneDetailRouteComponent() {
  const { owner, projectName, milestoneId } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const routePathname = useRouterState({ select: (state) => state.location.pathname });
  const routeHref = `/${owner}/${projectName}/milestone/${milestoneId}`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [milestone, setMilestone] =
    React.useState<ReturnType<typeof toProjectMilestoneDetailView>>(null);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const isEditFormRoute = routePathname.endsWith("/editform");
  const issueState = new URL(locationHref, "http://localhost").searchParams.get("state") || "open";

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
        void navigate({
          href: prefixBasePath(runtimeConfig.basePath, `/${owner}/${projectName}/milestones`),
        });
      }}
      onMassUpdate={async (input: MilestoneIssueMassUpdateInput & { issueNumbers: number[] }) => {
        await massUpdateIssues(runtimeConfig, csrfToken, {
          ...input,
          issueNumbers: input.issueNumbers.map((issueNumber) => BigInt(issueNumber)),
          ownerName: owner,
          projectName,
        });
        reload();
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
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
