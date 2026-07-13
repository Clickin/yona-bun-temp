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
    <div className="token-generate">
      <form
        id="frmBasic"
        method="post"
        action={tokenResetAction}
        className="pull-left"
        style={{ width: "100%" }}
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
            style={{ width: "90%" }}
            type="text"
            name="name"
            className="text"
            value={apiToken}
            readOnly
          />
        </div>
        <div>
          <button type="submit" className="ybtn ybtn-success">
            {t("userinfo.recreateToken")}
          </button>
        </div>
      </form>
    </div>
  );
}
