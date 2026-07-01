import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import type { ProjectMilestone } from "../../../../../api/types";
import {
  readProjectMilestone,
  readSessionBootstrap,
  updateProjectMilestone,
} from "../../../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../../i18n";
import { YonaQueryProvider } from "../../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import { SiteLayoutShell } from "../../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/milestone/$milestoneId/editform")({
  component: ProjectMilestoneEditFormRoute,
});

function ProjectMilestoneEditFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectMilestoneEditFormScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectMilestoneEditFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, milestoneId } = Route.useParams();
  const numericMilestoneId = Number(milestoneId) || 0;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const milestoneQuery = useQuery({
    queryFn: () => readProjectMilestone(runtimeConfig, ownerName, projectName, numericMilestoneId),
    queryKey: ["project", ownerName, projectName, "milestones", numericMilestoneId],
  });

  if (!projectQuery.data || !milestoneQuery.data?.milestone) {
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
      <ProjectMilestoneEditFormBody
        milestone={milestoneQuery.data.milestone}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
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
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <form
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/milestone/${milestoneId}`,
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
                      defaultValue={stringField(milestone.title, "")}
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
                      <div data-toggle="markdown-editor" className="markdown-editor-wrap">
                        <LegacyTabIndexTextarea
                          tabIndexValue="2"
                          id="editor-contents-content-body"
                          name="contents"
                          data-editor-mode="content-body"
                          defaultValue={stringField(milestone.contentsMarkdown, "")}
                        ></LegacyTabIndexTextarea>
                        <div id="preview-content-body" className="preview markdown-wrap"></div>
                      </div>
                    </dd>
                  </dl>

                  <div
                    className="upload-wrap content-footer"
                    data-resource-type="MILESTONE"
                    data-resource-id={stringField(milestone.id, "")}
                  >
                    <div className="attach-wrap">
                      <div className="attachments" id="attachments"></div>
                    </div>
                  </div>

                  <div className=" actrow right-txt">
                    <button type="submit" className="ybtn ybtn-info">
                      {t("button.save")}
                    </button>
                    <a
                      href={prefixBasePath(
                        runtimeConfig.basePath,
                        `/${ownerName}/${projectName}/milestones`,
                      )}
                      className="ybtn"
                    >
                      {t("button.cancel")}
                    </a>
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
                            defaultValue={stringField(milestone.dueDateLabel, "")}
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
