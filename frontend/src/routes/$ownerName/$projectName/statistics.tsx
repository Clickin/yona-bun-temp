import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  readProjectContainerQueryOptions,
  toggleFavoriteProjectRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import type { RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/$ownerName/$projectName/statistics")({
  component: ProjectStatisticsRoute,
});

const LEGACY_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

function ProjectStatisticsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectStatisticsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectStatisticsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const query = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!query.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader project={query.data} />
      <ProjectMenu project={query.data} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <h1>Under Construction</h1>
        </div>
      </div>
    </>
  );
}

function ProjectHeader({ project }: { project: ProjectContainer }) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const projectId = stringField(project.id, "");
  const logoUrl = stringField(project.logoUrl, "") || "/assets/images/project_default_logo.png";
  const backgroundImageUrl =
    stringField(project.backgroundImageUrl, "") || "/assets/images/bg-default-project.png";
  const isForked = booleanField(project.isForkedFromOrigin);
  const originalOwnerName = stringField(project.originalOwnerName, "");
  const originalProjectName = stringField(project.originalProjectName, "");
  const [isFavoritedProject, setIsFavoritedProject] = useState(
    () => booleanField(project.isFavorite) || booleanField(project.isFavorited),
  );
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return toggleFavoriteProjectRest(runtimeConfig, csrfToken, ownerName, projectName);
    },
    onSuccess(response) {
      setIsFavoritedProject((current) =>
        typeof response.favorited === "boolean" ? response.favorited : !current,
      );
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(ownerName, projectName),
      });
    },
  });

  return (
    <div
      className="project-header-outer"
      style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
    >
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img src={logoUrl} alt="" />
          </div>
          <div className={`project-breadcrumb-wrap${isForked ? " fork" : ""}`}>
            <div className="project-breadcrumb">
              <span className="project-author hide-in-mobile">
                <Link to={userPath(ownerName)} {...LEGACY_LINK_PROPS}>
                  {ownerName}
                </Link>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <Link to={projectPath(ownerName, projectName)} {...LEGACY_LINK_PROPS}>
                  {projectName}
                </Link>
              </span>
              <span
                className="user-project-list"
                data-project-id={projectId}
                role="button"
                tabIndex={0}
                onMouseDown={(event) => {
                  event.stopPropagation();
                  favoriteMutation.mutate();
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  favoriteMutation.mutate();
                }}
              >
                <i
                  className={`${isFavoritedProject ? "starred" : ""} star material-icons va-text-top`}
                >
                  star
                </i>
              </span>
              {booleanField(project.isPrivate) ? (
                <span className="project-private">
                  <i className="yobicon-lock"></i>
                </span>
              ) : null}
              {booleanField(project.isProtected) ? (
                <span className="project-protected" title="Group Project">
                  G
                </span>
              ) : null}
            </div>
            {isForked ? (
              <div className="project-origin">
                <span className="project-origin-title">{t("fork.original")}</span>
                <Link
                  to={projectPath(originalOwnerName, originalProjectName)}
                  className="project-origin-name"
                  {...LEGACY_LINK_PROPS}
                >
                  {originalOwnerName} / {originalProjectName}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="project-util-wrap">
            <ul className="project-util"></ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectMenu({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = recordField(project.menuSetting);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            to={projectPath(ownerName, projectName)}
            label={t("title.projectHome")}
            short="H"
          />
          {booleanField(menuSetting.code) ? (
            <ProjectMenuItem
              className="code-menu "
              to={projectPath(ownerName, projectName, "code")}
              label={t("menu.code")}
              short="C"
            />
          ) : null}
          {booleanField(menuSetting.issue) ? (
            <ProjectMenuItem
              className="active"
              to={projectPath(ownerName, projectName, "issues")}
              label={t("menu.issue")}
              short="I"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              to={projectPath(ownerName, projectName, "pullRequests")}
              label={t("menu.pullRequest")}
              short="P"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              to={projectPath(ownerName, projectName, "reviews")}
              label={t("menu.review")}
              short="R"
            />
          ) : null}
          {booleanField(menuSetting.milestone) ? (
            <ProjectMenuItem
              to={projectPath(ownerName, projectName, "milestones")}
              label={t("milestone")}
              short="M"
            />
          ) : null}
          {booleanField(menuSetting.board) ? (
            <ProjectMenuItem
              to={projectPath(ownerName, projectName, "posts")}
              label={t("menu.board")}
              short="B"
            />
          ) : null}
        </ul>
        {booleanField(project.viewerCanUpdate) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="">
                <Link to={projectPath(ownerName, projectName, "setting")} {...LEGACY_LINK_PROPS}>
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={numberField(project.enrollmentRequestCount)} />
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectMenuItem({
  className = "",
  to,
  label,
  short,
}: {
  className?: string;
  to: string;
  label: string;
  short: string;
}) {
  return (
    <li className={className}>
      <Link to={to} {...LEGACY_LINK_PROPS}>
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
      </Link>
    </li>
  );
}

function CountBadge({
  className = "project-menu-count",
  count,
}: {
  className?: string;
  count: number;
}) {
  return count > 0 ? <span className={className}>{count}</span> : null;
}

function projectPath(ownerName: string, projectName: string, leaf?: string) {
  return `/${ownerName}/${projectName}${leaf ? `/${leaf}` : ""}`;
}

function userPath(ownerName: string) {
  return `/${ownerName}`;
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

function numberField(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function booleanField(value: unknown) {
  return value === true;
}
