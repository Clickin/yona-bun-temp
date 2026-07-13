import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { readAuthUiCapabilitiesRest, setupSecretAdminRest } from "../api/auth";
import { apiQueryKeys } from "../api/query-keys";
import { RestApiError } from "../api/rest-client";
import type { ReadAuthUiCapabilitiesResponse } from "../api/types";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

type AuthUiCapabilities = ReadAuthUiCapabilitiesResponse & {
  secretSetupRequired?: boolean;
};

type FieldErrors = Partial<Record<"loginId" | "email" | "password" | "retypedPassword", string[]>>;

const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

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
  const contextRoot = runtimeConfig.basePath === "/" ? "/" : `${runtimeConfig.basePath}/`;
  const welcome = lookupLegacyMessage(language, "app.welcome", { args: [siteName] });
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const capabilitiesQuery = useQuery({
    queryFn: () => readAuthUiCapabilitiesRest(runtimeConfig),
    queryKey: apiQueryKeys.auth.capabilities(),
  });
  const capabilities = capabilitiesQuery.data as AuthUiCapabilities | undefined;
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
    onError(error) {
      if (!(error instanceof RestApiError)) return;
      const message = t(error.message);
      if (error.message === "user.wrongloginId.alert") {
        setFieldErrors({ loginId: [message] });
        return;
      }
      if (error.message === "validation.invalidEmail") {
        setFieldErrors({ email: [message] });
        return;
      }
      if (error.message === "user.email.duplicate") {
        setFieldErrors({ email: [message] });
        return;
      }
      if (error.message === "validation.tooShortPassword") {
        setFieldErrors({ password: [message] });
        return;
      }
      if (error.message === "validation.passwordMismatch") {
        setFieldErrors({ retypedPassword: [t("user.confirmPassword.alert")] });
      }
    },
  });

  if (capabilities?.secretSetupRequired === false) {
    return <NotFoundPage runtimeConfig={runtimeConfig} />;
  }

  return (
    <>
      <title>{welcome}</title>
      <div className="page-wrap-outer">
        <div className="container page-wrap">
          <div className="page">
            <div className="secret-wrap">
              <Link to="/" activeProps={legacyLinkActiveProps} className="logo">
                <span>{siteName}</span>
              </Link>

              <h3>{welcome}</h3>

              <div className="alert alert-block secret-box">
                <h4>{t("app.welcome.warning.title")}</h4>
                {t("app.welcome.warning.desc")}
              </div>
            </div>

            <div className="signup-form-wrap frm-wrap">
              <form
                action={contextRoot}
                method="post"
                className="input-append"
                onSubmit={handleSubmit}
              >
                <dl>
                  <dt>
                    <label htmlFor="loginId">{t("user.signupId")}</label>
                    <FieldErrorLabels errors={fieldErrors.loginId} />
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
                    <FieldErrorLabels errors={fieldErrors.email} />
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
                    <FieldErrorLabels errors={fieldErrors.password} />
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
                    <FieldErrorLabels errors={fieldErrors.retypedPassword} />
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
    const emailAddress = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const retypedPassword = String(form.get("retypedPassword") ?? "");
    const nextFieldErrors: FieldErrors = {};

    if (!emailAddress) nextFieldErrors.email = [t("validation.invalidEmail")];
    if (!password) nextFieldErrors.password = [t("user.wrongPassword.alert")];
    if (password !== retypedPassword) {
      nextFieldErrors.retypedPassword = [t("user.confirmPassword.alert")];
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setupMutation.mutate({
      emailAddress,
      name: String(form.get("name") ?? ""),
      password,
      retypedPassword,
    });
  }
}

function FieldErrorLabels({ errors }: { errors?: string[] }) {
  if (!errors) return null;

  return (
    <>
      {errors.map((error) => (
        <span className="label label-important" key={error}>
          {error}
        </span>
      ))}
    </>
  );
}

function NotFoundPage({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const siteName = runtimeConfig.siteName ?? "Yona";

  return (
    <>
      <header className="gnb-outer">
        <div className="gnb-inner">
          <Link to="/" activeProps={legacyLinkActiveProps} className="logo">
            <h1 className="blind">{siteName}</h1>
          </Link>
          <ul className="gnb-nav">
            <li>
              <Link to="/projects" search={{ filter: "", labelIds: "" }} activeProps={legacyLinkActiveProps}>
                {t("title.projectList")}
              </Link>
            </li>
            <li>
              <Link to="/_help" activeProps={legacyLinkActiveProps}>
                {t("title.help")}
              </Link>
            </li>
            <li>
              <Link
                href="https://github.com/nforge/yobi/issues?state=open"
                to="/"
                target="_blank"
                activeProps={legacyLinkActiveProps}
              >
                {t("title.yobi.feedback")}
              </Link>
            </li>
          </ul>
        </div>
      </header>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="error-wrap">
            <i className="ico ico-err2" />
            <p>{t("error.notfound")}</p>
            <Link to="/" activeProps={legacyLinkActiveProps} className="ybtn ybtn-info">
              {t("menu.home")}
            </Link>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            {"Copyright © "}
            <Link
              href="http://navercorp.com/"
              to="/"
              target="_blank"
              activeProps={legacyLinkActiveProps}
            >
              NAVER Corp.
            </Link>{" "}
            Supported by{" "}
            <Link
              href="https://developers.naver.com/d2/"
              to="/"
              target="_blank"
              className="d2-program"
              activeProps={legacyLinkActiveProps}
            >
              <span className="d2">D2</span>
              <span className="program"> Program</span>
            </Link>
          </span>
        </div>
      </footer>
    </>
  );
}
