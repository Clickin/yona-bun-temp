/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy milestone/edit.scala.html requires positive tab order on title/content controls. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MilestoneFileUploader } from "../../../../../components/file-uploader";
import { MilestoneMarkdownEditor } from "../../../../../components/markdown-editor";
import { MilestoneDatePicker } from "../../../../../components/milestone-date-picker";
import { LegacyTabIndexInput } from "../../../../../components/legacy-tab-index-input";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import type { ProjectContainer, ProjectMilestone } from "../../../../../api/types";
import {
  readProjectMilestone,
  readSessionBootstrap,
  updateProjectMilestone,
} from "../../../../../auth-workspace-client";
import { useLegacyMessages } from "../../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import { ProjectMilestoneNotFoundBody, ProjectMilestoneNotFoundTitle } from "../$milestoneId";

export const Route = createFileRoute("/$ownerName/$projectName/milestone/$milestoneId/editform")({
  component: ProjectMilestoneEditFormRoute,
});

function ProjectMilestoneEditFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <ProjectMilestoneEditFormScreen runtimeConfig={runtimeConfig} />;
}

function ProjectMilestoneEditFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName, milestoneId } = Route.useParams();
  const numericMilestoneId = Number(milestoneId) || 0;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const milestoneQuery = useQuery({
    queryFn: () => readProjectMilestone(runtimeConfig, ownerName, projectName, numericMilestoneId),
    queryKey: ["project", ownerName, projectName, "milestones", numericMilestoneId],
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
    retryOnMount: false,
  });
  const milestoneNotFound =
    restApiErrorStatus(milestoneQuery.error) === 404 ||
    (milestoneQuery.isSuccess && !milestoneQuery.data?.milestone);

  if (milestoneNotFound) {
    return (
      <>
        <ProjectMilestoneNotFoundTitle ownerName={ownerName} projectName={projectName} />
        <ProjectMilestoneNotFoundBody />
      </>
    );
  }

  if (!projectQuery.data || !milestoneQuery.data?.milestone) {
    return <title>{`${t("title.editMilestone")} - ${ownerName}/${projectName}`}</title>;
  }

  const editContent = (
    <>
      <title>{`${t("title.editMilestone")} - ${ownerName}/${projectName}`}</title>
      <ProjectMilestoneEditFormBody
        milestone={milestoneQuery.data.milestone}
        runtimeConfig={runtimeConfig}
      />
    </>
  );

  return editContent;
}

function restApiErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }
  return typeof error.status === "number" ? error.status : undefined;
}

function ProjectMilestoneEditFormBody({
  milestone,
  runtimeConfig,
}: {
  milestone: ProjectMilestone;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ownerName, projectName, milestoneId } = Route.useParams();
  const numericMilestoneId = Number(milestoneId) || 0;
  const state = stringField(milestone.state, "open").toUpperCase() === "CLOSED" ? "CLOSED" : "OPEN";
  const [dueDate, setDueDate] = useState(() => stringField(milestone.dueDateLabel, ""));
  const [titleFocusRequest] = useState(1);
  const [contentFocusRequest, setContentFocusRequest] = useState(0);
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateProjectMilestone(runtimeConfig, csrfToken, {
        contentsMarkdown: stringFormValue(formData, "contents"),
        dueDate: stringFormValue(formData, "dueDate"),
        milestoneId: numericMilestoneId,
        ownerName,
        projectName,
        state: stringFormValue(formData, "state"),
        title: stringFormValue(formData, "title"),
      });
    },
    onSuccess(updated) {
      queryClient.invalidateQueries({
        queryKey: ["project", ownerName, projectName, "milestones"],
      });
      const updatedId = stringField(updated.milestone?.id, milestoneId);
      router.history.push(
        prefixBasePath(
          runtimeConfig.basePath,
          `/${ownerName}/${projectName}/milestone/${updatedId}`,
        ),
      );
    },
  });

  return (
    <div className="page-wrap-outer" data-owner="milestone-edit-form-page">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap" data-owner="milestone-edit-form">
          <form
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/milestone/${milestoneId}`,
            )}
            id="milestone-form"
            encType="multipart/form-data"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              const title = stringFormValue(formData, "title");
              const contents = stringFormValue(formData, "contents");
              const dueDate = stringFormValue(formData, "dueDate");
              if (title.trim() === "") {
                window.alert(t("milestone.error.title"));
                return;
              }
              if (contents.trim() === "") {
                window.alert(t("milestone.error.content"));
                return;
              }
              if (dueDate.trim() !== "" && !/\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())) {
                window.alert(t("milestone.error.duedateFormat"));
                return;
              }
              mutation.mutate(form);
            }}
          >
            <div className="row-fluid">
              <div className="span12">
                <dl>
                  <dd data-owner="milestone-edit-form-title-row">
                    <LegacyTabIndexInput
                      focusRequest={titleFocusRequest}
                      type="text"
                      id="title"
                      name="title"
                      defaultValue={stringField(milestone.title, "")}
                      className="zen-mode text title "
                      data-owner="milestone-edit-form-title"
                      maxLength={250}
                      tabIndex={1}
                      placeholder={t("title")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          setContentFocusRequest((current) => current + 1);
                        }
                      }}
                    />
                  </dd>
                </dl>
              </div>

              <div className="row-fluid">
                <div className="span9 span-left-pane" data-owner="milestone-edit-form-editor-pane">
                  <dl>
                    <dd data-owner="milestone-edit-form-editor-wrapper">
                      <MilestoneMarkdownEditor
                        focusRequest={contentFocusRequest}
                        contents={stringField(milestone.contentsMarkdown, "")}
                        wrapperClassName="mt10"
                        tabContentClassName="tab-content"
                        owners={{
                          wrapper: "milestone-edit-form-markdown-editor-wrapper",
                          tabs: "milestone-edit-form-editor-tabs",
                          tabContent: "milestone-edit-form-editor-content",
                        }}
                      />
                    </dd>
                  </dl>

                  <MilestoneFileUploader
                    resourceId={stringField(milestone.id, "")}
                    pasteHelpStyleProps={{ style: { display: "block" } }}
                    helpClassName="right-txt help"
                    owners={{
                      wrapper: "milestone-edit-form-uploader",
                      attachWrap: "milestone-edit-form-upload-controls",
                      pasteHelp: "milestone-edit-form-paste-help",
                      saveHelp: "milestone-edit-form-upload-save-help",
                    }}
                  />

                  <div className="actrow right-txt" data-owner="milestone-edit-form-actions">
                    <button type="submit" className="ybtn ybtn-info">
                      {t("button.save")}
                    </button>
                    <Link
                      to="/$ownerName/$projectName/milestones"
                      params={{ ownerName, projectName }}
                      activeProps={{
                        "aria-current": undefined,
                        className: "ybtn",
                        "data-status": undefined,
                      }}
                      className="ybtn"
                    >
                      {t("button.cancel")}
                    </Link>
                  </div>
                </div>
                <div className="span3 span-hard-wrap" data-owner="milestone-edit-form-options">
                  <dl className="issue-option" data-owner="milestone-edit-form-state-options">
                    <dt>{t("milestone.form.state")}</dt>
                    <dd>
                      <div>
                        <input
                          type="radio"
                          name="state"
                          value="OPEN"
                          id="milestone-open"
                          className="radio-btn"
                          defaultChecked={state === "OPEN"}
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
                          defaultChecked={state === "CLOSED"}
                        />
                        <label htmlFor="milestone-close" className="bold">
                          {t("milestone.state.closed")}
                        </label>
                      </div>
                    </dd>
                  </dl>
                  <dl className="issue-option" data-owner="milestone-edit-form-due-date-options">
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
                            value={dueDate}
                            onChange={(event) => setDueDate(event.currentTarget.value)}
                          />
                        </label>
                        <MilestoneDatePicker
                          dueDate={dueDate}
                          onSelect={setDueDate}
                          containerOwner="milestone-edit-form-datepicker"
                        />
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
