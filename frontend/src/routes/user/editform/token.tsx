import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { resetApiTokenRest, readWorkspaceOverviewRest } from "../../../api/workspace";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

const legacyEditTabLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
const legacyEditTabLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;
const legacyEditTabLinkInactiveSearch = { __legacyEditTabActiveMarker: undefined };

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
  const loginId =
    typeof workspaceQuery.data?.profile?.loginId === "string"
      ? workspaceQuery.data.profile.loginId
      : "";

  return (
    <>
      <UserTokenSettingsTitle loginId={loginId} />
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{t("userinfo.token")}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <EditTabMenu active="token" />
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
        </div>
      </div>
    </>
  );
}

function UserTokenSettingsTitle({ loginId }: { loginId: string }) {
  return loginId ? <title>{loginId}</title> : null;
}

function EditTabMenu({ active }: { active: string }) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs mt20">
      <li className={active === "profile" ? "active" : undefined}>
        <Link
          to="/user/editform"
          search={legacyEditTabLinkInactiveSearch}
          activeOptions={legacyEditTabLinkActiveOptions}
          activeProps={legacyEditTabLinkActiveProps}
        >
          {t("userinfo.editProfile")}
        </Link>
      </li>
      <li className={active === "password" ? "active" : undefined}>
        <Link
          to="/user/editform/password"
          search={legacyEditTabLinkInactiveSearch}
          activeOptions={legacyEditTabLinkActiveOptions}
          activeProps={legacyEditTabLinkActiveProps}
        >
          {t("userinfo.changePassword")}
        </Link>
      </li>
      <li className={active === "notifications" ? "active" : undefined}>
        <Link
          to="/user/editform/notifications"
          search={legacyEditTabLinkInactiveSearch}
          activeOptions={legacyEditTabLinkActiveOptions}
          activeProps={legacyEditTabLinkActiveProps}
        >
          {t("userinfo.changeNotifications")}
        </Link>
      </li>
      <li className={active === "emails" ? "active" : undefined}>
        <Link
          to="/user/editform/emails"
          search={legacyEditTabLinkInactiveSearch}
          activeOptions={legacyEditTabLinkActiveOptions}
          activeProps={legacyEditTabLinkActiveProps}
        >
          {t("userinfo.changeEmails")}
        </Link>
      </li>
      <li className={active === "token" ? "active" : undefined}>
        <Link
          to="/user/editform/token"
          search={legacyEditTabLinkInactiveSearch}
          activeOptions={legacyEditTabLinkActiveOptions}
          activeProps={legacyEditTabLinkActiveProps}
        >
          {t("userinfo.token")}
        </Link>
      </li>
    </ul>
  );
}
