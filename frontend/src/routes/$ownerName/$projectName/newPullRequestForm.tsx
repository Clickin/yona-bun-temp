import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PullRequestFileUploader } from "../../../components/file-uploader";
import { PullRequestMarkdownEditor } from "../../../components/markdown-editor";
import { createFileRoute, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import legacySpriteUrl from "../../../assets/legacy/sprite.png";
import { formatLegacyTimestamp, useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
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
  return <ProjectNewPullRequestRouteShell runtimeConfig={runtimeConfig} />;
}

function ProjectNewPullRequestRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  if (!projectQuery.data) {
    return <ProjectNewPullRequestLoadingShell />;
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
  return <ProjectNewPullRequestScreen project={projectQuery.data} runtimeConfig={runtimeConfig} />;
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
    retry: false,
  });

  if (!project) {
    return <ProjectNewPullRequestLoadingShell />;
  }

  if (formOptionsQuery.data) {
    return (
      <>
        <title>{`${t("title.newPullRequest")} - ${ownerName}/${projectName}`}</title>
        <ProjectNewPullRequestBody
          formOptions={formOptionsQuery.data}
          runtimeConfig={runtimeConfig}
        />
      </>
    );
  }

  if (!formOptionsQuery.error) {
    return <ProjectNewPullRequestLoadingShell />;
  }

  const isBadRequest =
    formOptionsQuery.error instanceof RestApiError && formOptionsQuery.error.status === 400;
  return (
    <>
      <title>{`${t(isBadRequest ? "error.pullRequest.empty.from.repository" : "title.newPullRequest")} - ${ownerName}/${projectName}`}</title>
      {isBadRequest ? (
        <ProjectPullRequestCreateBadRequest
          message={t("error.pullRequest.empty.from.repository")}
        />
      ) : null}
    </>
  );
}

function ProjectNewPullRequestLoadingShell() {
  return (
    <div className="page-wrap-outer" data-owner="new-pull-request-loading-shell">
      <div className="project-page-wrap">
        <div
          className="content-wrap frm-wrap"
          data-owner="new-pull-request-loading-form"
          data-content-ready="false"
        ></div>
      </div>
    </div>
  );
}

function ProjectPullRequestCreateBadRequest({ message }: { message: string }) {
  const errorIconStyle = {
    backgroundImage: `url(${legacySpriteUrl})`,
    backgroundPosition: "-80px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "80px",
    verticalAlign: "middle",
    width: "50px",
  };
  return (
    <div className="page-wrap-outer" data-owner="new-pull-request-error-page">
      <div className="project-page-wrap">
        <div className="error-wrap" data-owner="new-pull-request-error-wrap">
          <i
            style={errorIconStyle}
            className="ico ico-err2"
            data-owner="new-pull-request-error-icon"
          ></i>
          <p data-owner="new-pull-request-error-message">{message}</p>
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
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const selected = formOptions.selected;
  const sourceProject = formOptions.fromProjects.find(
    (project) => project.id === formOptions.selected.fromProjectId,
  );
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
      <div className="page-wrap-outer" data-owner="new-pull-request-page">
        <div className="project-page-wrap">
          <div
            className="content-wrap frm-wrap"
            data-owner="new-pull-request-form"
            data-content-ready="true"
          >
            <form
              action={prefixBasePath(
                runtimeConfig.basePath,
                `/${ownerName}/${projectName}/pullRequests`,
              )}
              encType="multipart/form-data"
              className="new-pr-form nm"
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
                <div
                  data-owner="new-pull-request-editor-wrapper"
                  // legacy editor.scala.html wraps the tab nav + tab-content in
                  // <div style="position:relative">; the mt10 editor sits inside
                  style={{ position: "relative" }}
                >
                  <PullRequestMarkdownEditor
                    bodyValue={bodyValue}
                    mergeSuggestionRevision={mergeSuggestionRevision}
                    onBodyChange={(nextBody) => {
                      setBodyValue(nextBody);
                      setIsUserHasTyped(true);
                    }}
                    wrapperClassName="mt10"
                    tabContentClassName="tab-content"
                    tabContentPaneStyleProps={{
                      // legacy editor.scala.html:48 <div class="tab-content"
                      // style="position:relative;overflow: visible">
                      style: { overflow: "visible", position: "relative" },
                    }}
                    owners={{
                      wrapper: "new-pull-request-markdown-editor-wrapper",
                      tabContent: "new-pull-request-editor-tab-content",
                    }}
                  />
                </div>
                <PullRequestFileUploader
                  helpClassName="help"
                  pasteHelpStyleProps={{ style: { display: "block" } }}
                  owners={{
                    pasteHelp: "project-new-pull-request-form-paste-help",
                    saveHelp: "new-pull-request-upload-save-help",
                  }}
                />
                <div className="actions">
                  <button type="submit" className="ybtn ybtn-success">
                    {t("pullRequest.send")}
                  </button>{" "}
                  <button type="button" className="ybtn" onClick={() => router.history.back()}>
                    {t("button.cancel")}
                  </button>
                </div>
              </div>
              <ul className="nav nav-tabs mt20" data-owner="new-pull-request-tabs">
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
                    <PullRequestMergeResult
                      basePath={runtimeConfig.basePath}
                      commits={mergeResult.commits}
                      ownerName={sourceProject?.ownerName ?? ownerName}
                      projectName={sourceProject?.projectName ?? projectName}
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
    <div className="pull-request-wrap" data-owner="new-pull-request-selectors">
      <div className="pull-left" data-owner="new-pull-request-from-column">
        <label
          htmlFor="fromProjectId"
          className="field-title"
          data-owner="new-pull-request-field-title"
        >
          {t("pullRequest.from")}
        </label>
        <PullRequestSelect2
          controlId="fromProjectId"
          value={String(selected.fromProjectId)}
          options={formOptions.fromProjects.map((project) => ({
            value: String(project.id),
            label: projectOptionLabel(project),
          }))}
          onChange={(value) => changeValue("fromProjectId", value, true)}
        />
        <select
          id="fromProjectId"
          name="fromProjectId"
          className="mr5 select2-offscreen"
          tabIndex={-1}
          defaultValue={String(selected.fromProjectId)}
          key={`from-project-${selected.fromProjectId}`}
          onChange={(event) => changeValue("fromProjectId", event.currentTarget.value, true)}
          data-owner="new-pull-request-from-project-original"
        >
          <option></option>
          {formOptions.fromProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {projectOptionLabel(project)}
            </option>
          ))}
        </select>{" "}
        <PullRequestSelect2
          controlId="fromBranch"
          value={selected.fromBranch}
          options={formOptions.fromBranches.map((branch) => ({
            value: branch.name,
            label: branch.name,
          }))}
          onChange={(value) => changeValue("fromBranch", value)}
          branch
        />
        <select
          id="fromBranch"
          name="fromBranch"
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
      <div className="arrow" data-owner="new-pull-request-arrow">
        <i className="yobicon-right-2"></i>
      </div>
      <div className="pull-right" data-owner="new-pull-request-to-column">
        <label
          htmlFor="toProjectId"
          className="field-title"
          data-owner="new-pull-request-field-title"
        >
          {t("pullRequest.to")}
        </label>
        <PullRequestSelect2
          controlId="toProjectId"
          value={String(selected.toProjectId)}
          options={formOptions.toProjects.map((project) => ({
            value: String(project.id),
            label: projectOptionLabel(project),
          }))}
          onChange={(value) => changeValue("toProjectId", value, true)}
        />
        <select
          id="toProjectId"
          name="toProjectId"
          className="mr5 select2-offscreen"
          tabIndex={-1}
          defaultValue={String(selected.toProjectId)}
          key={`to-project-${selected.toProjectId}`}
          onChange={(event) => changeValue("toProjectId", event.currentTarget.value, true)}
          data-owner="new-pull-request-to-project-original"
        >
          <option></option>
          {formOptions.toProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {projectOptionLabel(project)}
            </option>
          ))}
        </select>{" "}
        <PullRequestSelect2
          controlId="toBranch"
          value={selected.toBranch}
          options={formOptions.toBranches.map((branch) => ({
            value: branch.name,
            label: branch.name,
          }))}
          onChange={(value) => changeValue("toBranch", value)}
          branch
        />
        <select
          id="toBranch"
          name="toBranch"
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

export function PullRequestSelect2({
  branch = false,
  controlId,
  disabled = false,
  onChange,
  options,
  owner = "new-pull-request",
  value,
}: {
  branch?: boolean;
  controlId: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  options: { label: string; value: string }[];
  owner?: string;
  value: string;
}) {
  const { t } = useLegacyMessages();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const choiceRef = useRef<HTMLButtonElement>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";
  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(term.trim().toLowerCase()),
  );
  const choose = (nextValue: string) => {
    setOpen(false);
    setTerm("");
    choiceRef.current?.focus();
    onChange?.(nextValue);
  };

  return (
    <div
      id={`s2id_${controlId}`}
      className={`select2-container${disabled ? " select2-container-disabled" : ""}${branch ? "" : " mr5"}${open ? " select2-container-active select2-dropdown-open" : ""}`}
      data-owner={`${owner}-${controlId}-picker`}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setTerm("");
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          setTerm("");
          choiceRef.current?.focus();
        }
      }}
    >
      <button
        ref={choiceRef}
        type="button"
        className="select2-choice"
        data-owner={`${owner}-${controlId}-select2-choice`}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`select2-results-${controlId}`}
        onClick={() => {
          setTerm("");
          setOpen((current) => !current);
        }}
      >
        <span className="select2-chosen">
          {branch && selectedLabel ? (
            <>
              <strong className="branch-label branch">branch</strong>{" "}
              {selectedLabel.replace(/^refs\/heads\//u, "")}
            </>
          ) : (
            selectedLabel || (branch ? t("pullRequest.select.branch") : "")
          )}
        </span>
        <span className="select2-arrow" aria-hidden="true">
          <b></b>
        </span>
      </button>
      {open ? (
        <div
          className={`select2-drop select2-drop-active select2-with-searchbox${branch ? " branches" : ""}`}
        >
          <div className="select2-search">
            <input
              className="select2-input"
              type="text"
              autoComplete="off"
              autoFocus
              value={term}
              aria-label={branch ? t("pullRequest.select.branch") : t("title.project")}
              onChange={(event) => setTerm(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && visibleOptions[0]) {
                  event.preventDefault();
                  choose(visibleOptions[0].value);
                }
              }}
            />
          </div>
          <ul id={`select2-results-${controlId}`} className="select2-results" role="listbox">
            {visibleOptions.map((option) => (
              <li
                key={option.value}
                className="select2-result select2-result-selectable"
                role="option"
                aria-selected={option.value === value}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    choose(option.value);
                  }
                }}
                onClick={() => choose(option.value)}
              >
                <div className="select2-result-label">
                  {branch ? (
                    <>
                      <strong className="branch-label branch">branch</strong>{" "}
                      {option.label.replace(/^refs\/heads\//u, "")}
                    </>
                  ) : (
                    option.label
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function projectOptionLabel(project: { ownerName: string; projectName: string } | undefined) {
  return project ? `${project.ownerName} / ${project.projectName}` : "";
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
        tabIndex={-1}
        role="dialog"
        aria-hidden={isOpen ? "false" : "true"}
        className={`modal hide yobiDialog${isOpen ? " in" : ""}`}
        data-owner="new-pull-request-conflict-modal"
      >
        <div className="btn-dismiss">
          <button type="button" className="btn-transparent" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="message">
          <div data-owner="new-pull-request-conflict-message">
            <p className="msg">{message}</p>
          </div>
          <div
            className="center-txt buttons mt20 mb20"
            data-owner="new-pull-request-conflict-actions"
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
      {isOpen ? <div className="modal-backdrop in"></div> : null}
    </>
  );
}

export function PullRequestMergeResult({
  basePath,
  commits,
  ownerName,
  projectName,
}: {
  basePath: string;
  commits: PullRequestCommit[];
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  if (!commits.length) {
    return (
      <div id="mergeResult" className="code-browser-wrap">
        <div>
          <h5>{t("pullRequest.diff.noChanges")}</h5>
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
                <strong>{t("code.commitMsg")}</strong>
              </td>
              <td className="date">
                <strong>{t("code.commitDate")}</strong>
              </td>
              <td className="author">
                <strong>{t("code.author")}</strong>
              </td>
            </tr>
          </thead>
          <tbody className="tbody">
            {commits.map((commit) => (
              <PullRequestMergeCommit
                key={commit.commitId}
                basePath={basePath}
                commit={commit}
                ownerName={ownerName}
                projectName={projectName}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PullRequestMergeCommit({
  basePath,
  commit,
  ownerName,
  projectName,
}: {
  basePath: string;
  commit: PullRequestCommit;
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const [expanded, setExpanded] = useState(false);
  const lines = commit.commitMessage.split("\n");
  const date = formatLegacyTimestamp(commit.authorDateLabel, t);
  const avatar = (
    <img
      src={
        commit.authorAvatarUrl ||
        prefixBasePath(basePath, "/legacy-assets/images/default-avatar-128.png")
      }
      width="32"
      height="32"
      alt={commit.authorName}
    />
  );
  return (
    <tr>
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
        <Link
          className="commitMsg short"
          to="/$ownerName/$projectName/commit/$commitId"
          params={{ commitId: commit.commitId, ownerName, projectName }}
          search={{ branch: "", path: "" }}
        >
          {lines[0] || t("code.commitMsg.empty")}
        </Link>
        {lines.length > 1 ? (
          <>
            <button
              type="button"
              className="commitMsg moreBtn"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
            >
              <span>&hellip;</span>
            </button>
            <pre className={`commitMsg desc${expanded ? "" : " hidden"}`}>
              {lines.slice(1).join("\n")}
            </pre>
          </>
        ) : null}
      </td>
      <td className="date" title={date.title}>
        {date.label}
      </td>
      <td className={`author ${commit.authorEmail}`}>
        {commit.authorLoginId ? (
          <Link to="/$user" params={{ user: commit.authorLoginId }} className="avatar-wrap">
            {avatar}
          </Link>
        ) : (
          <div className="avatar-wrap">{avatar}</div>
        )}
      </td>
    </tr>
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

function numberSearch(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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
