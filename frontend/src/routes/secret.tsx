import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { readAuthUiCapabilitiesRest, setupSecretAdminRest } from "../api/auth";
import { apiQueryKeys } from "../api/query-keys";
import { RestApiError } from "../api/rest-client";
import type { ReadAuthUiCapabilitiesResponse } from "../api/types";
import legacySpriteUrl from "../assets/legacy/sprite.png";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { secretNotFoundStyles, secretTheme } from "./-secret.stylex";

type AuthUiCapabilities = ReadAuthUiCapabilitiesResponse & {
  secretSetupRequired?: boolean;
};

type FieldErrors = Partial<Record<"loginId" | "email" | "password" | "retypedPassword", string[]>>;

const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

const styles = stylex.create({
  wrap: { textAlign: "center" },
  logo: {
    display: "block",
    textAlign: "center",
    overflow: "hidden",
    width: "123px",
    height: "55px",
    lineHeight: "55px",
    fontSize: "2em",
    color: secretTheme.logoText,
    backgroundColor: secretTheme.logoSurface,
    margin: "50px auto",
    ":hover": { color: secretTheme.logoText },
  },
  box: { width: "50%", margin: "20px auto" },
  formWrap: {
    margin: "14px auto 0",
    position: "relative",
    width: "400px",
  },
  field: {
    borderBottomColor: {
      default: secretTheme.fieldBorder,
      ":focus": secretTheme.fieldFocusBorder,
    },
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderLeftStyle: "none",
    borderRightStyle: "none",
    borderTopStyle: "none",
    borderRadius: "0",
    boxShadow: { default: "none", ":focus": "none" },
    fontSize: "12px",
    fontWeight: "bold",
    height: "27px",
    marginBottom: "15px",
    outline: { default: "none", ":focus": "none" },
    // Frozen mobile width/font rules are !important, so they intentionally remain
    // effective fallback instead of being shadowed by an ineffective StyleX variant.
    width: "386px",
  },
  actionRow: {
    display: "block",
    margin: "0 auto 20px",
    textAlign: "center",
  },
});
const secretWrapClassName = stylex.props(styles.wrap).className;
const secretLogoClassName = stylex.props(styles.logo).className;
const secretBoxClassName = stylex.props(styles.box).className;
const secretFormWrapClassName = stylex.props(styles.formWrap).className;
const secretFieldClassName = stylex.props(styles.field).className;
const secretActionRowClassName = stylex.props(styles.actionRow).className;

export const Route = createFileRoute("/secret")({
  component: SecretSetupRoute,
});

function SecretSetupRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SecretSetupScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SecretSetupScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { language, t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const siteName = runtimeConfig.siteName ?? "Yoram";
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
            <div
              className={`secret-wrap ${secretWrapClassName}`}
              data-stylex-owner="secret-setup"
              data-stylex-part="secret-setup-wrap"
            >
              <Link
                to="/"
                activeProps={legacyLinkActiveProps}
                className={`logo ${secretLogoClassName}`}
                data-stylex-part="secret-setup-logo"
              >
                <span>{siteName}</span>
              </Link>

              <h3>{welcome}</h3>

              <div
                className={`alert alert-block secret-box ${secretBoxClassName}`}
                data-stylex-part="secret-setup-box"
              >
                <h4>{t("app.welcome.warning.title")}</h4>
                {t("app.welcome.warning.desc")}
              </div>
            </div>

            <div
              className={`signup-form-wrap frm-wrap ${secretFormWrapClassName}`}
              data-stylex-owner="secret-setup-form"
            >
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
                      className={`text password ${secretFieldClassName}`}
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
                      className={`text password ${secretFieldClassName}`}
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
                      className={`text password ${secretFieldClassName}`}
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
                      className={`text password ${secretFieldClassName}`}
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
                      className={`text password ${secretFieldClassName}`}
                      placeholder=""
                      autoComplete="off"
                    />
                  </dd>
                </dl>
                <div
                  className={`btns-row ${secretActionRowClassName}`}
                  data-stylex-part="secret-setup-action-row"
                >
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
  const siteName = runtimeConfig.siteName ?? "Yoram";

  return (
    <>
      <header className="gnb-outer">
        <div className="gnb-inner">
          <Link to="/" activeProps={legacyLinkActiveProps} className="logo">
            <h1 className="blind">{siteName}</h1>
          </Link>
          <ul className="gnb-nav">
            <li>
              <Link to="/projects" activeProps={legacyLinkActiveProps}>
                {t("title.projectList")}
              </Link>
            </li>
            <li>
              <Link to="/_help" activeProps={legacyLinkActiveProps}>
                {t("title.help")}
              </Link>
            </li>
            {runtimeConfig.feedbackUrl ? (
              <li>
                <Link
                  to={runtimeConfig.feedbackUrl}
                  target="_blank"
                  activeProps={legacyLinkActiveProps}
                >
                  {t("title.yobi.feedback")}
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </header>
      <div className="page-wrap-outer" data-stylex-owner="secret-notfound-page">
        <div className="project-page-wrap">
          <div
            {...stylex.props(secretNotFoundStyles.errorWrap)}
            className={`${stylex.props(secretNotFoundStyles.errorWrap).className} error-wrap`}
            data-stylex-owner="secret-notfound-error-wrap"
          >
            <i
              {...stylex.props(secretNotFoundStyles.errorIcon(legacySpriteUrl))}
              className={`${stylex.props(secretNotFoundStyles.errorIcon(legacySpriteUrl)).className} ico ico-err2`}
              data-stylex-owner="secret-notfound-error-icon"
            />
            <p
              {...stylex.props(secretNotFoundStyles.errorMessage)}
              data-stylex-owner="secret-notfound-error-message"
            >
              {t("error.notfound")}
            </p>
            <Link
              to="/"
              activeProps={legacyLinkActiveProps}
              className="ybtn ybtn-info"
              data-stylex-owner="secret-notfound-home"
            >
              {t("menu.home")}
            </Link>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">Yoram authors</span>
        </div>
      </footer>
    </>
  );
}
