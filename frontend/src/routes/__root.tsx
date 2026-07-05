import * as React from "react";
import {
  Link,
  Navigate,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { readAuthUiCapabilitiesRest, signInWithPasswordRest } from "../api/auth";
import type { ReadAuthUiCapabilitiesResponse } from "../api/types";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, resolveInitialLanguage, useLegacyMessages } from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

export interface AppRouterContext {
  runtimeConfig: RuntimeConfig;
}

type RootToast = {
  key: string;
  message: string;
};

const RootToastContext = React.createContext<React.Dispatch<
  React.SetStateAction<RootToast | null>
> | null>(null);

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

function RootResetShell() {
  const { runtimeConfig } = Route.useRouteContext();
  const [rootToast, setRootToast] = React.useState<RootToast | null>(null);
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const rendersPlainResponseState = pathname.startsWith("/verify/");
  const rendersStandaloneLoginState = pathname === "/users/loginform";

  React.useEffect(() => {
    if (rendersPlainResponseState) {
      return;
    }
    scanOriginalMessageSources();
    const timeoutId = window.setTimeout(() => {
      scanOriginalMessageSources();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [locationHref, rendersPlainResponseState]);

  React.useEffect(() => {
    if (rendersPlainResponseState) {
      return;
    }
    document.addEventListener("yobi:original-message-scan", scanOriginalMessageSources);
    return () => {
      document.removeEventListener("yobi:original-message-scan", scanOriginalMessageSources);
    };
  }, [rendersPlainResponseState]);

  React.useEffect(() => {
    if (rendersPlainResponseState) {
      return;
    }

    function closeDropdowns(except?: Element | null) {
      document.querySelectorAll(".btn-group.open, .dropdown.open").forEach((container) => {
        if (container !== except) {
          container.classList.remove("open");
        }
      });
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const dismissModal = target?.closest<HTMLElement>('[data-dismiss="modal"]');
      if (dismissModal) {
        const modal = dismissModal.closest<HTMLElement>(".modal");
        if (modal) {
          modal.classList.add("hide");
          modal.classList.remove("in");
          modal.style.display = "none";
          modal.setAttribute("aria-hidden", "true");
        }
        document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove());
        event.preventDefault();
        return;
      }

      const requiredLogin = target?.closest<HTMLElement>('[data-login="required"]');
      if (requiredLogin) {
        const dialog = document.querySelector<HTMLElement>("#loginDialog");
        if (dialog) {
          dialog
            .querySelectorAll<HTMLInputElement>(
              'input[name="loginIdOrEmail"], input[name="password"]',
            )
            .forEach((input) => {
              input.value = "";
            });
          const error = dialog.querySelector<HTMLElement>(".error");
          if (error) {
            error.style.display = "none";
          }
          dialog.classList.remove("hide");
          dialog.classList.add("in");
          dialog.style.display = "block";
          dialog.setAttribute("aria-hidden", "false");
          if (!document.querySelector(".modal-backdrop")) {
            const backdrop = document.createElement("div");
            backdrop.className = "modal-backdrop in";
            document.body.append(backdrop);
          }
          window.setTimeout(() => {
            dialog.querySelector<HTMLInputElement>('input[name="loginIdOrEmail"]')?.focus();
          }, 0);
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const modalToggle = target?.closest<HTMLElement>('[data-toggle="modal"]');
      if (modalToggle) {
        const selector =
          modalToggle.dataset.target ?? modalToggle.getAttribute("href")?.match(/#[^\s]+$/u)?.[0];
        const modal = selector?.startsWith("#") ? document.getElementById(selector.slice(1)) : null;
        if (modal) {
          modal.classList.remove("hide");
          modal.classList.add("in");
          modal.style.display = "block";
          modal.setAttribute("aria-hidden", "false");
          if (!document.querySelector(".modal-backdrop")) {
            const backdrop = document.createElement("div");
            backdrop.className = modal.classList.contains("fade")
              ? "modal-backdrop fade in"
              : "modal-backdrop in";
            document.body.append(backdrop);
          }
          window.setTimeout(() => modal.focus(), 0);
        }
        event.preventDefault();
        return;
      }

      const dismissAlert = target?.closest<HTMLElement>('[data-dismiss="alert"]');
      if (dismissAlert) {
        dismissAlert.closest<HTMLElement>(".alert")?.remove();
        event.preventDefault();
        return;
      }

      const markdownHelp = target?.closest<HTMLElement>('[data-toggle="markdown-help"]');
      if (markdownHelp) {
        const markdownHelpRoot = markdownHelp.closest(".markdown-help");
        const targetName = markdownHelp.dataset.target;
        if (markdownHelpRoot && targetName) {
          const wasActive = markdownHelp.classList.contains("active");
          markdownHelp.parentElement
            ?.querySelectorAll(".help-nav.active")
            .forEach((item) => item.classList.remove("active"));
          markdownHelpRoot
            .querySelectorAll(".markdown-help-wrap > .active")
            .forEach((item) => item.classList.remove("active"));
          if (!wasActive) {
            markdownHelp.classList.add("active");
            markdownHelpRoot
              .querySelector(`.markdown-help-wrap > .${CSS.escape(targetName)}`)
              ?.classList.add("active");
          }
        }
        event.preventDefault();
        return;
      }

      const toggle = target?.closest<HTMLElement>('[data-toggle="dropdown"]');
      if (toggle) {
        const container = toggle.closest(".btn-group, .dropdown");
        const isOpen = container?.classList.contains("open") ?? false;
        closeDropdowns(container);
        container?.classList.toggle("open", !isOpen);
        event.preventDefault();
        return;
      }

      const selectedItem = target?.closest<HTMLElement>(".btn-group[data-name] .dropdown-menu li");
      if (selectedItem) {
        const container = selectedItem.closest<HTMLElement>(".btn-group[data-name]");
        const fieldName = container?.dataset.name;
        if (
          !container ||
          container.dataset.activate === "manual" ||
          !fieldName ||
          selectedItem.dataset.value === undefined
        ) {
          event.preventDefault();
          return;
        }

        const label = container.querySelector<HTMLElement>(".d-label");
        if (label) {
          label.innerHTML = selectedItem.innerHTML;
        }
        container.querySelectorAll(".dropdown-menu li.active").forEach((item) => {
          item.classList.remove("active");
        });
        selectedItem.classList.add("active");

        let hiddenInput = container.querySelector<HTMLInputElement>(
          `input[type="hidden"][name="${CSS.escape(fieldName)}"]`,
        );
        if (!hiddenInput) {
          hiddenInput = document.createElement("input");
          hiddenInput.type = "hidden";
          hiddenInput.name = fieldName;
          container.append(hiddenInput);
        }
        hiddenInput.value = selectedItem.dataset.value ?? "";
      }

      if (!target?.closest(".btn-group.open, .dropdown.open")) {
        closeDropdowns();
      }
    }

    function handleDocumentSubmit(event: SubmitEvent) {
      const form =
        event.target instanceof HTMLFormElement &&
        event.target.closest("#loginDialog .login-form-wrap") === event.target
          ? event.target
          : null;
      if (!form) {
        return;
      }

      event.preventDefault();
      const dialog = form.closest<HTMLElement>("#loginDialog");
      const error = dialog?.querySelector<HTMLElement>(".error");
      const errorMessage = error?.querySelector<HTMLElement>(".error-message");
      if (error) {
        error.style.display = "none";
      }
      if (errorMessage) {
        errorMessage.textContent = "";
      }

      const formData = new FormData(form);
      void submitLoginDialogForm(formData, runtimeConfig)
        .then(() => {
          window.location.reload();
        })
        .catch((caught) => {
          if (errorMessage) {
            errorMessage.textContent =
              caught instanceof Error ? caught.message : "Failed to authenticate.";
          }
          if (error) {
            error.style.display = "block";
          }
        });
    }

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("submit", handleDocumentSubmit);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("submit", handleDocumentSubmit);
    };
  }, [rendersPlainResponseState, runtimeConfig]);

  function scanOriginalMessageSources() {
    document.querySelectorAll<HTMLElement>("[data-via-email]").forEach((target) => {
      if (target.dataset.yobiOriginalMessageProcessed === "true") {
        return;
      }
      target.dataset.yobiOriginalMessageProcessed = "true";

      const delimiter = Array.from(target.querySelectorAll<HTMLElement>("*")).find((candidate) => {
        const html = candidate.innerHTML;
        return (
          candidate !== target.firstElementChild &&
          html.includes("---") &&
          /(^|^<[^>]+>)---+[^-]*---+/.test(html)
        );
      });
      if (!delimiter) {
        return;
      }

      const originalMessage = new Set<HTMLElement>();
      function addFollowingSiblings(element: Element) {
        let sibling = element.nextElementSibling;
        while (sibling) {
          if (sibling instanceof HTMLElement) {
            originalMessage.add(sibling);
          }
          sibling = sibling.nextElementSibling;
        }
      }

      originalMessage.add(delimiter);
      addFollowingSiblings(delimiter);
      let parent = delimiter.parentElement;
      while (parent && parent !== target) {
        addFollowingSiblings(parent);
        parent = parent.parentElement;
      }

      originalMessage.forEach((element) => {
        element.style.display = "none";
      });

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.textContent = "...";
      toggle.style.cssText = "border: 0px; padding-left: 5px; padding-right: 5px;";
      toggle.addEventListener("click", () => {
        const shouldShow = Array.from(originalMessage).some(
          (element) => element.style.display === "none",
        );
        originalMessage.forEach((element) => {
          element.style.display = shouldShow ? "" : "none";
        });
      });
      delimiter.before(toggle);
    });
  }

  return (
    <RootToastContext.Provider value={setRootToast}>
      <Outlet />
      {rendersPlainResponseState ? null : (
        <>
          <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
            <RootYobiDialog />
          </LegacyI18nProvider>
          <div id="yobiToasts" className="yobiToasts">
            {rootToast ? (
              <RootYobiToast
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
              <RootLoginDialog runtimeConfig={runtimeConfig} />
            </LegacyI18nProvider>
          )}
        </>
      )}
    </RootToastContext.Provider>
  );
}

function RootYobiToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
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

function RootYobiDialog() {
  const { t } = useLegacyMessages();
  return (
    <div id="yobiDialog" className="modal hide yobiDialog" tabIndex={-1} role="dialog" aria-hidden>
      <div className="btn-dismiss">
        <button type="button" className="btn-transparent" data-dismiss="modal">
          &times;
        </button>
      </div>
      <div className="message">
        <div className="center-text">
          <p className="msg" />
          <p className="desc" />
        </div>
        <div className="center-txt buttons">
          <button type="button" className="ybtn ybtn-info" data-dismiss="modal">
            {t("button.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

async function submitLoginDialogForm(formData: FormData, runtimeConfig: RuntimeConfig) {
  const { csrfToken } = await readSessionBootstrap(runtimeConfig);
  await signInWithPasswordRest(runtimeConfig, csrfToken, {
    identifier: String(formData.get("loginIdOrEmail") ?? ""),
    password: String(formData.get("password") ?? ""),
    rememberMe: formData.get("rememberMe") === "on",
  });
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

function RootLoginDialog({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
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
    <div id="loginDialog" className="modal hide loginDialog" tabIndex={-1} role="dialog">
      <div className="modal-body">
        <div className="pull-right">
          <button type="button" className="close" data-dismiss="modal">
            &times;
          </button>
        </div>
        <form action="/users/login" method="post" className="frm-wrap login-form-wrap">
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
                  />
                </dd>
              </dl>
              <div className="error">
                <i className="yobicon-error" />
                <span className="error-message" />
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
                  defaultChecked
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
  const basePath = runtimeConfig.basePath === "/" ? "" : runtimeConfig.basePath;
  const pathname =
    typeof window === "undefined" ? "/" : window.location.pathname.slice(basePath.length) || "/";
  const resetPasswordSearch = useRouterState({ select: (state) => state.location.search });
  const feedbackUrl: string = "https://github.com/nforge/yobi/issues?state=open";
  const projectListPath: string = "/projects";
  const loginFormPath: string = "/users/loginform";
  const signupFormPath: string = "/users/signupform";
  const logoutPath: string = "/logout";
  const naverCorpUrl: string = "http://navercorp.com/";
  const d2ProgramUrl: string = "https://developers.naver.com/d2/";

  if (pathname === "/reset-password") {
    return <Navigate to="/resetPassword" search={resetPasswordSearch} replace />;
  }

  return (
    <>
      <header className="gnb-outer">
        <div className="gnb-inner">
          <Link to="/" className="logo">
            <h1 className="blind">{runtimeConfig.siteName ?? "Yona"}</h1>
          </Link>
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
            <Link to="/" className="ybtn ybtn-info">
              {t("menu.home")}
            </Link>
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
