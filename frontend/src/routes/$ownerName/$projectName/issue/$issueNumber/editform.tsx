import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IssuePostFileUploader,
  humanFileSize,
  type UploadRow,
} from "../../../../../components/file-uploader";
import { LegacyTabIndexInput } from "../../../../../components/legacy-tab-index-input";
import {
  Link,
  createFileRoute,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  use,
  type InputHTMLAttributes,
  type HTMLAttributes,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { listProjectLabelsQueryOptions } from "../../../../../api/project-labels";
import { readProjectContainerQueryOptions } from "../../../../../api/org-project";
import type { ProjectContainer, YoramRecord } from "../../../../../api/types";
import { TabButton } from "../../../../../components/tab-button";
import { IssueDueDateInput } from "../../../../../components/issue-due-date-input";
import { LegacyMarkdown } from "../../../../../components/legacy-markdown";
import {
  listIssueParentOptions,
  readIssueDetail,
  readSessionBootstrap,
  searchProjectAssignableUsers,
  listProjectMilestones,
  updateIssue,
  type RestIssueDetailResponse,
} from "../../../../../auth-workspace-client";
import {
  attachmentMarkdown,
  deleteTemporaryAttachment,
  uploadTemporaryAttachment,
  type UploadedAttachment,
} from "../../../../../api/attachments";
import { useLegacyMessages } from "../../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import { SiteLayoutShell } from "../../../../-home-route-screen";
import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";
import { ProjectNestedShellContext } from "../../../$projectName";
import type { ProjectIssuesSearch } from "../../issues";

const legacyRouteLocalActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
const CHECKLIST_TEMPLATE = "\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C";
const DRAFT_SAVE_DELAY_MS = 5_000;
type BodySelection = { end: number; start: number };

export const Route = createFileRoute("/$ownerName/$projectName/issue/$issueNumber/editform")({
  component: ProjectIssueEditFormRoute,
});

function ProjectIssueEditFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <ProjectIssueEditFormScreen runtimeConfig={runtimeConfig} />;
}

function ProjectIssueEditFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, issueNumber } = Route.useParams();
  const { t } = useLegacyMessages();
  const routePathname = useRouterState({ select: (state) => state.location.pathname });
  const draftKey = prefixBasePath(runtimeConfig.basePath, routePathname);
  const numericIssueNumber = Number(issueNumber) || 0;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const labelsQuery = useQuery(
    listProjectLabelsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const assignableUsersQuery = useQuery({
    queryFn: () =>
      searchProjectAssignableUsers(runtimeConfig, {
        ownerName,
        projectName,
        query: "",
      }),
    queryKey: ["project", ownerName, projectName, "assignable-users", ""],
  });
  const milestonesQuery = useQuery({
    queryFn: () =>
      listProjectMilestones(runtimeConfig, ownerName, projectName, {
        orderBy: "dueDate",
        orderDir: "asc",
        state: "open",
      }),
    queryKey: ["project", ownerName, projectName, "milestones", "open", "issue-editform"],
  });
  const issueQuery = useQuery({
    queryFn: () => readIssueDetail(runtimeConfig, ownerName, projectName, numericIssueNumber),
    queryKey: ["project", ownerName, projectName, "issues", numericIssueNumber],
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
    retryOnMount: false,
  });
  const parentOptionsQuery = useQuery({
    queryFn: () =>
      listIssueParentOptions(runtimeConfig, ownerName, projectName, {
        currentIssueNumber: numericIssueNumber,
      }),
    queryKey: ["project", ownerName, projectName, "issues", "parent-options", numericIssueNumber],
  });
  const editTitle = <title>{`${t("title.editIssue")} - ${ownerName}/${projectName}`}</title>;
  const nestedProjectShell = use(ProjectNestedShellContext);

  if (restApiErrorStatus(issueQuery.error) === 404) {
    const notFoundContent = (
      <>
        <title>{`${t("error.notfound")} - ${ownerName}/${projectName}`}</title>
        <ProjectIssueEditNotFoundBody ownerName={ownerName} projectName={projectName} />
      </>
    );

    if (nestedProjectShell) {
      return notFoundContent;
    }
    return <SiteLayoutShell runtimeConfig={runtimeConfig}>{notFoundContent}</SiteLayoutShell>;
  }

  if (
    !projectQuery.data ||
    !labelsQuery.data ||
    !issueQuery.data ||
    !parentOptionsQuery.data ||
    !assignableUsersQuery.data ||
    !milestonesQuery.data
  ) {
    if (nestedProjectShell) {
      return editTitle;
    }
    return <SiteLayoutShell runtimeConfig={runtimeConfig}>{editTitle}</SiteLayoutShell>;
  }

  const editContent = (
    <>
      {editTitle}
      <ProjectIssueEditFormBody
        draftKey={draftKey}
        issue={issueQuery.data}
        labels={labelsQuery.data.labels}
        assignableUsers={assignableUsersQuery.data.items}
        milestones={milestonesQuery.data.milestones}
        parentOptions={parentOptionsQuery.data.items}
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
      />
    </>
  );

  return editContent;
}

function ProjectIssueEditNotFoundBody({
  ownerName,
  projectName,
}: {
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer" data-owner="project-issue-editform-error-page">
      <div className="project-page-wrap">
        <div className="error-wrap" data-owner="project-issue-editform-error-wrap">
          <i className="ico ico-err2" data-owner="project-issue-editform-error-icon"></i>
          <p data-owner="project-issue-editform-error-message">{t("error.notfound.issue_post")}</p>
          <Link
            to="/$ownerName/$projectName/issues"
            params={{ ownerName, projectName }}
            search={{ state: "all" } as ProjectIssuesSearch}
            className="ybtn ybtn-primary"
            data-owner="project-issue-editform-error-list"
          >
            {t("button.list")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function restApiErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

function ProjectIssueEditFormBody({
  assignableUsers,
  draftKey,
  issue,
  labels,
  milestones,
  parentOptions,
  project,
  runtimeConfig,
}: {
  assignableUsers: Array<{
    avatarUrl: string;
    displayName: string;
    loginId: string;
  }>;
  draftKey: string;
  issue: RestIssueDetailResponse;
  labels: YoramRecord[];
  milestones: YoramRecord[];
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
  const issueRecord = issue as YoramRecord;
  const [titleFocusRequest, setTitleFocusRequest] = useState(1);
  const [bodyFocusRequest, setBodyFocusRequest] = useState(0);
  const [invalidDueDateNoticeKey, setInvalidDueDateNoticeKey] = useState(0);
  const parentIssueId = stringField(issueRecord.parentIssueId, "");
  const currentIssueId = stringField(issueRecord.issueId, "");
  const showSubtaskOptionOnMount = parentIssueId !== "" || currentIssueId !== "";
  const [isSubtaskOptionVisible, setIsSubtaskOptionVisible] = useState(showSubtaskOptionOnMount);
  const [isSubtaskMessageOn, setIsSubtaskMessageOn] = useState(false);
  const initialAssigneeLoginId = stringField(issue.assigneeLoginId, "");
  const [assigneeLoginId, setAssigneeLoginId] = useState(initialAssigneeLoginId);
  const [milestoneId, setMilestoneId] = useState(() => stringField(issue.milestoneId, "0"));
  const [selectedLabelIds, setSelectedLabelIds] = useState(() =>
    (issue.labels ?? []).map((label) => stringField(label.id, "")),
  );
  const serverBodyMarkdown = stringField(issue.bodyMarkdown, "");
  const [bodyMarkdown, setBodyMarkdown] = useState(serverBodyMarkdown);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const draftTouchedRef = useRef(false);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);
  const [isFileDragActive, setIsFileDragActive] = useState(false);
  const [uploadErrorNotice, setUploadErrorNotice] = useState("");
  const [uploadErrorNoticeKey, setUploadErrorNoticeKey] = useState(0);
  const canceledUploadKeysRef = useRef(new Set<number>());
  const uploadSequenceRef = useRef(0);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const dueDatePickerRef = useRef<HTMLInputElement>(null);
  const submitIntentRef = useRef<"draft" | "publish" | "save">("save");

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const storedDraft = localStorage.getItem(draftKey);
    if (storedDraft === null) return;
    setBodyMarkdown(storedDraft);
    setDraftAvailable(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftTouchedRef.current || typeof localStorage === "undefined") return;
    if (bodyMarkdown === "") {
      localStorage.removeItem(draftKey);
      setDraftAvailable(false);
      return;
    }
    const timeoutId = setTimeout(() => {
      localStorage.setItem(draftKey, bodyMarkdown);
      setDraftAvailable(true);
    }, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [bodyMarkdown, draftKey]);

  const updateBodyMarkdown = useCallback((value: string) => {
    draftTouchedRef.current = true;
    setBodyMarkdown(value);
  }, []);
  const clearSavedDraft = useCallback(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(draftKey);
    }
    setDraftAvailable(false);
    window.location.reload();
  }, [draftKey]);

  function toggleSubtaskOption() {
    setIsSubtaskOptionVisible((current) => {
      const next = !current;
      setIsSubtaskMessageOn(next);
      return next;
    });
  }

  useEffect(() => {
    setIsSubtaskOptionVisible(showSubtaskOptionOnMount);
    setIsSubtaskMessageOn(false);
  }, [showSubtaskOptionOnMount]);

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateIssue(runtimeConfig, csrfToken, {
        assigneeLoginId: stringFormValue(formData, "assigneeLoginId"),
        attachmentIds: [
          ...new Set([
            ...(issue.attachments ?? []).map((attachment) => Number(attachment.id)),
            ...uploadRows.flatMap((row) =>
              row.status === "ready" && row.attachment ? [row.attachment.id] : [],
            ),
          ]),
        ],
        bodyMarkdown,
        dueDate: stringFormValue(formData, "dueDate"),
        isDraft: stringFormValue(formData, "isDraft") === "true",
        isPublish: stringFormValue(formData, "isPublish") === "true",
        issueNumber: numericIssueNumber,
        labelIds: formData.getAll("labelIds").map((value) => Number(value)),
        milestoneId: Number(stringFormValue(formData, "milestoneId")) || undefined,
        notificationMail: showNotification
          ? formData.get("notificationMail") === "yes"
          : undefined,
        ownerName,
        parentIssueId: stringFormValue(formData, "parentIssueId"),
        projectName,
        state: stringFormValue(formData, "state"),
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
  const authorId = stringField(issue.authorId, "");
  const viewerUserId = stringField(issue.viewerUserId, "");
  const showNotification = !isDraft && authorId !== "" && authorId === viewerUserId;
  const draftPublishDescription = t("button.draft.publish.description");
  const draftSaveDescription = t("button.draft.save.description");
  const reportUploadError = useCallback((message: string) => {
    setUploadErrorNotice(message);
    setUploadErrorNoticeKey((current) => current + 1);
  }, []);
  const insertAttachment = useCallback(
    (attachment: UploadedAttachment) => {
      const textarea = bodyRef.current;
      const start = textarea?.selectionStart ?? bodyMarkdown.length;
      const insertion = attachmentMarkdown(attachment, runtimeConfig.basePath);
      draftTouchedRef.current = true;
      setBodyMarkdown(
        `${bodyMarkdown.slice(0, start)}${insertion}${bodyMarkdown.slice(start)}`,
      );
      requestAnimationFrame(() => {
        const nextCursor = start + insertion.length;
        bodyRef.current?.focus();
        bodyRef.current?.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [bodyMarkdown, runtimeConfig.basePath],
  );
  const replaceBodyMarker = useCallback((marker: string, replacement: string) => {
    draftTouchedRef.current = true;
    setBodyMarkdown((current) => current.replace(marker, replacement));
  }, []);
  const removeAttachment = useCallback(
    async (row: UploadRow) => {
      if (!row.attachment || row.status !== "ready") {
        canceledUploadKeysRef.current.add(row.key);
        if (row.placeholder) replaceBodyMarker(row.placeholder, "");
        setUploadRows((current) => current.filter((candidate) => candidate.key !== row.key));
        return;
      }
      setUploadRows((current) =>
        current.map((candidate) =>
          candidate.key === row.key ? { ...candidate, status: "deleting" } : candidate,
        ),
      );
      try {
        const { csrfToken } = await readSessionBootstrap(runtimeConfig);
        await deleteTemporaryAttachment(runtimeConfig, csrfToken, row.attachment.id);
        const link = attachmentMarkdown(row.attachment, runtimeConfig.basePath);
        draftTouchedRef.current = true;
        setBodyMarkdown((current) => current.split(link).join("").split(link.trim()).join(""));
        setUploadRows((current) => current.filter((candidate) => candidate.key !== row.key));
      } catch (error) {
        setUploadRows((current) =>
          current.map((candidate) =>
            candidate.key === row.key ? { ...candidate, status: "ready" } : candidate,
          ),
        );
        reportUploadError(error instanceof Error ? error.message : "Attachment delete failed.");
      }
    },
    [replaceBodyMarker, reportUploadError, runtimeConfig],
  );
  const uploadFiles = useCallback(
    async (files: File[], insertionSelection?: BodySelection) => {
      const maxFileSize = runtimeConfig.maxUploadedFileSize ?? Number.MAX_SAFE_INTEGER;
      const uploadableFiles = files.filter((file) => file.size <= maxFileSize);
      if (uploadableFiles.length !== files.length) {
        reportUploadError(t("error.toolargefile", { args: [humanFileSize(maxFileSize)] }));
      }
      if (uploadableFiles.length === 0) return;
      const rows = uploadableFiles.map((file) => ({
        key: ++uploadSequenceRef.current,
        name: file.name || "upload.bin",
        placeholder:
          insertionSelection === undefined
            ? undefined
            : `<!--_upload-${uploadSequenceRef.current}_-->`,
        progress: 0,
        size: file.size,
        status: "uploading" as const,
      }));
      rows.forEach((row) => canceledUploadKeysRef.current.delete(row.key));
      if (insertionSelection !== undefined) {
        const placeholders = rows
          .flatMap((row) => (row.placeholder ? [row.placeholder] : []))
          .join("");
        setBodyMarkdown((current) => {
          draftTouchedRef.current = true;
          const start = Math.max(0, Math.min(insertionSelection.start, current.length));
          const end = Math.max(start, Math.min(insertionSelection.end, current.length));
          return `${current.slice(0, start)}${placeholders}${current.slice(end)}`;
        });
      }
      setUploadRows((current) => [...current, ...rows]);
      try {
        const csrfToken = (await readSessionBootstrap(runtimeConfig)).csrfToken;
        await Promise.all(
          uploadableFiles.map(async (file, index) => {
            const row = rows[index];
            try {
              const attachment = await uploadTemporaryAttachment(
                runtimeConfig,
                csrfToken,
                file,
                fetch,
                (progress) =>
                  setUploadRows((current) =>
                    current.map((candidate) =>
                      candidate.key === row.key ? { ...candidate, progress } : candidate,
                    ),
                  ),
              );
              if (canceledUploadKeysRef.current.has(row.key)) {
                await deleteTemporaryAttachment(runtimeConfig, csrfToken, attachment.id);
                return;
              }
              setUploadRows((current) =>
                current.map((candidate) =>
                  candidate.key === row.key
                    ? {
                        ...candidate,
                        attachment,
                        name: attachment.name,
                        progress: 100,
                        size: attachment.size,
                        status: "ready",
                      }
                    : candidate,
                ),
              );
              if (row.placeholder) {
                replaceBodyMarker(
                  row.placeholder,
                  attachmentMarkdown(attachment, runtimeConfig.basePath),
                );
              }
            } catch (error) {
              setUploadRows((current) =>
                current.filter((candidate) => candidate.key !== row.key),
              );
              if (row.placeholder) replaceBodyMarker(row.placeholder, "");
              reportUploadError(
                error instanceof Error ? error.message : "Attachment upload failed.",
              );
            }
          }),
        );
      } catch (error) {
        setUploadRows((current) =>
          current.filter((candidate) => !rows.some((row) => row.key === candidate.key)),
        );
        rows.forEach((row) => {
          if (row.placeholder) replaceBodyMarker(row.placeholder, "");
        });
        reportUploadError(error instanceof Error ? error.message : "Attachment upload failed.");
      }
    },
    [replaceBodyMarker, reportUploadError, runtimeConfig, t],
  );
  const handleFileDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setIsFileDragActive(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  };
  const fileDragProps = {
    onDragEnter(event) {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      setIsFileDragActive(true);
    },
    onDragLeave(event) {
      if (
        event.relatedTarget instanceof Node &&
        event.currentTarget.contains(event.relatedTarget)
      ) {
        return;
      }
      setIsFileDragActive(false);
    },
    onDragOver(event) {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      setIsFileDragActive(true);
    },
    onDrop(event) {
      handleFileDrop(event);
    },
  } satisfies Pick<
    HTMLAttributes<HTMLDivElement>,
    "onDragEnter" | "onDragLeave" | "onDragOver" | "onDrop"
  >;
  const assigneeOptions = [
    { label: t("issue.noAssignee"), value: "" },
    ...assignableUsers.map((user) => ({
      label: `${user.displayName || user.loginId} ${user.loginId}`,
      value: user.loginId,
    })),
    ...(assigneeLoginId &&
    !assignableUsers.some((user) => user.loginId === assigneeLoginId)
      ? [
          {
            label: `${stringField(issue.assigneeLabel, assigneeLoginId)} ${assigneeLoginId}`,
            value: assigneeLoginId,
          },
        ]
      : []),
  ];

  function handleDraftPublishClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    submitIntentRef.current = "save";
    if (!confirm(draftPublishDescription)) {
      return;
    }
    submitIntentRef.current = "publish";
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className="page-wrap-outer" data-owner="issue-editform-page">
      <div className="project-page-wrap">
        <div className="content-wrap frm-wrap" data-owner="issue-editform-shell">
          <form
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/issue/${issueNumber}`,
            )}
            data-owner="issue-editform-form"
            id="issue-form"
            encType="multipart/form-data"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              const submitIntent = submitIntentRef.current;
              submitIntentRef.current = "save";
              formData.set("isDraft", submitIntent === "draft" ? "true" : "false");
              formData.set("isPublish", submitIntent === "publish" ? "true" : "false");
              if (stringFormValue(formData, "title").trim() === "") {
                window.alert(t("issue.error.emptyTitle"));
                setTitleFocusRequest((current) => current + 1);
                return;
              }
              if (!isValidIssueDueDate(stringFormValue(formData, "dueDate"))) {
                setInvalidDueDateNoticeKey((currentKey) => currentKey + 1);
                dueDateRef.current?.focus();
                return;
              }
              if (typeof localStorage !== "undefined") {
                localStorage.removeItem(draftKey);
              }
              setDraftAvailable(false);
              mutation.mutate(formData);
            }}
          >
            <YoramToast
              noticeKey={invalidDueDateNoticeKey}
              message={t("issue.error.invalid.duedate")}
            />
            <YoramToast noticeKey={uploadErrorNoticeKey} message={uploadErrorNotice} />
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
                        <strong className="secondary-txt" data-owner="issue-editform-issue-number">
                          #{issueNumber}
                        </strong>
                      </label>
                    )}
                  </dt>
                  <dd>
                    <div className="span12">
                      <div className="span11">
                        <LegacyTabIndexInput
                          focusRequest={titleFocusRequest}
                          type="text"
                          id="title"
                          name="title"
                          defaultValue={stringField(issue.title, "")}
                          className="text title"
                          data-owner="issue-editform-title"
                          maxLength={250}
                          placeholder={t("title")}
                          tabIndex={Number("1")}
                          autoComplete="off"
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              setBodyFocusRequest((current) => current + 1);
                            }
                          }}
                        />
                      </div>
                      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- legacy partial_select_subtask.scala.html renders a clickable div, and DOM parity depends on preserving it. */}
                      <div
                        className={`span1 subtask-message${isSubtaskMessageOn ? " option-on" : ""}`}
                        onClick={toggleSubtaskOption}
                      >
                        {t("issue.option")}
                      </div>
                    </div>
                    <SubtaskSelects
                      issue={issue}
                      parentOptions={parentOptions}
                      project={project}
                      showOption={isSubtaskOptionVisible}
                    />
                  </dd>
                </dl>
              </div>
              <div className="row-fluid">
                <div className="span9 span-left-pane">
                  <dl>
                    <dd style={{ position: "relative" }} data-owner="issue-editform-editor-wrapper">
                      <IssueEditMarkdownEditor
                        bodyRef={bodyRef}
                        focusRequest={bodyFocusRequest}
                        value={bodyMarkdown}
                        dragOverlay={isFileDragActive}
                        dragProps={fileDragProps}
                        onBodyChange={updateBodyMarkdown}
                        onDropFiles={() => setIsFileDragActive(false)}
                        onFiles={(files, selection) => void uploadFiles(files, selection)}
                        onClearTemporary={clearSavedDraft}
                        showClearTemporary={draftAvailable}
                      />
                    </dd>
                  </dl>

                  <IssuePostFileUploader
                    alwaysMountedSaveHelp
                    isDragging={isFileDragActive}
                    resourceId={currentIssueId === "" ? undefined : currentIssueId}
                    rows={uploadRows}
                    onDragEnter={fileDragProps.onDragEnter}
                    onDragLeave={fileDragProps.onDragLeave}
                    onDragOver={fileDragProps.onDragOver}
                    onDrop={fileDragProps.onDrop}
                    onFiles={(files) => void uploadFiles(files)}
                    onInsert={insertAttachment}
                    onRemove={(row) => void removeAttachment(row)}
                    dragOverlay={false}
                  />

                  <div className="actrow right-txt" data-owner="issue-editform-actions">
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
                        <button
                          type="submit"
                          id="button-draft-publish"
                          className="ybtn ybtn-info"
                          data-owner="issue-editform-draft-publish"
                          title={draftPublishDescription}
                          onClick={handleDraftPublishClick}
                        >
                          {t("button.draft.publish")}
                        </button>
                        <button
                          type="button"
                          id="draft-save-btn"
                          className="ybtn ybtn-watching draft-save-btn"
                          data-owner="issue-editform-draft-save"
                          title={draftSaveDescription}
                          onClick={(event) => {
                            submitIntentRef.current = "draft";
                            event.currentTarget.form?.requestSubmit();
                          }}
                        >
                          {t("button.draft.save")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="submit"
                        id="button-save"
                        className="ybtn ybtn-info"
                        data-owner="issue-editform-save"
                        onClick={() => {
                          submitIntentRef.current = "save";
                        }}
                      >
                        {t("button.save")}
                      </button>
                    )}
                    <button type="button" className="ybtn" onClick={() => router.history.back()}>
                      {t("button.cancel")}
                    </button>
                  </div>
                </div>

                <div
                  className="span3 span-hard-wrap right-menu"
                  data-owner="issue-editform-sidebar"
                >
                  <StateOption state={stringField(issue.state, "open")} />
                  <dl className="issue-option">
                    <dt>{t("issue.assignee")}</dt>
                    <dd>
                      <input
                        type="hidden"
                        id="assignee"
                        name="assigneeLoginId"
                        placeholder={t("issue.noAssignee")}
                        value={assigneeLoginId}
                        readOnly
                        className="bigdrop"
                        style={{ width: "100%" }}
                        data-owner="issue-editform-assignee-input"
                      />
                      <LegacyEditSingleSelect
                        label={t("issue.assignee")}
                        value={assigneeLoginId}
                        options={assigneeOptions}
                        onChange={setAssigneeLoginId}
                        className="bigdrop"
                        selectedContent={
                          assigneeLoginId && assigneeLoginId === initialAssigneeLoginId ? (
                            <span className="usf-group">
                              {issue.assigneeAvatarUrl ? (
                                <span className="avatar-wrap smaller">
                                  <img
                                    src={stringField(issue.assigneeAvatarUrl, "")}
                                    width="20"
                                    height="20"
                                    alt=""
                                  />
                                </span>
                              ) : null}
                              <strong className="name">
                                {stringField(issue.assigneeLabel, assigneeLoginId)}
                              </strong>
                              <span className="loginid"> {assigneeLoginId}</span>
                            </span>
                          ) : undefined
                        }
                      />
                    </dd>
                  </dl>
                  <MilestoneOption
                    issue={issue}
                    milestones={milestones}
                    milestoneId={milestoneId}
                    onChange={setMilestoneId}
                  />
                  <dl className="issue-option">
                    <dt>{t("issue.dueDate")}</dt>
                    <dd>
                      <div className="search search-bar">
                        <IssueDueDateInput
                          ownerPrefix="project-issue-edit-form"
                          inputId="issueDueDate"
                          dueDateRef={dueDateRef}
                          datePickerRef={dueDatePickerRef}
                          defaultValue={stringField(issueRecord.dueDateLabel, "")}
                        />
                      </div>
                    </dd>
                  </dl>
                  <IssueLabelSelect
                    labels={labels}
                    ownerName={ownerName}
                    projectName={projectName}
                    selectedLabelIds={selectedLabelIds}
                    onChange={setSelectedLabelIds}
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedState, setSelectedState] = useState(() => normalizeIssueState(state));
  const [selectedLabel, setSelectedLabel] = useState(() =>
    normalizeIssueState(state) === "CLOSED" ? t("issue.state.closed") : t("issue.state.open"),
  );
  const options = [
    { label: t("issue.state.open"), value: "OPEN" },
    { label: t("issue.state.closed"), value: "CLOSED" },
  ];
  return (
    <dl className="issue-option" data-owner="issue-editform-state">
      <dt>{t("issue.state")}</dt>
      <dd>
        <div id="state" className={`btn-group auto${isMenuOpen ? " open" : ""}`}>
          <button
            type="button"
            className="btn dropdown-toggle auto"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsMenuOpen((current) => !current);
            }}
          >
            <span className="d-label">
              <span>{selectedLabel}</span>
            </span>
            <span className="d-caret">
              <span className="caret"></span>
            </span>
          </button>
          <ul className="dropdown-menu">
            {options.map((option) => {
              const selected = option.value === selectedState;
              return (
                <li
                  key={option.value}
                  data-value={option.value}
                  data-selected={selected ? "true" : undefined}
                  className={selected ? "active" : undefined}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedState(option.value);
                      setSelectedLabel(option.label);
                      setIsMenuOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
          <input type="hidden" name="state" value={selectedState} readOnly />
        </div>
      </dd>
    </dl>
  );
}

function normalizeIssueState(state: string) {
  return state.toLowerCase() === "closed" ? "CLOSED" : "OPEN";
}

function MilestoneOption({
  issue,
  milestones,
  milestoneId,
  onChange,
}: {
  issue: RestIssueDetailResponse;
  milestones: YoramRecord[];
  milestoneId: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLegacyMessages();
  const milestoneTitle = stringField(issue.milestoneTitle, "");
  const options = [
    { label: t("issue.noMilestone"), value: "0" },
    ...milestones
      .map((milestone) => ({
        label: stringField(milestone.title, ""),
        value: stringField(milestone.id, ""),
      }))
      .filter((option) => option.value !== "" && option.label !== ""),
    ...(milestoneTitle && !milestones.some((milestone) => stringField(milestone.id, "") === milestoneId)
      ? [{ label: milestoneTitle, value: milestoneId }]
      : []),
  ];
  const selectedMilestoneTitle = options.find((option) => option.value === milestoneId)?.label ?? "";
  return (
    <dl id="milestoneOption" className="issue-option">
      <dt>{t("milestone")}</dt>
      <dd>
        <select
          id="milestoneId"
          name="milestoneId"
          data-format="milestone"
          data-container-css-class="fullsize"
          className="select2-offscreen"
          value={milestoneId}
          onChange={(event) => onChange(event.currentTarget.value)}
        >
          <option value="0">{t("issue.noMilestone")}</option>
          <optgroup label={t("milestone.state.open")}>
            {milestones.map((milestone) => {
              const value = stringField(milestone.id, "");
              const title = stringField(milestone.title, "");
              return value && title ? (
                <option key={value} value={value} data-state="open">
                  {title}
                </option>
              ) : null;
            })}
            {milestoneTitle &&
            !milestones.some((milestone) => stringField(milestone.id, "") === milestoneId) ? (
              <option value={milestoneId} data-state="open">
                {milestoneTitle}
              </option>
            ) : null}
          </optgroup>
        </select>
        <LegacyEditSingleSelect
          className="fullsize"
          label={t("milestone")}
          onChange={onChange}
          options={options}
          value={milestoneId}
          selectedContent={
            milestoneId !== "0" && selectedMilestoneTitle ? (
              <div title={`${t("milestone.state.open")} ${selectedMilestoneTitle}`}>
                {selectedMilestoneTitle}
              </div>
            ) : undefined
          }
        />
      </dd>
    </dl>
  );
}

function SubtaskSelects({
  issue,
  parentOptions,
  project,
  showOption,
}: {
  issue: RestIssueDetailResponse;
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
  const issueRecord = issue as YoramRecord;
  const parentIssueId = stringField(issueRecord.parentIssueId, "");
  const hasChildIssue = booleanField(issueRecord.hasChildIssue);
  const movableProjects = issueMovableProjects(project);
  const visibleParentOptions = hasChildIssue
    ? parentOptions.filter((parentIssue) => String(parentIssue.id) === parentIssueId)
    : parentOptions;
  const projectOptions = [
    {
      label: stringField(project.projectName, ""),
      value: stringField(project.id, ""),
    },
    ...movableProjects.map((movableProject) => ({
      label: movableProject.name,
      value: movableProject.id,
    })),
  ];
  const parentSelectOptions = [
    {
      label: hasChildIssue ? "이미 부모 이슈입니다." : t("issue.subtask.select"),
      value: "",
    },
    ...visibleParentOptions.map((parentIssue) => ({
      label: `#${String(parentIssue.issueNumber)}. ${parentIssue.title}`,
      value: String(parentIssue.id),
    })),
  ];
  const [targetProjectId, setTargetProjectId] = useState(() => stringField(project.id, ""));
  const [selectedParentIssueId, setSelectedParentIssueId] = useState(parentIssueId);
  return (
    <div className={`subtask-wrap ${showOption ? "show" : ""}`} data-owner="issue-editform-subtask">
      <div className="span3">
        <select
          id="targetProjectId"
          name="targetProjectId"
          data-format="projects"
          data-placeholder={t("organization.choose.projects")}
          data-container-css-class="fullsize"
          className="select2-offscreen"
          disabled={!showOption}
          value={targetProjectId}
          onChange={(event) => setTargetProjectId(event.currentTarget.value)}
        >
          <option value={stringField(project.id, "")}>
            {stringField(project.projectName, "")}
          </option>
          {movableProjects.map((movableProject) => (
            <option
              key={movableProject.id}
              value={movableProject.id}
              data-owner={movableProject.owner ? `${movableProject.owner} /` : undefined}
            >
              {movableProject.name}
            </option>
          ))}
        </select>
        <LegacyEditSingleSelect
          className="fullsize"
          id="s2id_targetProjectId"
          label={t("organization.choose.projects")}
          onChange={setTargetProjectId}
          options={projectOptions}
          value={targetProjectId}
        />
      </div>
      <div className="span6">
        <select
          id="parentId"
          name="parentIssueId"
          data-format="issues"
          data-placeholder={t("organization.choose.projects")}
          data-container-css-class="fullsize"
          className="select2-offscreen"
          disabled={!showOption}
          value={selectedParentIssueId}
          onChange={(event) => setSelectedParentIssueId(event.currentTarget.value)}
        >
          <option value="">
            {hasChildIssue ? "이미 부모 이슈입니다." : t("issue.subtask.select")}
          </option>
          {visibleParentOptions.map((parentIssue) => (
            <option key={String(parentIssue.id)} value={String(parentIssue.id)}>
              #{String(parentIssue.issueNumber)}. {parentIssue.title}
            </option>
          ))}
        </select>
        <LegacyEditSingleSelect
          className="fullsize"
          id="s2id_parentId"
          label={t("issue.subtask.select")}
          onChange={setSelectedParentIssueId}
          options={parentSelectOptions}
          value={selectedParentIssueId}
        />
      </div>
    </div>
  );
}

function IssueLabelSelect({
  labels,
  ownerName,
  projectName,
  onChange,
  selectedLabelIds,
}: {
  labels: YoramRecord[];
  ownerName: string;
  projectName: string;
  onChange: (value: string[]) => void;
  selectedLabelIds: string[];
}) {
  const { t } = useLegacyMessages();
  if (labels.length === 0) {
    return null;
  }
  const selectedIds = new Set(selectedLabelIds);
  return (
    <dl className="issue-option" data-owner="issue-editform-labels">
      <dt>
        {t("label")}{" "}
        <Link
          activeProps={legacyRouteLocalActiveProps}
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
          data-format="issuelabel"
          data-allow-clear="true"
          data-dropdown-css-class="issue-labels"
          data-container-css-class="issue-labels bordered fullsize"
          data-placeholder={t("label.select")}
          data-close-on-select="false"
          className="hide select2-offscreen"
          value={selectedLabelIds}
          onChange={(event) =>
            onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
          }
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
        <LegacyEditLabelSelect labels={labels} onChange={onChange} selectedLabelIds={selectedIds} />
      </dd>
    </dl>
  );
}

function LegacyEditSingleSelect({
  className,
  id,
  label,
  onChange,
  options,
  value,
  selectedContent,
}: {
  className: string;
  id?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
  selectedContent?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? options[0]?.label;
  return (
    <div
      id={id}
      className={`select2-container ${className}${open ? " select2-dropdown-open" : ""}`}
      data-owner={className === "bigdrop" ? "issue-editform-assignee-picker" : undefined}
    >
      <div
        className="select2-choice"
        role="button"
        aria-label={label}
        aria-expanded={open}
        tabIndex={0}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => activateEditControl(event, () => setOpen((current) => !current))}
      >
        <span className="select2-chosen">{selectedContent ?? selectedLabel}</span>
        <span className="select2-arrow" aria-hidden="true">
          <b></b>
        </span>
      </div>
      <div className={`select2-drop${open ? " select2-drop-active" : " select2-display-none"}`}>
        <ul className="select2-results" role="listbox">
          {options.map((option) => (
            <li
              key={option.value}
              className={option.value === value ? "select2-highlighted" : undefined}
            >
              <div
                className="select2-result-label"
                role="option"
                tabIndex={open ? 0 : -1}
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                onKeyDown={(event) =>
                  activateEditControl(event, () => {
                    onChange(option.value);
                    setOpen(false);
                  })
                }
              >
                {option.label}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LegacyEditLabelSelect({
  labels,
  onChange,
  selectedLabelIds,
}: {
  labels: YoramRecord[];
  onChange: (value: string[]) => void;
  selectedLabelIds: Set<string>;
}) {
  const { t } = useLegacyMessages();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = [...selectedLabelIds];
  const toggle = (id: string) => {
    onChange(
      selectedLabelIds.has(id) ? selected.filter((value) => value !== id) : [...selected, id],
    );
    setQuery("");
  };
  const visibleGroups = groupLabels(labels)
    .map((group) => ({
      ...group,
      labels: group.labels.filter((label) =>
        label.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
    }))
    .filter((group) => group.labels.length > 0);
  const selectedLabelElements: ReactNode[] = [];
  for (const label of labels) {
    const labelId = stringField(label.id, "");
    if (!selectedLabelIds.has(labelId)) continue;
    const labelName = stringField(label.name, "");
    const labelColor = stringField(label.color, "");
    selectedLabelElements.push(
      <li className="select2-search-choice" key={labelId}>
        <div>
          <strong
            data-label-id={labelId}
            style={labelColor ? { backgroundColor: labelColor } : undefined}
            className="label issue-label active static"
          >
            {labelName}
          </strong>
        </div>
        <span
          className="select2-search-choice-close"
          role="button"
          tabIndex={0}
          aria-label={`${labelName} ${t("button.delete")}`}
          onClick={() => toggle(labelId)}
          onKeyDown={(event) => activateEditControl(event, () => toggle(labelId))}
        ></span>
      </li>,
    );
  }
  return (
    <div
      className="select2-container select2-container-multi hide issue-labels bordered fullsize"
      data-owner="issue-editform-label-picker"
    >
      <ul className="select2-choices">
        {selectedLabelElements}
        <li className="select2-search-field">
          <input
            className="select2-input"
            aria-label={t("label.select")}
            autoComplete="off"
            data-owner="issue-editform-label-search-input"
            aria-expanded={open}
            value={query}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setOpen(true);
            }}
          />
        </li>
      </ul>
      <div
        className={`select2-drop select2-drop-multi issue-labels ${
          open ? "select2-drop-active" : "select2-display-none"
        }`}
        data-owner="issue-editform-label-menu"
      >
        <ul className="select2-results" role="listbox">
          {visibleGroups.map((group) => (
            <li
              className="select2-results-dept-0 select2-result select2-result-unselectable select2-result-with-children"
              key={group.categoryId}
            >
              <div className="select2-result-label">
                <span>{group.categoryName}</span>
              </div>
              <ul className="select2-result-sub">
                {group.labels.map((label) => {
                  const selectedLabel = selectedLabelIds.has(label.id);
                  return (
                    <li
                      className={`select2-results-dept-1 select2-result select2-result-selectable${
                        selectedLabel ? " select2-selected" : ""
                      }`}
                      key={label.id}
                    >
                      <div
                        className="select2-result-label"
                        role="option"
                        tabIndex={open ? 0 : -1}
                        aria-selected={selectedLabel}
                        onClick={() => toggle(label.id)}
                        onKeyDown={(event) =>
                          activateEditControl(event, () => toggle(label.id))
                        }
                      >
                        {label.name}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function activateEditControl(event: KeyboardEvent<HTMLElement>, activate: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    activate();
  }
}

function IssueEditMarkdownEditor({
  bodyRef,
  dragOverlay,
  dragProps,
  focusRequest,
  onBodyChange,
  onClearTemporary,
  onDropFiles,
  showClearTemporary,
  onFiles,
  value,
}: {
  bodyRef: RefObject<HTMLTextAreaElement | null>;
  dragOverlay: boolean;
  dragProps: Pick<
    HTMLAttributes<HTMLDivElement>,
    "onDragEnter" | "onDragLeave" | "onDragOver" | "onDrop"
  >;
  focusRequest: number;
  onBodyChange: (value: string) => void;
  onClearTemporary: () => void;
  onDropFiles: () => void;
  onFiles: (files: File[], selection?: BodySelection) => void;
  showClearTemporary: boolean;
  value: string;
}) {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  useEffect(() => {
    if (focusRequest > 0) {
      bodyRef.current?.focus();
    }
  }, [bodyRef, focusRequest]);
  return (
    <div className="mt10" data-owner="issue-editform-markdown-editor-wrapper">
      <ul className="nav nav-tabs nm small">
        <TabButton
          active={activeTab === "edit"}
          size="small"
          type="button"
          onClick={() => setActiveTab("edit")}
        >
          {t("common.editor.edit")}
        </TabButton>
        <TabButton
          active={activeTab === "preview"}
          size="small"
          type="button"
          onClick={() => setActiveTab("preview")}
        >
          {t("common.editor.preview")}
        </TabButton>
        <li>
          <div className="task-list-button">
            <button
              type="button"
              className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
              onClick={() => {
                const textarea = bodyRef.current;
                const start = textarea?.selectionStart ?? value.length;
                onBodyChange(
                  `${value.slice(0, start)}${CHECKLIST_TEMPLATE}${value.slice(start)}`,
                );
                requestAnimationFrame(() => {
                  const nextCursor = start + CHECKLIST_TEMPLATE.length;
                  bodyRef.current?.focus();
                  bodyRef.current?.setSelectionRange(nextCursor, nextCursor);
                });
              }}
            >
              <i className="yobicon-list task-list-icon"></i> {t("button.add.checklist")}
            </button>
          </div>
        </li>
        <li>
          <div
            className="editor-clear-temporary"
            style={showClearTemporary ? { display: "block" } : undefined}
          >
            <div className="editor-clear-temporary-button">
              <button
                type="button"
                id="button-clear-temporary"
                className="ybtn ybtn-small ybtn-warning"
                onClick={onClearTemporary}
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
        className="tab-content"
        style={{ position: "relative", overflow: "visible" }}
        data-owner="issue-editform-editor-tab-content"
      >
        <LegacyMarkdownHelp />
        <div id="edit-body" className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
          <div
            {...dragProps}
            className={`textarea-box${dragOverlay ? " dragover" : ""}`}
          >
            {dragOverlay ? (
              <div className="upload-drop-here">
                <div className="msg-wrap">
                  <div className="msg">{t("common.attach.dropFilesHere")}</div>
                </div>
              </div>
            ) : null}
            <textarea
              data-owner="issue-editform-editor"
              ref={bodyRef}
              name="body"
              className="editorSeries content comment nm"
              data-editor-mode="content-body"
              id="editor-body-body"
              value={value}
              onChange={(event) => onBodyChange(event.currentTarget.value)}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData.files).filter((file) =>
                  file.type.startsWith("image/"),
                );
                if (files.length === 0) return;
                event.preventDefault();
                onFiles(files, {
                  end: event.currentTarget.selectionEnd,
                  start: event.currentTarget.selectionStart,
                });
              }}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("Files")) event.preventDefault();
              }}
              onDrop={(event) => {
                const files = Array.from(event.dataTransfer.files);
                if (files.length === 0) return;
                event.preventDefault();
                event.stopPropagation();
                onDropFiles();
                onFiles(files, {
                  end: event.currentTarget.selectionEnd,
                  start: event.currentTarget.selectionStart,
                });
              }}
              tabIndex={Number("2")}
              {...{ markdown: "true" }}
            ></textarea>
          </div>
        </div>
        <div id="preview-body" className={`tab-pane${activeTab === "preview" ? " active" : ""}`}>
          <div className="markdown-preview markdown-wrap content-body" data-via-email="false">
            <LegacyMarkdown>{value}</LegacyMarkdown>
          </div>
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

function groupLabels(labels: YoramRecord[]) {
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

function issueMovableProjects(project: ProjectContainer) {
  const currentProjectId = stringField(project.id, "");
  const rawProjects = (project as YoramRecord).movableIssueProjects;
  if (!Array.isArray(rawProjects)) {
    return [];
  }

  const projects: Array<{ id: string; name: string; owner: string }> = [];
  for (const rawProject of rawProjects) {
    if (!rawProject || typeof rawProject !== "object" || Array.isArray(rawProject)) {
      continue;
    }
    const record = rawProject as YoramRecord;
    const id = stringField(record.id, "");
    const name = stringField(record.projectName, "") || stringField(record.name, "");
    if (!id || !name || id === currentProjectId) {
      continue;
    }
    projects.push({
      id,
      name,
      owner: stringField(record.ownerName, "") || stringField(record.owner, ""),
    });
  }
  return projects;
}

function stringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isValidIssueDueDate(value: string) {
  const trimmed = value.trim();
  return trimmed === "" || !Number.isNaN(Date.parse(trimmed));
}

function YoramToast({ message, noticeKey }: { message: string; noticeKey: number }) {
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
