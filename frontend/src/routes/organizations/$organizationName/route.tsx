import * as React from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import {
  cancelEnrollOrganization,
  enrollOrganization,
  leaveOrganization,
  readOrganizationContainer,
} from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { toOrganizationContainerView } from "../../../app-view-models";
import { OrganizationDetailPage } from "../../-organization-views";
import { navigateToAppHref } from "../../-shared";

export const Route = createFileRoute("/organizations/$organizationName")({
  component: OrganizationLayoutRouteComponent,
});

function OrganizationLayoutRouteComponent() {
  return <Outlet />;
}

export function OrganizationDetailRouteComponent() {
  const { organizationName } = Route.useParams();
  const { csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const [detail, setDetail] = React.useState<ReturnType<typeof toOrganizationContainerView> | null>(null);

  const refreshContainer = React.useCallback(async () => {
    const nextDetail = await readOrganizationContainer(runtimeConfig, organizationName);
    setDetail(toOrganizationContainerView(nextDetail));
  }, [organizationName, runtimeConfig]);

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

  return (
    <OrganizationDetailPage
      detail={detail}
      runtimeConfig={runtimeConfig}
      onCancelEnrollOrganization={async (nextOrganizationName) => {
        try {
          const nextDetail = await cancelEnrollOrganization(
            runtimeConfig,
            csrfToken,
            nextOrganizationName,
          );
          setDetail(toOrganizationContainerView(nextDetail));
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Server Error");
        }
      }}
      onEnrollOrganization={async (nextOrganizationName) => {
        try {
          const nextDetail = await enrollOrganization(runtimeConfig, csrfToken, nextOrganizationName);
          setDetail(toOrganizationContainerView(nextDetail));
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Server Error");
        }
      }}
      onLeaveOrganization={async (nextOrganizationName) => {
        try {
          const result = await leaveOrganization(runtimeConfig, csrfToken, nextOrganizationName);
          if (result.redirectPath) {
            navigateToAppHref(runtimeConfig.basePath, result.redirectPath);
            return;
          }
          await refreshContainer();
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : "organization.member.leave.unknownerror",
          );
        }
      }}
    />
  );
}
