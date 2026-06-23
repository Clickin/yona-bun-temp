import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  acceptOrganizationEnrollment,
  addOrganizationMember,
  deleteOrganizationMember,
  readOrganizationAdmin,
  updateOrganizationMemberRole,
} from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toOrganizationAdminView } from "../../../../app-view-models";
import { OrganizationMembersPage } from "../../../-organization-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "../../../-shared";

export const Route = createFileRoute("/organizations/$organizationName/members")({
  component: OrganizationMembersRouteComponent,
});

function OrganizationMembersRouteComponent() {
  const { organizationName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/organizations/${organizationName}/members`;
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
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
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
    <OrganizationMembersPage
      detail={detail}
      messages={messages}
      runtimeConfig={runtimeConfig}
      onAcceptEnrollment={async (nextOrganizationName, userId) => {
        try {
          const nextDetail = await acceptOrganizationEnrollment(runtimeConfig, csrfToken, {
            organizationName: nextOrganizationName,
            userId: BigInt(userId),
          });
          setDetail(toOrganizationAdminView(nextDetail));
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
      onAddMember={async (nextOrganizationName, loginId) => {
        try {
          const nextDetail = await addOrganizationMember(runtimeConfig, csrfToken, {
            organizationName: nextOrganizationName,
            loginId,
          });
          setDetail(toOrganizationAdminView(nextDetail));
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
      onDeleteMember={async (nextOrganizationName, userId) => {
        try {
          const nextDetail = await deleteOrganizationMember(runtimeConfig, csrfToken, {
            organizationName: nextOrganizationName,
            userId: BigInt(userId),
          });
          setDetail(toOrganizationAdminView(nextDetail));
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
      onUpdateMemberRole={async (nextOrganizationName, userId, role) => {
        try {
          const nextDetail = await updateOrganizationMemberRole(runtimeConfig, csrfToken, {
            organizationName: nextOrganizationName,
            role,
            userId: BigInt(userId),
          });
          setDetail(toOrganizationAdminView(nextDetail));
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : messages("error.badrequest", { fallback: "error.badrequest" }),
          );
        }
      }}
    />
  );
}
