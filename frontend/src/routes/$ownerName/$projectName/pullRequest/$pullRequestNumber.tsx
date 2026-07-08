import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Fragment, useState, type MouseEvent, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  closePullRequestRest,
  openPullRequestRest,
  pullRequestDetailQueryOptions,
  unwatchPullRequestRest,
  watchPullRequestRest,
  type PullRequestCommit,
  type PullRequestDetailResponse,
  type PullRequestEvent,
  type PullRequestState,
} from "../../../../api/pull-requests";
import { currentSessionQueryOptions } from "../../../../api/session";
import type { ProjectContainer } from "../../../../api/types";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { readSessionBootstrap } from "../../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/pullRequest/$pullRequestNumber")({
  component: ProjectPullRequestOverviewRoute,
});

const LEGACY_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

type HelpModalState = "initial" | "open" | "closed";

function insulateModalButtonClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function ProjectPullRequestOverviewRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectPullRequestOverviewScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPullRequestOverviewScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, pullRequestNumber } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isChildRoute = !pathname.endsWith(
    `/${ownerName}/${projectName}/pullRequest/${pullRequestNumber}`,
  );
  const prNumber = Number(pullRequestNumber) || 0;
  const projectQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  });
  const pullRequestQuery = useQuery({
    ...pullRequestDetailQueryOptions(runtimeConfig, {
      ownerName,
      projectName,
      pullRequestNumber: prNumber,
    }),
    enabled: !isChildRoute,
  });
  const sessionQuery = useQuery({
    ...currentSessionQueryOptions(runtimeConfig),
    enabled: !isChildRoute,
  });

  if (!projectQuery.data) {
    return null;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
    ownerName,
    projectName,
  };

  if (isChildRoute) {
    return (
      <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
        <Outlet />
      </SiteLayoutShell>
    );
  }

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <PullRequestOverviewTitle ownerName={ownerName} projectName={projectName} />
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu
        active="pullRequest"
        basePath={runtimeConfig.basePath}
        project={projectQuery.data}
      />
      {pullRequestQuery.data && sessionQuery.data ? (
        <PullRequestOverviewBody
          currentUserLoginId={String(sessionQuery.data.loginId ?? "")}
          project={projectQuery.data}
          pullRequest={pullRequestQuery.data}
          runtimeConfig={runtimeConfig}
        />
      ) : null}
    </SiteLayoutShell>
  );
}

function PullRequestOverviewTitle({
  ownerName,
  projectName,
}: {
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return <title>{`${t("menu.pullRequest")} - ${ownerName}/${projectName}`}</title>;
}

function PullRequestOverviewBody({
  currentUserLoginId,
  project,
  pullRequest,
  runtimeConfig,
}: {
  currentUserLoginId: string;
  project: ProjectContainer;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const prPath = `/${ownerName}/${projectName}/pullRequest/${pullRequest.pullRequestNumber}`;
  const pullRequestInput = {
    ownerName,
    projectName,
    pullRequestNumber: pullRequest.pullRequestNumber,
  };
  const [isWatching, setIsWatching] = useState(pullRequest.isWatching);
  const [helpMessageState, setHelpMessageState] = useState<HelpModalState>("initial");
  const watchMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return isWatching
        ? unwatchPullRequestRest(runtimeConfig, csrfToken, pullRequestInput)
        : watchPullRequestRest(runtimeConfig, csrfToken, pullRequestInput);
    },
    onSuccess(response) {
      setIsWatching(response.isWatching);
      queryClient.setQueryData(
        pullRequestDetailQueryOptions(runtimeConfig, pullRequestInput).queryKey,
        response,
      );
    },
  });
  const stateMutation = useMutation({
    mutationFn: async (nextState: "closed" | "open") => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return nextState === "closed"
        ? closePullRequestRest(runtimeConfig, csrfToken, pullRequestInput)
        : openPullRequestRest(runtimeConfig, csrfToken, pullRequestInput);
    },
    onSuccess(response) {
      queryClient.setQueryData(
        pullRequestDetailQueryOptions(runtimeConfig, pullRequestInput).queryKey,
        response,
      );
    },
  });

  return (
    <>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <PullRequestHeader
            project={project}
            pullRequest={pullRequest}
            runtimeConfig={runtimeConfig}
          />
          <div className="board-body">
            <div className="author-info left-txt" style={{ marginTop: "20px" }}>
              <Link
                to="/$user"
                params={{ user: pullRequest.contributor.loginId }}
                className="usf-group pull-left"
                {...LEGACY_LINK_PROPS}
              >
                <span className="avatar-wrap smaller">
                  <img src={pullRequest.contributor.avatarUrl} width="32" height="32" alt="" />
                </span>
                <strong className="name">{pullRequest.contributor.userLabel}</strong>
                <span className="loginid">
                  {" "}
                  <strong>@</strong>
                  {pullRequest.contributor.loginId}
                </span>
              </Link>
              <PullRequestBranchInfo pullRequest={pullRequest} />
            </div>
            <div className="content markdown-wrap">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{pullRequest.bodyMarkdown}</ReactMarkdown>
            </div>
            <div
              className="attachments"
              data-attachments={JSON.stringify(pullRequest.attachments ?? [])}
            ></div>
          </div>

          <div id="state" className="pullRequest-stateInfo">
            <PullRequestStateInfo
              currentUserLoginId={currentUserLoginId}
              pullRequest={pullRequest}
              runtimeConfig={runtimeConfig}
            />
          </div>

          <div className="board-footer board-actrow">
            <div className="pull-left">
              {pullRequest.permissions.canWatch ? (
                <button
                  id="watch-button"
                  type="button"
                  className={isWatching ? "ybtn ybtn-watching" : "ybtn"}
                  data-toggle="button"
                  data-watching={isWatching ? "true" : "false"}
                  onClick={() => watchMutation.mutate()}
                >
                  {isWatching ? t("project.unwatch") : t("project.watch")}
                </button>
              ) : null}
            </div>

            <div className="mr5" style={{ display: "inline-block" }}>
              {pullRequest.permissions.canUpdate ? (
                <Link
                  to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform"
                  params={{
                    ownerName,
                    projectName,
                    pullRequestNumber: String(pullRequest.pullRequestNumber),
                  }}
                  className="ybtn"
                  {...LEGACY_LINK_PROPS}
                >
                  {t("button.edit")}
                </Link>
              ) : null}
              {/* Legacy data-request-method controls below are POST actions, not navigation. */}
              {isOpenState(pullRequest.state) && pullRequest.permissions.canUpdateState ? (
                <button
                  type="button"
                  data-request-method="post"
                  data-request-uri={prefixBasePath(runtimeConfig.basePath, `${prPath}/close`)}
                  className="ybtn"
                  onClick={() => stateMutation.mutate("closed")}
                >
                  {t("pullRequest.close")}
                </button>
              ) : null}
              {pullRequest.state.toLowerCase() === "closed" &&
              pullRequest.permissions.canUpdateState ? (
                <button
                  type="button"
                  data-request-method="post"
                  data-request-uri={prefixBasePath(runtimeConfig.basePath, `${prPath}/open`)}
                  className="ybtn"
                  onClick={() => stateMutation.mutate("open")}
                >
                  {t("pullRequest.reopen")}
                </button>
              ) : null}
            </div>
          </div>

          <hr className="nm" />

          <div className="board-comment-wrap">
            <PullRequestEvents pullRequest={pullRequest} />
          </div>

          <div className="right-txt">
            <button
              type="button"
              className="ybtn ybtn-inverse ybtn-mini"
              data-toggle="modal"
              data-target="#helpMessage"
              onClick={(event) => {
                insulateModalButtonClick(event);
                setHelpMessageState("open");
              }}
            >
              {t("title.help")}
            </button>
          </div>
        </div>
      </div>
      <PullRequestHelpModal
        state={helpMessageState}
        onClose={() => setHelpMessageState("closed")}
      />
    </>
  );
}

function PullRequestEvents({ pullRequest }: { pullRequest: PullRequestDetailResponse }) {
  const renderedEvents = pullRequest.events.flatMap((event) =>
    isRenderableEvent(event)
      ? [<PullRequestEventItem event={event} key={event.id} pullRequest={pullRequest} />]
      : [],
  );

  return renderedEvents.length > 0 ? (
    <ul className="comments" id="comments">
      {renderedEvents}
    </ul>
  ) : null;
}

function PullRequestEventItem({
  event,
  pullRequest,
}: {
  event: PullRequestEvent;
  pullRequest: PullRequestDetailResponse;
}) {
  const { t } = useLegacyMessages();

  if (event.eventType === "PULL_REQUEST_REVIEW_STATE_CHANGED") {
    const isReviewDone = event.newValue === "DONE";
    return (
      <li className="event" id={`comment-${event.id}`}>
        <span className="state changed">
          {t(isReviewDone ? "pullRequest.review" : "pullRequest.unreview")}
        </span>
        {messageWithNodes(
          t(
            isReviewDone
              ? "notification.pullrequest.reviewed"
              : "notification.pullrequest.unreviewed",
            { args: ["__USER__"] },
          ),
          { __USER__: <PullRequestEventUser event={event} /> },
        )}
        <PullRequestEventDate event={event} />
      </li>
    );
  }

  if (
    event.eventType === "PULL_REQUEST_STATE_CHANGED" ||
    event.eventType === "PULL_REQUEST_MERGED"
  ) {
    return (
      <li className="event" id={`comment-${event.id}`}>
        <span className={`state ${event.newValue}`}>
          {t(`pullRequest.event.${event.newValue}`)}
        </span>
        <PullRequestStateEventMessage event={event} pullRequest={pullRequest} />
        <PullRequestEventDate event={event} />
      </li>
    );
  }

  if (event.eventType !== "PULL_REQUEST_COMMIT_CHANGED") {
    return null;
  }

  return (
    <li className="event" id={`comment-${event.id}`}>
      <span className="state changed">{t("pullRequest.event.commit")}</span>
      {messageWithNodes(t("pullRequest.event.message.commit", { args: ["__USER__"] }), {
        __USER__: <PullRequestEventUser event={event} />,
      })}
      <PullRequestEventDate event={event} />
      {event.oldValue ? (
        <Link
          to="/$ownerName/$projectName/compare/$revisionRange"
          params={{
            ownerName: pullRequest.ownerName,
            projectName: pullRequest.projectName,
            revisionRange: compareRevisionRange(event.oldValue),
          }}
          className="ybtn ybtn-mini"
          {...LEGACY_LINK_PROPS}
        >
          {t("pullRequest.additional.changes")}
        </Link>
      ) : null}
      <ul className="commit-list">
        {event.commits.map((commit) => (
          <PullRequestEventCommit
            commit={commit}
            event={event}
            key={commit.commitId}
            pullRequest={pullRequest}
          />
        ))}
      </ul>
    </li>
  );
}

function PullRequestStateEventMessage({
  event,
  pullRequest,
}: {
  event: PullRequestEvent;
  pullRequest: PullRequestDetailResponse;
}) {
  const { t } = useLegacyMessages();
  const user = <PullRequestEventUser event={event} />;
  if (event.eventType === "PULL_REQUEST_MERGED") {
    return (
      <>
        {messageWithNodes(t("pullRequest.event.message.merged", { args: ["__USER__"] }), {
          __USER__: user,
        })}
      </>
    );
  }
  if (event.newValue === "merged") {
    const commitId = pullRequest.mergedCommitIdTo;
    const commit = commitId ? (
      <Link
        className="link"
        to="/$ownerName/$projectName/commit/$commitId"
        params={{
          commitId,
          ownerName: pullRequest.ownerName,
          projectName: pullRequest.projectName,
        }}
        title={t("code.showCommit")}
        {...LEGACY_LINK_PROPS}
      >
        {commitId.slice(0, 7)}
      </Link>
    ) : (
      ""
    );
    return (
      <>
        {messageWithNodes(
          t("pullRequest.event.message.merged", { args: ["__USER__", "__COMMIT__"] }),
          {
            __COMMIT__: commit,
            __USER__: user,
          },
        )}
      </>
    );
  }

  return (
    <>
      {messageWithNodes(t(`pullRequest.event.message.${event.newValue}`, { args: ["__USER__"] }), {
        __USER__: user,
      })}
    </>
  );
}

function PullRequestEventUser({ event }: { event: PullRequestEvent }) {
  const label = event.senderLabel || event.senderLoginId;
  const avatarUrl = event.senderAvatarUrl || "/assets/images/default-avatar-32.png";

  return (
    <>
      <Link
        to="/$user"
        params={{ user: event.senderLoginId }}
        className="usf-group"
        data-toggle="tooltip"
        data-placement="top"
        title={event.senderLoginId}
        {...LEGACY_LINK_PROPS}
      >
        <img src={avatarUrl} className="avatar-wrap small" alt="" />
      </Link>
      <Link
        to="/$user"
        params={{ user: event.senderLoginId }}
        className="usf-group"
        data-toggle="tooltip"
        data-placement="top"
        title={event.senderLoginId}
        {...LEGACY_LINK_PROPS}
      >
        <strong>{label}</strong>
      </Link>
    </>
  );
}

function PullRequestEventDate({ event }: { event: PullRequestEvent }) {
  return (
    <span className="date">
      <Link to="." hash={`event-${event.id}`} {...LEGACY_LINK_PROPS} title={event.createdLabel}>
        {event.createdLabel}
      </Link>
    </span>
  );
}

function PullRequestEventCommit({
  commit,
  event,
  pullRequest,
}: {
  commit: PullRequestCommit;
  event: PullRequestEvent;
  pullRequest: PullRequestDetailResponse;
}) {
  const commitChangeParams = {
    commitId: commit.commitId,
    ownerName: pullRequest.ownerName,
    projectName: pullRequest.projectName,
    pullRequestNumber: String(pullRequest.pullRequestNumber),
  };
  const commitAuthorLoginId = inferredCommitAuthorLoginId(commit, event);

  return (
    <li
      className={
        commit.state === "PRIOR" ? "comment-body commit-info outdated" : "comment-body commit-info"
      }
    >
      <Link
        to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes/$commitId"
        params={commitChangeParams}
        className="commit-id"
        {...LEGACY_LINK_PROPS}
      >
        {commit.commitShortId}
      </Link>
      {commitAuthorLoginId ? (
        <Link
          to="/$user"
          params={{ user: commitAuthorLoginId }}
          className="avatar-wrap small hide-in-mobile"
          title={event.senderLabel || commitAuthorLoginId}
          {...LEGACY_LINK_PROPS}
        >
          <img src={event.senderAvatarUrl || "/assets/images/default-avatar-32.png"} alt="" />{" "}
          {commit.authorEmail}
        </Link>
      ) : (
        <img
          src="/assets/images/default-avatar-32.png"
          className="avatar-wrap small hide-in-mobile"
          alt=""
        />
      )}
      <div className="date hide-in-mobile" title={commit.authorDateLabel}>
        {commit.authorDateLabel}
      </div>
      <CommitMessage commit={commit} params={commitChangeParams} />
    </li>
  );
}

function CommitMessage({
  commit,
  params,
}: {
  commit: PullRequestCommit;
  params: {
    commitId: string;
    ownerName: string;
    projectName: string;
    pullRequestNumber: string;
  };
}) {
  const { t } = useLegacyMessages();
  const lines = commit.commitMessage.split("\n");
  const summary = lines[0] || t("code.commitMsg.empty");
  const detail = lines.slice(1).join("\n");

  return (
    <>
      <Link
        to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes/$commitId"
        params={params}
        className="commitMsg short"
        {...LEGACY_LINK_PROPS}
      >
        {summary}
      </Link>
      {detail ? (
        <>
          <button type="button" className="commitMsg moreBtn">
            <span>&hellip;</span>
          </button>
          <pre className="commitMsg desc hidden">{detail}</pre>
        </>
      ) : null}
    </>
  );
}

export function PullRequestHeader({
  activeTab = "overview",
  project,
  pullRequest,
  runtimeConfig,
}: {
  activeTab?: "changes" | "overview";
  project: ProjectContainer;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const stateKey = pullRequest.conflict ? "conflict" : pullRequest.state.toLowerCase();
  const prPath = `/${pullRequest.ownerName}/${pullRequest.projectName}/pullRequest/${pullRequest.pullRequestNumber}`;
  const isOpen = isOpenState(pullRequest.state);
  const isAcceptable =
    isOpen &&
    !pullRequest.isMerging &&
    !pullRequest.conflict &&
    pullRequest.lackingReviewerCount <= 0;
  const showReviewerControls =
    project.isUsingReviewerCount === true && pullRequest.permissions.canReview;
  const openThreadCount = pullRequest.threads.filter(
    (thread) => thread.state.toLowerCase() === "open",
  ).length;
  return (
    <>
      <div className="board-header issue">
        <div className="pull-right mr10 mt10">
          <div className="date" title={pullRequest.createdLabel}>
            {pullRequest.createdLabel}
          </div>
          <span className={`badge nm badge-issue-${stateKey}`}>
            {t(`pullRequest.state.${stateKey}`)}
          </span>
        </div>
        <div className="title">
          <strong className="board-id">#{pullRequest.pullRequestNumber}</strong> {pullRequest.title}
        </div>
      </div>

      <div className="pull-right">
        {showReviewerControls ? (
          <>
            <div id="reviewers" style={{ display: "inline-block", marginRight: "5px" }}>
              <span style={{ fontSize: "13px", verticalAlign: "middle", margin: "0 10px" }}>
                {messageWithStrong(
                  t("pullRequest.review.participants", { args: ["__COUNT__"] }),
                  "__COUNT__",
                  pullRequest.reviewers.length,
                )}
              </span>
              {pullRequest.reviewers.map((reviewer) => (
                <Link
                  key={reviewer.loginId}
                  to="/$user"
                  params={{ user: reviewer.loginId }}
                  className="usf-group"
                  data-toggle="tooltip"
                  data-placement="top"
                  title={reviewer.userLabel}
                  {...LEGACY_LINK_PROPS}
                >
                  <img src={reviewer.avatarUrl} className="avatar-wrap small" alt="" />
                </Link>
              ))}
            </div>
            {/* Review/unreview controls are legacy POST actions, not navigation. */}
            {isOpen ? (
              pullRequest.reviewed ? (
                <button
                  type="button"
                  data-request-method="post"
                  className="ybtn ybtn-default"
                  data-request-uri={prefixBasePath(runtimeConfig.basePath, `${prPath}/unreview`)}
                >
                  {t("pullRequest.unreview")}
                </button>
              ) : (
                <button
                  type="button"
                  data-request-method="post"
                  className={`ybtn ${pullRequest.reviewers.length > 0 ? "ybtn-default" : "ybtn-success"}`}
                  data-request-uri={prefixBasePath(runtimeConfig.basePath, `${prPath}/review`)}
                >
                  {t("pullRequest.review")}
                </button>
              )
            ) : null}
          </>
        ) : null}
        {pullRequest.permissions.canReview ? (
          isAcceptable ? (
            <button
              id="btnAccept"
              type="button"
              data-request-method="post"
              data-request-uri={prefixBasePath(runtimeConfig.basePath, `${prPath}/accept`)}
              className="ybtn ybtn-success"
            >
              {t("pullRequest.merge")}
            </button>
          ) : (
            <button
              type="button"
              className="ybtn ybtn-disabled"
              data-toggle="tooltip"
              data-placement="top"
              title={disabledAcceptButtonTitle(pullRequest, t)}
            >
              {t("pullRequest.merge")}
            </button>
          )
        ) : null}
      </div>

      <ul className="nav nav-tabs nm">
        <li className={activeTab === "overview" ? "active" : undefined}>
          <Link
            to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"
            params={{
              ownerName: pullRequest.ownerName,
              projectName: pullRequest.projectName,
              pullRequestNumber: String(pullRequest.pullRequestNumber),
            }}
            search={{ __legacyActiveSuppression: undefined }}
            {...LEGACY_LINK_PROPS}
          >
            {t("pullRequest.menu.overview")}
          </Link>
        </li>
        <li className={activeTab === "changes" ? "active" : undefined}>
          <Link
            to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"
            params={{
              ownerName: pullRequest.ownerName,
              projectName: pullRequest.projectName,
              pullRequestNumber: String(pullRequest.pullRequestNumber),
            }}
            {...LEGACY_LINK_PROPS}
          >
            {t("pullRequest.menu.changes")}
            {openThreadCount > 0 ? <span className="num-badge">{openThreadCount}</span> : null}
          </Link>
        </li>
      </ul>
    </>
  );
}

export function PullRequestBranchInfo({
  pullRequest,
}: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig?: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const fromBranchName = branchItemName(pullRequest.fromBranch);
  const toBranchName = branchItemName(pullRequest.toBranch);
  return (
    <div className="pullRequest-branchInfo">
      <i className="yobicon-branch ml0"></i>
      <code className="from" data-toggle="tooltip" data-original-title={t("pullRequest.from")}>
        <Link to="/$user" params={{ user: pullRequest.fromOwnerName }} {...LEGACY_LINK_PROPS}>
          {pullRequest.fromOwnerName}
        </Link>
        <span>/</span>
        <Link
          to="/$ownerName/$projectName"
          params={{
            ownerName: pullRequest.fromOwnerName,
            projectName: pullRequest.fromProjectName,
          }}
          {...LEGACY_LINK_PROPS}
        >
          {pullRequest.fromProjectName}
        </Link>
        :{" "}
        <Link
          to="/$ownerName/$projectName/code/$branch"
          params={{
            branch: fromBranchName,
            ownerName: pullRequest.fromOwnerName,
            projectName: pullRequest.fromProjectName,
          }}
          className="branchName"
          {...LEGACY_LINK_PROPS}
        >
          {fromBranchName}
        </Link>
      </code>
      <i className="yobicon-right-2 ml10"></i>
      <code className="to" data-toggle="tooltip" data-original-title={t("pullRequest.to")}>
        <Link to="/$user" params={{ user: pullRequest.ownerName }} {...LEGACY_LINK_PROPS}>
          {pullRequest.ownerName}
        </Link>
        <span>/</span>
        <Link
          to="/$ownerName/$projectName"
          params={{ ownerName: pullRequest.ownerName, projectName: pullRequest.projectName }}
          {...LEGACY_LINK_PROPS}
        >
          {pullRequest.projectName}
        </Link>
        :{" "}
        <Link
          to="/$ownerName/$projectName/code/$branch"
          params={{
            branch: toBranchName,
            ownerName: pullRequest.ownerName,
            projectName: pullRequest.projectName,
          }}
          className="branchName"
          {...LEGACY_LINK_PROPS}
        >
          {toBranchName}
        </Link>
      </code>
    </div>
  );
}

export function PullRequestStateInfo({
  currentUserLoginId,
  pullRequest,
  runtimeConfig,
}: {
  currentUserLoginId: string;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const prPath = `/${pullRequest.ownerName}/${pullRequest.projectName}/pullRequest/${pullRequest.pullRequestNumber}`;

  if (pullRequest.state.toLowerCase() === "merged") {
    return (
      <div className="alert alert-info">
        <Link
          to="/$user"
          params={{ user: pullRequest.receiver.loginId }}
          className="usf-group"
          {...LEGACY_LINK_PROPS}
        >
          <span className="avatar-wrap smaller">
            <img src={pullRequest.receiver.avatarUrl} width="25" height="25" alt="" />
          </span>
          <strong className="name">{pullRequest.receiver.userLabel}</strong>
          <span className="loginid">
            {" "}
            <strong>@</strong>
            {pullRequest.receiver.loginId}
          </span>
        </Link>{" "}
        {t("pullRequest.merged.the.pullrequest")}
        {pullRequest.permissions.canDeleteSourceBranch ? (
          <>
            <code>{pullRequest.fromBranch}</code> {t("pullRequest.delete.frombranch.message")}
            <button
              type="button"
              className="ybtn ybtn-danger ybtn-mini pull-right"
              data-request-method="delete"
              data-request-uri={prefixBasePath(
                runtimeConfig.basePath,
                `${prPath}/deletefrombranch`,
              )}
            >
              {t("pullRequest.delete.branch")}
            </button>
          </>
        ) : null}
        {pullRequest.permissions.canRestoreSourceBranch ? (
          <>
            <code>{pullRequest.fromBranch}</code> {t("pullRequest.restore.frombranch.message")}
            {/* Restore branch is a legacy POST action, not navigation. */}
            <button
              type="button"
              className="ybtn ybtn-info ybtn-mini pull-right"
              data-request-method="post"
              data-request-uri={prefixBasePath(
                runtimeConfig.basePath,
                `${prPath}/restorefrombranch`,
              )}
            >
              {t("pullRequest.restore.branch")}
            </button>
          </>
        ) : null}
      </div>
    );
  }

  if (!isOpenState(pullRequest.state)) {
    return null;
  }
  if (pullRequest.isMerging) {
    return (
      <div className="alert alert-warnning">
        <i className="yobicon-supportrequest mr5"></i>
        <span>{t("pullRequest.is.merging")}</span>
      </div>
    );
  }
  if (!pullRequest.conflict) {
    return (
      <div className="alert alert-success">
        <i className="yobicon-check-circle-alt mr5"></i>
        <span>{t("pullRequest.is.safe")}</span>
      </div>
    );
  }
  return (
    <div className="alert alert-error">
      <i className="yobicon-error mr5"></i>
      <span>{t("pullRequest.is.not.safe")}</span>
      {currentUserLoginId === pullRequest.contributor.loginId ? (
        <PullRequestConflictGuide pullRequest={pullRequest} runtimeConfig={runtimeConfig} />
      ) : null}
    </div>
  );
}

function PullRequestConflictGuide({
  pullRequest,
  runtimeConfig,
}: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const fromBranchName = branchItemName(pullRequest.fromBranch);
  const toBranchName = branchItemName(pullRequest.toBranch);
  const upstreamUrl = projectCodeUrlWithLogin(
    runtimeConfig.basePath,
    browserRuntimeOrigin(),
    pullRequest.ownerName,
    pullRequest.projectName,
    pullRequest.contributor.loginId,
  );

  return (
    <div className="howto-resolve-conflict">
      <h6>{t("pullRequest.resolve.conflict")}</h6>
      <div className="help">
        <ol>
          <li>
            {t("pullRequest.resolver.step1")} <code>{`git checkout ${fromBranchName}`}</code>
          </li>
          <li>
            {t("pullRequest.resolver.step2")}{" "}
            <code>{`git remote add upstream ${upstreamUrl}`}</code>
          </li>
          <li>
            {t("pullRequest.resolver.step3")} <code>git fetch upstream</code>
          </li>
          <li>
            {t("pullRequest.resolver.step4")} <code>{`git rebase upstream/${toBranchName}`}</code>
          </li>
          <li>{t("pullRequest.resolver.step5")}</li>
          <li>
            {t("pullRequest.resolver.step6")} <code>git add resolved_file</code>
          </li>
          <li>
            {t("pullRequest.resolver.step7")} <code>git rebase --continue</code>
          </li>
          <li>{t("pullRequest.resolver.step8")}</li>
          <li>
            {t("pullRequest.resolver.step9")} <code>{`git push -f origin ${fromBranchName}`}</code>
          </li>
          <li>
            {t("pullRequest.resolver.step10")}
            <Link
              to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"
              params={{
                ownerName: pullRequest.ownerName,
                projectName: pullRequest.projectName,
                pullRequestNumber: String(pullRequest.pullRequestNumber),
              }}
              className="ybtn ybtn-mini ybtn-primary"
              {...LEGACY_LINK_PROPS}
            >
              {t("button.page.refresh")}
            </Link>
            {t("pullRequest.resolver.step11")}
          </li>
        </ol>
      </div>
    </div>
  );
}

function PullRequestHelpModal({ onClose, state }: { onClose: () => void; state: HelpModalState }) {
  const { t } = useLegacyMessages();
  const isOpen = state === "open";
  const modalStyle = state === "initial" ? undefined : { display: isOpen ? "block" : "none" };
  const ariaHidden = state === "initial" ? undefined : isOpen ? "false" : "true";
  return (
    <>
      <div
        id="helpMessage"
        className={isOpen ? "modal hide fade pullreq-info in" : "modal hide fade pullreq-info"}
        style={modalStyle}
        aria-hidden={ariaHidden}
      >
        <div className="modal-header">
          <h5>{t("pullRequest.merge.help.1")}</h5>
        </div>
        <div className="modal-body">
          <div className="row-fluid">
            <div className="pull-left">
              <img className="img-polaroid" src="/assets/images/fork-pull/merge.jpg" alt="" />
              <br />
            </div>
            <div className="pull-left help-messages mt10">
              <p>{t("pullRequest.merge.help.2")}</p>
              <p>{t("pullRequest.merge.help.3")}</p>
              <p>{t("pullRequest.merge.help.4")}</p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="ybtn ybtn-info ybtn-small"
            data-dismiss="modal"
            onClick={(event) => {
              insulateModalButtonClick(event);
              onClose();
            }}
          >
            {t("button.confirm")}
          </button>
        </div>
      </div>
      {isOpen ? (
        <div
          className="modal-backdrop fade in"
          role="presentation"
          onClick={onClose}
          onKeyUp={onClose}
        ></div>
      ) : null}
    </>
  );
}

function isOpenState(state: PullRequestState) {
  return state.toLowerCase() === "open";
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return booleanField(project.isProtected) ? ownerName : undefined;
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanField(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function disabledAcceptButtonTitle(
  pullRequest: PullRequestDetailResponse,
  t: ReturnType<typeof useLegacyMessages>["t"],
) {
  if (pullRequest.conflict) {
    return t("pullRequest.not.acceptable.because.is.conflict");
  }
  if (!isOpenState(pullRequest.state)) {
    return t("pullRequest.not.acceptable.because.is.not.open");
  }
  if (pullRequest.lackingReviewerCount > 0) {
    return t("pullRequest.not.acceptable.because.is.not.enough.review.point", {
      args: [String(pullRequest.lackingReviewerCount)],
    });
  }
  return t("pullRequest.not.acceptable.because.is.merging");
}

function projectCodeUrlWithLogin(
  basePath: string,
  origin: string,
  ownerName: string,
  projectName: string,
  loginId: string,
) {
  const path = prefixBasePath(basePath, `/${ownerName}/${projectName}`);
  if (!origin) {
    return path;
  }
  const url = new URL(path, origin);
  url.username = loginId;
  return url.toString();
}

function browserRuntimeOrigin() {
  return typeof globalThis.origin === "string" ? globalThis.origin : "";
}

function branchItemName(branch: string) {
  const refsPrefix = "refs/";
  if (!branch.startsWith(refsPrefix)) {
    return branch;
  }
  const branchTypeEnd = branch.indexOf("/", refsPrefix.length);
  return branchTypeEnd === -1 ? branch : branch.slice(branchTypeEnd + 1);
}

function isRenderableEvent(event: PullRequestEvent) {
  return (
    event.eventType === "PULL_REQUEST_COMMIT_CHANGED" ||
    event.eventType === "PULL_REQUEST_REVIEW_STATE_CHANGED" ||
    event.eventType === "PULL_REQUEST_STATE_CHANGED" ||
    event.eventType === "PULL_REQUEST_MERGED"
  );
}

function messageWithNodes(message: string, nodes: Record<string, ReactNode>) {
  const tokens = Object.keys(nodes);
  if (tokens.length === 0) {
    return message;
  }
  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gu");
  let offset = 0;
  return message.split(pattern).map((part) => {
    const key = `${part}-${offset}`;
    offset += part.length;
    const node = nodes[part];
    return node === undefined ? part : <Fragment key={key}>{node}</Fragment>;
  });
}

function messageWithStrong(message: string, token: string, value: number) {
  const strongToken = `<strong>${token}</strong>`;
  const [before, after] = message.split(strongToken);
  if (after === undefined) {
    return messageWithNodes(message, { [token]: <strong>{value}</strong> });
  }
  return (
    <>
      {before}
      <strong>{value}</strong>
      {after}
    </>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compareRevisionRange(value: string) {
  const [revA, revB] = value.split(",");
  if (!revA || !revB) {
    return encodeURIComponent(value);
  }
  return `${encodeURIComponent(revA)}...${encodeURIComponent(revB)}`;
}

function inferredCommitAuthorLoginId(commit: PullRequestCommit, event: PullRequestEvent) {
  const [emailLocalPart] = commit.authorEmail.split("@");
  if (!emailLocalPart || emailLocalPart !== event.senderLoginId) {
    return "";
  }
  return event.senderLoginId;
}
