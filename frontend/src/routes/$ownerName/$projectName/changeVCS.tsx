import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  changeProjectVcsRest,
  readProjectChangeVcsQueryOptions,
  toggleFavoriteProjectRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectChangeVcsResponse } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

type ProjectChangeVcsScreenData = ProjectChangeVcsResponse & ProjectContainer;

export const Route = createFileRoute("/$ownerName/$projectName/changeVCS")({
  component: ProjectChangeVcsRoute,
});

function ProjectChangeVcsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectChangeVcsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectChangeVcsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const query = useQuery(
    readProjectChangeVcsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!query.data) {
    return null;
  }

  return (
    <ProjectChangeVcsBody
      project={query.data as ProjectChangeVcsScreenData}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectChangeVcsBody({
  project,
  runtimeConfig,
}: {
  project: ProjectChangeVcsScreenData;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [acceptedChangeVcs, setAcceptedChangeVcs] = useState(false);
  const [changeVcsModalOpen, setChangeVcsModalOpen] = useState(false);
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const currentVcs = stringField(project.currentVcs, stringField(project.vcs, "GIT"));
  const nextVcs = stringField(project.nextVcs, currentVcs === "GIT" ? "Subversion" : "GIT");
  const changeMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return changeProjectVcsRest(runtimeConfig, csrfToken, { ownerName, projectName });
    },
    onSuccess(response) {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.changeVcs(ownerName, projectName),
      });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
      });
      setChangeVcsModalOpen(false);
      router.history.push(
        prefixBasePath(
          runtimeConfig.basePath,
          stringField(response.redirectPath, `/${ownerName}/${projectName}`),
        ),
      );
    },
    onError() {
      setChangeVcsModalOpen(false);
    },
  });
  const openChangeVcsModal = () => {
    if (!acceptedChangeVcs) {
      window.alert(t("project.changeVCS.alert"));
      return;
    }
    setChangeVcsModalOpen(true);
  };
  const closeChangeVcsModal = () => setChangeVcsModalOpen(false);

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
            <div className="row-fluid">
              <h3>
                {currentVcs} <i className="yobicon-right-2 vmiddle"></i> {nextVcs}
              </h3>
              <div className="cu-desc">
                <ul>
                  <li className="notice">
                    <strong>{t("project.changeVCS.description1", { args: [nextVcs] })}</strong>
                  </li>
                  <li className="notice">
                    <strong>{t("project.changeVCS.description2")}</strong>
                  </li>
                </ul>
                <p>
                  <input
                    id="acceptChangeVCS"
                    type="checkbox"
                    className="checkbox"
                    autoComplete="off"
                    checked={acceptedChangeVcs}
                    onChange={(event) => setAcceptedChangeVcs(event.currentTarget.checked)}
                  />
                  <label htmlFor="acceptChangeVCS" className="bg-checkbox label-agreement">
                    {t("project.changeVCS.accept")}
                  </label>
                </p>
              </div>
            </div>
          </div>
          <div className="box-wrap bottom">
            <button
              id="btnChangeVCS"
              type="button"
              className="ybtn ybtn-danger"
              onClick={openChangeVcsModal}
            >
              <i className="yobicon-database"></i> {t("project.changeVCS.this")}
            </button>
          </div>
          <div
            id="alertChangeVCS"
            className={`modal hide${changeVcsModalOpen ? " in" : ""}`}
            style={changeVcsModalOpen ? { display: "block" } : undefined}
          >
            <div className="modal-header">
              <button type="button" className="close" onClick={closeChangeVcsModal}>
                ×
              </button>
              <h3>{t("project.changeVCS.requestion", { args: [nextVcs] })}</h3>
            </div>
            <div className="modal-body">
              <p>{t("project.changeVCS.description2")}</p>
              <p>{t("project.changeVCS.reaccept")}</p>
            </div>
            <div className="modal-footer">
              <button
                id="btnChangeVCSExec"
                type="button"
                className="ybtn ybtn-danger"
                onClick={() => changeMutation.mutate()}
              >
                {t("button.yes")}
              </button>
              <button type="button" className="ybtn" onClick={closeChangeVcsModal}>
                {t("button.no")}
              </button>
            </div>
          </div>
          {changeVcsModalOpen ? <div className="modal-backdrop fade in"></div> : null}
        </div>
      </div>
    </>
  );
}

function ProjectHeader({
  basePath,
  project,
}: {
  basePath: string;
  project: ProjectChangeVcsScreenData;
}) {
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
        queryKey: apiQueryKeys.project.changeVcs(ownerName, projectName),
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

function ProjectMenu({
  basePath,
  project,
}: {
  basePath: string;
  project: ProjectChangeVcsScreenData;
}) {
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
  project: ProjectChangeVcsScreenData;
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
      <li id="subMenuProjectDelete" className="">
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
        className="active"
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
