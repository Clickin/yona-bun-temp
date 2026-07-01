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
  createProjectPostRest,
  readProjectPostFormOptionsQueryOptions,
  type BoardOnlineCommitResponse,
} from "../../../api/boards";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

type BoardPostFormSearch = {
  branch: string;
  edit: boolean;
  issueTemplate: boolean;
  path: string;
  readme: boolean;
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

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectBoardCreateFormScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectBoardCreateFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const optionsQuery = useQuery(
    readProjectPostFormOptionsQueryOptions(runtimeConfig, {
      branch: search.branch,
      edit: search.edit,
      issueTemplate: search.issueTemplate,
      ownerName,
      path: search.path,
      projectName,
      readme: search.readme,
    }),
  );

  if (!projectQuery.data || !optionsQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="board" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectBoardCreateFormBody runtimeConfig={runtimeConfig} />
    </>
  );
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
      edit: search.edit,
      issueTemplate: search.issueTemplate,
      ownerName,
      path: search.path,
      projectName,
      readme: search.readme,
    }),
  );
  const options = optionsQuery.data;
  const onlineCommit = options?.onlineCommit;
  const title = onlineCommit?.title ?? "";
  const body = onlineCommit?.preparedBodyMarkdown ?? "";
  const path = onlineCommit?.path ?? search.path;
  const branch = onlineCommit?.branch ?? search.branch;
  const issueTemplate = onlineCommit?.issueTemplate ?? search.issueTemplate;
  const isOnlineCommit = path !== "";
  const canShowNotice = Boolean(options?.canMarkNotice) && !issueTemplate && !isOnlineCommit;
  const canShowUploader = Boolean(options?.canAttachFiles) && !issueTemplate && !isOnlineCommit;
  const canShowReadme = Boolean(options?.canMarkReadme) && search.readme && !issueTemplate;
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createProjectPostRest(runtimeConfig, csrfToken, {
        attachmentIds: [],
        bodyMarkdown: stringFormValue(formData, "body"),
        branch: stringFormValue(formData, "branch"),
        edit: search.edit,
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
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <form
          action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/posts`)}
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
              <dd>
                <LegacyTabIndexInput
                  tabIndexValue="1"
                  type="text"
                  id="title"
                  autoComplete="off"
                  name="title"
                  className="zen-mode text title "
                  maxLength={250}
                  defaultValue={title}
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
                          tabIndexValue="2"
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
                <div data-toggle="markdown-editor" className="markdown-editor-wrap">
                  <LegacyTabIndexTextarea
                    tabIndexValue="3"
                    id="editor-body-content-body"
                    name="body"
                    data-editor-mode="content-body"
                    defaultValue={body}
                  ></LegacyTabIndexTextarea>
                  <div id="preview-content-body" className="preview markdown-wrap"></div>
                </div>
              </dd>
            </dl>

            {canShowUploader ? (
              <div className="upload-wrap content-footer" data-resource-type="BOARD_POST">
                <div className="attach-wrap">
                  <div className="attachments" id="attachments"></div>
                </div>
              </div>
            ) : null}

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

            <div className="actions">
              <LegacyTabIndexButton tabIndexValue="3" className="ybtn ybtn-success">
                {t("button.save")}
              </LegacyTabIndexButton>
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

function isOnlineCommitResponse(value: unknown): value is BoardOnlineCommitResponse {
  return Boolean(value && typeof value === "object" && "onlineCommit" in value);
}

function stringFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function stringSearch(value: unknown) {
  return typeof value === "string" ? value : "";
}

function booleanSearch(value: unknown) {
  return value === true || value === "true";
}

function lineEnding(value: string) {
  return value.includes("\r\n") ? "CRLF" : value.includes("\n") ? "LF" : "";
}
