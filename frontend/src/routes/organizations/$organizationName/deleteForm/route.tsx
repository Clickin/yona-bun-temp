import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { deleteOrganization, readOrganizationAdmin } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toOrganizationAdminView } from "../../../../app-view-models";
import { OrganizationDeletePage } from "../../../-organization-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  navigateToAppHref,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/organizations/$organizationName/deleteForm")({
  component: OrganizationDeleteRouteComponent,
});

function OrganizationDeleteRouteComponent() {
  const { organizationName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/organizations/${organizationName}/deleteForm`;
  const canRender = useRequireAuthenticatedRoute(routeHref);
  const [detail, setDetail] = React.useState<ReturnType<typeof toOrganizationAdminView> | null>(
    null,
  );
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
        const nextDetail = await readOrganizationAdmin(runtimeConfig, organizationName);
        if (!cancelled) {
          setDetail(toOrganizationAdminView(nextDetail));
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
  }, [canRender, organizationName, runtimeConfig, setErrorMessage]);

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
    <OrganizationDeletePage
      detail={detail}
      runtimeConfig={runtimeConfig}
      onDeleteOrganization={async (nextOrganizationName) => {
        try {
          const result = await deleteOrganization(runtimeConfig, csrfToken, nextOrganizationName);
          navigateToAppHref(runtimeConfig.basePath, result.redirectPath || "/");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "organization.delete.error");
        }
      }}
    />
  );
}
