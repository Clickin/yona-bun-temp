/* oxlint-disable jsx-a11y/tabindex-no-positive */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import * as stylex from "@stylexjs/stylex";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { createProjectMilestone, readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { LegacyMarkdownHelp } from "../../-legacy-markdown-help";
import { ProjectHeader, ProjectMenu } from "../$projectName";
import { newMilestoneColors, newMilestoneFormStyles } from "./-newMilestoneForm.stylex";

const styles = stylex.create({
  title: {
    borderColor: newMilestoneColors.fieldBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: newMilestoneColors.mutedText,
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    padding: "4px 6px",
    width: "100%",
    boxSizing: "border-box",
    outline: { ":focus": "none" },
  },
  save: {
    backgroundColor: newMilestoneColors.actionInfo,
    borderColor: newMilestoneColors.actionInfoBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: "#fff",
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    padding: "4px 12px",
    textAlign: "center",
    textDecoration: "none",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  cancel: {
    backgroundColor: "#fff",
    borderColor: newMilestoneColors.fieldBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: "#333",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    padding: "4px 12px",
    textAlign: "center",
    textDecoration: "none",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  notice: { color: newMilestoneColors.notice },
  dueDate: {
    borderColor: newMilestoneColors.fieldBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: newMilestoneColors.mutedText,
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    padding: "4px 6px",
  },
});

const titleStyleProps = stylex.props(styles.title);
const saveStyleProps = stylex.props(styles.save);
const cancelStyleProps = stylex.props(styles.cancel);
const dueDateStyleProps = stylex.props(styles.dueDate);

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
            data-stylex-owner="project-milestone-create-form"
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
                      {...titleStyleProps}
                      className={titleStyleProps.className}
                      data-stylex-owner="project-milestone-title"
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
                    <dd
                      className={stylex.props(newMilestoneFormStyles.editorPositioned).className}
                      data-stylex-owner="project-milestone-editor-wrapper"
                    >
                      <MilestoneMarkdownEditor contentsRef={contentsRef} />
                    </dd>
                  </dl>

                  <MilestoneFileUploader />

                  <div className=" actrow right-txt" data-stylex-owner="project-milestone-actions">
                    <button
                      {...saveStyleProps}
                      type="submit"
                      className={saveStyleProps.className}
                      data-stylex-owner="project-milestone-save"
                    >
                      {t("button.save")}
                    </button>{" "}
                    <Link
                      to="/$ownerName/$projectName/milestones"
                      params={{ ownerName, projectName }}
                      {...cancelStyleProps}
                      className={cancelStyleProps.className}
                      data-stylex-owner="project-milestone-cancel"
                    >
                      {t("button.cancel")}
                    </Link>
                  </div>
                </div>
                <div className="span3 span-hard-wrap" data-stylex-owner="project-milestone-options">
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
                            {...dueDateStyleProps}
                            className={`${dueDateStyleProps.className} validate due-date`}
                            data-stylex-owner="project-milestone-due-date"
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

function MilestoneMarkdownEditor({
  contentsRef,
}: {
  contentsRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  return (
    <div className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className={activeTab === "edit" ? "active" : undefined}>
          <button type="button" onClick={() => setActiveTab("edit")}>
            {t("common.editor.edit")}
          </button>
        </li>
        <li className={activeTab === "preview" ? "active" : undefined}>
          <button type="button" onClick={() => setActiveTab("preview")}>
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
      <div
        className={`tab-content ${stylex.props(newMilestoneFormStyles.editorTabContent).className}`}
        data-stylex-owner="project-milestone-editor-tab-content"
      >
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
              tabIndex={2}
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
  const pasteSupported =
    typeof document !== "undefined" &&
    "onpaste" in document &&
    typeof FormData !== "undefined" &&
    typeof FileReader !== "undefined";
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
        <span
          className="help help-pastable"
          {...(pasteSupported ? stylex.props(newMilestoneFormStyles.pasteHelpVisible) : {})}
          data-stylex-owner="project-milestone-paste-help"
        >
          {t("common.attach.pastehere")}
        </span>
      </div>
      <ul className="attached-files unstyled"></ul>
      <p className="right-txt help">
        <i className="yobicon-supportrequest"></i> {t("common.attach.attachIfYouSave")}
      </p>
    </div>
  );
}

const PIKADAY_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const PIKADAY_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function MilestoneDatePicker({
  dueDate,
  onSelect,
}: {
  dueDate: string;
  onSelect: (value: string) => void;
}) {
  const selectedDate = parseLegacyDate(dueDate);
  const initialDate = selectedDate ?? new Date();
  const [view, setView] = useState({
    month: initialDate.getMonth(),
    year: initialDate.getFullYear(),
  });
  const selectedTimestamp = selectedDate?.getTime();
  useEffect(() => {
    if (selectedTimestamp === undefined) return;
    const date = new Date(selectedTimestamp);
    setView({ month: date.getMonth(), year: date.getFullYear() });
  }, [selectedTimestamp]);
  const today = new Date();
  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const years = Array.from({ length: 21 }, (_, index) => view.year - 10 + index);
  const changeMonth = (offset: number) => {
    const date = new Date(view.year, view.month + offset, 1);
    setView({ month: date.getMonth(), year: date.getFullYear() });
  };

  return (
    <div id="datepicker" className="date-picker">
      <div className="pika-single">
        <div className="pika-lendar">
          <div className="pika-title">
            <div className="pika-label">
              {PIKADAY_MONTHS[view.month]}
              <select
                className="pika-select pika-select-month"
                value={view.month}
                onChange={(event) =>
                  setView((current) => ({ ...current, month: Number(event.currentTarget.value) }))
                }
              >
                {PIKADAY_MONTHS.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="pika-label">
              {view.year}
              <select
                className="pika-select pika-select-year"
                value={view.year}
                onChange={(event) =>
                  setView((current) => ({ ...current, year: Number(event.currentTarget.value) }))
                }
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button className="pika-prev" type="button" onClick={() => changeMonth(-1)}>
              Previous Month
            </button>
            <button className="pika-next" type="button" onClick={() => changeMonth(1)}>
              Next Month
            </button>
          </div>
          <table cellPadding="0" cellSpacing="0" className="pika-table">
            <thead>
              <tr>
                {PIKADAY_WEEKDAYS.map((weekday) => (
                  <th key={weekday} scope="col">
                    <abbr title={weekday}>{weekday.slice(0, 3)}</abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: cells.length / 7 }, (_, rowIndex) => (
                <tr key={rowIndex}>
                  {cells.slice(rowIndex * 7, rowIndex * 7 + 7).map((day, columnIndex) => {
                    if (day === null)
                      return <td className="is-empty" key={`empty-${columnIndex}`}></td>;
                    const isSelected =
                      selectedDate?.getFullYear() === view.year &&
                      selectedDate.getMonth() === view.month &&
                      selectedDate.getDate() === day;
                    const isToday =
                      today.getFullYear() === view.year &&
                      today.getMonth() === view.month &&
                      today.getDate() === day;
                    return (
                      <td
                        className={[isToday ? "is-today" : "", isSelected ? "is-selected" : ""]
                          .filter(Boolean)
                          .join(" ")}
                        data-day={day}
                        key={day}
                      >
                        <button
                          className="pika-button pika-day"
                          type="button"
                          data-pika-year={view.year}
                          data-pika-month={view.month}
                          data-pika-day={day}
                          onClick={() => onSelect(formatLegacyDate(view.year, view.month, day))}
                        >
                          {day}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function parseLegacyDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
}

function formatLegacyDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
