import { useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  changeProjectVcsRest,
  readProjectContainerQueryOptions,
  readProjectChangeVcsQueryOptions,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectChangeVcsResponse } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader as SharedProjectHeader } from "../$projectName";

type ProjectChangeVcsScreenData = ProjectContainer & Partial<ProjectChangeVcsResponse>;

const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
const legacyLinkActiveOptions = { exact: true };

export const Route = createFileRoute("/$ownerName/$projectName/changeVCS")({
  component: ProjectChangeVcsRoute,
});

function ProjectChangeVcsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectChangeVcsRouteShell runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectChangeVcsRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const containerQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  if (!containerQuery.data) {
    return null;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(containerQuery.data, ownerName),
    ownerName,
    projectName,
  };

  return (
    <SiteLayoutShell
      projectSearchScope={projectSearchScope}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks
    >
      <ProjectChangeVcsScreen runtimeConfig={runtimeConfig} />
    </SiteLayoutShell>
  );
}

function ProjectChangeVcsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const containerQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const changeVcsQuery = useQuery(
    readProjectChangeVcsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const project = mergeProjectChangeVcsData(containerQuery.data, changeVcsQuery.data);

  if (!project) {
    return <ProjectChangeVcsTitle ownerName={ownerName} projectName={projectName} />;
  }

  return (
    <>
      <ProjectChangeVcsTitle ownerName={ownerName} projectName={projectName} />
      <ProjectChangeVcsBody project={project} runtimeConfig={runtimeConfig} />
    </>
  );
}

function ProjectChangeVcsTitle({
  ownerName,
  projectName,
}: {
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return <title>{`${t("title.projectChangeVCS")} - ${ownerName}/${projectName}`}</title>;
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
  const [changeVcsModalTouched, setChangeVcsModalTouched] = useState(false);
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
        queryKey: apiQueryKeys.project.container(ownerName, projectName),
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
      window.alert(t("project.changeVCS.error"));
    },
  });
  const insulateChangeVcsModalButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const openChangeVcsModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateChangeVcsModalButtonClick(event);
    if (!acceptedChangeVcs) {
      window.alert(t("project.changeVCS.alert"));
      return;
    }
    setChangeVcsModalTouched(true);
    setChangeVcsModalOpen(true);
  };
  const closeChangeVcsModal = () => setChangeVcsModalOpen(false);
  const dismissChangeVcsModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateChangeVcsModalButtonClick(event);
    closeChangeVcsModal();
  };

  return (
    <>
      <SharedProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <ProjectMenu project={project} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingMenu ownerName={ownerName} project={project} projectName={projectName} />
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
            aria-hidden={changeVcsModalOpen ? false : changeVcsModalTouched ? true : undefined}
            style={
              changeVcsModalOpen
                ? { display: "block" }
                : changeVcsModalTouched
                  ? { display: "none" }
                  : undefined
            }
          >
            <div className="modal-header">
              <button type="button" className="close" onClick={dismissChangeVcsModal}>
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
              <button type="button" className="ybtn" onClick={dismissChangeVcsModal}>
                {t("button.no")}
              </button>
            </div>
          </div>
        </div>
      </div>
      {changeVcsModalOpen ? <div className="modal-backdrop in"></div> : null}
    </>
  );
}

function ProjectMenu({ project }: { project: ProjectChangeVcsScreenData }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const canSeeCodeMenu = projectCodeMenuVisible(project);
  const memberCount = projectMemberCount(project);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            label={t("title.projectHome")}
            params={{ ownerName, projectName }}
            short="H"
            to="/$ownerName/$projectName"
          />
          {canSeeCodeMenu ? (
            <ProjectMenuItem
              className="code-menu "
              label={t("menu.code")}
              params={{ ownerName, projectName }}
              short="C"
              to="/$ownerName/$projectName/code"
            />
          ) : null}
          {projectMenuEnabled(project, "issue", "showIssue") ? (
            <ProjectMenuItem
              count={numberField(project.openIssueCount)}
              label={t("menu.issue")}
              params={{ ownerName, projectName }}
              short="I"
              to="/$ownerName/$projectName/issues"
            />
          ) : null}
          {canSeeCodeMenu &&
          projectMenuEnabled(project, "pullRequest", "showPullRequest") &&
          stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              label={t("menu.pullRequest")}
              params={{ ownerName, projectName }}
              short="P"
              to="/$ownerName/$projectName/pullRequests"
            />
          ) : null}
          {canSeeCodeMenu && projectMenuEnabled(project, "review", "showReview") ? (
            <ProjectMenuItem
              label={t("menu.review")}
              params={{ ownerName, projectName }}
              short="R"
              to="/$ownerName/$projectName/reviews"
            />
          ) : null}
          {projectMenuEnabled(project, "milestone", "showMilestone") ? (
            <ProjectMenuItem
              label={t("milestone")}
              params={{ ownerName, projectName }}
              short="M"
              to="/$ownerName/$projectName/milestones"
            />
          ) : null}
          {projectMenuEnabled(project, "board", "showBoard") ? (
            <ProjectMenuItem
              count={numberField(project.boardCount) || numberField(project.postCount)}
              label={t("menu.board")}
              params={{ ownerName, projectName }}
              short="B"
              to="/$ownerName/$projectName/posts"
            />
          ) : null}
        </ul>
        {projectAdminMenuVisible(project) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="active">
                <Link
                  activeOptions={legacyLinkActiveOptions}
                  activeProps={legacyLinkActiveProps}
                  to="/$ownerName/$projectName/setting"
                  params={{ ownerName, projectName }}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={memberCount} />
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function projectCodeMenuVisible(project: ProjectChangeVcsScreenData) {
  const record = recordField(project);
  return (
    projectMenuEnabled(project, "code", "showCode") &&
    (!booleanField(record.codeMemberOnly) || booleanField(record.viewerIsProjectMember))
  );
}

function ProjectMenuItem({
  className = "",
  count = 0,
  label,
  params,
  short,
  to,
}: {
  className?: string;
  count?: number;
  label: string;
  params: { ownerName: string; projectName: string };
  short: string;
  to: string;
}) {
  return (
    <li className={className}>
      <Link
        activeOptions={legacyLinkActiveOptions}
        activeProps={legacyLinkActiveProps}
        to={to}
        params={params}
      >
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
        <CountBadge count={count} />
      </Link>
    </li>
  );
}

function ProjectSettingMenu({
  ownerName,
  project,
  projectName,
}: {
  ownerName: string;
  project: ProjectChangeVcsScreenData;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const memberCount = projectMemberCount(project);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/setting"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.setting")}
        </Link>
      </li>
      <li id="subMenuProjectMember" className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/members"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.member")}
          <CountBadge count={memberCount} className="num-badge" />
        </Link>
      </li>
      <li id="subMenuIssueLabel" className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/issue/labelsform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("issue.label")}
        </Link>
      </li>
      <li id="subMenuWebhook" className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/webhooks"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.webhook")}
        </Link>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/transfer"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.transfer")}
        </Link>
      </li>
      <li id="subMenuProjectDelete" className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/deleteform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.delete")}
        </Link>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className="active"
        style={projectMenuEnabled(project, "code", "showCode") ? undefined : { display: "none" }}
      >
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/changeVCS"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.changeVCS")}
        </Link>
      </li>
    </ul>
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

function enrolledUserCount(project: ProjectChangeVcsScreenData) {
  const enrolledUsers = recordField(project).enrolledUsers;
  return Array.isArray(enrolledUsers) ? enrolledUsers.length : 0;
}

function projectMemberCount(project: ProjectChangeVcsScreenData) {
  return enrolledUserCount(project);
}

function projectMenuEnabled(
  project: ProjectChangeVcsScreenData,
  menuKey: string,
  fallbackKey: string,
) {
  const menuSettingValue = recordField(recordField(project).menuSetting)[menuKey];
  if (typeof menuSettingValue === "boolean") {
    return menuSettingValue;
  }

  return booleanField(recordField(project)[fallbackKey]);
}

function projectAdminMenuVisible(project: ProjectChangeVcsScreenData) {
  const record = recordField(project);
  if (typeof record.showAdmin === "boolean") {
    return booleanField(record.showAdmin);
  }

  return booleanField(record.viewerCanUpdate);
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName =
    typeof project.organizationName === "string" ? project.organizationName : "";
  if (organizationName) {
    return organizationName;
  }
  return project.isProtected === true ? ownerName : undefined;
}

function mergeProjectChangeVcsData(
  container: ProjectContainer | undefined,
  changeVcs: ProjectChangeVcsResponse | undefined,
): ProjectChangeVcsScreenData | undefined {
  if (!container && !changeVcs) {
    return undefined;
  }

  if (!container) {
    return { ...changeVcs };
  }
  if (!changeVcs) {
    return { ...container };
  }
  return { ...container, ...changeVcs };
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
