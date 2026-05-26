import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { readOrganizationContainer, updateOrganization } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { OrganizationSettingsPage } from "../../../-organization-views";
import { navigateToAppHref, useRequireAuthenticatedRoute } from "../../../-shared";
import { toOrganizationContainerView } from "../../../../app-view-models";

export const Route = createFileRoute("/organizations/$organizationName/settingform")({
  component: OrganizationSettingsRouteComponent,
});

function OrganizationSettingsRouteComponent() {
  const { organizationName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute(`/organizations/${organizationName}/settingform`);
  const [detail, setDetail] = React.useState<ReturnType<typeof toOrganizationContainerView> | null>(
    null,
  );

  React.useEffect(() => {
    let cancelled = false;
    if (!canRender) {
      return;
    }
    void (async () => {
      const nextDetail = await readOrganizationContainer(runtimeConfig, organizationName);
      if (!cancelled) {
        setDetail(toOrganizationContainerView(nextDetail));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canRender, organizationName, runtimeConfig]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  return (
    <OrganizationSettingsPage
      csrfToken={csrfToken}
      detail={detail}
      runtimeConfig={runtimeConfig}
      onUpdateOrganization={async (input) => {
        try {
          const nextDetail = await updateOrganization(runtimeConfig, csrfToken, {
            ...input,
            logoAttachmentId: input.logoAttachmentId ? BigInt(input.logoAttachmentId) : undefined,
          });
          navigateToAppHref(
            runtimeConfig.basePath,
            `/organizations/${nextDetail.organizationName}/settingform`,
          );
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Update organization failed.");
        }
      }}
    />
  );
}
