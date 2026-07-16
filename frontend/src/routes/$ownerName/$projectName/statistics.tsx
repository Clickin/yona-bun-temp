import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { use } from "react";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { LegacyI18nProvider } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import type { RuntimeConfig } from "../../../runtime-config";
import { globalBreakpoints } from "../../../theme.stylex";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectNestedShellContext } from "../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/statistics")({
  component: ProjectStatisticsRoute,
});

const styles = stylex.create({
  pageWrapOuter: {
    boxSizing: "border-box",
    marginTop: "10px",
    minHeight: "450px",
    minWidth: {
      default: null,
      [globalBreakpoints.mobile]: "10px",
    },
    padding: {
      default: "0px 10px",
      [globalBreakpoints.mobile]: "0px",
    },
    width: "100%",
  },
  projectPageWrap: {
    margin: "5px auto 0px",
    width: "100%",
  },
  heading: {
    color: "inherit",
    fontFamily: "inherit",
    fontSize: "38.5px",
    fontWeight: "bold",
    lineHeight: "40px",
    margin: "0px",
    textRendering: "optimizeLegibility",
  },
});

function ProjectStatisticsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const nestedProjectShell = use(ProjectNestedShellContext);

  if (nestedProjectShell) {
    return <ProjectStatisticsRouteShell nestedProjectShell runtimeConfig={runtimeConfig} />;
  }

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectStatisticsRouteShell nestedProjectShell={false} runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectStatisticsRouteShell({
  nestedProjectShell,
  runtimeConfig,
}: {
  nestedProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const project = projectQuery.data;

  if (!project) {
    return null;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(project, ownerName),
    ownerName,
    projectName,
  };

  const body = (
    <>
      <title>{`statistics - ${ownerName}/${projectName}`}</title>
      <div
        {...stylex.props(styles.pageWrapOuter)}
        data-stylex-owner="project-statistics-page-outer"
      >
        <div {...stylex.props(styles.projectPageWrap)} data-stylex-owner="project-statistics-page">
          <h1 {...stylex.props(styles.heading)}>Under Construction</h1>
        </div>
      </div>
    </>
  );

  if (nestedProjectShell) {
    return body;
  }

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      {body}
    </SiteLayoutShell>
  );
}

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return fallback;
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return projectIsProtected(project) ? ownerName : undefined;
}

function projectIsProtected(project: ProjectContainer) {
  return (
    project.isProtected === true ||
    project.isProtected === "true" ||
    project.isProtected === 1 ||
    project.isProtected === "1" ||
    stringField(project.projectScope, "") === "protected"
  );
}
