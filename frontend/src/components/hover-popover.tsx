/* Shared hover popover (legacy bootstrap popover contract). The legacy
 * checkboxes (`twoColumnModeCheckboxArea.scala.html`,
 * `showSubtasksCheckbox.scala.html`) open a bootstrap popover on hover/focus
 * with `data-toggle="popover" data-trigger="hover" data-placement="top"` and
 * a 100ms show/hide delay. React owns the behavior; the rendered DOM keeps
 * the bootstrap `popover fade top in` shell (arrow + title + content) so the
 * frozen bootstrap.css paints it identically. The anchor wrapper is part of
 * this component so the popover stays a child of the anchor (legacy appends
 * to body, but the anchor-child variant is the app's existing render).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

export function HoverPopover({
  anchorClassName,
  anchorId,
  anchorOwner,
  children,
  content,
  popoverClassName,
  title,
}: {
  anchorClassName: string;
  anchorId: string;
  anchorOwner: string;
  children: ReactNode;
  content: string;
  popoverClassName: string;
  title: string;
}) {
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const popoverTimer = useRef<number | null>(null);
  const clearPopoverTimer = () => {
    if (popoverTimer.current !== null) {
      window.clearTimeout(popoverTimer.current);
      popoverTimer.current = null;
    }
  };
  const showPopover = () => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(true);
      popoverTimer.current = null;
    }, 100);
  };
  const hidePopover = () => {
    clearPopoverTimer();
    popoverTimer.current = window.setTimeout(() => {
      setIsPopoverVisible(false);
      popoverTimer.current = null;
    }, 100);
  };

  useEffect(() => clearPopoverTimer, []);

  return (
    <div
      className={anchorClassName}
      id={anchorId}
      title={title}
      data-owner={anchorOwner}
      onBlur={hidePopover}
      onFocus={showPopover}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
    >
      {children}
      {isPopoverVisible ? (
        <div className={`popover fade top in ${popoverClassName}`} role="tooltip">
          <div className="arrow" />
          <h3 className="popover-title">{title}</h3>
          <div className="popover-content">{content}</div>
        </div>
      ) : null}
    </div>
  );
}
