/* Shared legacy issue due-date search-bar control: visible text input keeps the
 * submitted `dueDate` value contract (name="dueDate", class "textbox full",
 * no data-toggle) and a hidden native date input powers the calendar button.
 * Native picker value is the raw YYYY-MM-DD format; display formatting is the
 * caller's responsibility via `value` (controlled) or `defaultValue`
 * (uncontrolled, e.g. quicksearch forms that read the DOM on submit).
 * The native input's clip geometry lives in app.css (`.issue-due-date-native-picker`),
 * shared by all screens without per-screen stylex classes. Screens whose
 * search-bar needs route-scoped geometry (issue create form) pass `inputStyle`
 * / `buttonStyle`; the legacy class contract stays byte-identical either way.
 */
import * as stylex from "@stylexjs/stylex";
import { useEffect, useState, type FocusEvent, type RefObject } from "react";
import { useLegacyMessages } from "../i18n";

const NATIVE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export function IssueDueDateInput({
  autoComplete,
  buttonStyle,
  datePickerRef,
  defaultValue,
  dueDateRef,
  inputId,
  inputStyle,
  onBlur,
  onChange,
  onFocus,
  ownerPrefix,
  value,
}: {
  autoComplete?: "off";
  buttonStyle?: stylex.StyleXStyles;
  datePickerRef: RefObject<HTMLInputElement | null>;
  defaultValue?: string;
  dueDateRef: RefObject<HTMLInputElement | null>;
  inputId?: string;
  inputStyle?: stylex.StyleXStyles;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onChange?: (value: string) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  ownerPrefix: string;
  value?: string;
}) {
  const { t } = useLegacyMessages();
  const currentDate = value ?? defaultValue ?? "";
  const [nativeDateValue, setNativeDateValue] = useState(() =>
    NATIVE_DATE_PATTERN.test(currentDate) ? currentDate : "",
  );

  useEffect(() => {
    // Controlled consumers pass `value`; uncontrolled ones (edit form, list
    // quicksearch) rely on defaultValue and never get a `value` prop — skip
    // the sync so the native picker keeps its defaultValue-derived state.
    if (value === undefined) return;
    setNativeDateValue(NATIVE_DATE_PATTERN.test(value ?? "") ? (value ?? "") : "");
  }, [value]);

  const openPicker = () => {
    const picker = datePickerRef.current;
    if (picker) {
      picker.focus();
      try {
        picker.showPicker?.();
      } catch {
        // native picker unavailable — the native input still has focus
      }
      return;
    }
    dueDateRef.current?.focus();
  };

  const handleNativeChange = (nextValue: string) => {
    setNativeDateValue(nextValue);
    if (dueDateRef.current) {
      dueDateRef.current.value = nextValue;
    }
    onChange?.(nextValue);
  };

  return (
    <>
      <input
        ref={dueDateRef}
        type="text"
        id={inputId}
        name="dueDate"
        {...stylex.props(inputStyle)}
        className={`textbox full ${stylex.props(inputStyle).className ?? ""}`.trim()}
        data-stylex-owner={`${ownerPrefix}-due-date-input`}
        value={value}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => onChange?.(event.currentTarget.value)}
      />
      <button
        type="button"
        {...stylex.props(buttonStyle)}
        className={`search-btn btn-calendar ${stylex.props(buttonStyle).className ?? ""}`.trim()}
        data-stylex-owner={`${ownerPrefix}-due-date-calendar`}
        aria-label={t("issue.dueDate")}
        onClick={openPicker}
      >
        <i className="yobicon-calendar2" />
      </button>
      <input
        ref={datePickerRef}
        type="date"
        className="issue-due-date-native-picker"
        data-stylex-owner={`${ownerPrefix}-due-date-native-picker`}
        aria-label={t("milestone.form.dueDate")}
        tabIndex={-1}
        value={nativeDateValue}
        onChange={(event) => handleNativeChange(event.currentTarget.value)}
      />
    </>
  );
}
