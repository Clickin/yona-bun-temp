import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar } from "../../components/site-admin-sidebar";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useMemo, useRef, useState } from "react";
import { listProjectsQueryOptions } from "../../api/org-project";
import { readSiteMailListRest, siteUpdateQueryOptions } from "../../api/site-admin";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { globalBreakpoints } from "../../theme.stylex";
import { SiteLayoutShell } from "../-home-route-screen";
import { siteMassMailColors } from "./-massmail.stylex";

type SelectedProject = {
  id: number;
  name: string;
};

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const legacyMassMailSidebarSearch = { __legacySiteSidebarActiveMarker: undefined };

const styles = stylex.create({
  page: {
    marginTop: "10px",
    minHeight: "450px",
    "@media all and (max-width: 720px)": {
      boxSizing: "border-box",
      minWidth: "10px",
      padding: "0px",
      width: "100%",
    },
  },
  content: { margin: "0px auto" },
  grid: {
    width: "100%",
    "::before": { content: '\"\"', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '\"\"', display: "table", lineHeight: "0px" },
  },
  sidebarColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    marginLeft: "0px",
    minHeight: "30px",
    width: "14.893617021276595%",
    "@media (min-width: 1200px)": { width: "14.52991452991453%" },
    "@media (min-width: 768px) and (max-width: 979px)": { width: "14.3646408839779%" },
    "@media (max-width: 767px)": { float: "none", width: "100%" },
  },
  contentColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    marginLeft: "2.127659574468085%",
    minHeight: "30px",
    width: "82.97872340425532%",
    "@media (min-width: 1200px)": {
      marginLeft: "2.564102564102564%",
      width: "82.90598290598291%",
    },
    "@media (min-width: 768px) and (max-width: 979px)": {
      marginLeft: "2.7624309392265194%",
      width: "82.87292817679558%",
    },
    "@media (max-width: 767px)": { float: "none", marginLeft: "0px", width: "100%" },
  },
  breadcrumbOuter: {
    boxSizing: "border-box",
    minWidth: { default: null, [globalBreakpoints.mobile]: "10px" },
    padding: "0px 10px",
    width: "100%",
  },
  breadcrumbInner: { margin: "0px auto" },
  breadcrumbHeading: {
    lineHeight: "30px",
    padding: "10px 10px 5px",
  },
  sidebar: {
    margin: "0px",
    padding: "0px",
    listStyle: "none",
  },
  sidebarItem: {
    borderLeftColor: siteMassMailColors.neutralBorder,
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    fontSize: "14px",
    lineHeight: "30px",
    marginTop: "3px",
  },
  sidebarFirstItem: { marginTop: "0px" },
  sidebarActiveItem: {
    borderLeftColor: siteMassMailColors.activeBorder,
    fontWeight: "bold",
  },
  sidebarLink: {
    backgroundColor: {
      ":hover": siteMassMailColors.neutralBorder,
      ":focus": siteMassMailColors.neutralBorder,
    },
    color: "inherit",
    display: "block",
    outline: {
      default: "none",
      ":hover": "none",
      ":focus": "none",
    },
    padding: "5px 10px",
    textDecoration: {
      default: "none",
      ":hover": "none",
      ":focus": "none",
    },
  },
  sidebarActiveLink: {
    backgroundColor: {
      ":hover": "transparent",
      ":focus": "transparent",
    },
  },
  sidebarBadge: {
    backgroundColor: siteMassMailColors.primarySurface,
    borderColor: siteMassMailColors.whitePaint,
    borderRadius: "10px",
    borderStyle: "solid",
    borderWidth: "2px",
    boxShadow: siteMassMailColors.badgeShadow,
    color: siteMassMailColors.badgeText,
    fontSize: "12px",
    lineHeight: "20px",
    padding: "0px 5px",
  },
  titleArea: {
    overflow: "hidden",
    marginBottom: "29px",
    paddingBottom: "8px",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: siteMassMailColors.titleBorder,
  },
  title: {
    margin: "0px",
    fontSize: "1.5em",
    color: siteMassMailColors.titleText,
    lineHeight: "30px",
  },
  selectProjectAction: {
    backgroundColor: {
      default: siteMassMailColors.whitePaint,
      ":hover": siteMassMailColors.secondaryHoverSurface,
      ":focus": siteMassMailColors.secondaryHoverSurface,
      ":active": siteMassMailColors.secondaryHoverSurface,
    },
    borderColor: {
      default: siteMassMailColors.secondaryBorder,
      ":hover": siteMassMailColors.secondaryInteractiveBorder,
      ":focus": siteMassMailColors.secondaryInteractiveBorder,
      ":active": siteMassMailColors.secondaryInteractiveBorder,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: siteMassMailColors.actionShadow,
    color: {
      default: siteMassMailColors.secondaryText,
      ":hover": siteMassMailColors.secondaryInteractiveText,
      ":focus": siteMassMailColors.secondaryInteractiveText,
      ":active": siteMassMailColors.secondaryInteractiveText,
    },
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    marginBottom: "0px",
    marginLeft: "0.3em",
    outline: "0 none",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textDecoration: {
      ":hover": "none",
      ":focus": "none",
      ":active": "none",
    },
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  },
  writeAction: {
    backgroundColor: {
      default: siteMassMailColors.primarySurface,
      ":hover": siteMassMailColors.primaryInteractive,
      ":focus": siteMassMailColors.primaryInteractive,
      ":active": siteMassMailColors.primaryInteractive,
    },
    borderColor: {
      default: siteMassMailColors.primaryInteractive,
      ":hover": siteMassMailColors.primaryInteractive,
      ":focus": siteMassMailColors.primaryInteractive,
      ":active": siteMassMailColors.primaryInteractive,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: siteMassMailColors.actionShadow,
    color: siteMassMailColors.whitePaint,
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    marginBottom: "0px",
    marginLeft: "0.3em",
    outline: "0 none",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textDecoration: {
      ":hover": "none",
      ":focus": "none",
      ":active": "none",
    },
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  },
  projectInput: {
    margin: "0px",
  },
  projectWrapper: {
    marginBottom: "10px",
  },
  projectWrapperVisible: {
    display: "block",
  },
  projectSuggestionMenuVisible: {
    display: "block",
  },
  recipientRadio: {
    minHeight: "20px",
    paddingLeft: "20px",
  },
  recipientRadioInput: {
    float: "left",
    marginLeft: "-20px",
  },
  selectedProjectTag: {
    backgroundColor: siteMassMailColors.tagSurface,
    borderRadius: "1px",
    color: siteMassMailColors.whitePaint,
    display: "inline-block",
    fontSize: "11.844px",
    fontWeight: "bold",
    lineHeight: "14px",
    marginRight: "5px",
    padding: "2px 4px",
    textShadow: siteMassMailColors.tagShadow,
    verticalAlign: "baseline",
    whiteSpace: "nowrap",
  },
  selectedProjectRemove: {
    backgroundColor: "transparent",
    border: 0,
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
    lineHeight: "inherit",
    padding: 0,
    textShadow: "inherit",
  },
});

const breadcrumbOuterStyleProps = stylex.props(styles.breadcrumbOuter);
const breadcrumbInnerStyleProps = stylex.props(styles.breadcrumbInner);
const breadcrumbHeadingStyleProps = stylex.props(styles.breadcrumbHeading);
const titleAreaStyleProps = stylex.props(styles.titleArea);
const titleStyleProps = stylex.props(styles.title);
const projectInputStyleProps = stylex.props(styles.projectInput);

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
      <div {...breadcrumbOuterStyleProps} data-stylex-owner="site-massmail-breadcrumb-outer">
        <div {...breadcrumbInnerStyleProps} data-stylex-owner="site-massmail-breadcrumb-inner">
          <h3 {...breadcrumbHeadingStyleProps} data-stylex-owner="site-massmail-breadcrumb-heading">
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div {...stylex.props(styles.page)} data-stylex-owner="site-massmail-page">
        <div {...stylex.props(styles.content)} data-stylex-owner="site-massmail-content">
          <div {...stylex.props(styles.grid)} data-stylex-owner="site-massmail-setting-grid">
            <div
              {...stylex.props(styles.sidebarColumn)}
              data-stylex-owner="site-massmail-sidebar-column"
            >
              <SiteAdminSidebar
                activeItemClassName="active"
                activeTo="/sites/massmail"
                badgeOwner="site-massmail-sidebar-badge"
                ulClassName="site-setting-nav"
                baseLinkProps={legacySiteSidebarLinkProps}
                linkPropsByTo={{ "/sites/massmail": { search: legacyMassMailSidebarSearch } }}
                navOwner="site-massmail-sidebar"
                ownerPrefix="site-massmail-sidebar"
                showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)}
                styleSlots={{
                  activeItem: [styles.sidebarItem, styles.sidebarActiveItem],
                  activeLink: [styles.sidebarLink, styles.sidebarActiveLink],
                  badge: [styles.sidebarBadge],
                  firstItem: [styles.sidebarItem, styles.sidebarFirstItem],
                  item: [styles.sidebarItem],
                  link: [styles.sidebarLink],
                  nav: [styles.sidebar],
                }}
              />
            </div>
            <div
              {...stylex.props(styles.contentColumn)}
              data-stylex-owner="site-massmail-setting-content-column"
            >
              <div
                {...titleAreaStyleProps}
                className={`title_area ${titleAreaStyleProps.className ?? ""}`}
                data-stylex-owner="site-massmail-title-strip"
              >
                <h2 {...titleStyleProps} className={`pull-left ${titleStyleProps.className ?? ""}`}>
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
  const projectWrapperStateStyleProps = stylex.props(
    styles.projectWrapper,
    mailingType === "projects" && styles.projectWrapperVisible,
  );
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
      <label
        {...stylex.props(styles.recipientRadio)}
        data-stylex-owner="site-massmail-recipient-radios"
        htmlFor="mailtoAll"
      >
        <input
          {...stylex.props(styles.recipientRadioInput)}
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
      <label
        {...stylex.props(styles.recipientRadio)}
        data-stylex-owner="site-massmail-recipient-radios"
        htmlFor="mailtoPrj"
      >
        <input
          {...stylex.props(styles.recipientRadioInput)}
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
        {...projectWrapperStateStyleProps}
        className={`hide ${projectWrapperStateStyleProps.className ?? ""}`.trim()}
        data-stylex-owner="site-massmail-project-wrapper"
        id="project-list-wrap"
      >
        <div className="controls">
          <input
            {...projectInputStyleProps}
            data-stylex-owner="site-massmail-project-input"
            id="input-project"
            type="text"
            className={`span3 ${projectInputStyleProps.className ?? ""}`}
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
            {...stylex.props(styles.selectProjectAction)}
            data-stylex-owner="site-massmail-select-project-action"
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
              {...stylex.props(styles.projectSuggestionMenuVisible)}
              className={`typeahead dropdown-menu ${stylex.props(styles.projectSuggestionMenuVisible).className ?? ""}`.trim()}
              data-stylex-owner="site-massmail-project-suggestion-menu"
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
        <div data-stylex-owner="site-massmail-selected-projects" id="selected-projects">
          {selectedProjects.map((project) => (
            <span
              {...stylex.props(styles.selectedProjectTag)}
              data-stylex-owner="site-massmail-selected-project-tag"
              key={project.id}
            >
              {project.name}{" "}
              <button
                type="button"
                className={`selected-project-remove ${stylex.props(styles.selectedProjectRemove).className ?? ""}`.trim()}
                data-stylex-owner="site-massmail-selected-project-remove"
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
        {...stylex.props(styles.writeAction)}
        data-stylex-owner="site-massmail-write-action"
        disabled={mailListMutation.isPending}
        onClick={() => mailListMutation.mutate()}
      >
        <strong>{mailListMutation.isPending ? "loading..." : t("site.mail.write")}</strong>
      </button>
    </div>
  );
}
