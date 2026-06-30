import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { prefixBasePath } from "../runtime-config";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordAliasRoute,
});

function ForgotPasswordAliasRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  React.useEffect(() => {
    window.location.replace(
      `${prefixBasePath(runtimeConfig.basePath, "/lostPassword")}${window.location.search}`,
    );
  }, [runtimeConfig.basePath]);

  return null;
}
