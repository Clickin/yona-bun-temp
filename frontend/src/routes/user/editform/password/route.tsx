import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { changePassword } from "@/auth-workspace-client";
import { useAppRuntime } from "@/app-runtime-context";
import { prefixBasePath } from "@/runtime-config";
import { WorkspaceSettingsPage } from "@/routes/-workspace-settings-view";
import { useCurrentHref, useDocumentTitle, useRequireAuthenticatedRoute } from "@/routes/-shared";

export const Route = createFileRoute("/user/editform/password")({
  component: EditPasswordRouteComponent,
});

function EditPasswordRouteComponent() {
  const {
    bootstrapping,
    csrfToken,
    messages,
    runtimeConfig,
    workspaceOverview,
    setCurrentSession,
    setErrorMessage,
    setWorkspaceOverview,
  } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/user/editform/password");
  const navigate = useNavigate();
  const currentHref = useCurrentHref();
  useDocumentTitle("userinfo.accountSetting");

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  return (
    <WorkspaceSettingsPage
      csrfToken={csrfToken}
      messages={messages}
      renderShell={false}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      section="password"
      workspaceOverview={workspaceOverview}
      onChangePassword={async (input) => {
        try {
          const session = await changePassword(runtimeConfig, csrfToken, input);
          setCurrentSession(session);
          setWorkspaceOverview(null);
          void navigate({ href: prefixBasePath(runtimeConfig.basePath, "/users/loginform") });
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
