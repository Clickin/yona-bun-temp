import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createProjectMilestone, readProjectContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { buildProjectHref } from "../../../-project-views";
import { ProjectMilestoneFormPage } from "../../../-milestone-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/newMilestoneForm")({
  component: NewMilestoneFormRouteComponent,
});

function NewMilestoneFormRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/newMilestoneForm`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle("New Milestone");

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        const nextDetail = await readProjectContainer(runtimeConfig, owner, projectName);
        if (!cancelled) {
          setDetail(toProjectContainerView(nextDetail));
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
    <ProjectMilestoneFormPage
      detail={detail}
      mode="create"
      onSubmit={async (input) => {
        const response = await createProjectMilestone(runtimeConfig, csrfToken, {
          contentsMarkdown: input.contentsMarkdown,
          dueDate: input.dueDate,
          ownerName: owner,
          projectName,
          state: input.state,
          title: input.title,
        });
        const milestoneId = response.milestone?.id ? Number(response.milestone.id) : 0;
        window.location.assign(
          buildProjectHref(runtimeConfig, owner, projectName, `milestone/${milestoneId}`),
        );
      }}
      owner={owner}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    />
  );
}
