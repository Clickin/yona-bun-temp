import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";
import {
  createPullRequestRest,
  pullRequestCreateFormOptionsQueryOptions,
  pullRequestMergeResultQueryOptions,
  type PullRequestCommit,
  type PullRequestFormOptionsResponse,
  type PullRequestFormSelected,
} from "../../../api/pull-requests";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

type PullRequestFormSearch = {
  fromBranch: string;
  toBranch: string;
};

export const Route = createFileRoute("/$ownerName/$projectName/newPullRequestForm")({
  component: ProjectNewPullRequestRoute,
  validateSearch(search: Record<string, unknown>): PullRequestFormSearch {
    return {
      fromBranch: stringSearch(search.fromBranch),
      toBranch: stringSearch(search.toBranch),
    };
  },
});

function ProjectNewPullRequestRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectNewPullRequestScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectNewPullRequestScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const legacySearch = legacyUrlSearch(locationHref);
  const query = {
    fromBranch: search.fromBranch || stringSearch(legacySearch.get("fromBranch")),
    toBranch: search.toBranch || stringSearch(legacySearch.get("toBranch")),
  };
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const formOptionsQuery = useQuery(
    pullRequestCreateFormOptionsQueryOptions(runtimeConfig, { ownerName, projectName, query }),
  );

  if (!projectQuery.data || !formOptionsQuery.data) {
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
      <ProjectNewPullRequestBody
        formOptions={formOptionsQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectNewPullRequestBody({
  formOptions,
  runtimeConfig,
}: {
  formOptions: PullRequestFormOptionsResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const selected = formOptions.selected;
  const mergeResultQuery = useQuery(
    pullRequestMergeResultQueryOptions(runtimeConfig, { ownerName, projectName, query: selected }),
  );
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createPullRequestRest(runtimeConfig, csrfToken, {
        bodyMarkdown: stringFormValue(formData, "body"),
        fromBranch: stringFormValue(formData, "fromBranch"),
        fromProjectId: Number(stringFormValue(formData, "fromProjectId")) || 0,
        ownerName,
        projectName,
        title: stringFormValue(formData, "title"),
        toBranch: stringFormValue(formData, "toBranch"),
        toProjectId: Number(stringFormValue(formData, "toProjectId")) || 0,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["api", "v1", "owners", ownerName, "projects", projectName, "pull-requests"],
      });
      router.history.push(
        prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/pullRequests`),
      );
    },
  });

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <form
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/pullRequests`,
            )}
            encType="multipart/form-data"
            className="nm"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(event.currentTarget);
            }}
          >
            <PullRequestBranchSelectors formOptions={formOptions} selected={selected} />
            <span id="pullRequestState" data-value="OPEN"></span>
            <div id="status" className="alert mt20 mb20">
              {t("pullRequest.is.merging")}
            </div>
            <div>
              <input
                type="text"
                id="title"
                name="title"
                maxLength={255}
                className="text"
                placeholder={t("title")}
              />
              <div style={{ position: "relative" }}>
                <PullRequestMarkdownEditor value="" />
              </div>
              <PullRequestFileUploader />
              <div className="actions">
                <button type="submit" className="ybtn ybtn-success">
                  {t("pullRequest.send")}
                </button>
                <a
                  href={prefixBasePath(
                    runtimeConfig.basePath,
                    `/${ownerName}/${projectName}/pullRequests`,
                  )}
                  ref={(node) => {
                    node?.setAttribute("href", "javascript:history.back();");
                  }}
                  className="ybtn"
                >
                  {t("button.cancel")}
                </a>
              </div>
            </div>
            <ul className="nav nav-tabs mt20">
              <li className="active">
                <a href="#__commits" data-toggle="tab">
                  <span className="vmiddle-inline">{t("pullRequest.menu.commit")}</span>
                  <span id="numOfCommits" className="num-badge vmiddle-inline">
                    {mergeResultQuery.data?.commits.length
                      ? String(mergeResultQuery.data.commits.length)
                      : ""}
                  </span>
                </a>
              </li>
            </ul>
            <div className="tab-content">
              <div id="__commits" className="code-browse-wrap tab-pane active">
                {mergeResultQuery.data ? (
                  <MergeResult
                    basePath={runtimeConfig.basePath}
                    commits={mergeResultQuery.data.commits}
                    conflict={mergeResultQuery.data.conflict}
                    noChangesLabel={t("pullRequest.diff.noChanges")}
                    ownerName={ownerName}
                    projectName={projectName}
                  />
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PullRequestBranchSelectors({
  formOptions,
  selected,
}: {
  formOptions: PullRequestFormOptionsResponse;
  selected: PullRequestFormSelected;
}) {
  const { t } = useLegacyMessages();
  return (
    <div className="pull-request-wrap">
      <div className="pull-left">
        <label htmlFor="fromProjectId" className="field-title">
          {t("pullRequest.from")}
        </label>
        <select
          id="fromProjectId"
          name="fromProjectId"
          data-toggle="select2"
          className="mr5"
          defaultValue={String(selected.fromProjectId)}
        >
          <option></option>
          {formOptions.fromProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.ownerName}/{project.projectName}
            </option>
          ))}
        </select>
        <select
          id="fromBranch"
          name="fromBranch"
          data-toggle="select2"
          data-format="branch"
          data-dropdown-css-class="branches"
          data-placeholder={t("pullRequest.select.branch")}
          defaultValue={selected.fromBranch}
        >
          <option></option>
          {formOptions.fromBranches.map((branch) => (
            <option key={branch.name} value={branch.name}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      <div className="arrow">
        <i className="yobicon-right-2"></i>
      </div>
      <div className="pull-right">
        <label htmlFor="toProjectId" className="field-title">
          {t("pullRequest.to")}
        </label>
        <select
          id="toProjectId"
          name="toProjectId"
          data-toggle="select2"
          className="mr5"
          defaultValue={String(selected.toProjectId)}
        >
          <option></option>
          {formOptions.toProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.ownerName}/{project.projectName}
            </option>
          ))}
        </select>
        <select
          id="toBranch"
          name="toBranch"
          data-toggle="select2"
          data-format="branch"
          data-dropdown-css-class="branches"
          data-placeholder={t("pullRequest.select.branch")}
          defaultValue={selected.toBranch}
        >
          <option></option>
          {formOptions.toBranches.map((branch) => (
            <option key={branch.name} value={branch.name}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PullRequestMarkdownEditor({
  isUserHasTyped = false,
  value,
}: {
  isUserHasTyped?: boolean;
  value: string;
}) {
  const { t } = useLegacyMessages();
  const userTypedAttr = isUserHasTyped ? { "data-is-user-has-typed": "true" } : {};
  return (
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className="active">
          <a href="#edit-body" data-toggle="tab" data-mode="edit">
            {t("common.editor.edit")}
          </a>
        </li>
        <li>
          <a href="#preview-body" data-toggle="tab" data-mode="preview">
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
        <div id="edit-body" className="tab-pane active">
          <div className="textarea-box">
            <textarea
              name="body"
              className="editorSeries content comment nm"
              data-editor-mode="content-body"
              id="editor-body-body"
              defaultValue={value}
              {...userTypedAttr}
              {...{ markdown: "true" }}
            ></textarea>
          </div>
        </div>
        <div id="preview-body" className="tab-pane">
          <div className="markdown-preview markdown-wrap content-body" data-via-email="false"></div>
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

function PullRequestFileUploader({ resourceId }: { resourceId?: number }) {
  const { t } = useLegacyMessages();
  return (
    <>
      <div
        id="upload"
        className="upload-wrap content-footer"
        data-resource-type="PULL_REQUEST"
        data-resource-id={resourceId === undefined ? undefined : String(resourceId)}
      >
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
      <script
        type="text/x-jquery-tmpl"
        id="tplAttachedFile"
        dangerouslySetInnerHTML={{
          __html:
            '<li class="attached-file" data-id="${fileId}" data-name="${fileName}" data-href="${fileHref}" data-mime="${mimeType}" data-size="${fileSize}"><i class="yobicon-supportrequest"></i><i class="mimetype"></i><strong class="name">${fileName}</strong><span class="size">${fileSizeReadable}</span><div class="pull-right"><div class="progress upload-progress"><div class="bar orange"></div></div></div><button type="button" class="btn-transparent btn-delete pull-right">×</button><span class="pull-right nbtn small white btn-insert">Click to post</span></li>',
        }}
      ></script>
      <script
        type="text/x-jquery-tmpl"
        id="tplDropFilesHere"
        dangerouslySetInnerHTML={{
          __html:
            '<div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div>',
        }}
      ></script>
    </>
  );
}

function MergeResult({
  basePath,
  commits,
  conflict,
  noChangesLabel,
  ownerName,
  projectName,
}: {
  basePath: string;
  commits: PullRequestCommit[];
  conflict: boolean;
  noChangesLabel: string;
  ownerName: string;
  projectName: string;
}) {
  if (!commits.length) {
    return (
      <div
        id="mergeResult"
        className="code-browser-wrap"
        data-commits="0"
        data-pullrequest-title=""
        data-pullrequest-body=""
      >
        <div>
          <h5>{noChangesLabel}</h5>
        </div>
      </div>
    );
  }

  return (
    <div
      id="mergeResult"
      className="code-browser-wrap"
      data-commits={String(commits.length)}
      data-pullrequest-title=""
      data-pullrequest-body=""
      data-conflict={String(conflict)}
    >
      <div className="commit-wrap">
        <table className="code-table commits">
          <thead className="thead">
            <tr>
              <td className="commit-id">
                <strong>@</strong>
              </td>
              <td className="messages">
                <strong>Commit message</strong>
              </td>
              <td className="date">
                <strong>Commit date</strong>
              </td>
              <td className="author">
                <strong>Author</strong>
              </td>
            </tr>
          </thead>
          <tbody className="tbody">
            {commits.map((commit) => (
              <tr key={commit.commitId}>
                <td className="commit-id">
                  <a
                    href={prefixBasePath(
                      basePath,
                      `/${ownerName}/${projectName}/commit/${commit.commitId}`,
                    )}
                  >
                    {commit.commitShortId}
                  </a>
                </td>
                <td className="messages">
                  <span className="commitMsg short">{commit.commitMessage}</span>
                </td>
                <td className="date" title={commit.authorDateLabel}>
                  {commit.authorDateLabel}
                </td>
                <td className={`author ${commit.authorEmail}`}>
                  <div className="avatar-wrap">
                    <img src="/assets/images/default-avatar-32.png" width="32" height="32" alt="" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function legacyUrlSearch(locationHref: string): URLSearchParams {
  const queryIndex = locationHref.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? locationHref.slice(queryIndex) : "");
}

function stringFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function stringSearch(value: unknown): string {
  return typeof value === "string" ? value : "";
}
