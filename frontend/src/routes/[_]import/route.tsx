import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  importProjectRest,
  readProjectCreateFormOptionsRest,
  type ProjectCreateFormOptionsResponse,
} from "../../api/org-project";
import { useAppRuntime } from "../../app-runtime-context";
import { ProjectImportPage } from "../-project-views";
import { BadRequestPage, navigateToAppHref, useRequireAuthenticatedRoute } from "../-shared";

export const Route = createFileRoute("/_import")({
  component: ProjectImportRouteComponent,
});

function ProjectImportRouteComponent() {
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/_import");
  const [formOptions, setFormOptions] = React.useState<ProjectCreateFormOptionsResponse | null>(
    null,
  );
  const [readFailed, setReadFailed] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (bootstrapping || !canRender) {
      return;
    }
    const owner = new URLSearchParams(window.location.search).get("owner") ?? undefined;
    let cancelled = false;
    setReadFailed(false);
    void readProjectCreateFormOptionsRest(runtimeConfig, { owner })
      .then((options) => {
        if (!cancelled) {
          setFormOptions(options);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReadFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bootstrapping, canRender, runtimeConfig]);

  if (bootstrapping || !canRender || !formOptions) {
    if (readFailed) {
      return <BadRequestPage href="/_import" />;
    }
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  return (
    <ProjectImportPage
      basePath={runtimeConfig.basePath}
      defaultProjectMenus={runtimeConfig.projectDefaultMenus}
      defaultProjectScope={runtimeConfig.projectDefaultScope}
      csrfToken={csrfToken}
      onImportProject={async (input) => {
        setPending(true);
        setErrorMessage(null);
        try {
          const imported = await importProjectRest(runtimeConfig, csrfToken, input);
          navigateToAppHref(runtimeConfig.basePath, imported.redirectPath);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        } finally {
          setPending(false);
        }
      }}
      ownerOptions={formOptions.ownerOptions}
      pending={pending}
      selectedOwnerName={formOptions.selectedOwnerName}
    />
  );
}
