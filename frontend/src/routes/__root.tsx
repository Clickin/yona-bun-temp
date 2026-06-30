import * as React from "react";
import { Link, Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

export interface AppRouterContext {
  runtimeConfig: RuntimeConfig;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootResetShell,
  notFoundComponent: RootAliasNotFound,
});

function RootResetShell() {
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const rendersPlainResponseState = pathname.startsWith("/verify/");

  React.useEffect(() => {
    if (rendersPlainResponseState) {
      return;
    }
    scanNotifySources();
    const timeoutId = window.setTimeout(scanNotifySources, 0);
    return () => window.clearTimeout(timeoutId);
  }, [locationHref, rendersPlainResponseState]);

  React.useEffect(() => {
    if (rendersPlainResponseState) {
      return;
    }
    document.addEventListener("yobi:notify-scan", scanNotifySources);
    return () => document.removeEventListener("yobi:notify-scan", scanNotifySources);
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
        </>
      )}
    </>
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
