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
    <div
      {...stylex.props(styles.pageWrapOuter)}
      className={`${stylex.props(styles.pageWrapOuter).className} page-wrap-outer`}
      data-stylex-owner="project-settingform-page-wrap-outer"
    >
      <div
        {...stylex.props(styles.projectPageWrap)}
        className={`${stylex.props(styles.projectPageWrap).className} project-page-wrap`}
        data-stylex-owner="project-settingform-project-page-wrap"
      >
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
