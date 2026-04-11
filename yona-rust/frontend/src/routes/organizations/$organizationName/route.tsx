import * as React from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { readOrganizationDetail, readOrganizationMembers } from "../../../auth-workspace-client";
import { useAppRuntime } from "../../../app-runtime-context";
import { toOrganizationDetailView, toOrganizationMembersView } from "../../../app-view-models";
import { OrganizationDetailPage } from "../../-organization-views";

export const Route = createFileRoute("/organizations/$organizationName")({
  component: OrganizationLayoutRouteComponent,
});

function OrganizationLayoutRouteComponent() {
  return <Outlet />;
}

export function OrganizationDetailRouteComponent() {
  const { organizationName } = Route.useParams();
  const { currentSession, runtimeConfig } = useAppRuntime();
  const [detail, setDetail] = React.useState<ReturnType<typeof toOrganizationDetailView> | null>(null);
  const [members, setMembers] = React.useState<ReturnType<typeof toOrganizationMembersView> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextDetail = await readOrganizationDetail(runtimeConfig, organizationName);
      if (cancelled) {
        return;
      }
      setDetail(toOrganizationDetailView(nextDetail));
      if (currentSession && !currentSession.isAnonymous && nextDetail.viewerCanUpdate) {
        const nextMembers = await readOrganizationMembers(runtimeConfig, organizationName);
        if (!cancelled) {
          setMembers(toOrganizationMembersView(nextMembers));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSession, organizationName, runtimeConfig]);

  return <OrganizationDetailPage detail={detail} members={members} />;
}
