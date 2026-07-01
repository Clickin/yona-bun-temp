import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  codeCommitDetailQueryOptions,
  type CodeCommitDetailResponse,
  type CodeReviewComment,
  type CodeReviewThread,
} from "../../../../api/code-commits";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import type { ProjectContainer } from "../../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

const legacyMarkdownTextareaAttr = { markdown: "true" };

type ParsedDiffLine =
  | { kind: "range"; text: string }
  | {
      kind: "line";
      lineNumber: number;
      newLineNumber: number | null;
      oldLineNumber: number | null;
      prefix: string;
      text: string;
      type: "add" | "context" | "remove";
    };

type ParsedFileDiff = {
  lines: ParsedDiffLine[];
  pathA: string;
  pathB: string;
};

export const Route = createFileRoute("/$ownerName/$projectName/commit/$commitId")({
  component: ProjectCommitDetailRoute,
  validateSearch(search) {
    return {
      branch: typeof search.branch === "string" ? search.branch : "",
      path: typeof search.path === "string" ? search.path : "",
    };
  },
});

function ProjectCommitDetailRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const routeParams = Route.useParams();
  const search = Route.useSearch();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectCommitDetailScreen
            branch={search.branch}
            path={search.path}
            routeParams={routeParams}
            runtimeConfig={runtimeConfig}
          />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCommitDetailScreen({
  branch,
  path,
  routeParams,
  runtimeConfig,
}: {
  branch: string;
  path: string;
  routeParams: { commitId: string; ownerName: string; projectName: string };
  runtimeConfig: RuntimeConfig;
}) {
  const { commitId, ownerName, projectName } = routeParams;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const detailQuery = useQuery(
    codeCommitDetailQueryOptions(runtimeConfig, {
      commitId,
      ownerName,
      projectName,
      query: { branch, path },
    }),
  );

  if (!projectQuery.data || !detailQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectCommitDetailBody
        detail={detailQuery.data}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
      <CommentDeleteModal />
    </>
  );
}

function ProjectCommitDetailBody({
  detail,
  project,
  runtimeConfig,
}: {
  detail: CodeCommitDetailResponse;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { commitId, ownerName, projectName } = Route.useParams();
  const { branch, path } = Route.useSearch();
  const selectedBranch = detail.selectedBranch || branch;
  const encodedBranch = encodeURIComponent(selectedBranch);
  const commit = detail.commit;
  const openThreads = detail.threads.filter((thread) => thread.state.toLowerCase() === "open");
  const closedThreads = detail.threads.filter((thread) => thread.state.toLowerCase() === "closed");
  const nonRangedThreads = detail.threads.filter((thread) => thread.startLine === undefined);
  const isSvn = project.vcs === "SVN" || project.vcs === "SUBVERSION";

  if (isSvn) {
    return (
      <SvnCommitDetailBody
        detail={detail}
        encodedBranch={encodedBranch}
        ownerName={ownerName}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
        selectedBranch={selectedBranch}
      />
    );
  }

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div id="code-browse-wrap" className="code-browse-wrap">
          <ul className="nav nav-tabs" style={{ marginBottom: "20px" }}>
            <li>
              <a href={projectHref(runtimeConfig.basePath, ownerName, projectName, "code")}>
                {t("code.files")}
              </a>
            </li>
            <li className="active">
              <a href={projectHref(runtimeConfig.basePath, ownerName, projectName, "commits")}>
                {t("code.commits")}
              </a>
            </li>
            {project.vcs === "GIT" ? (
              <li>
                <a href={projectHref(runtimeConfig.basePath, ownerName, projectName, "branches")}>
                  {t("title.branches")}
                </a>
              </li>
            ) : null}
          </ul>

          <div className="codediff-wrap">
            <button type="button" className="ybtn ybtn-default btn-show-reviewcards">
              <i className="yobicon-restore"></i>
            </button>
            <div className="diffs-wrap">
              <div className="commitInfo">
                <div className="commitAuthor">
                  <CommitAuthor detail={detail} />
                  <span className="ago" title={commit?.authorDate ?? ""}>
                    {commit?.authorDate ?? ""}
                  </span>
                </div>
                <div className="commitMsg-wrap">
                  <CommitMessage
                    message={commit?.message ?? ""}
                    shortMessage={commit?.shortMessage ?? ""}
                  />
                </div>
                <div className="commitId-wrap">
                  <strong className="commitId">@{commit?.commitId ?? commitId}</strong>
                </div>
              </div>

              <div className="diff-body">
                {detail.files.map((file) => (
                  <FileDiffView
                    commitA={detail.parentCommit?.commitId ?? ""}
                    commitB={commit?.commitId ?? commitId}
                    file={file}
                    key={file.path}
                    ownerName={ownerName}
                    projectName={projectName}
                    runtimeConfig={runtimeConfig}
                    threads={detail.threads}
                  />
                ))}
                <div className="btnPop">
                  <button type="button" className="ybtn ybtn-info ybtn-small">
                    <i className="yobicon-post2"></i>
                  </button>
                </div>
              </div>

              <div className="board-comment-wrap">
                <div className="non-ranged-threads-wrap">
                  {nonRangedThreads.map((thread) => (
                    <CodeCommentThreadView
                      isNonRanged
                      key={thread.id}
                      ownerName={ownerName}
                      projectName={projectName}
                      runtimeConfig={runtimeConfig}
                      thread={thread}
                    />
                  ))}
                </div>
                {detail.permissions.canComment ? (
                  <CommentForm
                    action={commitCommentsHref(
                      runtimeConfig.basePath,
                      ownerName,
                      projectName,
                      commitId,
                    )}
                  />
                ) : null}
              </div>

              {detail.permissions.canComment ? (
                <ReviewForm
                  action={commitCommentsHref(
                    runtimeConfig.basePath,
                    ownerName,
                    projectName,
                    commitId,
                  )}
                />
              ) : null}
            </div>

            <div className="review-wrap span-hard-wrap">
              <div className="review-container">
                <button type="button" className="ybtn ybtn-default btn-hide-reviewcards">
                  <i className="yobicon-maximize"></i>
                </button>
                <ul className="nav nav-tabs" style={{ marginBottom: "10px" }}>
                  <li className="active">
                    <a href="#reviewcards-open" data-toggle="tab">
                      {`${t("issue.state.open")} ${openThreads.length}`}
                    </a>
                  </li>
                  <li>
                    <a href="#reviewcards-closed" data-toggle="tab">
                      {`${t("issue.state.closed")} ${closedThreads.length}`}
                    </a>
                  </li>
                </ul>
                <div className="tab-content review-list">
                  <ReviewCards id="reviewcards-open" isActive threads={openThreads} />
                  <ReviewCards id="reviewcards-closed" threads={closedThreads} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          id="watch-button"
          type="button"
          className={`pull-left ybtn ${detail.isWatching ? "active ybtn-watching" : ""}`}
          data-toggle="button"
        >
          {t("notification.watch")}
        </button>

        <a
          href={projectHref(
            runtimeConfig.basePath,
            ownerName,
            projectName,
            "commits",
            encodedBranch,
            path,
          )}
          className="ybtn pull-right"
        >
          {t("button.list")}
        </a>
      </div>
    </div>
  );
}

function SvnCommitDetailBody({
  detail,
  encodedBranch,
  ownerName,
  projectName,
  runtimeConfig,
  selectedBranch,
}: {
  detail: CodeCommitDetailResponse;
  encodedBranch: string;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
}) {
  const { t } = useLegacyMessages();
  const { commitId } = Route.useParams();
  const commit = detail.commit;
  const patch = detail.files[0]?.patch ?? "";

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div id="code-browse-wrap" className="code-browse-wrap">
          <div
            id="branches"
            className="btn-group branches pull-right"
            data-name="branch"
            data-activate="manual"
          >
            <button className="btn dropdown-toggle large" data-toggle="dropdown">
              <span className="d-label">{selectedBranch || "HEAD"}</span>
              <span className="d-caret">
                <span className="caret"></span>
              </span>
            </button>
            <ul className="dropdown-menu">
              {detail.branches.map((branch) => (
                <li
                  data-value={branch.name}
                  data-selected={branch.name === selectedBranch ? "true" : undefined}
                  key={branch.name}
                >
                  <a
                    href={projectHref(
                      runtimeConfig.basePath,
                      ownerName,
                      projectName,
                      "commits",
                      encodeURIComponent(branch.name),
                    )}
                  >
                    {branch.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <ul className="nav nav-tabs" style={{ marginBottom: "20px" }}>
            <li>
              <a href={projectHref(runtimeConfig.basePath, ownerName, projectName, "code")}>
                {t("code.files")}
              </a>
            </li>
            <li className="active">
              <a href={projectHref(runtimeConfig.basePath, ownerName, projectName, "commits")}>
                {t("code.commits")}
              </a>
            </li>
          </ul>

          <p className="commitInfo">
            <span className="avatar-wrap">
              <img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="" />
            </span>
            <strong>{commit?.authorName || commit?.authorEmail || "Anonymous"}</strong>
            <span className="ago" title={commit?.authorDate ?? ""}>
              {commit?.authorDate ?? ""}
            </span>
            <strong className="commitId pull-right">@{commit?.commitId ?? commitId}</strong>
          </p>
          <pre className="commitMsg">{commit?.message ?? ""}</pre>
          <div className="diff-wrap">
            <div id="commit" data-commit-origin="true" className="diff-body hide">
              {patch}
            </div>
          </div>

          <div className="board-comment-wrap">
            {detail.permissions.canComment ? (
              <CommentForm
                action={commitCommentsHref(
                  runtimeConfig.basePath,
                  ownerName,
                  projectName,
                  commitId,
                )}
              />
            ) : null}
          </div>
        </div>

        <button
          id="watch-button"
          type="button"
          className={`ybtn ${detail.isWatching ? "active" : ""}`}
          data-toggle="button"
        >
          {t("notification.watch")}
        </button>

        <a
          href={projectHref(
            runtimeConfig.basePath,
            ownerName,
            projectName,
            "commits",
            encodedBranch,
          )}
          className="ybtn pull-right"
        >
          {t("button.list")}
        </a>

        <div id="minimap" className="minimap-outer">
          <div className="minimap-wrap">
            <div className="minimap-curr"></div>
            <div className="minimap-links"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileDiffView({
  commitA,
  commitB,
  file,
  ownerName,
  projectName,
  runtimeConfig,
  threads,
}: {
  commitA: string;
  commitB: string;
  file: { path: string; patch: string };
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  threads: CodeReviewThread[];
}) {
  const parsed = parseUnifiedDiff(file.path, file.patch);
  const filePath = parsed.pathB || parsed.pathA || file.path;
  const fileId = filePath.replace(/\//g, "-").replace(/\./g, "-");
  const commitAShort = shortenCommitId(commitA);
  const commitBShort = shortenCommitId(commitB);
  const fileThreads = threads.filter((thread) => thread.path === filePath);

  return (
    <div id={fileId} className="diff-partial-outer">
      <div className="diff-partial-inner">
        <div className="diff-partial-meta">
          <div className="diff-partial-commit">
            <div className="diff-partial-commit-id">
              {commitA && parsed.pathA ? (
                <a
                  href={projectHref(
                    runtimeConfig.basePath,
                    ownerName,
                    projectName,
                    "code",
                    commitA,
                    parsed.pathA,
                  )}
                  title={commitA}
                  target="_blank"
                >
                  {commitAShort}
                </a>
              ) : (
                "\u00a0"
              )}
            </div>
            <div className="diff-partial-commit-id">
              {commitB && parsed.pathB ? (
                <a
                  href={projectHref(
                    runtimeConfig.basePath,
                    ownerName,
                    projectName,
                    "code",
                    commitB,
                    parsed.pathB,
                  )}
                  title={commitB}
                  target="_blank"
                >
                  {commitBShort}
                </a>
              ) : (
                "\u00a0"
              )}
            </div>
          </div>
          <div className="diff-partial-file">
            <span className="filename">{filePath}</span>
          </div>
        </div>
        <div className="diff-partial-code" data-hashcode={filePath}>
          <div className="patch-header">
            {parsed.pathA ? <div className="path">{`--- ${parsed.pathA}`}</div> : null}
            {parsed.pathB ? <div className="path">{`+++ ${parsed.pathB}`}</div> : null}
          </div>
          <table
            className="diff-container show-comments"
            data-path-a={parsed.pathA}
            data-path-b={parsed.pathB}
            data-commit-a={commitA}
            data-commit-b={commitB}
            data-file-path={filePath}
          >
            <tbody>
              {parsed.lines.map((line) => {
                const lineThreads =
                  line.kind === "line" ? threadsForDiffLine(fileThreads, line) : [];

                return line.kind === "range" ? (
                  <tr className="range" key={diffLineKey(line)}>
                    <td className="linenum">
                      <div className="line-number" data-line-num="...">
                        <span className="hidden">...</span>
                      </div>
                    </td>
                    <td className="linenum">
                      <div className="line-number" data-line-num="...">
                        <span className="hidden">...</span>
                      </div>
                    </td>
                    <td className="hunk">{line.text}</td>
                  </tr>
                ) : (
                  <FragmentWithInlineComments
                    commitId={commitB}
                    key={diffLineKey(line)}
                    line={line}
                    ownerName={ownerName}
                    projectName={projectName}
                    runtimeConfig={runtimeConfig}
                    threads={lineThreads}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FragmentWithInlineComments({
  commitId,
  line,
  ownerName,
  projectName,
  runtimeConfig,
  threads,
}: {
  commitId: string;
  line: Extract<ParsedDiffLine, { kind: "line" }>;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  threads: CodeReviewThread[];
}) {
  return (
    <>
      <DiffLineView line={line} />
      {threads.length > 0 ? (
        <InlineCommentRow
          commitId={commitId}
          ownerName={ownerName}
          projectName={projectName}
          runtimeConfig={runtimeConfig}
          threads={threads}
        />
      ) : null}
    </>
  );
}

function DiffLineView({ line }: { line: Extract<ParsedDiffLine, { kind: "line" }> }) {
  const oldLine = line.oldLineNumber === null ? "" : String(line.oldLineNumber);
  const newLine = line.newLineNumber === null ? "" : String(line.newLineNumber);

  return (
    <tr
      className={line.type}
      data-line={line.lineNumber}
      data-type={line.type}
      data-side={line.type === "remove" ? "A" : "B"}
    >
      <td className="linenum">
        <i className="yobicon-comments"></i>
        <div className="line-number" data-line-num={oldLine}></div>
        <span className="hidden">{oldLine}</span>
      </td>
      <td className="linenum">
        <div className="line-number" data-line-num={newLine}></div>
        <span className="hidden">{newLine}</span>
      </td>
      <td className="code">
        <pre className="diff-partial-codeline">{`${line.prefix}${line.text}`}</pre>
      </td>
    </tr>
  );
}

function diffLineKey(line: ParsedDiffLine) {
  if (line.kind === "range") {
    return `range-${line.text}`;
  }

  return `line-${line.oldLineNumber ?? ""}-${line.newLineNumber ?? ""}-${line.prefix}${line.text}`;
}

function threadsForDiffLine(
  threads: CodeReviewThread[],
  line: Extract<ParsedDiffLine, { kind: "line" }>,
) {
  return threads.filter((thread) => {
    const side = thread.startSide === "A" ? "A" : "B";
    const lineNumber = side === "A" ? line.oldLineNumber : line.newLineNumber;
    return lineNumber !== null && thread.startLine === lineNumber;
  });
}

function InlineCommentRow({
  commitId,
  ownerName,
  projectName,
  runtimeConfig,
  threads,
}: {
  commitId: string;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  threads: CodeReviewThread[];
}) {
  return (
    <tr className="comments board-comment-wrap" data-commit-id={threads[0]?.commitId || commitId}>
      <td colSpan={3}>
        {threads.map((thread) => (
          <CodeCommentThreadView
            key={thread.id}
            ownerName={ownerName}
            projectName={projectName}
            runtimeConfig={runtimeConfig}
            thread={thread}
          />
        ))}
      </td>
    </tr>
  );
}

function CodeCommentThreadView({
  isNonRanged = false,
  ownerName,
  projectName,
  runtimeConfig,
  thread,
}: {
  isNonRanged?: boolean;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  thread: CodeReviewThread;
}) {
  const { t } = useLegacyMessages();
  const state = thread.state.toLowerCase();
  const action = commitCommentsHref(
    runtimeConfig.basePath,
    ownerName,
    projectName,
    thread.commitId,
  );

  return (
    <div
      id={`thread-${thread.id}`}
      data-state={isNonRanged ? undefined : state}
      className={`comment-thread-wrap ${state}${!isNonRanged && state === "closed" ? " fold" : ""}`}
      data-toggle={isNonRanged ? undefined : "CodeCommentThread"}
      data-range-path={isNonRanged ? undefined : thread.path}
      data-range-startside={isNonRanged ? undefined : thread.startSide}
      data-range-startline={isNonRanged ? undefined : thread.startLine}
      data-range-startcolumn={isNonRanged ? undefined : thread.startColumn}
      data-range-endside={isNonRanged ? undefined : thread.endSide}
      data-range-endline={isNonRanged ? undefined : thread.endLine}
      data-range-endcolumn={isNonRanged ? undefined : thread.endColumn}
    >
      <div className="btn-thread-here btn-thread-minimize">
        <button type="button" className="ybtn ybtn-default ybtn-small">
          <i className={isNonRanged ? "yobicon-comments" : "yobicon-post2"}></i>
        </button>
      </div>

      {isNonRanged ? null : (
        <div className="thread-header">
          <span className={`badge state ${state}`}>{t(`issue.state.${state}`)}</span>
          <button type="button" className="ybtn ybtn-default ybtn-small btn-thread-minimize">
            <i className="yobicon-maximize"></i>
          </button>
        </div>
      )}

      <ul className="comments">
        {thread.comments.map((comment) => (
          <li id={`comment-${comment.id}`} className="comment" key={comment.id}>
            <div className="comment-avatar">
              <a
                href={prefixBasePath(runtimeConfig.basePath, `/${comment.authorLoginId}`)}
                className="avatar-wrap"
                data-toggle="tooltip"
                data-placement="top"
                title={comment.authorLabel}
              >
                <img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="" />
              </a>
            </div>
            <div className="media-body">
              <div className="meta-info">
                <span className="comment_author pull-left">
                  <a
                    href={prefixBasePath(runtimeConfig.basePath, `/${comment.authorLoginId}`)}
                    data-toggle="tooltip"
                    data-placement="top"
                    title={comment.authorLabel}
                  >
                    <strong>{`${comment.authorLoginId} `}</strong>
                  </a>
                </span>
                <span className="ago">
                  <a href={`#comment-${comment.id}`} title={comment.createdLabel}>
                    {comment.createdLabel}
                  </a>
                </span>
                {comment.canUpdate ? (
                  <span className="edit pull-right">
                    <button
                      type="button"
                      className="btn-transparent pull-right"
                      data-toggle="comment-edit"
                      data-comment-id={comment.id}
                      title={t("common.comment.edit")}
                    >
                      <i className="yobicon-edit-2"></i>
                    </button>
                  </span>
                ) : null}
                {comment.canDelete ? (
                  <span className="edit pull-right">
                    <button
                      className="btn-transparent pull-right close"
                      data-request-method={isNonRanged ? "delete" : undefined}
                      data-toggle={isNonRanged ? undefined : "comment-delete"}
                      data-request-uri={prefixBasePath(
                        runtimeConfig.basePath,
                        `/comments/${comment.id}`,
                      )}
                      title={isNonRanged ? undefined : t("common.comment.delete")}
                    >
                      <i className="yobicon-trash"></i>
                    </button>
                  </span>
                ) : null}
              </div>
              <CodeCommentUpdateForm
                action={prefixBasePath(runtimeConfig.basePath, `/comments/${comment.id}`)}
                basePath={runtimeConfig.basePath}
                comment={comment}
              />
              <div id={`comment-body-${comment.id}`}>
                <div
                  className="comment-body markdown-wrap"
                  data-via-email={String(comment.viaEmail)}
                  dangerouslySetInnerHTML={{ __html: comment.contentsHtml }}
                ></div>
                <div
                  className="attachments"
                  data-attachments={JSON.stringify(comment.attachments ?? [])}
                ></div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="write-comment-form">
        <form
          action={action}
          method="post"
          encType="multipart/form-data"
          className="review-form"
          style={{ display: "block" }}
        >
          <input type="hidden" name="thread.id" value={thread.id} />
          <div className="write-comment-box">
            <div className="write-comment-wrap">
              <Editor editorMode="code-review-body" wrapId={`thread-${thread.id}`} />
              <UploadForm resourceType="COMMIT_COMMENT" />
              <div className="right-txt">
                <button
                  type="button"
                  data-request-method="post"
                  data-request-uri={prefixBasePath(
                    runtimeConfig.basePath,
                    `/threads/${thread.id}/${state === "open" ? "close" : "open"}`,
                  )}
                  className="ybtn ybtn-default ybtn-small"
                >
                  {t(state === "open" ? "commentThread.close" : "commentThread.open")}
                </button>
                <button type="submit" className="ybtn ybtn-success ybtn-small">
                  {t("button.comment.new")}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CodeCommentUpdateForm({
  action,
  basePath,
  comment,
}: {
  action: string;
  basePath: string;
  comment: CodeReviewComment;
}) {
  const { t } = useLegacyMessages();
  const commentId = String(comment.id);

  return (
    <div id={`comment-editform-${commentId}`} className="comment-update-form">
      <form action={action} method="post" encType="multipart/form-data">
        <input type="hidden" name="id" value={commentId} />
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <Editor
              editorMode="update-comment-body"
              textareaName="contents"
              value={comment.contentsMarkdown}
              wrapId={commentId}
            />
            <div className="upload-drop-here">
              <div className="msg-wrap">
                <div className="msg">{t("common.attach.dropFilesHere")}</div>
              </div>
            </div>
            <div className="right-txt comment-update-button upload-button-line">
              <span className="file-upload">
                <label htmlFor={`upload-${commentId}`} className="file-upload__label ybtn">
                  {t("button.upload")}
                </label>
                <input
                  id={`upload-${commentId}`}
                  className="file-upload__input"
                  type="file"
                  name="filePath"
                  multiple
                />
              </span>
              <button type="button" className="ybtn ybtn-cancel" data-comment-id={commentId}>
                {t("button.cancel")}
              </button>
              {comment.canUpdate ? (
                <button type="submit" className="ybtn ybtn-info">
                  {t("button.save")}
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
          <div
            className="attachment-files"
            dangerouslySetInnerHTML={{ __html: attachmentFileHtml(basePath, comment) }}
          ></div>
          <div
            id={`upload-${commentId}`}
            data-resourcetype="NONISSUE_COMMENT"
            data-resourceid={commentId}
          ></div>
        </div>
      </form>
    </div>
  );
}

function CommitAuthor({ detail }: { detail: CodeCommitDetailResponse }) {
  const commit = detail.commit;
  if (!commit) {
    return <strong>Anonymous</strong>;
  }
  return (
    <>
      <span className="avatar-wrap smaller">
        <img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="" />
      </span>
      <strong>{commit.authorName || commit.authorEmail || "Anonymous"}</strong>
    </>
  );
}

function CommitMessage({ message, shortMessage }: { message: string; shortMessage: string }) {
  const { t } = useLegacyMessages();
  const lines = message.split("\n");
  const detail = lines.slice(1).join("\n");
  return (
    <>
      <span className="commitMsg short">{shortMessage || t("code.commitMsg.empty")}</span>
      {detail ? <pre className="commitMsg desc">{detail}</pre> : null}
    </>
  );
}

function CommentForm({ action }: { action: string }) {
  const { t } = useLegacyMessages();
  return (
    <form id="comment-form" action={action} method="post" encType="multipart/form-data">
      <div className="write-comment-box">
        <Editor editorMode="comment-body" wrapId="comment" />
        <div className="write-comment-wrap">
          <div className="right-txt">
            <button type="button" className="ybtn hidden" id="dynamic-comment-btn"></button>
            <button type="submit" className="ybtn ybtn-success">
              {t("button.comment.new")}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function ReviewForm({ action }: { action: string }) {
  const { t } = useLegacyMessages();
  return (
    <div id="review-form" className="review-form">
      <form action={action} method="post" encType="multipart/form-data">
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <div className="pull-right">
              <button type="button" className="ybtn ybtn-default ybtn-small" data-toggle="close">
                &times;
              </button>
            </div>
            <Editor editorMode="code-review-body" wrapId="review" />
            <UploadForm resourceType="COMMIT_COMMENT" />
            <div className="right-txt">
              <button type="submit" className="ybtn ybtn-success ybtn-small">
                {t("button.comment.new")}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Editor({
  editorMode,
  textareaName = "contents",
  value = "",
  wrapId,
}: {
  editorMode: string;
  textareaName?: string;
  value?: string;
  wrapId: string;
}) {
  const { t } = useLegacyMessages();
  return (
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className="active">
          <a href={`#edit-${wrapId}`} data-toggle="tab" data-mode="edit">
            {t("common.editor.edit")}
          </a>
        </li>
        <li>
          <a href={`#preview-${wrapId}`} data-toggle="tab" data-mode="preview">
            {t("common.editor.preview")}
          </a>
        </li>
        <li>
          <div className="task-list-button">
            <button
              type="button"
              className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
            >
              <i className="yobicon-list task-list-icon"></i> {t("button.add.checklist")}
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
                {t("button.clear.temporary")}
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
              name={textareaName}
              className="editorSeries content comment nm"
              data-editor-mode={editorMode}
              id={`editor-${textareaName}-${wrapId}`}
              defaultValue={value}
              {...legacyMarkdownTextareaAttr}
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
          <span className="notification-receiver-title">
            {t("notification.receiver.list.title")}
          </span>
          <span className="notification-receiver-list"></span>
        </div>
      </div>
    </div>
  );
}

function UploadForm({ resourceType }: { resourceType: string }) {
  const { t } = useLegacyMessages();
  return (
    <div className="upload-wrap content-footer" data-resource-type={resourceType}>
      <div className="attach-wrap">
        <span className="help help-droppable">{t("common.attach.drophere")}</span>
        <div className="btn-wrap">
          <div className="nbtn medium white fake-file-wrap">
            <i className="yobicon-upload"></i> {t("button.upload")}
            <input type="file" className="file" name="filePath" multiple />
          </div>
        </div>
        <span className="plain">{t("common.attach.clickbutton")}</span>
        <span className="help help-pastable">{t("common.attach.pastehere")}</span>
      </div>
      <ul className="attached-files unstyled"></ul>
      <p className="right-txt help">
        <i className="yobicon-supportrequest"></i> {t("common.attach.attachIfYouSave")}
      </p>
    </div>
  );
}

function attachmentFileHtml(basePath: string, comment: CodeReviewComment) {
  return (comment.attachments ?? [])
    .map((file) => {
      const id = String(file.id);
      const name = String(file.name);
      const mimeType = String(file.mimeType);
      const size = String(file.size);
      const href = prefixBasePath(basePath, `/files/${id}`);

      return `<div class="attached-file attached-file-marker" data-name="${escapeHtml(name)}" data-href="${escapeHtml(href)}" data-mime="${escapeHtml(mimeType)}"><i class="mimetype"></i><strong class="name">${escapeHtml(name)}</strong><span class="size">${escapeHtml(size)}</span><button type="button" class="btn-transparent btn-delete" data-id="${escapeHtml(id)}">×</button></div>`;
    })
    .join("");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function ReviewCards({
  id,
  isActive = false,
  threads,
}: {
  id: string;
  isActive?: boolean;
  threads: CodeReviewThread[];
}) {
  return (
    <div id={id} className={`tab-pane${isActive ? " active" : ""}`}>
      {threads.map((thread) => (
        <a
          href={`#thread-${thread.id}`}
          className={`review-card ${thread.state.toLowerCase()}`}
          key={thread.id}
        >
          <p className="content">{thread.comments[0]?.contentsMarkdown ?? ""}</p>
          <span className="date" title={thread.createdLabel}>
            <span className="comments">
              {thread.comments.length > 1 ? (
                <>
                  <i className="yobicon-comments"></i> {thread.comments.length}
                </>
              ) : null}
            </span>
            {thread.createdLabel}
          </span>
        </a>
      ))}
    </div>
  );
}

function CommentDeleteModal() {
  const { t } = useLegacyMessages();
  return (
    <div id="comment-delete-modal" className="modal hide fade">
      <div className="modal-header">
        <button type="button" className="close" data-dismiss="modal">
          ×
        </button>
        <h3>{t("common.comment.delete")}</h3>
      </div>
      <div className="modal-body">
        <p>{t("common.comment.delete.confirm")}</p>
      </div>
      <div className="modal-footer">
        <button id="comment-delete-confirm" type="button" className="ybtn ybtn-danger">
          {t("button.yes")}
        </button>
        <button type="button" className="ybtn" data-dismiss="modal">
          {t("button.no")}
        </button>
      </div>
    </div>
  );
}

function projectHref(basePath: string, ownerName: string, projectName: string, ...parts: string[]) {
  return prefixBasePath(
    basePath,
    `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`,
  );
}

function commitCommentsHref(
  basePath: string,
  ownerName: string,
  projectName: string,
  commitId: string,
) {
  return projectHref(basePath, ownerName, projectName, "commit", commitId, "comments");
}

function parseUnifiedDiff(path: string, patch: string): ParsedFileDiff {
  let pathA = path;
  let pathB = path;
  let oldLineNumber = 0;
  let newLineNumber = 0;
  const lines: ParsedDiffLine[] = [];

  for (const rawLine of patch.split(/\r?\n/u)) {
    if (rawLine.startsWith("--- ")) {
      pathA = normalizeDiffPath(rawLine.slice(4));
      continue;
    }
    if (rawLine.startsWith("+++ ")) {
      pathB = normalizeDiffPath(rawLine.slice(4));
      continue;
    }
    if (rawLine.startsWith("@@")) {
      const hunkMatch = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(rawLine);
      oldLineNumber = hunkMatch ? Number(hunkMatch[1]) : oldLineNumber;
      newLineNumber = hunkMatch ? Number(hunkMatch[2]) : newLineNumber;
      lines.push({ kind: "range", text: rawLine });
      continue;
    }
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      lines.push({
        kind: "line",
        lineNumber: newLineNumber,
        newLineNumber,
        oldLineNumber: null,
        prefix: "+",
        text: rawLine.slice(1),
        type: "add",
      });
      newLineNumber += 1;
      continue;
    }
    if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
      lines.push({
        kind: "line",
        lineNumber: oldLineNumber,
        newLineNumber: null,
        oldLineNumber,
        prefix: "-",
        text: rawLine.slice(1),
        type: "remove",
      });
      oldLineNumber += 1;
      continue;
    }
    if (rawLine.startsWith(" ")) {
      lines.push({
        kind: "line",
        lineNumber: newLineNumber,
        newLineNumber,
        oldLineNumber,
        prefix: " ",
        text: rawLine.slice(1),
        type: "context",
      });
      oldLineNumber += 1;
      newLineNumber += 1;
    }
  }

  return { lines, pathA, pathB };
}

function normalizeDiffPath(input: string) {
  const path = input.trim().split(/\s+/u)[0] ?? "";
  return path.replace(/^[ab]\//u, "");
}

function shortenCommitId(commitId: string) {
  return commitId.length < 7 ? commitId : commitId.slice(0, 7);
}
