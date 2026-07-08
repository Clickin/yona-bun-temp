/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/tabindex-no-positive */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
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
  const { ownerName, projectName } = Route.useParams();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectIssueFormShell
          ownerName={ownerName}
          projectName={projectName}
          runtimeConfig={runtimeConfig}
        >
          <ProjectIssueFormScreen runtimeConfig={runtimeConfig} />
        </ProjectIssueFormShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectIssueFormShell({
  children,
  ownerName,
  projectName,
  runtimeConfig,
}: {
  children: ReactNode;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectSearchScope = projectQuery.data
    ? {
        organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
        ownerName,
        projectName,
      }
    : { ownerName, projectName };

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      {children}
    </SiteLayoutShell>
  );
}

function ProjectIssueFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const search = Route.useSearch();
  const locationHref = useRouterState({ select: (state) => state.location.href });
  const legacySearch = legacyUrlSearch(locationHref);
  const parentIssueId = search.parentIssueId || stringSearch(legacySearch.get("parentIssueId"));
  const commentId = search.commentId || stringSearch(legacySearch.get("commentId"));

  return (
    <>
      <title>{`${t("issue.menu.new")} - ${ownerName}/${projectName}`}</title>
      <ProjectIssueFormProjectScreen
        ownerName={ownerName}
        projectName={projectName}
        parentIssueId={parentIssueId}
        referCommentId={commentId}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

export function ProjectIssueFormProjectScreen({
  initialBodyMarkdown = "",
  ownerName,
  parentIssueId,
  referCommentId,
  runtimeConfig,
  projectName,
  showSubtaskOptionOnMount = false,
}: {
  initialBodyMarkdown?: string;
  ownerName: string;
  parentIssueId?: string;
  referCommentId?: string;
  runtimeConfig: RuntimeConfig;
  projectName: string;
  showSubtaskOptionOnMount?: boolean;
}) {
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
      <IssueFormProjectHeader project={projectQuery.data} />
      <IssueFormProjectMenu active="issue" project={projectQuery.data} />
      <ProjectIssueFormBody
        initialBodyMarkdown={initialBodyMarkdown}
        labels={labelsQuery.data.labels}
        milestones={openMilestonesQuery.data.milestones}
        ownerName={ownerName}
        parentIssueId={parentIssueId ?? ""}
        parentOptions={parentOptionsQuery.data.items}
        project={projectQuery.data}
        projectName={projectName}
        referCommentId={referCommentId ?? ""}
        runtimeConfig={runtimeConfig}
        showSubtaskOptionOnMount={showSubtaskOptionOnMount}
      />
    </>
  );
}

function IssueFormProjectHeader({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const backgroundImageUrl =
    stringField((project as YonaRecord).backgroundImageUrl, "") ||
    stringField((project as YonaRecord).backgroundUrl, "") ||
    "/assets/images/bg-default-project.png";
  const isForked =
    booleanField((project as YonaRecord).isForkedFromOrigin) ||
    booleanField((project as YonaRecord).isForked);
  const originalOwnerName =
    stringField((project as YonaRecord).originalOwnerName, "") ||
    stringField((project as YonaRecord).originOwnerName, "");
  const originalProjectName =
    stringField((project as YonaRecord).originalProjectName, "") ||
    stringField((project as YonaRecord).originProjectName, "");

  return (
    <div
      className="project-header-outer"
      style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
    >
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img src={projectLogoUrl(project)} alt="" />
          </div>
          <div className={`project-breadcrumb-wrap${isForked ? " fork" : ""}`}>
            <div className="project-breadcrumb">
              <span className="project-author hide-in-mobile">
                <Link to="/$user" params={{ user: ownerName }}>
                  {ownerName}
                </Link>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <Link to="/$ownerName/$projectName" params={{ ownerName, projectName }}>
                  {projectName}
                </Link>
              </span>
              <span className="user-project-list" data-project-id={stringField(project.id, "")}>
                <i
                  className={`${booleanField((project as YonaRecord).isFavorite) ? "starred" : ""} star material-icons va-text-top`}
                >
                  star
                </i>
              </span>
              {booleanField((project as YonaRecord).isPrivate) ? (
                <span className="project-private">
                  <i className="yobicon-lock"></i>
                </span>
              ) : null}
              {booleanField((project as YonaRecord).isProtected) ? (
                <span className="project-protected" title="Group Project">
                  G
                </span>
              ) : null}
            </div>
            {isForked ? (
              <div className="project-origin">
                <span className="project-origin-title">{t("fork.original")}</span>
                <Link
                  to="/$ownerName/$projectName"
                  params={{ ownerName: originalOwnerName, projectName: originalProjectName }}
                  className="project-origin-name"
                >
                  {originalOwnerName} / {originalProjectName}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="project-util-wrap">
            <ul className="project-util"></ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueFormProjectMenu({
  active,
  project,
}: {
  active?: "board" | "code" | "home" | "issue" | "milestone" | "pullRequest" | "review";
  project: ProjectContainer;
}) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = (project as YonaRecord).menuSetting as YonaRecord | undefined;
  const enrolledUsers = Array.isArray((project as YonaRecord).enrolledUsers)
    ? ((project as YonaRecord).enrolledUsers as unknown[])
    : [];

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <IssueFormProjectMenuItem
            active={active === "home"}
            label={t("title.projectHome")}
            params={{ ownerName, projectName }}
            short="H"
            to="/$ownerName/$projectName"
          />
          {booleanField(menuSetting?.code) ? (
            <IssueFormProjectMenuItem
              active={active === "code"}
              className="code-menu "
              label={t("menu.code")}
              params={{ ownerName, projectName }}
              short="C"
              to="/$ownerName/$projectName/code"
            />
          ) : null}
          {booleanField(menuSetting?.issue) ? (
            <IssueFormProjectMenuItem
              active={active === "issue"}
              label={t("menu.issue")}
              params={{ ownerName, projectName }}
              short="I"
              to="/$ownerName/$projectName/issues"
            />
          ) : null}
          {booleanField(menuSetting?.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <IssueFormProjectMenuItem
              active={active === "pullRequest"}
              label={t("menu.pullRequest")}
              params={{ ownerName, projectName }}
              short="P"
              to="/$ownerName/$projectName/pullRequests"
            />
          ) : null}
          {booleanField(menuSetting?.review) ? (
            <IssueFormProjectMenuItem
              active={active === "review"}
              label={t("menu.review")}
              params={{ ownerName, projectName }}
              short="R"
              to="/$ownerName/$projectName/reviews"
            />
          ) : null}
          {booleanField(menuSetting?.milestone) ? (
            <IssueFormProjectMenuItem
              active={active === "milestone"}
              label={t("milestone")}
              params={{ ownerName, projectName }}
              short="M"
              to="/$ownerName/$projectName/milestones"
            />
          ) : null}
          {booleanField(menuSetting?.board) ? (
            <IssueFormProjectMenuItem
              active={active === "board"}
              label={t("menu.board")}
              params={{ ownerName, projectName }}
              short="B"
              to="/$ownerName/$projectName/posts"
            />
          ) : null}
        </ul>
        {booleanField(project.viewerCanUpdate) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="">
                <Link to="/$ownerName/$projectName/setting" params={{ ownerName, projectName }}>
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  {enrolledUsers.length > 0 ? (
                    <span className="project-menu-count">{enrolledUsers.length}</span>
                  ) : null}
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IssueFormProjectMenuItem({
  active = false,
  className = "",
  label,
  params,
  short,
  to,
}: {
  active?: boolean;
  className?: string;
  label: string;
  params: { ownerName: string; projectName: string };
  short: string;
  to: string;
}) {
  return (
    <li className={`${className}${active ? "active" : ""}`}>
      <Link to={to} params={params}>
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
      </Link>
    </li>
  );
}

function ProjectIssueFormBody({
  initialBodyMarkdown,
  labels,
  milestones,
  ownerName,
  parentIssueId,
  parentOptions,
  project,
  projectName,
  referCommentId,
  runtimeConfig,
  showSubtaskOptionOnMount,
}: {
  initialBodyMarkdown: string;
  labels: YonaRecord[];
  milestones: ProjectMilestone[];
  ownerName: string;
  parentIssueId: string;
  parentOptions: Array<{
    id: bigint | number;
    issueNumber: bigint | number;
    selected: boolean;
    title: string;
  }>;
  project: ProjectContainer;
  projectName: string;
  referCommentId: string;
  runtimeConfig: RuntimeConfig;
  showSubtaskOptionOnMount: boolean;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const menuSetting = (project as YonaRecord).menuSetting;
  const showMilestoneOption =
    typeof menuSetting === "object" &&
    menuSetting !== null &&
    booleanField((menuSetting as YonaRecord).milestone);
  const [invalidDueDateNoticeKey, setInvalidDueDateNoticeKey] = useState(0);
  const [titleFocusRequest, setTitleFocusRequest] = useState(1);
  const [bodyFocusRequest, setBodyFocusRequest] = useState(0);
  const [isSubtaskOptionVisible, setIsSubtaskOptionVisible] = useState(
    parentIssueId !== "" || showSubtaskOptionOnMount,
  );
  const [isSubtaskMessageOn, setIsSubtaskMessageOn] = useState(showSubtaskOptionOnMount);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const draftSubmitRef = useRef(false);

  useEffect(() => {
    setIsSubtaskOptionVisible(parentIssueId !== "" || showSubtaskOptionOnMount);
    setIsSubtaskMessageOn(showSubtaskOptionOnMount);
  }, [parentIssueId, showSubtaskOptionOnMount]);

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
              const formData = new FormData(form);
              const title = stringFormValue(formData, "title");
              if (title.trim() === "") {
                window.alert(t("issue.error.emptyTitle"));
                setTitleFocusRequest((current) => current + 1);
                return;
              }
              const dueDate = stringFormValue(formData, "dueDate");
              if (!isValidIssueDueDate(dueDate)) {
                setInvalidDueDateNoticeKey((currentKey) => currentKey + 1);
                dueDateRef.current?.focus();
                return;
              }
              mutation.mutate({ form, isDraft });
            }}
          >
            <YobiToast
              noticeKey={invalidDueDateNoticeKey}
              message={t("issue.error.invalid.duedate")}
            />
            <div className="row-fluid">
              <div className="span12">
                <dl>
                  <dd>
                    <div className="span12">
                      <div className="span11">
                        <LegacyTabIndexInput
                          focusRequest={titleFocusRequest}
                          type="text"
                          id="title"
                          name="title"
                          defaultValue=""
                          className="text title "
                          maxLength={250}
                          tabIndex={1}
                          placeholder={t("title")}
                          autoComplete="off"
                          title={t("title.help.key")}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              setBodyFocusRequest((current) => current + 1);
                            }
                          }}
                        />
                      </div>
                      <div
                        className={`span1 subtask-message${isSubtaskMessageOn ? " option-on" : ""}`}
                        onClick={() => {
                          setIsSubtaskOptionVisible((current) => {
                            const next = !current;
                            setIsSubtaskMessageOn(next);
                            return next;
                          });
                        }}
                      >
                        {t("issue.option")}
                      </div>
                    </div>
                    <SubtaskSelects
                      parentOptions={parentOptions}
                      project={project}
                      parentIssueId={parentIssueId}
                      showOption={isSubtaskOptionVisible}
                    />
                  </dd>
                </dl>
              </div>

              <div className="row-fluid">
                <div className="span9 span-left-pane">
                  <dl>
                    <dd style={{ position: "relative" }}>
                      <IssueMarkdownEditor
                        focusRequest={bodyFocusRequest}
                        initialBodyMarkdown={parentIssueId === "" ? initialBodyMarkdown : ""}
                      />
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
                      title={t("button.draft.save.description")}
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
                          ref={dueDateRef}
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
  focusRequest = 0,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { focusRequest?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusRequest > 0) {
      inputRef.current?.focus();
    }
  }, [focusRequest]);
  return <input ref={inputRef} {...props} />;
}

function IssueMarkdownEditor({
  focusRequest,
  initialBodyMarkdown,
}: {
  focusRequest: number;
  initialBodyMarkdown: string;
}) {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusRequest > 0) {
      bodyRef.current?.focus();
    }
  }, [focusRequest]);
  return (
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className={activeTab === "edit" ? "active" : undefined}>
          <button type="button" data-mode="edit" onClick={() => setActiveTab("edit")}>
            {t("common.editor.edit")}
          </button>
        </li>
        <li className={activeTab === "preview" ? "active" : undefined}>
          <button type="button" data-mode="preview" onClick={() => setActiveTab("preview")}>
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
              defaultValue={initialBodyMarkdown}
              tabIndex={2}
              {...{ markdown: "true" }}
            />
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
  showOption,
}: {
  parentIssueId: string;
  parentOptions: Array<{
    id: bigint | number;
    issueNumber: bigint | number;
    selected: boolean;
    title: string;
  }>;
  project: ProjectContainer;
  showOption: boolean;
}) {
  const { t } = useLegacyMessages();

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
  return (
    stringField((project as YonaRecord).logoUrl, "") || "/assets/images/project_default_logo.png"
  );
}

function stringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isValidIssueDueDate(value: string) {
  const trimmed = value.trim();
  return trimmed === "" || !Number.isNaN(Date.parse(trimmed));
}

function YobiToast({ message, noticeKey }: { message: string; noticeKey: number }) {
  if (noticeKey === 0) {
    return null;
  }

  return (
    <div className="yobiToasts" key={noticeKey}>
      <div className="toast" tabIndex={-1} key={noticeKey}>
        <div className="btn-dismiss">
          <button type="button" className="btn-transparent">
            &times;
          </button>
        </div>
        <div className="center-text">
          <span className="v"></span>
          <div className="msg">{message}</div>
        </div>
      </div>
    </div>
  );
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

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const record = project as YonaRecord;
  const organizationName = stringField(record.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return projectIsProtected(project) ? ownerName : undefined;
}

function projectIsProtected(project: ProjectContainer) {
  const record = project as YonaRecord;
  return booleanField(record.isProtected) || stringField(record.projectScope, "") === "protected";
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
