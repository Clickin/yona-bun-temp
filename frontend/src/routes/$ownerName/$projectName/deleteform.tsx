import { useState, type MouseEvent } from "react";
import { CountBadge } from "../../../components/count-badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  deleteProjectRest,
  readProjectContainerQueryOptions,
  readProjectSettingsQueryOptions,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

const legacyProjectDeleteLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeSearch: true,
};
const legacyProjectDeleteLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/$ownerName/$projectName/deleteform")({
  component: ProjectDeleteFormRoute,
});

function ProjectDeleteFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectDeleteFormRouteScreen renderProjectShell={false} runtimeConfig={runtimeConfig} />;
}

export function ProjectDeleteFormRouteScreen({
  renderProjectShell = true,
  runtimeConfig,
}: {
  renderProjectShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const content = (
    <ProjectDeleteFormRouteShell
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

function ProjectDeleteFormRouteShell({
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
  const projectSearchScope = containerQuery.data
    ? {
        organizationName: projectSearchScopeOrganizationName(containerQuery.data, ownerName),
        ownerName,
        projectName,
      }
    : { ownerName, projectName };

  const screen = (
    <ProjectDeleteFormScreen
      renderProjectShell={renderProjectShell}
      runtimeConfig={runtimeConfig}
    />
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

function ProjectDeleteFormScreen({
  renderProjectShell,
  runtimeConfig,
}: {
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const legacyTitle = `${t("project.delete")} - ${ownerName}/${projectName}`;
  const query = useQuery(
    readProjectSettingsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const containerQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!query.data || !containerQuery.data) {
    return <title>{legacyTitle}</title>;
  }

  return (
    <>
      <title>{legacyTitle}</title>
      <ProjectDeleteFormBody
        formProject={query.data}
        renderProjectShell={renderProjectShell}
        runtimeConfig={runtimeConfig}
        shellProject={containerQuery.data}
      />
    </>
  );
}

function ProjectDeleteFormBody({
  formProject,
  renderProjectShell,
  runtimeConfig,
  shellProject,
}: {
  formProject: ProjectContainer;
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
  shellProject: ProjectContainer;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [acceptedDeletion, setAcceptedDeletion] = useState(false);
  const [deletionModalState, setDeletionModalState] = useState<"initial" | "open" | "closed">(
    "initial",
  );
  const deletionModalOpen = deletionModalState === "open";
  const ownerName = stringField(formProject.ownerName, "owner");
  const projectName = stringField(formProject.projectName, "project");
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteProjectRest(runtimeConfig, csrfToken, { ownerName, projectName });
    },
    onSuccess(response) {
      queryClient.removeQueries({ queryKey: apiQueryKeys.project.base(ownerName, projectName) });
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.project.list() });
      setDeletionModalState("closed");
      router.history.push(
        prefixBasePath(runtimeConfig.basePath, stringField(response.redirectPath, "/")),
      );
    },
    onError() {
      setDeletionModalState("closed");
      window.alert(t("project.delete.error"));
    },
  });
  const insulateDeletionModalButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const openDeletionModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateDeletionModalButtonClick(event);
    if (!acceptedDeletion) {
      window.alert(t("project.delete.alert"));
      return;
    }
    setDeletionModalState("open");
  };
  const closeDeletionModal = () => setDeletionModalState("closed");
  const dismissDeletionModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateDeletionModalButtonClick(event);
    closeDeletionModal();
  };

  return (
    <>
      {renderProjectShell ? (
        <>
          <ProjectHeader basePath={runtimeConfig.basePath} project={shellProject} />
          <ProjectMenu active="setting" basePath={runtimeConfig.basePath} project={shellProject} />
        </>
      ) : null}
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingMenu
            ownerName={ownerName}
            project={shellProject}
            projectName={projectName}
          />
          <div className="bubble-wrap gray wp">
            <div className="cu-label">{t("project.delete")}</div>
            <div className="cu-desc">
              <p>
                <strong className="notice">{t("project.delete.description")}</strong>
              </p>
              <p>
                <input
                  type="checkbox"
                  className="checkbox"
                  autoComplete="off"
                  id="accept"
                  checked={acceptedDeletion}
                  onChange={(event) => setAcceptedDeletion(event.currentTarget.checked)}
                />
                <label htmlFor="accept" className="bg-checkbox label-agreement">
                  {t("project.delete.accept")}
                </label>
              </p>
            </div>
          </div>
          <div className="box-wrap bottom" data-owner="project-delete-action">
            <button
              id="btnDelete"
              type="button"
              className="ybtn ybtn-danger"
              data-owner="project-delete-action"
              onClick={openDeletionModal}
            >
              <i className="yobicon-database-remove"></i> {t("project.delete.this")}
            </button>
          </div>
          <div
            className={`modal hide${deletionModalOpen ? " in" : ""}`}
            id="alertDeletion"
            data-owner="project-delete-modal"
            aria-hidden={deletionModalState === "initial" ? undefined : !deletionModalOpen}
          >
            <div className="modal-header" data-owner="project-delete-modal-header">
              <button
                type="button"
                className="close"
                data-owner="project-delete-modal-header"
                onClick={dismissDeletionModal}
              >
                ×
              </button>
              <h3 className="" data-owner="project-delete-modal-header">
                {t("project.delete.requestion")}
              </h3>
            </div>
            <div className="modal-body" data-owner="project-delete-modal-body">
              <p> {t("project.delete.description")}</p>
              <p> {t("project.delete.reaccept")} </p>
            </div>
            <div className="modal-footer" data-owner="project-delete-modal-footer">
              <button
                id="btnDeleteExec"
                type="button"
                className="ybtn ybtn-danger"
                data-owner="project-delete-modal-footer"
                onClick={() => deleteMutation.mutate()}
              >
                {t("button.yes")}
              </button>
              <button
                type="button"
                className="ybtn"
                data-owner="project-delete-modal-footer"
                onClick={dismissDeletionModal}
              >
                {t("button.no")}
              </button>
            </div>
          </div>
          {deletionModalOpen ? (
            // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- legacy Bootstrap backdrop is a div and dismisses the delete modal on click.
            <div
              className=""
              data-owner="project-delete-modal-backdrop"
              onClick={closeDeletionModal}
            />
          ) : null}
        </div>
      </div>
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
  const menuSetting = recordField(project.menuSetting);
  const showCode = booleanField(menuSetting.code ?? project.showCode);
  const memberEnrollmentCount = countField(project.enrolledUsers);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <Link
          activeOptions={legacyProjectDeleteLinkActiveOptions}
          activeProps={legacyProjectDeleteLinkActiveProps}
          to="/$ownerName/$projectName/settingform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.setting")}
        </Link>
      </li>
      <li id="subMenuProjectMember" className="">
        <Link
          activeOptions={legacyProjectDeleteLinkActiveOptions}
          activeProps={legacyProjectDeleteLinkActiveProps}
          to="/$ownerName/$projectName/members"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.member")}
          <CountBadge count={memberEnrollmentCount} className="num-badge" />
        </Link>
      </li>
      <li id="subMenuIssueLabel" className="">
        <Link
          activeOptions={legacyProjectDeleteLinkActiveOptions}
          activeProps={legacyProjectDeleteLinkActiveProps}
          to="/$ownerName/$projectName/issue/labelsform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("issue.label")}
        </Link>
      </li>
      <li id="subMenuWebhook" className="">
        <Link
          activeOptions={legacyProjectDeleteLinkActiveOptions}
          activeProps={legacyProjectDeleteLinkActiveProps}
          to="/$ownerName/$projectName/webhooks"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.webhook")}
        </Link>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <Link
          activeOptions={legacyProjectDeleteLinkActiveOptions}
          activeProps={legacyProjectDeleteLinkActiveProps}
          to="/$ownerName/$projectName/transfer"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.transfer")}
        </Link>
      </li>
      <li id="subMenuProjectDelete" className="active">
        <Link
          activeOptions={legacyProjectDeleteLinkActiveOptions}
          activeProps={legacyProjectDeleteLinkActiveProps}
          to="/$ownerName/$projectName/deleteform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.delete")}
        </Link>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className=""
        style={showCode ? undefined : { display: "none" }}
        data-owner="project-delete-code-menu"
      >
        <Link
          activeOptions={legacyProjectDeleteLinkActiveOptions}
          activeProps={legacyProjectDeleteLinkActiveProps}
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

function countField(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function booleanField(value: unknown) {
  return value === true;
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return booleanField(project.isProtected) ? ownerName : undefined;
}
