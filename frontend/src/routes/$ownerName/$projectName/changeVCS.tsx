import { useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
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
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import {
  ProjectHeader as SharedProjectHeader,
  ProjectMenu as SharedProjectMenu,
} from "../$projectName";
import { projectChangeVcsConditionalStyles, projectChangeVcsTheme } from "./-changeVCS.stylex";

const projectChangeVcsModalStateStyles = stylex.create({
  visible: { display: "block" },
  hidden: { display: "none" },
});

const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
export const Route = createFileRoute("/$ownerName/$projectName/changeVCS")({
  component: ProjectChangeVcsRoute,
});

function ProjectChangeVcsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectChangeVcsRouteScreen renderProjectShell={false} runtimeConfig={runtimeConfig} />;
}

export function ProjectChangeVcsRouteScreen({
  renderProjectShell = true,
  runtimeConfig,
}: {
  renderProjectShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const content = (
    <ProjectChangeVcsRouteShell
      renderProjectShell={renderProjectShell}
      runtimeConfig={runtimeConfig}
    />
  );

  if (!renderProjectShell) {
    return content;
  }

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        {content}
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectChangeVcsRouteShell({
  renderProjectShell,
  runtimeConfig,
}: {
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
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

  const screen = (
    <ProjectChangeVcsScreen renderProjectShell={renderProjectShell} runtimeConfig={runtimeConfig} />
  );

  if (!renderProjectShell) {
    return screen;
  }

  return (
    <SiteLayoutShell
      projectSearchScope={projectSearchScope}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks
    >
      {screen}
    </SiteLayoutShell>
  );
}

function ProjectChangeVcsScreen({
  renderProjectShell,
  runtimeConfig,
}: {
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const containerQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const changeVcsQuery = useQuery(
    readProjectChangeVcsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!containerQuery.data || !changeVcsQuery.data) {
    return <ProjectChangeVcsTitle ownerName={ownerName} projectName={projectName} />;
  }

  return (
    <>
      <ProjectChangeVcsTitle ownerName={ownerName} projectName={projectName} />
      <ProjectChangeVcsBody
        project={changeVcsQuery.data}
        renderProjectShell={renderProjectShell}
        shellProject={containerQuery.data}
        runtimeConfig={runtimeConfig}
      />
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
  renderProjectShell,
  shellProject,
  runtimeConfig,
}: {
  project: ProjectChangeVcsResponse;
  renderProjectShell: boolean;
  shellProject: ProjectContainer;
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
  const currentVcs = stringField(project.currentVcs, "GIT");
  const nextVcs = stringField(project.nextVcs, currentVcs === "GIT" ? "Subversion" : "GIT");
  const modalStateProps = changeVcsModalOpen
    ? stylex.props(projectChangeVcsModalStateStyles.visible)
    : changeVcsModalTouched
      ? stylex.props(projectChangeVcsModalStateStyles.hidden)
      : undefined;
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
      {renderProjectShell ? (
        <>
          <SharedProjectHeader basePath={runtimeConfig.basePath} project={shellProject} />
          <SharedProjectMenu
            active="setting"
            basePath={runtimeConfig.basePath}
            project={shellProject}
          />
        </>
      ) : null}
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingMenu
            ownerName={ownerName}
            project={shellProject}
            projectName={projectName}
          />
          <div
            className={`${stylex.props(styles.bubble).className} bubble-wrap gray wp`}
            data-stylex-owner="project-change-vcs-bubble"
          >
            <div className="row-fluid" data-stylex-owner="project-change-vcs-row">
              <h3 data-stylex-owner="project-change-vcs-heading">
                {currentVcs} <i className="yobicon-right-2 vmiddle"></i> {nextVcs}
              </h3>
              <div
                className={`${stylex.props(styles.description).className} cu-desc`}
                data-stylex-owner="project-change-vcs-description"
              >
                <ul data-stylex-owner="project-change-vcs-notices">
                  <li
                    className={`${stylex.props(styles.notice).className} notice`}
                    data-stylex-owner="project-change-vcs-notice"
                  >
                    <strong>{t("project.changeVCS.description1", { args: [nextVcs] })}</strong>
                  </li>
                  <li
                    className={`${stylex.props(styles.notice).className} notice`}
                    data-stylex-owner="project-change-vcs-notice"
                  >
                    <strong>{t("project.changeVCS.description2")}</strong>
                  </li>
                </ul>
                <p>
                  <input
                    id="acceptChangeVCS"
                    type="checkbox"
                    className={`${stylex.props(styles.checkbox).className} checkbox`}
                    data-stylex-owner="project-change-vcs-checkbox"
                    autoComplete="off"
                    checked={acceptedChangeVcs}
                    onChange={(event) => setAcceptedChangeVcs(event.currentTarget.checked)}
                  />
                  <label
                    htmlFor="acceptChangeVCS"
                    className={`${stylex.props(styles.agreementLabel).className} bg-checkbox label-agreement`}
                    data-stylex-owner="project-change-vcs-agreement-label"
                  >
                    {t("project.changeVCS.accept")}
                  </label>
                </p>
              </div>
            </div>
          </div>
          <div
            className={`${stylex.props(styles.actionBox).className} box-wrap bottom`}
            data-stylex-owner="project-change-vcs-action-box"
          >
            <button
              id="btnChangeVCS"
              type="button"
              className="ybtn ybtn-danger"
              data-stylex-owner="project-change-vcs-open-button"
              onClick={openChangeVcsModal}
            >
              <i className="yobicon-database"></i> {t("project.changeVCS.this")}
            </button>
          </div>
          <div
            id="alertChangeVCS"
            {...modalStateProps}
            className={`${stylex.props(styles.modal).className} modal hide${changeVcsModalOpen ? " in" : ""} ${modalStateProps?.className ?? ""}`.trim()}
            data-stylex-owner="project-change-vcs-modal"
            aria-hidden={changeVcsModalOpen ? false : changeVcsModalTouched ? true : undefined}
          >
            <div className="modal-header" data-stylex-owner="project-change-vcs-modal-header">
              <button type="button" className="close" onClick={dismissChangeVcsModal}>
                ×
              </button>
              <h3>{t("project.changeVCS.requestion", { args: [nextVcs] })}</h3>
            </div>
            <div className="modal-body" data-stylex-owner="project-change-vcs-modal-body">
              <p>{t("project.changeVCS.description2")}</p>
              <p>{t("project.changeVCS.reaccept")}</p>
            </div>
            <div className="modal-footer" data-stylex-owner="project-change-vcs-modal-footer">
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
      {changeVcsModalOpen ? (
        <div
          className={`${stylex.props(styles.backdrop).className} modal-backdrop in`}
          data-stylex-owner="project-change-vcs-backdrop"
        ></div>
      ) : null}
    </>
  );
}

function ProjectSettingMenu({
  ownerName,
  project,
  projectName,
}: {
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const memberCount = projectMemberCount(project);
  const codeMenuStyleProps = projectMenuEnabled(project, "code", "showCode")
    ? undefined
    : stylex.props(projectChangeVcsConditionalStyles.hidden);

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
        {...codeMenuStyleProps}
        className={`active ${codeMenuStyleProps?.className ?? ""}`.trim()}
        data-stylex-owner="project-change-vcs-code-menu"
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

const styles = stylex.create({
  bubble: {
    backgroundColor: projectChangeVcsTheme.bubbleBackground,
  },
  description: {
    display: "inline-block",
  },
  notice: {
    color: projectChangeVcsTheme.noticeText,
  },
  checkbox: {
    margin: "0px",
  },
  agreementLabel: {
    verticalAlign: "middle",
  },
  actionBox: {
    borderBottomColor: projectChangeVcsTheme.bottomBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    textAlign: "center",
  },
  modal: {
    backgroundColor: projectChangeVcsTheme.modalBackground,
  },
  backdrop: {
    backgroundColor: projectChangeVcsTheme.backdrop,
  },
});

function recordField(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function enrolledUserCount(project: ProjectContainer) {
  const enrolledUsers = recordField(project).enrolledUsers;
  return Array.isArray(enrolledUsers) ? enrolledUsers.length : 0;
}

function projectMemberCount(project: ProjectContainer) {
  return enrolledUserCount(project);
}

function projectMenuEnabled(project: ProjectContainer, menuKey: string, fallbackKey: string) {
  const menuSettingValue = recordField(recordField(project).menuSetting)[menuKey];
  if (typeof menuSettingValue === "boolean") {
    return menuSettingValue;
  }

  return booleanField(recordField(project)[fallbackKey]);
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName =
    typeof project.organizationName === "string" ? project.organizationName : "";
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
    stringField(project.projectScope, "").toUpperCase() === "PROTECTED"
  );
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
