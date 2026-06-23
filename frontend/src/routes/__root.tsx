import * as React from "react";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { AppRuntimeProvider, useAppRuntime } from "../app-runtime-context";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { LegacyLoginDialog } from "./-auth-views";

export interface AppRouterContext {
  runtimeConfig: RuntimeConfig;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootRouteComponent,
});

function RootRouteComponent() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <AppRuntimeProvider runtimeConfig={runtimeConfig}>
        <RuntimeErrorBanner />
        <RootUserMenu />
        <Outlet />
        <RootLoginDialog />
      </AppRuntimeProvider>
    </YonaQueryProvider>
  );
}

function RootUserMenu() {
  const { currentSession, runtimeConfig } = useAppRuntime();

  if (!currentSession || currentSession.isAnonymous) {
    return null;
  }

  const customLinkName = runtimeConfig.navbarCustomLinkName?.trim();
  if (!customLinkName && !currentSession.isSiteAdmin) {
    return null;
  }

  return (
    <ul className="gnb-usermenu">
      {currentSession.isSiteAdmin ? (
        <li className="gnb-usermenu-item admin-logged-in-affix">
          <a
            className="user-item-btn loggged-in"
            href={prefixBasePath(runtimeConfig.basePath, "/sites/userList")}
          >
            <i className="yobicon-wrench"></i>
          </a>
        </li>
      ) : null}
      {customLinkName ? (
        <li className="gnb-usermenu-item">
          <a
            className="user-item-btn loggged-in"
            href={prefixBasePath(runtimeConfig.basePath, runtimeConfig.navbarCustomLinkUrl || "/")}
          >
            {customLinkName}
          </a>
        </li>
      ) : null}
    </ul>
  );
}

function RootLoginDialog() {
  const { authUiCapabilities, csrfToken, runtimeConfig } = useAppRuntime();

  return (
    <LegacyLoginDialog
      authUiCapabilities={authUiCapabilities}
      csrfToken={csrfToken}
      runtimeConfig={runtimeConfig}
    />
  );
}

function RuntimeErrorBanner() {
  const { errorMessage, messages, setErrorMessage } = useAppRuntime();

  if (!errorMessage) {
    return null;
  }

  const translatedErrorMessage = messages(errorMessage, { fallback: errorMessage });
  const closeLabel = messages("button.close", { fallback: "button.close" });

  return (
    <div className="runtime-error-banner" role="alert">
      <span>{translatedErrorMessage}</span>
      <button onClick={() => setErrorMessage(null)} type="button">
        {closeLabel}
      </button>
    </div>
  );
}
