import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import {
  addWorkspaceEmailRest,
  deleteWorkspaceEmailRest,
  readWorkspaceOverviewRest,
  sendWorkspaceEmailValidationRest,
  setMainWorkspaceEmailRest,
} from "../../../api/workspace";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/user/editform/emails")({
  component: UserEmailSettingsRoute,
});

type WorkspaceEmailRow = {
  avatarUrl?: unknown;
  emailAddress?: unknown;
  id?: unknown;
  valid?: unknown;
};

function UserEmailSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <UserEmailSettingsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function UserEmailSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const profile = workspaceQuery.data?.profile;
  const rows = (workspaceQuery.data?.emails ?? []) as WorkspaceEmailRow[];
  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return addWorkspaceEmailRest(runtimeConfig, csrfToken, email);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteWorkspaceEmailRest(runtimeConfig, csrfToken, id);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });
  const setMainMutation = useMutation({
    mutationFn: async (id: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return setMainWorkspaceEmailRest(runtimeConfig, csrfToken, id);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });
  const sendValidationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return sendWorkspaceEmailValidationRest(runtimeConfig, csrfToken, id);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
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
          <EditTabMenu active="emails" basePath={runtimeConfig.basePath} />

          <form
            action={prefixBasePath(runtimeConfig.basePath, "/user/email")}
            method="post"
            className="form-inline inner-bubble"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const email = String(new FormData(form).get("email") ?? "");
              addMutation.mutate(email);
            }}
          >
            <input
              type="text"
              placeholder={t("user.email.new")}
              name="email"
              className="text uname"
            />
            <button type="submit" className="ybtn ybtn-success">
              {t("button.add")}
            </button>
          </form>

          <hr />

          <p>
            {t("emails.main.email.descr")}
            <br />
            {t("emails.sub.email.descr")}
          </p>

          <table className="table mt20">
            <tbody>
              <tr>
                <td>
                  <img src={profile?.avatarUrl || undefined} width="40" height="40" alt="" />
                  <strong className="ml10">{profile?.primaryEmailAddress ?? ""}</strong>
                  <span className="label-head vmiddle ml10">{t("emails.main.email")}</span>
                </td>
                <td style={{ textAlign: "right" }}></td>
              </tr>

              {rows.map((row) => {
                const id = stringValue(row.id);
                const valid = row.valid === true;
                const legacyHref = {
                  href: prefixBasePath(
                    runtimeConfig.basePath,
                    valid ? `/user/email/setAsMain/${id}` : `/user/email/sendValidationEmail/${id}`,
                  ),
                };
                return (
                  <tr key={id || stringValue(row.emailAddress)}>
                    <td>
                      <img
                        src={stringValue(row.avatarUrl) || undefined}
                        width="40"
                        height="40"
                        alt=""
                      />
                      <span className="ml10">{stringValue(row.emailAddress)}</span>
                    </td>
                    <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                      <button
                        type="button"
                        data-request-method="delete"
                        data-request-uri={prefixBasePath(
                          runtimeConfig.basePath,
                          `/user/email/delete/${id}`,
                        )}
                        className="ybtn ybtn-small ybtn-danger"
                        onClick={() => deleteMutation.mutate(id)}
                      >
                        {t("button.delete")}
                      </button>
                      {valid ? (
                        <button
                          type="button"
                          data-request-method="put"
                          {...legacyHref}
                          className="ybtn ybtn-small"
                          style={{ width: "150px" }}
                          onClick={() => setMainMutation.mutate(id)}
                        >
                          {t("emails.set.as.main")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-request-method="post"
                          {...legacyHref}
                          className="ybtn ybtn-small"
                          style={{ width: "150px" }}
                          onClick={() => sendValidationMutation.mutate(id)}
                        >
                          <i
                            className="yobicon-error2 orange-txt mr5"
                            style={{ verticalAlign: "bottom" }}
                          ></i>
                          {t("emails.send.validatino.mail")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
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
