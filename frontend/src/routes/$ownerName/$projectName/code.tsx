import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState, useLayoutEffect, type FormEvent } from "react";
import { codeBrowserQueryOptions, type CodeBrowserResponse } from "../../../api/code-browser";
import { codeFindFilesQueryOptions, codeGrepFilesQueryOptions } from "../../../api/code";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";

export const Route = createFileRoute("/$ownerName/$projectName/code")({
  component: ProjectCodeRoute,
});

function ProjectCodeRoute() {
  return <Outlet />;
}

export function ProjectCodeIndexScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  return <ProjectCodeScreen project={projectQuery.data} runtimeConfig={runtimeConfig} />;
}

function ProjectCodeScreen({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const navigate = useNavigate();
  const codeQuery = useQuery(
    codeBrowserQueryOptions(runtimeConfig, { ownerName, projectName, branch: "", path: "" }),
  );

  useLayoutEffect(() => {
    const selectedBranch = codeQuery.data?.selectedBranch;
    if (codeQuery.data && !codeQuery.data.noHead && selectedBranch) {
      void navigate({
        replace: true,
        to: `/${ownerName}/${projectName}/code/${encodeURIComponent(selectedBranch)}`,
      });
    }
  }, [codeQuery.data, navigate, ownerName, projectName]);

  if (!project || !codeQuery.data) {
    return null;
  }

  return <ProjectCodeBody code={codeQuery.data} project={project} runtimeConfig={runtimeConfig} />;
}

export function ProjectCodeSearchPanel({
  ownerName,
  projectName,
  branch,
  runtimeConfig,
}: {
  ownerName: string;
  projectName: string;
  branch: string;
  runtimeConfig: RuntimeConfig;
}) {
  const [mode, setMode] = useState<"find" | "grep">("find");
  const [queryInput, setQueryInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  const findQuery = useQuery({
    ...codeFindFilesQueryOptions(runtimeConfig, {
      branch,
      enabled: mode === "find" && activeQuery.trim().length > 0,
      ownerName,
      projectName,
      query: activeQuery,
    }),
  });

  const grepQuery = useQuery({
    ...codeGrepFilesQueryOptions(runtimeConfig, {
      branch,
      enabled: mode === "grep" && activeQuery.trim().length > 0,
      ownerName,
      projectName,
      query: activeQuery,
    }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setActiveQuery(queryInput);
  };

  return (
    <div className="code-search-container" data-testid="code-search-panel">
      <div className="code-search-header">
        <button
          type="button"
          data-testid="code-search-tab-find"
          className={`code-search-tab-button${mode === "find" ? " is-active" : ""}`}
          onClick={() => setMode("find")}
        >
          Find File
        </button>
        <button
          type="button"
          data-testid="code-search-tab-grep"
          className={`code-search-tab-button${mode === "grep" ? " is-active" : ""}`}
          onClick={() => setMode("grep")}
        >
          Search in File
        </button>
      </div>

      <form onSubmit={handleSubmit} className="code-search-form">
        <input
          type="text"
          data-testid="code-search-input"
          placeholder={
            mode === "find"
              ? "Search file path (git ls-tree)..."
              : "Search file content (git grep)..."
          }
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          className="code-search-input"
        />
        <button type="submit" data-testid="code-search-submit" className="code-search-submit">
          Search
        </button>
      </form>

      {mode === "find" ? (
        <div data-testid="code-search-find-results">
          {findQuery.isLoading ? (
            <div className="code-search-empty">Searching files…</div>
          ) : findQuery.data?.paths && findQuery.data.paths.length > 0 ? (
            <ul className="code-search-result-list">
              {findQuery.data.paths.map((filePath) => (
                <li
                  key={filePath}
                  className="code-search-result-item"
                  data-testid="code-search-result-item"
                >
                  <Link
                    to={
                      `/${ownerName}/${projectName}/code/${encodeURIComponent(branch)}/${filePath}` as any
                    }
                    className="code-search-result-item-path"
                  >
                    {filePath}
                  </Link>
                </li>
              ))}
            </ul>
          ) : activeQuery.trim().length > 0 ? (
            <div className="code-search-empty" data-testid="code-search-empty">
              No matching files found.
            </div>
          ) : null}
        </div>
      ) : (
        <div data-testid="code-search-grep-results">
          {grepQuery.isLoading ? (
            <div className="code-search-empty">Searching content…</div>
          ) : grepQuery.data?.matches && grepQuery.data.matches.length > 0 ? (
            <ul className="code-search-result-list">
              {grepQuery.data.matches.map((item) => (
                <li
                  key={`${item.path}:${item.lineNumber}:${item.content}`}
                  className="code-search-result-item"
                  data-testid="code-search-result-item"
                >
                  <Link
                    to={
                      `/${ownerName}/${projectName}/code/${encodeURIComponent(branch)}/${item.path}` as any
                    }
                    className="code-search-result-item-path"
                  >
                    {item.path} (line {item.lineNumber})
                  </Link>
                  <div className="code-search-result-match-snippet">
                    <span className="code-search-line-number">L{item.lineNumber}:</span>
                    {item.content}
                  </div>
                </li>
              ))}
            </ul>
          ) : activeQuery.trim().length > 0 ? (
            <div className="code-search-empty" data-testid="code-search-empty">
              No matching content found.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProjectCodeBody({
  code,
  project,
  runtimeConfig,
}: {
  code: CodeBrowserResponse;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();

  if (!code.noHead) {
    return (
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectCodeSearchPanel
            branch={code.selectedBranch || "main"}
            ownerName={ownerName}
            projectName={projectName}
            runtimeConfig={runtimeConfig}
          />
        </div>
      </div>
    );
  }

  return <ProjectCodeNoHead project={project} runtimeConfig={runtimeConfig} />;
}

function ProjectCodeNoHead({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const siteName = runtimeConfig.siteName ?? "Yoram";
  const vcs = stringField(project.vcs, "").toUpperCase();
  const isSvn = vcs === "SVN" || vcs === "SUBVERSION";
  const browserTitle = isSvn
    ? `${t("title.commitHistory")} - ${ownerName}/${projectName}`
    : `${projectName} - ${t("menu.code")} - ${ownerName}/${projectName}`;
  const loginId =
    stringField(project.viewerLoginId, "") ||
    stringField(project.currentUserLoginId, "") ||
    stringField(project.loginId, "");
  const svnUsernameSuffix = loginId ? ` --username ${loginId}` : "";
  const repositoryUrl =
    stringField(project.codeUrl, "") ||
    stringField(project.cloneUrlWithLoginId, "") ||
    stringField(project.cloneUrl, "") ||
    stringField(project.repositoryUrl, "") ||
    `/${ownerName}/${projectName}`;
  const codeUrl = isSvn
    ? svnCheckoutUrl(repositoryUrl, runtimeConfig.basePath, ownerName, projectName)
    : repositoryUrl;
  return (
    <>
      <title>{browserTitle}</title>
      <div className="page-wrap-outer" data-owner="project-code-nohead-page">
        <div className="project-page-wrap" data-owner="project-code-nohead-shell">
          <div className="row-fluid">
            <div className="span12" data-owner="project-code-nohead-column">
              <NoHeadAlert message={t("code.nohead")} />
              {booleanField(project.viewerCanUpdate) ? (
                isSvn ? (
                  <>
                    <h5>{t("code.nohead.svn.clone", { args: [siteName] })}</h5>
                    <pre>
                      <code>{`svn co ${codeUrl}${svnUsernameSuffix}
cd ${projectName}/
echo "# ${projectName}" > README.md
svn add README.md
svn commit -m "first commit"`}</code>
                    </pre>
                  </>
                ) : (
                  <>
                    <h5>{t("code.nohead.clone", { args: [siteName] })}</h5>
                    <pre>
                      <code>{`git clone ${codeUrl} ${projectName}
cd ${projectName}/
echo "# ${projectName}" > README.md
git add README.md
git commit -m "Hello ${siteName}"
git push origin master`}</code>
                    </pre>
                    <h5>{t("code.nohead.init", { args: [siteName] })}</h5>
                    <pre>
                      <code>{`mkdir ${projectName}
cd ${projectName}/
echo "# ${projectName}" > README.md
git init
git add README.md
git commit -m "Hello ${siteName}"
git remote add origin ${codeUrl}
git push origin master`}</code>
                    </pre>
                    <h5>{t("code.nohead.remote", { args: [siteName] })}</h5>
                    <pre>
                      <code>{`git remote add origin ${codeUrl}
git push origin master`}</code>
                    </pre>
                    <h5>{t("code.nohead.pull.push", { args: [siteName] })}</h5>
                    <pre>
                      <code>{`git pull origin master
git push origin master`}</code>
                    </pre>
                  </>
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function svnCheckoutUrl(
  repositoryUrl: string,
  basePath: string,
  ownerName: string,
  projectName: string,
) {
  let origin = typeof location === "undefined" ? "" : location.origin;
  try {
    const candidate = new URL(repositoryUrl);
    if (candidate.protocol === "http:" || candidate.protocol === "https:") {
      origin = candidate.origin;
    }
  } catch {
    // A relative API value has no origin to preserve; use the current browser origin.
  }
  const pathname = prefixBasePath(
    basePath,
    `/svn/${encodeURIComponent(ownerName)}/${encodeURIComponent(projectName)}`,
  );
  return origin ? new URL(pathname, origin).href : pathname;
}

function NoHeadAlert({ message }: { message: string }) {
  const heading = /<h4>([\s\S]*)<\/h4>/u.exec(message)?.[1] ?? message;

  return (
    <div className="alert alert-block" data-owner="project-code-nohead-alert">
      <h4 data-owner="project-code-nohead-heading">{heading}</h4>
    </div>
  );
}

function stringField(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function booleanField(value: unknown) {
  return value === true || value === "true";
}
