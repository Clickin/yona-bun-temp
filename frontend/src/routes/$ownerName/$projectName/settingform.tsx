import { createFileRoute } from "@tanstack/react-router";
import { ProjectSettingRouteScreen } from "./setting";

export const Route = createFileRoute("/$ownerName/$projectName/settingform")({
  component: ProjectSettingFormRoute,
});

function ProjectSettingFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();

  return (
    <div className="page-wrap-outer" data-owner="project-settingform-page-wrap-outer">
      <div className="project-page-wrap" data-owner="project-settingform-project-page-wrap">
        <ProjectSettingRouteScreen
          ownerName={ownerName}
          projectName={projectName}
          renderProjectShell={false}
          renderProjectPage={false}
          runtimeConfig={runtimeConfig}
          selfRoutePath="/$ownerName/$projectName/settingform"
        />
      </div>
    </div>
  );
}
