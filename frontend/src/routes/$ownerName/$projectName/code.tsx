import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { codeBrowserQueryOptions, type CodeBrowserResponse } from "../../../api/code-browser";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

export const Route = createFileRoute("/$ownerName/$projectName/code")({
  component: ProjectCodeRoute,
});

function ProjectCodeRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { ownerName, projectName } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isProjectCodeRoot = pathname === `/${ownerName}/${projectName}/code`;

  if (!isProjectCodeRoot) {
    return <Outlet />;
  }

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectCodeRouteShell runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectSearchScope = projectQuery.data
    ? {
        organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
        ownerName,
        projectName,
      }
    : { ownerName, projectName };
  const isStandardProjectOwnedShell = !projectSearchScope.organizationName;

  return (
    <SiteLayoutShell
      projectSearchScope={projectSearchScope}
      runtimeConfig={runtimeConfig}
      showLegacyProjectHeaderLinks={isStandardProjectOwnedShell}
    >
      <ProjectCodeScreen project={projectQuery.data} runtimeConfig={runtimeConfig} />
    </SiteLayoutShell>
  );
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

  useEffect(() => {
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

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={project} />
      <ProjectCodeBody code={codeQuery.data} project={project} />
    </>
  );
}

function ProjectCodeBody({
  code,
  project,
}: {
  code: CodeBrowserResponse;
  project: ProjectContainer;
}) {
  if (!code.noHead) {
    return (
      <div className="page-wrap-outer">
        <div className="project-page-wrap"></div>
      </div>
    );
  }

  return <ProjectCodeNoHead project={project} />;
}

function ProjectCodeNoHead({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const browserTitle = `${projectName} - ${t("menu.code")} - ${ownerName}/${projectName}`;
  const siteName = "Yona";
  const vcs = stringField(project.vcs, "").toUpperCase();
  const isSvn = vcs === "SVN" || vcs === "SUBVERSION";
  const loginId =
    stringField(project.viewerLoginId, "") ||
    stringField(project.currentUserLoginId, "") ||
    stringField(project.loginId, "");
  const svnUsernameSuffix = loginId ? ` --username ${loginId}` : "";
  const codeUrl =
    stringField(project.codeUrl, "") ||
    stringField(project.cloneUrlWithLoginId, "") ||
    stringField(project.cloneUrl, "") ||
    stringField(project.repositoryUrl, "") ||
    `/${ownerName}/${projectName}`;

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

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName =
    typeof project.organizationName === "string" ? project.organizationName : "";
  if (organizationName) {
    return organizationName;
  }
  return project.isProtected === true ? ownerName : undefined;
}
