import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { createProjectMilestone, readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
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
      router.history.push(
        prefixBasePath(
          runtimeConfig.basePath,
          `/${ownerName}/${projectName}/milestone/${createdId}`,
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
                      <div data-toggle="markdown-editor" className="markdown-editor-wrap">
                        <LegacyTabIndexTextarea
                          tabIndexValue="2"
                          id="editor-contents-content-body"
                          name="contents"
                          data-editor-mode="content-body"
                          defaultValue=""
                        ></LegacyTabIndexTextarea>
                        <div id="preview-content-body" className="preview markdown-wrap"></div>
                      </div>
                    </dd>
                  </dl>

                  <div className="upload-wrap content-footer" data-resource-type="MILESTONE">
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
