import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import {
  pullRequestDetailQueryOptions,
  type PullRequestDetailResponse,
  type PullRequestState,
} from "../../../../api/pull-requests";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/pullRequest/$pullRequestNumber")({
  component: ProjectPullRequestOverviewRoute,
});

function ProjectPullRequestOverviewRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectPullRequestOverviewScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPullRequestOverviewScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, pullRequestNumber } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isEditChildRoute = pathname.endsWith(`/pullRequest/${pullRequestNumber}/editform`);
  const prNumber = Number(pullRequestNumber) || 0;
  const projectQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
    enabled: !isEditChildRoute,
  });
  const pullRequestQuery = useQuery({
    ...pullRequestDetailQueryOptions(runtimeConfig, {
      ownerName,
      projectName,
      pullRequestNumber: prNumber,
    }),
    enabled: !isEditChildRoute,
  });

  if (isEditChildRoute) {
    return <Outlet />;
  }

  if (!projectQuery.data || !pullRequestQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu
        active="pullRequest"
        basePath={runtimeConfig.basePath}
        project={projectQuery.data}
      />
      <PullRequestOverviewBody pullRequest={pullRequestQuery.data} runtimeConfig={runtimeConfig} />
    </>
  );
}

function PullRequestOverviewBody({
  pullRequest,
  runtimeConfig,
}: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const prPath = `/${ownerName}/${projectName}/pullRequest/${pullRequest.pullRequestNumber}`;

  return (
    <>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <PullRequestHeader pullRequest={pullRequest} runtimeConfig={runtimeConfig} />
          <div className="board-body">
            <div className="author-info left-txt" style={{ marginTop: "20px" }}>
              <a
                href={prefixBasePath(runtimeConfig.basePath, `/${pullRequest.contributor.loginId}`)}
                className="usf-group pull-left"
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
              </a>
              <PullRequestBranchInfo pullRequest={pullRequest} runtimeConfig={runtimeConfig} />
            </div>
            <div
              className="content markdown-wrap"
              dangerouslySetInnerHTML={{ __html: pullRequest.bodyHtml }}
            />
            <div className="attachments" data-attachments="[]"></div>
          </div>

          <div id="state" className="pullRequest-stateInfo">
            <PullRequestStateInfo pullRequest={pullRequest} />
          </div>

          <div className="board-footer board-actrow">
            <div className="pull-left">
              <button
                id="watch-button"
                type="button"
                className={pullRequest.isWatching ? "ybtn ybtn-watching" : "ybtn"}
                data-toggle="button"
                data-watching={pullRequest.isWatching ? "true" : "false"}
              >
                {pullRequest.isWatching ? t("project.unwatch") : t("project.watch")}
              </button>
            </div>

            <div className="mr5" style={{ display: "inline-block" }}>
              {pullRequest.permissions.canUpdate ? (
                <a
                  href={prefixBasePath(runtimeConfig.basePath, `${prPath}/editform`)}
                  className="ybtn"
                >
                  {t("button.edit")}
                </a>
              ) : null}
              {isOpenState(pullRequest.state) && pullRequest.permissions.canUpdateState ? (
                <a
                  data-request-method="post"
                  href={prefixBasePath(runtimeConfig.basePath, `${prPath}/close`)}
                  className="ybtn"
                >
                  {t("pullRequest.close")}
                </a>
              ) : null}
            </div>
          </div>

          <hr className="nm" />

          <div className="board-comment-wrap">
            {pullRequest.events.length > 0 ? (
              <ul className="comments" id="comments">
                {pullRequest.events.map((event) => (
                  <li className="event" id={`comment-${event.id}`} key={event.id}>
                    <span className="state changed">{event.eventType}</span>
                    <span className="date">
                      <a href={`#event-${event.id}`}>{event.createdLabel}</a>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="right-txt">
            <a href="#helpMessage" className="ybtn ybtn-inverse ybtn-mini" data-toggle="modal">
              {t("title.help")}
            </a>
          </div>
        </div>
      </div>
      <PullRequestHelpModal />
    </>
  );
}

function PullRequestHeader({
  pullRequest,
  runtimeConfig,
}: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const stateKey = pullRequest.conflict ? "conflict" : pullRequest.state.toLowerCase();
  const prPath = `/${pullRequest.ownerName}/${pullRequest.projectName}/pullRequest/${pullRequest.pullRequestNumber}`;
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
        {pullRequest.permissions.canReview && isOpenState(pullRequest.state) ? (
          <a
            id="btnAccept"
            href={prefixBasePath(runtimeConfig.basePath, `${prPath}/accept`)}
            data-request-method="post"
            className="ybtn ybtn-success"
          >
            {t("pullRequest.merge")}
          </a>
        ) : null}
      </div>

      <ul className="nav nav-tabs nm">
        <li className="active">
          <a href={prefixBasePath(runtimeConfig.basePath, prPath)}>
            {t("pullRequest.menu.overview")}
          </a>
        </li>
        <li>
          <a href={prefixBasePath(runtimeConfig.basePath, `${prPath}/changes`)}>
            {t("pullRequest.menu.changes")}
          </a>
        </li>
      </ul>
    </>
  );
}

function PullRequestBranchInfo({
  pullRequest,
  runtimeConfig,
}: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  return (
    <div className="pullRequest-branchInfo">
      <i className="yobicon-branch ml0"></i>
      <code className="from" data-toggle="tooltip" data-original-title={t("pullRequest.from")}>
        <a href={prefixBasePath(runtimeConfig.basePath, `/${pullRequest.fromOwnerName}`)}>
          {pullRequest.fromOwnerName}
        </a>
        <span>/</span>
        <a
          href={prefixBasePath(
            runtimeConfig.basePath,
            `/${pullRequest.fromOwnerName}/${pullRequest.fromProjectName}`,
          )}
        >
          {pullRequest.fromProjectName}
        </a>
        :{" "}
        <a
          href={prefixBasePath(
            runtimeConfig.basePath,
            `/${pullRequest.fromOwnerName}/${pullRequest.fromProjectName}/code/${encodeBranch(
              pullRequest.fromBranch,
            )}`,
          )}
          className="branchName"
        >
          {pullRequest.fromBranch}
        </a>
      </code>
      <i className="yobicon-right-2 ml10"></i>
      <code className="to" data-toggle="tooltip" data-original-title={t("pullRequest.to")}>
        <a href={prefixBasePath(runtimeConfig.basePath, `/${pullRequest.ownerName}`)}>
          {pullRequest.ownerName}
        </a>
        <span>/</span>
        <a
          href={prefixBasePath(
            runtimeConfig.basePath,
            `/${pullRequest.ownerName}/${pullRequest.projectName}`,
          )}
        >
          {pullRequest.projectName}
        </a>
        :{" "}
        <a
          href={prefixBasePath(
            runtimeConfig.basePath,
            `/${pullRequest.ownerName}/${pullRequest.projectName}/code/${encodeBranch(
              pullRequest.toBranch,
            )}`,
          )}
          className="branchName"
        >
          {pullRequest.toBranch}
        </a>
      </code>
    </div>
  );
}

function PullRequestStateInfo({ pullRequest }: { pullRequest: PullRequestDetailResponse }) {
  const { t } = useLegacyMessages();
  if (!isOpenState(pullRequest.state)) {
    return null;
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
    </div>
  );
}

function PullRequestHelpModal() {
  const { t } = useLegacyMessages();
  return (
    <div id="helpMessage" className="modal hide fade pullreq-info">
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
        <button type="button" className="ybtn ybtn-info ybtn-small" data-dismiss="modal">
          {t("button.confirm")}
        </button>
      </div>
    </div>
  );
}

function isOpenState(state: PullRequestState) {
  return state.toLowerCase() === "open";
}

function encodeBranch(branch: string) {
  return encodeURIComponent(branch);
}
