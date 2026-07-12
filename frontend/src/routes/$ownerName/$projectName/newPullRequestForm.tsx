import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  createPullRequestRest,
  pullRequestCreateFormOptionsQueryOptions,
  pullRequestMergeResultQueryOptions,
  type PullRequestCommit,
  type PullRequestFormOptionsResponse,
  type PullRequestFormSelected,
} from "../../../api/pull-requests";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { RestApiError } from "../../../api/rest-client";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { LegacyMarkdownHelp } from "../../-legacy-markdown-help";
import { ProjectHeader, ProjectMenu } from "../$projectName";
import { ProjectPullRequestsBadRequestRouteShell } from "./pullRequests";

type PullRequestFormSearch = {
  fromBranch?: string;
  fromProjectId?: number;
  toBranch?: string;
  toProjectId?: number;
};

export const Route = createFileRoute("/$ownerName/$projectName/newPullRequestForm")({
  component: ProjectNewPullRequestRoute,
  validateSearch(search: Record<string, unknown>): PullRequestFormSearch {
    const fromBranch = stringSearch(search.fromBranch);
    const fromProjectId = numberSearch(search.fromProjectId);
    const toBranch = stringSearch(search.toBranch);
    const toProjectId = numberSearch(search.toProjectId);
    return {
      ...(fromBranch ? { fromBranch } : {}),
      ...(fromProjectId > 0 ? { fromProjectId } : {}),
      ...(toBranch ? { toBranch } : {}),
      ...(toProjectId > 0 ? { toProjectId } : {}),
    };
  },
});

function ProjectNewPullRequestRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectNewPullRequestRouteShell runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectNewPullRequestRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  if (!projectQuery.data) {
    return null;
  }
  if (stringField(projectQuery.data.vcs, "GIT").toUpperCase() !== "GIT") {
    return (
      <ProjectPullRequestsBadRequestRouteShell
        ownerName={ownerName}
        projectName={projectName}
        runtimeConfig={runtimeConfig}
      />
    );
  }
  const projectSearchScope = projectQuery.data
    ? {
        organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
        ownerName,
        projectName,
      }
    : { ownerName, projectName };

  return (
    <>
      <title>{`${t("title.newPullRequest")} - ${ownerName}/${projectName}`}</title>
      <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
        <ProjectNewPullRequestScreen project={projectQuery.data} runtimeConfig={runtimeConfig} />
      </SiteLayoutShell>
    </>
  );
}

function ProjectNewPullRequestScreen({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const search = Route.useSearch();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const legacySearch = legacyUrlSearch(locationHref);
  const query = {
    fromBranch: search.fromBranch || stringSearch(legacySearch.get("fromBranch")),
    fromProjectId: search.fromProjectId || numberSearch(legacySearch.get("fromProjectId")),
    toBranch: search.toBranch || stringSearch(legacySearch.get("toBranch")),
    toProjectId: search.toProjectId || numberSearch(legacySearch.get("toProjectId")),
  };
  const formOptionsQuery = useQuery({
    ...pullRequestCreateFormOptionsQueryOptions(runtimeConfig, { ownerName, projectName, query }),
    placeholderData: (previousData) => previousData,
  });

  if (!project) {
    return null;
  }

  if (formOptionsQuery.error instanceof RestApiError && formOptionsQuery.error.status === 400) {
    return (
      <>
        <title>{`${t("error.pullRequest.empty.from.repository")} - ${ownerName}/${projectName}`}</title>
        <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
        <ProjectMenu active="pullRequest" basePath={runtimeConfig.basePath} project={project} />
        <ProjectPullRequestCreateBadRequest
          message={t("error.pullRequest.empty.from.repository")}
        />
      </>
    );
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <ProjectMenu active="pullRequest" basePath={runtimeConfig.basePath} project={project} />
      {formOptionsQuery.data ? (
        <ProjectNewPullRequestBody
          formOptions={formOptionsQuery.data}
          runtimeConfig={runtimeConfig}
        />
      ) : null}
    </>
  );
}

function ProjectPullRequestCreateBadRequest({ message }: { message: string }) {
  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2" />
          <p>{message}</p>
        </div>
      </div>
    </div>
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
  const { language, t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const selected = formOptions.selected;
  const pendingConflictSubmitRef = useRef<HTMLFormElement | null>(null);
  const [formValues, setFormValues] = useState<PullRequestFormSelected>(selected);
  const [titleValue, setTitleValue] = useState("");
  const [bodyValue, setBodyValue] = useState("");
  const [mergeSuggestionRevision, setMergeSuggestionRevision] = useState(0);
  const [forceSubmit, setForceSubmit] = useState(false);
  const [isUserHasTyped, setIsUserHasTyped] = useState(false);
  const [isConflictConfirmOpen, setIsConflictConfirmOpen] = useState(false);
  const mergeResultQuery = useQuery(
    pullRequestMergeResultQueryOptions(runtimeConfig, {
      ownerName,
      projectName,
      query: formValues,
    }),
  );
  const mergeResult = mergeResultQuery.data;
  const mergeResultText = mergeResult ? mergeResultSuggestedText(mergeResult.commits) : null;
  const mergeResultTitle = mergeResultText?.title ?? "";
  const mergeResultBody = mergeResultText?.body ?? "";
  const status = mergeStatus(mergeResult, t);

  useEffect(() => {
    setFormValues({
      fromBranch: selected.fromBranch,
      fromProjectId: selected.fromProjectId,
      toBranch: selected.toBranch,
      toProjectId: selected.toProjectId,
    });
    pendingConflictSubmitRef.current = null;
    setForceSubmit(false);
    setIsConflictConfirmOpen(false);
  }, [selected.fromBranch, selected.fromProjectId, selected.toBranch, selected.toProjectId]);

  useEffect(() => {
    if (isUserHasTyped) {
      return;
    }
    setTitleValue(mergeResultTitle);
    setBodyValue(mergeResultBody);
    setMergeSuggestionRevision((revision) => revision + 1);
  }, [isUserHasTyped, mergeResultBody, mergeResultTitle]);

  useEffect(() => {
    if (mergeResult?.conflict || (!isConflictConfirmOpen && !forceSubmit)) {
      return;
    }
    pendingConflictSubmitRef.current = null;
    setForceSubmit(false);
    setIsConflictConfirmOpen(false);
  }, [forceSubmit, isConflictConfirmOpen, mergeResult?.conflict]);

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

  const closeConflictConfirm = () => {
    pendingConflictSubmitRef.current = null;
    setIsConflictConfirmOpen(false);
  };
  const submitPullRequestForm = (
    form: HTMLFormElement,
    options: { skipConflictConfirm?: boolean } = {},
  ) => {
    if (mutation.isPending) {
      return;
    }
    if (!validatePullRequestMergeResult(mergeResult, t)) {
      return;
    }
    if (mergeResult?.conflict && !forceSubmit && !options.skipConflictConfirm) {
      pendingConflictSubmitRef.current = form;
      setIsConflictConfirmOpen(true);
      return;
    }
    if (!validatePullRequestRequiredFields(new FormData(form), t)) {
      return;
    }
    mutation.mutate(form);
  };

  return (
    <>
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
                submitPullRequestForm(event.currentTarget);
              }}
            >
              <PullRequestBranchSelectors
                formOptions={formOptions}
                onChange={(nextValues, projectChanged) => {
                  setFormValues(nextValues);
                  pendingConflictSubmitRef.current = null;
                  setIsConflictConfirmOpen(false);
                  void router.navigate({
                    to: "/$ownerName/$projectName/newPullRequestForm",
                    params: { ownerName, projectName },
                    search: projectChanged
                      ? {
                          fromBranch: "",
                          fromProjectId: nextValues.fromProjectId,
                          toBranch: "",
                          toProjectId: nextValues.toProjectId,
                        }
                      : nextValues,
                  });
                }}
                selected={formValues}
              />
              <span id="pullRequestState"></span>
              <div id="status" className={`alert mt20 mb20 ${status.cssClass}`}>
                {status.message}
              </div>
              <div>
                <input
                  type="text"
                  id="title"
                  name="title"
                  maxLength={255}
                  className="text"
                  placeholder={t("title")}
                  key={`title-${mergeSuggestionRevision}`}
                  defaultValue={titleValue}
                  onChange={(event) => {
                    setTitleValue(event.currentTarget.value);
                    setIsUserHasTyped(true);
                  }}
                />
                <div style={{ position: "relative" }}>
                  <PullRequestMarkdownEditor
                    bodyValue={bodyValue}
                    mergeSuggestionRevision={mergeSuggestionRevision}
                    onBodyChange={(nextBody) => {
                      setBodyValue(nextBody);
                      setIsUserHasTyped(true);
                    }}
                  />
                </div>
                <PullRequestFileUploader />
                <div className="actions">
                  <button type="submit" className="ybtn ybtn-success">
                    {t("pullRequest.send")}
                  </button>{" "}
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
                      basePath={runtimeConfig.basePath}
                      commitDateLabel={t("code.commitDate")}
                      commitMessageLabel={t("code.commitMsg")}
                      commits={mergeResult.commits}
                      language={language}
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
      <PullRequestConflictConfirmModal
        isOpen={isConflictConfirmOpen}
        message={t("pullRequest.ignore.conflict")}
        onClose={closeConflictConfirm}
        onConfirm={() => {
          if (mutation.isPending) {
            return;
          }
          const form = pendingConflictSubmitRef.current;
          pendingConflictSubmitRef.current = null;
          setIsConflictConfirmOpen(false);
          setForceSubmit(true);
          if (!form) {
            return;
          }
          submitPullRequestForm(form, { skipConflictConfirm: true });
        }}
      />
    </>
  );
}

function PullRequestBranchSelectors({
  formOptions,
  onChange,
  selected,
}: {
  formOptions: PullRequestFormOptionsResponse;
  onChange: (nextValues: PullRequestFormSelected, projectChanged: boolean) => void;
  selected: PullRequestFormSelected;
}) {
  const { t } = useLegacyMessages();
  const fromProjectRef = useRef<HTMLSelectElement>(null);
  const fromBranchRef = useRef<HTMLSelectElement>(null);
  const toProjectRef = useRef<HTMLSelectElement>(null);
  const toBranchRef = useRef<HTMLSelectElement>(null);
  const changeValue = (
    field: keyof PullRequestFormSelected,
    value: string,
    projectChanged = false,
  ) => {
    onChange(
      {
        ...selected,
        [field]: field.endsWith("ProjectId") ? Number(value) || 0 : value,
      },
      projectChanged,
    );
  };
  return (
    <div className="pull-request-wrap">
      <div className="pull-left">
        <label htmlFor="fromProjectId" className="field-title">
          {t("pullRequest.from")}
        </label>
        <PullRequestSelect2Closed
          controlId="fromProjectId"
          controlRef={fromProjectRef}
          label={projectOptionLabel(
            formOptions.fromProjects.find((project) => project.id === selected.fromProjectId) ??
              formOptions.fromProjects[0],
          )}
        />
        <select
          ref={fromProjectRef}
          id="fromProjectId"
          name="fromProjectId"
          className="mr5 select2-offscreen"
          tabIndex={-1}
          defaultValue={String(selected.fromProjectId)}
          key={`from-project-${selected.fromProjectId}`}
          onChange={(event) => changeValue("fromProjectId", event.currentTarget.value, true)}
        >
          <option></option>
          {formOptions.fromProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {projectOptionLabel(project)}
            </option>
          ))}
        </select>{" "}
        <PullRequestSelect2Closed
          controlId="fromBranch"
          controlRef={fromBranchRef}
          label={selected.fromBranch}
          branch
        />
        <select
          ref={fromBranchRef}
          id="fromBranch"
          name="fromBranch"
          data-format="branch"
          data-dropdown-css-class="branches"
          data-placeholder={t("pullRequest.select.branch")}
          className="select2-offscreen"
          tabIndex={-1}
          defaultValue={selected.fromBranch}
          key={`from-branch-${selected.fromBranch}`}
          onChange={(event) => changeValue("fromBranch", event.currentTarget.value)}
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
        <PullRequestSelect2Closed
          controlId="toProjectId"
          controlRef={toProjectRef}
          label={projectOptionLabel(
            formOptions.toProjects.find((project) => project.id === selected.toProjectId) ??
              formOptions.toProjects[0],
          )}
        />
        <select
          ref={toProjectRef}
          id="toProjectId"
          name="toProjectId"
          className="mr5 select2-offscreen"
          tabIndex={-1}
          defaultValue={String(selected.toProjectId)}
          key={`to-project-${selected.toProjectId}`}
          onChange={(event) => changeValue("toProjectId", event.currentTarget.value, true)}
        >
          <option></option>
          {formOptions.toProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {projectOptionLabel(project)}
            </option>
          ))}
        </select>{" "}
        <PullRequestSelect2Closed
          controlId="toBranch"
          controlRef={toBranchRef}
          label={selected.toBranch}
          branch
        />
        <select
          ref={toBranchRef}
          id="toBranch"
          name="toBranch"
          data-format="branch"
          data-dropdown-css-class="branches"
          data-placeholder={t("pullRequest.select.branch")}
          className="select2-offscreen"
          tabIndex={-1}
          defaultValue={selected.toBranch}
          key={`to-branch-${selected.toBranch}`}
          onChange={(event) => changeValue("toBranch", event.currentTarget.value)}
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

function PullRequestSelect2Closed({
  branch = false,
  controlId,
  controlRef,
  label,
}: {
  branch?: boolean;
  controlId: string;
  controlRef: RefObject<HTMLSelectElement | null>;
  label: string;
}) {
  return (
    <div id={`s2id_${controlId}`} className="select2-container" style={{ width: 220 }}>
      <button
        type="button"
        className="select2-choice"
        aria-expanded="false"
        onClick={() => controlRef.current?.focus()}
      >
        <span className="select2-chosen">
          {branch ? <strong className="branch-label branch">branch</strong> : null}
          {branch ? " " : null}
          {label}
        </span>
        <span className="select2-arrow" aria-hidden="true">
          <b></b>
        </span>
      </button>
      <input className="select2-focusser select2-offscreen" type="text" aria-hidden="true" />
      <div className="select2-drop select2-display-none select2-with-searchbox">
        <div className="select2-search">
          <input className="select2-input" type="text" />
        </div>
        <ul className="select2-results"></ul>
      </div>
    </div>
  );
}

function projectOptionLabel(project: { ownerName: string; projectName: string } | undefined) {
  return project ? `${project.ownerName} / ${project.projectName}` : "";
}

function PullRequestMarkdownEditor({
  bodyValue,
  mergeSuggestionRevision,
  onBodyChange,
}: {
  bodyValue: string;
  mergeSuggestionRevision: number;
  onBodyChange: (nextBody: string) => void;
}) {
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
      <div className="tab-content" style={{ position: "relative", overflow: "visible" }}>
        <LegacyMarkdownHelp />
        <div id="edit-body" className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              name="body"
              className="editorSeries content comment nm"
              data-editor-mode="content-body"
              id="editor-body-body"
              key={`body-${mergeSuggestionRevision}`}
              defaultValue={bodyValue}
              onChange={(event) => onBodyChange(event.currentTarget.value)}
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
  const pasteSupported =
    typeof document !== "undefined" &&
    "onpaste" in document &&
    typeof FormData !== "undefined" &&
    typeof FileReader !== "undefined";
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
        <span
          className="help help-pastable"
          style={pasteSupported ? { display: "block" } : undefined}
        >
          {t("common.attach.pastehere")}
        </span>
      </div>
      <ul className="attached-files unstyled"></ul>
      <p className="right-txt help">
        <i className="yobicon-supportrequest"></i> {t("common.attach.attachIfYouSave")}
      </p>
    </div>
  );
}

function PullRequestConflictConfirmModal({
  isOpen,
  message,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLegacyMessages();
  return (
    <>
      <div
        id="pullRequestConflictConfirm"
        className={isOpen ? "modal hide yobiDialog in" : "modal hide yobiDialog"}
        tabIndex={-1}
        role="dialog"
        aria-hidden={isOpen ? "false" : "true"}
        style={{ display: isOpen ? "block" : "none" }}
      >
        <div className="btn-dismiss">
          <button type="button" className="btn-transparent" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="message">
          <div className="center-txt">
            <p className="msg">{message}</p>
          </div>
          <div className="center-txt buttons mt20 mb20">
            <button type="button" className="ybtn ybtn-default" onClick={onClose}>
              {t("button.cancel")}
            </button>
            <button type="button" className="ybtn ybtn-primary" onClick={onConfirm}>
              {t("button.confirm")}
            </button>
          </div>
        </div>
      </div>
      {isOpen ? <div className="modal-backdrop in"></div> : null}
    </>
  );
}

function MergeResult({
  authorLabel,
  basePath,
  commitDateLabel,
  commitMessageLabel,
  commits,
  language,
  noChangesLabel,
  ownerName,
  projectName,
}: {
  authorLabel: string;
  basePath: string;
  commitDateLabel: string;
  commitMessageLabel: string;
  commits: PullRequestCommit[];
  language: string;
  noChangesLabel: string;
  ownerName: string;
  projectName: string;
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
                  >
                    {commit.commitShortId}
                  </Link>
                </td>
                <td className="messages">
                  <span className="commitMsg short">{commit.commitMessage}</span>
                </td>
                <td className="date" title={commit.authorDateLabel}>
                  {legacyRelativeDateLabel(commit.authorDateLabel, language)}
                </td>
                <td className={`author ${commit.authorEmail}`}>
                  <div className="avatar-wrap">
                    <img
                      src={prefixBasePath(basePath, "/legacy-assets/images/default-avatar-128.png")}
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

function legacyUrlSearch(locationHref: string): URLSearchParams {
  const queryIndex = locationHref.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? locationHref.slice(queryIndex) : "");
}

function legacyRelativeDateLabel(rawLabel: string, language: string, now = Date.now()) {
  if (language !== "ko-KR" || rawLabel === "") return rawLabel;
  const timestamp = Date.parse(rawLabel);
  if (Number.isNaN(timestamp)) return rawLabel;
  const elapsedSeconds = Math.floor((now - timestamp) / 1000);
  if (elapsedSeconds < 0) return rawLabel;
  if (elapsedSeconds < 60) return "방금 전";
  if (elapsedSeconds < 60 * 60) return `${Math.floor(elapsedSeconds / 60)}분 전`;
  if (elapsedSeconds < 24 * 60 * 60) return `${Math.floor(elapsedSeconds / (60 * 60))}시간 전`;
  if (elapsedSeconds < 30 * 24 * 60 * 60)
    return `${Math.floor(elapsedSeconds / (24 * 60 * 60))}일 전`;
  return rawLabel;
}

function stringFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function stringSearch(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberSearch(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return projectIsProtected(project) ? ownerName : undefined;
}

function projectIsProtected(project: ProjectContainer) {
  const record = recordField(project);
  return booleanField(record.isProtected) || stringField(record.projectScope, "") === "protected";
}

function booleanField(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function recordField(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function mergeResultSuggestedText(commits: PullRequestCommit[]): { body: string; title: string } {
  if (commits.length === 0) {
    return { body: "", title: "" };
  }
  if (commits.length === 1) {
    const [title = "", ...bodyLines] = commits[0].commitMessage.split(/\r?\n/u);
    return { body: bodyLines.join("\n").trim(), title };
  }
  return {
    body: commits.map((commit) => commit.commitMessage.split(/\r?\n/u)[0] ?? "").join("\n"),
    title: "",
  };
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
