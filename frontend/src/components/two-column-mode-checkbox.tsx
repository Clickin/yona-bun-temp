/* Shared legacy two-column-mode toggle. Formerly duplicated in the
 * user-profile ($user.tsx), project-board (posts.tsx) and organization-board
 * (boards.tsx) routes; each screen's rendered DOM contract (anchor div, label,
 * border, checkbox, text span, hover popover) stays byte-identical, with the
 * per-screen differences (route-local stylex styles and data-stylex-owner
 * markers) arriving as props. Behavior is shared: localStorage-backed checked
 * state and a 100ms-delayed hover popover.
 */
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { useLegacyMessages } from "../i18n";

export function TwoColumnModeCheckbox({
  anchorStyle,
  borderHoverStyle,
  borderStyle,
  inputStyle,
  labelStyle,
  popoverStyle,
  textHoverStyle,
  textStyle,
  anchorOwner,
  borderOwner,
  inputOwner,
  labelOwner,
  popoverOwner,
  textOwner,
  wrapPopoverContentInP = false,
}: {
  anchorStyle?: stylex.StyleXArray<stylex.CompiledStyles>;
  borderHoverStyle?: stylex.StyleXArray<stylex.CompiledStyles>;
  borderStyle?: stylex.StyleXArray<stylex.CompiledStyles>;
  inputStyle?: stylex.StyleXArray<stylex.CompiledStyles>;
  labelStyle?: stylex.StyleXArray<stylex.CompiledStyles>;
  popoverStyle?: stylex.StyleXArray<stylex.CompiledStyles>;
  textHoverStyle?: stylex.StyleXArray<stylex.CompiledStyles>;
  textStyle?: stylex.StyleXArray<stylex.CompiledStyles>;
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
  const [isChecked, setIsChecked] = useState(
    () =>
      typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true",
  );
  const [isControlHovered, setIsControlHovered] = useState(false);
  const hasHoverHighlight = borderHoverStyle != null || textHoverStyle != null;
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

  const anchorProps = stylex.props(anchorStyle);
  const labelProps = stylex.props(labelStyle);
  const borderProps = stylex.props(borderStyle, isControlHovered ? borderHoverStyle : null);
  const inputProps = stylex.props(inputStyle);
  const textProps = stylex.props(textStyle, isControlHovered ? textHoverStyle : null);
  const popoverProps = stylex.props(popoverStyle);

  return (
    <div
      {...anchorProps}
      className={`${anchorProps.className ?? ""} two-column-icon mr10 hide-in-mobile`.trim()}
      id="two-column-mode-checkbox"
      title={t("common.two.column.mode")}
      data-stylex-owner={anchorOwner}
      onBlur={hideDelayedPopover}
      onFocus={showDelayedPopover}
      onMouseEnter={showDelayedPopover}
      onMouseLeave={hideDelayedPopover}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template wraps the checkbox this way. */}
      <label
        {...labelProps}
        className={`${labelProps.className ?? ""} checkbox`.trim()}
        data-stylex-owner={labelOwner}
      >
        <div
          {...borderProps}
          className={`two-column-icon-border ${borderProps.className ?? ""}`.trim()}
          data-stylex-owner={borderOwner}
          onMouseEnter={hasHoverHighlight ? () => setIsControlHovered(true) : undefined}
          onMouseLeave={hasHoverHighlight ? () => setIsControlHovered(false) : undefined}
        >
          <input
            id="two-column-mode"
            type="checkbox"
            checked={isChecked}
            {...inputProps}
            data-stylex-owner={inputOwner}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              localStorage.setItem("useTwoColumnMode", String(checked));
              storeTwoColumnMode(checked);
            }}
          />
          <span
            {...textProps}
            className={`two-column-mode-text ${textProps.className ?? ""}`.trim()}
            data-stylex-owner={textOwner}
          >
            {t("common.two.column.view")}
          </span>
        </div>
      </label>
      {showPopover ? (
        <div
          {...popoverProps}
          className={`${popoverProps.className ?? ""} popover top`.trim()}
          role="tooltip"
          data-stylex-owner={popoverOwner}
        >
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
