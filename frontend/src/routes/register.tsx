import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { prefixBasePath } from "../runtime-config";

export const Route = createFileRoute("/register")({
  component: RegisterAliasRoute,
});

function RegisterAliasRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  React.useEffect(() => {
    window.location.replace(
      `${prefixBasePath(runtimeConfig.basePath, "/users/signupform")}${window.location.search}`,
    );
  }, [runtimeConfig.basePath]);

  return null;
}
