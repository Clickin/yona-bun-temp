import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { resetApiTokenRest, readWorkspaceOverviewRest } from "../../../api/workspace";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";

export const Route = createFileRoute("/user/editform/token")({
  component: UserTokenSettingsRoute,
});

function UserTokenSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <UserTokenSettingsScreen runtimeConfig={runtimeConfig} />;
}

function UserTokenSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const tokenResetAction = prefixBasePath(runtimeConfig.basePath, "/user/editform/token_reset");
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const resetMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return resetApiTokenRest(runtimeConfig, csrfToken);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });
  const apiToken =
    typeof workspaceQuery.data?.apiToken === "string" ? workspaceQuery.data.apiToken : "";

  return (
    <div data-testid="user-token-settings-wrapper" data-owner="user-token-settings-wrapper">
      <form
        id="frmBasic"
        method="post"
        action={tokenResetAction}
        data-owner="user-token-settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          resetMutation.mutate();
        }}
      >
        <div>{t("userinfo.token")}</div>
        <div>
          <input
            onClick={(event) => {
              event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
            }}
            size={45}
            type="text"
            name="name"
            data-owner="user-token-settings-input"
            value={apiToken}
            readOnly
          />
        </div>
        <div>
          <button type="submit" data-owner="user-token-settings-reset-action">
            {t("userinfo.recreateToken")}
          </button>
        </div>
      </form>
    </div>
  );
}
