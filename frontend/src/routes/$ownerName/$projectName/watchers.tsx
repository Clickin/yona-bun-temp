import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  readProjectContainerQueryOptions,
  readProjectWatchersQueryOptions,
  toggleFavoriteProjectRest,
} from "../../../api/org-project";
import type { ProjectWatchersResponse } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/$ownerName/$projectName/watchers")({
  component: ProjectWatchersRoute,
});

function ProjectWatchersRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectWatchersScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
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

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectWatchersBody basePath={runtimeConfig.basePath} watchers={watchersQuery.data} />
    </>
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
        <ul className="members project row-fluid">
          {watchers.watchers.map((watcher) => {
            const loginId = stringField(watcher.loginId, "");
            return (
              <li
                className="member span6 span-hard-wrap"
                key={stringField(watcher.userId, loginId)}
              >
                <a
                  href={prefixBasePath(basePath, `/${loginId}`)}
                  className="avatar-wrap mlarge pull-left mr10"
                >
                  <img
                    src={stringField(watcher.avatarUrl, "/assets/images/default-avatar-32.png")}
                    width="64"
                    height="64"
                    alt=""
                  />
                </a>
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

function ProjectHeader({ basePath, project }: { basePath: string; project: ProjectContainer }) {
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
  const favoriteToggleRef = useRef<HTMLSpanElement | null>(null);
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

  useEffect(() => {
    const favoriteToggle = favoriteToggleRef.current;
    if (!favoriteToggle) {
      return;
    }
    const handleFavoriteToggle = (event: globalThis.MouseEvent) => {
      event.stopPropagation();
      favoriteMutation.mutate();
    };
    favoriteToggle.addEventListener("mousedown", handleFavoriteToggle);
    return () => favoriteToggle.removeEventListener("mousedown", handleFavoriteToggle);
  }, [favoriteMutation]);

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
                <a href={prefixBasePath(basePath, `/${ownerName}`)}>{ownerName}</a>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <a href={projectHref(basePath, ownerName, projectName)}>{projectName}</a>
              </span>
              <span
                className="user-project-list"
                data-project-id={projectId}
                ref={favoriteToggleRef}
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
                <a
                  href={projectHref(basePath, originalOwnerName, originalProjectName)}
                  className="project-origin-name"
                >
                  {originalOwnerName} / {originalProjectName}
                </a>
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

function ProjectMenu({ basePath, project }: { basePath: string; project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = recordField(project.menuSetting);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            href={projectHref(basePath, ownerName, projectName)}
            label={t("title.projectHome")}
            short="H"
          />
          {booleanField(menuSetting.code) ? (
            <ProjectMenuItem
              className="code-menu "
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/code`)}
              label={t("menu.code")}
              short="C"
            />
          ) : null}
          {booleanField(menuSetting.issue) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}
              label={t("menu.issue")}
              short="I"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/pullRequests`)}
              label={t("menu.pullRequest")}
              short="P"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/reviews`)}
              label={t("menu.review")}
              short="R"
            />
          ) : null}
          {booleanField(menuSetting.milestone) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/milestones`)}
              label={t("milestone")}
              short="M"
            />
          ) : null}
          {booleanField(menuSetting.board) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/posts`)}
              label={t("menu.board")}
              short="B"
            />
          ) : null}
        </ul>
        {booleanField(project.viewerCanUpdate) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="">
                <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/setting`)}>
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={numberField(project.enrollmentRequestCount)} />
                </a>
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
  href,
  label,
  short,
}: {
  className?: string;
  href: string;
  label: string;
  short: string;
}) {
  return (
    <li className={className}>
      <a href={href}>
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
      </a>
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

function projectHref(basePath: string, ownerName: string, projectName: string) {
  return prefixBasePath(basePath, `/${ownerName}/${projectName}`);
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
