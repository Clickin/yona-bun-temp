import * as React from "react";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { AppRuntimeProvider } from "../app-runtime-context";
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
    <AppRuntimeProvider runtimeConfig={runtimeConfig}>
      <Outlet />
    </AppRuntimeProvider>
  );
}
