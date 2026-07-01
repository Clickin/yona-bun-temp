import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
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
                <div data-toggle="markdown-editor" className="markdown-editor-wrap">
                  <LegacyTabIndexTextarea
                    tabIndexValue="2"
                    id="editor-body-content-body"
                    name="body"
                    data-editor-mode="content-body"
                    defaultValue={post.bodyMarkdown}
                  ></LegacyTabIndexTextarea>
                  <div id="preview-content-body" className="preview markdown-wrap"></div>
                </div>
              </dd>
            </dl>

            <div
              className="upload-wrap content-footer"
              data-resource-type="BOARD_POST"
              data-resource-id={post.id}
            >
              <div className="attach-wrap">
                <div className="attachments" id="attachments"></div>
              </div>
            </div>

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
  const anchorRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    anchorRef.current?.setAttribute("href", "javascript:history.back();");
    anchorRef.current?.setAttribute("tabindex", "4");
  }, []);
  return (
    <a ref={anchorRef} href="/" className="ybtn">
      {children}
    </a>
  );
}

function stringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
