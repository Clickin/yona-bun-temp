import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { readOrganizationContainer, updateOrganization } from "@/auth-workspace-client";
import { useAppRuntime } from "@/app-runtime-context";
import { toOrganizationContainerView } from "@/app-view-models";
import { prefixBasePath } from "@/runtime-config";
import { OrganizationSettingsPage } from "@/routes/-organization-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useRequireAuthenticatedRoute,
} from "@/routes/-shared";

export const Route = createFileRoute("/organizations/$organizationName/settingform")({
  component: OrganizationSettingsRouteComponent,
});

function OrganizationSettingsRouteComponent() {
  const { organizationName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute(`/organizations/${organizationName}/settingform`);
  const navigate = useNavigate();
  const [detail, setDetail] = React.useState<ReturnType<typeof toOrganizationContainerView> | null>(
    null,
  );
  const routeHref = `/organizations/${organizationName}/settingform`;
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
        const nextDetail = await readOrganizationContainer(runtimeConfig, organizationName);
        if (!cancelled) {
          setDetail(toOrganizationContainerView(nextDetail));
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
  }, [canRender, organizationName, runtimeConfig]);

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
    <OrganizationSettingsPage
      csrfToken={csrfToken}
      detail={detail}
      messages={messages}
      renderShell={false}
      runtimeConfig={runtimeConfig}
      onUpdateOrganization={async (input) => {
        try {
          const nextDetail = await updateOrganization(runtimeConfig, csrfToken, {
            ...input,
            logoAttachmentId: input.logoAttachmentId ? BigInt(input.logoAttachmentId) : undefined,
          });
          void navigate({
            href: prefixBasePath(
              runtimeConfig.basePath,
              `/organizations/${nextDetail.organizationName}/settingform`,
            ),
          });
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
