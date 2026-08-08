/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy board/create.scala.html requires positive tab order on title/body/save/cancel. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BoardPostFileUploader } from "../../../components/file-uploader";
import { LegacyTabIndexInput } from "../../../components/legacy-tab-index-input";
import { BoardPostMarkdownEditor } from "../../../components/markdown-editor";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useState, type ReactNode } from "react";
import {
  createProjectPostRest,
  readProjectPostFormOptionsQueryOptions,
  type BoardOnlineCommitResponse,
} from "../../../api/boards";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { styles } from "./-postform.stylex";

const sx = {
  editorWrapper: stylex.props(styles.editorWrapper),
  markdownEditorWrapper: stylex.props(styles.markdownEditorWrapper),
  editorTabContent: stylex.props(styles.editorTabContent),
  form: stylex.props(styles.form),
  editor: stylex.props(styles.editor),
  actions: stylex.props(styles.actions),
  save: stylex.props(styles.save),
  cancel: stylex.props(styles.cancel),
} as const;

type BoardPostFormSearch = {
  branch?: string;
  edit?: true;
  issueTemplate?: true;
  path?: string;
  readme?: true;
};

export const Route = createFileRoute("/$ownerName/$projectName/postform")({
  component: ProjectBoardCreateFormRoute,
  validateSearch(search: Record<string, unknown>): BoardPostFormSearch {
    return {
      branch: stringSearch(search.branch),
      edit: booleanSearch(search.edit),
      issueTemplate: booleanSearch(search.issueTemplate),
      path: stringSearch(search.path),
      readme: booleanSearch(search.readme),
    };
  },
});

function ProjectBoardCreateFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectBoardCreateFormScreen renderProjectShell={false} runtimeConfig={runtimeConfig} />;
}

export function ProjectBoardCreateFormScreen({
  renderProjectShell = true,
  runtimeConfig,
}: {
  renderProjectShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const content = <ProjectBoardCreateFormRouteShell runtimeConfig={runtimeConfig} />;

  if (!renderProjectShell) {
    return content;
  }

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectBoardCreateFormStandaloneShell runtimeConfig={runtimeConfig}>
          {content}
        </ProjectBoardCreateFormStandaloneShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectBoardCreateFormStandaloneShell({
  children,
  runtimeConfig,
}: {
  children: ReactNode;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();

  return (
    <>
      <title>{`${t("post.new")} - ${ownerName}/${projectName}`}</title>
      <SiteLayoutShell
        projectSearchScope={{ ownerName, projectName }}
        runtimeConfig={runtimeConfig}
      >
        {children}
      </SiteLayoutShell>
    </>
  );
}

function ProjectBoardCreateFormRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  return <ProjectBoardCreateFormBody runtimeConfig={runtimeConfig} />;
}

function ProjectBoardCreateFormBody({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const optionsQuery = useQuery(
    readProjectPostFormOptionsQueryOptions(runtimeConfig, {
      branch: search.branch,
      edit: Boolean(search.edit),
      issueTemplate: Boolean(search.issueTemplate),
      ownerName,
      path: search.path ?? "",
      projectName,
      readme: Boolean(search.readme),
    }),
  );
  const options = optionsQuery.data;
  const onlineCommit = options?.onlineCommit;
  const title = onlineCommit?.title ?? "";
  const body = onlineCommit?.preparedBodyMarkdown ?? "";
  const path = onlineCommit?.path ?? search.path ?? "";
  const branch = onlineCommit?.branch ?? search.branch ?? "";
  const issueTemplate = Boolean(onlineCommit?.issueTemplate ?? search.issueTemplate);
  const isOnlineCommit = search.path !== undefined;
  const canShowNotice = Boolean(options?.canMarkNotice) && !issueTemplate && !isOnlineCommit;
  const canShowUploader = Boolean(options?.canAttachFiles) && !issueTemplate && !isOnlineCommit;
  const canShowReadme = Boolean(options?.canMarkReadme) && search.readme && !issueTemplate;
  const [titleFocusRequest, setTitleFocusRequest] = useState(1);
  const [bodyFocusRequest, setBodyFocusRequest] = useState(0);
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createProjectPostRest(runtimeConfig, csrfToken, {
        attachmentIds: [],
        bodyMarkdown: stringFormValue(formData, "body"),
        branch: stringFormValue(formData, "branch"),
        edit: Boolean(search.edit),
        issueTemplate,
        lineEnding: stringFormValue(formData, "lineEnding"),
        newFileName: stringFormValue(formData, "new-file-name"),
        notice: formData.has("notice"),
        ownerName,
        path: stringFormValue(formData, "path"),
        projectName,
        readme: formData.has("readme"),
        title: stringFormValue(formData, "title"),
      });
    },
    onSuccess(created) {
      queryClient.invalidateQueries({ queryKey: ["project", ownerName, projectName, "posts"] });
      if (isOnlineCommitResponse(created)) {
        router.history.push(prefixBasePath(runtimeConfig.basePath, created.redirectHref));
        return;
      }
      router.history.push(
        prefixBasePath(
          runtimeConfig.basePath,
          `/${ownerName}/${projectName}/post/${created.postNumber}`,
        ),
      );
    },
  });

  if (!optionsQuery.data) {
    return (
      <div
        className="page-wrap-outer"
        data-stylex-owner="project-postform-loading-shell"
        data-stylex-content-ready="false"
      >
        <div className="project-page-wrap">
          <form className="nm">
            <div className="content-wrap frm-wrap"></div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-wrap-outer"
      data-stylex-owner="project-postform-page"
      data-stylex-content-ready="true"
    >
      <div className="project-page-wrap" data-stylex-owner="project-postform-shell">
        <form
          action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/posts`)}
          method="post"
          encType="multipart/form-data"
          {...sx.form}
          className={`nm ${sx.form.className ?? ""}`.trim()}
          data-stylex-owner="project-postform-form"
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
          <div className="content-wrap frm-wrap" data-stylex-owner="project-postform-content">
            <dl>
              <dd>
                <LegacyTabIndexInput
                  focusRequest={titleFocusRequest}
                  tabIndex={1}
                  type="text"
                  id="title"
                  autoComplete="off"
                  name="title"
                  data-stylex-owner="project-postform-title"
                  maxLength={250}
                  defaultValue={title}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setBodyFocusRequest((current) => current + 1);
                    }
                  }}
                  className="zen-mode text title"
                  placeholder={isOnlineCommit ? t("code.commitMsg") : t("title")}
                />
              </dd>
              <dd>
                {issueTemplate ? (
                  <div className="attach-wrap">
                    <span className="help help-droppable">
                      {t("issue.template.no.attachment.allow")}
                    </span>
                  </div>
                ) : null}
                {isOnlineCommit ? (
                  <div className="file-path-wrap">
                    <span className="help file-path">
                      {branch}: /{path}{" "}
                      {search.edit ? null : (
                        <LegacyTabIndexInput
                          tabIndex={2}
                          type="text"
                          name="new-file-name"
                          className="new-file-name"
                          defaultValue=""
                          placeholder="filename.."
                        />
                      )}
                    </span>
                  </div>
                ) : null}
              </dd>
              <dd {...sx.editorWrapper} data-stylex-owner="project-postform-editor-wrapper">
                <BoardPostMarkdownEditor
                  focusRequest={bodyFocusRequest}
                  search={compactBoardPostFormSearch(search)}
                  linkActiveProps={{}}
                  tabIndex={3}
                  value={body}
                  wrapperClassName={`mt10 ${sx.markdownEditorWrapper.className ?? ""}`.trim()}
                  wrapperStyle={sx.markdownEditorWrapper}
                  editorStyle={sx.editor}
                  tabContentClassName={`${sx.editorTabContent.className} tab-content`}
                  owners={{
                    wrapper: "project-postform-markdown-editor-wrapper",
                    tabContent: "project-postform-editor-tab-content",
                    editor: "project-postform-editor",
                  }}
                />
              </dd>
            </dl>

            {canShowUploader ? (
              <BoardPostFileUploader
                wrapperStyleProps={stylex.props(styles.uploadWrap)}
                attachWrapStyleProps={stylex.props(styles.attachWrap)}
                btnWrapStyleProps={stylex.props(styles.uploadButtonWrap)}
                plainStyleProps={stylex.props(styles.uploadPlain)}
                pasteHelpStyleProps={stylex.props(styles.pasteHelpVisible)}
                attachedFilesStyleProps={stylex.props(styles.attachedFiles)}
                helpClassName={`right-txt help ${stylex.props(styles.uploadAttachSaveHelp).className ?? ""}`.trim()}
                helpStyleProps={stylex.props(styles.uploadAttachSaveHelp)}
                owners={{
                  wrapper: "project-postform-upload-wrap",
                  attachWrap: "project-postform-attach-wrap",
                  btnWrap: "project-postform-upload-button-wrap",
                  plain: "project-postform-upload-plain",
                  pasteHelp: "project-postform-paste-help",
                  attachedFiles: "project-postform-attached-files",
                  saveHelp: "project-postform-upload-attach-save-help",
                }}
              />
            ) : null}

            <div
              {...stylex.props(styles.options)}
              className={`mt10 mb10 ${stylex.props(styles.options).className ?? ""}`.trim()}
              data-stylex-owner="project-postform-options"
            >
              {canShowNotice ? (
                <label className="checkbox">
                  <input type="checkbox" id="notice" name="notice" />
                  {t("post.notice.label")}
                </label>
              ) : null}
              <input
                type="hidden"
                id="issueTemplate"
                name="issueTemplate"
                value={issueTemplate ? "true" : ""}
              />
              <input type="hidden" id="branch" name="branch" value={branch} />
              <input type="hidden" id="path" name="path" value={path} />
              <input type="hidden" id="lineEnding" name="lineEnding" value={lineEnding(body)} />
              {canShowReadme ? (
                <label className="checkbox">
                  <input type="checkbox" id="readme" name="readme" defaultChecked={true} />
                  {t("post.readmefy")}
                </label>
              ) : null}
            </div>

            <div {...sx.actions} data-stylex-owner="project-postform-actions">
              <button {...sx.save} data-stylex-owner="project-postform-save" tabIndex={3}>
                {t("button.save")}
              </button>
              <HistoryBackLink onCancel={() => router.history.back()}>
                {t("button.cancel")}
              </HistoryBackLink>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryBackLink({ children, onCancel }: { children: string; onCancel: () => void }) {
  return (
    <button
      {...sx.cancel}
      data-stylex-owner="project-postform-cancel"
      type="button"
      tabIndex={4}
      onClick={onCancel}
    >
      {children}
    </button>
  );
}

function isOnlineCommitResponse(value: unknown): value is BoardOnlineCommitResponse {
  return Boolean(value && typeof value === "object" && "onlineCommit" in value);
}

function stringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function stringSearch(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function booleanSearch(value: unknown) {
  return value === true || value === "true" ? true : undefined;
}

function compactBoardPostFormSearch(search: BoardPostFormSearch) {
  return {
    ...(search.branch !== undefined ? { branch: search.branch } : {}),
    ...(search.edit ? { edit: true } : {}),
    ...(search.issueTemplate ? { issueTemplate: true } : {}),
    ...(search.path !== undefined ? { path: search.path } : {}),
    ...(search.readme ? { readme: true } : {}),
  };
}

function lineEnding(value: string) {
  return value.includes("\r\n") ? "CRLF" : value.includes("\n") ? "LF" : "";
}
