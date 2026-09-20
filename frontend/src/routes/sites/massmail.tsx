import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar } from "../../components/site-admin-sidebar";
import { siteSettingWrapClassName } from "../../components/site-admin-sidebar";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { listProjectsQueryOptions } from "../../api/org-project";
import { readSiteMailListRest, siteUpdateQueryOptions } from "../../api/site-admin";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type SelectedProject = {
  id: number;
  name: string;
};

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const legacyMassMailSidebarSearch = { __legacySiteSidebarActiveMarker: undefined };

export const Route = createFileRoute("/sites/massmail")({
  component: SiteMassMailRoute,
});

function SiteMassMailRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteMassMailScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SiteMassMailScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));

  return (
    <>
      <SiteMassMailTitle />
      <div className="site-breadcrumb-outer" data-owner="site-massmail-breadcrumb-outer">
        <div className="site-breadcrumb-inner" data-owner="site-massmail-breadcrumb-inner">
          <h3 data-owner="site-massmail-breadcrumb-heading">
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-owner="site-massmail-page">
        <div className={siteSettingWrapClassName} data-owner="site-massmail-content">
          <div className="row-fluid" data-owner="site-massmail-setting-grid">
            <div className="span2" data-owner="site-massmail-sidebar-column">
              <SiteAdminSidebar
                activeTo="/sites/massmail"
                badgeOwner="site-massmail-sidebar-badge"
                baseLinkProps={legacySiteSidebarLinkProps}
                linkPropsByTo={{ "/sites/massmail": { search: legacyMassMailSidebarSearch } }}
                navOwner="site-massmail-sidebar"
                ulClassName="site-setting-nav"
                ownerPrefix="site-massmail-sidebar"
                showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)}
                styleSlots={{
                  activeItem: [],
                  activeLink: [],
                  badge: [],
                  firstItem: [],
                  item: [],
                  link: [],
                  nav: [],
                }}
              />
            </div>
            <div className="span10" data-owner="site-massmail-setting-content-column">
              <div className="title_area" data-owner="site-massmail-title-strip">
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

function SiteMassMailTitle() {
  const { t } = useLegacyMessages();
  return <title>{t("title.massMail")}</title>;
}

function MassMailBody({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const [mailingType, setMailingType] = useState<"all" | "projects">("all");
  const [selectedProjects, setSelectedProjects] = useState<SelectedProject[]>([]);
  const [projectQuery, setProjectQuery] = useState("");
  const [isProjectSuggestionMenuVisible, setProjectSuggestionMenuVisible] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const nextProjectId = useRef(1);
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({
    ...listProjectsQueryOptions(runtimeConfig),
    enabled: mailingType === "projects" && projectQuery.trim() !== "",
  });
  const projectSuggestions = useMemo(() => {
    const normalizedQuery = projectQuery.trim().toLowerCase();
    if (normalizedQuery === "") {
      return [];
    }

    const suggestions: string[] = [];
    for (const project of projectsQuery.data?.projects ?? projectsQuery.data?.items ?? []) {
      const ownerName = typeof project.ownerName === "string" ? project.ownerName : "";
      const projectName = typeof project.projectName === "string" ? project.projectName : "";
      const fullProjectName =
        ownerName && projectName ? `${ownerName}/${projectName}` : projectName;
      if (fullProjectName.toLowerCase().split(normalizedQuery).length > 1) {
        suggestions.push(fullProjectName);
      }
      if (suggestions.length === 10) {
        break;
      }
    }
    return suggestions;
  }, [projectQuery, projectsQuery.data]);
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

  function addProject(projectName = projectQuery) {
    setSelectedProjects((current) => [
      ...current,
      { id: nextProjectId.current++, name: projectName },
    ]);
    setProjectQuery("");
    setProjectSuggestionMenuVisible(false);
    setActiveSuggestionIndex(0);
  }

  function selectMailingType(nextMailingType: "all" | "projects") {
    setMailingType(nextMailingType);
    setSelectedProjects([]);
    setProjectQuery("");
    setProjectSuggestionMenuVisible(false);
    setActiveSuggestionIndex(0);
  }

  function selectProjectSuggestion(projectName: string) {
    setProjectQuery(projectName);
    setProjectSuggestionMenuVisible(false);
    projectInputRef.current?.focus();
  }

  return (
    <div className="mess-mail-wrap">
      <label className="radio" data-owner="site-massmail-recipient-radios" htmlFor="mailtoAll">
        <input
          type="radio"
          name="mailingType"
          id="mailtoAll"
          value="all"
          checked={mailingType === "all"}
          onClick={() => selectMailingType("all")}
          onChange={() => selectMailingType("all")}
        />
        {t("site.massMail.toAll")}
      </label>
      <label className="radio" data-owner="site-massmail-recipient-radios" htmlFor="mailtoPrj">
        <input
          type="radio"
          name="mailingType"
          id="mailtoPrj"
          value="projects"
          checked={mailingType === "projects"}
          onClick={() => selectMailingType("projects")}
          onChange={() => selectMailingType("projects")}
        />
        {t("site.massMail.toProjects")}
      </label>
      <div
        className={mailingType === "projects" ? undefined : "hide"}
        data-owner="site-massmail-project-wrapper"
        id="project-list-wrap"
      >
        <div className="controls">
          <input
            data-owner="site-massmail-project-input"
            id="input-project"
            type="text"
            className="span3"
            autoComplete="off"
            placeholder={t("project.name")}
            ref={projectInputRef}
            value={projectQuery}
            onChange={(event) => {
              setProjectQuery(event.currentTarget.value);
              setProjectSuggestionMenuVisible(true);
              setActiveSuggestionIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addProject(projectQuery);
                return;
              }
              if (event.key === "ArrowDown" && projectSuggestions.length > 0) {
                event.preventDefault();
                setActiveSuggestionIndex((current) => (current + 1) % projectSuggestions.length);
                return;
              }
              if (event.key === "ArrowUp" && projectSuggestions.length > 0) {
                event.preventDefault();
                setActiveSuggestionIndex(
                  (current) =>
                    (current - 1 + projectSuggestions.length) % projectSuggestions.length,
                );
              }
            }}
          />
          <button
            className="ybtn"
            data-owner="site-massmail-select-project-action"
            id="select-project"
            type="submit"
            onClick={(event) => {
              event.preventDefault();
              addProject();
            }}
          >
            <strong>{t("button.add")}</strong>
          </button>
          {isProjectSuggestionMenuVisible && projectSuggestions.length > 0 ? (
            <ul
              className="typeahead dropdown-menu"
              data-owner="site-massmail-project-suggestion-menu"
            >
              {projectSuggestions.map((projectName, index) => (
                <li
                  className={index === activeSuggestionIndex ? "active" : undefined}
                  data-value={projectName}
                  key={projectName}
                >
                  <button type="button" onMouseDown={() => selectProjectSuggestion(projectName)}>
                    {projectName}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div data-owner="site-massmail-selected-projects" id="selected-projects">
          {selectedProjects.map((project) => (
            <span data-owner="site-massmail-selected-project-tag" key={project.id}>
              {project.name}{" "}
              <button
                type="button"
                className="selected-project-remove"
                data-owner="site-massmail-selected-project-remove"
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
        className="ybtn ybtn-primary"
        id="write-email"
        type="submit"
        data-owner="site-massmail-write-action"
        onClick={() => mailListMutation.mutate()}
      >
        <strong>{mailListMutation.isPending ? "loading..." : t("site.mail.write")}</strong>
      </button>
    </div>
  );
}
