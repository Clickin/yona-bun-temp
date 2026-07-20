/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy milestone/edit.scala.html requires positive tab order on title/content controls. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import type { ProjectContainer, ProjectMilestone } from "../../../../../api/types";
import {
  readProjectMilestone,
  readSessionBootstrap,
  updateProjectMilestone,
} from "../../../../../auth-workspace-client";
import { useLegacyMessages } from "../../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";
import { ProjectMilestoneNotFoundBody, ProjectMilestoneNotFoundTitle } from "../$milestoneId";
import { milestoneEditFormStyles, milestoneEditFormTheme } from "./-milestone-editform.stylex";

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
    <div className="page-wrap-outer" data-stylex-owner="milestone-edit-form-page">
      <div className="project-page-wrap">
        <div
          className={`${stylex.props(styles.form).className} content-wrap frm-wrap`}
          data-stylex-owner="milestone-edit-form"
        >
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
                  <dd data-stylex-owner="milestone-edit-form-title-row">
                    <LegacyTabIndexInput
                      focusRequest={titleFocusRequest}
                      type="text"
                      id="title"
                      name="title"
                      defaultValue={stringField(milestone.title, "")}
                      className="zen-mode text title "
                      data-stylex-owner="milestone-edit-form-title"
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
                <div
                  className={`${stylex.props(styles.leftPane).className} span9 span-left-pane`}
                  data-stylex-owner="milestone-edit-form-editor-pane"
                >
                  <dl>
                    <dd
                      {...stylex.props(milestoneEditFormStyles.editorWrapper)}
                      data-stylex-owner="milestone-edit-form-editor-wrapper"
                    >
                      <MilestoneMarkdownEditor
                        focusRequest={contentFocusRequest}
                        contents={stringField(milestone.contentsMarkdown, "")}
                      />
                    </dd>
                  </dl>

                  <MilestoneFileUploader resourceId={stringField(milestone.id, "")} />

                  <div
                    className={`${stylex.props(styles.actions).className} actrow`}
                    data-stylex-owner="milestone-edit-form-actions"
                  >
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
                <div
                  className={`${stylex.props(styles.rightPane).className} span3 span-hard-wrap`}
                  data-stylex-owner="milestone-edit-form-options"
                >
                  <dl
                    className={`${stylex.props(styles.stateOptions).className} issue-option`}
                    data-stylex-owner="milestone-edit-form-state-options"
                  >
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
                  <dl
                    className={`${stylex.props(styles.dueDateOptions).className} issue-option`}
                    data-stylex-owner="milestone-edit-form-due-date-options"
                  >
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

function MilestoneMarkdownEditor({
  contents,
  focusRequest,
}: {
  contents: string;
  focusRequest: number;
}) {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const contentsRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusRequest > 0) {
      contentsRef.current?.focus();
    }
  }, [focusRequest]);
  return (
    <div className="mt10">
      <ul
        className={`${stylex.props(styles.editorTabs).className} nav nav-tabs nm small`}
        data-stylex-owner="milestone-edit-form-editor-tabs"
      >
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
        className={`${stylex.props(milestoneEditFormStyles.editorContent).className} tab-content`}
        data-stylex-owner="milestone-edit-form-editor-content"
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
              defaultValue={contents}
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

function MilestoneFileUploader({ resourceId }: { resourceId: string }) {
  const { t } = useLegacyMessages();
  const pasteSupported =
    typeof document !== "undefined" &&
    "onpaste" in document &&
    typeof FormData !== "undefined" &&
    typeof FileReader !== "undefined";
  return (
    <div
      id="upload"
      className={`${stylex.props(styles.upload).className} upload-wrap content-footer`}
      data-stylex-owner="milestone-edit-form-uploader"
      data-resource-type="MILESTONE"
      data-resource-id={resourceId}
    >
      <div
        className={`${stylex.props(styles.uploadControls).className} attach-wrap`}
        data-stylex-owner="milestone-edit-form-upload-controls"
      >
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
          {...(pasteSupported ? stylex.props(milestoneEditFormStyles.pasteHelpVisible) : {})}
          data-stylex-owner="milestone-edit-form-paste-help"
        >
          {t("common.attach.pastehere")}
        </span>
      </div>
      <ul className="attached-files unstyled"></ul>
      <p
        className={`${stylex.props(milestoneEditFormStyles.uploadSaveHelp).className} help`}
        data-stylex-owner="milestone-edit-form-upload-save-help"
      >
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
    setView((current) =>
      current.year === date.getFullYear() && current.month === date.getMonth()
        ? current
        : { month: date.getMonth(), year: date.getFullYear() },
    );
  }, [selectedTimestamp]);
  const today = new Date();
  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const years = Array.from({ length: 21 }, (_, index) => view.year - 10 + index);

  function changeMonth(offset: number) {
    setView((current) => {
      const date = new Date(current.year, current.month + offset, 1);
      return { month: date.getMonth(), year: date.getFullYear() };
    });
  }

  return (
    <div
      id="datepicker"
      className={`${stylex.props(styles.datePicker).className} date-picker`}
      data-stylex-owner="milestone-edit-form-datepicker"
    >
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
                    if (day === null) {
                      return <td className="is-empty" key={`empty-${columnIndex}`}></td>;
                    }
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

const styles = stylex.create({
  form: { position: "relative" },
  leftPane: { display: "block" },
  actions: { textAlign: "right" },
  rightPane: { display: "block" },
  editorTabs: { borderBottomColor: milestoneEditFormTheme.inputBorder },
  uploadControls: { color: milestoneEditFormTheme.mutedText },
  stateOptions: { color: milestoneEditFormTheme.optionText },
  dueDateOptions: { color: milestoneEditFormTheme.optionText },
  datePicker: { borderColor: milestoneEditFormTheme.inputBorder },
  upload: { backgroundColor: milestoneEditFormTheme.uploadSurface },
});

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
