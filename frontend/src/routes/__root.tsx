import * as React from "react";
import {
  Link,
  Navigate,
  Outlet,
  createLink,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { jsx as reactJsx } from "react/jsx-runtime";
import { readAuthUiCapabilitiesRest } from "../api/auth";
import type { ReadAuthUiCapabilitiesResponse } from "../api/types";
import { submitRootLoginDialogForm } from "../auth-root-shell-login-dialog";
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

type RootYobiDialogProps = {
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
const ROOT_YOBI_TOAST_DURATION_MS = 5000;

export function useRootToast() {
  const setRootToast = React.use(RootToastContext);
  if (!setRootToast) {
    throw new Error("useRootToast must be used under RootToastContext.");
  }
  return setRootToast;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootResetShell,
  notFoundComponent: RootAliasNotFound,
});

function getModalToggleSelector(element: HTMLElement) {
  return element.dataset.target ?? element.getAttribute("href")?.match(/#[^\s]+$/u)?.[0] ?? null;
}

function getRootShellModalId(selector: string | null | undefined): RootShellModalId | null {
  if (selector === "#loginDialog") {
    return "loginDialog";
  }
  if (selector === "#yobiDialog") {
    return "yobiDialog";
  }
  return null;
}

function RootResetShell() {
  const { runtimeConfig } = Route.useRouteContext();
  const [rootToast, setRootToast] = React.useState<RootToast | null>(null);
  const [rootShellModal, setRootShellModal] = React.useState<RootShellModalId | null>(null);
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

  const openRootLoginDialog = React.useCallback((resetFields: boolean) => {
    setRootShellModal("loginDialog");
    if (resetFields) {
      setRootLoginDialogResetNonce((current) => current + 1);
    }
    setRootLoginDialogState((current) => ({
      ...current,
      errorMessage: null,
      identifier: resetFields ? "" : current.identifier,
      password: resetFields ? "" : current.password,
    }));
  }, []);

  const closeRootShellModal = React.useCallback(() => {
    setRootShellModal(null);
  }, []);

  const handleRootShellClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }

      const requiredLogin = target.closest<HTMLElement>('[data-login="required"]');
      if (requiredLogin && !rendersStandaloneLoginState) {
        openRootLoginDialog(true);
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const modalToggle = target.closest<HTMLElement>('[data-toggle="modal"]');
      if (!modalToggle) {
        return;
      }

      const modalId = getRootShellModalId(getModalToggleSelector(modalToggle));
      if (!modalId) {
        return;
      }

      if (modalId === "loginDialog") {
        if (!rendersStandaloneLoginState) {
          openRootLoginDialog(false);
        }
      } else {
        setRootShellModal(modalId);
      }
      event.preventDefault();
    },
    [openRootLoginDialog, rendersStandaloneLoginState],
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
      } catch (caught) {
        setRootLoginDialogState((current) => ({
          ...current,
          errorMessage: caught instanceof Error ? caught.message : "Failed to authenticate.",
        }));
      }
    },
    [rootLoginDialogState, runtimeConfig],
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
      <Outlet />
      {rendersPlainResponseState ? null : (
        <>
          <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
            <RootYobiDialog
              isOpen={rootShellModal === "yobiDialog"}
              onDismiss={closeRootShellModal}
            />
          </LegacyI18nProvider>
          <div id="yobiToasts" className="yobiToasts">
            {rootToast ? (
              <RootYobiToast
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
          {rootShellModal ? <div className="modal-backdrop in"></div> : null}
        </>
      )}
    </>
  );

  return (
    <RootToastContext.Provider value={setRootToast}>
      {rendersPlainResponseState ? (
        rootShellContent
      ) : (
        <div style={{ display: "contents" }} onClickCapture={handleRootShellClick}>
          {rootShellContent}
        </div>
      )}
    </RootToastContext.Provider>
  );
}

function RootYobiToast({
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
    <div className="toast" tabIndex={-1}>
      <div className="btn-dismiss">
        <button type="button" className="btn-transparent" onClick={onDismiss}>
          &times;
        </button>
      </div>
      <div className="center-text">
        <span className="v" />
        <div className="msg">{message}</div>
      </div>
    </div>
  );
}

function RootYobiDialog({ isOpen, onDismiss }: RootYobiDialogProps) {
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
        <button type="button" className="btn-transparent" data-dismiss="modal" onClick={onDismiss}>
          &times;
        </button>
      </div>
      <div className="message">
        <div className="center-text">
          <p className="msg" />
          <p className="desc" />
        </div>
        <div className="center-txt buttons">
          <button type="button" className="ybtn ybtn-info" data-dismiss="modal" onClick={onDismiss}>
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
  const lostPasswordPath: string = "/lostPassword";
  const signupPath: string = "/users/signupform";
  const socialLoginOnly = capabilities?.socialLoginOnly === true;
  const socialProviders = Array.isArray(capabilities?.enabledSocialProviders)
    ? capabilities.enabledSocialProviders
    : [];

  return (
    <div
      id="loginDialog"
      className={visible ? "modal loginDialog in" : "modal hide loginDialog"}
      tabIndex={-1}
      role="dialog"
      aria-hidden={!visible}
    >
      <div className="modal-body">
        <div className="pull-right">
          <button type="button" className="close" data-dismiss="modal" onClick={onDismiss}>
            &times;
          </button>
        </div>
        <form
          action="/users/login"
          method="post"
          className="frm-wrap login-form-wrap"
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
              >
                <i className="yobicon-error" />
                <span className="error-message">{state.errorMessage ?? ""}</span>
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
              <div className="social-login-title-line"> {t("title.or")} </div>
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
            <div className="act-row right-txt mt20">
              <div className="pull-left">
                <input
                  id="remember-meD"
                  type="checkbox"
                  name="rememberMe"
                  className="checkbox"
                  checked={state.rememberMe}
                  onChange={(event) => onRememberMeChange(event.target.checked)}
                />
                <label htmlFor="remember-meD" className="bg-checkbox">
                  {t("title.rememberMe")}
                </label>
              </div>
              <Link to={lostPasswordPath} href={prefixBasePath(basePath, "/lostPassword")}>
                {t("title.resetPassword")}
              </Link>
              <span className="gray-txt ml10 mr10">|</span>
              <Link to={signupPath} href={prefixBasePath(basePath, "/users/signupform")}>
                {t("title.signup")}
              </Link>
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
    <Link
      to={providerLoginPath}
      href={prefixBasePath(basePath, providerLoginPath)}
      className="ybtn oauth-login-btn"
      reloadDocument
    >
      {normalized === "github" ? (
        <span className="auth-provider-logo">
          <span className="github">
            <svg aria-hidden="true" height="24" version="1.1" viewBox="0 0 16 16" width="19">
              <path d="" />
            </svg>
          </span>{" "}
          <span className="provider-name">Sign in with github</span>
        </span>
      ) : (
        <span className="auth-provider-logo">
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

function RootMountedRootLinkAnchor({
  legacyRootHref,
  href: _href,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"a"> & {
  legacyRootHref: string;
  ref?: React.Ref<HTMLAnchorElement>;
}) {
  return reactJsx("a", { ...props, ref, href: legacyRootHref });
}

const RootMountedRootLink = createLink(RootMountedRootLinkAnchor);

function RootAliasNotFoundScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const router = useRouter();
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
  const feedbackUrl: string = "https://github.com/nforge/yobi/issues?state=open";
  const projectListPath: string = "/projects";
  const loginFormPath: string = "/users/loginform";
  const signupFormPath: string = "/users/signupform";
  const logoutPath: string = "/logout";
  const naverCorpUrl: string = "http://navercorp.com/";
  const d2ProgramUrl: string = "https://developers.naver.com/d2/";
  const homeHref = prefixBasePath(runtimeConfig.basePath, "/");
  const handleMountedRootClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      router.history.push(homeHref);
    },
    [homeHref, router.history],
  );

  if (pathname === "/reset-password") {
    return <Navigate to="/resetPassword" search={resetPasswordSearch} replace />;
  }

  return (
    <>
      <header className="gnb-outer">
        <div className="gnb-inner">
          <RootMountedRootLink
            activeOptions={legacyPlainLinkActiveOptions}
            activeProps={legacyPlainLinkActiveProps}
            className="logo"
            legacyRootHref={homeHref}
            onClick={handleMountedRootClick}
            to="/"
          >
            <h1 className="blind">{runtimeConfig.siteName ?? "Yona"}</h1>
          </RootMountedRootLink>
          <ul className="gnb-nav">
            <li>
              <Link to={projectListPath} href={prefixBasePath(runtimeConfig.basePath, "/projects")}>
                {t("title.projectList")}
              </Link>
            </li>
            <li>
              <Link to="/_help">{t("title.help")}</Link>
            </li>
            <li>
              <Link
                to={feedbackUrl}
                href="https://github.com/nforge/yobi/issues?state=open"
                target="_blank"
              >
                {t("title.yobi.feedback")}
              </Link>
            </li>
          </ul>
          <div id="mySidenav" className="sidenav">
            <div className="span5 right-menu span-hard-wrap">
              <div className="row-fluid user-menu-wrap">
                <span className="user-menu">
                  <Link
                    to="/user/anonymous"
                    href={prefixBasePath(runtimeConfig.basePath, "/user/anonymous")}
                    reloadDocument
                  >
                    {t("userinfo.profile")}
                  </Link>
                </span>
                <span className="user-menu">
                  <Link to="/user/editform" search={{}} reloadDocument>
                    {t("userinfo.accountSetting")}
                  </Link>
                </span>
                <Link
                  to={logoutPath}
                  href={prefixBasePath(runtimeConfig.basePath, "/logout")}
                  reloadDocument
                >
                  <span className="user-menu logout label">{t("title.logout")}</span>
                </Link>
              </div>
              <ul className="nav nav-tabs nm">
                <li
                  className={`myOrganizationList${activeUsermenuTab === "myOrganizationList" ? " active" : ""}`}
                >
                  <button
                    type="button"
                    data-toggle="tab"
                    onClick={handleUsermenuTabClick("myOrganizationList")}
                  >
                    {t("title.favorite")}
                  </button>
                </li>
                <li
                  className={`myProjectList${activeUsermenuTab === "myProjectList" ? " active" : ""}`}
                >
                  <button
                    type="button"
                    data-toggle="tab"
                    onClick={handleUsermenuTabClick("myProjectList")}
                  >
                    {t("title.project")}
                  </button>
                </li>
                <li
                  className={`myRecentIssueList${activeUsermenuTab === "myRecentIssueList" ? " active" : ""}`}
                >
                  <button
                    type="button"
                    data-toggle="tab"
                    onClick={handleUsermenuTabClick("myRecentIssueList")}
                  >
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
              <Link
                to={loginFormPath}
                href={prefixBasePath(runtimeConfig.basePath, "/users/loginform")}
                className="user-item-btn"
                data-login="required"
              >
                {t("title.login")}
              </Link>
            </li>
            <li className="divider"></li>
            <li>
              <Link
                to={signupFormPath}
                href={prefixBasePath(runtimeConfig.basePath, "/users/signupform")}
                className="ybtn ybtn-success"
              >
                {t("title.signup")}
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
            <RootMountedRootLink
              activeOptions={legacyPlainLinkActiveOptions}
              activeProps={legacyPlainLinkActiveProps}
              className="ybtn ybtn-info"
              legacyRootHref={homeHref}
              onClick={handleMountedRootClick}
              to="/"
            >
              {t("menu.home")}
            </RootMountedRootLink>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            Copyright ©{" "}
            <Link to={naverCorpUrl} href="http://navercorp.com/" target="_blank">
              NAVER Corp.
            </Link>{" "}
            Supported by{" "}
            <Link
              to={d2ProgramUrl}
              href="https://developers.naver.com/d2/"
              target="_blank"
              className="d2-program"
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
