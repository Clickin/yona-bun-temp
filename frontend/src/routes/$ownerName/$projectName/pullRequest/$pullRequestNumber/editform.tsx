import * as stylex from "@stylexjs/stylex";
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
import { readSessionBootstrap } from "../../../../../auth-workspace-client";
import { useLegacyMessages } from "../../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";
import { styles as sx } from "./-editform.stylex";

export const Route = createFileRoute(
  "/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform",
)({
  component: ProjectPullRequestEditRoute,
});

function ProjectPullRequestEditRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <ProjectPullRequestEditScreen runtimeConfig={runtimeConfig} />;
}

function ProjectPullRequestEditScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, pullRequestNumber } = Route.useParams();
  const { t } = useLegacyMessages();
  const prNumber = Number(pullRequestNumber) || 0;
  const formOptionsQuery = useQuery(
    pullRequestEditFormOptionsQueryOptions(runtimeConfig, {
      ownerName,
      projectName,
      pullRequestNumber: prNumber,
    }),
  );

  const formErrorStatus = pullRequestEditErrorStatus(formOptionsQuery.error);
  if (!formOptionsQuery.data?.pullRequest) {
    if (formErrorStatus === 403 || formErrorStatus === 404) {
      return (
        <>
          <title>{`${t(formErrorStatus === 404 ? "error.notfound" : "error.forbidden")} - ${ownerName}/${projectName}`}</title>
          <ProjectPullRequestEditErrorBody status={formErrorStatus} />
        </>
      );
    }
    return <title>{`${t("title.editPullRequest")} - ${ownerName}/${projectName}`}</title>;
  }

  return (
    <>
      <title>{`${t("title.editPullRequest")} - ${ownerName}/${projectName}`}</title>
      <ProjectPullRequestEditBody
        formOptions={formOptionsQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectPullRequestEditErrorBody({ status }: { status: 403 | 404 }) {
  const { t } = useLegacyMessages();
  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t(status === 404 ? "error.notfound" : "error.forbidden")}</p>
        </div>
      </div>
    </div>
  );
}

function pullRequestEditErrorStatus(error: unknown): 403 | 404 | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  const status = error.status;
  return status === 403 || status === 404 ? status : undefined;
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
            className={`${stylex.props(sx.form).className} nm`}
            data-stylex-owner="pull-request-edit-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitForm(event.currentTarget);
            }}
          >
            <PullRequestDisabledBranchSelectors
              formOptions={formOptions}
              selected={formOptions.selected}
            />
            <span id="pullRequestState"></span>
            {pullRequest.state === "OPEN" || pullRequest.state === "open" ? (
              <div id="status" className={`alert mt20 mb20 ${status.cssClass}`}>
                {status.message}
              </div>
            ) : null}
            <div data-stylex-owner="pull-request-edit-editor">
              <input
                type="text"
                id="title"
                name="title"
                maxLength={255}
                className={`${stylex.props(sx.title).className} text`}
                defaultValue={pullRequest.title}
                placeholder={t("title")}
              />
              <div {...stylex.props(sx.editorWrap)}>
                <PullRequestMarkdownEditor value={pullRequest.bodyMarkdown} />
              </div>
              <PullRequestFileUploader resourceId={pullRequest.id} />
              <div className={`${stylex.props(sx.actions).className} actions`}>
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
              <div
                id="__commits"
                className={`${stylex.props(sx.mergeResult).className} code-browse-wrap tab-pane active`}
                data-stylex-owner="pull-request-edit-merge-result"
              >
                {mergeResult ? (
                  <MergeResult
                    authorLabel={t("code.author")}
                    commitDateLabel={t("code.commitDate")}
                    commitMessageLabel={t("code.commitMsg")}
                    commits={mergeResult.commits}
                    noChangesLabel={t("pullRequest.diff.noChanges")}
                    ownerName={sourceProjectOwnerName(formOptions)}
                    projectName={sourceProjectName(formOptions)}
                    runtimeConfig={runtimeConfig}
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
        className={`${stylex.props(sx.conflictModal).className} modal in yobiDialog`}
        data-stylex-owner="pull-request-edit-conflict-modal"
        tabIndex={-1}
        role="dialog"
        aria-hidden={false}
        aria-modal="true"
      >
        <div className="btn-dismiss">
          <button
            type="button"
            className={`${stylex.props(sx.conflictDismiss).className} btn-transparent`}
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="message">
          <div className="center-text">
            <p className="msg">{t("pullRequest.ignore.conflict")}</p>
            <p className={`${stylex.props(sx.conflictDescription).className} desc`}></p>
          </div>
          <div
            className={`${stylex.props(sx.conflictActions).className} buttons`}
            data-stylex-owner="pull-request-edit-conflict-actions"
          >
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
    <div
      className={`${stylex.props(sx.selectors).className} pull-request-wrap`}
      data-stylex-owner="pull-request-edit-selectors"
    >
      <div className="pull-left">
        <label
          htmlFor="fromProjectId"
          className={`${stylex.props(sx.fieldTitle).className} field-title`}
        >
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
      <div className={`${stylex.props(sx.arrow).className} arrow`}>
        <i className="yobicon-right-2"></i>
      </div>
      <div className="pull-right">
        <label
          htmlFor="toProjectId"
          className={`${stylex.props(sx.fieldTitle).className} field-title`}
        >
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

function PullRequestMarkdownEditor({ value }: { value: string }) {
  const { t } = useLegacyMessages();
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
      <div
        className={`${stylex.props(sx.editorTabContent).className} tab-content`}
        data-stylex-owner="pull-request-edit-editor-tab-content"
      >
        <LegacyMarkdownHelp />
        <div id="edit-body" className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              name="body"
              className={`${stylex.props(sx.editor).className} editorSeries content comment nm`}
              data-editor-mode="content-body"
              id="editor-body-body"
              defaultValue={value}
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
      className={`${stylex.props(sx.uploader).className} upload-wrap content-footer`}
      data-stylex-owner="pull-request-edit-uploader"
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
      <ul
        className={`${stylex.props(sx.attachmentDivider).className} attached-files unstyled`}
      ></ul>
      <p
        className={`help ${stylex.props(sx.uploadSaveHelp).className ?? ""}`.trim()}
        data-stylex-owner="pull-request-edit-upload-save-help"
      >
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
  noChangesLabel,
  ownerName,
  projectName,
  runtimeConfig,
}: {
  authorLabel: string;
  commitDateLabel: string;
  commitMessageLabel: string;
  commits: PullRequestCommit[];
  noChangesLabel: string;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  if (!commits.length) {
    return (
      <div id="mergeResult" className="code-browser-wrap">
        <div>
          <h5>{noChangesLabel}</h5>
        </div>
      </div>
    );
  }

  return (
    <div id="mergeResult" className="code-browser-wrap">
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
                    search={{ branch: "", path: "" }}
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
                    <img
                      src={prefixBasePath(
                        runtimeConfig.basePath,
                        "/assets/images/default-avatar-32.png",
                      )}
                      width="32"
                      height="32"
                      alt=""
                    />
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
