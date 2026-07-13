import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { codeBrowserQueryOptions, type CodeBrowserResponse } from "../../../api/code-browser";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { LastOutletTransition } from "../../-last-outlet-transition";

export const Route = createFileRoute("/$ownerName/$projectName/code")({
  beforeLoad: ({ location, params }) => {
    if (location.pathname === `/${params.ownerName}/${params.projectName}/code/`) {
      throw redirect({
        params: {
          ownerName: params.ownerName,
          projectName: params.projectName,
        },
        replace: true,
        statusCode: 303,
        to: "/$ownerName/$projectName/code",
      });
    }
  },
  component: ProjectCodeRoute,
});

function ProjectCodeRoute() {
  return <LastOutletTransition routeId={Route.id} />;
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

function ProjectCodeBody({
  code,
  project,
  runtimeConfig,
}: {
  code: CodeBrowserResponse;
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  if (!code.noHead) {
    return (
      <div className="page-wrap-outer">
        <div className="project-page-wrap"></div>
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
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="row-fluid">
            <div className="span12">
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
    <div className="alert alert-block">
      <h4>{heading}</h4>
    </div>
  );
}

function stringField(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function booleanField(value: unknown) {
  return value === true || value === "true";
}
