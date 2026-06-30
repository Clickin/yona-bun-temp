import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { readAuthUiCapabilitiesRest, registerWithPasswordRest } from "../../api/auth";
import { apiQueryKeys } from "../../api/query-keys";
import type { ReadAuthUiCapabilitiesResponse } from "../../api/types";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type AuthUiCapabilities = ReadAuthUiCapabilitiesResponse & {
  defaultAdminContact?: string;
  signupRequireConfirm?: boolean;
  socialLoginOnly?: boolean;
};

const LegacyInternalLink = Link as React.ComponentType<
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }
>;

export const Route = createFileRoute("/users/signupform")({
  component: SignupFormRoute,
});

function SignupFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SignupFormScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SignupFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { language, t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState("");
  const capabilitiesQuery = useQuery({
    queryFn: () => readAuthUiCapabilitiesRest(runtimeConfig),
    queryKey: apiQueryKeys.auth.capabilities(),
  });
  const capabilities = capabilitiesQuery.data as AuthUiCapabilities | undefined;
  const socialLoginOnly = capabilities?.socialLoginOnly === true;
  const signupRequireConfirm = capabilities?.signupRequireConfirm === true;
  const siteName = runtimeConfig.siteName ?? "Yona";
  const title = lookupLegacyMessage(language, "title.signupFor", { args: [siteName] });
  const registerMutation = useMutation({
    mutationFn: async (input: {
      emailAddress: string;
      loginId: string;
      name: string;
      password: string;
      retypedPassword: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return registerWithPasswordRest(runtimeConfig, csrfToken, input);
    },
    onError(error) {
      setSubmitError(error instanceof Error ? error.message : t("user.enroll.failed"));
    },
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.session() });
      router.history.push("/");
    },
  });

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <div className="page full">
        <div className="center-wrap tag-line-wrap signup">
          <h1 className="title">
            <HighlightedLegacyMessage message={title} />
          </h1>
          <p className="tag-line">{t("app.description")}</p>
        </div>

        {signupRequireConfirm ? (
          <div className="center-txt">
            <p>{t("title.signupConfirmDesc")}</p>
            <p>
              <ObfuscatedContactMessage
                message={lookupLegacyMessage(language, "title.signupConfirmDesc2", {
                  args: [String(capabilities?.defaultAdminContact ?? "")],
                })}
              />
            </p>
          </div>
        ) : null}

        <div className="signup-form-wrap frm-wrap">
          <form action="/users/signup" method="post" name="signup" onSubmit={handleSubmit}>
            {socialLoginOnly ? (
              <div className="btns-row nm">{t("app.warn.support.social.login.only")}</div>
            ) : (
              <>
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

                {submitError ? <div className="error-message">{submitError}</div> : null}
                <div className="btns-row">
                  <button
                    type="submit"
                    className="ybtn ybtn-primary ybtn-large ybtn-fullsize"
                    disabled={registerMutation.isPending}
                  >
                    {t("user.signupBtn")}
                  </button>
                </div>

                <div className="act-row">
                  {t("user.isAlreadySignupUser")}{" "}
                  <LegacyInternalLink to="/users/loginform" className="go-login">
                    {t("title.login")}
                  </LegacyInternalLink>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </SiteLayoutShell>
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    if (socialLoginOnly) {
      return;
    }

    const form = new FormData(event.currentTarget);
    registerMutation.mutate({
      emailAddress: String(form.get("email") ?? ""),
      loginId: String(form.get("loginId") ?? ""),
      name: String(form.get("name") ?? ""),
      password: String(form.get("password") ?? ""),
      retypedPassword: String(form.get("retypedPassword") ?? ""),
    });
  }
}

function HighlightedLegacyMessage({ message }: { message: string }) {
  const match = /^(.*)<span class="highlight">([\s\S]*)<\/span>(.*)$/.exec(message);
  if (!match) {
    return <>{message}</>;
  }

  return (
    <>
      {match[1]}
      <span className="highlight">{match[2]}</span>
      {match[3]}
    </>
  );
}

function ObfuscatedContactMessage({ message }: { message: string }) {
  const match = /^(.*)<span class="obfuscate">([\s\S]*)<\/span>(.*)$/.exec(message);
  if (!match) {
    return <>{message}</>;
  }

  return (
    <>
      {match[1]}
      <span className="obfuscate">{match[2]}</span>
      {match[3]}
    </>
  );
}
