/* oxlint-disable jsx-a11y/role-supports-aria-props -- legacy parity input retains its expanded-state attribute. */
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
// react-doctor-disable-next-line react-doctor/no-flush-sync -- blur handlers read the committed date immediately to preserve legacy Pikaday behavior.
import { createPortal, flushSync } from "react-dom";
import { useLegacyMessages } from "../i18n";
import { MilestoneDatePicker } from "./milestone-date-picker";

export function IssueDueDateInput({
  autoComplete,
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
  defaultValue?: string;
  dueDateRef: RefObject<HTMLInputElement | null>;
  inputId?: string;
  onBlur?: () => void;
  onChange?: (value: string) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  ownerPrefix: string;
  value?: string;
}) {
  const { t } = useLegacyMessages();
  const calendarId = useId();
  const calendarRef = useRef<HTMLDivElement>(null);
  const [localValue, setLocalValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [_position, setPosition] = useState({ left: 0, top: 0 });
  const currentDate = value ?? localValue;

  useLayoutEffect(() => {
    const field = dueDateRef.current;
    const calendar = calendarRef.current;
    if (!open || !field || !calendar) return;
    // Pikaday.adjustPosition: body-owned popup, right/top flip at viewport edges.
    const rect = field.getBoundingClientRect();
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY;
    if (left + calendar.offsetWidth > window.innerWidth) {
      left = left - calendar.offsetWidth + field.offsetWidth;
    }
    if (top + calendar.offsetHeight > window.innerHeight + window.scrollY) {
      top = top - calendar.offsetHeight - field.offsetHeight;
    }
    setPosition({ left, top });
  }, [dueDateRef, open]);

  function handleDueDateBlur(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget;
    if (
      next instanceof Node &&
      (next === dueDateRef.current || calendarRef.current?.contains(next))
    )
      return;
    setOpen(false);
    onBlur?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (open && event.key === "ArrowDown" && event.currentTarget === dueDateRef.current) {
      event.preventDefault();
      const calendar = calendarRef.current;
      const day =
        calendar?.querySelector<HTMLButtonElement>(".is-selected .pika-day") ??
        calendar?.querySelector<HTMLButtonElement>(".pika-day");
      day?.focus();
      return;
    }
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    event.stopPropagation();
    dueDateRef.current?.focus();
    setOpen(false);
  }

  function selectDate(nextValue: string) {
    // Commit React's value before blur-driven detail mutations and quicksearch read it.
    flushSync(() => {
      setLocalValue(nextValue);
      onChange?.(nextValue);
    });
    dueDateRef.current?.focus();
    dueDateRef.current?.blur();
    setOpen(false);
  }

  return (
    <>
      {/* oxlint-disable-next-line jsx-a11y/role-supports-aria-props -- legacy input exposes expanded state alongside the calendar popup. */}
      <input
        ref={dueDateRef}
        type="text"
        id={inputId}
        name="dueDate"
        className="textbox full"
        data-owner={`${ownerPrefix}-due-date-input`}
        value={currentDate}
        autoComplete={autoComplete}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? calendarId : undefined}
        onFocus={(event) => {
          if (!open) onFocus?.(event);
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        onBlur={handleDueDateBlur}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          setLocalValue(event.currentTarget.value);
          onChange?.(event.currentTarget.value);
        }}
      />
      <button
        type="button"
        className="search-btn btn-calendar"
        data-owner={`${ownerPrefix}-due-date-calendar`}
        aria-label={t("issue.dueDate")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? calendarId : undefined}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          dueDateRef.current?.focus();
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      >
        <i className="yobicon-calendar2" />
      </button>
      {open
        ? createPortal(
            <MilestoneDatePicker
              dueDate={currentDate}
              onSelect={selectDate}
              popupProps={{
                id: calendarId,
                ref: calendarRef,
                role: "dialog",
                "aria-label": t("issue.dueDate"),
                onBlur: handleDueDateBlur,
                onChange: () => dueDateRef.current?.focus(),
                onKeyDown: handleKeyDown,
                onMouseDown: (event) => {
                  if (!(event.target instanceof HTMLSelectElement)) event.preventDefault();
                },
              }}
            />,
            document.body,
          )
        : null}
    </>
  );
}
