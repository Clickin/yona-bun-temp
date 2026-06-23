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
        <RootCustomNavbarLink />
        <Outlet />
        <RootLoginDialog />
      </AppRuntimeProvider>
    </YonaQueryProvider>
  );
}

function RootCustomNavbarLink() {
  const { currentSession, runtimeConfig } = useAppRuntime();
  const name = runtimeConfig.navbarCustomLinkName?.trim();

  if (!name || !currentSession || currentSession.isAnonymous) {
    return null;
  }

  return (
    <ul className="gnb-usermenu">
      <li className="gnb-usermenu-item">
        <a
          className="user-item-btn loggged-in"
          href={prefixBasePath(runtimeConfig.basePath, runtimeConfig.navbarCustomLinkUrl || "/")}
        >
          {name}
        </a>
      </li>
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
