import { useRef, useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  readProjectTransferQueryOptions,
  requestProjectTransferRest,
  toggleFavoriteProjectRest,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { ProjectTransferResponse } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

type ProjectTransferScreenData = ProjectTransferResponse & ProjectContainer;

export const Route = createFileRoute("/$ownerName/$projectName/transfer")({
  component: ProjectTransferRoute,
});

function ProjectTransferRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectTransferScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectTransferScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const query = useQuery(
    readProjectTransferQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!query.data) {
    return null;
  }

  return (
    <ProjectTransferBody
      project={query.data as ProjectTransferScreenData}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectTransferBody({
  project,
  runtimeConfig,
}: {
  project: ProjectTransferScreenData;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const acceptInputRef = useRef<HTMLInputElement>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [hasTransferRequestStarted, setHasTransferRequestStarted] = useState(false);
  const transferMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return requestProjectTransferRest(runtimeConfig, csrfToken, {
        destination: destinationInputRef.current?.value ?? stringField(project.destination, ""),
        ownerName,
        projectName,
      });
    },
    onSuccess(response) {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.transfer(ownerName, projectName),
      });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
      });
      if (typeof response.redirectPath === "string") {
        router.history.push(prefixBasePath(runtimeConfig.basePath, response.redirectPath));
      } else {
        router.history.go(0);
      }
    },
    onError() {
      setIsTransferModalOpen(false);
      // oxlint-disable-next-line no-alert -- legacy project.Transfer.js uses $yobi.alert for request failures.
      window.alert(t("project.transfer.error"));
    },
  });
  const openTransferModal = () => {
    if (!acceptInputRef.current?.checked) {
      // oxlint-disable-next-line no-alert -- legacy project.Transfer.js uses $yobi.alert before opening the modal.
      window.alert(t("project.transfer.alert"));
      return;
    }
    setIsTransferModalOpen(true);
  };
  const closeTransferModal = () => {
    setIsTransferModalOpen(false);
  };
  const dismissTransferModal = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    closeTransferModal();
  };

  return (
    <>
      <ProjectHeader project={project} />
      <ProjectMenu project={project} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectSettingMenu ownerName={ownerName} project={project} projectName={projectName} />
          <div className="bubble-wrap gray wp">
            <div className="row-fluid">
              <div className="cu-label">{t("project.transfer.new.owner")}</div>
              <div className="cu-desc">
                <p>
                  <input type="text" id="owner" name="owner" ref={destinationInputRef} />
                </p>
              </div>
            </div>
            <div className="row-fluid">
              <div className="cu-label">{t("project.transfer")}</div>
              <div className="cu-desc">
                <ul>
                  <li className="notice">
                    <strong>{t("project.transfer.description1")}</strong>
                  </li>
                  <li className="notice">
                    <strong>{t("project.transfer.description2")}</strong>
                  </li>
                  <li className="notice">
                    <strong>{t("project.transfer.description3")}</strong>
                  </li>
                  <li className="notice">
                    <strong>{t("project.transfer.description4")}</strong>
                  </li>
                  <li className="notice">
                    <strong>{t("project.transfer.description5")}</strong>
                  </li>
                </ul>
                <p>
                  <input
                    type="checkbox"
                    className="checkbox"
                    autoComplete="off"
                    id="accept"
                    ref={acceptInputRef}
                  />
                  <label htmlFor="accept" className="bg-checkbox label-agreement">
                    {t("project.transfer.accept")}
                  </label>
                </p>
              </div>
            </div>
          </div>
          <div className="box-wrap bottom">
            <button
              type="button"
              id="btnTransfer"
              className="ybtn ybtn-danger"
              onClick={openTransferModal}
            >
              <i className="yobicon-database"></i> {t("project.transfer.this")}
            </button>
          </div>
          <div id="alertTransfer" className={isTransferModalOpen ? "modal in" : "modal hide"}>
            <div className="modal-header">
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                onClick={dismissTransferModal}
              >
                ×
              </button>
              <h3>{t("project.transfer.requestion")}</h3>
            </div>
            <div className="modal-body">
              <p>{t("project.transfer.description")}</p>
              <p>{t("project.transfer.reaccept")}</p>
            </div>
            <div className="modal-footer">
              <button
                id="btnTransferExec"
                type="button"
                className="ybtn ybtn-danger"
                disabled={hasTransferRequestStarted || transferMutation.isPending}
                onClick={() => {
                  if (hasTransferRequestStarted || transferMutation.isPending) {
                    return;
                  }
                  setHasTransferRequestStarted(true);
                  transferMutation.mutate();
                }}
              >
                {t("button.yes")}
              </button>
              <button
                type="button"
                className="ybtn"
                data-dismiss="modal"
                onClick={dismissTransferModal}
              >
                {t("button.no")}
              </button>
            </div>
          </div>
          {isTransferModalOpen ? <div className="modal-backdrop in"></div> : null}
        </div>
      </div>
    </>
  );
}

function ProjectHeader({ project }: { project: ProjectTransferScreenData }) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const projectId = stringField(project.id, "");
  const [isFavoritedProject, setIsFavoritedProject] = useState(
    () => booleanField(project.isFavorite) || booleanField(project.isFavorited),
  );
  const logoUrl = stringField(project.logoUrl, "") || "/assets/images/project_default_logo.png";
  const backgroundImageUrl =
    stringField(project.backgroundImageUrl, "") || "/assets/images/bg-default-project.png";
  const isForked = booleanField(project.isForkedFromOrigin);
  const originalOwnerName = stringField(project.originalOwnerName, "");
  const originalProjectName = stringField(project.originalProjectName, "");
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
        queryKey: apiQueryKeys.project.transfer(ownerName, projectName),
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
                  search={{}}
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
                onClick={(event) => {
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

function ProjectMenu({ project }: { project: ProjectTransferScreenData }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = recordField(project.menuSetting);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            label={t("title.projectHome")}
            params={{ ownerName, projectName }}
            short="H"
            to="/$ownerName/$projectName"
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
  to:
    | "/$ownerName/$projectName"
    | "/$ownerName/$projectName/code"
    | "/$ownerName/$projectName/issues"
    | "/$ownerName/$projectName/pullRequests"
    | "/$ownerName/$projectName/reviews"
    | "/$ownerName/$projectName/milestones"
    | "/$ownerName/$projectName/posts";
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
  project: ProjectTransferScreenData;
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
      <li id="subMenuProjectTransfer" className="active">
        <Link
          activeProps={{ className: undefined }}
          to="/$ownerName/$projectName/transfer"
          params={{ ownerName, projectName }}
        >
          {t("project.transfer")}
        </Link>
      </li>
      <li id="subMenuProjectDelete" className="">
        <Link to="/$ownerName/$projectName/deleteform" params={{ ownerName, projectName }}>
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
