import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { listProjectLabelsQueryOptions } from "../../../api/project-labels";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer, ProjectMilestone, YonaRecord } from "../../../api/types";
import {
  createIssue,
  listProjectMilestones,
  listIssueParentOptions,
  readSessionBootstrap,
} from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { LegacyMarkdownHelp } from "../../-legacy-markdown-help";
import { ProjectHeader, ProjectMenu } from "../$projectName";

type IssueFormSearch = {
  commentId: string;
  parentIssueId: string;
};

export const Route = createFileRoute("/$ownerName/$projectName/issueform")({
  component: ProjectIssueFormRoute,
  validateSearch(search: Record<string, unknown>): IssueFormSearch {
    return {
      commentId: stringSearch(search.commentId),
      parentIssueId: stringSearch(search.parentIssueId),
    };
  },
});

function ProjectIssueFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectIssueFormScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectIssueFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const legacySearch = legacyUrlSearch(locationHref);
  const parentIssueId = search.parentIssueId || stringSearch(legacySearch.get("parentIssueId"));
  const commentId = search.commentId || stringSearch(legacySearch.get("commentId"));
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const labelsQuery = useQuery(
    listProjectLabelsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const parentOptionsQuery = useQuery({
    queryFn: () => listIssueParentOptions(runtimeConfig, ownerName, projectName),
    queryKey: ["project", ownerName, projectName, "issues", "parent-options"],
  });
  const openMilestonesQuery = useQuery({
    queryFn: () =>
      listProjectMilestones(runtimeConfig, ownerName, projectName, {
        orderBy: "dueDate",
        orderDir: "asc",
        state: "open",
      }),
    queryKey: ["project", ownerName, projectName, "milestones", "open", "issue-form"],
  });

  if (
    !projectQuery.data ||
    !labelsQuery.data ||
    !parentOptionsQuery.data ||
    !openMilestonesQuery.data
  ) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="issue" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectIssueFormBody
        labels={labelsQuery.data.labels}
        milestones={openMilestonesQuery.data.milestones}
        parentIssueId={parentIssueId}
        parentOptions={parentOptionsQuery.data.items}
        project={projectQuery.data}
        referCommentId={commentId}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectIssueFormBody({
  labels,
  milestones,
  parentIssueId,
  parentOptions,
  project,
  referCommentId,
  runtimeConfig,
}: {
  labels: YonaRecord[];
  milestones: ProjectMilestone[];
  parentIssueId: string;
  parentOptions: Array<{
    id: bigint | number;
    issueNumber: bigint | number;
    selected: boolean;
    title: string;
  }>;
  project: ProjectContainer;
  referCommentId: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ownerName, projectName } = Route.useParams();
  const menuSetting = (project as YonaRecord).menuSetting;
  const showMilestoneOption =
    typeof menuSetting === "object" &&
    menuSetting !== null &&
    booleanField((menuSetting as YonaRecord).milestone);
  const [titleErrors, setTitleErrors] = useState<string[]>([]);
  const draftSubmitRef = useRef(false);
  const mutation = useMutation({
    mutationFn: async ({ form, isDraft }: { form: HTMLFormElement; isDraft: boolean }) => {
      const formData = new FormData(form);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createIssue(runtimeConfig, csrfToken, {
        assigneeLoginId: stringFormValue(formData, "assigneeLoginId"),
        bodyMarkdown: stringFormValue(formData, "body"),
        dueDate: stringFormValue(formData, "dueDate"),
        isDraft,
        labelIds: formData.getAll("labelIds").map((value) => Number(value)),
        milestoneId: Number(stringFormValue(formData, "milestoneId")) || undefined,
        ownerName,
        parentIssueId: stringFormValue(formData, "parentIssueId"),
        projectName,
        referCommentId: stringFormValue(formData, "referCommentId"),
        title: stringFormValue(formData, "title"),
      });
    },
    onSuccess(issue) {
      queryClient.invalidateQueries({ queryKey: ["project", ownerName, projectName, "issues"] });
      router.history.push(
        prefixBasePath(
          runtimeConfig.basePath,
          `/${ownerName}/${projectName}/issue/${stringField(issue.issueNumber, "")}`,
        ),
      );
    },
  });

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <form
            action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/issues`)}
            id="issue-form"
            encType="multipart/form-data"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const isDraft = draftSubmitRef.current;
              draftSubmitRef.current = false;
              const title = stringFormValue(new FormData(form), "title");
              if (title.trim() === "") {
                setTitleErrors([t("validation.required")]);
                return;
              }
              setTitleErrors([]);
              mutation.mutate({ form, isDraft });
            }}
          >
            <div className="row-fluid">
              <div className="span12">
                <dl>
                  <dd>
                    <div className="span12">
                      <div className="span11">
                        <LegacyTabIndexInput
                          tabIndexValue="1"
                          type="text"
                          id="title"
                          name="title"
                          defaultValue=""
                          className={titleErrors.length > 0 ? "text title error" : "text title "}
                          maxLength={250}
                          placeholder={t("title")}
                          autoComplete="off"
                          title={t("title.help.key")}
                          onChange={(event) => {
                            if (event.currentTarget.value.trim() !== "") {
                              setTitleErrors([]);
                            }
                          }}
                        />
                      </div>
                      <div className="span1 subtask-message">{t("issue.option")}</div>
                    </div>
                    {titleErrors.length > 0 ? (
                      <div className="message">
                        {titleErrors.map((error) => (
                          <div key={error}>{error}</div>
                        ))}
                      </div>
                    ) : null}
                    <SubtaskSelects
                      parentIssueId={parentIssueId}
                      parentOptions={parentOptions}
                      project={project}
                    />
                  </dd>
                </dl>
              </div>

              <div className="row-fluid">
                <div className="span9 span-left-pane">
                  <dl>
                    <dd style={{ position: "relative" }}>
                      <IssueMarkdownEditor />
                    </dd>
                  </dl>

                  <IssuePostFileUploader />

                  <div className="actrow right-txt">
                    <button type="submit" id="button-save" className="ybtn ybtn-success">
                      {t("button.save")}
                    </button>
                    <button
                      type="button"
                      id="draft-save-btn"
                      className="ybtn ybtn-watching draft-save-btn"
                      onClick={(event) => {
                        draftSubmitRef.current = true;
                        event.currentTarget.form?.requestSubmit();
                      }}
                    >
                      {t("button.draft.save")}
                    </button>
                    <button type="button" className="ybtn" onClick={() => router.history.back()}>
                      {t("button.cancel")}
                    </button>
                  </div>
                </div>
                <div className="span3 span-hard-wrap right-menu">
                  <dl className="issue-option">
                    <dt>{t("issue.assignee")}</dt>
                    <dd>
                      <input
                        type="hidden"
                        className="bigdrop"
                        id="assignee"
                        name="assigneeLoginId"
                        placeholder={t("issue.noAssignee")}
                        defaultValue=""
                        style={{ width: "100%" }}
                        title=""
                      />
                    </dd>
                  </dl>

                  {showMilestoneOption ? (
                    <IssueMilestoneSelect
                      milestones={milestones}
                      ownerName={ownerName}
                      projectName={projectName}
                    />
                  ) : null}

                  <dl className="issue-option">
                    <dt>{t("issue.dueDate")}</dt>
                    <dd>
                      <div className="search search-bar">
                        <input
                          type="text"
                          id="issueDueDate"
                          data-toggle="calendar"
                          name="dueDate"
                          className="textbox full"
                        />
                        <button type="button" className="search-btn btn-calendar">
                          <i className="yobicon-calendar2"></i>
                        </button>
                      </div>
                    </dd>
                  </dl>

                  <IssueLabelSelect
                    labels={labels}
                    ownerName={ownerName}
                    projectName={projectName}
                  />
                  <input type="hidden" name="referCommentId" value={referCommentId} />
                  <input type="hidden" id="isDraft" name="isDraft" value="false" />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function LegacyTabIndexInput({
  tabIndexValue,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { tabIndexValue: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.setAttribute("tabindex", tabIndexValue);
  }, [tabIndexValue]);
  return <input ref={inputRef} {...props} />;
}

function IssueMarkdownEditor() {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    bodyRef.current?.setAttribute("tabindex", "2");
  }, []);
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
              ref={bodyRef}
              name="body"
              className="editorSeries content comment nm"
              data-editor-mode="content-body"
              id="editor-body-body"
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

function IssuePostFileUploader() {
  const { t } = useLegacyMessages();
  return (
    <div id="upload" className="upload-wrap content-footer" data-resource-type="ISSUE_POST">
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

function IssueMilestoneSelect({
  milestones,
  ownerName,
  projectName,
}: {
  milestones: ProjectMilestone[];
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <dl id="milestoneOption" className="issue-option">
      <dt>{t("milestone")}</dt>
      <dd>
        {milestones.length === 0 ? (
          <Link
            to="/$ownerName/$projectName/newMilestoneForm"
            params={{ ownerName, projectName }}
            className="ybtn ybtn-small ybtn-fullsize"
            target="_blank"
          >
            {t("milestone.menu.new")}
          </Link>
        ) : (
          <select
            id="milestoneId"
            name="milestoneId"
            data-toggle="select2"
            data-format="milestone"
            data-container-css-class="fullsize"
            defaultValue="-1"
          >
            <option value="-1">{t("issue.noMilestone")}</option>
            {milestones.map((milestone) => (
              <option
                key={stringField(milestone.id, "")}
                value={stringField(milestone.id, "")}
                data-state={stringField(milestone.state, "")}
              >
                {stringField(milestone.title, "")}
              </option>
            ))}
          </select>
        )}
      </dd>
    </dl>
  );
}

function SubtaskSelects({
  parentIssueId,
  parentOptions,
  project,
}: {
  parentIssueId: string;
  parentOptions: Array<{
    id: bigint | number;
    issueNumber: bigint | number;
    selected: boolean;
    title: string;
  }>;
  project: ProjectContainer;
}) {
  const { t } = useLegacyMessages();
  const showOption = parentIssueId !== "";

  return (
    <div className={`subtask-wrap ${showOption ? "show" : ""}`}>
      <div className="span3">
        <select
          id="targetProjectId"
          name="targetProjectId"
          data-format="projects"
          data-placeholder={t("organization.choose.projects")}
          data-toggle="select2"
          data-container-css-class="fullsize"
          disabled={!showOption}
        >
          <option value={stringField(project.id, "")} data-avatar-url={projectLogoUrl(project)}>
            {stringField(project.projectName, "")}
          </option>
        </select>
      </div>
      <div className="span6">
        <select
          id="parentId"
          name="parentIssueId"
          data-format="issues"
          data-placeholder={t("organization.choose.projects")}
          data-toggle="select2"
          data-container-css-class="fullsize"
          disabled={!showOption}
          defaultValue={parentIssueId}
        >
          <option value="">{t("issue.subtask.select")}</option>
          {parentOptions.map((issue) => (
            <option key={String(issue.id)} value={String(issue.id)}>
              #{String(issue.issueNumber)}. {issue.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function IssueLabelSelect({
  labels,
  ownerName,
  projectName,
}: {
  labels: YonaRecord[];
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  if (labels.length === 0) {
    return null;
  }

  return (
    <dl className="issue-option">
      <dt>
        {t("label")}{" "}
        <Link
          activeOptions={{
            exact: true,
            explicitUndefined: true,
            includeHash: true,
            includeSearch: true,
          }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          to="/$ownerName/$projectName/issue/labelsform"
          params={{ ownerName, projectName }}
          target="_blank"
          className="label-edit"
        >
          [{t("button.edit")}]
        </Link>
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
          data-placeholder={t("label.select")}
          data-close-on-select="false"
          className="hide"
        >
          <option></option>
          {groupLabels(labels).map((group) => (
            <optgroup
              key={group.categoryId}
              label={group.categoryName}
              data-category-id={group.categoryId}
              data-category-is-exclusive={String(group.categoryIsExclusive)}
            >
              {group.labels.map((label) => (
                <option
                  key={label.id}
                  value={label.id}
                  data-category-id={group.categoryId}
                  data-category-is-exclusive={String(group.categoryIsExclusive)}
                >
                  {label.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </dd>
    </dl>
  );
}

function groupLabels(labels: YonaRecord[]) {
  const groups = new Map<
    string,
    {
      categoryId: string;
      categoryIsExclusive: boolean;
      categoryName: string;
      labels: Array<{ id: string; name: string }>;
    }
  >();
  for (const label of labels) {
    const categoryId = stringField(label.categoryId, "");
    const group = groups.get(categoryId) ?? {
      categoryId,
      categoryIsExclusive: booleanField(label.categoryIsExclusive),
      categoryName: stringField(label.categoryName, ""),
      labels: [],
    };
    group.labels.push({ id: stringField(label.id, ""), name: stringField(label.name, "") });
    groups.set(categoryId, group);
  }
  return Array.from(groups.values());
}

function projectLogoUrl(project: ProjectContainer) {
  return stringField((project as YonaRecord).logoUrl, "/assets/images/project_default_logo.png");
}

function stringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function stringSearch(value: unknown) {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
      ? String(value)
      : "";
}

function legacyUrlSearch(locationHref: string) {
  const queryStart = locationHref.indexOf("?");
  const hashStart = locationHref.indexOf("#", queryStart);
  if (queryStart === -1) {
    return new URLSearchParams();
  }
  return new URLSearchParams(
    locationHref.slice(queryStart + 1, hashStart === -1 ? undefined : hashStart),
  );
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

function booleanField(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}
