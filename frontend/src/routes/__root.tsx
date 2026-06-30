import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { RuntimeConfig } from "../runtime-config";

export interface AppRouterContext {
  runtimeConfig: RuntimeConfig;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootResetShell,
});

function RootResetShell() {
  return <Outlet />;
}
