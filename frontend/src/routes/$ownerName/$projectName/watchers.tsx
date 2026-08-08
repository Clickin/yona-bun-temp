import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { use } from "react";
import {
  readProjectContainerQueryOptions,
  readProjectWatchersQueryOptions,
} from "../../../api/org-project";
import type { ProjectWatchersResponse } from "../../../api/org-project";
import type { ProjectContainer } from "../../../api/types";
import defaultAvatarUrl from "../../../assets/legacy/default-avatar-128.png";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { globalBreakpoints } from "../../../theme.stylex";
import { SiteLayoutShell } from "../../-home-route-screen";
import { ProjectHeader, ProjectMenu, ProjectNestedShellContext } from "../$projectName";
import { projectWatchersTheme } from "./-watchers.stylex";

export const Route = createFileRoute("/$ownerName/$projectName/watchers")({
  component: ProjectWatchersRoute,
});

function ProjectWatchersRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const nestedProjectShell = use(ProjectNestedShellContext);

  if (nestedProjectShell) {
    return <ProjectWatchersScreen nestedProjectShell runtimeConfig={runtimeConfig} />;
  }

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectWatchersScreen nestedProjectShell={false} runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectWatchersScreen({
  nestedProjectShell,
  runtimeConfig,
}: {
  nestedProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const watchersQuery = useQuery(
    readProjectWatchersQueryOptions(runtimeConfig, { ownerName, projectName }),
  );

  if (!projectQuery.data || !watchersQuery.data) {
    return null;
  }

  const body = (
    <ProjectWatchersBody basePath={runtimeConfig.basePath} watchers={watchersQuery.data} />
  );

  if (nestedProjectShell) {
    return body;
  }

  const projectSearchScope = {
    organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
    ownerName,
    projectName,
  };

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <title>{`${t("title.projectWatchers")} - ${ownerName}/${projectName}`}</title>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu basePath={runtimeConfig.basePath} project={projectQuery.data} />
      {body}
    </SiteLayoutShell>
  );
}

function ProjectWatchersBody({
  basePath,
  watchers,
}: {
  basePath: string;
  watchers: ProjectWatchersResponse;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <h4>
          <strong>{t("project.watcher.title")}</strong>
        </h4>
        <p>{t("project.watcher.description")}</p>
        <ul
          data-stylex-owner="project-watchers-list"
          {...stylex.props(styles.memberList)}
          className={`${stylex.props(styles.memberList).className} members project row-fluid`}
        >
          {watchers.watchers.map((watcher) => {
            const loginId = stringField(watcher.loginId, "");
            return (
              <li
                data-stylex-owner="project-watchers-member"
                key={stringField(watcher.userId, loginId)}
                {...stylex.props(styles.member)}
                className={`${stylex.props(styles.member).className} member span6 span-hard-wrap`}
              >
                <Link
                  to="/$user"
                  params={{ user: loginId }}
                  data-stylex-owner="project-watchers-avatar"
                  activeOptions={legacyLinkActiveOptions}
                  activeProps={legacyLinkActiveProps}
                  {...stylex.props(styles.avatar)}
                  className={`${stylex.props(styles.avatar).className} avatar-wrap mlarge`}
                >
                  <img
                    data-stylex-owner="project-watchers-avatar-image"
                    src={
                      stringField(watcher.avatarUrl, "") ||
                      prefixBasePath(basePath, defaultAvatarUrl)
                    }
                    width="64"
                    height="64"
                    alt=""
                    {...stylex.props(styles.avatarImage)}
                  />
                </Link>
                <div
                  data-stylex-owner="project-watchers-member-name"
                  {...stylex.props(styles.memberName)}
                  className={`${stylex.props(styles.memberName).className} member-name`}
                >
                  {stringField(watcher.userLabel, loginId)}
                </div>
                <div
                  data-stylex-owner="project-watchers-member-id"
                  {...stylex.props(styles.memberId)}
                  className={`${stylex.props(styles.memberId).className} member-id`}
                >
                  @{loginId}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const styles = stylex.create({
  // Bootstrap 2.3.1 `.row-fluid` plus _page.less `.members.project`.
  memberList: {
    listStyle: "none",
    margin: "0px",
    width: "100%",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  // Bootstrap `.row-fluid [class*="span"]` / `.span6`, then _page.less `.member`
  // and _responsive.less `.span-hard-wrap` min-width at max-width 720px. Its `width: 100vw`
  // loses to Bootstrap's more-specific `.row-fluid .span6`, so the active width stays 48.936%.
  member: {
    borderBottomColor: projectWatchersTheme.rowBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    boxSizing: "border-box",
    display: "block",
    float: "left",
    marginLeft: "5px",
    minHeight: "30px",
    minWidth: {
      default: null,
      [globalBreakpoints.mobile]: "95%",
    },
    padding: "10px 5px",
    position: "relative",
    width: "48.93617021276595%",
  },
  // _yobiUI.less `.avatar-wrap.mlarge`, Bootstrap `.pull-left`, and _common.less `.mr10`.
  avatar: {
    backgroundColor: projectWatchersTheme.avatarSurface,
    borderRadius: "3px",
    display: "inline-block",
    float: "left",
    height: "40px",
    marginRight: "10px",
    overflow: "hidden",
    verticalAlign: "middle",
    width: "40px",
  },
  // _yobiUI.less `.avatar-wrap img` — the 64x64 attrs stay, but the 40px
  // mlarge box renders the image at 40px via the intrinsic ratio.
  avatarImage: {
    height: "auto",
    verticalAlign: "top",
    width: "100%",
  },
  // _page.less `.members.project .member .member-name`.
  memberName: {
    fontWeight: "bold",
    lineHeight: "20px",
    marginTop: "2px",
  },
  // _page.less `.members.project .member .member-id`.
  memberId: {
    color: projectWatchersTheme.memberIdText,
    lineHeight: "20px",
  },
});

const legacyLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;

const legacyLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
} as const;

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName = stringField(project.organizationName, "");
  if (organizationName) {
    return organizationName;
  }
  return projectIsProtected(project) ? ownerName : undefined;
}

function projectIsProtected(project: ProjectContainer) {
  const record = recordField(project);
  return record.isProtected === true || stringField(record.projectScope, "") === "protected";
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
