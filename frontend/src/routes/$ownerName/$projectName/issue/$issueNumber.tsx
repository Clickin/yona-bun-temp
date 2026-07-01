import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { currentSessionQueryOptions } from "../../../../api/session";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import type { ProjectContainer } from "../../../../api/types";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import {
  deleteIssue,
  readIssueDetail,
  readSessionBootstrap,
  type RestIssueDetailResponse,
} from "../../../../auth-workspace-client";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/issue/$issueNumber")({
  component: ProjectIssueDetailRoute,
});

function ProjectIssueDetailRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectIssueDetailScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectIssueDetailScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, issueNumber } = Route.useParams();
  const numericIssueNumber = Number(issueNumber) || 0;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const issueQuery = useQuery({
    queryFn: () => readIssueDetail(runtimeConfig, ownerName, projectName, numericIssueNumber),
    queryKey: ["project-issue-detail", ownerName, projectName, numericIssueNumber],
  });

  if (!projectQuery.data || !issueQuery.data || !sessionQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="issue" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <IssueDetailBody
        basePath={runtimeConfig.basePath}
        issue={issueQuery.data}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function IssueDetailBody({
  basePath,
  issue,
  project,
  runtimeConfig,
}: {
  basePath: string;
  issue: RestIssueDetailResponse;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const issueId = stringField(issue.issueId, issueNumber);
  const issueHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`);
  const issueState = stringField(issue.state, "open").toLowerCase();
  const stateLabel = issueState === "closed" ? "Closed" : "Open";
  const createdLabel = stringField(issue.createdLabel);
  const isDraft = booleanField(issue.isDraft);
  const isWatching = booleanField(issue.isWatching);
  const isFavorited = booleanField(issue.isFavorited);
  const canUpdate = booleanField(issue.viewerCanUpdate);
  const canDelete = booleanField(issue.viewerCanDelete);
  const canComment = booleanField(issue.viewerCanComment);
  const hasVoted = booleanField(issue.hasVoted);
  const labels = (issue.labels ?? []).slice().sort(compareLabels);
  const voters = issue.issueVoters ?? [];
  const parentIssueId = stringField(issue.parentIssueId, issueId);
  const assigneeLoginId = stringField(issue.assigneeLoginId);
  const sharers = issue.sharers ?? [];
  const sharerValue = sharers.map((sharer) => stringField(sharer.loginId)).join(",");
  const bodyMarkdown = stringField(issue.bodyMarkdown);
  const bodyHtml = stringField(issue.bodyHtml);
  const bodyChecksum = stringField(issue.bodyChecksum, "body-sha1");
  const issueUpdateMillis = stringField(issue.issueUpdateMillis, "0");
  const dueDateLabel = stringField(issue.dueDateLabel);
  const dueDateStatusLabel = booleanField(issue.dueDateOverdue)
    ? "Overdue"
    : stringField(issue.dueDateUntilLabel);
  const shouldShowDueDateStatus = dueDateLabel !== "" && issueState === "open";
  const weight = numberField(issue.weight);
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteIssue(runtimeConfig, csrfToken, { issueNumber, ownerName, projectName });
    },
    onSuccess() {
      queryClient.removeQueries({
        queryKey: ["project-issue-detail", ownerName, projectName, Number(issueNumber) || 0],
      });
      queryClient.invalidateQueries({ queryKey: ["project", ownerName, projectName, "issues"] });
      router.history.push(prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`));
    },
  });

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap board-view">
        <div className="board-header issue">
          <div className="pull-right mr10 mt10 hide-in-mobile">
            <div className="date" title={createdLabel}>
              {createdLabel}
            </div>
            <span className={`badge badge-issue-${issueState}`}>{stateLabel}</span>
          </div>
          <div className="title">
            {issue.parentIssueId ? <span className="subtask-mark">subtask</span> : null}
            <strong className="board-id">
              {isDraft ? <span className="draft-number">#Draft</span> : issueNumber}
            </strong>
            {issue.title}
            <span className="favorite-issue" data-issue-id={issueId}>
              <i className={`${isFavorited ? "starred " : ""}star material-icons va-text-top`}>
                star
              </i>
            </span>
            <div className="pull-right hide show-in-mobile" style={{ fontSize: "0.7em" }}>
              <span className="date" title={createdLabel}>
                {createdLabel}
              </span>
              <span className={`badge badge-small badge-issue-${issueState}`}>{stateLabel}</span>
            </div>
          </div>
          {isDraft ? (
            <div className="draft">
              This is an draft issue. Only you can see it until you publish.
            </div>
          ) : null}
        </div>
        <div className="board-body row-fluid">
          <div className="span9 span-left-pane">
            <div className="author-info">
              <a
                href={prefixBasePath(basePath, `/${stringField(issue.authorLoginId)}`)}
                className="usf-group"
              >
                <span className="avatar-wrap smaller">
                  <img src={stringField(issue.authorAvatarUrl)} width="20" height="20" alt="" />
                </span>
                {issue.authorLoginId ? (
                  <>
                    <strong className="name">{stringField(issue.authorLabel)}</strong>
                    <span className="loginid">
                      {" "}
                      <strong>@</strong>
                      {stringField(issue.authorLoginId)}
                    </span>
                  </>
                ) : (
                  <strong className="name">No author</strong>
                )}
              </a>
            </div>
            {bodyMarkdown ? (
              <>
                <div id={`issue-${issueNumber}`} className="hide">
                  <form
                    action={prefixBasePath(
                      basePath,
                      `/api/v1/projects/${ownerName}/${projectName}/issues/${issueNumber}/content`,
                    )}
                  >
                    <textarea defaultValue={bodyMarkdown}></textarea>
                  </form>
                </div>
                <div id={`issue-body-${issueNumber}`}>
                  <TasklistBar />
                  <div
                    className="content markdown-wrap"
                    data-allowed-update={String(canUpdate)}
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                </div>
              </>
            ) : (
              <div className="content empty-content"></div>
            )}
            <div
              className="attachments"
              id="attachments"
              data-attachments={JSON.stringify(issue.attachments ?? [])}
              dangerouslySetInnerHTML={{ __html: attachedFilesHtml(issue.attachments) }}
            ></div>
            <div className="board-actrow right-txt">
              <div className="pull-left">
                <div>
                  <button
                    id="watch-button"
                    type="button"
                    className={`ybtn ${isWatching ? "ybtn-watching" : ""}`}
                    data-toggle="tooltip"
                    data-placement="top"
                    title="Watch this issue"
                    data-watching={String(isWatching)}
                  >
                    {isWatching ? "Unwatch" : "Watch"}
                  </button>
                  {canUpdate ? (
                    <button
                      id="issue-share-button"
                      type="button"
                      className="ybtn"
                      data-toggle="popover"
                      data-trigger="hover"
                      data-placement="top"
                      data-content="Share this issue"
                    >
                      Share issue
                    </button>
                  ) : null}
                  <span className="project-btn-item hide show-in-mobile-inline ml4">
                    <a
                      href={prefixBasePath(
                        basePath,
                        `/${ownerName}/${projectName}/issueform?parentIssueId=${parentIssueId}`,
                      )}
                      className="ybtn ybtn-success"
                    >
                      New subtask
                    </a>
                  </span>
                  <IssueWeight weight={weight} />
                </div>
              </div>
              <IssueVote
                basePath={basePath}
                canComment={canComment}
                hasVoted={hasVoted}
                issue={issue}
                issueHref={issueHref}
                voters={voters}
              />
              <IssueActionButtons
                canDelete={canDelete}
                canUpdate={canUpdate}
                editHref={prefixBasePath(
                  basePath,
                  `/${ownerName}/${projectName}/issue/${issueNumber}/editform`,
                )}
                onDeleteClick={() => setDeleteModalOpen(true)}
              />
            </div>
            <dl className={sharers.length ? "sharer-list" : "sharer-list hideFromDisplayOnly"}>
              <dt className="issue-share-title mb10">
                Issue Sharer{" "}
                <span className="num issue-sharer-count">
                  {sharers.length ? ` ${String(sharers.length)}` : ""}
                </span>
              </dt>
              <dd id="sharer-list" className={sharers.length ? "" : "hideFromDisplayOnly"}>
                {canUpdate ? (
                  <input
                    type="hidden"
                    className="bigdrop width100p"
                    id="issueSharer"
                    name="issueSharer"
                    placeholder="Select sharer"
                    defaultValue={sharerValue}
                    title=""
                  />
                ) : (
                  sharers.map((sharer) => {
                    const loginId = stringField(sharer.loginId);
                    return (
                      <div className="text-ellipsis sharer-item" key={loginId}>
                        <a href={prefixBasePath(basePath, `/${loginId}`)} className="usf-group">
                          <strong className="name">{stringField(sharer.userLabel)}</strong>
                        </a>
                      </div>
                    );
                  })
                )}
              </dd>
            </dl>
            <div className="watcher-list"></div>
            <IssueChildIssues basePath={basePath} issue={issue} />
            {!isDraft ? <IssueMainTimeline basePath={basePath} issue={issue} /> : null}
          </div>
          <div className="span3 span-right-pane mb20">
            <div className="issue-info">
              <form
                id="issueUpdateForm"
                action={prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}
                method="post"
              >
                <input type="hidden" name="issues[0].id" value={issueId} />
                <dl>
                  <dd className="project-btn-item">
                    <a
                      href={prefixBasePath(
                        basePath,
                        `/${ownerName}/${projectName}/issueform?parentIssueId=${parentIssueId}`,
                      )}
                      className="ybtn ybtn-success"
                    >
                      New subtask
                    </a>
                  </dd>
                  <dt>Assignee</dt>
                  <dd>
                    {canUpdate ? (
                      <input
                        type="hidden"
                        className="bigdrop"
                        id="assignee"
                        name="assigneeLoginId"
                        placeholder="No assignee"
                        defaultValue={assigneeLoginId}
                        style={{ width: "100%" }}
                        title=""
                      />
                    ) : assigneeLoginId ? (
                      <a
                        href={prefixBasePath(basePath, `/${assigneeLoginId}`)}
                        className="usf-group"
                      >
                        <span className="avatar-wrap smaller">
                          <img
                            src={stringField(
                              issue.assigneeAvatarUrl,
                              "/assets/images/default-avatar-32.png",
                            )}
                            width="20"
                            height="20"
                            alt=""
                          />
                        </span>
                        <strong className="name">{stringField(issue.assigneeLabel)}</strong>
                        <span className="loginid">
                          {" "}
                          <strong>@</strong>
                          {assigneeLoginId}
                        </span>
                      </a>
                    ) : (
                      <div>No assignee</div>
                    )}
                  </dd>
                </dl>
                <dl>
                  <dt>Milestone</dt>
                  <dd>
                    {issue.milestoneId ? (
                      <a
                        href={prefixBasePath(
                          basePath,
                          `/${ownerName}/${projectName}/milestone/${String(issue.milestoneId)}`,
                        )}
                      >
                        {stringField(issue.milestoneTitle)}
                      </a>
                    ) : (
                      "No milestone"
                    )}
                  </dd>
                </dl>
                <dl>
                  <dt>
                    Due date
                    <span
                      className={
                        booleanField(issue.dueDateOverdue)
                          ? "duedate-status overdue"
                          : "duedate-status "
                      }
                    >
                      {shouldShowDueDateStatus && dueDateStatusLabel
                        ? `(${dueDateStatusLabel})`
                        : ""}
                    </span>
                  </dt>
                  <dd>
                    {canUpdate ? (
                      <div className="search search-bar">
                        <input
                          type="text"
                          name="dueDate"
                          defaultValue={dueDateLabel}
                          className="textbox full"
                          autoComplete="off"
                          data-toggle="calendar"
                        />
                        <button type="button" className="search-btn btn-calendar">
                          <i className="yobicon-calendar2"></i>
                        </button>
                      </div>
                    ) : (
                      dueDateLabel || "No due date"
                    )}
                  </dd>
                </dl>
                {canUpdate ? (
                  <IssueLabelSelect
                    basePath={basePath}
                    labels={labels}
                    ownerName={ownerName}
                    projectName={projectName}
                  />
                ) : (
                  <IssueSelectedLabels
                    basePath={basePath}
                    issueState={issueState}
                    labels={labels}
                    ownerName={ownerName}
                    projectName={projectName}
                  />
                )}
                <div className="act-row right-menu-icons">
                  <IssueActionButtons
                    canDelete={canDelete}
                    canUpdate={canUpdate}
                    editHref={prefixBasePath(
                      basePath,
                      `/${ownerName}/${projectName}/issue/${issueNumber}/editform`,
                    )}
                    onDeleteClick={() => setDeleteModalOpen(true)}
                    wrap={false}
                  />
                </div>
              </form>
              <IssueIndexTimeline basePath={basePath} issue={issue} />
            </div>
          </div>
        </div>
        <div>
          <input type="hidden" id="issueBodyChecksum" value={bodyChecksum} />
          <input type="hidden" id="numOfComments" value={String(issue.commentCount ?? 0)} />
          <input type="hidden" id="issueUpdateDate" value={issueUpdateMillis} />
        </div>
        <div className="board-footer">
          <IssueDetailKeymap project={project} />
        </div>
      </div>
      <DeleteConfirm
        issueHref={issueHref}
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

function IssueVote({
  basePath,
  canComment,
  hasVoted,
  issue,
  issueHref,
  voters,
}: {
  basePath: string;
  canComment: boolean;
  hasVoted: boolean;
  issue: RestIssueDetailResponse;
  issueHref: string;
  voters: VoterLike[];
}) {
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const voteHref = `${issueHref}/${hasVoted ? "unvote" : "vote"}`;

  return (
    <>
      <div id="vote" className={`vote-wrap ${voters.length ? "voter-exists" : ""}`}>
        {canComment ? (
          <a
            href={voteHref}
            className={hasVoted ? "ybtn-watching" : ""}
            title={hasVoted ? "Unvote this issue" : "Vote this issue"}
            data-request-method="post"
            data-toggle="tooltip"
          >
            <span className="heart">
              <i className="yobicon-hearts"></i>
            </span>
          </a>
        ) : (
          <span
            className="ybtn-disabled"
            style={{ color: "#777" }}
            data-toggle="tooltip"
            title="Please log in."
            data-login="required"
          >
            <span className="heart">
              <i className="yobicon-hearts"></i>
            </span>
          </span>
        )}
        {voters.length ? <IssueVoterAvatars basePath={basePath} voters={voters} /> : null}
      </div>
      {voters.length ? (
        <IssueVoterListDialog
          basePath={basePath}
          id="voters"
          ownerName={ownerName}
          projectName={projectName}
          issueNumber={issueNumber}
          voters={voters}
        />
      ) : null}
    </>
  );
}

function IssueVoterAvatars({ basePath, voters }: { basePath: string; voters: VoterLike[] }) {
  const visibleVoters = voters.slice(0, 3);
  const overflowVoters = voters.slice(3);
  const overflowTitle = overflowVoters
    .slice(0, 5)
    .map((voter) => `${stringField(voter.userLabel)} <br>`)
    .join("");

  return (
    <div className="voter-list-wrap">
      <ul className="voter-list">
        {visibleVoters.map((voter) => (
          <li key={stringField(voter.loginId)}>
            <a
              href={prefixBasePath(basePath, `/${stringField(voter.loginId)}`)}
              className="avatar-wrap smaller"
              data-toggle="tooltip"
              data-placement="top"
              title={stringField(voter.userLabel)}
            >
              <img src={stringField(voter.avatarUrl)} alt="" />
            </a>
          </li>
        ))}
        {overflowVoters.length ? (
          <li data-toggle="tooltip" data-html="true" title={overflowTitle}>
            <a href="#voters" data-toggle="modal">
              {`and ${overflowVoters.length} others`}
            </a>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function IssueVoterListDialog({
  basePath,
  id,
  voters,
}: {
  basePath: string;
  id: string;
  issueNumber?: string;
  ownerName?: string;
  projectName?: string;
  voters: VoterLike[];
}) {
  return (
    <div id={id} className="modal hide voters-dialog">
      <div className="modal-header">
        <button type="button" className="close" data-dismiss="modal">
          ×
        </button>
        <h5 className="nm">Issue Voters</h5>
      </div>
      <div className="modal-body">
        <ul className="unstyled">
          {voters.map((voter) => (
            <li key={stringField(voter.loginId)}>
              <a
                href={prefixBasePath(basePath, `/${stringField(voter.loginId)}`)}
                className="usf-group"
                target="_blank"
              >
                <span className="avatar-wrap mlarge">
                  <img src={stringField(voter.avatarUrl)} width="40" height="40" alt="" />
                </span>
                <strong className="name">{stringField(voter.userLabel)}</strong>
                <span className="loginid">
                  {" "}
                  <strong>@</strong>
                  {stringField(voter.loginId)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="modal-footer">
        <button
          id="copyEmailBtn"
          className="ybtn ybtn-info ybtn-small"
          data-clipboard-text={voters
            .map((voter) => `${stringField(voter.userLabel)} <${stringField(voter.emailAddress)}>;`)
            .join("")}
        >
          Copy email
        </button>
        <button className="ybtn ybtn-info ybtn-small" data-dismiss="modal">
          Close
        </button>
      </div>
    </div>
  );
}

function IssueWeight({ weight }: { weight: number }) {
  return (
    <span className="issue-weight">
      <span className="divider">|</span>
      <button
        id="upvote-issue-weight"
        className="ybtn ybtn-small"
        data-toggle="tooltip"
        title="Issue weight: Upvote"
      >
        <i className="yobicon-arrow-up-alt"></i>
      </button>
      <button
        className="ybtn ybtn-small"
        id="down-vote-issue-weight"
        data-toggle="tooltip"
        title="Issue weight: Down vote"
      >
        <i className="yobicon-arrow-down-alt"></i>
      </button>
      <span
        className="weight-number"
        data-toggle="popover"
        data-trigger="hover"
        data-placement="top"
        data-content="Issue weight description"
      >
        {weight}
      </span>
    </span>
  );
}

function IssueLabelSelect({
  basePath,
  labels,
  ownerName,
  projectName,
}: {
  basePath: string;
  labels: RestIssueDetailResponse["labels"];
  ownerName: string;
  projectName: string;
}) {
  const optionsHtml = labelSelectOptionsHtml(labels);

  return (
    <dl>
      <dt>
        Label{" "}
        <a
          href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/labelsform`)}
          target="_blank"
          className="label-edit"
        >
          [Edit]
        </a>
      </dt>
      <dd>
        <select
          id="labelIds"
          name="labelIds"
          multiple
          data-search="labelIds"
          data-toggle="select2"
          data-format="issuelabel"
          data-allow-clear="true"
          data-dropdown-css-class="issue-labels"
          data-container-css-class="issue-labels bordered fullsize"
          data-placeholder="Select label"
          data-close-on-select="false"
          className="hide"
          dangerouslySetInnerHTML={{ __html: optionsHtml }}
        />
      </dd>
    </dl>
  );
}

function IssueSelectedLabels({
  basePath,
  issueState,
  labels,
  ownerName,
  projectName,
}: {
  basePath: string;
  issueState: string;
  labels: RestIssueDetailResponse["labels"];
  ownerName: string;
  projectName: string;
}) {
  if (!labels?.length) {
    return null;
  }

  const listLink = prefixBasePath(
    basePath,
    `/${ownerName}/${projectName}/issues?state=${encodeURIComponent(issueState)}`,
  );

  return (
    <dl>
      <dt>Label</dt>
      <dd>
        {labels.map((label) => (
          <a
            href={`${listLink}&labelIds=${encodeURIComponent(String(label.id))}`}
            className="label issue-label active static"
            data-label-id={String(label.id)}
            key={String(label.id)}
            style={{ background: stringField(label.color) }}
          >
            {label.name}
          </a>
        ))}
      </dd>
    </dl>
  );
}

type IssueDetailChildItem = NonNullable<RestIssueDetailResponse["childIssues"]>[number];

function IssueChildIssues({
  basePath,
  issue,
}: {
  basePath: string;
  issue: RestIssueDetailResponse;
}) {
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const childOpenCount = numberField(issue.childOpenCount);
  const childClosedCount = numberField(issue.childClosedCount);
  const totalCount = childOpenCount + childClosedCount;
  const children = issue.childIssues ?? [];
  const visibleChildren = [
    ...(booleanField(issue.isDraft) ? children.filter((child) => booleanField(child.isDraft)) : []),
    ...children.filter(
      (child) => !booleanField(child.isDraft) && stringField(child.state) !== "closed",
    ),
    ...children.filter((child) => stringField(child.state) === "closed"),
  ];

  if (!totalCount && visibleChildren.length === 0) {
    return <div className="subtasks"></div>;
  }

  const percentage = totalCount ? Math.trunc((childClosedCount / totalCount) * 100) : 0;
  const parentHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`);
  const assigneeLabel = stringField(issue.assigneeLabel);

  return (
    <div className="subtasks">
      <div className="child-issues">
        <div className="issue-item parent-issue">
          <a href={parentHref} className="bold">
            {`#${issueNumber} ${stringField(issue.title)}${assigneeLabel ? ` - ${assigneeLabel}` : ""}`}
          </a>
          <div className={`upload-progress ${percentage === 100 ? "done-outline" : "red-outline"}`}>
            <div
              className={`bar ${percentage === 100 ? "done" : "red"}`}
              style={{ width: `${percentage}%` }}
              title="Subtask"
            ></div>
          </div>
          <span className={percentage === 100 ? " txt-green" : " "}>
            {percentage === 100 ? "" : `${childClosedCount}/`}
            {totalCount}{" "}
          </span>
          <span className={`parent-issue-state ${stringField(issue.state, "open")}`}>
            {stringField(issue.state, "open") === "closed" ? "Closed" : "Open"}
          </span>
        </div>
        <hr className="parent-issue-delimeter" />
        <div className="child-issues">
          {visibleChildren.map((child) => (
            <IssueChildIssue
              basePath={basePath}
              child={child}
              key={`${stringField(child.state)}-${stringField(child.issueNumber)}`}
              ownerName={ownerName}
              projectName={projectName}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function IssueChildIssue({
  basePath,
  child,
  ownerName,
  projectName,
}: {
  basePath: string;
  child: IssueDetailChildItem;
  ownerName: string;
  projectName: string;
}) {
  const issueNumber = stringField(child.issueNumber);
  const state = booleanField(child.isDraft) ? "draft" : stringField(child.state, "open");
  const isClosed = state === "closed";
  const issueHref = prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/${issueNumber}`);
  const labels = (child.labels ?? []).slice().sort(compareLabels);

  return (
    <div className="issue-item  child-issue">
      <span className={`state-label ${state}`}>
        {isClosed ? <i className=" yobicon-checkmark"></i> : null}
      </span>
      <a className="twoColumeModeTarget" href={issueHref}>
        <span className="item-name">
          <span className="subtask-number">
            {booleanField(child.isDraft) ? (
              <span className="draft-number">#Draft</span>
            ) : (
              `#${issueNumber}`
            )}
          </span>
          <span>{stringField(child.title)}</span>
          <span>
            {stringField(child.assigneeLabel) ? ` - ${stringField(child.assigneeLabel)}` : ""}
          </span>
        </span>
      </a>
      <span className="font12 no-border-at-child">
        <IssueChildCommentAndVotePair child={child} issueHref={issueHref} />
      </span>
      {labels.map((label) => (
        <a
          href={`${prefixBasePath(basePath, `/${ownerName}/${projectName}`)}/issues?state=open&labelIds=${String(label.id)}`}
          className="label issue-label list-label active twoColumeModeTarget"
          data-category-id={String(label.categoryId ?? "")}
          data-label-id={String(label.id)}
          key={String(label.id)}
          style={{ background: stringField(label.color) }}
        >
          {label.name}
        </a>
      ))}
      <span className="child-issue-date" title={stringField(child.createdLabel)}>
        {stringField(child.createdLabel)}
      </span>
    </div>
  );
}

function IssueChildCommentAndVotePair({
  child,
  issueHref,
}: {
  child: IssueDetailChildItem;
  issueHref: string;
}) {
  const commentCount = numberField(child.commentCount);
  const voterCount = numberField(child.voterCount);
  if (!commentCount && !voterCount) {
    return null;
  }

  return (
    <span className="item-count-groups">
      {commentCount ? (
        <a href={`${issueHref}#comments`} className="comments-count comments-count-color">
          <span className="count-groups item-icon">
            <i className="yobicon-comment2"></i>
          </span>
          <span className="count-groups item-count">{commentCount}</span>
        </a>
      ) : null}
      {voterCount ? (
        <a href={`${issueHref}#vote`} className="vote-count vote-color">
          <span className="count-groups item-icon">
            <i className="yobicon-hearts"></i>
          </span>
          <span className="count-groups item-count strong">{voterCount}</span>
        </a>
      ) : null}
    </span>
  );
}

function IssueDetailKeymap({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const isMac =
    typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("macintosh");
  const ctrlKey = isMac ? "⌘" : "CTRL";
  const showPullRequest = stringField((project as Record<string, unknown>).vcs, "GIT") === "GIT";
  const showProjectSetting = booleanField((project as Record<string, unknown>).viewerCanUpdate);

  return (
    <div className="pull-left" style={{ padding: "10px 0", marginLeft: "55px" }}>
      <a href="#helpKeys" data-toggle="modal" className="ybtn ybtn-inverse ybtn-mini">
        {t("title.keymap")}
      </a>
      <div id="helpKeys" className="modal hide fade keymap-help" tabIndex={-1} role="dialog">
        <div className="row-fluid">
          <div className="span3">
            <h5>{t("project.projects")}</h5>
            <KeymapEntry keys={["H"]} label={t("menu.home")} />
            <KeymapEntry keys={["B"]} label={t("menu.board")} />
            <KeymapEntry keys={["I"]} label={t("menu.issue")} />
            <KeymapEntry keys={["C"]} label={t("menu.code")} />
            <KeymapEntry keys={["M"]} label={t("milestone")} />
            {showPullRequest ? <KeymapEntry keys={["P"]} label={t("menu.pullRequest")} /> : null}
            {showProjectSetting ? <KeymapEntry keys={["Q"]} label={t("project.setting")} /> : null}
          </div>
          <div className="span9">
            <div className="row-fluid">
              <div className="span5">
                <h5>{t("title.issueDetail")}</h5>
                <KeymapEntry keys={["N"]} label={t("issue.menu.new")} />
                <KeymapEntry keys={["L"]} label={t("button.list")} />
                <KeymapEntry keys={["E"]} label={t("button.edit")} />
              </div>
              <div className="span7">
                <h5>{t("site")}</h5>
                <KeymapEntry keys={["A"]} label={t("issue.myIssue")} />
                <KeymapEntry keys={["U"]} label={t("userinfo.profile")} />
                <KeymapEntry keys={["F"]} label={t("user.menu")} />
                <KeymapEntry
                  keys={isMac ? ["CTRL", "ALT", "S"] : ["ALT", "S"]}
                  label={t("site.search")}
                />
                <KeymapEntry keys={[ctrlKey, "ENTER"]} label={t("button.submitForm")} />
              </div>
            </div>
            <div className="row-fluid mt20">
              <div className="span12">
                <h5>{t("search.menu.issue.comments")}</h5>
                <KeymapEntry
                  keys={["SHIFT", ctrlKey, "ENTER"]}
                  label={t("button.commentAndNextState.closed")}
                />
              </div>
            </div>
          </div>
        </div>
        <p className="actrow">
          <button type="button" className="ybtn ybtn-info" data-dismiss="modal">
            {t("button.confirm")}
          </button>
        </p>
      </div>
    </div>
  );
}

function KeymapEntry({ keys, label }: { keys: string[]; label: string }) {
  return (
    <>
      {keys.map((key) => (
        <Fragment key={key}>
          {key === keys[0] ? "" : " + "}
          <span className="ybtn ybtn-small">{key}</span>
        </Fragment>
      ))}
      <span className="help-inline">{label}</span>
      <br />
    </>
  );
}

function IssueActionButtons({
  canDelete,
  canUpdate,
  editHref,
  onDeleteClick,
  wrap = true,
}: {
  canDelete: boolean;
  canUpdate: boolean;
  editHref: string;
  onDeleteClick: () => void;
  wrap?: boolean;
}) {
  const buttons = (
    <span className="act-row">
      {canUpdate ? (
        <button
          type="button"
          className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
          data-toggle="tooltip"
          title="Edit"
        >
          <i className="yobicon-edit-2"></i>
        </button>
      ) : (
        <a href={editHref}>
          <button
            type="button"
            className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
            data-toggle="tooltip"
            title="See text"
          >
            <i className="yobicon-edit-2"></i>
          </button>
        </a>
      )}
      {canDelete ? (
        <a href="#deleteConfirm" data-toggle="modal">
          <button
            type="button"
            className="icon btn-transparent-with-fontsize-lineheight ml6"
            data-toggle="tooltip"
            title="Delete"
            onClick={onDeleteClick}
          >
            <i className="yobicon-trash"></i>
          </button>
        </a>
      ) : (
        <button
          type="button"
          className="icon disabled btn-transparent-with-fontsize-lineheight ml6"
          data-toggle="popover"
          data-trigger="hover"
          data-placement="top"
          data-content="Can't be deleted because of other users' comments"
        >
          <i className="yobicon-trash"></i>
        </button>
      )}
    </span>
  );
  return wrap ? buttons : <>{buttons.props.children}</>;
}

function EmptyTimeline() {
  return (
    <div id="comments" className="board-comment-wrap">
      <div id="timeline">
        <div className="timeline-list"></div>
      </div>
    </div>
  );
}

type IssueComment = RestIssueDetailResponse["comments"][number];
type IssueTimelineItem = RestIssueDetailResponse["timeline"][number];
type IssueChildComment = IssueComment;
type VoterLike = {
  avatarUrl?: unknown;
  emailAddress?: unknown;
  loginId?: unknown;
  userLabel?: unknown;
};

function IssueMainTimeline({
  basePath,
  issue,
}: {
  basePath: string;
  issue: RestIssueDetailResponse;
}) {
  const comments = issue.comments ?? [];
  const timeline: IssueTimelineItem[] = issue.timeline?.length
    ? issue.timeline
    : comments.map((comment) => ({ comment, id: stringField(comment.id) }));
  const hasTimelineRows = comments.length || timelineHasVisibleEvent(timeline);

  return (
    <div id="comments" className="board-comment-wrap">
      <div id="timeline">
        <div className="timeline-list">
          <div className="comment-header">
            <i></i>
            <strong>Comment</strong> <strong className="num">{comments.length}</strong>
          </div>
          <hr className="nm" />
          {hasTimelineRows ? (
            <ul className="comments">
              {timeline.map((item, index) =>
                item.comment ? (
                  <IssueCommentRow
                    basePath={basePath}
                    comment={item.comment}
                    issue={issue}
                    key={`comment-${stringField(item.comment.id)}`}
                  />
                ) : (
                  <IssueEventRow
                    basePath={basePath}
                    event={item}
                    issue={issue}
                    key={`event-${stringField(item.id)}`}
                    previousEvent={
                      index > 0 && !timeline[index - 1]?.comment ? timeline[index - 1] : undefined
                    }
                  />
                ),
              )}
            </ul>
          ) : null}
        </div>
      </div>
      <IssueCommentForm basePath={basePath} issue={issue} />
    </div>
  );
}

function IssueCommentForm({
  basePath,
  issue,
}: {
  basePath: string;
  issue: RestIssueDetailResponse;
}) {
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);

  if (!booleanField(issue.viewerCanComment)) {
    return (
      <div
        className="write-comment-box mt20"
        title="You need to log in to add comments."
        data-login="required"
      >
        <div className="write-comment-wrap">
          <div className="textarea-box">
            <textarea className="comment disabled" disabled style={{ cursor: "text" }}></textarea>
          </div>
          <div className="right-txt mt10">
            <span className="ybtn ybtn-disabled">Add a comment</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      id="comment-form"
      action={prefixBasePath(
        basePath,
        `/${ownerName}/${projectName}/issue/${issueNumber}/comments`,
      )}
      method="post"
      encType="multipart/form-data"
    >
      <div className="write-comment-box">
        <MarkdownEditor editorMode="comment-body" name="contents" value="" wrapId="contents" />
        <UploadForm resourceType="ISSUE_COMMENT" />
        <div className="write-comment-wrap">
          <div className="right-txt">
            <button type="button" className="ybtn hidden" id="dynamic-comment-btn"></button>
            <button type="submit" className="ybtn ybtn-success">
              Add a comment
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function UploadForm({ resourceType }: { resourceType: string }) {
  return (
    <div className="upload-wrap content-footer" data-resource-type={resourceType} id="upload">
      <div className="attach-wrap">
        <span className="help help-droppable">Drag &amp; Drop files to attach here or</span>
        <div className="btn-wrap">
          <div className="nbtn medium white fake-file-wrap">
            <i className="yobicon-upload"></i> File upload
            <input type="file" className="file" name="filePath" multiple />
          </div>
        </div>
        <span className="plain">Click upload button</span>
        <span className="help help-pastable">Paste the clipboard image</span>
      </div>
      <ul className="attached-files unstyled"></ul>
      <p className="right-txt help">
        <i className="yobicon-supportrequest"></i> Selected file will be attached when your comment
        is saved.
      </p>
    </div>
  );
}

function IssueEventRow({
  basePath,
  event,
  issue,
  previousEvent,
}: {
  basePath: string;
  event: IssueTimelineItem;
  issue: RestIssueDetailResponse;
  previousEvent?: IssueTimelineItem;
}) {
  const eventType = stringField(event.eventType);
  if (eventType === "ISSUE_BODY_CHANGED") {
    return null;
  }

  const eventId = stringField(event.id);
  const newValue = stringField(event.newValue).toLowerCase();
  const senderLoginId = stringField(event.senderLoginId);
  const senderLabel = stringField(event.senderLabel, senderLoginId);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const sender = (
    <EventUserLink
      avatarUrl={stringField(event.senderAvatarUrl, "/assets/images/default-avatar-32.png")}
      basePath={basePath}
      label={senderLabel}
      loginId={senderLoginId}
    />
  );

  if (eventType === "ISSUE_STATE_CHANGED") {
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className={`state ${newValue}`}>{issueStateLabel(newValue)}</span>
        {sender}
        {issueStateEventText(newValue)}
        <span className="date">
          <a href={`#event-${eventId}`}>{stringField(event.createdLabel)}</a>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_ASSIGNEE_CHANGED") {
    const targetLoginId = stringField(event.targetLoginId, stringField(event.newValue));
    const targetLabel = stringField(event.targetLabel, targetLoginId);
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className="state changed">Assigned</span>
        {sender}
        {targetLoginId === senderLoginId ? " self-assigned this issue" : " assigned this issue to "}
        {targetLoginId === senderLoginId ? null : (
          <EventUserLink
            avatarUrl={stringField(event.targetAvatarUrl, "/assets/images/default-avatar-32.png")}
            basePath={basePath}
            label={targetLabel}
            loginId={targetLoginId}
          />
        )}
        <span className="date">
          <a href={`#event-${eventId}`}>{stringField(event.createdLabel)}</a>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_MILESTONE_CHANGED") {
    const milestoneId = stringField(event.milestoneId, stringField(event.newValue));
    const milestoneTitle = stringField(event.milestoneTitle, stringField(event.newValue));
    const milestone =
      milestoneId === "0" || milestoneId === "-1" ? (
        <span className="bold">None</span>
      ) : (
        <span className="bold font-blue">
          <a
            href={prefixBasePath(basePath, `/${ownerName}/${projectName}/milestone/${milestoneId}`)}
            data-toggle="tooltip"
            data-placement="bottom"
            title="Milestone"
          >
            {milestoneTitle}
          </a>
        </span>
      );
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className="state milestone-changed">Update milestone</span>
        {sender} changed milestone to {milestone}
        <span className="date">
          <a href={`#event-${eventId}`}>{stringField(event.createdLabel)}</a>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_MOVED") {
    const [fromOwner, fromProject] = stringField(event.oldValue).split("/");
    const fromProjectName = [fromOwner, fromProject].filter(Boolean).join("/");
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className="state changed">moved</span>
        {sender} moved this issue from{" "}
        <strong>
          <a href={prefixBasePath(basePath, `/${fromProjectName}`)} className="link">
            {fromProjectName}
          </a>
        </strong>
        <span className="date">
          <a href={`#event-${eventId}`}>{stringField(event.createdLabel)}</a>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_REFERRED_FROM_COMMIT") {
    const commitId = stringField(event.newValue);
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className="state changed">mentioned</span>
        {sender} mentioned this issue in{" "}
        <strong>
          Commit{" "}
          <a
            href={prefixBasePath(basePath, `/${ownerName}/${projectName}/commit/${commitId}`)}
            className="link"
          >
            @{commitId}
          </a>
        </strong>
        <span className="date">
          <a href={`#event-${eventId}`}>{stringField(event.createdLabel)}</a>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_REFERRED_FROM_PULL_REQUEST") {
    const pullRequestNumber = stringField(event.pullRequestNumber, stringField(event.newValue));
    const pullRequestTitle = stringField(event.pullRequestTitle, pullRequestNumber);
    return (
      <li className="event" id={`event-${eventId}`}>
        <span className="state changed">mentioned</span>
        {sender} mentioned this issue in{" "}
        <strong>
          Pull request -{pullRequestNumber}{" "}
          <a
            href={prefixBasePath(
              basePath,
              `/${ownerName}/${projectName}/pullRequest/${pullRequestNumber}`,
            )}
            className="link"
          >
            {pullRequestTitle}
          </a>
        </strong>
        <span className="date">
          <a href={`#event-${eventId}`}>{stringField(event.createdLabel)}</a>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_SHARER_CHANGED") {
    const added = stringField(event.newValue) !== "";
    const grouped = isSameEventTypeAndSameAction(event, previousEvent);
    const targetLoginId = stringField(
      event.targetLoginId,
      added ? stringField(event.newValue) : stringField(event.oldValue),
    );
    const target = (
      <EventUserLink
        avatarUrl={stringField(event.targetAvatarUrl, "/assets/images/default-avatar-32.png")}
        basePath={basePath}
        label={stringField(event.targetLabel, targetLoginId)}
        loginId={targetLoginId}
      />
    );
    return (
      <li className="event" id={`event-${eventId}`}>
        {grouped ? (
          <span className="state"></span>
        ) : (
          <span className={`state ${added ? "sharer-added" : "sharer-deleted"}`}>
            {added ? "Issue Sharer" : "Cancelled"}
          </span>
        )}
        {sender}
        {added ? " shared current issue to " : " cancelled issue sharing with "}
        {target}
        <span className="date">
          <a href={`#event-${eventId}`}>{stringField(event.createdLabel)}</a>
        </span>
      </li>
    );
  }

  if (eventType === "ISSUE_LABEL_CHANGED") {
    const added = stringField(event.newValue) !== "";
    const grouped = isSameEventTypeAndSameAction(event, previousEvent);
    const label = issueEventLabelBox(
      added ? stringField(event.newValue) : stringField(event.oldValue),
      issue.labels,
    );
    return (
      <li className="event" id={`event-${eventId}`}>
        {grouped ? (
          <span className="state"></span>
        ) : (
          <span className={`state ${added ? "label-added" : "label-deleted"}`}>
            {added ? "Added" : "Removed"}
          </span>
        )}
        {sender}
        {added ? " added " : " removed "}
        {label} label
        <span className="date">
          <a href={`#event-${eventId}`}>{stringField(event.createdLabel)}</a>
        </span>
      </li>
    );
  }

  return (
    <li className="event" id={`event-${eventId}`}>
      {stringField(event.newValue)} by {sender}
      <span className="date">
        <a href={`#event-${eventId}`}>{stringField(event.createdLabel)}</a>
      </span>
    </li>
  );
}

function EventUserLink({
  avatarUrl,
  basePath,
  label,
  loginId,
}: {
  avatarUrl: string;
  basePath: string;
  label: string;
  loginId: string;
}) {
  const href = prefixBasePath(basePath, `/${loginId}`);
  return (
    <>
      <a href={href} className="usf-group" data-toggle="tooltip" data-placement="top" title={label}>
        <img src={avatarUrl} className="avatar-wrap small" alt="" />
      </a>
      <a
        href={href}
        className="usf-group"
        data-toggle="tooltip"
        data-placement="top"
        title={loginId}
      >
        <strong>{label}</strong>
      </a>
    </>
  );
}

function IssueCommentRow({
  basePath,
  comment,
  issue,
}: {
  basePath: string;
  comment: IssueComment;
  issue: RestIssueDetailResponse;
}) {
  const commentId = stringField(comment.id);
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel);
  const authorHref = prefixBasePath(basePath, `/${authorLoginId}`);
  const issueNumber = stringField(issue.issueNumber);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const canUpdate = booleanField(comment.viewerCanUpdate);
  const canDelete = booleanField(comment.viewerCanDelete);
  const hasVoted = booleanField(comment.viewerHasVoted);
  const contentsHtml = stringField(comment.contentsHtml);
  const contentsMarkdown = stringField(comment.contentsMarkdown);
  const voters = comment.voters ?? [];
  const childComments = Array.isArray(comment.childComments)
    ? (comment.childComments as IssueChildComment[])
    : [];

  return (
    <li className="comment " id={`comment-${commentId}`}>
      <ChildCommentAnchors childComments={childComments} />
      <div className="comment-avatar">
        <a
          href={authorHref}
          className="avatar-wrap"
          data-toggle="tooltip"
          data-placement="top"
          title={authorLoginId}
        >
          <img
            src={stringField(comment.authorAvatarUrl)}
            width="32"
            height="32"
            alt={authorLabel}
          />
        </a>
      </div>
      <div className="media-body">
        <div className="meta-info">
          <span className="comment_author">
            <span className="resp-comment-avatar">
              <a
                href={authorHref}
                className="avatar-wrap"
                data-toggle="tooltip"
                data-placement="top"
                title={authorLabel}
              >
                <img
                  src={stringField(comment.authorAvatarUrl)}
                  width="32"
                  height="32"
                  alt={authorLoginId}
                />
              </a>
            </span>
            <a href={authorHref} data-toggle="tooltip" data-placement="top" title={authorLoginId}>
              <strong>{authorLabel}</strong>
            </a>
          </span>
          <span className="ago-date">
            <a
              href={`#comment-${commentId}`}
              className="ago"
              title={stringField(comment.createdLabel)}
            >
              {stringField(comment.createdLabel)}
            </a>
            <a href={`#comment-${commentId}`} className="share-link" style={{ display: "none" }}>
              [Link]
            </a>
          </span>
          <span className="act-row pull-right">
            <span className="new-issue-by">
              <a href={prefixBasePath(basePath, `/user/issues/new?commentId=${commentId}`)}>
                New issue by this comment
              </a>
            </span>
            <CommentVoters basePath={basePath} commentId={commentId} voters={voters} />
            <button
              type="button"
              className="btn-transparent-with-fontsize-lineheight"
              title={hasVoted ? "Withdraw" : "Agree"}
              data-request-type="comment-vote"
              data-request-uri={prefixBasePath(
                basePath,
                `/${ownerName}/${projectName}/issue/${issueNumber}/comment/${commentId}/${hasVoted ? "unvote" : "vote"}`,
              )}
            >
              <i className={`yobicon-hearts ${hasVoted ? "vote-heart-on" : "vote-heart-off"}`}></i>
            </button>
            {canUpdate ? (
              <button
                type="button"
                className="btn-transparent-with-fontsize-lineheight ml10"
                data-toggle="comment-edit"
                data-comment-id={commentId}
                title="Edit comment"
              >
                <i className="yobicon-edit-2"></i>
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="btn-transparent-with-fontsize-lineheight ml6"
                data-toggle="comment-delete"
                data-request-uri={prefixBasePath(
                  basePath,
                  `/${ownerName}/${projectName}/issue/${issueNumber}/comment/${commentId}`,
                )}
                title="Delete comment"
              >
                <i className="yobicon-trash"></i>
              </button>
            ) : null}
          </span>
        </div>
        <CommentUpdateForm
          basePath={basePath}
          canUpdate={canUpdate}
          comment={comment}
          contentsMarkdown={contentsMarkdown}
          issue={issue}
        />
        <div id={`comment-body-${commentId}`}>
          <TasklistBar />
          <div
            className="comment-body markdown-wrap"
            data-allowed-update={String(canUpdate)}
            data-via-email={String(booleanField(comment.viaEmail))}
            dangerouslySetInnerHTML={{ __html: contentsHtml }}
          />
          <div
            className="attachments pull-left"
            data-attachments={JSON.stringify(comment.attachments ?? [])}
            dangerouslySetInnerHTML={{ __html: attachedFilesHtml(comment.attachments) }}
          ></div>
        </div>
      </div>
      <ChildComments
        basePath={basePath}
        childComments={childComments}
        issue={issue}
        parentCommentId={commentId}
      />
    </li>
  );
}

function ChildCommentAnchors({ childComments }: { childComments: IssueChildComment[] }) {
  return (
    <>
      {childComments.map((comment) => (
        <div id={`comment-${stringField(comment.id)}`} key={stringField(comment.id)}></div>
      ))}
    </>
  );
}

function ChildComments({
  basePath,
  childComments,
  issue,
  parentCommentId,
}: {
  basePath: string;
  childComments: IssueChildComment[];
  issue: RestIssueDetailResponse;
  parentCommentId: string;
}) {
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const newCommentAction = prefixBasePath(
    basePath,
    `/${ownerName}/${projectName}/issue/${issueNumber}/comments`,
  );

  return (
    <>
      <div className="add-a-comment pull-right">Reply</div>
      <div className="subcomment-media-body">
        <div className="child-comments">
          {childComments.map((comment) => (
            <ChildComment
              basePath={basePath}
              comment={comment}
              issue={issue}
              key={stringField(comment.id)}
            />
          ))}
        </div>
        {booleanField(issue.viewerCanComment) ? (
          <div className="child-comment-input-form">
            <form action={newCommentAction} method="post" encType="multipart/form-data">
              <input
                className="parentCommentId"
                type="hidden"
                name="parentCommentId"
                value={parentCommentId}
              />
              <div className="oneline-comment-box">
                <textarea
                  className="editorSeries"
                  name="contents"
                  rows={1}
                  placeholder="Reply (CTRL + ENTER)"
                  {...{ markdown: "true" }}
                ></textarea>
                <button type="submit" className="ybtn ybtn-success">
                  OK
                </button>
              </div>
              <div className="notification-receiver">
                <span className="notification-receiver-title">Notification receivers </span>
                <span className="notification-receiver-list"></span>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </>
  );
}

function ChildComment({
  basePath,
  comment,
  issue,
}: {
  basePath: string;
  comment: IssueChildComment;
  issue: RestIssueDetailResponse;
}) {
  const commentId = stringField(comment.id);
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel, authorLoginId);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const deleteLink = booleanField(comment.viewerCanDelete)
    ? `<a href="javascript:void(0)" type="button" class="btn-transparent deleteButtonX" data-toggle="comment-delete" data-request-uri="${escapeHtml(
        prefixBasePath(
          basePath,
          `/${ownerName}/${projectName}/issue/${issueNumber}/comment/${commentId}`,
        ),
      )}" title="Delete comment">x</a>`
    : "";
  const contents = `${stringField(comment.contentsHtml)}<span class="subcomment-author hide">- <a href="${escapeHtml(
    prefixBasePath(basePath, `/${authorLoginId}`),
  )}" class="usf-group" data-toggle="tooltip" data-placement="top" title="${escapeHtml(
    authorLoginId,
  )}"><strong>${escapeHtml(authorLabel)}</strong></a> <a href="#comment-${escapeHtml(
    commentId,
  )}" class="ago" title="${escapeHtml(stringField(comment.createdLabel))}">${escapeHtml(
    stringField(comment.createdLabel),
  )}</a>${deleteLink}</span>`;

  return (
    <div className="one-line-comment">
      <div className="contents" dangerouslySetInnerHTML={{ __html: contents }} />
    </div>
  );
}

function CommentUpdateForm({
  basePath,
  canUpdate,
  comment,
  contentsMarkdown,
  issue,
}: {
  basePath: string;
  canUpdate: boolean;
  comment: IssueComment;
  contentsMarkdown: string;
  issue: RestIssueDetailResponse;
}) {
  const commentId = stringField(comment.id);
  const ownerName = stringField(issue.ownerName);
  const projectName = stringField(issue.projectName);
  const issueNumber = stringField(issue.issueNumber);
  const showNotification = booleanField(comment.viewerIsAuthor);

  return (
    <div id={`comment-editform-${commentId}`} className="comment-update-form">
      <form
        action={prefixBasePath(
          basePath,
          `/${ownerName}/${projectName}/issue/${issueNumber}/comments/${commentId}`,
        )}
        method="post"
        encType="multipart/form-data"
      >
        <input type="hidden" name="id" value={commentId} />
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <MarkdownEditor
              editorMode="update-comment-body"
              name="contents"
              value={contentsMarkdown}
              wrapId={commentId}
            />
            <div className="upload-drop-here">
              <div className="msg-wrap">
                <div className="msg">Drag &amp; Drop files here to upload.</div>
              </div>
            </div>
            <div className="right-txt comment-update-button upload-button-line">
              <span className="file-upload">
                <label htmlFor={`upload-${commentId}`} className="file-upload__label ybtn">
                  File upload
                </label>
                <input
                  id={`upload-${commentId}`}
                  className="file-upload__input"
                  type="file"
                  name="filePath"
                  multiple
                />
              </span>
              {showNotification ? (
                <span
                  className="send-notification-check"
                  data-toggle="popover"
                  data-trigger="hover"
                  data-placement="top"
                  data-content="If you are not the original author, this option will be ignored. Notification mail will be sent."
                >
                  <label className="checkbox inline">
                    <input type="checkbox" name="notificationMail" value="yes" defaultChecked />
                    <strong>Send notification mail</strong>
                  </label>
                </span>
              ) : null}
              <button type="button" className="ybtn ybtn-cancel" data-comment-id={commentId}>
                Cancel
              </button>
              {canUpdate ? (
                <button type="submit" className="ybtn ybtn-info">
                  Save
                </button>
              ) : null}
            </div>
          </div>
          <input
            type="hidden"
            name="temporaryUploadFiles"
            className="temporaryUploadFiles"
            value=""
          />
          <div className={`preview-${commentId}`}></div>
          <div className="attachment-files"></div>
          <div
            id={`upload-${commentId}`}
            data-resourcetype="ISSUE_COMMENT"
            data-resourceid={commentId}
          ></div>
        </div>
      </form>
    </div>
  );
}

function MarkdownEditor({
  editorMode,
  name,
  value,
  wrapId,
}: {
  editorMode: string;
  name: string;
  value: string;
  wrapId: string;
}) {
  return (
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className="active">
          <a href={`#edit-${wrapId}`} data-toggle="tab" data-mode="edit">
            Edit
          </a>
        </li>
        <li>
          <a href={`#preview-${wrapId}`} data-toggle="tab" data-mode="preview">
            Preview
          </a>
        </li>
        <li>
          <div className="task-list-button">
            <button
              type="button"
              className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
            >
              <i className="yobicon-list task-list-icon"></i> Add checklist
            </button>
          </div>
        </li>
        <li>
          <div className="editor-clear-temporary">
            <div className="editor-clear-temporary-button">
              <button
                type="button"
                id="button-clear-temporary"
                className="ybtn ybtn-small ybtn-warning"
              >
                Clear Temporary
              </button>
            </div>
          </div>
        </li>
        <li>
          <div className="editor-notice-label"></div>
        </li>
      </ul>
      <div className="tab-content" style={{ position: "relative", overflow: "visible" }}>
        <div id={`edit-${wrapId}`} className="tab-pane active">
          <div className="textarea-box">
            <textarea
              name={name}
              className="editorSeries content comment nm"
              data-editor-mode={editorMode}
              id={`editor-${name}-${wrapId}`}
              defaultValue={value}
              {...{ markdown: "true" }}
            ></textarea>
          </div>
        </div>
        <div id={`preview-${wrapId}`} className="tab-pane">
          <div
            className={`markdown-preview markdown-wrap ${editorMode}`}
            data-via-email="false"
          ></div>
        </div>
        <div className="notification-receiver">
          <span className="notification-receiver-title">Notification receivers </span>
          <span className="notification-receiver-list"></span>
        </div>
      </div>
    </div>
  );
}

function TasklistBar() {
  return (
    <div className="tasklist">
      <div className="task-title">
        Tasks<span className="done-counter"></span>
      </div>
      <div className="task-progress">
        <div className="bar red" style={{ width: 0 }} title="Tasklist"></div>
      </div>
    </div>
  );
}

function CommentVoters({
  basePath,
  commentId,
  voters,
}: {
  basePath: string;
  commentId: string;
  voters: VoterLike[];
}) {
  if (!voters.length) {
    return null;
  }

  if (voters.length > 5) {
    return (
      <>
        <span
          style={{ marginRight: "2px" }}
          data-toggle="tooltip"
          data-html="true"
          title={`${voters
            .slice(0, 5)
            .map((voter) => stringField(voter.userLabel))
            .join("\n")}\n…`}
        >
          <a className="vote-description-people" href={`#voters-${commentId}`} data-toggle="modal">
            {voters.length} Agreements
          </a>
        </span>
        <IssueVoterListDialog basePath={basePath} id={`voters-${commentId}`} voters={voters} />
      </>
    );
  }

  return (
    <>
      {voters.map((voter) => (
        <a
          href={prefixBasePath(basePath, `/${stringField(voter.loginId)}`)}
          className="avatar-wrap smaller"
          data-toggle="tooltip"
          data-placement="top"
          title={stringField(voter.userLabel)}
          key={stringField(voter.loginId)}
        >
          <img src={stringField(voter.avatarUrl)} alt="" />
        </a>
      ))}
    </>
  );
}

function IssueIndexTimeline({
  basePath,
  issue,
}: {
  basePath: string;
  issue: RestIssueDetailResponse;
}) {
  const comments = issue.comments ?? [];
  if (!comments.length) {
    return <EmptyTimeline />;
  }

  return (
    <div id="comments" className="board-comment-wrap">
      <div id="timeline">
        <div className="timeline-list">
          <div className="comment-header">
            <strong>Comment</strong> <strong className="num">{comments.length}</strong>
          </div>
          <ul className="comments">
            {comments.map((comment) => (
              <IssueIndexComment
                basePath={basePath}
                comment={comment}
                key={stringField(comment.id)}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function IssueIndexComment({ basePath, comment }: { basePath: string; comment: IssueComment }) {
  const commentId = stringField(comment.id);
  const authorLoginId = stringField(comment.authorLoginId);
  const authorLabel = stringField(comment.authorLabel);

  return (
    <li
      className="comment index-comment  "
      id={`comment-${commentId}`}
      data-location={`#comment-${commentId}`}
    >
      <div>
        <div id={`comment-body-${commentId}`}>
          <div className="comment-body">
            <a href={`#comment-${commentId}`}>{ellipsisText(stringField(comment.contentsHtml))}</a>
          </div>
        </div>
        <div className="index-comment-author">
          <span className="comment_author">
            <a
              href={prefixBasePath(basePath, `/${authorLoginId}`)}
              data-toggle="tooltip"
              data-placement="top"
              title={authorLoginId}
            >
              <strong>{authorLabel}</strong>
            </a>
          </span>
          <span className="ago-date">
            <a
              href={`#comment-${commentId}`}
              className="ago"
              title={stringField(comment.createdLabel)}
            >
              {stringField(comment.createdLabel)}
            </a>
            <a href={`#comment-${commentId}`} className="share-link" style={{ display: "none" }}>
              [Link]
            </a>
          </span>
        </div>
      </div>
    </li>
  );
}

function DeleteConfirm({
  issueHref,
  onCancel,
  onConfirm,
  open,
}: {
  issueHref: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
  return (
    <div id="deleteConfirm" className={`modal ${open ? "" : "hide "}fade`}>
      <div className="modal-header">
        <button type="button" className="close" data-dismiss="modal" onClick={onCancel}>
          ×
        </button>
        <h3>Delete issue</h3>
      </div>
      <div className="modal-body">
        <p>Are you sure you want to delete this post?</p>
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="ybtn ybtn-danger"
          data-request-method="delete"
          data-request-uri={issueHref}
          onClick={onConfirm}
        >
          Yes
        </button>
        <button type="button" className="ybtn" data-dismiss="modal" onClick={onCancel}>
          No
        </button>
      </div>
    </div>
  );
}

function compareLabels(
  left: { categoryName?: unknown; name: string },
  right: { categoryName?: unknown; name: string },
) {
  const categoryOrder = stringField(left.categoryName).localeCompare(
    stringField(right.categoryName),
  );
  return categoryOrder || left.name.localeCompare(right.name);
}

function labelSelectOptionsHtml(labels: RestIssueDetailResponse["labels"]) {
  const categoryGroups = new Map<
    string,
    {
      categoryId: string;
      categoryIsExclusive: string;
      categoryName: string;
      labels: RestIssueDetailResponse["labels"];
    }
  >();
  for (const label of labels) {
    const categoryName = stringField(label.categoryName);
    if (!categoryGroups.has(categoryName)) {
      categoryGroups.set(categoryName, {
        categoryId: stringField(label.categoryId),
        categoryIsExclusive: String(booleanField(label.categoryIsExclusive)),
        categoryName,
        labels: [],
      });
    }
    categoryGroups.get(categoryName)?.labels.push(label);
  }
  return [
    "<option></option>",
    ...Array.from(categoryGroups.values()).map(
      (group) =>
        `<optgroup label="${escapeHtml(group.categoryName)}" data-category-id="${escapeHtml(group.categoryId)}" data-category-is-exclusive="${escapeHtml(group.categoryIsExclusive)}">${group.labels
          .map(
            (label) =>
              `<option value="${escapeHtml(String(label.id))}" data-category-id="${escapeHtml(stringField(label.categoryId))}" data-category-is-exclusive="${escapeHtml(String(booleanField(label.categoryIsExclusive)))}" selected>${escapeHtml(label.name)}</option>`,
          )
          .join("")}</optgroup>`,
    ),
  ].join("");
}

function attachedFilesHtml(
  attachments?:
    | RestIssueDetailResponse["attachments"]
    | { attachments?: RestIssueDetailResponse["attachments"] },
): string {
  const files = Array.isArray(attachments) ? attachments : (attachments?.attachments ?? []);

  return files
    .map((file) => {
      const name = stringField(file.name);
      const href = stringField(file.url);
      const mimeType = stringField(file.mimeType);
      const size = stringField(file.size);
      const sizeReadable = stringField(file.sizeLabel, size);

      return `<li class="attached-file" data-name="${escapeHtml(name)}" data-href="${escapeHtml(href)}" data-mime="${escapeHtml(mimeType)}" data-size="${escapeHtml(size)}"><strong>${escapeHtml(name)}(${escapeHtml(sizeReadable)})</strong><a class="attached-delete"><i class="ico btn-delete"></i></a></li>`;
    })
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function ellipsisText(html: string) {
  const text = html
    .replace(/<[^>]*>/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

function timelineHasVisibleEvent(timeline: IssueTimelineItem[]) {
  return timeline.some(
    (item) => !item.comment && stringField(item.eventType) !== "ISSUE_BODY_CHANGED",
  );
}

function issueStateLabel(state: string) {
  return state === "closed" ? "Closed" : "Open";
}

function issueStateEventText(state: string) {
  return state === "closed" ? " closed this issue" : " reopened this issue";
}

function issueEventLabelBox(value: string, labels: RestIssueDetailResponse["labels"]) {
  const parts = value.split(" - ");
  if (parts.length !== 2) {
    return value;
  }
  const categoryName = parts[0].trim();
  const labelName = parts[1].split(" #")[0]?.trim() ?? "";
  const label = labels?.find(
    (item) =>
      stringField(item.categoryName) === categoryName && stringField(item.name) === labelName,
  );
  if (!label) {
    return labelName;
  }
  return (
    <div className="label issue-label" style={{ backgroundColor: stringField(label.color) }}>
      {labelName}
    </div>
  );
}

function isSameEventTypeAndSameAction(event: IssueTimelineItem, previousEvent?: IssueTimelineItem) {
  return (
    previousEvent !== undefined &&
    stringField(event.eventType) === stringField(previousEvent.eventType) &&
    ((isAddingEvent(event) && isAddingEvent(previousEvent)) ||
      (isDeletingEvent(event) && isDeletingEvent(previousEvent)))
  );
}

function isAddingEvent(event: IssueTimelineItem) {
  return stringField(event.oldValue) === "" && stringField(event.newValue) !== "";
}

function isDeletingEvent(event: IssueTimelineItem) {
  return stringField(event.newValue) === "" && stringField(event.oldValue) !== "";
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
      ? String(value)
      : fallback;
}

function numberField(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function booleanField(value: unknown) {
  return value === true;
}
