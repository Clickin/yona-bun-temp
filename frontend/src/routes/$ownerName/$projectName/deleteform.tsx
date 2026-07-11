import { useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { deleteProjectRest, readProjectSettingsQueryOptions } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader as SharedProjectHeader } from "../$projectName";

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

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectDeleteFormRouteShell runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectDeleteFormRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectSettingsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectSearchScope = projectQuery.data
    ? {
        organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
        ownerName,
        projectName,
      }
    : { ownerName, projectName };

  return (
    <SiteLayoutShell
      projectSearchScope={projectSearchScope}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks
    >
      <ProjectDeleteFormScreen runtimeConfig={runtimeConfig} />
    </SiteLayoutShell>
  );
}

function ProjectDeleteFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const legacyTitle = `${t("project.delete")} - ${ownerName}/${projectName}`;
  const query = useQuery(
    readProjectSettingsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!query.data) {
    return <title>{legacyTitle}</title>;
  }

  return (
    <>
      <title>{legacyTitle}</title>
      <ProjectDeleteFormBody project={query.data} runtimeConfig={runtimeConfig} />
    </>
  );
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
  const [acceptedDeletion, setAcceptedDeletion] = useState(false);
  const [deletionModalState, setDeletionModalState] = useState<"initial" | "open" | "closed">(
    "initial",
  );
  const deletionModalOpen = deletionModalState === "open";
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
      <SharedProjectHeader
        basePath={runtimeConfig.basePath}
        project={projectWithLegacyHeaderAssets(project, runtimeConfig.basePath)}
      />
      <ProjectMenu project={project} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingMenu ownerName={ownerName} project={project} projectName={projectName} />
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
          <div className="box-wrap bottom">
            <button
              id="btnDelete"
              type="button"
              className="ybtn ybtn-danger"
              onClick={openDeletionModal}
            >
              <i className="yobicon-database-remove"></i> {t("project.delete.this")}
            </button>
          </div>
          <div
            id="alertDeletion"
            className={`modal hide${deletionModalOpen ? " in" : ""}`}
            aria-hidden={deletionModalState === "initial" ? undefined : !deletionModalOpen}
            style={
              deletionModalState === "initial"
                ? undefined
                : { display: deletionModalOpen ? "block" : "none" }
            }
          >
            <div className="modal-header">
              <button type="button" className="close" onClick={dismissDeletionModal}>
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
              <button type="button" className="ybtn" onClick={dismissDeletionModal}>
                {t("button.no")}
              </button>
            </div>
          </div>
          {deletionModalOpen ? (
            // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- legacy Bootstrap backdrop is a div and dismisses the delete modal on click.
            <div className="modal-backdrop fade in" onClick={closeDeletionModal}></div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ProjectMenu({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = projectMenuSetting(project);
  const enrolledMemberCount = countField(project.enrolledUsers);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            to="/$ownerName/$projectName"
            label={t("title.projectHome")}
            params={{ ownerName, projectName }}
            short="H"
          />
          {booleanField(menuSetting.code) ? (
            <ProjectMenuItem
              className="code-menu "
              label={t("menu.code")}
              params={{ ownerName, projectName }}
              short="C"
              to="/$ownerName/$projectName/code"
            />
          ) : null}
          {booleanField(menuSetting.issue) ? (
            <ProjectMenuItem
              count={numberField(project.openIssueCount)}
              label={t("menu.issue")}
              params={{ ownerName, projectName }}
              short="I"
              to="/$ownerName/$projectName/issues"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              count={numberField(project.openPullRequestCount)}
              label={t("menu.pullRequest")}
              params={{ ownerName, projectName }}
              short="P"
              to="/$ownerName/$projectName/pullRequests"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              count={numberField(project.reviewCount)}
              label={t("menu.review")}
              params={{ ownerName, projectName }}
              short="R"
              to="/$ownerName/$projectName/reviews"
            />
          ) : null}
          {booleanField(menuSetting.milestone) ? (
            <ProjectMenuItem
              label={t("milestone")}
              params={{ ownerName, projectName }}
              short="M"
              to="/$ownerName/$projectName/milestones"
            />
          ) : null}
          {booleanField(menuSetting.board) ? (
            <ProjectMenuItem
              count={numberField(project.boardCount) || numberField(project.postCount)}
              label={t("menu.board")}
              params={{ ownerName, projectName }}
              short="B"
              to="/$ownerName/$projectName/posts"
            />
          ) : null}
        </ul>
        {booleanField(project.viewerCanUpdate) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="active">
                <Link
                  activeOptions={legacyProjectDeleteLinkActiveOptions}
                  activeProps={legacyProjectDeleteLinkActiveProps}
                  to="/$ownerName/$projectName/settingform"
                  params={{ ownerName, projectName }}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={enrolledMemberCount} />
                </Link>
              </li>
              <li></li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ProjectMenuRoute =
  | "/$ownerName/$projectName"
  | "/$ownerName/$projectName/code"
  | "/$ownerName/$projectName/issues"
  | "/$ownerName/$projectName/pullRequests"
  | "/$ownerName/$projectName/reviews"
  | "/$ownerName/$projectName/milestones"
  | "/$ownerName/$projectName/posts";

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
  to: ProjectMenuRoute;
}) {
  return (
    <li className={className}>
      <Link
        activeOptions={legacyProjectDeleteLinkActiveOptions}
        activeProps={legacyProjectDeleteLinkActiveProps}
        to={to}
        params={params}
      >
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span> <CountBadge count={count} />
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
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const menuSetting = recordField(project.menuSetting);
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
        style={booleanField(menuSetting.code) ? undefined : { display: "none" }}
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

function projectMenuSetting(project: ProjectContainer) {
  const record = recordField(project);
  const nested = recordField(record.menuSetting);
  return {
    board: nested.board ?? record.showBoard,
    code: nested.code ?? record.showCode,
    issue: nested.issue ?? record.showIssue,
    milestone: nested.milestone ?? record.showMilestone,
    pullRequest: nested.pullRequest ?? record.showPullRequest,
    review: nested.review ?? record.showReview,
  };
}

function projectWithLegacyHeaderAssets(project: ProjectContainer, basePath: string) {
  const logoUrl =
    stringField(project.logoUrl, "") ||
    prefixBasePath(basePath, "/legacy-assets/images/project_default_logo.png");
  const backgroundUrl =
    stringField(project.backgroundImageUrl, "") ||
    stringField(project.backgroundUrl, "") ||
    prefixBasePath(basePath, "/legacy-assets/images/bg-default-project.jpg");
  return { ...project, backgroundImageUrl: backgroundUrl, logoUrl };
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
