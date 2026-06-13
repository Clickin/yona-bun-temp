import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listOrganizations } from "../../auth-workspace-client";
import { useAppRuntime } from "../../app-runtime-context";
import { toOrganizationDirectoryView } from "../../app-view-models";
import { OrganizationDirectoryPage } from "../-directory-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useCurrentHref,
  useDocumentTitle,
  type RouteFailureKind,
} from "../-shared";

export const Route = createFileRoute("/orgs")({
  component: OrganizationsRouteComponent,
});

function OrganizationsRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  const currentHref = useCurrentHref();
  useDocumentTitle("Organization List");
  const [organizationDirectory, setOrganizationDirectory] = React.useState<ReturnType<typeof toOrganizationDirectoryView> | null>(null);
  const [failureKind, setFailureKind] = React.useState<null | RouteFailureKind>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const organizations = await listOrganizations(runtimeConfig);
        if (!cancelled) {
          setFailureKind(null);
          setOrganizationDirectory(toOrganizationDirectoryView(organizations));
        }
      } catch (error) {
        if (!cancelled) {
          setFailureKind(classifyConnectFailure(error));
          setOrganizationDirectory(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runtimeConfig]);

  if (failureKind === "forbidden") {
    return <ForbiddenPage href={currentHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={currentHref} />;
  }

  return (
    <OrganizationDirectoryPage
      directory={organizationDirectory}
      href={currentHref}
      runtimeConfig={runtimeConfig}
    />
  );
}
