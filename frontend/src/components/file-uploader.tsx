/* Shared legacy attachment uploaders. Formerly duplicated across the
 * commit-detail, pull-request-changes, issue-detail, issue-form, post-form,
 * milestone-form and pull-request-form routes; each screen's rendered DOM
 * contract (upload-wrap shell, attach-wrap, file button, paste hint,
 * attached-files list, save help line, data-stylex-owner markers) stays
 * byte-identical, with the per-screen differences (route-local stylex styles,
 * owners, resource type/id, file control, upload rows) arriving as props.
 */
import * as stylex from "@stylexjs/stylex";
import type { DragEvent, HTMLAttributes, ReactNode } from "react";
import { useLegacyMessages } from "../i18n";
import type { UploadedAttachment } from "../api/attachments";
import type { MarkdownEditorStyleProps } from "./markdown-editor";

// ponytail: stable empty-object default so destructuring never allocates per render.
const NO_OWNERS = {};

export type UploadRow = {
  attachment?: UploadedAttachment;
  error?: string;
  key: number;
  name: string;
  placeholder?: string;
  progress: number;
  size: number;
  status: "deleting" | "error" | "ready" | "uploading";
};

export function humanFileSize(bytes: number) {
  const normalizedBytes = Math.max(0, Number(bytes) || 0);
  if (normalizedBytes < 1_024) {
    return `${normalizedBytes.toLocaleString("en-US")} bytes`;
  }
  const units = ["Kb", "Mb", "Gb", "Tb", "Pb"];
  const exponent = Math.min(
    units.length,
    Math.max(1, Math.floor(Math.log(normalizedBytes) / Math.log(1_024))),
  );
  return `${(normalizedBytes / 1_024 ** exponent).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })} ${units[exponent - 1]}`;
}

type UploaderShellProps = {
  wrapperClassName: string;
  wrapperStyleProps?: MarkdownEditorStyleProps;
  wrapperStyleFirst?: boolean;
  wrapperId?: string;
  resourceType: string;
  resourceId?: string;
  owner?: string;
  wrapperExtraProps?: HTMLAttributes<HTMLDivElement>;
  attachWrapClassName?: string;
  attachWrapStyleProps?: MarkdownEditorStyleProps;
  attachWrapOwner?: string;
  /** Legacy `{" "}` text-node separators inside attach-wrap (issue form only). */
  attachSpacing?: boolean;
  btnWrapClassName?: string;
  btnWrapStyleProps?: MarkdownEditorStyleProps;
  btnWrapOwner?: string;
  /** File picker control; defaults to the legacy div+input combo. */
  fileControl?: ReactNode;
  plainClassName?: string;
  plainStyleProps?: MarkdownEditorStyleProps;
  plainOwner?: string;
  /** Conditional spread applied to the paste hint while paste is supported. */
  pasteHelpStyleProps?: MarkdownEditorStyleProps;
  /** Unconditional spread applied to the paste hint. */
  pasteHelpFixedStyleProps?: MarkdownEditorStyleProps;
  /** Complete literal className of the paste hint; default `help help-pastable`. */
  pasteHelpClassName?: string;
  /** Spread the paste hint style before the className (issue form only). */
  pasteHelpStyleFirst?: boolean;
  pasteHelpOwner?: string;
  attachedFilesClassName?: string;
  attachedFilesStyleProps?: MarkdownEditorStyleProps;
  attachedFilesOwner?: string;
  attachedFilesChildren?: ReactNode;
  showHelp?: boolean;
  helpClassName?: string;
  helpStyleProps?: MarkdownEditorStyleProps;
  helpStyleFirst?: boolean;
  helpOwner?: string;
  dragOverlay?: boolean;
};

function UploaderShell({
  wrapperClassName,
  wrapperStyleProps,
  wrapperStyleFirst = true,
  wrapperId,
  resourceType,
  resourceId,
  owner,
  wrapperExtraProps,
  attachWrapClassName = "attach-wrap",
  attachWrapStyleProps,
  attachWrapOwner,
  attachSpacing = false,
  btnWrapClassName = "btn-wrap",
  btnWrapStyleProps,
  btnWrapOwner,
  fileControl,
  plainClassName = "plain",
  plainStyleProps,
  plainOwner,
  pasteHelpStyleProps,
  pasteHelpFixedStyleProps,
  pasteHelpClassName = "help help-pastable",
  pasteHelpStyleFirst = false,
  pasteHelpOwner,
  attachedFilesClassName = "attached-files unstyled",
  attachedFilesStyleProps,
  attachedFilesOwner,
  attachedFilesChildren,
  showHelp = true,
  helpClassName = "help",
  helpStyleProps,
  helpStyleFirst = true,
  helpOwner,
  dragOverlay = false,
}: UploaderShellProps) {
  const { t } = useLegacyMessages();
  const pasteSupported =
    typeof document !== "undefined" &&
    "onpaste" in document &&
    typeof FormData !== "undefined" &&
    typeof FileReader !== "undefined";
  return (
    <div
      {...(wrapperStyleFirst ? wrapperStyleProps : undefined)}
      id={wrapperId}
      className={wrapperClassName}
      data-resource-type={resourceType}
      data-resource-id={resourceId}
      data-stylex-owner={owner}
      {...wrapperExtraProps}
      {...(wrapperStyleFirst ? undefined : wrapperStyleProps)}
    >
      <div
        {...attachWrapStyleProps}
        className={`${attachWrapStyleProps?.className ?? ""} ${attachWrapClassName}`.trim()}
        data-stylex-owner={attachWrapOwner}
      >
        <span className="help help-droppable">{t("common.attach.drophere")}</span>
        {attachSpacing ? " " : null}
        <div {...btnWrapStyleProps} className={btnWrapClassName} data-stylex-owner={btnWrapOwner}>
          {fileControl ?? (
            <div className="nbtn medium white fake-file-wrap">
              <i className="yobicon-upload"></i> {t("button.upload")}
              <input type="file" className="file" name="filePath" multiple />
            </div>
          )}
        </div>
        {attachSpacing ? " " : null}
        <span {...plainStyleProps} className={plainClassName} data-stylex-owner={plainOwner}>
          {t("common.attach.clickbutton")}
        </span>
        {attachSpacing ? " " : null}
        <span
          {...(pasteHelpStyleFirst
            ? {
                ...(pasteSupported && pasteHelpStyleProps ? pasteHelpStyleProps : undefined),
                ...pasteHelpFixedStyleProps,
              }
            : undefined)}
          className={`${pasteHelpClassName} ${
            pasteHelpStyleFirst
              ? ""
              : (pasteSupported && pasteHelpStyleProps
                  ? (pasteHelpStyleProps as { className?: string }).className ?? ""
                  : "") +
                " " +
                ((pasteHelpFixedStyleProps as { className?: string } | undefined)?.className ?? "")
          }`.trim()}
          data-stylex-owner={pasteHelpOwner}
          {...(pasteHelpStyleFirst
            ? undefined
            : {
                ...(pasteSupported && pasteHelpStyleProps ? pasteHelpStyleProps : undefined),
                ...pasteHelpFixedStyleProps,
              })}
        >
          {t("common.attach.pastehere")}
        </span>
      </div>
      <ul
        {...attachedFilesStyleProps}
        className={attachedFilesClassName}
        data-stylex-owner={attachedFilesOwner}
      >
        {attachedFilesChildren}
      </ul>
      {showHelp ? (
        <p
          {...(helpStyleFirst ? helpStyleProps : undefined)}
          className={helpClassName}
          data-stylex-owner={helpOwner}
          {...(helpStyleFirst ? undefined : helpStyleProps)}
        >
          <i className="yobicon-supportrequest"></i> {t("common.attach.attachIfYouSave")}
        </p>
      ) : null}
      {dragOverlay ? (
        <div className="upload-drop-here">
          <div className="msg-wrap">
            <div className="msg">{t("common.attach.dropFilesHere")}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type UploadFormProps = {
  resourceType: string;
  /** Wrapper id (changes screen: `formId`, issue edit form: `"upload"`). */
  wrapperId?: string;
  resourceId?: string;
  /** Unconditional spread applied to the paste hint (issue edit form). */
  pasteHelpFixedStyleProps?: MarkdownEditorStyleProps;
  pasteHelpOwner?: string;
  helpClassName?: string;
  helpStyleProps?: MarkdownEditorStyleProps;
  /** Spread the help style after the className (overriding it) like the commit screen. */
  helpStyleFirst?: boolean;
  helpOwner?: string;
};

export function UploadForm({
  resourceType,
  wrapperId,
  resourceId,
  pasteHelpFixedStyleProps,
  pasteHelpOwner,
  helpClassName = "help",
  helpStyleProps,
  helpStyleFirst = true,
  helpOwner,
}: UploadFormProps) {
  return (
    <UploaderShell
      wrapperClassName="upload-wrap content-footer"
      wrapperId={wrapperId}
      resourceType={resourceType}
      resourceId={resourceId}
      pasteHelpFixedStyleProps={pasteHelpFixedStyleProps}
      pasteHelpOwner={pasteHelpOwner}
      helpClassName={helpClassName}
      helpStyleProps={helpStyleProps}
      helpStyleFirst={helpStyleFirst}
      helpOwner={helpOwner}
    />
  );
}

export type MilestoneFileUploaderProps = {
  resourceId?: string;
  wrapperStyleProps?: MarkdownEditorStyleProps;
  attachWrapStyleProps?: MarkdownEditorStyleProps;
  pasteHelpStyleProps?: MarkdownEditorStyleProps;
  helpClassName: string;
  owners?: {
    wrapper?: string;
    attachWrap?: string;
    pasteHelp?: string;
    saveHelp?: string;
  };
};

export function MilestoneFileUploader({
  resourceId,
  wrapperStyleProps,
  attachWrapStyleProps,
  pasteHelpStyleProps,
  helpClassName,
  owners = NO_OWNERS,
}: MilestoneFileUploaderProps) {
  return (
    <UploaderShell
      wrapperClassName={`${wrapperStyleProps?.className ?? ""} upload-wrap content-footer`.trim()}
      wrapperStyleProps={wrapperStyleProps}
      wrapperId="upload"
      resourceType="MILESTONE"
      resourceId={resourceId}
      owner={owners.wrapper}
      attachWrapClassName={`${attachWrapStyleProps?.className ?? ""} attach-wrap`.trim()}
      attachWrapStyleProps={attachWrapStyleProps}
      attachWrapOwner={owners.attachWrap}
      pasteHelpStyleProps={pasteHelpStyleProps}
      pasteHelpOwner={owners.pasteHelp}
      helpClassName={helpClassName}
      helpOwner={owners.saveHelp}
    />
  );
}

export type BoardPostFileUploaderProps = {
  resourceId?: string;
  wrapperStyleProps?: MarkdownEditorStyleProps;
  attachWrapStyleProps?: MarkdownEditorStyleProps;
  btnWrapStyleProps?: MarkdownEditorStyleProps;
  plainStyleProps?: MarkdownEditorStyleProps;
  pasteHelpStyleProps?: MarkdownEditorStyleProps;
  pasteHelpFixedStyleProps?: MarkdownEditorStyleProps;
  attachedFilesStyleProps?: MarkdownEditorStyleProps;
  helpClassName: string;
  helpStyleProps?: MarkdownEditorStyleProps;
  owners?: {
    wrapper?: string;
    attachWrap?: string;
    btnWrap?: string;
    plain?: string;
    pasteHelp?: string;
    attachedFiles?: string;
    saveHelp?: string;
  };
};

export function BoardPostFileUploader({
  resourceId,
  wrapperStyleProps,
  attachWrapStyleProps,
  btnWrapStyleProps,
  plainStyleProps,
  pasteHelpStyleProps,
  pasteHelpFixedStyleProps,
  attachedFilesStyleProps,
  helpClassName,
  helpStyleProps,
  owners = NO_OWNERS,
}: BoardPostFileUploaderProps) {
  return (
    <UploaderShell
      wrapperClassName={`upload-wrap content-footer ${wrapperStyleProps?.className ?? ""}`.trim()}
      wrapperStyleProps={wrapperStyleProps}
      wrapperId="upload"
      resourceType="BOARD_POST"
      resourceId={resourceId}
      owner={owners.wrapper}
      attachWrapClassName={`attach-wrap ${attachWrapStyleProps?.className ?? ""}`.trim()}
      attachWrapStyleProps={attachWrapStyleProps}
      attachWrapOwner={owners.attachWrap}
      btnWrapClassName={`btn-wrap ${btnWrapStyleProps?.className ?? ""}`.trim()}
      btnWrapStyleProps={btnWrapStyleProps}
      btnWrapOwner={owners.btnWrap}
      plainClassName={`plain ${plainStyleProps?.className ?? ""}`.trim()}
      plainStyleProps={plainStyleProps}
      plainOwner={owners.plain}
      pasteHelpStyleProps={pasteHelpStyleProps}
      pasteHelpFixedStyleProps={pasteHelpFixedStyleProps}
      pasteHelpOwner={owners.pasteHelp}
      attachedFilesClassName={`attached-files unstyled ${attachedFilesStyleProps?.className ?? ""}`.trim()}
      attachedFilesStyleProps={attachedFilesStyleProps}
      attachedFilesOwner={owners.attachedFiles}
      helpClassName={helpClassName}
      helpStyleProps={helpStyleProps}
      helpOwner={owners.saveHelp}
    />
  );
}

export type IssuePostFileUploaderStyles = {
  shell?: stylex.CompiledStyles;
  fakeFile?: stylex.CompiledStyles;
  fileInput?: stylex.CompiledStyles;
  pasteHelp?: stylex.CompiledStyles;
  attachedFilesVisible?: stylex.CompiledStyles;
  attachedFile?: stylex.CompiledStyles;
  attachedFileMain?: stylex.CompiledStyles;
  attachedFileMainDisabled?: stylex.CompiledStyles;
  attachedFileMainIcon?: stylex.CompiledStyles;
  attachedFileName?: stylex.CompiledStyles;
  attachedFileInsertCopy?: stylex.CompiledStyles;
  uploadProgressWrapper?: stylex.CompiledStyles;
  uploadProgress?: stylex.CompiledStyles;
  uploadProgressBar?: (width: string) => readonly [stylex.CompiledStyles, stylex.InlineStyles];
  uploadError?: stylex.CompiledStyles;
  attachedFileDelete?: stylex.CompiledStyles;
  uploadAttachSaveHelp?: stylex.CompiledStyles;
};

export type IssuePostFileUploaderProps = {
  isDragging: boolean;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFiles: (files: File[]) => void;
  onInsert: (attachment: UploadedAttachment) => void;
  onRemove: (row: UploadRow) => void;
  rows: UploadRow[];
  styles: IssuePostFileUploaderStyles;
};

export function IssuePostFileUploader({
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFiles,
  onInsert,
  onRemove,
  rows,
  styles,
}: IssuePostFileUploaderProps) {
  const { t } = useLegacyMessages();
  const shellStyleProps = styles.shell ? stylex.props(styles.shell) : undefined;
  const attachedFilesVisibleStyleProps =
    rows.length > 0 && styles.attachedFilesVisible
      ? stylex.props(styles.attachedFilesVisible)
      : undefined;
  return (
    <UploaderShell
      wrapperClassName={`upload-wrap content-footer ${shellStyleProps?.className ?? ""}${isDragging ? " dragover" : ""}`.trim()}
      wrapperStyleProps={shellStyleProps}
      wrapperId="upload"
      resourceType="ISSUE_POST"
      owner="project-issue-form-upload-shell"
      wrapperExtraProps={{ onDragEnter, onDragLeave, onDragOver, onDrop }}
      attachSpacing
      fileControl={
        <label
          {...(styles.fakeFile ? stylex.props(styles.fakeFile) : undefined)}
          className={`nbtn medium white fake-file-wrap ${styles.fakeFile ? (stylex.props(styles.fakeFile).className ?? "") : ""}`.trim()}
          data-stylex-owner="project-issue-form-upload-fake-file"
        >
          <i className="yobicon-upload" /> {t("button.upload")}
          <input
            type="file"
            {...(styles.fileInput ? stylex.props(styles.fileInput) : undefined)}
            className={`file ${styles.fileInput ? (stylex.props(styles.fileInput).className ?? "") : ""}`.trim()}
            data-stylex-owner="project-issue-form-upload-file-input"
            name="filePath"
            multiple
            onChange={(event) => {
              onFiles(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = "";
            }}
          />
        </label>
      }
      pasteHelpFixedStyleProps={styles.pasteHelp ? stylex.props(styles.pasteHelp) : undefined}
      pasteHelpClassName={`help help-pastable ${styles.pasteHelp ? (stylex.props(styles.pasteHelp).className ?? "") : ""}`.trim()}
      pasteHelpStyleFirst
      pasteHelpOwner="project-issue-form-upload-help-pastable"
      attachedFilesClassName={`attached-files unstyled${rows.length > 0 ? " has-files" : ""} ${attachedFilesVisibleStyleProps?.className ?? ""}`.trim()}
      attachedFilesStyleProps={attachedFilesVisibleStyleProps}
      attachedFilesOwner={rows.length > 0 ? "project-issue-form-attached-files" : undefined}
      attachedFilesChildren={rows.map((row) => {
        const progressStyle = styles.uploadProgressBar
          ? stylex.props(styles.uploadProgressBar(`${row.progress}%`))
          : undefined;
        return (
          <li
            key={row.key}
            {...(styles.attachedFile ? stylex.props(styles.attachedFile) : undefined)}
            className={`attached-file temporary${row.status === "ready" ? " complete" : ""} ${styles.attachedFile ? (stylex.props(styles.attachedFile).className ?? "") : ""}`.trim()}
            data-stylex-owner="project-issue-form-attached-file"
          >
            <button
              type="button"
              {...(styles.attachedFileMain ? stylex.props(styles.attachedFileMain) : undefined)}
              {...(row.status !== "ready" && styles.attachedFileMainDisabled
                ? stylex.props(styles.attachedFileMainDisabled)
                : undefined)}
              className={`attached-file-main ${styles.attachedFileMain ? (stylex.props(styles.attachedFileMain).className ?? "") : ""} ${row.status !== "ready" && styles.attachedFileMainDisabled ? (stylex.props(styles.attachedFileMainDisabled).className ?? "") : ""}`.trim()}
              data-stylex-owner="project-issue-form-attached-file-main"
              aria-label={`${t("common.attach.clickToPost")} ${row.name}`}
              disabled={!row.attachment || row.status !== "ready"}
              onClick={() => row.attachment && onInsert(row.attachment)}
            >
              <i
                {...(styles.attachedFileMainIcon
                  ? stylex.props(styles.attachedFileMainIcon)
                  : undefined)}
                className={`yobicon-supportrequest ${styles.attachedFileMainIcon ? (stylex.props(styles.attachedFileMainIcon).className ?? "") : ""}`.trim()}
                data-stylex-owner="project-issue-form-attached-file-main-icon"
              />
              <strong
                {...(styles.attachedFileName ? stylex.props(styles.attachedFileName) : undefined)}
                className={`name ${styles.attachedFileName ? (stylex.props(styles.attachedFileName).className ?? "") : ""}`.trim()}
                data-stylex-owner="project-issue-form-attached-file-name"
              >
                {row.name}
              </strong>{" "}
              <span className="size">{humanFileSize(row.size)}</span>
              {row.attachment && row.status === "ready" ? (
                <span
                  {...(styles.attachedFileInsertCopy
                    ? stylex.props(styles.attachedFileInsertCopy)
                    : undefined)}
                  className={`btn-insert-copy ${styles.attachedFileInsertCopy ? (stylex.props(styles.attachedFileInsertCopy).className ?? "") : ""}`.trim()}
                  data-stylex-owner="project-issue-form-attached-file-insert-copy"
                >
                  {t("common.attach.clickToPost")}
                </span>
              ) : null}
            </button>
            {row.status === "uploading" ? (
              <div
                {...(styles.uploadProgressWrapper
                  ? stylex.props(styles.uploadProgressWrapper)
                  : undefined)}
                data-stylex-owner="project-issue-form-upload-progress-wrapper"
              >
                <div
                  {...(styles.uploadProgress ? stylex.props(styles.uploadProgress) : undefined)}
                  className={`progress upload-progress ${styles.uploadProgress ? (stylex.props(styles.uploadProgress).className ?? "") : ""}`.trim()}
                  data-stylex-owner="project-issue-form-upload-progress-shell"
                >
                  <div
                    {...progressStyle}
                    className={`${progressStyle?.className ?? ""} bar orange`.trim()}
                    data-stylex-owner="project-issue-form-upload-progress"
                  />
                </div>
              </div>
            ) : null}
            {row.error ? (
              <span
                {...(styles.uploadError ? stylex.props(styles.uploadError) : undefined)}
                className={`upload-error ${styles.uploadError ? (stylex.props(styles.uploadError).className ?? "") : ""}`.trim()}
                data-stylex-owner="project-issue-form-upload-error"
              >
                {row.error}
              </span>
            ) : null}
            <button
              type="button"
              {...(styles.attachedFileDelete ? stylex.props(styles.attachedFileDelete) : undefined)}
              className={`btn-transparent btn-delete ${styles.attachedFileDelete ? (stylex.props(styles.attachedFileDelete).className ?? "") : ""}`.trim()}
              data-stylex-owner="project-issue-form-attached-file-delete"
              aria-label={`${t("button.delete")} ${row.name}`}
              disabled={row.status === "deleting" || row.status === "uploading"}
              onClick={() => onRemove(row)}
            >
              &times;
            </button>
          </li>
        );
      })}
      showHelp={rows.length > 0}
      helpClassName={`help attach-save-help ${styles.uploadAttachSaveHelp ? (stylex.props(styles.uploadAttachSaveHelp).className ?? "") : ""}`.trim()}
      helpStyleProps={
        styles.uploadAttachSaveHelp ? stylex.props(styles.uploadAttachSaveHelp) : undefined
      }
      helpOwner="project-issue-form-upload-attach-save-help"
      dragOverlay={isDragging}
    />
  );
}

export type PullRequestFileUploaderProps = {
  resourceId?: number;
  wrapperStyleProps?: MarkdownEditorStyleProps;
  pasteHelpStyleProps?: MarkdownEditorStyleProps;
  attachedFilesStyleProps?: MarkdownEditorStyleProps;
  helpClassName: string;
  owners?: { wrapper?: string; pasteHelp?: string; saveHelp?: string };
};

export function PullRequestFileUploader({
  resourceId,
  wrapperStyleProps,
  pasteHelpStyleProps,
  attachedFilesStyleProps,
  helpClassName,
  owners = NO_OWNERS,
}: PullRequestFileUploaderProps) {
  return (
    <UploaderShell
      wrapperClassName={`${wrapperStyleProps?.className ?? ""} upload-wrap content-footer`.trim()}
      wrapperStyleProps={wrapperStyleProps}
      wrapperId="upload"
      resourceType="PULL_REQUEST"
      resourceId={resourceId === undefined ? undefined : String(resourceId)}
      owner={owners.wrapper}
      pasteHelpStyleProps={pasteHelpStyleProps}
      pasteHelpOwner={owners.pasteHelp}
      attachedFilesClassName={`${attachedFilesStyleProps?.className ?? ""} attached-files unstyled`.trim()}
      attachedFilesStyleProps={attachedFilesStyleProps}
      helpClassName={helpClassName}
      helpOwner={owners.saveHelp}
    />
  );
}
