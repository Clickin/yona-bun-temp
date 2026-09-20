/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy board/edit.scala.html sets positive tabindex values on the edit form controls. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BoardPostFileUploader } from "../../../../../components/file-uploader";
import { BoardPostMarkdownEditor } from "../../../../../components/markdown-editor";
import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  readProjectPostQueryOptions,
  updateProjectPostRest,
  type BoardPostDetail,
} from "../../../../../api/boards";
import { ProjectPostEditNotFoundBody, ProjectPostEditNotFoundTitle } from "../$postNumber";
import { readSessionBootstrap } from "../../../../../auth-workspace-client";
import { currentSessionQueryOptions } from "../../../../../api/session";

import { useLegacyMessages } from "../../../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../../../runtime-config";

function restApiErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

export const Route = createFileRoute("/$ownerName/$projectName/post/$postNumber/editform")({
  component: ProjectBoardEditFormRoute,
});

function ProjectBoardEditFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectBoardEditFormScreen runtimeConfig={runtimeConfig} />;
}

function ProjectBoardEditFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, postNumber, projectName } = Route.useParams();
  const postQuery = useQuery({
    ...readProjectPostQueryOptions(runtimeConfig, { ownerName, postNumber, projectName }),
    retry(failureCount, error) {
      return restApiErrorStatus(error) !== 404 && failureCount < 3;
    },
  });

  if (restApiErrorStatus(postQuery.error) === 404) {
    return (
      <>
        <ProjectPostEditNotFoundTitle />
        <ProjectPostEditNotFoundBody />
      </>
    );
  }

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
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const canSetNotice = Boolean(post.permissions.canSetNotice);
  const canUpdate = Boolean(post.permissions.canUpdate);
  const canShowReadme = canUpdate;
  const canSendNotification =
    !post.readme &&
    sessionQuery.data?.isAnonymous === false &&
    post.authorId === String(sessionQuery.data.actorId);
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
        notificationMail: formData.has("notificationMail"),
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
      <div className="page-wrap-outer" data-owner="post-edit-form-page">
        <div className="project-page-wrap">
          <form
            data-owner="post-edit-form"
            action={prefixBasePath(
              runtimeConfig.basePath,
              `/${ownerName}/${projectName}/post/${postNumber}`,
            )}
            method="post"
            encType="multipart/form-data"
            className="nm"
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
                <dd data-owner="post-edit-form-title">
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
                <dd data-owner="post-edit-form-editor" style={{ position: "relative" }}>
                  <BoardPostMarkdownEditor
                    focusRequest={bodyFocusRequest}
                    value={post.bodyMarkdown}
                    help={<LegacyMarkdownHelp />}
                    wrapperClassName="mt10"
                    tabContentClassName="tab-content"
                    owners={{
                      wrapper: "post-edit-form-markdown-editor-wrapper",
                      tabs: "post-edit-form-editor-tabs",
                      tabContent: "post-edit-form-editor-content",
                      notification: "post-edit-form-notification",
                    }}
                  />
                </dd>
              </dl>

              <BoardPostFileUploader
                resourceId={String(post.id)}
                pasteHelpFixedStyleProps={{ style: { display: "block" } }}
                helpClassName="right-txt help"
                owners={{
                  wrapper: "post-edit-form-uploader",
                  pasteHelp: "post-edit-form-paste-help",
                  saveHelp: "post-edit-form-upload-save-help",
                }}
              />

              <div className="mt10 mb10" data-owner="post-edit-form-options">
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

              <div className="actions" data-owner="post-edit-form-actions">
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
                  <button tabIndex={3} className="ybtn ybtn-info">
                    {t("button.save")}
                  </button>
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

function stringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
