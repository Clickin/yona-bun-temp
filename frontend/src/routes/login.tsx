import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { prefixBasePath } from "../runtime-config";

export const Route = createFileRoute("/login")({
  component: LoginAliasRoute,
});

function LoginAliasRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  React.useEffect(() => {
    window.location.replace(
      `${prefixBasePath(runtimeConfig.basePath, "/users/loginform")}${window.location.search}`,
    );
  }, [runtimeConfig.basePath]);

  return null;
}
