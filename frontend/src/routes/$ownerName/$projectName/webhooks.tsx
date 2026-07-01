import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";
import {
  createProjectWebhookRest,
  deleteProjectWebhookRest,
  readProjectContainerQueryOptions,
  readProjectWebhooksQueryOptions,
} from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type {
  ProjectWebhook,
  ProjectWebhooksResponse,
  ProjectWebhookType,
} from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/$ownerName/$projectName/webhooks")({
  component: ProjectWebhooksRoute,
});

function ProjectWebhooksRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectWebhooksScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectWebhooksScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const webhooksQuery = useQuery(
    readProjectWebhooksQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !webhooksQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectWebhooksBody
        project={projectQuery.data}
        runtimeConfig={runtimeConfig}
        webhooks={webhooksQuery.data}
      />
    </>
  );
}

function ProjectWebhooksBody({
  project,
  runtimeConfig,
  webhooks,
}: {
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
  webhooks: ProjectWebhooksResponse;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const [selectedWebhookType, setSelectedWebhookType] = useState<ProjectWebhookType>("SIMPLE");
  const [gitPushChecked, setGitPushChecked] = useState(false);
  const isJsonWebhook = selectedWebhookType === "JSON";
  const mutation = useMutation({
    mutationFn: async (input: {
      gitPush: boolean;
      payloadUrl: string;
      secret: string;
      webhookType: ProjectWebhookType;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createProjectWebhookRest(runtimeConfig, csrfToken, {
        ...input,
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.webhooks(ownerName, projectName),
      });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    mutation.mutate({
      gitPush: formData.get("gitPush") === "on",
      payloadUrl: String(formData.get("payloadUrl") ?? ""),
      secret: String(formData.get("secret") ?? ""),
      webhookType: String(formData.get("webhookType") ?? "SIMPLE") as ProjectWebhookType,
    });
  }

  function onWebhookTypeChange(webhookType: ProjectWebhookType) {
    setSelectedWebhookType(webhookType);
    setGitPushChecked(webhookType === "JSON" ? true : false);
  }

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap webhook-editor-wrap">
        <ProjectSettingMenu
          basePath={runtimeConfig.basePath}
          ownerName={ownerName}
          project={project}
          projectName={projectName}
        />
        {booleanField(webhooks.viewerCanUpdate) ? (
          <form
            id="formNewWebhook"
            action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/webhooks`)}
            method="post"
            className="new-webhook-wrap"
            onSubmit={onSubmit}
          >
            <strong className="form-legend">{t("project.webhook.new")}</strong>
            <div className="form-wrap form-actions">
              <div>
                <input
                  type="text"
                  name="payloadUrl"
                  className="input-webhook-payload"
                  maxLength={2000}
                  autoComplete="off"
                  placeholder={t("project.webhook.payloadUrl")}
                />
                <input
                  type="text"
                  name="secret"
                  className="input-webhook-secret"
                  maxLength={250}
                  autoComplete="off"
                  placeholder={t("project.webhook.secret")}
                />
                <button type="submit" className="ybtn ybtn-primary btn-submit">
                  {t("project.webhook.add")}
                </button>
              </div>
              <div>
                <label className="radio inline">
                  <input
                    type="radio"
                    name="webhookType"
                    value="SIMPLE"
                    checked={selectedWebhookType === "SIMPLE"}
                    onChange={() => onWebhookTypeChange("SIMPLE")}
                  />{" "}
                  Messenger (Only text)
                </label>
                <label className="radio inline">
                  <input
                    type="radio"
                    name="webhookType"
                    value="DETAIL_SLACK"
                    checked={selectedWebhookType === "DETAIL_SLACK"}
                    onChange={() => onWebhookTypeChange("DETAIL_SLACK")}
                  />{" "}
                  Slack (Meta)
                </label>
                <label className="radio inline">
                  <input
                    type="radio"
                    name="webhookType"
                    value="DETAIL_HANGOUT_CHAT"
                    checked={selectedWebhookType === "DETAIL_HANGOUT_CHAT"}
                    onChange={() => onWebhookTypeChange("DETAIL_HANGOUT_CHAT")}
                  />{" "}
                  Google Chat (Thread)
                </label>
                <label className="radio inline">
                  <input
                    type="radio"
                    name="webhookType"
                    value="JSON"
                    checked={selectedWebhookType === "JSON"}
                    onChange={() => onWebhookTypeChange("JSON")}
                  />{" "}
                  Continuous Integration tool (Only push event)
                </label>
                <span className="radio inline" aria-hidden="true">
                  |
                </span>
                <span className="radio inline" aria-hidden="true"></span>
                <label className="checkbox inline" htmlFor="gitPush">
                  <input
                    type="checkbox"
                    id="gitPush"
                    name="gitPush"
                    className="form-check-input"
                    checked={gitPushChecked}
                    onClick={(event) => {
                      if (isJsonWebhook) {
                        event.preventDefault();
                      }
                    }}
                    onChange={(event) => {
                      if (!isJsonWebhook) {
                        setGitPushChecked(event.currentTarget.checked);
                      }
                    }}
                  />{" "}
                  {t("project.webhook.includeGitPush")}
                </label>
              </div>
            </div>
            <div dangerouslySetInnerHTML={{ __html: t("project.webhook.help") }} />
          </form>
        ) : null}
        <div id="webhooksList" className="webhook-list-wrap">
          <ProjectWebhooksList
            basePath={runtimeConfig.basePath}
            ownerName={ownerName}
            projectName={projectName}
            runtimeConfig={runtimeConfig}
            webhooks={webhooks.webhooks}
          />
        </div>
      </div>
    </div>
  );
}

function ProjectWebhooksList({
  basePath,
  ownerName,
  projectName,
  runtimeConfig,
  webhooks,
}: {
  basePath: string;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  webhooks: ProjectWebhook[];
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: async (webhookId: number) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteProjectWebhookRest(runtimeConfig, csrfToken, {
        ownerName,
        projectName,
        webhookId,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.webhooks(ownerName, projectName),
      });
    },
  });

  if (webhooks.length === 0) {
    return (
      <div className="error-wrap">
        <i className="ico ico-err1"></i>
        <p>{t("project.webhook.list.empty")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="row-fluid list-head">
        <div className="span5 payload-url">
          <strong>{t("project.webhook.payloadUrl")}</strong>
        </div>
        <div className="span2 secret text-center">
          <strong>{t("project.webhook.secret")}</strong>
        </div>
        <div className="span2 secret text-center">
          <strong>Type of message</strong>
        </div>
        <div className="span2 secret text-center">
          <strong>Include git push events</strong>
        </div>
        <div className="span1 secret text-center"></div>
      </div>
      {webhooks.map((webhook) => (
        <div
          className="row-fluid list-item vertical-align"
          data-webhook-id={webhook.id}
          key={webhook.id}
        >
          <div className="span5">
            <h6 className="mr20 truncate">{stringField(webhook.payloadUrl, "")}</h6>
          </div>
          <div className="span2 text-center">
            <h6>{stringField(webhook.secret, "") || "NONE"}</h6>
          </div>
          <div className="span2 text-center">
            <h6>{stringField(webhook.webhookType, "")}</h6>
          </div>
          <div className="span2 text-center">
            <input type="checkbox" checked={booleanField(webhook.gitPush)} onChange={() => {}} />
          </div>
          <div className="span1 text-center">
            <button
              type="button"
              className="ybtn ybtn-danger ybtn-small"
              data-request-method="delete"
              data-request-uri={prefixBasePath(
                basePath,
                `/${ownerName}/${projectName}/webhooks/${webhook.id}`,
              )}
              onClick={() => deleteMutation.mutate(webhook.id)}
            >
              {t("button.delete")}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

function ProjectHeader({ basePath, project }: { basePath: string; project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const projectId = stringField(project.id, "");
  const logoUrl = stringField(project.logoUrl, "") || "/assets/images/project_default_logo.png";
  const backgroundImageUrl =
    stringField(project.backgroundImageUrl, "") || "/assets/images/bg-default-project.png";
  const isForked = booleanField(project.isForkedFromOrigin);
  const originalOwnerName = stringField(project.originalOwnerName, "");
  const originalProjectName = stringField(project.originalProjectName, "");

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
                <a href={prefixBasePath(basePath, `/${ownerName}`)}>{ownerName}</a>
              </span>
              <span className="project-separator hide-in-mobile">/</span>
              <span className="project-name">
                <a href={projectHref(basePath, ownerName, projectName)}>{projectName}</a>
              </span>
              <span className="user-project-list" data-project-id={projectId}>
                <i
                  className={`${booleanField(project.isFavorite) ? "starred" : ""} star material-icons va-text-top`}
                >
                  star
                </i>
              </span>
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
                <a
                  href={projectHref(basePath, originalOwnerName, originalProjectName)}
                  className="project-origin-name"
                >
                  {originalOwnerName} / {originalProjectName}
                </a>
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

function ProjectMenu({ basePath, project }: { basePath: string; project: ProjectContainer }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "owner");
  const projectName = stringField(project.projectName, "project");
  const menuSetting = recordField(project.menuSetting);

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <ProjectMenuItem
            href={projectHref(basePath, ownerName, projectName)}
            label={t("title.projectHome")}
            short="H"
          />
          {booleanField(menuSetting.code) ? (
            <ProjectMenuItem
              className="code-menu "
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/code`)}
              label={t("menu.code")}
              short="C"
            />
          ) : null}
          {booleanField(menuSetting.issue) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issues`)}
              label={t("menu.issue")}
              short="I"
            />
          ) : null}
          {booleanField(menuSetting.pullRequest) && stringField(project.vcs, "GIT") === "GIT" ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/pullRequests`)}
              label={t("menu.pullRequest")}
              short="P"
            />
          ) : null}
          {booleanField(menuSetting.review) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/reviews`)}
              label={t("menu.review")}
              short="R"
            />
          ) : null}
          {booleanField(menuSetting.milestone) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/milestones`)}
              label={t("milestone")}
              short="M"
            />
          ) : null}
          {booleanField(menuSetting.board) ? (
            <ProjectMenuItem
              href={prefixBasePath(basePath, `/${ownerName}/${projectName}/posts`)}
              label={t("menu.board")}
              short="B"
            />
          ) : null}
        </ul>
        {booleanField(project.viewerCanUpdate) ? (
          <div className="project-setting">
            <ul className="project-menu-nav">
              <li className="active">
                <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/setting`)}>
                  <i className="yobicon-cog"></i>
                  <span className="blind">
                    <span className="menu-name">{t("menu.admin")}</span>
                  </span>
                  <CountBadge count={numberField(project.enrollmentRequestCount)} />
                </a>
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
  href,
  label,
  short,
}: {
  className?: string;
  href: string;
  label: string;
  short: string;
}) {
  return (
    <li className={className}>
      <a href={href}>
        <span className="menu-name">{label}</span>
        <span className="short-menu">{short}</span>
      </a>
    </li>
  );
}

function ProjectSettingMenu({
  basePath,
  ownerName,
  project,
  projectName,
}: {
  basePath: string;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const menuSetting = recordField(project.menuSetting);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/setting`)}>
          {t("project.setting")}
        </a>
      </li>
      <li id="subMenuProjectMember" className="">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/members`)}>
          {t("project.member")}
          <CountBadge count={numberField(project.enrollmentRequestCount)} className="num-badge" />
        </a>
      </li>
      <li id="subMenuIssueLabel" className="">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/labels`)}>
          {t("issue.label")}
        </a>
      </li>
      <li id="subMenuWebhook" className="active">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/webhooks`)}>
          {t("project.webhook")}
        </a>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/transfer`)}>
          {t("project.transfer")}
        </a>
      </li>
      <li id="subMenuProjectDelete" className="">
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/deleteform`)}>
          {t("project.delete")}
        </a>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className=""
        style={booleanField(menuSetting.code) ? undefined : { display: "none" }}
      >
        <a href={prefixBasePath(basePath, `/${ownerName}/${projectName}/changeVCS`)}>
          {t("project.changeVCS")}
        </a>
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

function projectHref(basePath: string, ownerName: string, projectName: string) {
  return prefixBasePath(basePath, `/${ownerName}/${projectName}`);
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
