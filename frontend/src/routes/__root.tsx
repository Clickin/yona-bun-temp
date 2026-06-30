import * as React from "react";
import { Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
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

  React.useEffect(() => {
    scanNotifySources();
    const timeoutId = window.setTimeout(scanNotifySources, 0);
    return () => window.clearTimeout(timeoutId);
  }, [locationHref]);

  React.useEffect(() => {
    document.addEventListener("yobi:notify-scan", scanNotifySources);
    return () => document.removeEventListener("yobi:notify-scan", scanNotifySources);
  });

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
  );
}

function RootAliasNotFound() {
  const { runtimeConfig } = Route.useRouteContext();

  React.useEffect(() => {
    const basePath = runtimeConfig.basePath === "/" ? "" : runtimeConfig.basePath;
    const pathname = window.location.pathname.slice(basePath.length) || "/";
    if (pathname === "/reset-password") {
      window.location.replace(
        `${prefixBasePath(runtimeConfig.basePath, "/resetPassword")}${window.location.search}`,
      );
    }
  }, [runtimeConfig.basePath]);

  return null;
}
