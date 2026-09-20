import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { codeCompareQueryOptions, type CodeCompareResponse } from "../../../../api/code-compare";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import type { ProjectContainer } from "../../../../api/types";
import { DiffLineView, type ParsedDiffLine } from "../../../../components/diff-line-view";
import { useLegacyMessages } from "../../../../i18n";
import { type RuntimeConfig } from "../../../../runtime-config";

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
  return <ProjectCodeCompareRouteShell runtimeConfig={runtimeConfig} />;
}

function ProjectCodeCompareRouteShell({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, revisionRange } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  return (
    <ProjectCodeCompareScreen
      project={projectQuery.data}
      revisionRange={revisionRange}
      runtimeConfig={runtimeConfig}
    />
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
    <div className="project-page-wrap" data-owner="project-compare-page">
      <div className="code-browse-wrap" data-owner="project-compare-browse">
        <p className="commitInfo" data-owner="project-compare-commit-info">
          <strong className="commitId">
            @{commitA}..{commitB}
          </strong>
        </p>

        {isSvn && compare.patch ? (
          <div className="diff-wrap" data-owner="project-compare-diff-wrap">
            <div className="diff-body hide" data-commit-origin="true" id="commit">
              {compare.patch}
            </div>
          </div>
        ) : compare.files.length === 0 ? (
          <div className="alert" data-owner="project-compare-empty">
            {t("code.noChanges")}
          </div>
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
