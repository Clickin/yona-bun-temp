import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProjectCodeBranchIndexScreen } from "../$branch";

export const Route = createFileRoute("/$ownerName/$projectName/code/$branch/")({
  beforeLoad: ({ location }) => {
    // legacy code/CodeApp stripTrailingSlash replaces the bare pathname
    // (query+hash dropped). The trailing-slash URL matches this index route;
    // the router's redirect search/hash opts are not applied to schema-less
    // routes, so clear the history entry and land on the clean canonical path.
    // The index route also matches the slash-less URL, so only redirect
    // when the incoming path actually carried the trailing slash (legacy
    // stripTrailingSlash also drops the query and fragment).
    const canonicalPath = location.pathname.replace(/\/+$/u, "");
    const needsCanonical = location.pathname.endsWith("/") && Boolean(location.search || location.hash);
    if (needsCanonical) {
      throw redirect({
        href: canonicalPath,
        replace: true,
        statusCode: 303,
      });
    }
  },
  component: ProjectCodeBranchIndexRoute,
});

function ProjectCodeBranchIndexRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectCodeBranchIndexScreen runtimeConfig={runtimeConfig} />;
}
