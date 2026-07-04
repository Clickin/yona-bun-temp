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

export const Route = createFileRoute("/$ownerName/$projectName/compare/$revisionRange")({
  component: ProjectCodeCompareRoute,
});

function ProjectCodeCompareRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectCodeCompareScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectCodeCompareScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName, revisionRange } = Route.useParams();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const compareQuery = useQuery(
    codeCompareQueryOptions(runtimeConfig, { ownerName, projectName, revisionRange }),
  );

  if (!projectQuery.data || !compareQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="code" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectCodeCompareBody
        compare={compareQuery.data}
        ownerName={ownerName}
        project={projectQuery.data}
        projectName={projectName}
      />
    </>
  );
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
  const commitA = compare.commitA?.commitId || compare.revA;
  const commitB = compare.commitB?.commitId || compare.revB;
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
  const filePath = parsed.pathB || parsed.pathA || file.path;
  const fileId = filePath.replace(/\//g, "-").replace(/\./g, "-");
  const shortA = shortenCommitId(commitA);
  const shortB = shortenCommitId(commitB);

  return (
    <div id={fileId} className="diff-partial-outer">
      <div className="diff-partial-inner">
        <div className="diff-partial-meta">
          <div className="diff-partial-commit">
            <div className="diff-partial-commit-id">
              {commitA && file.path ? (
                <Link
                  target="_blank"
                  title={commitA}
                  to={projectTo(ownerName, projectName, "code", commitA, file.path)}
                >
                  {shortA}
                </Link>
              ) : (
                "\u00a0"
              )}
            </div>
            <div className="diff-partial-commit-id">
              {commitB && file.path ? (
                <Link
                  target="_blank"
                  title={commitB}
                  to={projectTo(ownerName, projectName, "code", commitB, file.path)}
                >
                  {shortB}
                </Link>
              ) : (
                "\u00a0"
              )}
            </div>
          </div>
          <div className="diff-partial-file">
            <span className="filename">{file.path}</span>
          </div>
        </div>
        <div className="diff-partial-code" data-hashcode={file.path}>
          <div className="patch-header">
            {parsed.pathA ? <div className="path">{`--- ${parsed.pathA}`}</div> : null}
            {parsed.pathB ? <div className="path">{`+++ ${parsed.pathB}`}</div> : null}
          </div>
          <table
            className="diff-container show-comments"
            data-commit-a={commitA}
            data-commit-b={commitB}
            data-file-path={filePath}
            data-path-a={parsed.pathA}
            data-path-b={parsed.pathB}
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

function shortenCommitId(commitId: string) {
  return commitId.length < 7 ? commitId : commitId.slice(0, 7);
}

function projectTo(ownerName: string, projectName: string, ...parts: string[]) {
  return `/${[ownerName, projectName, ...parts].filter((part) => part !== "").join("/")}`;
}
