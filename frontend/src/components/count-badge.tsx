export function CountBadge({
  className = "project-menu-count",
  count,
  owner,
}: {
  className?: string;
  count: number;
  owner?: string;
}) {
  return count > 0 ? (
    <span className={className} data-owner={owner}>
      {count}
    </span>
  ) : null;
}
