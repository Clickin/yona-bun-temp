import * as React from "react";
import { Link, Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { readAuthUiCapabilitiesRest, signInWithPasswordRest } from "../api/auth";
import type { ReadAuthUiCapabilitiesResponse } from "../api/types";
import { readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, resolveInitialLanguage, useLegacyMessages } from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

export interface AppRouterContext {
  runtimeConfig: RuntimeConfig;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootResetShell,
  notFoundComponent: RootAliasNotFound,
});

function RootResetShell() {
  const { runtimeConfig } = Route.useRouteContext();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const rendersPlainResponseState = pathname.startsWith("/verify/");
  const rendersStandaloneLoginState = pathname === "/users/loginform";

  React.useEffect(() => {
    if (rendersPlainResponseState) {
      return;
    }
    scanNotifySources();
    scanOriginalMessageSources();
    const timeoutId = window.setTimeout(() => {
      scanNotifySources();
      scanOriginalMessageSources();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [locationHref, rendersPlainResponseState]);

  React.useEffect(() => {
    if (rendersPlainResponseState) {
      return;
    }
    document.addEventListener("yobi:notify-scan", scanNotifySources);
    document.addEventListener("yobi:original-message-scan", scanOriginalMessageSources);
    return () => {
      document.removeEventListener("yobi:notify-scan", scanNotifySources);
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

      const tabToggle = target?.closest<HTMLElement>('[data-toggle="tab"], [data-toggle="pill"]');
      if (tabToggle) {
        const selector =
          tabToggle.dataset.target ?? tabToggle.getAttribute("href")?.match(/#[^\s]*$/u)?.[0];
        const pane = selector?.startsWith("#") ? document.getElementById(selector.slice(1)) : null;
        const nav = tabToggle.closest<HTMLElement>("ul:not(.dropdown-menu)");
        const item = tabToggle.closest<HTMLElement>("li");
        if (nav && item && pane) {
          nav.querySelectorAll(":scope > .active").forEach((active) => {
            active.classList.remove("active");
            active.querySelectorAll(":scope > .dropdown-menu > .active").forEach((dropdownItem) => {
              dropdownItem.classList.remove("active");
            });
          });
          item.classList.add("active");

          pane.parentElement?.querySelectorAll(":scope > .active").forEach((activePane) => {
            activePane.classList.remove("active", "in");
          });
          pane.classList.add("active");
          if (pane.classList.contains("fade")) {
            pane.classList.add("in");
          }
        }
        event.preventDefault();
        return;
      }

      const commentEdit = target?.closest<HTMLElement>(
        '[data-toggle="comment-edit"], .comment-update-form .ybtn-cancel[data-comment-id]',
      );
      if (commentEdit) {
        const commentId = commentEdit.dataset.commentId;
        const editForm = commentId
          ? document.getElementById(`comment-editform-${commentId}`)
          : null;
        const commentBody = commentId ? document.getElementById(`comment-body-${commentId}`) : null;
        if (editForm && commentBody) {
          const willShowForm = window.getComputedStyle(editForm).display === "none";
          editForm.setAttribute("style", `display: ${willShowForm ? "block" : "none"};`);
          if (willShowForm) {
            commentBody.setAttribute("style", "display: none;");
          } else {
            commentBody.removeAttribute("style");
          }
          document.querySelectorAll<HTMLElement>(".add-a-comment").forEach((reply) => {
            reply.setAttribute("style", "display: none;");
          });
        }
        event.preventDefault();
        return;
      }

      const commentDelete = target?.closest<HTMLElement>('[data-toggle="comment-delete"]');
      if (commentDelete) {
        const modal = document.querySelector<HTMLElement>("#comment-delete-modal");
        const confirm = document.querySelector<HTMLElement>("#comment-delete-confirm");
        const requestUri = commentDelete.dataset.requestUri;
        if (modal && confirm && requestUri) {
          confirm.dataset.requestUri = requestUri;
          confirm.dataset.requestMethod = "delete";
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

      const searchScope = target?.closest<HTMLElement>('[data-toggle="search-scope"]');
      if (searchScope) {
        const action = searchScope.dataset.action;
        if (action) {
          document
            .querySelector<HTMLFormElement>('form[name="gnb-search-form"]')
            ?.setAttribute("action", action);
        }
        const scopeTitle = document.querySelector<HTMLElement>("#gnb-search-scope-title");
        if (scopeTitle) {
          scopeTitle.textContent = searchScope.textContent ?? "";
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

  function scanNotifySources() {
    document.querySelectorAll<HTMLElement>('[data-toggle="yobi-notify"]').forEach((source) => {
      if (source.dataset.yobiNotified === "true") {
        return;
      }
      const message = source.dataset.message ?? source.textContent ?? "";
      const container = document.querySelector("#yobiToasts");
      if (!container || message.trim() === "") {
        return;
      }

      source.dataset.yobiNotified = "true";
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.tabIndex = -1;
      toast.innerHTML = `<div class="btn-dismiss"><button type="button" class="btn-transparent">&times;</button></div><div class="center-text"><span class="v"></span><div class="msg"></div></div>`;
      const messageNode = toast.querySelector(".msg");
      if (messageNode) {
        messageNode.textContent = message;
      }
      container.append(toast);
      source.remove();
    });
  }

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
    <>
      <Outlet />
      {rendersPlainResponseState ? null : (
        <>
          <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
            <RootYobiDialog />
          </LegacyI18nProvider>
          <div id="yobiToasts" className="yobiToasts" />
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
    </>
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
  return (
    <>
      <script
        id="tplSelect2FormatUser"
        type="text/x-jquery-tmpl"
        dangerouslySetInnerHTML={{
          __html:
            '<div class="usf-group" title="${name} ${loginId}">\n    <span class="avatar-wrap smaller"><img src="${avatarURL}" width="20" height="20"></span>\n    <strong class="name">${name}</strong>\n    <span class="loginid">${loginId}</span>\n</div>',
        }}
      />
      <script
        id="tplSelect2FormatMilestone"
        type="text/x-jquery-tmpl"
        dangerouslySetInnerHTML={{
          __html: '<div title="[${stateLabel}] ${name}">\n    ${name}\n</div>',
        }}
      />
      <script
        id="tplSelect2Projects"
        type="text/x-jquery-tmpl"
        dangerouslySetInnerHTML={{
          __html:
            '<div class="usf-group" title="${name}">\n    <span class="avatar-wrap smaller"><img src="${avatarURL}" width="16" height="16"></span>\n    <span class="loginid">${owner}</span>\n    <span class="name">${name}</span>\n</div>',
        }}
      />
      <script
        id="tplSelect2ProjectsWithoutAvatar"
        type="text/x-jquery-tmpl"
        dangerouslySetInnerHTML={{
          __html:
            '<div class="usf-group" title="${name}">\n    <span class="width25px"></span>\n    <span class="loginid">${owner}</span>\n    <span class="name">${name}</span>\n</div>',
        }}
      />
      <script
        id="tplSelect2FormatIssues"
        type="text/x-jquery-tmpl"
        dangerouslySetInnerHTML={{
          __html: '<div title="${name}">\n    ${name}\n</div>',
        }}
      />
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
              <a href={prefixBasePath(basePath, "/lostPassword")}>{t("title.resetPassword")}</a>
              <span className="gray-txt ml10 mr10">|</span>
              <a href={prefixBasePath(basePath, "/users/signupform")}>{t("title.signup")}</a>
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

  return (
    <a
      href={prefixBasePath(basePath, `/authenticate/${normalized}`)}
      className="ybtn oauth-login-btn"
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
    </a>
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

  React.useEffect(() => {
    if (pathname === "/reset-password") {
      window.location.replace(
        `${prefixBasePath(runtimeConfig.basePath, "/resetPassword")}${window.location.search}`,
      );
    }
  }, [pathname, runtimeConfig.basePath]);

  if (pathname === "/reset-password") {
    return null;
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
              <a href={prefixBasePath(runtimeConfig.basePath, "/projects")}>
                {t("title.projectList")}
              </a>
            </li>
            <li>
              <Link to="/_help">{t("title.help")}</Link>
            </li>
            <li>
              <a href="https://github.com/nforge/yobi/issues?state=open" target="_blank">
                {t("title.yobi.feedback")}
              </a>
            </li>
          </ul>
          <div id="mySidenav" className="sidenav">
            <div className="span5 right-menu span-hard-wrap">
              <div className="row-fluid user-menu-wrap">
                <span className="user-menu">
                  <a href={prefixBasePath(runtimeConfig.basePath, "/user/anonymous")}>
                    {t("userinfo.profile")}
                  </a>
                </span>
                <span className="user-menu">
                  <a href={prefixBasePath(runtimeConfig.basePath, "/user/editform")}>
                    {t("userinfo.accountSetting")}
                  </a>
                </span>
                <a href={prefixBasePath(runtimeConfig.basePath, "/logout")}>
                  <span className="user-menu logout label">{t("title.logout")}</span>
                </a>
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
              <a
                href={prefixBasePath(runtimeConfig.basePath, "/users/loginform")}
                className="user-item-btn"
                data-login="required"
              >
                {t("title.login")}
              </a>
            </li>
            <li className="divider"></li>
            <li>
              <a
                href={prefixBasePath(runtimeConfig.basePath, "/users/signupform")}
                className="ybtn ybtn-success"
              >
                {t("title.signup")}
              </a>
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
            <a href="http://navercorp.com/" target="_blank">
              NAVER Corp.
            </a>{" "}
            Supported by{" "}
            <a href="https://developers.naver.com/d2/" target="_blank" className="d2-program">
              <span className="d2">D2</span>
              <span className="program"> Program</span>
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}
