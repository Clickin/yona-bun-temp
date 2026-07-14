import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useMemo, useRef, useState } from "react";
import { listProjectsQueryOptions } from "../../api/org-project";
import { readSiteMailListRest, siteUpdateQueryOptions } from "../../api/site-admin";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { globalColors } from "../../theme.stylex";
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

const styles = stylex.create({
  titleArea: {
    overflow: globalColors.siteDiagnosticNoErrorTitleOverflow,
    marginBottom: globalColors.siteDiagnosticNoErrorTitleMarginBottom,
    paddingBottom: globalColors.siteDiagnosticNoErrorTitlePaddingBottom,
    borderBottomStyle: globalColors.siteDiagnosticNoErrorTitleBorderStyle,
    borderBottomWidth: globalColors.siteDiagnosticNoErrorTitleBorderBottomWidth,
    borderBottomColor: globalColors.siteDiagnosticNoErrorTitleBorder,
  },
  title: {
    margin: globalColors.siteDiagnosticNoErrorHeadingMargin,
    fontSize: globalColors.siteDiagnosticNoErrorHeadingFontSize,
    color: globalColors.siteDiagnosticNoErrorHeadingText,
    lineHeight: globalColors.siteDiagnosticNoErrorHeadingLineHeight,
  },
  selectProjectAction: {
    backgroundColor: {
      default: globalColors.siteMassMailSelectProjectActionSurface,
      ":hover": globalColors.siteMassMailSelectProjectActionInteractiveSurface,
      ":focus": globalColors.siteMassMailSelectProjectActionInteractiveSurface,
      ":active": globalColors.siteMassMailSelectProjectActionInteractiveSurface,
    },
    borderColor: {
      default: globalColors.siteMassMailSelectProjectActionBorderColor,
      ":hover": globalColors.siteMassMailSelectProjectActionInteractiveBorderColor,
      ":focus": globalColors.siteMassMailSelectProjectActionInteractiveBorderColor,
      ":active": globalColors.siteMassMailSelectProjectActionInteractiveBorderColor,
    },
    borderRadius: globalColors.siteMassMailSelectProjectActionBorderRadius,
    borderStyle: globalColors.siteMassMailSelectProjectActionBorderStyle,
    borderWidth: globalColors.siteMassMailSelectProjectActionBorderWidth,
    boxShadow: globalColors.siteMassMailSelectProjectActionBoxShadow,
    color: {
      default: globalColors.siteMassMailSelectProjectActionText,
      ":hover": globalColors.siteMassMailSelectProjectActionInteractiveText,
      ":focus": globalColors.siteMassMailSelectProjectActionInteractiveText,
      ":active": globalColors.siteMassMailSelectProjectActionInteractiveText,
    },
    cursor: globalColors.siteMassMailSelectProjectActionCursor,
    display: globalColors.siteMassMailSelectProjectActionDisplay,
    fontSize: globalColors.siteMassMailSelectProjectActionFontSize,
    lineHeight: globalColors.siteMassMailSelectProjectActionLineHeight,
    marginBottom: globalColors.siteMassMailSelectProjectActionMarginBottom,
    marginLeft: globalColors.siteMassMailSelectProjectActionMarginLeft,
    outline: globalColors.siteMassMailSelectProjectActionOutline,
    padding: globalColors.siteMassMailSelectProjectActionPadding,
    position: globalColors.siteMassMailSelectProjectActionPosition,
    textAlign: globalColors.siteMassMailSelectProjectActionTextAlign,
    textDecoration: {
      ":hover": globalColors.siteMassMailSelectProjectActionInteractiveTextDecoration,
      ":focus": globalColors.siteMassMailSelectProjectActionInteractiveTextDecoration,
      ":active": globalColors.siteMassMailSelectProjectActionInteractiveTextDecoration,
    },
    textShadow: globalColors.siteMassMailSelectProjectActionTextShadow,
    transition: globalColors.siteMassMailSelectProjectActionTransition,
    verticalAlign: globalColors.siteMassMailSelectProjectActionVerticalAlign,
    whiteSpace: globalColors.siteMassMailSelectProjectActionWhiteSpace,
    zIndex: globalColors.siteMassMailSelectProjectActionZIndex,
  },
  writeAction: {
    backgroundColor: {
      default: globalColors.siteMassMailWriteActionSurface,
      ":hover": globalColors.siteMassMailWriteActionInteractiveSurface,
      ":focus": globalColors.siteMassMailWriteActionInteractiveSurface,
      ":active": globalColors.siteMassMailWriteActionInteractiveSurface,
    },
    borderColor: {
      default: globalColors.siteMassMailWriteActionBorderColor,
      ":hover": globalColors.siteMassMailWriteActionBorderColor,
      ":focus": globalColors.siteMassMailWriteActionBorderColor,
      ":active": globalColors.siteMassMailWriteActionBorderColor,
    },
    borderRadius: globalColors.siteMassMailWriteActionBorderRadius,
    borderStyle: globalColors.siteMassMailWriteActionBorderStyle,
    borderWidth: globalColors.siteMassMailWriteActionBorderWidth,
    boxShadow: globalColors.siteMassMailWriteActionBoxShadow,
    color: globalColors.siteMassMailWriteActionText,
    cursor: globalColors.siteMassMailWriteActionCursor,
    display: globalColors.siteMassMailWriteActionDisplay,
    fontSize: globalColors.siteMassMailWriteActionFontSize,
    lineHeight: globalColors.siteMassMailWriteActionLineHeight,
    marginBottom: globalColors.siteMassMailWriteActionMarginBottom,
    marginLeft: globalColors.siteMassMailWriteActionMarginLeft,
    outline: globalColors.siteMassMailWriteActionOutline,
    padding: globalColors.siteMassMailWriteActionPadding,
    position: globalColors.siteMassMailWriteActionPosition,
    textAlign: globalColors.siteMassMailWriteActionTextAlign,
    textDecoration: {
      ":hover": globalColors.siteMassMailWriteActionInteractiveTextDecoration,
      ":focus": globalColors.siteMassMailWriteActionInteractiveTextDecoration,
      ":active": globalColors.siteMassMailWriteActionInteractiveTextDecoration,
    },
    textShadow: globalColors.siteMassMailWriteActionTextShadow,
    transition: globalColors.siteMassMailWriteActionTransition,
    verticalAlign: globalColors.siteMassMailWriteActionVerticalAlign,
    whiteSpace: globalColors.siteMassMailWriteActionWhiteSpace,
    zIndex: globalColors.siteMassMailWriteActionZIndex,
  },
  projectInput: {
    margin: globalColors.siteMassMailProjectInputMargin,
  },
  projectWrapper: {
    marginBottom: globalColors.siteMassMailProjectWrapperMarginBottom,
  },
  recipientRadio: {
    minHeight: globalColors.siteMassMailRecipientRadioMinHeight,
    paddingLeft: globalColors.siteMassMailRecipientRadioPaddingLeft,
  },
  recipientRadioInput: {
    float: globalColors.siteMassMailRecipientRadioInputFloat,
    marginLeft: globalColors.siteMassMailRecipientRadioInputMarginLeft,
  },
  selectedProjectTag: {
    backgroundColor: globalColors.siteMassMailSelectedProjectTagSurface,
    borderRadius: globalColors.siteMassMailSelectedProjectTagBorderRadius,
    color: globalColors.siteMassMailSelectedProjectTagText,
    display: globalColors.siteMassMailSelectedProjectTagDisplay,
    fontSize: globalColors.siteMassMailSelectedProjectTagFontSize,
    fontWeight: globalColors.siteMassMailSelectedProjectTagFontWeight,
    lineHeight: globalColors.siteMassMailSelectedProjectTagLineHeight,
    marginRight: globalColors.siteMassMailSelectedProjectTagMarginRight,
    padding: globalColors.siteMassMailSelectedProjectTagPadding,
    textShadow: globalColors.siteMassMailSelectedProjectTagTextShadow,
    verticalAlign: globalColors.siteMassMailSelectedProjectTagVerticalAlign,
    whiteSpace: globalColors.siteMassMailSelectedProjectTagWhiteSpace,
  },
});

const projectWrapperStyleProps = stylex.props(styles.projectWrapper);

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
              <div
                {...stylex.props(styles.titleArea)}
                className="title_area"
                data-stylex-owner="site-massmail-title-strip"
              >
                <h2 {...stylex.props(styles.title)} className="pull-left">
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

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul className="site-setting-nav">
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/issueList">
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="active">
        <Link
          {...legacySiteSidebarLinkProps}
          search={legacyMassMailSidebarSearch}
          to="/sites/massmail"
        >
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/diagnostic">
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
        {...projectWrapperStyleProps}
        className={`hide ${projectWrapperStyleProps.className ?? ""}`}
        data-stylex-owner="site-massmail-project-wrapper"
        id="project-list-wrap"
        style={mailingType === "projects" ? { display: "block" } : undefined}
      >
        <div className="controls">
          <input
            {...stylex.props(styles.projectInput)}
            data-stylex-owner="site-massmail-project-input"
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
            <ul className="typeahead dropdown-menu" style={{ display: "block" }}>
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
        <div id="selected-projects">
          {selectedProjects.map((project) => (
            <span
              {...stylex.props(styles.selectedProjectTag)}
              data-stylex-owner="site-massmail-selected-project-tag"
              key={project.id}
            >
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

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
