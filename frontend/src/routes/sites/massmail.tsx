import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { readSiteMailListRest, siteUpdateQueryOptions } from "../../api/site-admin";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type SelectedProject = {
  id: number;
  name: string;
};

export const Route = createFileRoute("/sites/massmail")({
  component: SiteMassMailRoute,
});

function SiteMassMailRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SiteMassMailScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SiteMassMailScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">
                  <LegacyMessage messageKey="title.massMail" />
                </h2>
              </div>
              <MassMailBody runtimeConfig={runtimeConfig} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul className="site-setting-nav">
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/issueList">
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="active">
        <Link activeProps={{ className: undefined }} to="/sites/massmail">
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/diagnostic">
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function MassMailBody({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const [mailingType, setMailingType] = useState<"all" | "projects">("all");
  const [selectedProjects, setSelectedProjects] = useState<SelectedProject[]>([]);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const nextProjectId = useRef(1);
  const queryClient = useQueryClient();
  const mailListMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return readSiteMailListRest(runtimeConfig, csrfToken, {
        all: mailingType === "all",
        projects: mailingType === "all" ? [] : selectedProjects.map((project) => project.name),
      });
    },
    onSuccess(data) {
      queryClient.setQueryData(
        ["api", "v1", "site", "mail-list", mailingType, selectedProjects],
        data,
      );
      window.open(`mailto:${data.recipients.join(",")},`, "_self");
    },
  });

  function addProject() {
    const projectName = projectInputRef.current?.value ?? "";
    setSelectedProjects((current) => [
      ...current,
      { id: nextProjectId.current++, name: projectName },
    ]);
    if (projectInputRef.current) {
      projectInputRef.current.value = "";
    }
  }

  function selectMailingType(nextMailingType: "all" | "projects") {
    setMailingType(nextMailingType);
    setSelectedProjects([]);
  }

  return (
    <div className="mess-mail-wrap">
      <label className="radio" htmlFor="mailtoAll">
        <input
          type="radio"
          name="mailingType"
          id="mailtoAll"
          value="all"
          checked={mailingType === "all"}
          data-toggle="mail-type"
          data-action="hide"
          onClick={() => selectMailingType("all")}
          onChange={() => selectMailingType("all")}
        />
        {t("site.massMail.toAll")}
      </label>
      <label className="radio" htmlFor="mailtoPrj">
        <input
          type="radio"
          name="mailingType"
          id="mailtoPrj"
          value="projects"
          data-toggle="mail-type"
          data-action="show"
          checked={mailingType === "projects"}
          onClick={() => selectMailingType("projects")}
          onChange={() => selectMailingType("projects")}
        />
        {t("site.massMail.toProjects")}
      </label>
      <div
        className={mailingType === "projects" ? "control-group" : "control-group hide"}
        id="project-list-wrap"
      >
        <div className="controls">
          <input
            id="input-project"
            type="text"
            className="span3"
            data-provider="typeahead"
            autoComplete="off"
            placeholder={t("project.name")}
            ref={projectInputRef}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addProject();
              }
            }}
          />
          <button
            id="select-project"
            type="submit"
            className="ybtn"
            data-loading-text={t("site.massMail.loading")}
            onClick={(event) => {
              event.preventDefault();
              addProject();
            }}
          >
            <strong>{t("button.add")}</strong>
          </button>
        </div>
        <div id="selected-projects">
          {selectedProjects.map((project) => (
            <span className="label label-info" style={{ marginRight: "5px" }} key={project.id}>
              {project.name}{" "}
              <button
                type="button"
                className="selected-project-remove"
                onClick={(event) => {
                  event.preventDefault();
                  setSelectedProjects((current) =>
                    current.filter((selectedProject) => selectedProject.id !== project.id),
                  );
                }}
              >
                x
              </button>
            </span>
          ))}
        </div>
      </div>
      <button
        id="write-email"
        type="submit"
        className="ybtn ybtn-primary"
        disabled={mailListMutation.isPending}
        onClick={() => mailListMutation.mutate()}
      >
        <strong>{mailListMutation.isPending ? "loading..." : t("site.mail.write")}</strong>
      </button>
    </div>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
