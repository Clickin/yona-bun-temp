import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { resetApiTokenRest, readWorkspaceOverviewRest } from "../../../api/workspace";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/user/editform/token")({
  component: UserTokenSettingsRoute,
});

function UserTokenSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <UserTokenSettingsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function UserTokenSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
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
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{t("userinfo.token")}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <EditTabMenu active="token" basePath={runtimeConfig.basePath} />
          <div className="token-generate">
            <form
              id="frmBasic"
              method="post"
              action={prefixBasePath(runtimeConfig.basePath, "/user/editform/token_reset")}
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
        </div>
      </div>
    </>
  );
}

function EditTabMenu({ active, basePath }: { active: string; basePath: string }) {
  const { t } = useLegacyMessages();
  const tabs = [
    ["/user/editform", "profile", "userinfo.editProfile"],
    ["/user/editform/password", "password", "userinfo.changePassword"],
    ["/user/editform/notifications", "notifications", "userinfo.changeNotifications"],
    ["/user/editform/emails", "emails", "userinfo.changeEmails"],
    ["/user/editform/token", "token", "userinfo.token"],
  ] as const;

  return (
    <ul className="nav nav-tabs mt20">
      {tabs.map(([href, id, messageKey]) => (
        <li key={id} className={active === id ? "active" : undefined}>
          <a href={prefixBasePath(basePath, href)}>{t(messageKey)}</a>
        </li>
      ))}
    </ul>
  );
}
