import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createOrganization } from "@/auth-workspace-client";
import { useAppRuntime } from "@/app-runtime-context";
import { prefixBasePath } from "@/runtime-config";
import { OrganizationNewPage } from "@/routes/-organization-views";
import { useRequireAuthenticatedRoute } from "@/routes/-shared";

export const Route = createFileRoute("/organizations/new")({
  component: OrganizationNewRouteComponent,
});

function OrganizationNewRouteComponent() {
  const { bootstrapping, csrfToken, messages, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/organizations/new");
  const navigate = useNavigate();

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  return (
    <OrganizationNewPage
      onCreateOrganization={async (input) => {
        try {
          const detail = await createOrganization(runtimeConfig, csrfToken, input);
          void navigate({
            href: prefixBasePath(
              runtimeConfig.basePath,
              `/organizations/${detail.organizationName}`,
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
