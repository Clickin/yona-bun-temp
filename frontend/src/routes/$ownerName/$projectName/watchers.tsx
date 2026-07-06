import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  readProjectContainerQueryOptions,
  readProjectWatchersQueryOptions,
  toggleProjectWatchRest,
  toggleFavoriteProjectRest,
} from "../../../api/org-project";
import type { ProjectWatchersResponse } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/$ownerName/$projectName/watchers")({
  component: ProjectWatchersRoute,
});

function ProjectWatchersRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectWatchersScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectWatchersScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const watchersQuery = useQuery(
    readProjectWatchersQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !watchersQuery.data) {
    return null;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
    ownerName,
    projectName,
  };

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <ProjectHeader project={projectQuery.data} />
      <ProjectMenu project={projectQuery.data} />
      <ProjectWatchersBody watchers={watchersQuery.data} />
    </SiteLayoutShell>
  );
}

function ProjectWatchersBody({ watchers }: { watchers: ProjectWatchersResponse }) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <h4>
          <strong>{t("project.watcher.title")}</strong>
        </h4>
        <p>{t("project.watcher.description")}</p>
        <ul className="members project row-fluid">
          {watchers.watchers.map((watcher) => {
            const loginId = stringField(watcher.loginId, "");
            return (
              <li
                className="member span6 span-hard-wrap"
                key={stringField(watcher.userId, loginId)}
              >
                <Link
                  to="/$user"
                  params={{ user: loginId }}
                  className="avatar-wrap mlarge pull-left mr10"
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
                  <img
                    src={stringField(watcher.avatarUrl, "/assets/images/default-avatar-32.png")}
                    width="64"
                    height="64"
                    alt=""
                  />
                </Link>
                <div className="member-name">{stringField(watcher.userLabel, loginId)}</div>
                <div className="member-id">@{loginId}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
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
                <Link
                  to="/$user"
                  params={{ user: ownerName }}
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
                  {ownerName}
                </Link>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <Link
                  to="/$ownerName/$projectName"
                  params={{ ownerName, projectName }}
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
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
              {/* oxlint-enable jsx-a11y/prefer-tag-over-role */}
              {booleanField(project.isPrivate) ? (
                <span className="project-private">
                  <i className="yobicon-lock"></i>
                </span>
              ) : null}
              {projectIsProtected(project) ? (
                <span className="project-protected" title="Group Project">
                  G
                </span>
              ) : null}
            </div>
            {isForked ? (
              <div className="project-origin">
                <span className="project-origin-title">{t("fork.original")}</span>
                <Link
                  to="/$ownerName/$projectName"
                  params={{ ownerName: originalOwnerName, projectName: originalProjectName }}
                  className="project-origin-name"
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
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
                      data-toggle="tooltip"
                      title={t("project.watcher.number")}
                      activeOptions={{
                        exact: true,
                        explicitUndefined: true,
                        includeHash: true,
                        includeSearch: true,
                      }}
                      activeProps={{
                        "aria-current": undefined,
                        className: undefined,
                        "data-status": undefined,
                      }}
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
                          activeOptions={{
                            exact: true,
                            explicitUndefined: true,
                            includeHash: true,
                            includeSearch: true,
                          }}
                          activeProps={{
                            "aria-current": undefined,
                            className: undefined,
                            "data-status": undefined,
                          }}
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
            to="/$ownerName/$projectName"
            params={{ ownerName, projectName }}
            label={t("title.projectHome")}
            short="H"
          />
          {booleanField(menuSetting.code) ? (
            <ProjectMenuItem
              className="code-menu "
              to="/$ownerName/$projectName/code"
              params={{ ownerName, projectName }}
              label={t("menu.code")}
              short="C"
            />
          ) : null}
          {booleanField(menuSetting.issue) ? (
            <ProjectMenuItem
              to="/$ownerName/$projectName/issues"
              params={{ ownerName, projectName }}
              label={t("menu.issue")}
              short="I"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              to="/$ownerName/$projectName/pullRequests"
              params={{ ownerName, projectName }}
              label={t("menu.pullRequest")}
              short="P"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              to="/$ownerName/$projectName/reviews"
              params={{ ownerName, projectName }}
              label={t("menu.review")}
              short="R"
            />
          ) : null}
          {booleanField(menuSetting.milestone) ? (
            <ProjectMenuItem
              to="/$ownerName/$projectName/milestones"
              params={{ ownerName, projectName }}
              label={t("milestone")}
              short="M"
            />
          ) : null}
          {booleanField(menuSetting.board) ? (
            <ProjectMenuItem
              to="/$ownerName/$projectName/posts"
              params={{ ownerName, projectName }}
              label={t("menu.board")}
              short="B"
            />
          ) : null}
        </ul>
        {booleanField(project.viewerCanUpdate) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="">
                <Link
                  to="/$ownerName/$projectName/setting"
                  params={{ ownerName, projectName }}
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={enrolledUserCount(project)} />
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
  label,
  params,
  short,
  to,
}: {
  className?: string;
  label: string;
  params: { ownerName: string; projectName: string };
  short: string;
  to:
    | "/$ownerName/$projectName"
    | "/$ownerName/$projectName/code"
    | "/$ownerName/$projectName/issues"
    | "/$ownerName/$projectName/pullRequests"
    | "/$ownerName/$projectName/reviews"
    | "/$ownerName/$projectName/milestones"
    | "/$ownerName/$projectName/posts";
}) {
  return (
    <li className={className}>
      <Link
        to={to}
        params={params}
        activeOptions={{
          exact: true,
          explicitUndefined: true,
          includeHash: true,
          includeSearch: true,
        }}
        activeProps={{
          "aria-current": undefined,
          className: undefined,
          "data-status": undefined,
        }}
      >
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

function recordField(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function enrolledUserCount(project: ProjectContainer) {
  const enrolledUsers = recordField(project).enrolledUsers;
  return Array.isArray(enrolledUsers) ? enrolledUsers.length : 0;
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return projectIsProtected(project) ? ownerName : undefined;
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

function projectIsProtected(project: ProjectContainer) {
  const record = recordField(project);
  return booleanField(record.isProtected) || stringField(record.projectScope, "") === "protected";
}

function projectCanWatch(project: ProjectContainer) {
  const record = recordField(project);
  return booleanField(record.viewerCanWatch) || booleanField(record.canWatch);
}

function projectIsWatching(project: ProjectContainer) {
  const record = recordField(project);
  return booleanField(record.isWatching) || booleanField(record.viewerIsWatching);
}

function projectWatchingCount(project: ProjectContainer) {
  return projectWatchingCountValue(project) ?? 0;
}

function projectWatchingCountValue(project: ProjectContainer) {
  const record = recordField(project);
  for (const value of [record.watchingCount, record.watchCount, record.watcherCount]) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}
