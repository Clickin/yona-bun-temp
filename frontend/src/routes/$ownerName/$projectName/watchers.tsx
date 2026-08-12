import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { use } from "react";
import {
  readProjectContainerQueryOptions,
  readProjectWatchersQueryOptions,
} from "../../../api/org-project";
import type { ProjectWatchersResponse } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import defaultAvatarUrl from "../../../assets/legacy/default-avatar-128.png";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu, ProjectNestedShellContext } from "../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/watchers")({
  component: ProjectWatchersRoute,
});

function ProjectWatchersRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const nestedProjectShell = use(ProjectNestedShellContext);

  if (nestedProjectShell) {
    return <ProjectWatchersScreen nestedProjectShell runtimeConfig={runtimeConfig} />;
  }

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectWatchersScreen nestedProjectShell={false} runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectWatchersScreen({
  nestedProjectShell,
  runtimeConfig,
}: {
  nestedProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const watchersQuery = useQuery(
    readProjectWatchersQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !watchersQuery.data) {
    return null;
  }

  const body = (
    <ProjectWatchersBody basePath={runtimeConfig.basePath} watchers={watchersQuery.data} />
  );

  if (nestedProjectShell) {
    return body;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
    ownerName,
    projectName,
  };

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <title>{`${t("title.projectWatchers")} - ${ownerName}/${projectName}`}</title>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu basePath={runtimeConfig.basePath} project={projectQuery.data} />
      {body}
    </SiteLayoutShell>
  );
}

function ProjectWatchersBody({
  basePath,
  watchers,
}: {
  basePath: string;
  watchers: ProjectWatchersResponse;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <h4>
          <strong>{t("project.watcher.title")}</strong>
        </h4>
        <p>{t("project.watcher.description")}</p>
        <ul data-owner="project-watchers-list">
          {watchers.watchers.map((watcher) => {
            const loginId = stringField(watcher.loginId, "");
            return (
              <li data-owner="project-watchers-member" key={stringField(watcher.userId, loginId)}>
                <Link
                  to="/$user"
                  params={{ user: loginId }}
                  data-owner="project-watchers-avatar"
                  activeOptions={legacyLinkActiveOptions}
                  activeProps={legacyLinkActiveProps}
                >
                  <img
                    data-owner="project-watchers-avatar-image"
                    src={
                      stringField(watcher.avatarUrl, "") ||
                      prefixBasePath(basePath, defaultAvatarUrl)
                    }
                    width="64"
                    height="64"
                    alt=""
                  />
                </Link>
                <div data-owner="project-watchers-member-name">
                  {stringField(watcher.userLabel, loginId)}
                </div>
                <div data-owner="project-watchers-member-id">@{loginId}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const legacyLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;

const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
} as const;

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return projectIsProtected(project) ? ownerName : undefined;
}

function projectIsProtected(project: ProjectContainer) {
  const record = recordField(project);
  return record.isProtected === true || stringField(record.projectScope, "") === "protected";
}

function recordField(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}
