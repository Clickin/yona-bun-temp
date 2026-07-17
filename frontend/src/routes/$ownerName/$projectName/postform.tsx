/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy board/create.scala.html requires positive tab order on title/body/save/cancel. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
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
import { LegacyMarkdownHelp } from "../../-legacy-markdown-help";
import { styles } from "./-postform.stylex";

const sx = {
  page: stylex.props(styles.page),
  form: stylex.props(styles.form),
  title: stylex.props(styles.title),
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

  return (
    <div {...sx.page} data-stylex-owner="project-postform-page">
      <div data-stylex-owner="project-postform-shell">
        <form
          action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/posts`)}
          method="post"
          encType="multipart/form-data"
          {...sx.form}
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
          <div data-stylex-owner="project-postform-content">
            <dl>
              <dd>
                <LegacyTabIndexInput
                  focusRequest={titleFocusRequest}
                  tabIndex={1}
                  type="text"
                  id="title"
                  autoComplete="off"
                  name="title"
                  {...sx.title}
                  data-stylex-owner="project-postform-title"
                  maxLength={250}
                  defaultValue={title}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setBodyFocusRequest((current) => current + 1);
                    }
                  }}
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
              <dd style={{ position: "relative" }}>
                <BoardPostMarkdownEditor
                  focusRequest={bodyFocusRequest}
                  search={search}
                  value={body}
                />
              </dd>
            </dl>

            {canShowUploader ? <BoardPostFileUploader /> : null}

            <div className="right-txt mt10 mb10">
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

function BoardPostMarkdownEditor({
  focusRequest,
  search,
  value,
}: {
  focusRequest: number;
  search: BoardPostFormSearch;
  value: string;
}) {
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
      <ul className="nav nav-tabs nm small">
        <li className={activeTab === "edit" ? "active" : undefined}>
          <Link
            to="."
            search={compactBoardPostFormSearch(search)}
            hash="edit-body"
            activeProps={{}}
            onClick={() => setActiveTab("edit")}
          >
            {t("common.editor.edit")}
          </Link>
        </li>
        <li className={activeTab === "preview" ? "active" : undefined}>
          <Link
            to="."
            search={compactBoardPostFormSearch(search)}
            hash="preview-body"
            activeProps={{}}
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
      <div className="tab-content" style={{ position: "relative", overflow: "visible" }}>
        <LegacyMarkdownHelp />
        <div id="edit-body" className={`tab-pane${activeTab === "edit" ? " active" : ""}`}>
          <div className="textarea-box">
            <textarea
              {...sx.editor}
              data-stylex-owner="project-postform-editor"
              ref={bodyRef}
              name="body"
              className="editorSeries content comment nm"
              data-editor-mode="content-body"
              id="editor-body-body"
              tabIndex={3}
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

function BoardPostFileUploader() {
  const { t } = useLegacyMessages();
  const pasteSupported =
    typeof document !== "undefined" &&
    "onpaste" in document &&
    typeof FormData !== "undefined" &&
    typeof FileReader !== "undefined";
  return (
    <div id="upload" className="upload-wrap content-footer" data-resource-type="BOARD_POST">
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
          style={pasteSupported ? { display: "block" } : undefined}
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
