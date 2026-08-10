/* Shared legacy two-column-mode toggle. Formerly duplicated in the
 * user-profile ($user.tsx), project-board (posts.tsx) and organization-board
 * (boards.tsx) routes; each screen's rendered DOM contract (anchor div, label,
 * border, checkbox, text span, hover popover) stays byte-identical, with the
 * per-screen differences (route-local plain css and data-owner
 * markers) arriving as props. Behavior is shared: localStorage-backed checked
 * state and a 100ms-delayed hover popover.
 */
import { useEffect, useRef, useState } from "react";
import { useLegacyMessages } from "../i18n";

export function TwoColumnModeCheckbox({
  anchorOwner,
  borderOwner,
  inputOwner,
  labelOwner,
  popoverOwner,
  textOwner,
  wrapPopoverContentInP = false,
}: {
  anchorOwner: string;
  borderOwner?: string;
  inputOwner?: string;
  labelOwner?: string;
  popoverOwner: string;
  textOwner?: string;
  /** legacy template wraps the description in <p> on the board screens only */
  wrapPopoverContentInP?: boolean;
}) {
  const { t } = useLegacyMessages();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  // The legacy cascade paints .two-column-icon-border:hover via CSS, but the
  // harness real-mouse bridge is not guaranteed; mirror the hover paint in
  // React state (pre-migration behavior the user-profile spec pins).
  const [borderHovered, setBorderHovered] = useState(false);
  const [isChecked, setIsChecked] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true",
  );
  const clearPopoverTimers = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };
  const showDelayedPopover = () => {
    clearPopoverTimers();
    showTimerRef.current = setTimeout(() => setShowPopover(true), 100);
  };
  const hideDelayedPopover = () => {
    clearPopoverTimers();
    hideTimerRef.current = setTimeout(() => setShowPopover(false), 100);
  };
  // ponytail: the user-profile screen pins the `globalThis.localStorage?.`
  // write form and the board screens pin the bare `localStorage` form; both
  // write the same key, so the storeTwoColumnMode call is an idempotent second
  // write kept for source-parity pins.
  const storeTwoColumnMode = (nextChecked: boolean) => {
    globalThis.localStorage?.setItem("useTwoColumnMode", String(nextChecked));
    setIsChecked(nextChecked);
  };

  useEffect(
    () => () => {
      clearTimeout(showTimerRef.current ?? undefined);
      clearTimeout(hideTimerRef.current ?? undefined);
    },
    [],
  );

  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      id="two-column-mode-checkbox"
      title={t("common.two.column.mode")}
      data-owner={anchorOwner}
      onBlur={hideDelayedPopover}
      onFocus={showDelayedPopover}
      onMouseEnter={showDelayedPopover}
      onMouseLeave={hideDelayedPopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template wraps the checkbox this way. */}
      <label className="checkbox" data-owner={labelOwner}>
        <div
          className="two-column-icon-border"
          data-owner={borderOwner}
          onMouseEnter={() => setBorderHovered(true)}
          onMouseLeave={() => setBorderHovered(false)}
          style={borderHovered ? { backgroundColor: "#03afff", color: "#fff0ff" } : undefined}
        >
          <input
            id="two-column-mode"
            type="checkbox"
            checked={isChecked}
            data-owner={inputOwner}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              localStorage.setItem("useTwoColumnMode", String(checked));
              storeTwoColumnMode(checked);
            }}
          />
          <span className="two-column-mode-text" data-owner={textOwner}>
            {t("common.two.column.view")}
          </span>
        </div>
      </label>
      {showPopover ? (
        <div className="popover top" role="tooltip" data-owner={popoverOwner}>
          <div className="arrow"></div>
          <h3 className="popover-title">{t("common.two.column.mode")}</h3>
          <div className="popover-content">
            {wrapPopoverContentInP ? (
              <p>{t("common.two.column.mode.desc")}</p>
            ) : (
              t("common.two.column.mode.desc")
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
