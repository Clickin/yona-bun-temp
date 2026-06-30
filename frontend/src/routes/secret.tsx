import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { setupSecretAdminRest } from "../api/auth";
import { apiQueryKeys } from "../api/query-keys";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

export const Route = createFileRoute("/secret")({
  component: SecretSetupRoute,
});

function SecretSetupRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SecretSetupScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SecretSetupScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { language, t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const siteName = runtimeConfig.siteName ?? "Yona";
  const welcome = lookupLegacyMessage(language, "app.welcome", { args: [siteName] });
  const setupMutation = useMutation({
    mutationFn: async (input: {
      emailAddress: string;
      name: string;
      password: string;
      retypedPassword: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return setupSecretAdminRest(runtimeConfig, csrfToken, input);
    },
    async onSuccess(response) {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.session() });
      const restartPath =
        typeof response.restartPath === "string" ? response.restartPath : "/restart";
      router.history.push(
        restartPath.startsWith(runtimeConfig.basePath)
          ? restartPath
          : prefixBasePath(runtimeConfig.basePath, restartPath),
      );
    },
  });

  return (
    <>
      <div className="page-wrap-outer">
        <div className="container page-wrap">
          <div className="page">
            <div className="secret-wrap">
              <a href={prefixBasePath(runtimeConfig.basePath, "/")} className="logo">
                <span>{siteName}</span>
              </a>

              <h3>{welcome}</h3>

              <div className="alert alert-block secret-box">
                <h4>{t("app.welcome.warning.title")}</h4>
                {t("app.welcome.warning.desc")}
              </div>
            </div>

            <div className="signup-form-wrap frm-wrap">
              <form action="/" method="post" className="input-append" onSubmit={handleSubmit}>
                <dl>
                  <dt>
                    <label htmlFor="loginId">{t("user.signupId")}</label>
                  </dt>
                  <dd>
                    <input
                      id="loginId"
                      type="text"
                      name="loginId"
                      className="text password"
                      placeholder=""
                      autoComplete="off"
                      readOnly
                      value="admin"
                    />
                  </dd>

                  <dt>
                    <label htmlFor="uname">{t("user.name")}</label>
                  </dt>
                  <dd>
                    <input
                      id="uname"
                      type="text"
                      name="name"
                      className="text password"
                      placeholder=""
                      autoComplete="off"
                      defaultValue=""
                    />
                  </dd>

                  <dt>
                    <label htmlFor="email">{t("user.email")}</label>
                  </dt>
                  <dd>
                    <input
                      id="email"
                      type="text"
                      name="email"
                      className="text password"
                      placeholder=""
                      autoComplete="off"
                      defaultValue=""
                    />
                  </dd>

                  <dt>
                    <label htmlFor="password">{t("user.password")}</label>
                  </dt>
                  <dd>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      className="text password"
                      placeholder=""
                      autoComplete="off"
                    />
                  </dd>

                  <dt>
                    <label htmlFor="retypedPassword">{t("validation.retypePassword")}</label>
                  </dt>
                  <dd>
                    <input
                      id="retypedPassword"
                      type="password"
                      name="retypedPassword"
                      className="text password"
                      placeholder=""
                      autoComplete="off"
                    />
                  </dd>
                </dl>
                <div className="btns-row">
                  <button type="submit" className="ybtn ybtn-success">
                    {t("app.welcome.submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            Powered by <strong>{siteName}</strong>
          </span>
        </div>
      </footer>
    </>
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setupMutation.mutate({
      emailAddress: String(form.get("email") ?? ""),
      name: String(form.get("name") ?? ""),
      password: String(form.get("password") ?? ""),
      retypedPassword: String(form.get("retypedPassword") ?? ""),
    });
  }
}
