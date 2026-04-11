import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listOrganizations } from "../../auth-workspace-client";
import { useAppRuntime } from "../../app-runtime-context";
import { toOrganizationDirectoryView } from "../../app-view-models";
import { OrganizationDirectoryPage } from "../-directory-views";
import { useCurrentHref, useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/orgs")({
  component: OrganizationsRouteComponent,
});

function OrganizationsRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  const currentHref = useCurrentHref();
  useDocumentTitle("Organization List");
  const [organizationDirectory, setOrganizationDirectory] = React.useState<ReturnType<typeof toOrganizationDirectoryView> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const organizations = await listOrganizations(runtimeConfig);
      if (!cancelled) {
        setOrganizationDirectory(toOrganizationDirectoryView(organizations));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runtimeConfig]);

  return (
    <OrganizationDirectoryPage
      directory={organizationDirectory}
      href={currentHref}
      runtimeConfig={runtimeConfig}
    />
  );
}
