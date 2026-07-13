import { createFileRoute } from "@tanstack/react-router";
import { ProjectSettingRouteScreen } from "./setting";

export const Route = createFileRoute("/$ownerName/$projectName/settingform")({
  component: ProjectSettingFormRoute,
});

function ProjectSettingFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();

  return (
    <ProjectSettingRouteScreen
      ownerName={ownerName}
      projectName={projectName}
      renderProjectShell={false}
      runtimeConfig={runtimeConfig}
      selfRoutePath="/$ownerName/$projectName/settingform"
    />
  );
}
