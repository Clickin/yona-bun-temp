import * as React from "react";

// Dynamic review-progress width via CSS custom property; kept in its own
// component so the pullRequests route source stays free of inline styles
// (ownership-project-pullrequests-action-floats pins routeSource against
// "style=" while ownership-project-pullrequests-list-inline-residual pins
// the live --x-* var on the fill element).
export function ReviewProgressFill({ percent }: { percent: number }) {
  return (
    <div
      className="bar orange"
      data-owner="project-pullrequests-review-progress-fill"
      style={{ "--x-review-progress-width": `${percent}%` } as React.CSSProperties}
    ></div>
  );
}
