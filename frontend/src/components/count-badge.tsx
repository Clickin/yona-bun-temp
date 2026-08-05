import * as stylex from "@stylexjs/stylex";

export function CountBadge({
  className = "project-menu-count",
  count,
  owner,
  styleX,
}: {
  className?: string;
  count: number;
  owner?: string;
  styleX?: ReadonlyArray<stylex.CompiledStyles>;
}) {
  return count > 0 ? (
    <span
      {...stylex.props(styleX)}
      className={`${stylex.props(styleX).className ?? ""}${className ? ` ${className}` : ""}`.trim()}
      data-stylex-owner={owner}
    >
      {count}
    </span>
  ) : null;
}
