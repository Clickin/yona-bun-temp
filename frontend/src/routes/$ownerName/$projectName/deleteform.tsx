import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  deleteProjectRest,
  readProjectSettingsQueryOptions,
  toggleFavoriteProjectRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/$ownerName/$projectName/deleteform")({
  component: ProjectDeleteFormRoute,
});

function ProjectDeleteFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectDeleteFormScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectDeleteFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const query = useQuery(
    readProjectSettingsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!query.data) {
    return null;
  }

  return <ProjectDeleteFormBody project={query.data} runtimeConfig={runtimeConfig} />;
}

function ProjectDeleteFormBody({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteProjectRest(runtimeConfig, csrfToken, { ownerName, projectName });
    },
    onSuccess(response) {
      queryClient.removeQueries({ queryKey: apiQueryKeys.project.base(ownerName, projectName) });
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.project.list() });
      router.history.push(stringField(response.redirectPath, "/"));
    },
  });

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <ProjectMenu basePath={runtimeConfig.basePath} project={project} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingMenu
            basePath={runtimeConfig.basePath}
            ownerName={ownerName}
            project={project}
            projectName={projectName}
          />
          <div className="bubble-wrap gray wp">
            <div className="cu-label">{t("project.delete")}</div>
            <div className="cu-desc">
              <p>
                <strong className="notice">{t("project.delete.description")}</strong>
              </p>
              <p>
                <input type="checkbox" className="checkbox" autoComplete="off" id="accept" />
                <label htmlFor="accept" className="bg-checkbox label-agreement">
                  {t("project.delete.accept")}
                </label>
              </p>
            </div>
          </div>
          <div className="box-wrap bottom">
            <a
              id="btnDelete"
              href="#alertDeletion"
              className="ybtn ybtn-danger"
              data-toggle="modal"
            >
              <i className="yobicon-database-remove"></i> {t("project.delete.this")}
            </a>
          </div>
          <div id="alertDeletion" className="modal hide">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal">
                ×
              </button>
              <h3>{t("project.delete.requestion")}</h3>
            </div>
            <div className="modal-body">
              <p> {t("project.delete.description")}</p>
              <p> {t("project.delete.reaccept")} </p>
            </div>
            <div className="modal-footer">
              <button
                id="btnDeleteExec"
                type="button"
                className="ybtn ybtn-danger"
                onClick={() => deleteMutation.mutate()}
              >
                {t("button.yes")}
              </button>
              <button type="button" className="ybtn" data-dismiss="modal">
                {t("button.no")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
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
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
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
              <li className="active">
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

function ProjectSettingMenu({
  basePath,
  ownerName,
  project,
  projectName,
}: {
  basePath: string;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const menuSetting = recordField(project.menuSetting);
  const navigate = (to: string) => {
    router.navigate({ to });
  };

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <ProjectSettingLink
          basePath={basePath}
          onNavigate={navigate}
          to={`/${ownerName}/${projectName}/setting`}
        >
          {t("project.setting")}
        </ProjectSettingLink>
      </li>
      <li id="subMenuProjectMember" className="">
        <ProjectSettingLink
          basePath={basePath}
          onNavigate={navigate}
          to={`/${ownerName}/${projectName}/members`}
        >
          {t("project.member")}
          <CountBadge count={numberField(project.enrollmentRequestCount)} className="num-badge" />
        </ProjectSettingLink>
      </li>
      <li id="subMenuIssueLabel" className="">
        <ProjectSettingLink
          basePath={basePath}
          onNavigate={navigate}
          to={`/${ownerName}/${projectName}/labels`}
        >
          {t("issue.label")}
        </ProjectSettingLink>
      </li>
      <li id="subMenuWebhook" className="">
        <ProjectSettingLink
          basePath={basePath}
          onNavigate={navigate}
          to={`/${ownerName}/${projectName}/webhooks`}
        >
          {t("project.webhook")}
        </ProjectSettingLink>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <ProjectSettingLink
          basePath={basePath}
          onNavigate={navigate}
          to={`/${ownerName}/${projectName}/transfer`}
        >
          {t("project.transfer")}
        </ProjectSettingLink>
      </li>
      <li id="subMenuProjectDelete" className="active">
        <ProjectSettingLink
          basePath={basePath}
          onNavigate={navigate}
          to={`/${ownerName}/${projectName}/deleteform`}
        >
          {t("project.delete")}
        </ProjectSettingLink>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className=""
        style={booleanField(menuSetting.code) ? undefined : { display: "none" }}
      >
        <ProjectSettingLink
          basePath={basePath}
          onNavigate={navigate}
          to={`/${ownerName}/${projectName}/changeVCS`}
        >
          {t("project.changeVCS")}
        </ProjectSettingLink>
      </li>
    </ul>
  );
}

function ProjectSettingLink({
  basePath,
  children,
  onNavigate,
  to,
}: {
  basePath: string;
  children: ReactNode;
  onNavigate: (to: string) => void;
  to: string;
}) {
  const navigateWithinProjectSettings = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    onNavigate(to);
  };

  return (
    <a href={prefixBasePath(basePath, to)} onClick={navigateWithinProjectSettings}>
      {children}
    </a>
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
