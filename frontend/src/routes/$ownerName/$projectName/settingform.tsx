import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { ProjectSettingRouteScreen } from "./setting";
import { styles } from "./-settingform.stylex";

export const Route = createFileRoute("/$ownerName/$projectName/settingform")({
  component: ProjectSettingFormRoute,
});

function ProjectSettingFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();

  return (
    <div {...stylex.props(styles.page)} data-stylex-owner="project-settingform-page">
      <div {...stylex.props(styles.shell)} data-stylex-owner="project-settingform-shell">
        <ProjectSettingRouteScreen
          ownerName={ownerName}
          projectName={projectName}
          renderProjectShell={false}
          runtimeConfig={runtimeConfig}
          selfRoutePath="/$ownerName/$projectName/settingform"
        />
      </div>
    </div>
  );
}
