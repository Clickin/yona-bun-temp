import * as React from "react";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { AppRuntimeProvider, useAppRuntime } from "../app-runtime-context";
import { YonaQueryProvider } from "../query-client";
import type { RuntimeConfig } from "../runtime-config";

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
        <Outlet />
      </AppRuntimeProvider>
    </YonaQueryProvider>
  );
}

function RuntimeErrorBanner() {
  const { errorMessage, setErrorMessage } = useAppRuntime();

  if (!errorMessage) {
    return null;
  }

  return (
    <div className="runtime-error-banner" role="alert">
      <span>{errorMessage}</span>
      <button onClick={() => setErrorMessage(null)} type="button">
        Dismiss
      </button>
    </div>
  );
}
