import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { currentSessionQueryOptions } from "../../../../api/session";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { LegacyI18nProvider } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { readIssueDetail, type RestIssueDetailResponse } from "../../../../auth-workspace-client";
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
      <IssueDetailBody basePath={runtimeConfig.basePath} issue={issueQuery.data} />
    </>
  );
}

function IssueDetailBody({
  basePath,
  issue,
}: {
  basePath: string;
  issue: RestIssueDetailResponse;
}) {
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
  const weight = numberField(issue.weight);

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
              {canUpdate ? <IssueActionButtons canDelete={canDelete} /> : null}
            </div>
            <dl className={`sharer-list ${sharers.length ? "" : "hideFromDisplayOnly"}`}>
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
                ) : null}
              </dd>
            </dl>
            <div className="watcher-list"></div>
            <div className="subtasks"></div>
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
                    Due date<span className="duedate-status "></span>
                  </dt>
                  <dd>
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
                  </dd>
                </dl>
                <IssueLabelSelect
                  basePath={basePath}
                  labels={labels}
                  ownerName={ownerName}
                  projectName={projectName}
                />
                <div className="act-row right-menu-icons">
                  {canUpdate ? <IssueActionButtons canDelete={canDelete} wrap={false} /> : null}
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
        <div className="board-footer"></div>
      </div>
      <DeleteConfirm issueHref={issueHref} />
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
  voters: NonNullable<RestIssueDetailResponse["issueVoters"]>;
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
            title="Login required"
            data-login="required"
          >
            <span className="heart">
              <i className="yobicon-hearts"></i>
            </span>
          </span>
        )}
        {voters.length ? (
          <IssueVoterAvatars basePath={basePath} voters={voters.slice(0, 3)} />
        ) : null}
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

function IssueVoterAvatars({
  basePath,
  voters,
}: {
  basePath: string;
  voters: NonNullable<RestIssueDetailResponse["issueVoters"]>;
}) {
  return (
    <div className="voter-list-wrap">
      <ul className="voter-list">
        {voters.map((voter) => (
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
  issueNumber: string;
  ownerName: string;
  projectName: string;
  voters: NonNullable<RestIssueDetailResponse["issueVoters"]>;
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

function IssueActionButtons({ canDelete, wrap = true }: { canDelete: boolean; wrap?: boolean }) {
  const buttons = (
    <span className="act-row">
      <button
        type="button"
        className="icon btn-transparent-with-fontsize-lineheight ml10 pt5px"
        data-toggle="tooltip"
        title="Edit"
      >
        <i className="yobicon-edit-2"></i>
      </button>
      {canDelete ? (
        <a href="#deleteConfirm" data-toggle="modal">
          <button
            type="button"
            className="icon btn-transparent-with-fontsize-lineheight ml6"
            data-toggle="tooltip"
            title="Delete"
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
          data-content="Issue cannot be deleted"
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

function IssueMainTimeline({
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
            <i></i>
            <strong>Comment</strong> <strong className="num">{comments.length}</strong>
          </div>
          <hr className="nm" />
          <ul className="comments">
            {comments.map((comment) => (
              <IssueCommentRow
                basePath={basePath}
                comment={comment}
                issue={issue}
                key={stringField(comment.id)}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
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
  const contentsHtml = stringField(comment.contentsHtml);

  return (
    <li className="comment " id={`comment-${commentId}`}>
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
            <button
              type="button"
              className="btn-transparent-with-fontsize-lineheight"
              title="Vote"
              data-request-type="comment-vote"
              data-request-uri={prefixBasePath(
                basePath,
                `/${ownerName}/${projectName}/issue/${issueNumber}/comment/${commentId}/vote`,
              )}
            >
              <i className="yobicon-hearts vote-heart-off"></i>
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
        <div id={`comment-body-${commentId}`}>
          <div
            className="comment-body markdown-wrap"
            data-allowed-update={String(canUpdate)}
            data-via-email={String(booleanField(comment.viaEmail))}
            dangerouslySetInnerHTML={{ __html: contentsHtml }}
          />
          <div
            className="attachments pull-left"
            data-attachments={JSON.stringify(comment.attachments ?? [])}
          ></div>
        </div>
      </div>
    </li>
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

function DeleteConfirm({ issueHref }: { issueHref: string }) {
  return (
    <div id="deleteConfirm" className="modal hide fade">
      <div className="modal-header">
        <button type="button" className="close" data-dismiss="modal">
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
        >
          Yes
        </button>
        <button type="button" className="ybtn" data-dismiss="modal">
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
