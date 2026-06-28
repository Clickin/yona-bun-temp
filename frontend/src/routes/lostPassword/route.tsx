import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { requestPasswordReset } from "../../auth-workspace-client";
import { prefixBasePath } from "../../runtime-config";
import { LostPasswordPage } from "../-auth-views";
import { useCurrentHref, useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/lostPassword")({
  component: LostPasswordRouteComponent,
});

function LostPasswordRouteComponent() {
  const { csrfToken, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentHref = useCurrentHref();
  const passwordResetMutation = useMutation({
    mutationFn: (input: { emailAddress: string; loginId: string }) =>
      requestPasswordReset(runtimeConfig, csrfToken, input),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
  useDocumentTitle("site.resetPasswordEmail.title");
  return (
    <LostPasswordPage
      csrfToken={csrfToken}
      routeHref={currentHref}
      runtimeConfig={runtimeConfig}
      onRequestReset={async (input) => {
        try {
          const result = await passwordResetMutation.mutateAsync(input);
          void navigate({ href: prefixBasePath(runtimeConfig.basePath, result.redirectPath) });
        } catch {
          void navigate({
            href: prefixBasePath(runtimeConfig.basePath, "/lostPassword?error=invalid"),
          });
        }
      }}
    />
  );
}
