import * as React from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { readOrganizationContainer } from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { toOrganizationContainerView } from "../../../app-view-models";
import { OrganizationDetailPage } from "../../-organization-views";

export const Route = createFileRoute("/organizations/$organizationName")({
  component: OrganizationLayoutRouteComponent,
});

function OrganizationLayoutRouteComponent() {
  return <Outlet />;
}

export function OrganizationDetailRouteComponent() {
  const { organizationName } = Route.useParams();
  const { runtimeConfig } = useAppRuntime();
  const [detail, setDetail] = React.useState<ReturnType<typeof toOrganizationContainerView> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextDetail = await readOrganizationContainer(runtimeConfig, organizationName);
      if (!cancelled) {
        setDetail(toOrganizationContainerView(nextDetail));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationName, runtimeConfig]);

  return <OrganizationDetailPage detail={detail} runtimeConfig={runtimeConfig} />;
}
