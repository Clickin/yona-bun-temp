import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  readProjectContainerQueryOptions,
  toggleFavoriteProjectRest,
  toggleProjectWatchRest,
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
  const { ownerName, projectName } = Route.useParams();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell
          projectSearchScope={{ ownerName, projectName }}
          runtimeConfig={runtimeConfig}
        >
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
  const [isWatchingProject, setIsWatchingProject] = useState(() => projectIsWatching(project));
  const [watchingCount, setWatchingCount] = useState(() => projectWatchingCount(project));
  const [watchDropdownOpen, setWatchDropdownOpen] = useState(false);
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
  const watchMutation = useMutation({
    mutationFn: async (nextWatching: boolean) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return toggleProjectWatchRest(runtimeConfig, csrfToken, ownerName, projectName, nextWatching);
    },
    onSuccess(response, nextWatching) {
      setIsWatchingProject(nextWatching);
      setWatchingCount((current) => projectWatchingCountValue(response) ?? current);
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
              {/* oxlint-disable jsx-a11y/prefer-tag-over-role -- legacy project/header.scala.html renders this favorite toggle as a span. */}
              <span
                className="user-project-list"
                data-project-id={projectId}
                role="button"
                tabIndex={0}
                onClick={(event) => {
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
            <ul className="project-util">
              {projectCanWatch(project) ? (
                <li className={watchDropdownOpen ? "open" : undefined}>
                  <div
                    className={`btn-group dropdown watch-btn${watchDropdownOpen ? " open" : ""}`}
                  >
                    <Link
                      to="/$ownerName/$projectName/watchers"
                      params={{ ownerName, projectName }}
                      search={{ watchersLinkActive: undefined }}
                      className={`btn watcher-count no-border ${isWatchingProject ? "watch-on" : ""}`}
                      title={t("project.watcher.number")}
                      {...LEGACY_LINK_PROPS}
                    >
                      {watchingCount}
                    </Link>
                    <div className="dropdown-menu flat right title">
                      <div className="pop-title">
                        {t(
                          isWatchingProject
                            ? "project.you.are.watching"
                            : "project.you.are.not.watching",
                          { args: [projectName] },
                        )}
                      </div>
                      <div className="pop-content">
                        <p>{t("notification.help")}</p>
                        <ul className="icons-ul">
                          <li>
                            <i className="yobicon-li yobicon-ok"></i>
                            {t("notification.help.new")}
                          </li>
                          <li>
                            <i className="yobicon-li yobicon-ok"></i>
                            {t("notification.help.new.comment")}
                          </li>
                          <li>
                            <i className="yobicon-li yobicon-ok"></i>
                            {t("notification.help.update.issue")}
                          </li>
                          <li>
                            <i className="yobicon-li yobicon-ok"></i>
                            {t("notification.help.update.pullrequest")}
                          </li>
                        </ul>
                      </div>
                      <div className="pop-content btn-wrap">
                        <Link
                          to="/user/editform/notifications"
                          hash={projectId}
                          className="ybtn"
                          {...LEGACY_LINK_PROPS}
                        >
                          <i className="yobicon-alert2"></i> {t("userinfo.changeNotifications")}
                        </Link>
                        <button
                          type="button"
                          className="ybtn ybtn-watching watchBtn"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setWatchDropdownOpen(false);
                            watchMutation.mutate(!isWatchingProject);
                          }}
                        >
                          <i className={isWatchingProject ? "yobicon-eye-off" : "yobicon-eye"}></i>{" "}
                          {t(isWatchingProject ? "project.unwatch" : "project.watch")}
                        </button>
                      </div>
                    </div>
                    <button
                      className="btn nofocus no-border down-arrow"
                      type="button"
                      data-toggle="dropdown"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setWatchDropdownOpen((open) => !open);
                      }}
                    >
                      {t(isWatchingProject ? "project.unwatch" : "project.watch")}
                    </button>
                  </div>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function projectPath(ownerName: string, projectName: string, leaf?: string) {
  return `/${ownerName}/${projectName}${leaf ? `/${leaf}` : ""}`;
}

function userPath(ownerName: string) {
  return `/${ownerName}`;
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

function booleanField(value: unknown) {
  return value === true;
}

function numberField(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function projectCanWatch(project: ProjectContainer) {
  return !("viewerCanWatch" in project) || booleanField(project.viewerCanWatch);
}

function projectIsWatching(project: ProjectContainer) {
  return booleanField(project.isWatching) || booleanField(project.viewerIsWatching);
}

function projectWatchingCount(project: ProjectContainer) {
  return projectWatchingCountValue(project) ?? 0;
}

function projectWatchingCountValue(project: ProjectContainer) {
  for (const value of [project.watchingCount, project.watchCount, project.watcherCount]) {
    if (typeof value === "number" || typeof value === "string") {
      return numberField(value);
    }
  }
  return undefined;
}
