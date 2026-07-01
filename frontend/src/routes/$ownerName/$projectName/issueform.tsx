import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { listProjectLabelsQueryOptions } from "../../../api/project-labels";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer, YonaRecord } from "../../../api/types";
import {
  createIssue,
  listIssueParentOptions,
  readSessionBootstrap,
} from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
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

  if (!projectQuery.data || !labelsQuery.data || !parentOptionsQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="issue" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectIssueFormBody
        labels={labelsQuery.data.labels}
        parentIssueId={search.parentIssueId}
        parentOptions={parentOptionsQuery.data.items}
        project={projectQuery.data}
        referCommentId={search.commentId}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectIssueFormBody({
  labels,
  parentIssueId,
  parentOptions,
  project,
  referCommentId,
  runtimeConfig,
}: {
  labels: YonaRecord[];
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
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createIssue(runtimeConfig, csrfToken, {
        assigneeLoginId: stringFormValue(formData, "assigneeLoginId"),
        bodyMarkdown: stringFormValue(formData, "body"),
        dueDate: stringFormValue(formData, "dueDate"),
        isDraft: stringFormValue(formData, "isDraft") === "true",
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
              mutation.mutate(event.currentTarget);
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
                          className="text title "
                          maxLength={250}
                          placeholder={t("title")}
                          autoComplete="off"
                          title={t("title.help.key")}
                        />
                      </div>
                      <div className="span1 subtask-message">{t("issue.option")}</div>
                    </div>
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
                      <div data-toggle="markdown-editor" className="markdown-editor-wrap">
                        <LegacyTabIndexTextarea
                          tabIndexValue="2"
                          id="editor-body-content-body"
                          name="body"
                          data-editor-mode="content-body"
                        ></LegacyTabIndexTextarea>
                        <div id="preview-content-body" className="preview markdown-wrap"></div>
                      </div>
                    </dd>
                  </dl>

                  <div className="upload-wrap content-footer" data-resource-type="ISSUE_POST">
                    <div className="attach-wrap">
                      <div className="attachments" id="attachments"></div>
                    </div>
                  </div>

                  <div className="actrow right-txt">
                    <button type="submit" id="button-save" className="ybtn ybtn-success">
                      {t("button.save")}
                    </button>
                    <button
                      type="button"
                      id="draft-save-btn"
                      className="ybtn ybtn-watching draft-save-btn"
                      onClick={(event) => {
                        const form = event.currentTarget.form;
                        form
                          ?.querySelector<HTMLInputElement>("#isDraft")
                          ?.setAttribute("value", "true");
                        form?.requestSubmit();
                      }}
                    >
                      {t("button.draft.save")}
                    </button>
                    <HistoryBackLink>{t("button.cancel")}</HistoryBackLink>
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
                    basePath={runtimeConfig.basePath}
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

function LegacyTabIndexTextarea({
  tabIndexValue,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { tabIndexValue: string }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textareaRef.current?.setAttribute("tabindex", tabIndexValue);
  }, [tabIndexValue]);
  return <textarea ref={textareaRef} {...props}></textarea>;
}

function HistoryBackLink({ children }: { children: string }) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    anchorRef.current?.setAttribute("href", "javascript:history.back();");
  }, []);
  return (
    <a ref={anchorRef} href="/" className="ybtn">
      {children}
    </a>
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
  basePath,
  labels,
  ownerName,
  projectName,
}: {
  basePath: string;
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
        <a
          href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/labelsform`)}
          target="_blank"
          className="label-edit"
        >
          [{t("button.edit")}]
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
  return typeof value === "string" ? value : "";
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
