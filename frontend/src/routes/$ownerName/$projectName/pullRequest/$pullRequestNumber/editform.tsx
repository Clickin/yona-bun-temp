import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  pullRequestMergeResultQueryOptions,
  pullRequestEditFormOptionsQueryOptions,
  type PullRequestCommit,
  updatePullRequestRest,
  type PullRequestFormOptionsResponse,
  type PullRequestFormSelected,
} from "../../../../../api/pull-requests";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import { readSessionBootstrap } from "../../../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../../i18n";
import { YonaQueryProvider } from "../../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
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
        <ProjectPullRequestEditScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectPullRequestEditScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, pullRequestNumber } = Route.useParams();
  const { t } = useLegacyMessages();
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
    return <title>{`${t("title.editPullRequest")} - ${ownerName}/${projectName}`}</title>;
  }

  return (
    <>
      <title>{`${t("title.editPullRequest")} - ${ownerName}/${projectName}`}</title>
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
  const [forceSubmit, setForceSubmit] = useState(false);
  const [conflictConfirmOpen, setConflictConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitLockedRef = useRef(false);
  const mergeResultQuery = useQuery(
    pullRequestMergeResultQueryOptions(runtimeConfig, {
      ownerName,
      projectName,
      query: formOptions.selected,
    }),
  );
  const mergeResult = mergeResultQuery.data;
  const status = mergeStatus(mergeResult, t);
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
    onSettled() {
      submitLockedRef.current = false;
    },
  });

  const submitForm = (form: HTMLFormElement, conflictConfirmed = false) => {
    if (submitLockedRef.current || mutation.isPending) {
      return;
    }
    if (!validatePullRequestMergeResult(mergeResult, t)) {
      return;
    }
    if (mergeResult?.conflict && !forceSubmit && !conflictConfirmed) {
      setConflictConfirmOpen(true);
      return;
    }
    if (!validatePullRequestRequiredFields(new FormData(form), t)) {
      return;
    }
    submitLockedRef.current = true;
    mutation.mutate(form);
  };

  if (!pullRequest) {
    return null;
  }

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <form
            ref={formRef}
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/pullRequest/${prNumber}/edit`,
            )}
            encType="multipart/form-data"
            className="nm"
            onSubmit={(event) => {
              event.preventDefault();
              submitForm(event.currentTarget);
            }}
          >
            <PullRequestDisabledBranchSelectors
              formOptions={formOptions}
              selected={formOptions.selected}
            />
            <span id="pullRequestState" data-value={pullRequest.state}></span>
            {pullRequest.state === "OPEN" || pullRequest.state === "open" ? (
              <div id="status" className={`alert mt20 mb20 ${status.cssClass}`}>
                {status.message}
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
                <button type="button">
                  <span className="vmiddle-inline">{t("pullRequest.menu.commit")}</span>
                  <span id="numOfCommits" className="num-badge vmiddle-inline">
                    {mergeResult?.commits.length ? String(mergeResult.commits.length) : ""}
                  </span>
                </button>
              </li>
            </ul>
            <div className="tab-content">
              <div id="__commits" className="code-browse-wrap tab-pane active">
                {mergeResult ? (
                  <MergeResult
                    authorLabel={t("code.author")}
                    commitDateLabel={t("code.commitDate")}
                    commitMessageLabel={t("code.commitMsg")}
                    commits={mergeResult.commits}
                    conflict={mergeResult.conflict}
                    noChangesLabel={t("pullRequest.diff.noChanges")}
                    ownerName={sourceProjectOwnerName(formOptions)}
                    projectName={sourceProjectName(formOptions)}
                  />
                ) : null}
              </div>
            </div>
          </form>
          <PullRequestConflictConfirmModal
            open={conflictConfirmOpen}
            onClose={() => setConflictConfirmOpen(false)}
            onConfirm={() => {
              const form = formRef.current;
              setConflictConfirmOpen(false);
              setForceSubmit(true);
              if (form) {
                submitForm(form, true);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PullRequestConflictConfirmModal({
  onClose,
  onConfirm,
  open,
}: {
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
  const { t } = useLegacyMessages();

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        id="pullRequestConflictConfirm"
        className="modal in yobiDialog"
        tabIndex={-1}
        role="dialog"
        aria-hidden={false}
        aria-modal="true"
        style={{ display: "block" }}
      >
        <div className="btn-dismiss">
          <button type="button" className="btn-transparent" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="message">
          <div className="center-text">
            <p className="msg">{t("pullRequest.ignore.conflict")}</p>
            <p className="desc"></p>
          </div>
          <div className="center-txt buttons">
            <button type="button" className="ybtn ybtn-default" onClick={onClose}>
              {t("button.cancel")}
            </button>
            <button type="button" className="ybtn ybtn-primary" onClick={onConfirm}>
              {t("button.confirm")}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop in"></div>
    </>
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
    <div className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className={activeTab === "edit" ? "active" : undefined}>
          <button type="button" onClick={() => setActiveTab("edit")}>
            {t("common.editor.edit")}
          </button>
        </li>
        <li className={activeTab === "preview" ? "active" : undefined}>
          <button type="button" onClick={() => setActiveTab("preview")}>
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

function MergeResult({
  authorLabel,
  commitDateLabel,
  commitMessageLabel,
  commits,
  conflict,
  noChangesLabel,
  ownerName,
  projectName,
}: {
  authorLabel: string;
  commitDateLabel: string;
  commitMessageLabel: string;
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
                <strong>{commitMessageLabel}</strong>
              </td>
              <td className="date">
                <strong>{commitDateLabel}</strong>
              </td>
              <td className="author">
                <strong>{authorLabel}</strong>
              </td>
            </tr>
          </thead>
          <tbody className="tbody">
            {commits.map((commit) => (
              <tr key={commit.commitId}>
                <td className="commit-id">
                  <Link
                    to="/$ownerName/$projectName/commit/$commitId"
                    params={{ commitId: commit.commitId, ownerName, projectName }}
                  >
                    {commit.commitShortId}
                  </Link>
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

function selectedSourceProject(formOptions: PullRequestFormOptionsResponse) {
  return (
    formOptions.fromProjects.find((project) => project.id === formOptions.selected.fromProjectId) ??
    formOptions.fromProjects.find((project) => project.selected)
  );
}

function sourceProjectOwnerName(formOptions: PullRequestFormOptionsResponse) {
  return (
    selectedSourceProject(formOptions)?.ownerName ?? formOptions.pullRequest?.fromOwnerName ?? ""
  );
}

function sourceProjectName(formOptions: PullRequestFormOptionsResponse) {
  return (
    selectedSourceProject(formOptions)?.projectName ??
    formOptions.pullRequest?.fromProjectName ??
    ""
  );
}

function stringFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function mergeStatus(
  mergeResult: { commits: PullRequestCommit[]; conflict: boolean } | undefined,
  t: ReturnType<typeof useLegacyMessages>["t"],
): { cssClass: string; message: string } {
  if (!mergeResult) {
    return { cssClass: "", message: t("pullRequest.is.merging") };
  }
  if (mergeResult.commits.length === 0) {
    return { cssClass: "alert-info", message: t("pullRequest.diff.noChanges") };
  }
  return mergeResult.conflict
    ? { cssClass: "alert-error", message: t("pullRequest.is.not.safe") }
    : { cssClass: "alert-success", message: t("pullRequest.is.safe") };
}

function validatePullRequestMergeResult(
  mergeResult: { commits: PullRequestCommit[]; conflict: boolean } | undefined,
  t: ReturnType<typeof useLegacyMessages>["t"],
): boolean {
  if (!mergeResult?.commits.length) {
    window.alert(t("pullRequest.diff.noChanges"));
    return false;
  }
  return true;
}

function validatePullRequestRequiredFields(
  formData: FormData,
  t: ReturnType<typeof useLegacyMessages>["t"],
): boolean {
  for (const fieldName of ["title", "fromProjectId", "toProjectId", "fromBranch", "toBranch"]) {
    if (!stringFormValue(formData, fieldName).trim()) {
      window.alert(t(`pullRequest.${fieldName}.required`));
      return false;
    }
  }
  return true;
}
