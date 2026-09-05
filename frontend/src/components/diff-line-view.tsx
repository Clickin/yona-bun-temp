/* Shared diff table line row. Formerly duplicated across the commit-detail,
 * pull-request-changes and code-compare routes; the rendered DOM contract
 * (tr classes/data attributes, linenum cells, comment icon, code cell with
 * `diff-partial-codeline` pre) stays byte-identical, with the per-screen
 * differences (route-local style styles, data-owner markers, the
 * optional `data-line-key` attribute) arriving as props.
 */
import type { MarkdownEditorStyleProps } from "./markdown-editor";

export type ParsedDiffLine =
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

export type DiffLineViewProps = {
  line: Extract<ParsedDiffLine, { kind: "line" }>;
  /** Optional `data-line-key` attribute (pull-request-changes only). */
  dataLineKey?: string;
  styles?: {
    lineNumber?: MarkdownEditorStyleProps;
    commentIcon?: MarkdownEditorStyleProps;
    numberMarker?: MarkdownEditorStyleProps;
    codeCell?: MarkdownEditorStyleProps;
    codeLine?: MarkdownEditorStyleProps;
  };
  owners?: {
    lineNumberCell?: string;
    commentIcon?: string;
    lineNumber?: string;
    codeCell?: string;
    codeLine?: string;
  };
};

// ponytail: stable empty-object defaults so destructuring never allocates per render.
const NO_STYLES = {};
const NO_OWNERS = {};

export function DiffLineView({
  line,
  dataLineKey,
  styles = NO_STYLES,
  owners = NO_OWNERS,
}: DiffLineViewProps) {
  const oldLine = line.oldLineNumber === null ? "" : String(line.oldLineNumber);
  const newLine = line.newLineNumber === null ? "" : String(line.newLineNumber);

  return (
    <tr
      className={line.type}
      data-line={line.lineNumber}
      data-line-key={dataLineKey}
      data-side={line.type === "remove" ? "A" : "B"}
      data-type={line.type}
    >
      <td
        {...styles.lineNumber}
        data-owner={owners.lineNumberCell}
        className={`${styles.lineNumber?.className ?? ""} linenum`.trim()}
      >
        <i
          {...styles.commentIcon}
          data-owner={owners.commentIcon}
          className={`${styles.commentIcon?.className ?? ""} yobicon-comments`.trim()}
        ></i>
        <div
          {...styles.numberMarker}
          data-owner={owners.lineNumber}
          className={`${styles.numberMarker?.className ?? ""} line-number`.trim()}
          data-line-num={oldLine}
        ></div>
        <span className="hidden">{oldLine}</span>
      </td>
      <td
        {...styles.lineNumber}
        data-owner={owners.lineNumberCell}
        className={`${styles.lineNumber?.className ?? ""} linenum`.trim()}
      >
        <div
          {...styles.numberMarker}
          data-owner={owners.lineNumber}
          className={`${styles.numberMarker?.className ?? ""} line-number`.trim()}
          data-line-num={newLine}
        ></div>
        <span className="hidden">{newLine}</span>
      </td>
      <td
        {...styles.codeCell}
        data-owner={owners.codeCell}
        className={`${styles.codeCell?.className ?? ""} code`.trim()}
      >
        <pre
          {...styles.codeLine}
          data-owner={owners.codeLine}
          className={`${styles.codeLine?.className ?? ""} diff-partial-codeline`.trim()}
        >
          {`${line.prefix}${line.text}`}
        </pre>
      </td>
    </tr>
  );
}
