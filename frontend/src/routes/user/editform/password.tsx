import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { changePasswordRest, readWorkspaceOverviewRest } from "../../../api/workspace";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/user/editform/password")({
  component: UserPasswordSettingsRoute,
});

function UserPasswordSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <UserPasswordSettingsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function UserPasswordSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const loginId = workspaceQuery.data?.profile?.loginId ?? "";
  const passwordMutation = useMutation({
    mutationFn: async (input: {
      loginId: string;
      oldPassword: string;
      password: string;
      retypedPassword: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return changePasswordRest(runtimeConfig, csrfToken, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      window.location.href = prefixBasePath(runtimeConfig.basePath, "/users/loginform");
    },
  });

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{t("userinfo.accountSetting")}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <EditTabMenu active="password" basePath={runtimeConfig.basePath} />

          <form
            id="frmPassword"
            method="post"
            action={prefixBasePath(runtimeConfig.basePath, "/user/resetPassword")}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              passwordMutation.mutate({
                loginId: String(formData.get("loginId") ?? ""),
                oldPassword: String(formData.get("oldPassword") ?? ""),
                password: String(formData.get("password") ?? ""),
                retypedPassword: String(formData.get("retypedPassword") ?? ""),
              });
            }}
          >
            <input type="hidden" name="loginId" value={loginId} />
            <dl>
              <dt>{t("user.currentPassword")}</dt>
              <dd className="mt10">
                <input type="password" id="oldPassword" name="oldPassword" autoComplete="off" />
              </dd>
              <dt>{t("user.newPassword")}</dt>
              <dd className="mt10">
                <input type="password" id="password" name="password" autoComplete="off" />
              </dd>
              <dt>{t("validation.retypePassword")}</dt>
              <dd className="mt10">
                <input
                  type="password"
                  id="retypedPassword"
                  name="retypedPassword"
                  autoComplete="off"
                />
              </dd>
              <dd>
                <button type="submit" className="ybtn ybtn-success">
                  {t("userinfo.changePassword")}
                </button>
              </dd>
            </dl>
          </form>
          <hr />
          <div className="mt10">
            <dl>
              <dt>{t("site.resetPasswordEmail.desc")}</dt>
              <dd className="mt10">
                <a
                  href={prefixBasePath(runtimeConfig.basePath, "/lostPassword")}
                  className="ybtn ybtn-fail"
                >
                  {t("site.resetPasswordEmail.title")}
                </a>
              </dd>
            </dl>
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
