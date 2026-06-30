import * as React from "react";
import { Link, Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
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

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [rendersPlainResponseState]);

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
          <div
            id="yobiDialog"
            className="modal hide yobiDialog"
            tabIndex={-1}
            role="dialog"
            aria-hidden
          >
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
                  Confirm
                </button>
              </div>
            </div>
          </div>
          <div id="yobiToasts" className="yobiToasts" />
          <script type="text/x-jquery-tmpl" id="tplYobiToast">
            {
              '<div class="toast" tabindex="-1"><div class="btn-dismiss"><button type="button" class="btn-transparent">&times;</button></div><div class="center-text"><span class="v"></span><div class="msg"></div></div></div>'
            }
          </script>
          {rendersStandaloneLoginState ? null : (
            <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
              <RootLoginDialog basePath={runtimeConfig.basePath} />
            </LegacyI18nProvider>
          )}
        </>
      )}
    </>
  );
}

function RootLoginDialog({ basePath }: { basePath: string }) {
  const { t } = useLegacyMessages();

  return (
    <div id="loginDialog" className="modal hide loginDialog" tabIndex={-1} role="dialog">
      <div className="modal-body">
        <div className="pull-right">
          <button type="button" className="close" data-dismiss="modal" aria-hidden="true">
            &times;
          </button>
        </div>
        <form action="/users/login" method="post" className="frm-wrap login-form-wrap">
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
          <div className="btns-row nm" />
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
        </form>
      </div>
    </div>
  );
}

function RootAliasNotFound() {
  const { runtimeConfig } = Route.useRouteContext();
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
              <a href={prefixBasePath(runtimeConfig.basePath, "/projects")}>Project list</a>
            </li>
            <li>
              <Link to="/_help">Help</Link>
            </li>
            <li>
              <a href="https://github.com/nforge/yobi/issues?state=open" target="_blank">
                Feedback
              </a>
            </li>
          </ul>
        </div>
      </header>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="error-wrap">
            <i className="ico ico-err2" />
            <p>Page not found</p>
            <Link to="/" className="ybtn ybtn-info">
              Home
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
