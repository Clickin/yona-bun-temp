import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  useLinkProps,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { type ComponentProps, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  cancelEnrollProjectRest,
  deleteProjectMemberRest,
  enrollProjectRest,
  readProjectContainerQueryOptions,
  toggleFavoriteProjectRest,
  toggleProjectWatchRest,
  updateProjectOverviewRest,
} from "../../api/org-project";
import { apiQueryKeys } from "../../api/query-keys";
import type { ProjectContainer, YonaUserItem } from "../../api/types";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";
import { RootAliasNotFound } from "../__root";

export const Route = createFileRoute("/$ownerName/$projectName")({
  component: ProjectHomeRoute,
  notFoundComponent: RootAliasNotFound,
  validateSearch(search) {
    return {
      ...(legacyQueryString(search.commentId)
        ? { commentId: legacyQueryString(search.commentId) }
        : {}),
      ...(legacyQueryString(search.parentIssueId)
        ? { parentIssueId: legacyQueryString(search.parentIssueId) }
        : {}),
      ...(typeof search.tabId === "string" ? { tabId: search.tabId } : {}),
    };
  },
});

function legacyQueryString(value: unknown) {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
      ? String(value)
      : "";
}

function ProjectHomeRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isProjectHome = pathname === `/${ownerName}/${projectName}`;

  if (!isProjectHome) {
    return <Outlet />;
  }

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectHomeScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectHomeScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const { tabId } = Route.useSearch();
  const query = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!query.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={query.data} />
      <ProjectMenu active="home" basePath={runtimeConfig.basePath} project={query.data} />
      <ProjectHomeBody
        project={query.data}
        runtimeConfig={runtimeConfig}
        tabId={tabId || "readme"}
      />
    </>
  );
}

function ProjectHomeBody({
  project,
  runtimeConfig,
  tabId,
}: {
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
  tabId: string;
}) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const initialOverview = stringField(project.overview, "");
  const [descriptionEditing, setDescriptionEditing] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [cloneCopyNoticeKey, setCloneCopyNoticeKey] = useState(0);
  const [overviewText, setOverviewText] = useState(initialOverview);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const projectRecord = recordField(project);
  const menuSetting = projectMenuSetting(project);
  const members = arrayField(projectRecord.members) as YonaUserItem[];
  const currentUserId =
    numberField(projectRecord.viewerUserId) ||
    numberField(projectRecord.currentUserId) ||
    numberField(projectRecord.actorId) ||
    1;
  const cloneUrl =
    stringField(projectRecord.cloneUrl, "") ||
    stringField(projectRecord.cloneUrlWithLoginId, "") ||
    stringField(projectRecord.repositoryUrl, "");
  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteProjectMemberRest(runtimeConfig, csrfToken, {
        ownerName,
        projectName,
        userId: currentUserId,
      });
    },
    onSuccess(response) {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
      });
      const redirectPath = stringField(response.redirectPath, `/${ownerName}/${projectName}`);
      router.history.push(
        redirectPath.startsWith(`${runtimeConfig.basePath}/`) ||
          redirectPath === runtimeConfig.basePath
          ? redirectPath
          : prefixBasePath(runtimeConfig.basePath, redirectPath),
      );
    },
  });
  const overviewMutation = useMutation({
    mutationFn: async (overview: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateProjectOverviewRest(runtimeConfig, csrfToken, ownerName, projectName, overview);
    },
    onSuccess(response, overview) {
      setOverviewText(stringField(response.overview, overview));
      setDescriptionEditing(false);
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(ownerName, projectName),
      });
    },
  });

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="project-breadcrumb hide show-in-mobile">
          <span className="project-author">
            <LegacyLink href={prefixBasePath(runtimeConfig.basePath, `/${ownerName}`)}>
              {ownerName}
            </LegacyLink>
          </span>
          <span className="project-separator">/</span>
          <span className="project-name">
            <LegacyLink href={projectHref(runtimeConfig.basePath, ownerName, projectName)}>
              {projectName}
            </LegacyLink>
          </span>
          {booleanField(projectRecord.isPrivate) ? (
            <span className="project-private">
              <i className="yobicon-lock"></i>
            </span>
          ) : null}
        </div>
        <div className="project-home-header row-fluid">
          <div className="project-overview span9 span-hard-wrap">
            <div
              className={descriptionEditing ? "project-description hidden" : "project-description"}
              data-toggle="project-description-tab"
            >
              <h3>
                <span id="project-description" className="markdown-wrap">
                  {overviewText || t("project.description.placeholder")}
                </span>
                {booleanField(project.viewerCanUpdate) ? (
                  <button
                    type="button"
                    className="ybtn ybtn-minimum"
                    data-toggle="description-edit"
                    onClick={() => {
                      setDescriptionEditing(true);
                      window.setTimeout(() => descriptionInputRef.current?.focus());
                    }}
                  >
                    <i className="yobicon-edit"></i>
                  </button>
                ) : null}
              </h3>
            </div>
            <div
              className={
                descriptionEditing ? "project-description-edit" : "project-description-edit hidden"
              }
              data-toggle="project-description-tab"
            >
              <form
                action={prefixBasePath(
                  runtimeConfig.basePath,
                  `/${ownerName}/${projectName}/projectOverviewUpdate`,
                )}
                onSubmit={(event) => event.preventDefault()}
              >
                <input
                  type="text"
                  id="project-description-input"
                  ref={descriptionInputRef}
                  className="span6"
                  placeholder={t("project.description.placeholder")}
                  defaultValue={overviewText}
                />
                <button
                  type="button"
                  className="ybtn ybtn-success"
                  id="descriptionSaveBtn"
                  onClick={(event) => {
                    const form = event.currentTarget.form;
                    const input = form?.querySelector<HTMLInputElement>(
                      "#project-description-input",
                    );
                    overviewMutation.mutate(input?.value ?? "");
                  }}
                >
                  {t("button.save")}
                </button>{" "}
                <button
                  type="button"
                  className="ybtn"
                  data-toggle="description-cancel"
                  onClick={() => setDescriptionEditing(false)}
                >
                  {t("button.cancel")}
                </button>
              </form>
            </div>
          </div>
          {booleanField(menuSetting.code) ? (
            <div className="project-clone-wrap span3 hide-in-mobile">
              <input
                type="text"
                className="project-clone-url"
                id="cloneURL"
                readOnly
                value={cloneUrl}
                onClick={(event) => event.currentTarget.select()}
              />
              <button
                className="ybtn project-clone-button"
                data-clipboard-target="cloneURL"
                id="cloneURLBtn"
                onClick={async () => {
                  await navigator.clipboard?.writeText(cloneUrl);
                  setCloneCopyNoticeKey((key) => key + 1);
                  window.setTimeout(() => document.dispatchEvent(new Event("yobi:notify-scan")));
                }}
              >
                {t("code.copyUrl")}
              </button>
              {cloneCopyNoticeKey > 0 ? (
                <span
                  key={cloneCopyNoticeKey}
                  data-toggle="yobi-notify"
                  data-message={t("code.copyUrl.copied")}
                  hidden
                />
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="row-fluid">
          <div className="span9 span-left-pane">
            <ul className="nav nav-tabs">
              <li className={tabId === "readme" ? "active" : ""}>
                <LegacyLink href={projectHref(runtimeConfig.basePath, ownerName, projectName)}>
                  README
                </LegacyLink>
              </li>
              <li className={tabId === "history" ? "active" : ""}>
                <LegacyLink
                  href={prefixBasePath(
                    runtimeConfig.basePath,
                    `/${ownerName}/${projectName}?tabId=history`,
                  )}
                >
                  {t("project.history.recent")}
                </LegacyLink>
              </li>
              <li className={tabId === "dashboard" ? "active" : ""}>
                <LegacyLink
                  href={prefixBasePath(
                    runtimeConfig.basePath,
                    `/${ownerName}/${projectName}?tabId=dashboard`,
                  )}
                >
                  {t("project.dashboard")}
                </LegacyLink>
              </li>
            </ul>

            <div className="tab-content">
              <div className="tab-pane active">
                {tabId === "history" ? (
                  <HistoryPane basePath={runtimeConfig.basePath} project={project} />
                ) : tabId === "dashboard" ? (
                  <DashboardPane
                    basePath={runtimeConfig.basePath}
                    ownerName={ownerName}
                    project={project}
                    projectName={projectName}
                  />
                ) : (
                  <ReadmePane
                    basePath={runtimeConfig.basePath}
                    ownerName={ownerName}
                    project={project}
                    projectName={projectName}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="span3 span-right-pane">
            <div className="bubble-wrap gray project-home">
              <div className="project-btn-wrap">
                {booleanField(menuSetting.issue) ? (
                  <span className="project-btn-item">
                    <LegacyLink
                      href={prefixBasePath(
                        runtimeConfig.basePath,
                        `/${ownerName}/${projectName}/issueform`,
                      )}
                      className="ybtn ybtn-success"
                    >
                      {t("button.newIssue")}
                    </LegacyLink>
                  </span>
                ) : null}
                {booleanField(menuSetting.code) && stringField(project.vcs, "GIT") === "GIT" ? (
                  <span className="project-btn-item">
                    <LegacyLink
                      href={prefixBasePath(
                        runtimeConfig.basePath,
                        `/${ownerName}/${projectName}/newFork`,
                      )}
                      className="ybtn ybtn-inverse"
                    >
                      {t("fork")}
                    </LegacyLink>
                  </span>
                ) : null}
              </div>
              <div className="inner member-info">
                <header>
                  <h3>{t("project.members")}</h3>
                  {booleanField(project.viewerCanUpdate) ? (
                    <LegacyLink
                      href={prefixBasePath(
                        runtimeConfig.basePath,
                        `/${ownerName}/${projectName}/members`,
                      )}
                      className="ybtn ybtn-minimum"
                      id="member-add-link"
                    >
                      <i className="yobicon-addfriend"></i> {t("button.add")}
                    </LegacyLink>
                  ) : null}
                </header>
                <div className="member-wrap">
                  <ul className="project-members">
                    {members.map((member) => (
                      <ProjectMember
                        basePath={runtimeConfig.basePath}
                        key={stringField(member.loginId, stringField(member.userId, ""))}
                        member={member}
                      />
                    ))}
                  </ul>
                </div>
              </div>
              {booleanField(projectRecord.viewerCanLeave) ||
              booleanField(project.viewerCanLeave) ? (
                <button
                  type="button"
                  className="ybtn ybtn-minimum ybtn-danger pull-right"
                  id="projectLeaveBtn"
                  data-href={prefixBasePath(
                    runtimeConfig.basePath,
                    `/${ownerName}/${projectName}/members/${currentUserId}`,
                  )}
                  onClick={() => setLeaveModalOpen(true)}
                >
                  {t("project.member.leave")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div
          id="alertLeave"
          className={leaveModalOpen ? "modal" : "modal hide"}
          style={leaveModalOpen ? { display: "block" } : undefined}
        >
          <div className="modal-header">
            <button
              type="button"
              className="close"
              data-dismiss="modal"
              onClick={() => setLeaveModalOpen(false)}
            >
              ×
            </button>
            <h3>{t("project.member.leave")}</h3>
          </div>
          <div className="modal-body">
            <p>{t("project.member.leaveConfirm")}</p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="ybtn ybtn-info ybtn-mini"
              id="leaveBtn"
              onClick={() => leaveMutation.mutate()}
            >
              {t("button.yes")}
            </button>
            <button
              type="button"
              className="ybtn ybtn-mini"
              data-dismiss="modal"
              onClick={() => setLeaveModalOpen(false)}
            >
              {t("button.no")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadmePane({
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
  const projectRecord = recordField(project);
  const readmeFile = recordField(projectRecord.readmeFile);
  const hasReadmeFile = projectRecord.readmeFile != null;
  const readmeBody = stringField(readmeFile.bodyMarkdown, "");
  const readmeName = stringField(readmeFile.name, "");
  const canCreateReadme =
    booleanField(projectRecord.viewerCanCreateCommitResource) ||
    booleanField(projectRecord.viewerCanCreateReadme) ||
    booleanField(project.viewerCanUpdate);

  return (
    <div className="bubble-wrap gray readme">
      {hasReadmeFile ? (
        <div className="readme-wrap">
          <header>
            <i className="yobicon-book-open vmiddle"></i>
            <strong className="vmiddle"> {readmeName}</strong>
            {stringField(project.vcs, "GIT") === "GIT" && canCreateReadme ? (
              <LegacyLink
                href={prefixBasePath(basePath, `/${ownerName}/${projectName}/postform?readme=true`)}
                className="ybtn vmiddle ml5"
              >
                {t("button.edit")}
              </LegacyLink>
            ) : null}
          </header>
          <div className="readme-body markdown-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{readmeBody}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <p className="default">
          {stringField(project.vcs, "GIT") === "GIT" ? (
            <>
              <span>{t("project.readme")}</span>
              <br />
              <br />
              {canCreateReadme ? (
                <LegacyLink
                  href={prefixBasePath(
                    basePath,
                    `/${ownerName}/${projectName}/postform?readme=true`,
                  )}
                  className="ybtn"
                >
                  {t("project.readme.create")}
                </LegacyLink>
              ) : null}
            </>
          ) : (
            <span>{t("project.svn.readme")}</span>
          )}
        </p>
      )}
    </div>
  );
}

function HistoryPane({ basePath, project }: { basePath: string; project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const historyRecord = recordField(recordField(project).history);
  const items = arrayField(historyRecord.items);

  return (
    <div className="content-container nm">
      <div className="main-stream" style={{ width: "100%" }}>
        <ul className="activity-streams unstyled">
          {items.map((item) => {
            const itemRecord = recordField(item);
            const actorUrl = normalizeHistoryHref(basePath, stringField(itemRecord.actorUrl, "#"));
            const itemUrl = normalizeHistoryHref(basePath, stringField(itemRecord.url, "#"));
            const itemType = stringField(itemRecord.itemType, "");
            const shortTitle = stringField(itemRecord.shortTitle, "");
            const title = stringField(itemRecord.title, "");
            const createdLabel = stringField(itemRecord.createdLabel, "");
            return (
              <li className="activity-stream" key={`${itemUrl}-${shortTitle}-${createdLabel}`}>
                <LegacyLink href={actorUrl} className="avatar-wrap pull-left mr10">
                  <img
                    src={stringField(
                      itemRecord.actorAvatarUrl,
                      "/assets/images/default-avatar-64.png",
                    )}
                    width="32"
                    height="32"
                    alt=""
                  />
                </LegacyLink>
                <div className="activity-desc">
                  <p className="header-text" style={{ marginBottom: "5px" }}>
                    <LegacyLink href={actorUrl} className="actor">
                      {stringField(itemRecord.actorName, "")}
                    </LegacyLink>{" "}
                    {t(`project.history.type.${itemType}`)}{" "}
                    <span className="whereis">
                      <LegacyLink href={itemUrl} className="where">
                        {shortTitle}
                      </LegacyLink>{" "}
                      <LegacyLink href={itemUrl} className="title">
                        {title}
                      </LegacyLink>
                    </span>
                  </p>
                  <p className="others" style={{ paddingLeft: "0" }}>
                    <span
                      className="date"
                      style={{ marginLeft: "0" }}
                      title={stringField(
                        itemRecord.createdTitle,
                        stringField(itemRecord.createdLabel, ""),
                      )}
                    >
                      {createdLabel}
                    </span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function DashboardPane({
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
  const menuSetting = projectMenuSetting(project);
  const dashboard = recordField(recordField(project).dashboard);
  const assignees = arrayField(dashboard.assignees);
  const milestones = arrayField(dashboard.milestones);
  const labels = arrayField(dashboard.labels);
  const pullRequests = arrayField(dashboard.pullRequests);
  const unassignedCount = numberField(dashboard.unassignedOpenIssueCount);
  const noMilestoneCount = numberField(dashboard.noMilestoneOpenIssueCount);
  const totalOpenIssues =
    assignees.reduce((sum, item) => sum + numberField(recordField(item).openIssueCount), 0) +
    unassignedCount;

  return (
    <div className="content-container nm">
      <div className="project-overview-home row-fluid">
        <div className="span6">
          {booleanField(menuSetting.issue) ? (
            <>
              <h5>{t("project.dashboard.openIssuesByAssignee")}</h5>
              <div className="overview-assignee">
                {assignees.length === 0 && unassignedCount === 0 ? (
                  <DashboardEmpty
                    actionHref={prefixBasePath(basePath, `/${ownerName}/${projectName}/issueform`)}
                    actionText={t("issue.menu.new")}
                    message={t("issue.is.empty")}
                  />
                ) : (
                  <>
                    {assignees.map((assignee) => {
                      const record = recordField(assignee);
                      const userId = numberField(record.userId);
                      const count = numberField(record.openIssueCount);
                      const loginId = stringField(record.loginId, "");
                      const userLabel = stringField(record.userLabel, loginId);
                      const percent = percentOf(count, totalOpenIssues);
                      return (
                        <div className="row-fluid" key={`${userId}-${loginId}`}>
                          <div className="span6">
                            <LegacyLink
                              href={issueHref(
                                basePath,
                                ownerName,
                                projectName,
                                `assigneeId=${userId}`,
                              )}
                              className="usf-group"
                              title={`${userLabel} (@${loginId})`}
                            >
                              <span className="avatar-wrap smaller">
                                <img
                                  src={stringField(
                                    record.avatarUrl,
                                    "/assets/images/default-avatar-32.png",
                                  )}
                                  width="20"
                                  height="20"
                                  alt=""
                                />
                              </span>
                              <strong className="name">{userLabel}</strong>
                              <span className="loginid">
                                {" "}
                                <strong>@</strong>
                                {loginId}
                              </span>
                            </LegacyLink>
                          </div>
                          <div className="span3 num">
                            <strong>{count}</strong>
                          </div>
                          <div className="span3 nm">
                            <ProgressBar className="progress-warning" percent={percent} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="row-fluid">
                      <div className="span6">
                        <LegacyLink
                          href={issueHref(basePath, ownerName, projectName, "assigneeId=-1")}
                          className="usf-group"
                        >
                          <span className="avatar-wrap smaller">
                            <i className="yobicon-blankstare"></i>
                          </span>
                          <span className="name">{t("issue.noAssignee")}</span>
                        </LegacyLink>
                      </div>
                      <div className="span3 num">
                        <strong>{unassignedCount}</strong>
                      </div>
                      <div className="span3 nm">
                        <ProgressBar
                          className="progress-warning"
                          percent={percentOf(unassignedCount, totalOpenIssues)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <hr />

              <h5>{t("project.dashboard.openIssuesByMilestone")}</h5>
              <div className="overview-milestone">
                {milestones.length === 0 ? (
                  <DashboardEmpty
                    actionHref={prefixBasePath(
                      basePath,
                      `/${ownerName}/${projectName}/newMilestoneForm`,
                    )}
                    actionText={t("milestone.menu.new")}
                    message={t("milestone.is.empty")}
                  />
                ) : (
                  <>
                    {milestones.map((milestone) => {
                      const record = recordField(milestone);
                      const milestoneId = numberField(record.id);
                      const count = numberField(record.openIssueCount);
                      const percent = numberField(record.completionPercent);
                      return (
                        <div className="row-fluid" key={milestoneId}>
                          <div className="span6">
                            <LegacyLink
                              href={issueHref(
                                basePath,
                                ownerName,
                                projectName,
                                `milestoneId=${milestoneId}`,
                              )}
                            >
                              {stringField(record.title, "")}
                            </LegacyLink>
                          </div>
                          <div className="span3 num">
                            <strong>{count}</strong>
                          </div>
                          <div className="span3 nm">
                            <ProgressBar className="progress-success" percent={percent} success />
                          </div>
                        </div>
                      );
                    })}
                    <div className="row-fluid">
                      <div className="span6">
                        <LegacyLink
                          href={issueHref(basePath, ownerName, projectName, "milestoneId=-1")}
                        >
                          {t("issue.noMilestone")}
                        </LegacyLink>
                      </div>
                      <div className="span3 num">
                        <strong>{noMilestoneCount}</strong>
                      </div>
                      <div className="span3 nm"></div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : null}

          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <>
              {booleanField(menuSetting.issue) ? <hr /> : null}
              <h5>{t("project.dashboard.pullRequests")}</h5>
              <div className="overview-pullrequest">
                {pullRequests.length > 0 ? (
                  pullRequests.map((pullRequest) => {
                    const record = recordField(pullRequest);
                    const number = numberField(record.pullRequestNumber);
                    return (
                      <div className="row-fluid" key={number}>
                        <div className="span9 title">
                          <LegacyLink
                            href={prefixBasePath(
                              basePath,
                              `/${ownerName}/${projectName}/pullRequests?contributorId=${numberField(record.contributorUserId)}`,
                            )}
                            className="usf-group"
                          >
                            <span
                              className="avatar-wrap smaller"
                              data-toggle="tooltip"
                              title={`${stringField(record.contributorUserLabel, "")} (@${stringField(record.contributorLoginId, "")})`}
                            >
                              <img
                                src={stringField(
                                  record.contributorAvatarUrl,
                                  "/assets/images/default-avatar-32.png",
                                )}
                                width="20"
                                height="20"
                                alt=""
                              />
                            </span>
                          </LegacyLink>
                          <LegacyLink
                            href={prefixBasePath(
                              basePath,
                              `/${ownerName}/${projectName}/pullRequest/${number}`,
                            )}
                          >
                            {stringField(record.title, "")}
                          </LegacyLink>
                        </div>
                        <div className="span3 num right-txt" style={{ color: "#999" }}>
                          {stringField(record.createdLabel, "")}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <DashboardEmpty
                    actionHref={prefixBasePath(
                      basePath,
                      `/${ownerName}/${projectName}/newPullRequestForm`,
                    )}
                    actionText={t("pullRequest.new")}
                    message={t("pullRequest.is.empty")}
                  />
                )}
              </div>
            </>
          ) : null}
        </div>

        {booleanField(menuSetting.issue) ? (
          <div className="span6">
            <h5>{t("project.dashboard.openIssuesByLabel")}</h5>
            <DashboardLabels
              basePath={basePath}
              labels={labels}
              ownerName={ownerName}
              projectName={projectName}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DashboardLabels({
  basePath,
  labels,
  ownerName,
  projectName,
}: {
  basePath: string;
  labels: unknown[];
  ownerName: string;
  projectName: string;
}) {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const label of labels) {
    const record = recordField(label);
    const categoryName = stringField(record.categoryName, "");
    groups.set(categoryName, [...(groups.get(categoryName) ?? []), record]);
  }

  return (
    <>
      {Array.from(groups.entries()).map(([categoryName, categoryLabels]) => (
        <dl className="dl-horizontal overview-label" key={categoryName}>
          <dt>{categoryName}</dt>
          <dd>
            {categoryLabels.map((label) => {
              const labelId = numberField(label.id);
              return (
                <div className="row-fluid" key={labelId}>
                  <div className="span10">
                    <LegacyLink
                      href={issueHref(basePath, ownerName, projectName, `labelIds=${labelId}`)}
                    >
                      <span className="issue-label list-label active" data-label-id={labelId}>
                        {stringField(label.name, "")}
                      </span>
                    </LegacyLink>
                  </div>
                  <div className="span2 num">
                    <strong>{numberField(label.openIssueCount)}</strong>
                  </div>
                </div>
              );
            })}
          </dd>
        </dl>
      ))}
    </>
  );
}

function DashboardEmpty({
  actionHref,
  actionText,
  message,
}: {
  actionHref: string;
  actionText: string;
  message: string;
}) {
  return (
    <div className="empty">
      <p>{message}</p>
      <LegacyLink href={actionHref} target="_blank" className="ybtn ybtn-small">
        {actionText}
      </LegacyLink>
    </div>
  );
}

function ProgressBar({
  className,
  percent,
  success = false,
}: {
  className: string;
  percent: number;
  success?: boolean;
}) {
  return (
    <div
      className={`progress ${className} ${percent === 0 ? "empty" : ""}`}
      data-toggle="tooltip"
      title={`${percent}%`}
    >
      <div className={`bar${success ? " bar-success" : ""}`} style={{ width: `${percent}%` }}></div>
    </div>
  );
}

function ProjectMember({ basePath, member }: { basePath: string; member: YonaUserItem }) {
  const loginId = stringField(member.loginId, "");
  const userLabel = stringField(member.userLabel, loginId);

  return (
    <li className="member">
      <LegacyLink
        href={prefixBasePath(basePath, `/${loginId}`)}
        className="avatar-wrap img-rounded pull-left small"
      >
        <img
          src={stringField(member.avatarUrl, "/assets/images/default-avatar-32.png")}
          alt={loginId}
          width="24"
          height="24"
        />
      </LegacyLink>
      <LegacyLink href={prefixBasePath(basePath, `/${loginId}`)} className="name">
        <strong>{`${userLabel} (${loginId})`}</strong>
      </LegacyLink>
    </li>
  );
}

export function ProjectHeader({
  basePath,
  project,
}: {
  basePath: string;
  project: ProjectContainer;
}) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const projectIdValue = projectId(project);
  const [isFavoritedProject, setIsFavoritedProject] = useState(() => projectFavorited(project));
  const logoUrl = projectLogoUrl(project);
  const backgroundImageUrl =
    stringField(recordField(project).backgroundImageUrl, "") ||
    stringField(recordField(project).backgroundUrl, "") ||
    "/assets/images/bg-default-project.png";
  const isForked =
    booleanField(recordField(project).isForkedFromOrigin) ||
    booleanField(recordField(project).isForked);
  const originalOwnerName =
    stringField(recordField(project).originalOwnerName, "") ||
    stringField(recordField(project).originOwnerName, "");
  const originalProjectName =
    stringField(recordField(project).originalProjectName, "") ||
    stringField(recordField(project).originProjectName, "");
  const canEnrollProject = projectCanEnroll(project);
  const [enrollmentRequested, setEnrollmentRequested] = useState(() =>
    projectEnrollmentRequested(project),
  );
  const canWatchProject = projectCanWatch(project);
  const [watchState, setWatchState] = useState({
    count: projectWatchingCount(project),
    isWatching: projectIsWatching(project),
  });
  const [projectUtilDropdown, setProjectUtilDropdown] = useState<"enrollment" | "watch" | null>(
    null,
  );
  const projectIdValueForLinks = projectIdValue || projectId(project);
  const toggleProjectUtilDropdown = (dropdown: "enrollment" | "watch") => {
    setProjectUtilDropdown((current) => (current === dropdown ? null : dropdown));
  };
  const enrollmentMutation = useMutation({
    mutationFn: async (nextRequested: boolean) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return nextRequested
        ? enrollProjectRest(runtimeConfig, csrfToken, ownerName, projectName)
        : cancelEnrollProjectRest(runtimeConfig, csrfToken, ownerName, projectName);
    },
    onSuccess(response, nextRequested) {
      setEnrollmentRequested(
        typeof response.enrollmentRequested === "boolean"
          ? response.enrollmentRequested
          : nextRequested,
      );
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.container(ownerName, projectName),
      });
    },
  });
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
      setWatchState((current) => ({
        count:
          projectWatchingCountValue(response) ??
          Math.max(0, current.count + (nextWatching ? 1 : -1)),
        isWatching: nextWatching,
      }));
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
                <LegacyLink href={prefixBasePath(basePath, `/${ownerName}`)}>
                  {ownerName}
                </LegacyLink>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <LegacyLink href={projectHref(basePath, ownerName, projectName)}>
                  {projectName}
                </LegacyLink>
              </span>
              <span
                className="user-project-list"
                data-project-id={projectIdValue}
                role="button"
                tabIndex={0}
                onMouseDown={(event) => {
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
              {booleanField(recordField(project).isPrivate) ? (
                <span className="project-private">
                  <i className="yobicon-lock"></i>
                </span>
              ) : null}
              {booleanField(recordField(project).isProtected) ? (
                <span className="project-protected" title="Group Project">
                  G
                </span>
              ) : null}
            </div>
            {isForked ? (
              <div className="project-origin">
                <span className="project-origin-title">{t("fork.original")}</span>
                <LegacyLink
                  href={projectHref(basePath, originalOwnerName, originalProjectName)}
                  className="project-origin-name"
                >
                  {originalOwnerName} / {originalProjectName}
                </LegacyLink>
              </div>
            ) : null}
          </div>
          <div className="project-util-wrap">
            <ul className="project-util">
              {canEnrollProject ? (
                <li className={projectUtilDropdown === "enrollment" ? "open" : undefined}>
                  {enrollmentRequested ? (
                    <>
                      <button
                        className="ybtn ybtn-small ybtn-info dropdown-toggle"
                        type="button"
                        data-toggle="dropdown"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleProjectUtilDropdown("enrollment");
                        }}
                      >
                        <i className="yobicon-addfriend"></i>
                      </button>
                      <div className="dropdown-menu flat right title">
                        <div className="pop-title">
                          {t("project.you.want.to.be.a.member", { args: [projectName] })}
                        </div>
                        <div className="pop-content">{t("project.member.enrollment.help")}</div>
                        <div className="pop-content btn-wrap">
                          <button
                            type="button"
                            className="ybtn enrollBtn"
                            id="enrollBtn"
                            onClick={(event) => {
                              event.stopPropagation();
                              setProjectUtilDropdown(null);
                              enrollmentMutation.mutate(false);
                            }}
                          >
                            <i className="yobicon-removefriend"></i> {t("button.cancel.enrollment")}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        className="ybtn ybtn-small dropdown-toggle"
                        type="button"
                        data-toggle="dropdown"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleProjectUtilDropdown("enrollment");
                        }}
                      >
                        <i className="yobicon-addfriend"></i>
                        {t("organization.member.enrollment.title")}
                      </button>
                      <div className="dropdown-menu flat right title">
                        <div className="pop-title">
                          {t("project.you.may.want.to.be.a.member", { args: [projectName] })}
                        </div>
                        <div className="pop-content">
                          {t("project.member.enrollment.will.help")}
                        </div>
                        <div className="pop-content btn-wrap">
                          <button
                            type="button"
                            className="ybtn ybtn-info enrollBtn"
                            id="enrollBtn"
                            onClick={(event) => {
                              event.stopPropagation();
                              setProjectUtilDropdown(null);
                              enrollmentMutation.mutate(true);
                            }}
                          >
                            <i className="yobicon-addfriend"></i> {t("button.new.enrollment")}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ) : null}
              {canWatchProject ? (
                <li className={projectUtilDropdown === "watch" ? "open" : undefined}>
                  <div
                    className={`btn-group dropdown watch-btn${projectUtilDropdown === "watch" ? " open" : ""}`}
                  >
                    <LegacyLink
                      className={`btn watcher-count no-border ${watchState.isWatching ? "watch-on" : ""}`}
                      data-toggle="tooltip"
                      title={t("project.watcher.number")}
                      href={prefixBasePath(basePath, `/${ownerName}/${projectName}/watchers`)}
                    >
                      {watchState.count}
                    </LegacyLink>
                    <div className="dropdown-menu flat right title">
                      <div className="pop-title">
                        {t(
                          watchState.isWatching
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
                        <LegacyLink
                          className="ybtn"
                          href={prefixBasePath(
                            basePath,
                            `/user/editform/notifications#${projectIdValueForLinks}`,
                          )}
                        >
                          <i className="yobicon-alert2"></i> {t("userinfo.changeNotifications")}
                        </LegacyLink>
                        <button
                          type="button"
                          className="ybtn ybtn-watching watchBtn"
                          onClick={(event) => {
                            event.stopPropagation();
                            setProjectUtilDropdown(null);
                            watchMutation.mutate(!watchState.isWatching);
                          }}
                        >
                          <i
                            className={watchState.isWatching ? "yobicon-eye-off" : "yobicon-eye"}
                          ></i>{" "}
                          {t(watchState.isWatching ? "project.unwatch" : "project.watch")}
                        </button>
                      </div>
                    </div>
                    <button
                      className="btn nofocus no-border down-arrow"
                      type="button"
                      data-toggle="dropdown"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleProjectUtilDropdown("watch");
                      }}
                    >
                      {t(watchState.isWatching ? "project.unwatch" : "project.watch")}
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

export function ProjectMenu({
  active,
  basePath,
  project,
}: {
  active?: "board" | "code" | "home" | "issue" | "milestone" | "pullRequest" | "review";
  basePath: string;
  project: ProjectContainer;
}) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = projectMenuSetting(project);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            active={active === "home"}
            href={projectHref(basePath, ownerName, projectName)}
            label={t("title.projectHome")}
            short="H"
          />
          {booleanField(menuSetting.code) ? (
            <ProjectMenuItem
              active={active === "code"}
              className="code-menu "
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/code`)}
              label={t("menu.code")}
              short="C"
            />
          ) : null}
          {booleanField(menuSetting.issue) ? (
            <ProjectMenuItem
              active={active === "issue"}
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}
              label={t("menu.issue")}
              short="I"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              active={active === "pullRequest"}
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/pullRequests`)}
              label={t("menu.pullRequest")}
              short="P"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              active={active === "review"}
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/reviews`)}
              label={t("menu.review")}
              short="R"
            />
          ) : null}
          {booleanField(menuSetting.milestone) ? (
            <ProjectMenuItem
              active={active === "milestone"}
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/milestones`)}
              label={t("milestone")}
              short="M"
            />
          ) : null}
          {booleanField(menuSetting.board) ? (
            <ProjectMenuItem
              active={active === "board"}
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
                <LegacyLink href={prefixBasePath(basePath, `/${ownerName}/${projectName}/setting`)}>
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={numberField(project.enrollmentRequestCount)} />
                </LegacyLink>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectMenuItem({
  active = false,
  className = "",
  href,
  label,
  short,
}: {
  active?: boolean;
  className?: string;
  href: string;
  label: string;
  short: string;
}) {
  const itemClassName = className
    ? `${className}${active ? "active" : ""}`
    : active
      ? "active"
      : "";
  return (
    <li className={itemClassName}>
      <LegacyLink href={href}>
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
      </LegacyLink>
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

type LegacyLinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

function LegacyLink({ href, ...props }: LegacyLinkProps) {
  if (!isRoutedHref(href)) {
    const Anchor = "a";
    return <Anchor {...props} href={href} />;
  }

  return <RoutedLegacyLink href={href} {...props} />;
}

function RoutedLegacyLink({ children, href, ...props }: LegacyLinkProps) {
  const { runtimeConfig } = Route.useRouteContext();
  const linkProps = useLinkProps({
    ...props,
    activeOptions: {
      exact: true,
      explicitUndefined: true,
      includeHash: true,
      includeSearch: true,
    },
    activeProps: {},
    to: toRoutePath(runtimeConfig.basePath, href) as never,
  });
  const {
    "aria-current": _ariaCurrent,
    "data-status": _dataStatus,
    ...legacyAnchorProps
  } = linkProps as ComponentProps<"a"> & {
    "aria-current"?: unknown;
    "data-status"?: unknown;
  };

  const Anchor = "a";
  return <Anchor {...legacyAnchorProps}>{children}</Anchor>;
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

function projectHref(basePath: string, ownerName: string, projectName: string) {
  return prefixBasePath(basePath, `/${ownerName}/${projectName}`);
}

function projectId(project: ProjectContainer) {
  return (
    stringField(recordField(project).id, "") || stringField(recordField(project).projectId, "")
  );
}

function projectLogoUrl(project: ProjectContainer) {
  return stringField(project.logoUrl, "") || "/assets/images/project_default_logo.png";
}

function projectFavorited(project: ProjectContainer) {
  return (
    booleanField(recordField(project).isFavorite) || booleanField(recordField(project).isFavorited)
  );
}

function projectCanWatch(project: ProjectContainer) {
  const record = recordField(project);
  return booleanField(record.viewerCanWatch) || booleanField(record.canWatch);
}

function projectCanEnroll(project: ProjectContainer) {
  const record = recordField(project);
  return booleanField(record.viewerCanEnroll) || booleanField(record.canEnroll);
}

function projectEnrollmentRequested(project: ProjectContainer) {
  const record = recordField(project);
  return (
    booleanField(record.enrollmentRequested) ||
    booleanField(record.viewerEnrollmentRequested) ||
    booleanField(record.isEnrolled)
  );
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

function normalizeHistoryHref(basePath: string, href: string) {
  if (href === "#" || href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }
  return href.startsWith(basePath) ? href : prefixBasePath(basePath, href);
}

function issueHref(basePath: string, ownerName: string, projectName: string, query: string) {
  return prefixBasePath(basePath, `/${ownerName}/${projectName}/issues?${query}`);
}

function isRoutedHref(href: string) {
  return href.startsWith("/");
}

function toRoutePath(basePath: string, href: string) {
  if (basePath === "" || basePath === "/") {
    return href;
  }
  if (href === basePath) {
    return "/";
  }
  return href.startsWith(`${basePath}/`) ? href.slice(basePath.length) : href;
}

function percentOf(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function recordField(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function arrayField(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function numberField(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function booleanField(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}
