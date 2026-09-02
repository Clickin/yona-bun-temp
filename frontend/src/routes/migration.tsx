/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy migration/home.scala.html requires positive tab order on source/destination search inputs. */
import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { SiteLayoutShell } from "./-home-route-screen";
export const Route = createFileRoute("/migration")({
  component: MigrationRoute,
});

function MigrationRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <>
      <title>{runtimeConfig.siteName ?? "Yoram"}</title>
      <YoramQueryProvider>
        <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
          <SiteLayoutShell runtimeConfig={runtimeConfig}>
            <MigrationScreen runtimeConfig={runtimeConfig} />
          </SiteLayoutShell>
        </LegacyI18nProvider>
      </YoramQueryProvider>
    </>
  );
}

function MigrationScreen({
  runtimeConfig,
}: {
  runtimeConfig: ReturnType<typeof Route.useRouteContext>["runtimeConfig"];
}) {
  if (runtimeConfig.migrationEnabled) {
    return <EnabledMigrationScreen runtimeConfig={runtimeConfig} />;
  }

  return (
    <div
      className={"yobi-migration"}
      data-owner="migration-disabled-shell"
      data-page-owner="migration-page"
    >
      <div className="header-pannel" data-owner="migration-layout">
        <MigrationComebackHeader />
        <MigrationSourceDestinationGrid />
      </div>
    </div>
  );
}

type MigrationProject = {
  owner: string;
  projectName: string;
  full_name: string;
  issueCount?: number;
  postCount?: number;
  milestoneCount?: number;
  assignees?: Array<{ name: string; login: string; email: string }>;
};

type GithubProject = {
  name: string;
  full_name: string;
  owner: { login: string; type: string };
};

type DestinationWarnings = {
  milestones: number;
  issues: number;
  posts: number;
  workerMissing: boolean;
  currentUserNotAdmin: boolean;
  userProject: boolean;
  foreignUserProject: boolean;
  currentUser?: string;
};

type EnabledMigrationScreenProps = {
  runtimeConfig: ReturnType<typeof Route.useRouteContext>["runtimeConfig"];
};

function EnabledMigrationScreen({ runtimeConfig }: EnabledMigrationScreenProps) {
  const token = runtimeConfig.migrationToken ?? "";
  const migrationBase = `${runtimeConfig.basePath === "/" ? "" : runtimeConfig.basePath}/migration`;
  const [source, setSource] = React.useState<MigrationProject | null>(null);
  const [destination, setDestination] = React.useState<GithubProject | null>(null);
  const [filter, setFilter] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [assigneeMap, setAssigneeMap] = React.useState<Record<string, string>>({});
  const [assigneeValidity, setAssigneeValidity] = React.useState<
    Record<string, boolean | undefined>
  >({});
  const [destinationWarnings, setDestinationWarnings] = React.useState<DestinationWarnings>({
    milestones: 0,
    issues: 0,
    posts: 0,
    workerMissing: false,
    currentUserNotAdmin: false,
    userProject: false,
    foreignUserProject: false,
  });
  const milestoneMap = React.useRef<Record<string, number>>({});
  const authorizationUrl = runtimeConfig.migrationAuthorizationUrl;
  const clientId = runtimeConfig.migrationClientId;
  const authorizationHref =
    authorizationUrl && clientId
      ? `${authorizationUrl}?${new URLSearchParams({
          client_id: clientId,
          scope: "user,repo,admin:org",
        }).toString()}`
      : undefined;

  const projectsQuery = useQuery({
    enabled: token.length > 0,
    queryFn: async () => {
      const [sourceResponse, destinationResponse] = await Promise.all([
        fetch(`${migrationBase}/projects`, { credentials: "same-origin" }),
        fetch("https://api.github.com/user/repos?per_page=100&page=1", {
          headers: { Authorization: `token ${token}` },
        }),
      ]);
      if (!sourceResponse.ok || !destinationResponse.ok) {
        throw new Error("Unable to load migration projects.");
      }
      const [sourceProjects, destinationProjects] = await Promise.all([
        sourceResponse.json() as Promise<MigrationProject[]>,
        destinationResponse.json() as Promise<GithubProject[]>,
      ]);
      return { sourceProjects, destinationProjects };
    },
    queryKey: ["migration", "projects", migrationBase, token],
  });
  const sourceProjects = projectsQuery.data?.sourceProjects ?? [];
  const destinationProjects = projectsQuery.data?.destinationProjects ?? [];
  const projectQueryMessage =
    projectsQuery.error instanceof Error
      ? projectsQuery.error.message
      : projectsQuery.error
        ? "Unable to load migration projects."
        : !token && !authorizationHref
          ? "GitHub migration OAuth is not configured."
          : undefined;

  const filteredSources = sourceProjects.filter((project) =>
    project.full_name.toLowerCase().includes(filter.toLowerCase()),
  );
  const filteredDestinations = destinationProjects.filter((project) =>
    project.full_name.toLowerCase().includes(filter.toLowerCase()),
  );

  const loadSource = async (project: MigrationProject) => {
    setBusy("source");
    try {
      const response = await fetch(
        `${migrationBase}/${encodeURIComponent(project.owner)}/projects/${encodeURIComponent(project.projectName)}`,
        { credentials: "same-origin" },
      );
      if (!response.ok) throw new Error("Unable to load the source project.");
      const loadedSource = (await response.json()) as MigrationProject;
      const storedAssignees = Object.fromEntries(
        (loadedSource.assignees ?? []).flatMap((assignee) => {
          const login = window.localStorage.getItem(assignee.login) ?? "";
          return login.length > 0 ? [[assignee.login, login] as const] : [];
        }),
      );
      setSource(loadedSource);
      setAssigneeMap(storedAssignees);
      setAssigneeValidity({});
      if (destination) {
        for (const [sourceLogin, destinationLogin] of Object.entries(storedAssignees)) {
          void validateAssignee(sourceLogin, destinationLogin);
        }
      }
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load the source project.");
    } finally {
      setBusy("");
    }
  };

  const loadDestinationWarnings = async (repo: GithubProject) => {
    const request = (path: string) =>
      fetch(`https://api.github.com${path}`, {
        headers: { Authorization: `token ${token}` },
      });
    const [milestonesResponse, issuesResponse, postsResponse, userResponse] = await Promise.all([
      request(`/repos/${repo.full_name}/milestones?state=all`),
      request(`/repos/${repo.full_name}/issues?state=all`),
      request(`/repos/${repo.full_name}/issues?state=all&labels=${encodeURIComponent("게시글")}`),
      request("/user"),
    ]);
    const currentUser = userResponse.ok
      ? ((await userResponse.json()) as { login?: string }).login
      : undefined;
    let workerMissing = false;
    let currentUserNotAdmin = false;
    if (repo.owner.type === "Organization" && currentUser) {
      const membershipResponse = await request(
        `/orgs/${encodeURIComponent(repo.owner.login)}/memberships/${encodeURIComponent(currentUser)}`,
      );
      const membership = membershipResponse.ok
        ? ((await membershipResponse.json()) as { role?: string })
        : undefined;
      workerMissing = membership?.role !== "admin";
      currentUserNotAdmin = membership?.role !== "admin";
    }
    setDestinationWarnings({
      milestones: milestonesResponse.ok
        ? ((await milestonesResponse.json()) as unknown[]).length
        : 0,
      issues: issuesResponse.ok ? ((await issuesResponse.json()) as unknown[]).length : 0,
      posts: postsResponse.ok ? ((await postsResponse.json()) as unknown[]).length : 0,
      workerMissing,
      currentUserNotAdmin,
      userProject: repo.owner.type === "User",
      foreignUserProject: repo.owner.type === "User" && repo.owner.login !== currentUser,
      currentUser,
    });
  };

  const validateAssignee = async (
    sourceLogin: string,
    destinationLogin: string,
    targetDestination = destination,
  ) => {
    setAssigneeMap((current) => ({ ...current, [sourceLogin]: destinationLogin }));
    if (!destinationLogin) {
      window.localStorage.removeItem(sourceLogin);
      setAssigneeValidity((current) => ({ ...current, [sourceLogin]: undefined }));
      return;
    }
    if (!targetDestination) return;
    const response = await fetch(
      `https://api.github.com/repos/${targetDestination.full_name}/collaborators/${encodeURIComponent(destinationLogin)}`,
      { headers: { Authorization: `token ${token}` } },
    );
    const valid = response.status === 204;
    setAssigneeValidity((current) => ({ ...current, [sourceLogin]: valid }));
    if (valid) {
      window.localStorage.setItem(sourceLogin, destinationLogin);
    } else {
      window.localStorage.removeItem(sourceLogin);
    }
  };

  const importData = async (kind: "milestones" | "issues" | "posts") => {
    if (!source || !destination) {
      setMessage("Source와 Destination 프로젝트를 선택해 주세요.");
      return;
    }
    setBusy(kind);
    try {
      const sourcePath = `${migrationBase}/${encodeURIComponent(source.owner)}/projects/${encodeURIComponent(source.projectName)}`;
      const response = await fetch(`${sourcePath}/${kind}?withWikiCommit=true`, {
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(`Unable to read ${kind}.`);
      const payload = (await response.json()) as {
        milestones?: Array<{ milestone: Record<string, unknown> }>;
        issues?: Array<{ issue: Record<string, unknown> }>;
      };
      let labelsById: Record<string, string> = {};
      if (kind === "issues") {
        const [labelsResponse, pairsResponse] = await Promise.all([
          fetch(`${sourcePath}/labels`, { credentials: "same-origin" }),
          fetch(`${sourcePath}/issuelabel`, { credentials: "same-origin" }),
        ]);
        if (!labelsResponse.ok || !pairsResponse.ok)
          throw new Error("Unable to read issue labels.");
        const labels = (await labelsResponse.json()) as {
          labels: Record<string, { name?: string }>;
        };
        const pairs = (await pairsResponse.json()) as {
          issueLabelPairs: Array<{ issueId: number; issueLabelId: number }>;
        };
        labelsById = Object.fromEntries(
          pairs.issueLabelPairs.map((pair) => [
            `${pair.issueId}:${pair.issueLabelId}`,
            labels.labels[String(pair.issueLabelId)]?.name ?? "",
          ]),
        );
      }
      const items = kind === "milestones" ? (payload.milestones ?? []) : (payload.issues ?? []);
      await Promise.all(
        items.map(async (item) => {
          const endpoint =
            kind === "milestones"
              ? `https://api.github.com/repos/${destination.full_name}/milestones`
              : `https://api.github.com/repos/${destination.full_name}/import/issues`;
          const body =
            kind === "milestones"
              ? (item as { milestone: Record<string, unknown> }).milestone
              : {
                  ...(item as { issue: Record<string, unknown> }).issue,
                  labels:
                    kind === "posts"
                      ? ["게시글"]
                      : Object.entries(labelsById).flatMap(([key, label]) =>
                          key.startsWith(`${(item as { issue: { id: number } }).issue.id}:`) &&
                          label
                            ? [label]
                            : [],
                        ),
                };
          if (kind === "issues") {
            const issue = body as Record<string, unknown>;
            if (typeof issue.assignee === "string") {
              const mappedAssignee = assigneeMap[issue.assignee];
              if (mappedAssignee && assigneeValidity[issue.assignee] === true) {
                issue.assignee = mappedAssignee;
              } else {
                delete issue.assignee;
              }
            }
            const sourceMilestoneId = issue.milestoneId;
            delete issue.milestoneId;
            if (typeof sourceMilestoneId === "number") {
              const destinationMilestone = milestoneMap.current[String(sourceMilestoneId)];
              if (destinationMilestone !== undefined) {
                issue.milestone = destinationMilestone;
              } else {
                delete issue.milestone;
              }
            }
          }
          const importResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
              Accept: "application/vnd.github.golden-comet-preview+json",
              Authorization: `token ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });
          if (!importResponse.ok) {
            throw new Error(`GitHub rejected ${kind} import (${importResponse.status}).`);
          }
          if (kind === "milestones") {
            const sourceMilestone = (item as { milestone: { id?: number } }).milestone;
            const destinationMilestone = (await importResponse.json()) as { number?: number };
            if (sourceMilestone.id !== undefined && destinationMilestone.number !== undefined) {
              milestoneMap.current[String(sourceMilestone.id)] = destinationMilestone.number;
            }
          }
        }),
      );
      const completed = items.length;
      setMessage(`${kind} ${completed}개를 옮겼습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to import ${kind}.`);
    } finally {
      setBusy("");
    }
  };

  return (
    <div
      className="yobi-migration"
      data-owner="migration-enabled-shell"
      data-page-owner="migration-page"
    >
      <div className="header-pannel" data-owner="migration-layout">
        <div className="comeback-text pull-right">Yona to Github</div>
        <div className="row title-text-bg">
          <div id="system-msg" className="well board">
            <div className="messages" data-owner="migration-notice">
              {message || projectQueryMessage || "Source와 Destination 프로젝트를 선택해 주세요."}
              {!token && authorizationHref ? (
                <>
                  {" "}
                  <Link href={authorizationHref} reloadDocument to={authorizationHref as "/"}>
                    GitHub migration OAuth 시작
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="status">
          <div className="row">
            <div className="head-title row-fluid">
              <div className="source-title span5">
                <div className={source ? "project-name" : "project-name warn"}>
                  {source?.full_name ?? "Source 프로젝트를 선택해 주세요"}
                </div>
              </div>
              <div className="arrow span1">
                <i className="yobicon-arrow-right-alt" />
              </div>
              <div className="destination-title span6">
                <div className={destination ? "project-name" : "project-name warn"}>
                  {destination?.full_name ?? "Destination 프로젝트를 선택해 주세요"}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row source-destination">
          <MigrationEnabledProjectPane
            side="source"
            projects={filteredSources}
            selected={source?.full_name}
            busy={busy === "source"}
            filter={filter}
            onFilter={setFilter}
            onSelect={(project) => void loadSource(project as MigrationProject)}
          />
          <MigrationEnabledProjectPane
            side="destination"
            projects={filteredDestinations}
            selected={destination?.full_name}
            busy={false}
            filter={filter}
            onFilter={setFilter}
            destinationWarnings={destinationWarnings}
            onSelect={(project) => {
              const selectedDestination = project as GithubProject;
              setDestination(selectedDestination);
              setDestinationWarnings({
                milestones: 0,
                issues: 0,
                posts: 0,
                workerMissing: false,
                currentUserNotAdmin: false,
                userProject: false,
                foreignUserProject: false,
              });
              void loadDestinationWarnings(selectedDestination);
              if (source) {
                for (const [sourceLogin, destinationLogin] of Object.entries(assigneeMap)) {
                  void validateAssignee(sourceLogin, destinationLogin, selectedDestination);
                }
              }
            }}
          />
          <div className="span6 status" data-owner="migration-status-column-grid">
            <div className="progress row">
              <div className="bar span10 bar-danger" data-owner="migration-progress-bar">
                {source ? `${source.issueCount ?? 0} / ${source.issueCount ?? 0}` : "0/0"}
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th colSpan={2}>Migration 대상</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["milestoneCount", "마일스톤", "milestones", "마일스톤 옮기기"],
                    ["issueCount", "이슈", "issues", "이슈 옮기기"],
                    ["postCount", "게시글", "posts", "게시글 옮기기"],
                  ] as const
                ).map(([countKey, label, kind, action]) => (
                  <tr key={kind}>
                    <td className="left-title">{label}</td>
                    <td className="left-title">{source?.[countKey] ?? 0}</td>
                    <td
                      className={
                        destination && destinationWarnings[kind] > 0 ? "alert-bg" : undefined
                      }
                    >
                      {destination && destinationWarnings[kind] > 0 ? (
                        <div
                          className="alert-icon text-align-left"
                          data-owner={`migration-${kind}-warning`}
                        >
                          <div>
                            <i className="yobicon-alert" />
                            <span className="alert-icon-text">
                              {" "}
                              대상 프로젝트에 <strong>{label}</strong> 데이터가 존재합니다.
                            </span>
                          </div>
                          <div className="text-align-left description">
                            import 진행시 데이터가 추가됩니다. 기존 데이터를 건드리지는 않으나
                            중복데이터가 입력될 가능성이 있으니 미리 확인해 주세요
                          </div>
                        </div>
                      ) : null}
                      {kind === "issues" && destination ? (
                        <div className="text-align-left caution">
                          마일스톤이 존재할 경우 마일스톤을 먼저 옮겨 놓지 않으면 마일스톤이
                          지정되지 않은 상태로 이슈가 이동됩니다.
                        </div>
                      ) : null}
                      {kind === "posts" && destination ? (
                        <div className="text-align-left caution">
                          기존 게시글은 '게시글'라벨을 붙여 이슈로 옮겨집니다.
                        </div>
                      ) : null}
                      <div className="btn-group">
                        <button
                          className="btn btn-danger"
                          disabled={!source || !destination || busy !== ""}
                          onClick={() => void importData(kind)}
                        >
                          {busy === kind ? "옮기는 중..." : action}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="td-title left-title">주의 사항!!</td>
                  <td colSpan={2} className="text-align-left">
                    <div className="caution">
                      작업 시작전에 Yona to Githbub 마이그레이션 가이드를 꼭 읽어주세요.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="left-title">
              기존 이슈 담당자{source?.assignees ? ` (${source.assignees.length})` : ""}
            </div>
            {destination && source?.assignees && source.assignees.length > 0 ? (
              <>
                <div className="caution">
                  대응되는 새 프로젝트 소속의 담당자 id를 입력해 주세요. 만약 지정하지 않으면 기존
                  담당자의 이슈는 담당자가 해제된 상태로 이전됩니다.
                </div>
                <table className="table table-bordered">
                  <tbody>
                    {source.assignees.map((assignee) => (
                      <tr key={assignee.login} className="assignee">
                        <td>
                          {assignee.name}
                          <br />
                          @@{assignee.login}
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="지정되지 않음"
                            value={assigneeMap[assignee.login] ?? ""}
                            onChange={(event) =>
                              void validateAssignee(assignee.login, event.target.value)
                            }
                          />
                          {assigneeMap[assignee.login] &&
                          assigneeValidity[assignee.login] === true ? (
                            <i className="yobicon-check-circle" />
                          ) : null}
                          {assigneeMap[assignee.login] &&
                          assigneeValidity[assignee.login] === false ? (
                            <i className="yobicon-delete-circle-alt" />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function MigrationEnabledProjectPane({
  side,
  projects,
  selected,
  busy,
  filter,
  onFilter,
  onSelect,
  destinationWarnings,
}: {
  side: "source" | "destination";
  projects: Array<MigrationProject | GithubProject>;
  selected?: string;
  busy: boolean;
  filter: string;
  onFilter: (value: string) => void;
  onSelect: (project: MigrationProject | GithubProject) => void;
  destinationWarnings?: DestinationWarnings;
}) {
  const isSource = side === "source";
  return (
    <div
      className={isSource ? "source-project span4" : "destination-project span4"}
      data-owner={isSource ? "migration-source-column-grid" : "migration-destination-column-grid"}
    >
      <div className="header">
        {isSource ? `Source ${projects.length} 개` : `Destination ${projects.length} 개`}
      </div>
      <div className={isSource ? "search left-border" : "search"}>
        <input
          tabIndex={isSource ? 1 : 2}
          type="text"
          className="search-query"
          name="target-filter"
          placeholder="Search.."
          value={filter}
          onChange={(event) => onFilter(event.target.value)}
          disabled={busy}
        />
      </div>
      <div className={isSource ? "left-project-list" : "destination-project-list"}>
        {projects.map((project) => {
          const fullName = project.full_name;
          const label = isSource
            ? (project as MigrationProject).projectName
            : (project as GithubProject).name;
          return (
            <button
              type="button"
              className={fullName === selected ? "project-list selected" : "project-list"}
              key={fullName}
              onClick={() => onSelect(project)}
            >
              <span className="owner">{fullName.split("/")[0]}</span>
              <span className="project-name">{label}</span>
              {!isSource && fullName === selected && destinationWarnings?.workerMissing ? (
                <div className="warn-no-worker">
                  <div className="label label-important">Admin에 유저가 없음</div>
                  <div>
                    유저가 대상 프로젝트/그룹의 admin으로 추가되어 있어야 합니다. 그렇지 않을 경우
                    사용자 아이디가 작성자로 표시됩니다.
                  </div>
                  {destinationWarnings.currentUserNotAdmin ? (
                    <>
                      <div className="label label-warning">
                        사용자가 Admin인 프로젝트가 아닙니다.
                      </div>
                      <div>
                        사용자와 {destinationWarnings.currentUser ?? "현재 사용자"} 둘 다 Admin이
                        아닌 프로젝트로는 마이그레이션을 진행할 수 없습니다!
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
              {!isSource && fullName === selected && destinationWarnings?.userProject ? (
                <div className="warn-user-project">
                  <div className="label label-important">User Project</div>
                  <div>
                    Organization 소속의 프로젝트가 아닌 경우에는 마이그레이션시에 사용자 계정이
                    사용됩니다.
                  </div>
                </div>
              ) : null}
              {!isSource && destinationWarnings?.foreignUserProject ? (
                <div>
                  <div className="label label-warning">사용자가 Admin인 프로젝트가 아닙니다.</div>
                  <div>Admin이 아닌 프로젝트로는 마이그레이션을 진행할 수 없습니다!</div>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MigrationComebackHeader() {
  const { t } = useLegacyMessages();
  return (
    <>
      <div className={"comeback-text pull-right"} data-part="migration-disabled-comeback">
        Yona to Github
        <span className={"midium-font"} />
      </div>
      <div className={"row title-text-bg"}>
        <div id="system-msg" className={"well board"}>
          <div className="messages" data-owner="migration-notice">
            {t("error.forbidden.or.not.allowed")}
          </div>
        </div>
      </div>
      <div className="status">
        <div className={"row"}>
          <div className={"head-title row-fluid"}>
            <div className={"source-title span5"}>
              <div className={"project-name warn"}>Source 프로젝트를 선택해 주세요</div>
            </div>
            <div className={"arrow span1"}>
              <i className={"yobicon-arrow-right-alt"} />
            </div>
            <div className={"destination-title span6"}>
              <div className={"project-name warn"}>Destination 프로젝트를 선택해 주세요</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MigrationProjectPane({
  side,
  tabIndex,
}: {
  side: "source" | "destination";
  tabIndex: number;
}) {
  const isSource = side === "source";
  const content = (
    <>
      <div className={"header"}>{isSource ? "Source 0 개" : "Destination 0 개"}</div>
      <div className={isSource ? `search left-border ` : `search `}>
        <input
          tabIndex={tabIndex}
          type="text"
          className={"search-query"}
          name="target-filter"
          placeholder="Search.."
          disabled
        />
      </div>
      {isSource ? (
        <div className={"left-project-list"} />
      ) : (
        <div className={"destination-project-list"} />
      )}
    </>
  );
  return isSource ? (
    <div className={"source-project span4"} data-owner="migration-source-column-grid">
      {content}
    </div>
  ) : (
    <div className={"destination-project span4"} data-owner="migration-destination-column-grid">
      {content}
    </div>
  );
}

function MigrationStatusTable() {
  return (
    <>
      <table className={"table"}>
        <thead>
          <tr>
            <th colSpan={2}>Migration 대상</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={"left-title"}>마일스톤</td>
            <td className={"left-title"}>0</td>
            <td>
              <div className={"btn-group"}>
                <button className={"btn btn-danger"} disabled>
                  마일스톤 옮기기
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td className={"left-title"}>이슈</td>
            <td className={"left-title"}>
              <span>0</span>
            </td>
            <td>
              <div className={"btn-group"}>
                <button className={"btn btn-danger"} disabled>
                  이슈 옮기기
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td className={"left-title"}>게시글</td>
            <td className={"left-title"}>
              <span>0</span>
            </td>
            <td>
              <div className={"btn-group"}>
                <button className={"btn btn-danger"} disabled>
                  게시글 옮기기
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td className={"td-title left-title"}>주의 사항!!</td>
            <td colSpan={2} className={"text-align-left"}>
              <div className={"caution"}>
                작업 시작전에 Yona to Githbub 마이그레이션 가이드를 꼭 읽어주세요.
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div className={"left-title"}>기존 이슈 담당자</div>
      <div />
    </>
  );
}

function MigrationSourceDestinationGrid() {
  return (
    <div className={"row source-destination"} data-owner="migration-source-destination-row">
      <MigrationProjectPane side="source" tabIndex={1} />
      <MigrationProjectPane side="destination" tabIndex={2} />
      <div className={"span6 status"} data-owner="migration-status-column-grid">
        <div className={"progress row"}>
          <div className={"bar span10 bar-danger"} data-owner="migration-progress-bar">
            0/0
          </div>
        </div>
        <MigrationStatusTable />
      </div>
    </div>
  );
}
