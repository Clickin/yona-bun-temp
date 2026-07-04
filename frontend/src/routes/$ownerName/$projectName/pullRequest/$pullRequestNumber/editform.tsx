import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  pullRequestEditFormOptionsQueryOptions,
  updatePullRequestRest,
  type PullRequestFormOptionsResponse,
  type PullRequestFormSelected,
} from "../../../../../api/pull-requests";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import { readSessionBootstrap } from "../../../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../../i18n";
import { YonaQueryProvider } from "../../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import { SiteLayoutShell } from "../../../../-home-route-screen";
import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";
import { ProjectHeader, ProjectMenu } from "../../../$projectName";

export const Route = createFileRoute(
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform",
)({
  component: ProjectPullRequestEditRoute,
});

function ProjectPullRequestEditRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectPullRequestEditScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPullRequestEditScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, pullRequestNumber } = Route.useParams();
  const prNumber = Number(pullRequestNumber) || 0;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const formOptionsQuery = useQuery(
    pullRequestEditFormOptionsQueryOptions(runtimeConfig, {
      ownerName,
      projectName,
      pullRequestNumber: prNumber,
    }),
  );

  if (!projectQuery.data || !formOptionsQuery.data?.pullRequest) {
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
      <ProjectPullRequestEditBody
        formOptions={formOptionsQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectPullRequestEditBody({
  formOptions,
  runtimeConfig,
}: {
  formOptions: PullRequestFormOptionsResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName, pullRequestNumber } = Route.useParams();
  const prNumber = Number(pullRequestNumber) || 0;
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pullRequest = formOptions.pullRequest;
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updatePullRequestRest(runtimeConfig, csrfToken, {
        attachmentIds: [],
        bodyMarkdown: stringFormValue(formData, "body"),
        ownerName,
        projectName,
        pullRequestNumber: prNumber,
        title: stringFormValue(formData, "title"),
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

  if (!pullRequest) {
    return null;
  }

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <form
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/pullRequest/${prNumber}`,
            )}
            encType="multipart/form-data"
            className="nm"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(event.currentTarget);
            }}
          >
            <PullRequestDisabledBranchSelectors
              formOptions={formOptions}
              selected={formOptions.selected}
            />
            <span id="pullRequestState" data-value={pullRequest.state}></span>
            {pullRequest.state === "OPEN" || pullRequest.state === "open" ? (
              <div id="status" className="alert mt20 mb20">
                {t("pullRequest.is.merging")}
              </div>
            ) : null}
            <div>
              <input
                type="text"
                id="title"
                name="title"
                maxLength={255}
                className="text"
                defaultValue={pullRequest.title}
                placeholder={t("title")}
                data-is-user-has-typed="true"
              />
              <div style={{ position: "relative" }}>
                <PullRequestMarkdownEditor value={pullRequest.bodyMarkdown} isUserHasTyped />
              </div>
              <PullRequestFileUploader resourceId={pullRequest.id} />
              <div className="actions">
                <button type="submit" className="ybtn ybtn-success">
                  {t("button.save")}
                </button>
                <button type="button" className="ybtn" onClick={() => router.history.back()}>
                  {t("button.cancel")}
                </button>
              </div>
            </div>
            <ul className="nav nav-tabs mt20">
              <li className="active">
                <button type="button" data-toggle="tab">
                  <span className="vmiddle-inline">{t("pullRequest.menu.commit")}</span>
                  <span id="numOfCommits" className="num-badge vmiddle-inline"></span>
                </button>
              </li>
            </ul>
            <div className="tab-content">
              <div id="__commits" className="code-browse-wrap tab-pane active"></div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PullRequestDisabledBranchSelectors({
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
          disabled
        >
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
          disabled
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
        <input type="hidden" name="fromProjectId" value={selected.fromProjectId} />
        <input type="hidden" name="fromBranch" value={selected.fromBranch} />
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
          disabled
        >
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
          disabled
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
        <input type="hidden" name="toProjectId" value={selected.toProjectId} />
        <input type="hidden" name="toBranch" value={selected.toBranch} />
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
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  return (
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className={activeTab === "edit" ? "active" : undefined}>
          <button
            type="button"
            data-toggle="tab"
            data-mode="edit"
            onClick={() => setActiveTab("edit")}
          >
            {t("common.editor.edit")}
          </button>
        </li>
        <li className={activeTab === "preview" ? "active" : undefined}>
          <button
            type="button"
            data-toggle="tab"
            data-mode="preview"
            onClick={() => setActiveTab("preview")}
          >
            {t("common.editor.preview")}
          </button>
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
        <LegacyMarkdownHelp />
        <div id="edit-body" className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
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
        <div id="preview-body" className={`tab-pane${activeTab === "preview" ? " active" : ""}`}>
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
  );
}

function stringFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
