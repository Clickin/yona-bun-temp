import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type AnchorHTMLAttributes, type ComponentType } from "react";
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

const LegacyInternalLink = Link as ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    activeProps?: { className?: string | undefined };
    to: string;
  }
>;

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
  const navItems = [
    { href: "/sites/userList", labelKey: "site.sidebar.userList" },
    { href: "/sites/postList", labelKey: "site.sidebar.postList" },
    { href: "/sites/issueList", labelKey: "site.sidebar.issueList" },
    { href: "/sites/projectList", labelKey: "site.sidebar.projectList" },
    { href: "/sites/mail", labelKey: "site.sidebar.mailSend" },
    { href: "/sites/massmail", labelKey: "site.sidebar.massMail", active: true },
    { href: "/sites/update", labelKey: "site.sidebar.update", badge: showUpdateBadge },
    { href: "/sites/diagnostic", labelKey: "site.sidebar.diagnostics" },
  ];

  return (
    <ul className="site-setting-nav">
      {navItems.map((item) => (
        <li className={item.active ? "active" : ""} key={item.href}>
          <LegacyInternalLink activeProps={{ className: undefined }} to={item.href}>
            <LegacyMessage messageKey={item.labelKey} />
            {item.badge ? <span className="notification-badge">1</span> : null}
          </LegacyInternalLink>
        </li>
      ))}
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
      const form = document.createElement("form");
      form.setAttribute("method", "POST");
      form.setAttribute("action", `mailto:${data.recipients.join(",")},`);
      form.setAttribute("enctype", "text/plain");
      form.submit();
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
          onChange={() => {
            setMailingType("all");
            setSelectedProjects([]);
          }}
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
          onChange={() => {
            setMailingType("projects");
            setSelectedProjects([]);
          }}
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
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <a
                href="#"
                ref={(node) => node?.setAttribute("href", "javascript:void(0)")}
                onClick={(event) => {
                  event.preventDefault();
                  setSelectedProjects((current) =>
                    current.filter((selectedProject) => selectedProject.id !== project.id),
                  );
                }}
              >
                x
              </a>
            </span>
          ))}
        </div>
      </div>
      <button
        id="write-email"
        type="submit"
        className="ybtn ybtn-primary"
        onClick={() => mailListMutation.mutate()}
      >
        <strong>{t("site.mail.write")}</strong>
      </button>
    </div>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
