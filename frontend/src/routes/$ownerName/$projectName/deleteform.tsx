import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  deleteProjectRest,
  readProjectSettingsQueryOptions,
  toggleFavoriteProjectRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/$ownerName/$projectName/deleteform")({
  component: ProjectDeleteFormRoute,
});

function ProjectDeleteFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectDeleteFormScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectDeleteFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const query = useQuery(
    readProjectSettingsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!query.data) {
    return null;
  }

  return <ProjectDeleteFormBody project={query.data} runtimeConfig={runtimeConfig} />;
}

function ProjectDeleteFormBody({
  project,
  runtimeConfig,
}: {
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [acceptedDeletion, setAcceptedDeletion] = useState(false);
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteProjectRest(runtimeConfig, csrfToken, { ownerName, projectName });
    },
    onSuccess(response) {
      queryClient.removeQueries({ queryKey: apiQueryKeys.project.base(ownerName, projectName) });
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.project.list() });
      setDeletionModalOpen(false);
      router.history.push(
        prefixBasePath(runtimeConfig.basePath, stringField(response.redirectPath, "/")),
      );
    },
    onError() {
      setDeletionModalOpen(false);
      window.alert(t("project.delete.error"));
    },
  });
  const openDeletionModal = () => {
    if (!acceptedDeletion) {
      window.alert(t("project.delete.alert"));
      return;
    }
    setDeletionModalOpen(true);
  };
  const closeDeletionModal = () => setDeletionModalOpen(false);

  return (
    <>
      <ProjectHeader project={project} />
      <ProjectMenu project={project} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingMenu ownerName={ownerName} project={project} projectName={projectName} />
          <div className="bubble-wrap gray wp">
            <div className="cu-label">{t("project.delete")}</div>
            <div className="cu-desc">
              <p>
                <strong className="notice">{t("project.delete.description")}</strong>
              </p>
              <p>
                <input
                  type="checkbox"
                  className="checkbox"
                  autoComplete="off"
                  id="accept"
                  checked={acceptedDeletion}
                  onChange={(event) => setAcceptedDeletion(event.currentTarget.checked)}
                />
                <label htmlFor="accept" className="bg-checkbox label-agreement">
                  {t("project.delete.accept")}
                </label>
              </p>
            </div>
          </div>
          <div className="box-wrap bottom">
            <button
              id="btnDelete"
              type="button"
              className="ybtn ybtn-danger"
              onClick={openDeletionModal}
            >
              <i className="yobicon-database-remove"></i> {t("project.delete.this")}
            </button>
          </div>
          <div
            id="alertDeletion"
            className={`modal hide${deletionModalOpen ? " in" : ""}`}
            style={deletionModalOpen ? { display: "block" } : undefined}
          >
            <div className="modal-header">
              <button type="button" className="close" onClick={closeDeletionModal}>
                ×
              </button>
              <h3>{t("project.delete.requestion")}</h3>
            </div>
            <div className="modal-body">
              <p> {t("project.delete.description")}</p>
              <p> {t("project.delete.reaccept")} </p>
            </div>
            <div className="modal-footer">
              <button
                id="btnDeleteExec"
                type="button"
                className="ybtn ybtn-danger"
                onClick={() => deleteMutation.mutate()}
              >
                {t("button.yes")}
              </button>
              <button type="button" className="ybtn" onClick={closeDeletionModal}>
                {t("button.no")}
              </button>
            </div>
          </div>
          {deletionModalOpen ? <div className="modal-backdrop fade in"></div> : null}
        </div>
      </div>
    </>
  );
}

function ProjectHeader({ project }: { project: ProjectContainer }) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const projectId = stringField(project.id, "");
  const logoUrl = stringField(project.logoUrl, "") || "/assets/images/project_default_logo.png";
  const backgroundImageUrl =
    stringField(project.backgroundImageUrl, "") || "/assets/images/bg-default-project.png";
  const isForked = booleanField(project.isForkedFromOrigin);
  const originalOwnerName = stringField(project.originalOwnerName, "");
  const originalProjectName = stringField(project.originalProjectName, "");
  const [isFavoritedProject, setIsFavoritedProject] = useState(
    () => booleanField(project.isFavorite) || booleanField(project.isFavorited),
  );
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return toggleFavoriteProjectRest(runtimeConfig, csrfToken, ownerName, projectName);
    },
    onSuccess(response) {
      setIsFavoritedProject((current) =>
        typeof response.favorited === "boolean" ? response.favorited : !current,
      );
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
      });
    },
  });

  return (
    <div
      className="project-header-outer"
      style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
    >
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img src={logoUrl} alt="" />
          </div>
          <div className={`project-breadcrumb-wrap${isForked ? " fork" : ""}`}>
            <div className="project-breadcrumb">
              <span className="project-author hide-in-mobile">
                <Link
                  activeProps={{ className: undefined }}
                  to="/$user"
                  params={{ user: ownerName }}
                >
                  {ownerName}
                </Link>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <Link
                  activeProps={{ className: undefined }}
                  to="/$ownerName/$projectName"
                  params={{ ownerName, projectName }}
                >
                  {projectName}
                </Link>
              </span>
              {/* oxlint-disable jsx-a11y/prefer-tag-over-role -- legacy project/header.scala.html renders this favorite toggle as a span. */}
              <span
                className="user-project-list"
                data-project-id={projectId}
                role="button"
                tabIndex={0}
                onMouseDown={(event) => {
                  event.stopPropagation();
                  favoriteMutation.mutate();
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  favoriteMutation.mutate();
                }}
              >
                <i
                  className={`${isFavoritedProject ? "starred" : ""} star material-icons va-text-top`}
                >
                  star
                </i>
              </span>
              {/* oxlint-enable jsx-a11y/prefer-tag-over-role */}
              {booleanField(project.isPrivate) ? (
                <span className="project-private">
                  <i className="yobicon-lock"></i>
                </span>
              ) : null}
              {booleanField(project.isProtected) ? (
                <span className="project-protected" title="Group Project">
                  G
                </span>
              ) : null}
            </div>
            {isForked ? (
              <div className="project-origin">
                <span className="project-origin-title">{t("fork.original")}</span>
                <Link
                  activeProps={{ className: undefined }}
                  to="/$ownerName/$projectName"
                  params={{ ownerName: originalOwnerName, projectName: originalProjectName }}
                  className="project-origin-name"
                >
                  {originalOwnerName} / {originalProjectName}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="project-util-wrap">
            <ul className="project-util"></ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectMenu({ project }: { project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = recordField(project.menuSetting);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            to="/$ownerName/$projectName"
            label={t("title.projectHome")}
            params={{ ownerName, projectName }}
            short="H"
          />
          {booleanField(menuSetting.code) ? (
            <ProjectMenuItem
              className="code-menu "
              label={t("menu.code")}
              params={{ ownerName, projectName }}
              short="C"
              to="/$ownerName/$projectName/code"
            />
          ) : null}
          {booleanField(menuSetting.issue) ? (
            <ProjectMenuItem
              label={t("menu.issue")}
              params={{ ownerName, projectName }}
              short="I"
              to="/$ownerName/$projectName/issues"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              label={t("menu.pullRequest")}
              params={{ ownerName, projectName }}
              short="P"
              to="/$ownerName/$projectName/pullRequests"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              label={t("menu.review")}
              params={{ ownerName, projectName }}
              short="R"
              to="/$ownerName/$projectName/reviews"
            />
          ) : null}
          {booleanField(menuSetting.milestone) ? (
            <ProjectMenuItem
              label={t("milestone")}
              params={{ ownerName, projectName }}
              short="M"
              to="/$ownerName/$projectName/milestones"
            />
          ) : null}
          {booleanField(menuSetting.board) ? (
            <ProjectMenuItem
              label={t("menu.board")}
              params={{ ownerName, projectName }}
              short="B"
              to="/$ownerName/$projectName/posts"
            />
          ) : null}
        </ul>
        {booleanField(project.viewerCanUpdate) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="active">
                <Link
                  activeProps={{ className: undefined }}
                  to="/$ownerName/$projectName/setting"
                  params={{ ownerName, projectName }}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={numberField(project.enrollmentRequestCount)} />
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ProjectMenuRoute =
  | "/$ownerName/$projectName"
  | "/$ownerName/$projectName/code"
  | "/$ownerName/$projectName/issues"
  | "/$ownerName/$projectName/pullRequests"
  | "/$ownerName/$projectName/reviews"
  | "/$ownerName/$projectName/milestones"
  | "/$ownerName/$projectName/posts";

function ProjectMenuItem({
  className = "",
  label,
  params,
  short,
  to,
}: {
  className?: string;
  label: string;
  params: { ownerName: string; projectName: string };
  short: string;
  to: ProjectMenuRoute;
}) {
  return (
    <li className={className}>
      <Link activeProps={{ className: undefined }} to={to} params={params}>
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
      </Link>
    </li>
  );
}

function ProjectSettingMenu({
  ownerName,
  project,
  projectName,
}: {
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const menuSetting = recordField(project.menuSetting);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <Link to="/$ownerName/$projectName/setting" params={{ ownerName, projectName }}>
          {t("project.setting")}
        </Link>
      </li>
      <li id="subMenuProjectMember" className="">
        <Link to="/$ownerName/$projectName/members" params={{ ownerName, projectName }}>
          {t("project.member")}
          <CountBadge count={numberField(project.enrollmentRequestCount)} className="num-badge" />
        </Link>
      </li>
      <li id="subMenuIssueLabel" className="">
        <Link
          activeProps={{ className: undefined }}
          to="/$ownerName/$projectName/issue/labelsform"
          params={{ ownerName, projectName }}
        >
          {t("issue.label")}
        </Link>
      </li>
      <li id="subMenuWebhook" className="">
        <Link to="/$ownerName/$projectName/webhooks" params={{ ownerName, projectName }}>
          {t("project.webhook")}
        </Link>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <Link to="/$ownerName/$projectName/transfer" params={{ ownerName, projectName }}>
          {t("project.transfer")}
        </Link>
      </li>
      <li id="subMenuProjectDelete" className="active">
        <Link
          activeProps={{ className: undefined }}
          to="/$ownerName/$projectName/deleteform"
          params={{ ownerName, projectName }}
        >
          {t("project.delete")}
        </Link>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className=""
        style={booleanField(menuSetting.code) ? undefined : { display: "none" }}
      >
        <Link to="/$ownerName/$projectName/changeVCS" params={{ ownerName, projectName }}>
          {t("project.changeVCS")}
        </Link>
      </li>
    </ul>
  );
}

function CountBadge({
  className = "project-menu-count",
  count,
}: {
  className?: string;
  count: number;
}) {
  return count > 0 ? <span className={className}>{count}</span> : null;
}

function recordField(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function numberField(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function booleanField(value: unknown) {
  return value === true;
}
