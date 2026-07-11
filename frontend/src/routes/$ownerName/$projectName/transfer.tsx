import { useState, type ChangeEvent, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  readProjectContainerQueryOptions,
  readProjectTransferQueryOptions,
  requestProjectTransferRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectTransferResponse } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader as SharedProjectHeader } from "../$projectName";

type ProjectTransferScreenData = ProjectTransferResponse & ProjectContainer;

const legacyLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeSearch: true,
} as const;
const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
} as const;

export const Route = createFileRoute("/$ownerName/$projectName/transfer")({
  component: ProjectTransferRoute,
});

function ProjectTransferRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectTransferRouteShell runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectTransferRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
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
      <ProjectTransferScreen runtimeConfig={runtimeConfig} />
    </SiteLayoutShell>
  );
}

function ProjectTransferScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const transferQuery = useQuery(
    readProjectTransferQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !transferQuery.data) {
    return null;
  }

  const project = {
    ...projectQuery.data,
    ...transferQuery.data,
  } satisfies ProjectTransferScreenData;

  return (
    <>
      <title>{`${t("title.projectTransfer")} - ${ownerName}/${projectName}`}</title>
      <ProjectTransferBody project={project} runtimeConfig={runtimeConfig} />
    </>
  );
}

function ProjectTransferBody({
  project,
  runtimeConfig,
}: {
  project: ProjectTransferScreenData;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const [destination, setDestination] = useState("");
  const [isTransferAccepted, setIsTransferAccepted] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [hasTransferRequestStarted, setHasTransferRequestStarted] = useState(false);
  const transferMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return requestProjectTransferRest(runtimeConfig, csrfToken, {
        destination,
        ownerName,
        projectName,
      });
    },
    onSuccess(response) {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.transfer(ownerName, projectName),
      });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
      });
      if (typeof response.redirectPath === "string") {
        router.history.push(prefixBasePath(runtimeConfig.basePath, response.redirectPath));
      } else {
        router.history.go(0);
      }
    },
    onError() {
      setIsTransferModalOpen(false);
      // oxlint-disable-next-line no-alert -- legacy project.Transfer.js uses $yobi.alert for request failures.
      window.alert(t("project.transfer.error"));
    },
  });
  const insulateTransferModalButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const openTransferModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateTransferModalButtonClick(event);
    if (!isTransferAccepted) {
      // oxlint-disable-next-line no-alert -- legacy project.Transfer.js uses $yobi.alert before opening the modal.
      window.alert(t("project.transfer.alert"));
      return;
    }
    setIsTransferModalOpen(true);
  };
  const closeTransferModal = () => {
    setIsTransferModalOpen(false);
  };
  const dismissTransferModal = (event: MouseEvent<HTMLButtonElement>) => {
    insulateTransferModalButtonClick(event);
    closeTransferModal();
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
              <div className="cu-label">{t("project.transfer.new.owner")}</div>{" "}
              <div className="cu-desc">
                <p>
                  <input
                    type="text"
                    id="owner"
                    name="owner"
                    value={destination}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      setDestination(event.target.value);
                    }}
                  />
                </p>
              </div>
            </div>
            <div className="row-fluid">
              <div className="cu-label">{t("project.transfer")}</div>{" "}
              <div className="cu-desc">
                <ul>
                  <li className="notice">
                    <strong>{t("project.transfer.description1")}</strong>
                  </li>
                  <li className="notice">
                    <strong>{t("project.transfer.description2")}</strong>
                  </li>
                  <li className="notice">
                    <strong>{t("project.transfer.description3")}</strong>
                  </li>
                  <li className="notice">
                    <strong>{t("project.transfer.description4")}</strong>
                  </li>
                  <li className="notice">
                    <strong>{t("project.transfer.description5")}</strong>
                  </li>
                </ul>
                <p>
                  <input
                    type="checkbox"
                    className="checkbox"
                    autoComplete="off"
                    id="accept"
                    checked={isTransferAccepted}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      setIsTransferAccepted(event.target.checked);
                    }}
                  />
                  <label htmlFor="accept" className="bg-checkbox label-agreement">
                    {t("project.transfer.accept")}
                  </label>
                </p>
              </div>
            </div>
          </div>
          <div className="box-wrap bottom">
            <button
              type="button"
              id="btnTransfer"
              className="ybtn ybtn-danger"
              onClick={openTransferModal}
            >
              <i className="yobicon-database"></i> {t("project.transfer.this")}
            </button>
          </div>
          <div
            id="alertTransfer"
            className={isTransferModalOpen ? "modal hide in" : "modal hide"}
            style={isTransferModalOpen ? { display: "block" } : undefined}
          >
            <div className="modal-header">
              <button type="button" className="close" onClick={dismissTransferModal}>
                ×
              </button>
              <h3>{t("project.transfer.requestion")}</h3>
            </div>
            <div className="modal-body">
              <p>{t("project.transfer.description")}</p>
              <p>{t("project.transfer.reaccept")}</p>
            </div>
            <div className="modal-footer">
              <button
                id="btnTransferExec"
                type="button"
                className="ybtn ybtn-danger"
                disabled={hasTransferRequestStarted || transferMutation.isPending}
                onClick={() => {
                  if (hasTransferRequestStarted || transferMutation.isPending) {
                    return;
                  }
                  setHasTransferRequestStarted(true);
                  transferMutation.mutate();
                }}
              >
                {t("button.yes")}
              </button>
              <button type="button" className="ybtn" onClick={dismissTransferModal}>
                {t("button.no")}
              </button>
            </div>
          </div>
          {isTransferModalOpen ? (
            // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- legacy Bootstrap backdrop is a div and dismisses the transfer modal on click.
            <div className="modal-backdrop fade in" onClick={closeTransferModal}></div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ProjectMenu({ project }: { project: ProjectTransferScreenData }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = projectMenuSetting(project);
  const memberEnrollmentCount = projectMemberCount(project);
  const menuCounts = {
    board:
      numberField(recordField(project).boardCount) || numberField(recordField(project).postCount),
    issue: numberField(recordField(project).openIssueCount),
    pullRequest: numberField(recordField(project).openPullRequestCount),
    review: numberField(recordField(project).reviewCount),
  };

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
              count={menuCounts.issue}
              label={t("menu.issue")}
              params={{ ownerName, projectName }}
              short="I"
              to="/$ownerName/$projectName/issues"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              count={menuCounts.pullRequest}
              label={t("menu.pullRequest")}
              params={{ ownerName, projectName }}
              short="P"
              to="/$ownerName/$projectName/pullRequests"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              count={menuCounts.review}
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
              count={menuCounts.board}
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
                  activeOptions={legacyLinkActiveOptions}
                  activeProps={legacyLinkActiveProps}
                  to="/$ownerName/$projectName/setting"
                  params={{ ownerName, projectName }}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={memberEnrollmentCount} />
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
        activeOptions={legacyLinkActiveOptions}
        activeProps={legacyLinkActiveProps}
        to={to}
        params={params}
      >
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
        {count > 0 ? (
          <>
            {" "}
            <CountBadge count={count} />
          </>
        ) : null}
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
  project: ProjectTransferScreenData;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const memberEnrollmentCount = projectMemberCount(project);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <Link
          activeOptions={legacyLinkActiveOptions}
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
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
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
          activeOptions={legacyLinkActiveOptions}
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
          activeOptions={legacyLinkActiveOptions}
          activeProps={legacyLinkActiveProps}
          to="/$ownerName/$projectName/webhooks"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.webhook")}
        </Link>
      </li>
      <li id="subMenuProjectTransfer" className="active">
        <Link
          activeOptions={legacyLinkActiveOptions}
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
          activeOptions={legacyLinkActiveOptions}
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
        className=""
        style={booleanField(projectMenuSetting(project).code) ? undefined : { display: "none" }}
      >
        <Link
          activeOptions={legacyLinkActiveOptions}
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

function projectMenuSetting(project: ProjectTransferScreenData) {
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

function projectMemberCount(project: ProjectTransferScreenData) {
  const record = recordField(project);
  return countField(record.enrolledUsers);
}
