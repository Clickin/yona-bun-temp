import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { Fragment, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
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
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";
import { webhooksColors, webhooksStyles } from "./-webhooks.stylex";

const styles = stylex.create({
  form: { margin: "30px auto" },
  legend: { display: "block", marginBottom: "10px" },
  formWrap: { display: "inline-block", position: "relative", verticalAlign: "top" },
  payload: {
    borderColor: webhooksColors.fieldBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: webhooksColors.mutedText,
    fontSize: "14px",
    lineHeight: "20px",
    padding: "4px 6px",
    width: "355px",
  },
  secret: {
    borderColor: webhooksColors.fieldBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: webhooksColors.mutedText,
    fontSize: "14px",
    lineHeight: "20px",
    padding: "4px 6px",
    width: "214px",
  },
  submit: {
    backgroundColor: webhooksColors.actionPrimary,
    borderColor: webhooksColors.actionBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: webhooksColors.white,
    cursor: "pointer",
    minWidth: "100px",
    padding: "4px 12px",
    textAlign: "center",
    verticalAlign: "top",
  },
  list: { margin: "0 auto" },
  listHead: {
    backgroundColor: webhooksColors.listSurface,
    borderBottomColor: webhooksColors.border,
    borderBottomStyle: "solid",
    borderBottomWidth: "2px",
  },
});

const LEGACY_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

export const Route = createFileRoute("/$ownerName/$projectName/webhooks")({
  component: ProjectWebhooksRoute,
});

function ProjectWebhooksRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectWebhooksRouteScreen renderProjectShell={false} runtimeConfig={runtimeConfig} />;
}

export function ProjectWebhooksRouteScreen({
  renderProjectShell = true,
  runtimeConfig,
}: {
  renderProjectShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const content = (
    <ProjectWebhooksRouteShell
      renderProjectShell={renderProjectShell}
      runtimeConfig={runtimeConfig}
    />
  );

  if (!renderProjectShell) {
    return content;
  }

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        {content}
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectWebhooksRouteShell({
  renderProjectShell,
  runtimeConfig,
}: {
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const containerQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectSearchScope = containerQuery.data
    ? {
        organizationName: projectSearchScopeOrganizationName(containerQuery.data, ownerName),
        ownerName,
        projectName,
      }
    : { ownerName, projectName };
  const screen = (
    <ProjectWebhooksScreen renderProjectShell={renderProjectShell} runtimeConfig={runtimeConfig} />
  );

  if (!renderProjectShell) {
    return screen;
  }

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      {screen}
    </SiteLayoutShell>
  );
}

function ProjectWebhooksScreen({
  renderProjectShell,
  runtimeConfig,
}: {
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const legacyTitle = `${t("project.webhook")} - ${ownerName}/${projectName}`;
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const webhooksQuery = useQuery(
    readProjectWebhooksQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !webhooksQuery.data) {
    return <title>{legacyTitle}</title>;
  }

  return (
    <>
      <title>{legacyTitle}</title>
      {renderProjectShell ? (
        <>
          <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
          <ProjectMenu
            active="setting"
            basePath={runtimeConfig.basePath}
            project={projectQuery.data}
          />
        </>
      ) : null}
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
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payloadUrl = String(formData.get("payloadUrl") ?? "");
    if (payloadUrl.length === 0) {
      window.alert(t("project.webhook.payloadUrl.empty"));
      return;
    }
    mutation.mutate(
      {
        gitPush: formData.get("gitPush") === "on",
        payloadUrl,
        secret: String(formData.get("secret") ?? ""),
        webhookType: String(formData.get("webhookType") ?? "SIMPLE") as ProjectWebhookType,
      },
      {
        onSuccess: () => {
          form.reset();
          setSelectedWebhookType("SIMPLE");
          setGitPushChecked(false);
        },
      },
    );
  }

  function onWebhookTypeChange(webhookType: ProjectWebhookType) {
    setSelectedWebhookType(webhookType);
    setGitPushChecked(webhookType === "JSON" ? true : false);
  }

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap webhook-editor-wrap">
        <ProjectSettingMenu ownerName={ownerName} project={project} projectName={projectName} />
        {webhookCreationAllowed(webhooks) ? (
          <form
            id="formNewWebhook"
            action={prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}/webhooks`)}
            method="post"
            {...stylex.props(styles.form)}
            className={stylex.props(styles.form).className}
            data-stylex-owner="project-webhooks-new-form"
            onSubmit={onSubmit}
          >
            <strong
              {...stylex.props(styles.legend)}
              className={stylex.props(styles.legend).className}
              data-stylex-owner="project-webhooks-form-legend"
            >
              {t("project.webhook.new")}
            </strong>
            <div
              {...stylex.props(styles.formWrap)}
              className={`${stylex.props(styles.formWrap).className} form-actions`}
              data-stylex-owner="project-webhooks-form-fields"
            >
              <div>
                <input
                  type="text"
                  name="payloadUrl"
                  {...stylex.props(styles.payload)}
                  className={stylex.props(styles.payload).className}
                  data-stylex-owner="project-webhooks-payload"
                  maxLength={2000}
                  autoComplete="off"
                  placeholder={t("project.webhook.payloadUrl")}
                />{" "}
                <input
                  type="text"
                  name="secret"
                  {...stylex.props(styles.secret)}
                  className={stylex.props(styles.secret).className}
                  data-stylex-owner="project-webhooks-secret"
                  maxLength={250}
                  autoComplete="off"
                  placeholder={t("project.webhook.secret")}
                />{" "}
                <button
                  {...stylex.props(styles.submit)}
                  type="submit"
                  className={stylex.props(styles.submit).className}
                  data-stylex-owner="project-webhooks-submit"
                >
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
                {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy project/webhooks.scala.html renders this separator as a label with surrounding spaces. */}
                <label className="radio inline"> | </label>
                {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy project/webhooks.scala.html renders this empty spacer as a label. */}
                <label className="radio inline"></label>
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
            <LegacyWebhookHelp help={t("project.webhook.help")} />
          </form>
        ) : null}
        <div
          {...stylex.props(styles.list)}
          id="webhooksList"
          className={stylex.props(styles.list).className}
          data-stylex-owner="project-webhooks-list"
        >
          <ProjectWebhooksList
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

function LegacyWebhookHelp({ help }: { help: string }) {
  const parts = help.split(/\s*<br\s*\/?>/iu);

  return (
    <div>
      {parts.map((part, index) => (
        <Fragment key={`${part}-${parts.length}`}>
          {part}
          {index < parts.length - 1 ? (
            <>
              {" "}
              <br />
            </>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

function ProjectWebhooksList({
  ownerName,
  projectName,
  runtimeConfig,
  webhooks,
}: {
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
      <div
        {...stylex.props(styles.listHead)}
        className="row-fluid list-head"
        data-stylex-owner="project-webhooks-list-head"
      >
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
            <input
              type="checkbox"
              checked={booleanField(webhook.gitPush)}
              onClick={preventReadOnlyCheckboxClick}
              onKeyDown={preventReadOnlyCheckboxKeyDown}
              onChange={() => {}}
            />
          </div>
          <div className="span1 text-center">
            <button
              type="button"
              className="ybtn ybtn-danger ybtn-small"
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

function preventReadOnlyCheckboxClick(event: MouseEvent<HTMLInputElement>) {
  event.preventDefault();
}

function preventReadOnlyCheckboxKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === " ") {
    event.preventDefault();
  }
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
  const memberCount = projectMemberCount(project);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/setting"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.setting")}
        </Link>
      </li>
      <li id="subMenuProjectMember" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/members"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.member")}
          <CountBadge count={memberCount} className="num-badge" />
        </Link>
      </li>
      <li id="subMenuIssueLabel" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/issue/labelsform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("issue.label")}
        </Link>
      </li>
      <li id="subMenuWebhook" className="active">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/webhooks"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.webhook")}
        </Link>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/transfer"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.transfer")}
        </Link>
      </li>
      <li id="subMenuProjectDelete" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/deleteform"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
          {t("project.delete")}
        </Link>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className=""
        {...(projectMenuEnabled(project, "code", "showCode")
          ? {}
          : stylex.props(webhooksStyles.codeMenuHidden))}
        data-stylex-owner="project-webhooks-code-menu"
      >
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/changeVCS"
          search={() => ({ tabId: undefined })}
          params={{ ownerName, projectName }}
        >
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

function booleanField(value: unknown) {
  return value === true;
}

function webhookCreationAllowed(webhooks: ProjectWebhooksResponse) {
  const record = recordField(webhooks);
  if (typeof record.viewerCanCreate === "boolean") {
    return record.viewerCanCreate;
  }
  if (typeof record.viewerCanCreateWebhook === "boolean") {
    return record.viewerCanCreateWebhook;
  }
  return booleanField(webhooks.viewerCanUpdate);
}

function projectMenuEnabled(project: ProjectContainer, menuKey: string, fallbackKey: string) {
  const menuSettingValue = recordField(recordField(project).menuSetting)[menuKey];
  if (typeof menuSettingValue === "boolean") {
    return menuSettingValue;
  }
  return booleanField(recordField(project)[fallbackKey]);
}

function projectMemberCount(project: ProjectContainer) {
  const enrolledUsers = recordField(project).enrolledUsers;
  return Array.isArray(enrolledUsers) ? enrolledUsers.length : 0;
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const record = recordField(project);
  const organizationName = stringField(record.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return booleanField(project.isProtected) ? ownerName : undefined;
}
