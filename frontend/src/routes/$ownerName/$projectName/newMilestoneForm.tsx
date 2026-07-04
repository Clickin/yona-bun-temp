import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { createProjectMilestone, readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { LegacyMarkdownHelp } from "../../-legacy-markdown-help";
import { ProjectHeader, ProjectMenu } from "../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/newMilestoneForm")({
  component: ProjectMilestoneCreateFormRoute,
});

function ProjectMilestoneCreateFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectMilestoneCreateFormScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectMilestoneCreateFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu
        active="milestone"
        basePath={runtimeConfig.basePath}
        project={projectQuery.data}
      />
      <ProjectMilestoneCreateFormBody runtimeConfig={runtimeConfig} />
    </>
  );
}

function ProjectMilestoneCreateFormBody({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ownerName, projectName } = Route.useParams();
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createProjectMilestone(runtimeConfig, csrfToken, {
        attachmentIds: [],
        contentsMarkdown: stringFormValue(formData, "contents"),
        dueDate: stringFormValue(formData, "dueDate"),
        ownerName,
        projectName,
        state: stringFormValue(formData, "state"),
        title: stringFormValue(formData, "title"),
      });
    },
    onSuccess(created) {
      queryClient.invalidateQueries({
        queryKey: ["project", ownerName, projectName, "milestones"],
      });
      const createdId = stringField(created.milestone?.id, "");
      router.navigate({ to: `/${ownerName}/${projectName}/milestone/${createdId}` });
    },
  });

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <form
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/milestones`,
            )}
            id="milestone-form"
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
                    <LegacyTabIndexInput
                      tabIndexValue="1"
                      type="text"
                      id="title"
                      name="title"
                      defaultValue=""
                      className="zen-mode text title "
                      maxLength={250}
                      placeholder={t("title")}
                    />
                  </dd>
                </dl>
              </div>

              <div className="row-fluid">
                <div className="span9 span-left-pane">
                  <dl>
                    <dd style={{ position: "relative" }}>
                      <MilestoneMarkdownEditor />
                    </dd>
                  </dl>

                  <MilestoneFileUploader />

                  <div className=" actrow right-txt">
                    <button type="submit" className="ybtn ybtn-info">
                      {t("button.save")}
                    </button>
                    <Link
                      to="/$ownerName/$projectName/milestones"
                      params={{ ownerName, projectName }}
                      className="ybtn"
                    >
                      {t("button.cancel")}
                    </Link>
                  </div>
                </div>
                <div className="span3 span-hard-wrap">
                  <dl className="issue-option">
                    <dt>{t("milestone.form.state")}</dt>
                    <dd>
                      <div>
                        <input
                          type="radio"
                          name="state"
                          value="OPEN"
                          id="milestone-open"
                          className="radio-btn"
                          defaultChecked={true}
                        />
                        <label htmlFor="milestone-open" className="bold">
                          {t("milestone.state.open")}
                        </label>
                        &nbsp;
                        <input
                          type="radio"
                          name="state"
                          value="CLOSED"
                          id="milestone-close"
                          className="radio-btn"
                        />
                        <label htmlFor="milestone-close" className="bold">
                          {t("milestone.state.closed")}
                        </label>
                      </div>
                    </dd>
                  </dl>
                  <dl className="issue-option">
                    <dt>{t("milestone.form.dueDate")}</dt>
                    <dd>
                      <div>
                        {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template wraps the due date input in an empty label. */}
                        <label htmlFor="dueDate">
                          <input
                            type="text"
                            name="dueDate"
                            id="dueDate"
                            className="validate due-date"
                            autoComplete="off"
                            defaultValue=""
                          />
                        </label>
                        <div id="datepicker" className="date-picker"></div>
                      </div>
                    </dd>
                  </dl>
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

function MilestoneMarkdownEditor() {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const contentsRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    contentsRef.current?.setAttribute("tabindex", "2");
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
        <div
          id="edit-content-body"
          className={activeTab === "edit" ? "tab-pane active" : "tab-pane"}
        >
          <div className="textarea-box">
            <textarea
              ref={contentsRef}
              name="contents"
              className="editorSeries content comment nm"
              data-editor-mode="content-body"
              id="editor-contents-content-body"
              {...{ markdown: "true" }}
            ></textarea>
          </div>
        </div>
        <div
          id="preview-content-body"
          className={activeTab === "preview" ? "tab-pane active" : "tab-pane"}
        >
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

function MilestoneFileUploader() {
  const { t } = useLegacyMessages();
  return (
    <div id="upload" className="upload-wrap content-footer" data-resource-type="MILESTONE">
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
