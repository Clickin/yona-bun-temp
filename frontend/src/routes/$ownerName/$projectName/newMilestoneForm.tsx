/* oxlint-disable jsx-a11y/tabindex-no-positive */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MilestoneFileUploader } from "../../../components/file-uploader";
import { MilestoneDatePicker } from "../../../components/milestone-date-picker";
import { MilestoneMarkdownEditor } from "../../../components/markdown-editor";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { createProjectMilestone, readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/newMilestoneForm")({
  component: ProjectMilestoneCreateFormRoute,
});

function ProjectMilestoneCreateFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <ProjectMilestoneCreateFormScreen renderProjectShell={false} runtimeConfig={runtimeConfig} />
  );
}

export function ProjectMilestoneCreateFormScreen({
  renderProjectShell = true,
  runtimeConfig,
}: {
  renderProjectShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const content = (
    <ProjectMilestoneCreateFormRouteShell
      renderProjectShell={renderProjectShell}
      runtimeConfig={runtimeConfig}
    />
  );

  if (!renderProjectShell) {
    return content;
  }

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        {content}
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectMilestoneCreateFormRouteShell({
  renderProjectShell,
  runtimeConfig,
}: {
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const projectQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
    enabled: renderProjectShell,
  });

  if (renderProjectShell && !projectQuery.data) {
    return null;
  }
  const project = projectQuery.data;

  const body = <ProjectMilestoneCreateFormBody runtimeConfig={runtimeConfig} />;

  if (!renderProjectShell) {
    return body;
  }
  if (!project) {
    return null;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(project, ownerName),
    ownerName,
    projectName,
  };

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <title>{`${t("title.newMilestone")} - ${ownerName}/${projectName}`}</title>
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <ProjectMenu active="milestone" basePath={runtimeConfig.basePath} project={project} />
      {body}
    </SiteLayoutShell>
  );
}

function ProjectMilestoneCreateFormBody({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ownerName, projectName } = Route.useParams();
  const titleRef = useRef<HTMLInputElement>(null);
  const contentsRef = useRef<HTMLTextAreaElement>(null);
  const [dueDate, setDueDate] = useState("");
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
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

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
            data-owner="project-milestone-create-form"
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
                  <dd>
                    <input
                      ref={titleRef}
                      type="text"
                      id="title"
                      name="title"
                      defaultValue=""
                      className="zen-mode text title"
                      data-owner="project-milestone-title"
                      maxLength={250}
                      tabIndex={1}
                      placeholder={t("title")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          contentsRef.current?.focus();
                        }
                      }}
                    />
                  </dd>
                </dl>
              </div>

              <div className="row-fluid">
                <div className="span9 span-left-pane">
                  <dl>
                    <dd className="" data-owner="project-milestone-editor-wrapper">
                      <MilestoneMarkdownEditor
                        contentsRef={contentsRef}
                        dataToggle={false}
                        wrapperClassName="mt10"
                        tabContentClassName="tab-content"
                        owners={{
                          wrapper: "project-milestone-markdown-editor-wrapper",
                          tabContent: "project-milestone-editor-tab-content",
                        }}
                      />
                    </dd>
                  </dl>

                  <MilestoneFileUploader
                    helpClassName="right-txt help"
                    owners={{
                      wrapper: "project-milestone-upload-wrap",
                      pasteHelp: "project-milestone-paste-help",
                      saveHelp: "project-milestone-upload-save-help",
                    }}
                    pasteHelpStyleProps={{ style: { display: "block" } }}
                  />

                  <div className="actrow" data-owner="project-milestone-actions">
                    <button type="submit" className="" data-owner="project-milestone-save">
                      {t("button.save")}
                    </button>{" "}
                    <Link
                      to="/$ownerName/$projectName/milestones"
                      params={{ ownerName, projectName }}
                      className=""
                      data-owner="project-milestone-cancel"
                    >
                      {t("button.cancel")}
                    </Link>
                  </div>
                </div>
                <div className="span3 span-hard-wrap" data-owner="project-milestone-options">
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
                            data-owner="project-milestone-due-date"
                            autoComplete="off"
                            value={dueDate}
                            onChange={(event) => setDueDate(event.currentTarget.value)}
                          />
                        </label>
                        <MilestoneDatePicker dueDate={dueDate} onSelect={setDueDate} />
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
