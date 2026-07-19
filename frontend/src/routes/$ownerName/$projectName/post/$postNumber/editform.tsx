/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy board/edit.scala.html sets positive tabindex values on the edit form controls. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as stylex from "@stylexjs/stylex";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";
import {
  readProjectPostQueryOptions,
  updateProjectPostRest,
  type BoardPostDetail,
} from "../../../../../api/boards";
import { readSessionBootstrap } from "../../../../../auth-workspace-client";
import { useLegacyMessages } from "../../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";
import { postEditFormTheme, styles } from "./-post-editform.stylex";

const formStyleProps = stylex.props(styles.form);

export const Route = createFileRoute("/$ownerName/$projectName/post/$postNumber/editform")({
  component: ProjectBoardEditFormRoute,
});

function ProjectBoardEditFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectBoardEditFormScreen runtimeConfig={runtimeConfig} />;
}

function ProjectBoardEditFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, postNumber, projectName } = Route.useParams();
  const postQuery = useQuery(
    readProjectPostQueryOptions(runtimeConfig, { ownerName, postNumber, projectName }),
  );

  if (!postQuery.data) {
    return null;
  }

  return <ProjectBoardEditFormBody post={postQuery.data} runtimeConfig={runtimeConfig} />;
}

function ProjectBoardEditFormBody({
  post,
  runtimeConfig,
}: {
  post: BoardPostDetail;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ownerName, postNumber, projectName } = Route.useParams();
  const canSetNotice = Boolean(post.permissions.canSetNotice);
  const canUpdate = Boolean(post.permissions.canUpdate);
  const canShowReadme = canUpdate;
  const canSendNotification = !post.readme && post.authorLoginId !== "";
  const [titleFocusRequest, setTitleFocusRequest] = useState(1);
  const [bodyFocusRequest, setBodyFocusRequest] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (titleFocusRequest > 0) {
      titleRef.current?.focus();
    }
  }, [titleFocusRequest]);
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateProjectPostRest(runtimeConfig, csrfToken, {
        attachmentIds: [],
        bodyMarkdown: stringFormValue(formData, "body"),
        notice: formData.has("notice"),
        ownerName,
        postNumber,
        projectName,
        readme: formData.has("readme"),
        title: stringFormValue(formData, "title"),
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["project", ownerName, projectName, "posts"] });
      queryClient.invalidateQueries({
        queryKey: ["project", ownerName, projectName, "posts", postNumber],
      });
      router.history.push(
        prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/post/${postNumber}`),
      );
    },
  });

  return (
    <>
      <title>{`${t("post.modify")} - ${ownerName}/${projectName}`}</title>
      <div className="page-wrap-outer" data-stylex-owner="post-edit-form-page">
        <div className="project-page-wrap">
          <form
            {...formStyleProps}
            data-stylex-owner="post-edit-form"
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/post/${postNumber}`,
            )}
            method="post"
            encType="multipart/form-data"
            className={`${formStyleProps.className} nm`}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              if (stringFormValue(formData, "title").trim() === "") {
                window.alert(t("post.error.emptyTitle"));
                setTitleFocusRequest((current) => current + 1);
                return;
              }
              mutation.mutate(event.currentTarget);
            }}
          >
            <div className="content-wrap frm-wrap">
              <dl>
                <dt>
                  <label htmlFor="title">{t("title")}</label>
                </dt>
                <dd data-stylex-owner="post-edit-form-title">
                  <input
                    ref={titleRef}
                    tabIndex={1}
                    type="text"
                    id="title"
                    name="title"
                    defaultValue={post.title}
                    className="zen-mode text title "
                    maxLength={250}
                    autoComplete="off"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        setBodyFocusRequest((current) => current + 1);
                      }
                    }}
                  />
                </dd>
                <dd
                  {...stylex.props(styles.editorWrapper)}
                  data-stylex-owner="post-edit-form-editor"
                >
                  <BoardPostMarkdownEditor
                    focusRequest={bodyFocusRequest}
                    value={post.bodyMarkdown}
                  />
                </dd>
              </dl>

              <BoardPostFileUploader resourceId={String(post.id)} />

              <div
                className={`${stylex.props(styles.options).className} right-txt mt10 mb10`}
                data-stylex-owner="post-edit-form-options"
              >
                {canSetNotice ? (
                  <label className="checkbox">
                    <input type="checkbox" id="notice" name="notice" defaultChecked={post.notice} />
                    {t("post.notice.label")}
                  </label>
                ) : null}
                {canShowReadme ? (
                  <label className="checkbox">
                    <input type="checkbox" id="readme" name="readme" defaultChecked={post.readme} />
                    {t("post.readmefy")}
                  </label>
                ) : null}
              </div>

              <div
                className={`${stylex.props(styles.actions).className} actions`}
                data-stylex-owner="post-edit-form-actions"
              >
                {canSendNotification ? (
                  <span className="send-notification-check">
                    <label className="checkbox inline">
                      <input
                        type="checkbox"
                        name="notificationMail"
                        id="notificationMail"
                        value="yes"
                        defaultChecked={true}
                      />
                      <strong>{t("notification.send.mail")}</strong>
                    </label>
                  </span>
                ) : null}
                {canUpdate ? (
                  <>
                    <button tabIndex={3} className="ybtn ybtn-info">
                      {t("button.save")}
                    </button>{" "}
                  </>
                ) : null}
                <HistoryBackLink>{t("button.cancel")}</HistoryBackLink>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function HistoryBackLink({ children }: { children: string }) {
  const router = useRouter();

  return (
    <button type="button" className="ybtn" tabIndex={4} onClick={() => router.history.back()}>
      {children}
    </button>
  );
}

function BoardPostMarkdownEditor({ focusRequest, value }: { focusRequest: number; value: string }) {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusRequest > 0) {
      bodyRef.current?.focus();
    }
  }, [focusRequest]);
  return (
    <div className="mt10">
      <ul
        className={`${stylex.props(styles.editorTabs).className} nav nav-tabs nm small`}
        data-stylex-owner="post-edit-form-editor-tabs"
      >
        <li className={activeTab === "edit" ? "active" : undefined}>
          <Link
            to="."
            search={(previous) => previous}
            hash="edit-body"
            onClick={() => setActiveTab("edit")}
          >
            {t("common.editor.edit")}
          </Link>
        </li>
        <li className={activeTab === "preview" ? "active" : undefined}>
          <Link
            to="."
            search={(previous) => previous}
            hash="preview-body"
            onClick={() => setActiveTab("preview")}
          >
            {t("common.editor.preview")}
          </Link>
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
        className={`${stylex.props(styles.editorContent).className} tab-content`}
        data-stylex-owner="post-edit-form-editor-content"
      >
        <LegacyMarkdownHelp />
        <div id="edit-body" className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              ref={bodyRef}
              tabIndex={2}
              name="body"
              className="editorSeries content comment nm"
              data-editor-mode="content-body"
              id="editor-body-body"
              defaultValue={value}
              {...{ markdown: "true" }}
            ></textarea>
          </div>
        </div>
        <div id="preview-body" className={`tab-pane${activeTab === "preview" ? " active" : ""}`}>
          <div className="markdown-preview markdown-wrap content-body" data-via-email="false"></div>
        </div>
        <div
          className={`${stylex.props(styles.notificationReceiver).className} notification-receiver`}
          data-stylex-owner="post-edit-form-notification"
        >
          <span className="notification-receiver-title">
            {t("notification.receiver.list.title")}
          </span>
          <span className="notification-receiver-list"></span>
        </div>
      </div>
    </div>
  );
}

function BoardPostFileUploader({ resourceId }: { resourceId: string }) {
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
      data-stylex-owner="post-edit-form-uploader"
      data-resource-type="BOARD_POST"
      data-resource-id={resourceId}
    >
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
          {...(pasteSupported ? stylex.props(styles.pasteHelpVisible) : {})}
          data-stylex-owner="post-edit-form-paste-help"
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

function stringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
