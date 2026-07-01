import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { listProjectLabelsQueryOptions } from "../../../../../api/project-labels";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import type { ProjectContainer, YonaRecord } from "../../../../../api/types";
import {
  listIssueParentOptions,
  readIssueDetail,
  readSessionBootstrap,
  updateIssue,
  type RestIssueDetailResponse,
} from "../../../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../../i18n";
import { YonaQueryProvider } from "../../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import { SiteLayoutShell } from "../../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/issue/$issueNumber/editform")({
  component: ProjectIssueEditFormRoute,
});

function ProjectIssueEditFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectIssueEditFormScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectIssueEditFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, issueNumber } = Route.useParams();
  const numericIssueNumber = Number(issueNumber) || 0;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const labelsQuery = useQuery(
    listProjectLabelsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const issueQuery = useQuery({
    queryFn: () => readIssueDetail(runtimeConfig, ownerName, projectName, numericIssueNumber),
    queryKey: ["project", ownerName, projectName, "issues", numericIssueNumber],
  });
  const parentOptionsQuery = useQuery({
    queryFn: () =>
      listIssueParentOptions(runtimeConfig, ownerName, projectName, {
        currentIssueNumber: numericIssueNumber,
      }),
    queryKey: ["project", ownerName, projectName, "issues", "parent-options", numericIssueNumber],
  });

  if (!projectQuery.data || !labelsQuery.data || !issueQuery.data || !parentOptionsQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="issue" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectIssueEditFormBody
        issue={issueQuery.data}
        labels={labelsQuery.data.labels}
        parentOptions={parentOptionsQuery.data.items}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectIssueEditFormBody({
  issue,
  labels,
  parentOptions,
  project,
  runtimeConfig,
}: {
  issue: RestIssueDetailResponse;
  labels: YonaRecord[];
  parentOptions: Array<{
    id: bigint | number;
    issueNumber: bigint | number;
    selected: boolean;
    title: string;
  }>;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ownerName, projectName, issueNumber } = Route.useParams();
  const numericIssueNumber = Number(issueNumber) || 0;
  const issueRecord = issue as YonaRecord;
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateIssue(runtimeConfig, csrfToken, {
        assigneeLoginId: stringFormValue(formData, "assigneeLoginId"),
        bodyMarkdown: stringFormValue(formData, "body"),
        dueDate: stringFormValue(formData, "dueDate"),
        isDraft: stringFormValue(formData, "isDraft") === "true",
        isPublish: stringFormValue(formData, "isPublish") === "true",
        issueNumber: numericIssueNumber,
        labelIds: formData.getAll("labelIds").map((value) => Number(value)),
        milestoneId: Number(stringFormValue(formData, "milestoneId")) || undefined,
        ownerName,
        parentIssueId: stringFormValue(formData, "parentIssueId"),
        projectName,
        title: stringFormValue(formData, "title"),
      });
    },
    onSuccess(updatedIssue) {
      queryClient.invalidateQueries({ queryKey: ["project", ownerName, projectName, "issues"] });
      queryClient.invalidateQueries({
        queryKey: ["project", ownerName, projectName, "issues", numericIssueNumber],
      });
      router.history.push(
        prefixBasePath(
          runtimeConfig.basePath,
          `/${ownerName}/${projectName}/issue/${stringField(updatedIssue.issueNumber, issueNumber)}`,
        ),
      );
    },
  });
  const isDraft = booleanField(issueRecord.isDraft);
  const authorId = stringField(issueRecord.authorId, "");
  const viewerUserId = stringField(issueRecord.viewerUserId, "");
  const showNotification = !isDraft && authorId !== "" && authorId === viewerUserId;

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <form
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/issue/${issueNumber}`,
            )}
            id="issue-form"
            encType="multipart/form-data"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(event.currentTarget);
            }}
          >
            <input type="hidden" name="authorId" value={authorId} />
            <input type="hidden" id="isDraft" name="isDraft" value="false" />
            <input type="hidden" id="isPublish" name="isPublish" value="false" />
            <div className="row-fluid">
              <div className="span12">
                <dl>
                  <dt>
                    {isDraft ? (
                      <span className="draft">{t("issue.state.draft")}</span>
                    ) : (
                      <label htmlFor="title">
                        <strong className="secondary-txt">#{issueNumber}</strong>
                      </label>
                    )}
                  </dt>
                  <dd>
                    <div className="span12">
                      <div className="span11">
                        <LegacyTabIndexInput
                          tabIndexValue="1"
                          type="text"
                          id="title"
                          name="title"
                          defaultValue={stringField(issue.title, "")}
                          className="text title "
                          maxLength={250}
                          placeholder={t("title")}
                          autoComplete="off"
                        />
                      </div>
                      <div className="span1 subtask-message">{t("issue.option")}</div>
                    </div>
                    <SubtaskSelects issue={issue} parentOptions={parentOptions} project={project} />
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
                          defaultValue={stringField(issue.bodyMarkdown, "")}
                        ></LegacyTabIndexTextarea>
                        <div id="preview-content-body" className="preview markdown-wrap"></div>
                      </div>
                    </dd>
                  </dl>

                  <div
                    className="upload-wrap content-footer"
                    data-resource-type="ISSUE_POST"
                    data-resource-id={stringField(issue.issueId, "")}
                  >
                    <div className="attach-wrap">
                      <div className="attachments" id="attachments"></div>
                    </div>
                  </div>

                  <div className=" actrow right-txt">
                    {showNotification ? (
                      <span className="send-notification-check">
                        <label className="checkbox inline">
                          <input
                            type="checkbox"
                            name="notificationMail"
                            id="notificationMail"
                            value="yes"
                            defaultChecked
                          />
                          <strong>{t("notification.send.mail")}</strong>
                        </label>
                      </span>
                    ) : null}
                    {isDraft ? (
                      <>
                        <button type="submit" id="button-draft-publish" className="ybtn ybtn-info">
                          {t("button.draft.publish")}
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
                      </>
                    ) : (
                      <button type="submit" id="button-save" className="ybtn ybtn-info">
                        {t("button.save")}
                      </button>
                    )}
                    <HistoryBackLink>{t("button.cancel")}</HistoryBackLink>
                  </div>
                </div>

                <div className="span3 span-hard-wrap right-menu">
                  <StateOption state={stringField(issue.state, "open")} />
                  <dl className="issue-option">
                    <dt>{t("issue.assignee")}</dt>
                    <dd>
                      <input
                        type="hidden"
                        className="bigdrop"
                        id="assignee"
                        name="assigneeLoginId"
                        placeholder={t("issue.noAssignee")}
                        defaultValue={stringField(issue.assigneeLoginId, "")}
                        style={{ width: "100%" }}
                        title=""
                      />
                    </dd>
                  </dl>
                  <MilestoneOption issue={issue} />
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
                          defaultValue={stringField(issueRecord.dueDateLabel, "")}
                        />
                        <button type="button" className="search-btn btn-calendar">
                          <i className="yobicon-calendar2"></i>
                        </button>
                      </div>
                    </dd>
                  </dl>
                  <IssueLabelSelect
                    basePath={runtimeConfig.basePath}
                    issue={issue}
                    labels={labels}
                    ownerName={ownerName}
                    projectName={projectName}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function StateOption({ state }: { state: string }) {
  const { t } = useLegacyMessages();
  return (
    <dl className="issue-option">
      <dt>{t("issue.state")}</dt>
      <dd>
        <div id="state" className="btn-group auto" data-name="state">
          <button className="btn dropdown-toggle auto" data-toggle="dropdown">
            <span className="d-label">{t("issue.state")}</span>
            <span className="d-caret">
              <span className="caret"></span>
            </span>
          </button>
          <ul className="dropdown-menu">
            <li
              data-value="OPEN"
              data-selected={state === "open" ? "true" : undefined}
              className={state === "open" ? "active" : undefined}
            >
              {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy dropdown items are anchors without href. */}
              <a>{t("issue.state.open")}</a>
            </li>
            <li
              data-value="CLOSED"
              data-selected={state === "closed" ? "true" : undefined}
              className={state === "closed" ? "active" : undefined}
            >
              {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy dropdown items are anchors without href. */}
              <a>{t("issue.state.closed")}</a>
            </li>
          </ul>
        </div>
      </dd>
    </dl>
  );
}

function MilestoneOption({ issue }: { issue: RestIssueDetailResponse }) {
  const { t } = useLegacyMessages();
  const milestoneId = stringField(issue.milestoneId, "0");
  const milestoneTitle = stringField(issue.milestoneTitle, "");
  return (
    <dl id="milestoneOption" className="issue-option">
      <dt>{t("milestone")}</dt>
      <dd>
        <select
          id="milestoneId"
          name="milestoneId"
          data-toggle="select2"
          data-format="milestone"
          data-container-css-class="fullsize"
          defaultValue={milestoneId}
        >
          <option value="0">{t("issue.noMilestone")}</option>
          {milestoneTitle ? (
            <optgroup label={t("milestone.state.open")}>
              <option value={milestoneId} data-state="open">
                {milestoneTitle}
              </option>
            </optgroup>
          ) : null}
        </select>
      </dd>
    </dl>
  );
}

function SubtaskSelects({
  issue,
  parentOptions,
  project,
}: {
  issue: RestIssueDetailResponse;
  parentOptions: Array<{
    id: bigint | number;
    issueNumber: bigint | number;
    selected: boolean;
    title: string;
  }>;
  project: ProjectContainer;
}) {
  const { t } = useLegacyMessages();
  const parentIssueId = stringField((issue as YonaRecord).parentIssueId, "");
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
          {parentOptions.map((parentIssue) => (
            <option key={String(parentIssue.id)} value={String(parentIssue.id)}>
              #{String(parentIssue.issueNumber)}. {parentIssue.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function IssueLabelSelect({
  basePath,
  issue,
  labels,
  ownerName,
  projectName,
}: {
  basePath: string;
  issue: RestIssueDetailResponse;
  labels: YonaRecord[];
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  if (labels.length === 0) {
    return null;
  }
  const selectedLabelIds = new Set((issue.labels ?? []).map((label) => stringField(label.id, "")));
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
          defaultValue={Array.from(selectedLabelIds)}
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
