import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";
import {
  readProjectPostQueryOptions,
  updateProjectPostRest,
  type BoardPostDetail,
} from "../../../../../api/boards";
import { readSessionBootstrap } from "../../../../../auth-workspace-client";
import { useLegacyMessages } from "../../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";

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
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <form
          action={prefixBasePath(
            runtimeConfig.basePath,
            `/${ownerName}/${projectName}/post/${postNumber}`,
          )}
          method="post"
          encType="multipart/form-data"
          className="nm"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(event.currentTarget);
          }}
        >
          <div className="content-wrap frm-wrap">
            <dl>
              <dt>
                <label htmlFor="title">{t("title")}</label>
              </dt>
              <dd>
                <LegacyTabIndexInput
                  tabIndexValue="1"
                  type="text"
                  id="title"
                  name="title"
                  defaultValue={post.title}
                  className="zen-mode text title "
                  maxLength={250}
                  autoComplete="off"
                />
              </dd>
              <dd style={{ position: "relative" }}>
                <BoardPostMarkdownEditor value={post.bodyMarkdown} />
              </dd>
            </dl>

            <BoardPostFileUploader resourceId={String(post.id)} />

            <div className="right-txt mt10 mb10">
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

            <div className="actions">
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
                <LegacyTabIndexButton tabIndexValue="3" className="ybtn ybtn-info">
                  {t("button.save")}
                </LegacyTabIndexButton>
              ) : null}
              <HistoryBackLink>{t("button.cancel")}</HistoryBackLink>
            </div>
          </div>
        </form>
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

function LegacyTabIndexButton({
  tabIndexValue,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tabIndexValue: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    buttonRef.current?.setAttribute("tabindex", tabIndexValue);
  }, [tabIndexValue]);
  return <button ref={buttonRef} {...props}></button>;
}

function HistoryBackLink({ children }: { children: string }) {
  return (
    // oxlint-disable-next-line jsx-a11y/tabindex-no-positive -- legacy board/edit.scala.html sets tabindex="4" on Cancel.
    <button type="button" className="ybtn" tabIndex={4} onClick={() => window.history.back()}>
      {children}
    </button>
  );
}

function BoardPostMarkdownEditor({ value }: { value: string }) {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    bodyRef.current?.setAttribute("tabindex", "2");
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
        <div id="edit-body" className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              ref={bodyRef}
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

function BoardPostFileUploader({ resourceId }: { resourceId: string }) {
  const { t } = useLegacyMessages();
  return (
    <div
      id="upload"
      className="upload-wrap content-footer"
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
