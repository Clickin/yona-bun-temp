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
import { RestApiError } from "../../../api/rest-client";
import { OrganizationDetailPage } from "../../-organization-views";
import { navigateToAppHref } from "../../-shared";

export const Route = createFileRoute("/organizations/$organizationName")({
  component: OrganizationLayoutRouteComponent,
});

function OrganizationLayoutRouteComponent() {
  return <Outlet />;
}

function legacyOrganizationEnrollFallback(error: unknown): string {
  if (error instanceof RestApiError) {
    if (error.status === 403) {
      return "error.forbidden";
    }
    if (error.status >= 400 && error.status < 500) {
      return "user.enroll.failed.client";
    }
    if (error.status >= 500 && error.status < 600) {
      return "user.enroll.failed.server";
    }
    return "user.enroll.failed";
  }
  if (error instanceof TypeError) {
    return "user.enroll.failed.network";
  }
  return "user.enroll.failed";
}

export function OrganizationDetailRouteComponent() {
  const { organizationName } = Route.useParams();
  const { csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const [detail, setDetail] = React.useState<ReturnType<typeof toOrganizationContainerView> | null>(
    null,
  );

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
          setErrorMessage(legacyOrganizationEnrollFallback(error));
        }
      }}
      onEnrollOrganization={async (nextOrganizationName) => {
        try {
          const nextDetail = await enrollOrganization(
            runtimeConfig,
            csrfToken,
            nextOrganizationName,
          );
          setDetail(toOrganizationContainerView(nextDetail));
        } catch (error) {
          setErrorMessage(legacyOrganizationEnrollFallback(error));
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
