import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listProjectMilestones, readProjectContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView, toProjectMilestoneListView } from "../../../../app-view-models";
import { ProjectMilestoneListPage } from "../../../-milestone-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/milestones")({
  component: ProjectMilestonesRouteComponent,
});

function ProjectMilestonesRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/milestones`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [list, setList] = React.useState<ReturnType<typeof toProjectMilestoneListView> | null>(
    null,
  );
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  useDocumentTitle("title.milestoneList");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const state = searchParams.get("state") || "open";
        const orderBy = searchParams.get("orderBy") || "dueDate";
        const orderDir = searchParams.get("orderDir") || "asc";
        const [nextDetail, nextList] = await Promise.all([
          readProjectContainer(runtimeConfig, owner, projectName),
          listProjectMilestones(runtimeConfig, owner, projectName, {
            orderBy,
            orderDir,
            state,
          }),
        ]);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
          setList(toProjectMilestoneListView(nextList, state, orderBy, orderDir));
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
    <ProjectMilestoneListPage
      detail={detail}
      list={list}
      messages={messages}
      owner={owner}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    />
  );
}
