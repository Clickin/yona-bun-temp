/* Shared legacy issue due-date search-bar control: visible text input keeps the
 * submitted `dueDate` value contract (name="dueDate", class "textbox full",
 * no data-toggle) and a hidden native date input powers the calendar button.
 * Native picker value is the raw YYYY-MM-DD format; display formatting is the
 * caller's responsibility via `value` (controlled) or `defaultValue`
 * (uncontrolled, e.g. quicksearch forms that read the DOM on submit).
 * The native input's clip geometry lives in app.css (`.issue-due-date-native-picker`),
 * shared by all screens without per-screen style classes. Screens whose
 * search-bar needs route-scoped geometry (issue create form) own that paint
 * in their slice css keyed by the data-owner values emitted here.
 */
import { useEffect, useState, type FocusEvent, type RefObject } from "react";
import { useLegacyMessages } from "../i18n";

const NATIVE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export function IssueDueDateInput({
  autoComplete,
  datePickerRef,
  defaultValue,
  dueDateRef,
  inputId,
  onBlur,
  onChange,
  onFocus,
  ownerPrefix,
  value,
}: {
  autoComplete?: "off";
  datePickerRef: RefObject<HTMLInputElement | null>;
  defaultValue?: string;
  dueDateRef: RefObject<HTMLInputElement | null>;
  inputId?: string;
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
    // Legacy pikaday keeps the visible text input focused when the calendar
    // opens; mirror that instead of focusing the hidden native picker.
    dueDateRef.current?.focus();
    const picker = datePickerRef.current;
    if (picker) {
      try {
        picker.showPicker?.();
      } catch {
        // native picker unavailable — the visible input still has focus
      }
    }
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
        className="textbox full"
        data-owner={`${ownerPrefix}-due-date-input`}
        value={value}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => onChange?.(event.currentTarget.value)}
      />
      <button
        type="button"
        className="search-btn btn-calendar"
        data-owner={`${ownerPrefix}-due-date-calendar`}
        aria-label={t("issue.dueDate")}
        onClick={openPicker}
      >
        <i className="yobicon-calendar2" />
      </button>
      <input
        ref={datePickerRef}
        type="date"
        className="issue-due-date-native-picker"
        data-owner={`${ownerPrefix}-due-date-native-picker`}
        aria-label={t("milestone.form.dueDate")}
        tabIndex={-1}
        value={nativeDateValue}
        onChange={(event) => handleNativeChange(event.currentTarget.value)}
      />
    </>
  );
}
