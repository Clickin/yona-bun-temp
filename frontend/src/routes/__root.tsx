import * as React from "react";
import {
  Link,
  Navigate,
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { readAuthUiCapabilitiesRest } from "../api/auth";
import { RootProgressStatusBarProvider } from "../components/route-fetch-lock";
import type { ReadAuthUiCapabilitiesResponse } from "../api/types";
import { submitRootLoginDialogForm } from "../auth-root-shell-login-dialog";
import legacySpriteUrl from "../assets/legacy/sprite.png";
import { LegacyI18nProvider, resolveInitialLanguage, useLegacyMessages } from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

export interface AppRouterContext {
  runtimeConfig: RuntimeConfig;
}

const legacyPlainLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;

const legacyPlainLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
type ExternalLinkTarget = NonNullable<React.ComponentProps<typeof Link>["to"]>;

type RootToast = {
  durationMs?: number;
  key: string;
  message: string;
};

type RootShellModalId = "loginDialog" | "yobiDialog";

type RootLoginDialogState = {
  errorMessage: string | null;
  identifier: string;
  password: string;
  rememberMe: boolean;
};

type RootYoramDialogProps = {
  isOpen: boolean;
  onDismiss: () => void;
};

type RootLoginDialogProps = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDismiss: () => void;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (checked: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  resetNonce: number;
  runtimeConfig: RuntimeConfig;
  state: RootLoginDialogState;
  visible: boolean;
};

const RootToastContext = React.createContext<React.Dispatch<
  React.SetStateAction<RootToast | null>
> | null>(null);
const RootLoginDialogContext = React.createContext<(() => boolean) | null>(null);
const ROOT_YOBI_TOAST_DURATION_MS = 5000;
const GITHUB_OAUTH_LOGO_PATH =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59 0.4 0.07 0.55-0.17 0.55-0.38 0-0.19-0.01-0.82-0.01-1.49-2.01 0.37-2.53-0.49-2.69-0.94-0.09-0.23-0.48-0.94-0.82-1.13-0.28-0.15-0.68-0.52-0.01-0.53 0.63-0.01 1.08 0.58 1.23 0.82 0.72 1.21 1.87 0.87 2.33 0.66 0.07-0.52 0.28-0.87 0.51-1.07-1.78-0.2-3.64-0.89-3.64-3.95 0-0.87 0.31-1.59 0.82-2.15-0.08-0.2-0.36-1.02 0.08-2.12 0 0 0.67-0.21 2.2 0.82 0.64-0.18 1.32-0.27 2-0.27 0.68 0 1.36 0.09 2 0.27 1.53-1.04 2.2-0.82 2.2-0.82 0.44 1.1 0.16 1.92 0.08 2.12 0.51 0.56 0.82 1.27 0.82 2.15 0 3.07-1.87 3.75-3.65 3.95 0.29 0.25 0.54 0.73 0.54 1.48 0 1.07-0.01 1.93-0.01 2.2 0 0.21 0.15 0.46 0.55 0.38C13.71 14.53 16 11.53 16 8 16 3.58 12.42 0 8 0z";
export function useRootToast() {
  const setRootToast = React.use(RootToastContext);
  if (!setRootToast) {
    throw new Error("useRootToast must be used under RootToastContext.");
  }
  return setRootToast;
}

export function useRootLoginDialog() {
  const openRootLoginDialog = React.use(RootLoginDialogContext);
  if (!openRootLoginDialog) {
    throw new Error("useRootLoginDialog must be used under RootLoginDialogContext.");
  }
  return openRootLoginDialog;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootResetShell,
  notFoundComponent: RootAliasNotFound,
});

function RootResetShell() {
  const { runtimeConfig } = Route.useRouteContext();
  const router = useRouter();
  const [rootToast, setRootToast] = React.useState<RootToast | null>(null);
  const [rootShellModal, setRootShellModal] = React.useState<RootShellModalId | null>(null);
  const [authenticatedRevision, setAuthenticatedRevision] = React.useState(0);
  const [rootLoginDialogResetNonce, setRootLoginDialogResetNonce] = React.useState(0);
  const [rootLoginDialogState, setRootLoginDialogState] = React.useState<RootLoginDialogState>({
    errorMessage: null,
    identifier: "",
    password: "",
    rememberMe: true,
  });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const rendersPlainResponseState = pathname.startsWith("/verify/");
  const rendersStandaloneLoginState = pathname === "/users/loginform";
  const loginDialogInputRef = React.useRef<HTMLInputElement | null>(null);

  const openRootLoginDialog = React.useCallback(() => {
    if (rendersPlainResponseState || rendersStandaloneLoginState) {
      return false;
    }

    setRootShellModal("loginDialog");
    setRootLoginDialogResetNonce((current) => current + 1);
    setRootLoginDialogState((current) => ({
      ...current,
      errorMessage: null,
      identifier: "",
      password: "",
    }));
    return true;
  }, [rendersPlainResponseState, rendersStandaloneLoginState]);

  const closeRootShellModal = React.useCallback(() => {
    setRootShellModal(null);
  }, []);

  const handleRootShellKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && rootShellModal) {
        event.preventDefault();
        closeRootShellModal();
      }
    },
    [closeRootShellModal, rootShellModal],
  );

  const handleRootShellClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }

      const requiredLogin = target.closest<HTMLElement>('[data-login="required"]');
      if (requiredLogin && openRootLoginDialog()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    },
    [openRootLoginDialog],
  );

  const handleRootLoginDialogSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setRootLoginDialogState((current) => ({
        ...current,
        errorMessage: null,
      }));

      try {
        await submitRootLoginDialogForm(runtimeConfig, rootLoginDialogState);
        closeRootShellModal();
        setAuthenticatedRevision((current) => current + 1);
        await router.invalidate();
      } catch (caught) {
        setRootLoginDialogState((current) => ({
          ...current,
          errorMessage: caught instanceof Error ? caught.message : "Failed to authenticate.",
        }));
      }
    },
    [closeRootShellModal, rootLoginDialogState, router, runtimeConfig],
  );

  React.useEffect(() => {
    if (rootShellModal !== "loginDialog") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loginDialogInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [rootShellModal]);

  const rootShellContent = (
    <>
      <RootProgressStatusBarProvider>
        <Outlet key={authenticatedRevision} />
      </RootProgressStatusBarProvider>
      {rendersPlainResponseState ? null : (
        <>
          <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
            <RootYoramDialog
              isOpen={rootShellModal === "yobiDialog"}
              onDismiss={closeRootShellModal}
            />
          </LegacyI18nProvider>
          <div id="yobiToasts" data-owner="root-toast-container">
            {rootToast ? (
              <RootYoramToast
                durationMs={rootToast.durationMs}
                key={rootToast.key}
                message={rootToast.message}
                onDismiss={() => setRootToast(null)}
              />
            ) : null}
          </div>
          <script type="text/x-jquery-tmpl" id="tplYobiToast">
            {
              '<div class="toast" tabindex="-1"><div class="btn-dismiss"><button type="button" class="btn-transparent">&times;</button></div><div class="center-text"><span class="v"></span><div class="msg"></div></div></div>'
            }
          </script>
          <LegacySelect2Assets runtimeConfig={runtimeConfig} />
          <LegacySelect2Templates />
          {rendersStandaloneLoginState ? null : (
            <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
              <RootLoginDialog
                inputRef={loginDialogInputRef}
                onDismiss={closeRootShellModal}
                onIdentifierChange={(identifier) => {
                  setRootLoginDialogState((current) => ({
                    ...current,
                    identifier,
                  }));
                }}
                onPasswordChange={(password) => {
                  setRootLoginDialogState((current) => ({
                    ...current,
                    password,
                  }));
                }}
                onRememberMeChange={(rememberMe) => {
                  setRootLoginDialogState((current) => ({
                    ...current,
                    rememberMe,
                  }));
                }}
                onSubmit={handleRootLoginDialogSubmit}
                resetNonce={rootLoginDialogResetNonce}
                runtimeConfig={runtimeConfig}
                state={rootLoginDialogState}
                visible={rootShellModal === "loginDialog"}
              />
            </LegacyI18nProvider>
          )}
          {rootShellModal ? (
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Bootstrap 2 dismisses through the backdrop; root key capture provides Escape dismissal.
            <div
              {...(rootShellModal === "loginDialog" ? {} : {})}
              className="modal-backdrop in"
              data-owner={
                rootShellModal === "loginDialog" ? "root-login-dialog-backdrop" : undefined
              }
              data-part={rootShellModal === "loginDialog" ? "login-dialog-backdrop" : undefined}
              onClick={closeRootShellModal}
            ></div>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <RootLoginDialogContext.Provider value={openRootLoginDialog}>
      <RootToastContext.Provider value={setRootToast}>
        {rendersPlainResponseState ? (
          rootShellContent
        ) : (
          <div
            data-root-boundary=""
            onClickCapture={handleRootShellClick}
            onKeyDownCapture={handleRootShellKeyDown}
          >
            {rootShellContent}
          </div>
        )}
      </RootToastContext.Provider>
    </RootLoginDialogContext.Provider>
  );
}

function RootYoramToast({
  durationMs,
  message,
  onDismiss,
}: {
  durationMs?: number;
  message: string;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    const timeoutMs = durationMs ?? ROOT_YOBI_TOAST_DURATION_MS;
    if (timeoutMs <= 0) {
      return;
    }
    const timeoutId = window.setTimeout(onDismiss, timeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [durationMs, onDismiss]);

  return (
    <div tabIndex={-1} data-owner="root-yoram-toast" data-part="toast">
      <div data-part="toast-dismiss">
        <button type="button" onClick={onDismiss}>
          &times;
        </button>
      </div>
      <div>
        <span />
        <div data-part="toast-message">{message}</div>
      </div>
    </div>
  );
}

function RootYoramDialog({ isOpen, onDismiss }: RootYoramDialogProps) {
  const { t } = useLegacyMessages();
  return (
    <div
      id="yobiDialog"
      className={isOpen ? "modal yobiDialog in" : "modal hide yobiDialog"}
      tabIndex={-1}
      role="dialog"
      aria-hidden={!isOpen}
    >
      <div className="btn-dismiss">
        <button type="button" className="btn-transparent" onClick={onDismiss}>
          &times;
        </button>
      </div>
      <div className="message">
        <div className="center-text">
          <p className="msg" />
          <p className="desc" />
        </div>
        <div className={" center-txt buttons"} data-owner="root-yoram-dialog-action-row">
          <button type="button" className="ybtn ybtn-info" onClick={onDismiss}>
            {t("button.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function LegacySelect2Assets({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const language = resolveInitialLanguage(runtimeConfig.supportedLanguages);
  const localeScript =
    language === "ko-KR"
      ? "/assets/javascripts/lib/select2/select2_locale_ko.js"
      : language === "ja-JP"
        ? "/assets/javascripts/lib/select2/select2_locale_ja.js"
        : "";

  return (
    <>
      <script
        defer
        src={prefixBasePath(runtimeConfig.basePath, "/assets/javascripts/lib/select2/select2.js")}
      ></script>
      <script
        defer
        src={prefixBasePath(
          runtimeConfig.basePath,
          "/assets/javascripts/common/yobi.ui.Select2.js",
        )}
      ></script>
      {localeScript ? (
        <script defer src={prefixBasePath(runtimeConfig.basePath, localeScript)}></script>
      ) : null}
    </>
  );
}

function LegacySelect2Templates() {
  const TemplateScript = "script";

  return (
    <>
      <TemplateScript
        id="tplSelect2FormatUser"
        type="text/x-jquery-tmpl"
      >{`<div class="usf-group" title="\${name} \${loginId}">
    <span class="avatar-wrap smaller"><img src="\${avatarURL}" width="20" height="20"></span>
    <strong class="name">\${name}</strong>
    <span class="loginid">\${loginId}</span>
</div>`}</TemplateScript>
      <TemplateScript
        id="tplSelect2FormatMilestone"
        type="text/x-jquery-tmpl"
      >{`<div title="[\${stateLabel}] \${name}">
    \${name}
</div>`}</TemplateScript>
      <TemplateScript
        id="tplSelect2Projects"
        type="text/x-jquery-tmpl"
      >{`<div class="usf-group" title="\${name}">
    <span class="avatar-wrap smaller"><img src="\${avatarURL}" width="16" height="16"></span>
    <span class="loginid">\${owner}</span>
    <span class="name">\${name}</span>
</div>`}</TemplateScript>
      <TemplateScript
        id="tplSelect2ProjectsWithoutAvatar"
        type="text/x-jquery-tmpl"
      >{`<div class="usf-group" title="\${name}">
    <span class="width25px"></span>
    <span class="loginid">\${owner}</span>
    <span class="name">\${name}</span>
</div>`}</TemplateScript>
      <TemplateScript id="tplSelect2FormatIssues" type="text/x-jquery-tmpl">{`<div title="\${name}">
    \${name}
</div>`}</TemplateScript>
    </>
  );
}

function RootLoginDialog({
  inputRef,
  onDismiss,
  onIdentifierChange,
  onPasswordChange,
  onRememberMeChange,
  onSubmit,
  resetNonce,
  runtimeConfig,
  state,
  visible,
}: RootLoginDialogProps) {
  const { t } = useLegacyMessages();
  const [capabilities, setCapabilities] = React.useState<ReadAuthUiCapabilitiesResponse | null>(
    null,
  );
  React.useEffect(() => {
    let active = true;
    readAuthUiCapabilitiesRest(runtimeConfig)
      .then((nextCapabilities) => {
        if (active) {
          setCapabilities(nextCapabilities);
        }
      })
      .catch(() => {
        if (active) {
          setCapabilities(null);
        }
      });
    return () => {
      active = false;
    };
  }, [runtimeConfig]);

  const basePath = runtimeConfig.basePath;
  const socialLoginOnly = capabilities?.socialLoginOnly === true;
  const socialProviders = Array.isArray(capabilities?.enabledSocialProviders)
    ? capabilities.enabledSocialProviders
    : [];
  return (
    <div
      id="loginDialog"
      tabIndex={-1}
      role="dialog"
      aria-hidden={visible ? false : true}
      data-owner="root-login-dialog-frame"
    >
      <div data-owner="root-login-dialog-body">
        <div className="pull-right">
          {/* oxlint-disable jsx-a11y/no-aria-hidden-on-focusable -- legacy common/loginDialog.scala.html renders aria-hidden on the focusable close button. */}
          <button
            type="button"
            className="close"
            aria-hidden="true"
            data-part="login-dialog-close"
            onClick={onDismiss}
          >
            &times;
          </button>
        </div>
        <form
          action={prefixBasePath(basePath, "/users/login")}
          method="post"
          className="frm-wrap login-form-wrap"
          data-part="login-dialog-form"
          onSubmit={onSubmit}
          key={resetNonce}
        >
          {socialLoginOnly ? (
            <div className="btns-row nm">{t("app.warn.support.social.login.only")}</div>
          ) : (
            <>
              <dl>
                <dd>
                  <input
                    id="loginIdOrEmailD"
                    name="loginIdOrEmail"
                    type="text"
                    className="text email"
                    autoComplete="off"
                    placeholder={t("user.login.key")}
                    ref={inputRef}
                    value={state.identifier}
                    onChange={(event) => onIdentifierChange(event.target.value)}
                  />
                </dd>
                <dd>
                  <input
                    id="passwordD"
                    name="password"
                    type="password"
                    className="text password"
                    autoComplete="off"
                    placeholder={t("user.password")}
                    value={state.password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                  />
                </dd>
              </dl>
              <div
                className="error"
                style={state.errorMessage ? { display: "block" } : { display: "none" }}
                data-owner="root-login-dialog-error"
              >
                <i className="yobicon-error" />
                <span className="error-message">{t(state.errorMessage ?? "")}</span>
              </div>
              <div className="btns-row nm">
                <button type="submit" className="ybtn ybtn-primary fullsize">
                  {t("button.login")}
                </button>
              </div>
            </>
          )}
          <div className="btns-row nm">
            {socialProviders.length > 0 && !socialLoginOnly ? (
              <div className="social-login-title-line"> {t("title.or")}</div>
            ) : null}
            {socialProviders.map((provider) => (
              <RootOAuthProviderLink
                basePath={basePath}
                key={String(provider)}
                provider={String(provider)}
              />
            ))}
          </div>
          {!socialLoginOnly ? (
            <div className="act-row mt20" data-owner="root-login-dialog-action-row">
              <div className="pull-left">
                <input
                  id="remember-meD"
                  type="checkbox"
                  name="rememberMe"
                  className=""
                  checked={state.rememberMe}
                  onChange={(event) => onRememberMeChange(event.target.checked)}
                />
                <label htmlFor="remember-meD" className="bg-checkbox">
                  {t("title.rememberMe")}
                </label>
              </div>
              <Link to="/lostPassword">{t("title.resetPassword")}</Link>
              <span data-owner="root-login-dialog-separator">|</span>
              <Link to="/users/signupform">{t("title.signup")}</Link>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function RootOAuthProviderLink({ basePath, provider }: { basePath: string; provider: string }) {
  const normalized = provider.trim().toLowerCase();
  if (normalized !== "github" && normalized !== "google") {
    return null;
  }
  const providerLoginPath: string = `/authenticate/${normalized}`;

  return (
    <Link to={providerLoginPath} className="ybtn oauth-login-btn" reloadDocument>
      {normalized === "github" ? (
        <span className={" auth-provider-logo"} data-owner="root-provider-logo">
          <span className={" github"} data-owner="root-provider-github">
            <svg aria-hidden="true" height="24" version="1.1" viewBox="0 0 16 16" width="19">
              <path d={GITHUB_OAUTH_LOGO_PATH} />
            </svg>
          </span>{" "}
          <span className="provider-name">Sign in with github</span>
        </span>
      ) : (
        <span className={" auth-provider-logo"} data-owner="root-provider-logo">
          <img
            src={prefixBasePath(
              basePath,
              "/assets/images/provider-logo/btn_google_light_normal_ios.svg",
            )}
            alt="login with Google"
          />{" "}
          Sign in with Google
        </span>
      )}
    </Link>
  );
}

export function RootAliasNotFound() {
  const { runtimeConfig } = Route.useRouteContext();
  return (
    <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
      <RootAliasNotFoundScreen runtimeConfig={runtimeConfig} />
    </LegacyI18nProvider>
  );
}

type RootNotFoundUsermenuTab = "myOrganizationList" | "myProjectList" | "myRecentIssueList";

function RootAliasNotFoundScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const [activeUsermenuTab, setActiveUsermenuTab] =
    React.useState<RootNotFoundUsermenuTab>("myOrganizationList");
  const handleUsermenuTabClick =
    (tab: RootNotFoundUsermenuTab) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveUsermenuTab(tab);
    };
  const rootAliasLocation = useRouterState({ select: (state) => state.location });
  const pathname = rootAliasLocation.pathname;
  const resetPasswordSearch = rootAliasLocation.search;
  const feedbackUrl = runtimeConfig.feedbackUrl?.trim();
  const loginFormPath: string = "/users/loginform";
  const signupFormPath: string = "/users/signupform";
  const logoutPath: string = "/logout";

  if (pathname === "/reset-password") {
    return <Navigate to="/resetPassword" search={resetPasswordSearch} replace />;
  }

  return (
    <>
      <header className="gnb-outer">
        <div className="gnb-inner">
          <Link
            activeOptions={legacyPlainLinkActiveOptions}
            activeProps={legacyPlainLinkActiveProps}
            className="logo"
            to="/"
          >
            <h1 className="blind">{runtimeConfig.siteName ?? "Yoram"}</h1>
          </Link>
          <ul className="gnb-nav">
            <li>
              <Link
                activeOptions={legacyPlainLinkActiveOptions}
                activeProps={legacyPlainLinkActiveProps}
                to="/projects"
              >
                {t("title.projectList")}
              </Link>
            </li>
            <li>
              <Link
                activeOptions={legacyPlainLinkActiveOptions}
                activeProps={legacyPlainLinkActiveProps}
                to="/_help"
              >
                {t("title.help")}
              </Link>
            </li>
            {feedbackUrl ? (
              <li>
                <Link to={feedbackUrl} target="_blank">
                  {t("title.yobi.feedback")}
                </Link>
              </li>
            ) : null}
          </ul>
          <div id="mySidenav" className="sidenav">
            <div className="span5 right-menu span-hard-wrap">
              <div className="row-fluid user-menu-wrap">
                <span className="user-menu">
                  <Link
                    activeOptions={legacyPlainLinkActiveOptions}
                    activeProps={legacyPlainLinkActiveProps}
                    params={{ user: "anonymous" }}
                    search={{ daysAgo: undefined!, selected: undefined! }}
                    to="/$user"
                  >
                    {t("userinfo.profile")}
                  </Link>
                </span>
                <span className="user-menu">
                  <Link to="/user/editform" search={{}} reloadDocument>
                    {t("userinfo.accountSetting")}
                  </Link>
                </span>
                <Link to={logoutPath} reloadDocument>
                  <span className="user-menu logout label">{t("title.logout")}</span>
                </Link>
              </div>
              <ul className="nav nav-tabs nm">
                <li
                  className={`myOrganizationList${activeUsermenuTab === "myOrganizationList" ? " active" : ""}`}
                >
                  <button type="button" onClick={handleUsermenuTabClick("myOrganizationList")}>
                    {t("title.favorite")}
                  </button>
                </li>
                <li
                  className={`myProjectList${activeUsermenuTab === "myProjectList" ? " active" : ""}`}
                >
                  <button type="button" onClick={handleUsermenuTabClick("myProjectList")}>
                    {t("title.project")}
                  </button>
                </li>
                <li
                  className={`myRecentIssueList${activeUsermenuTab === "myRecentIssueList" ? " active" : ""}`}
                >
                  <button type="button" onClick={handleUsermenuTabClick("myRecentIssueList")}>
                    {t("title.recently.visited.issue")}
                  </button>
                </li>
              </ul>
              <div className="tab-content tab-box">
                <div id="usermenu-tab-content-list" className="tab-content">
                  {"Loading..."}
                </div>
              </div>
            </div>
          </div>
          <ul className="gnb-usermenu">
            <li className="gnb-usermenu-item" id="required-logged-in">
              <Link to={loginFormPath} className="user-item-btn">
                {t("title.login")}
              </Link>
            </li>
            <li className="divider"></li>
            <li>
              <Link to={signupFormPath}>{t("title.signup")}</Link>
            </li>
          </ul>
        </div>
      </header>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className={" error-wrap"} data-owner="root-alias-notfound-error-wrap">
            <i className={" ico ico-err2"} data-owner="root-alias-notfound-error-icon" />
            <p data-owner="root-alias-notfound-error-message">{t("error.notfound")}</p>
            <Link
              activeOptions={legacyPlainLinkActiveOptions}
              activeProps={legacyPlainLinkActiveProps}
              className="ybtn ybtn-info"
              data-owner="root-alias-notfound-home"
              to="/"
            >
              {t("menu.home")}
            </Link>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            Copyright{" "}
            <Link
              className="yona-author"
              href="https://github.com/yona-projects/yona/blob/master/AUTHORS"
              rel="noreferrer"
              target="_blank"
              to={
                "https://github.com/yona-projects/yona/blob/master/AUTHORS" as unknown as ExternalLinkTarget
              }
            >
              Yona authors
            </Link>{" "}
            & ©{" "}
            <Link
              href="https://navercorp.com"
              rel="noreferrer"
              target="_blank"
              to={"https://navercorp.com" as unknown as ExternalLinkTarget}
            >
              NAVER Corp.
            </Link>{" "}
            &{" "}
            <Link
              className="naver-labs"
              href="https://naverlabs.com/"
              rel="noreferrer"
              target="_blank"
              to={"https://naverlabs.com/" as unknown as ExternalLinkTarget}
            >
              NAVER LABS
            </Link>{" "}
            Supported by{" "}
            <Link
              className="naver-cloud-platform"
              href="https://www.ncloud.com/?referer=yona"
              rel="noreferrer"
              target="_blank"
              to={"https://www.ncloud.com/?referer=yona" as unknown as ExternalLinkTarget}
            >
              NAVER CLOUD PLATFORM
            </Link>
          </span>
        </div>
      </footer>
    </>
  );
}
