import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { readProjectSettings, updateProject } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { ProjectSettingsPage } from "../../../-project-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "../../../-shared";
import { toProjectContainerView } from "../../../../app-view-models";

export const Route = createFileRoute("/$owner/$projectName/settingform")({
  component: ProjectSettingsRouteComponent,
});

function ProjectSettingsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute(`/${owner}/${projectName}/settingform`);
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const routeHref = `/${owner}/${projectName}/settingform`;
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!canRender) {
      return;
    }
    setFailureKind(null);
    void (async () => {
      try {
        const nextDetail = await readProjectSettings(runtimeConfig, owner, projectName);
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
        setFailureKind("bad-request");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canRender, owner, projectName, runtimeConfig]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>common.loading</h1>
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
    <ProjectSettingsPage
      detail={detail}
      runtimeConfig={runtimeConfig}
      onUpdateProjectSettings={async (input) => {
        try {
          const updated = await updateProject(runtimeConfig, csrfToken, {
            ...input,
            currentOwnerName: owner,
            currentProjectName: projectName,
          });
          const nextDetail = await readProjectSettings(
            runtimeConfig,
            updated.ownerName,
            updated.projectName,
          );
          setDetail(toProjectContainerView(nextDetail));
          navigateToAppHref(
            runtimeConfig.basePath,
            `/${nextDetail.ownerName}/${nextDetail.projectName}/settingform`,
          );
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "error.badrequest");
        }
      }}
    />
  );
}
