import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { codeCompareQueryOptions, type CodeCompareResponse } from "../../../../api/code-compare";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import type { ProjectContainer } from "../../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { type RuntimeConfig } from "../../../../runtime-config";
import { SiteLayoutShell } from "../../../-home-route-screen";
import { ProjectHeader, ProjectMenu } from "../../$projectName";

type ParsedDiffLine =
  | { kind: "range"; text: string }
  | {
      kind: "line";
      lineNumber: number;
      newLineNumber: number | null;
      oldLineNumber: number | null;
      prefix: string;
      text: string;
      type: "add" | "context" | "remove";
    };

type ParsedFileDiff = {
  lines: ParsedDiffLine[];
  pathA: string;
  pathB: string;
};

const LEGACY_DIFF_FILE_LIMIT = 2000;

export const Route = createFileRoute("/$ownerName/$projectName/compare/$revisionRange")({
  component: ProjectCodeCompareRoute,
});

function ProjectCodeCompareRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ProjectCodeCompareRouteShell runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeCompareRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, revisionRange } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const projectSearchScope = projectQuery.data
    ? {
        organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName),
        ownerName,
        projectName,
      }
    : { ownerName, projectName };

  return (
    <SiteLayoutShell projectSearchScope={projectSearchScope} runtimeConfig={runtimeConfig}>
      <ProjectCodeCompareScreen
        project={projectQuery.data}
        revisionRange={revisionRange}
        runtimeConfig={runtimeConfig}
      />
    </SiteLayoutShell>
  );
}

function ProjectCodeCompareScreen({
  project,
  revisionRange,
  runtimeConfig,
}: {
  project: ProjectContainer | undefined;
  revisionRange: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const compareQuery = useQuery(
    codeCompareQueryOptions(runtimeConfig, { ownerName, projectName, revisionRange }),
  );

  if (!project || !compareQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectCodeCompareTitle
        compare={compareQuery.data}
        ownerName={ownerName}
        projectName={projectName}
        revisionRange={revisionRange}
      />
      <ProjectHeader basePath={runtimeConfig.basePath} project={project} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={project} />
      <ProjectCodeCompareBody
        compare={compareQuery.data}
        ownerName={ownerName}
        project={project}
        projectName={projectName}
      />
    </>
  );
}

function ProjectCodeCompareTitle({
  compare,
  ownerName,
  projectName,
  revisionRange,
}: {
  compare: CodeCompareResponse;
  ownerName: string;
  projectName: string;
  revisionRange: string;
}) {
  const { commitA, commitB } = compareCommitIds(compare, revisionRange);

  return <title>{`${commitA}..${commitB} - ${ownerName}/${projectName}`}</title>;
}

function ProjectCodeCompareBody({
  compare,
  ownerName,
  project,
  projectName,
}: {
  compare: CodeCompareResponse;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const { revisionRange } = Route.useParams();
  const { commitA, commitB } = compareCommitIds(compare, revisionRange);
  const vcs = typeof project.vcs === "string" ? project.vcs.toUpperCase() : "";
  const isSvn = vcs === "SVN" || vcs === "SUBVERSION";

  return (
    <div className="project-page-wrap">
      <div className="code-browse-wrap">
        <p className="commitInfo">
          <strong className="commitId">
            @{commitA}..{commitB}
          </strong>
        </p>
        {isSvn && compare.patch ? (
          <div className="diff-wrap">
            <div className="diff-body hide" data-commit-origin="true" id="commit">
              {compare.patch}
            </div>
          </div>
        ) : compare.files.length === 0 ? (
          <div className="alert">{t("code.noChanges")}</div>
        ) : (
          <div className="diff-body discommentable">
            {compare.files.length >= LEGACY_DIFF_FILE_LIMIT ? (
              <p className="alert">
                {t("code.fileDiffLimitExceeded", { args: [String(LEGACY_DIFF_FILE_LIMIT)] })}
              </p>
            ) : null}
            {compare.files.map((file) => (
              <CompareFileDiff
                commitA={commitA}
                commitB={commitB}
                file={file}
                key={file.path}
                ownerName={ownerName}
                projectName={projectName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompareFileDiff({
  commitA,
  commitB,
  file,
  ownerName,
  projectName,
}: {
  commitA: string;
  commitB: string;
  file: CodeCompareResponse["files"][number];
  ownerName: string;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const parsed = parseUnifiedDiff(file.path, file.patch);
  const pathA = isNullDiffPath(parsed.pathA) ? "" : parsed.pathA;
  const pathB = isNullDiffPath(parsed.pathB) ? "" : parsed.pathB;
  const filePath = pathB || pathA || file.path;
  const fileHeader =
    !pathA && pathB
      ? t("code.addedPath", { args: [pathB] })
      : pathA && !pathB
        ? t("code.deletedPath", { args: [pathA] })
        : pathA && pathB && pathA !== pathB
          ? t("code.renamedPath", { args: [pathA, pathB] })
          : filePath;
  const fileId = filePath.replace(/\//g, "-").replace(/\./g, "-");
  const shortA = shortenCommitId(commitA);
  const shortB = shortenCommitId(commitB);

  return (
    <div id={fileId} className="diff-partial-outer">
      <div className="diff-partial-inner">
        <div className="diff-partial-meta">
          <div className="diff-partial-commit">
            <div className="diff-partial-commit-id">
              {commitA && pathA ? (
                <Link
                  target="_blank"
                  title={commitA}
                  to={projectTo(ownerName, projectName, "code", commitA, pathA)}
                >
                  {shortA}
                </Link>
              ) : (
                "\u00a0"
              )}
            </div>
            <div className="diff-partial-commit-id">
              {commitB && pathB ? (
                <Link
                  target="_blank"
                  title={commitB}
                  to={projectTo(ownerName, projectName, "code", commitB, pathB)}
                >
                  {shortB}
                </Link>
              ) : (
                "\u00a0"
              )}
            </div>
          </div>
          <div className="diff-partial-file">
            <span className="filename">{fileHeader}</span>
          </div>
        </div>
        <div className="diff-partial-code" data-hashcode={file.path}>
          <div className="patch-header">
            {pathA ? <div className="path">{`--- ${pathA}`}</div> : null}
            {pathB ? <div className="path">{`+++ ${pathB}`}</div> : null}
          </div>
          <table
            className="diff-container show-comments"
            data-commit-a={commitA}
            data-commit-b={commitB}
            data-file-path={filePath}
            data-path-a={pathA}
            data-path-b={pathB}
          >
            <tbody>
              {parsed.lines.length === 0 ? (
                <tr>
                  <td colSpan={3}>{t("code.noChanges")}</td>
                </tr>
              ) : (
                parsed.lines.map((line) =>
                  line.kind === "range" ? (
                    <tr className="range" key={diffLineKey(line)}>
                      <td className="linenum">
                        <div className="line-number" data-line-num="...">
                          <span className="hidden">...</span>
                        </div>
                      </td>
                      <td className="linenum">
                        <div className="line-number" data-line-num="...">
                          <span className="hidden">...</span>
                        </div>
                      </td>
                      <td className="hunk">{line.text}</td>
                    </tr>
                  ) : (
                    <DiffLineView key={diffLineKey(line)} line={line} />
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DiffLineView({ line }: { line: Extract<ParsedDiffLine, { kind: "line" }> }) {
  const oldLine = line.oldLineNumber === null ? "" : String(line.oldLineNumber);
  const newLine = line.newLineNumber === null ? "" : String(line.newLineNumber);

  return (
    <tr
      className={line.type}
      data-line={line.lineNumber}
      data-side={line.type === "remove" ? "A" : "B"}
      data-type={line.type}
    >
      <td className="linenum">
        <i className="yobicon-comments"></i>
        <div className="line-number" data-line-num={oldLine}></div>
        <span className="hidden">{oldLine}</span>
      </td>
      <td className="linenum">
        <div className="line-number" data-line-num={newLine}></div>
        <span className="hidden">{newLine}</span>
      </td>
      <td className="code">
        <pre className="diff-partial-codeline">{`${line.prefix}${line.text}`}</pre>
      </td>
    </tr>
  );
}

function diffLineKey(line: ParsedDiffLine) {
  if (line.kind === "range") {
    return `range-${line.text}`;
  }

  return `line-${line.oldLineNumber ?? ""}-${line.newLineNumber ?? ""}-${line.prefix}${line.text}`;
}

function parseUnifiedDiff(path: string, patch: string): ParsedFileDiff {
  let pathA = path;
  let pathB = path;
  let oldLineNumber = 0;
  let newLineNumber = 0;
  const lines: ParsedDiffLine[] = [];

  for (const rawLine of patch.split(/\r?\n/u)) {
    if (rawLine.startsWith("--- ")) {
      pathA = normalizeDiffPath(rawLine.slice(4));
      continue;
    }
    if (rawLine.startsWith("+++ ")) {
      pathB = normalizeDiffPath(rawLine.slice(4));
      continue;
    }
    if (rawLine.startsWith("@@")) {
      const hunkMatch = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(rawLine);
      oldLineNumber = hunkMatch ? Number(hunkMatch[1]) : oldLineNumber;
      newLineNumber = hunkMatch ? Number(hunkMatch[2]) : newLineNumber;
      lines.push({ kind: "range", text: rawLine });
      continue;
    }
    if (rawLine.startsWith("+")) {
      lines.push({
        kind: "line",
        lineNumber: newLineNumber,
        newLineNumber,
        oldLineNumber: null,
        prefix: "+",
        text: rawLine.slice(1),
        type: "add",
      });
      newLineNumber += 1;
      continue;
    }
    if (rawLine.startsWith("-")) {
      lines.push({
        kind: "line",
        lineNumber: oldLineNumber,
        newLineNumber: null,
        oldLineNumber,
        prefix: "-",
        text: rawLine.slice(1),
        type: "remove",
      });
      oldLineNumber += 1;
      continue;
    }
    if (rawLine.startsWith(" ")) {
      lines.push({
        kind: "line",
        lineNumber: newLineNumber,
        newLineNumber,
        oldLineNumber,
        prefix: " ",
        text: rawLine.slice(1),
        type: "context",
      });
      oldLineNumber += 1;
      newLineNumber += 1;
    }
  }

  return { lines, pathA, pathB };
}

function normalizeDiffPath(input: string) {
  const path = input.trim().split(/\s+/u)[0] ?? "";
  return path.replace(/^[ab]\//u, "");
}

function isNullDiffPath(path: string) {
  return path === "/dev/null" || path === "dev/null";
}

function shortenCommitId(commitId: string) {
  return commitId.length < 7 ? commitId : commitId.slice(0, 7);
}

function compareCommitIds(compare: CodeCompareResponse, revisionRange: string) {
  const [rangeA = "", rangeB = ""] = revisionRange.split("..");
  return {
    commitA: compare.commitA?.commitId || compare.revA || rangeA,
    commitB: compare.commitB?.commitId || compare.revB || rangeB,
  };
}

function projectTo(ownerName: string, projectName: string, ...parts: string[]) {
  return `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`;
}

function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string) {
  const organizationName =
    typeof project.organizationName === "string" ? project.organizationName : "";
  if (organizationName) {
    return organizationName;
  }
  return projectIsProtected(project) ? ownerName : undefined;
}

function projectIsProtected(project: ProjectContainer) {
  return (
    project.isProtected === true ||
    project.isProtected === "true" ||
    project.isProtected === 1 ||
    project.isProtected === "1" ||
    (typeof project.projectScope === "string" && project.projectScope === "protected")
  );
}
