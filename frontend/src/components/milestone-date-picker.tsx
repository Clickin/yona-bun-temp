import { useEffect, useState } from "react";

const PIKADAY_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const PIKADAY_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function parseLegacyDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
}

function formatLegacyDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function MilestoneDatePicker({
  containerOwner,
  dueDate,
  onSelect,
}: {
  containerOwner?: string;
  dueDate: string;
  onSelect: (value: string) => void;
}) {
  const selectedDate = parseLegacyDate(dueDate);
  const initialDate = selectedDate ?? new Date();
  const [view, setView] = useState({
    month: initialDate.getMonth(),
    year: initialDate.getFullYear(),
  });
  const selectedTimestamp = selectedDate?.getTime();
  useEffect(() => {
    if (selectedTimestamp === undefined) return;
    const date = new Date(selectedTimestamp);
    setView((current) =>
      current.year === date.getFullYear() && current.month === date.getMonth()
        ? current
        : { month: date.getMonth(), year: date.getFullYear() },
    );
  }, [selectedTimestamp]);
  const today = new Date();
  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const years = Array.from({ length: 21 }, (_, index) => view.year - 10 + index);

  function changeMonth(offset: number) {
    setView((current) => {
      const date = new Date(current.year, current.month + offset, 1);
      return { month: date.getMonth(), year: date.getFullYear() };
    });
  }

  return (
    <div id="datepicker" className="date-picker" data-owner={containerOwner}>
      <div className="pika-single">
        <div className="pika-lendar">
          <div className="pika-title">
            <div className="pika-label">
              {PIKADAY_MONTHS[view.month]}
              <select
                className="pika-select pika-select-month"
                value={view.month}
                onChange={(event) =>
                  setView((current) => ({ ...current, month: Number(event.currentTarget.value) }))
                }
              >
                {PIKADAY_MONTHS.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="pika-label">
              {view.year}
              <select
                className="pika-select pika-select-year"
                value={view.year}
                onChange={(event) =>
                  setView((current) => ({ ...current, year: Number(event.currentTarget.value) }))
                }
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button className="pika-prev" type="button" onClick={() => changeMonth(-1)}>
              Previous Month
            </button>
            <button className="pika-next" type="button" onClick={() => changeMonth(1)}>
              Next Month
            </button>
          </div>
          <table cellPadding="0" cellSpacing="0" className="pika-table">
            <thead>
              <tr>
                {PIKADAY_WEEKDAYS.map((weekday) => (
                  <th key={weekday} scope="col">
                    <abbr title={weekday}>{weekday.slice(0, 3)}</abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: cells.length / 7 }, (_, rowIndex) => (
                <tr key={rowIndex}>
                  {cells.slice(rowIndex * 7, rowIndex * 7 + 7).map((day, columnIndex) => {
                    if (day === null) {
                      return <td className="is-empty" key={`empty-${columnIndex}`}></td>;
                    }
                    const isSelected =
                      selectedDate?.getFullYear() === view.year &&
                      selectedDate.getMonth() === view.month &&
                      selectedDate.getDate() === day;
                    const isToday =
                      today.getFullYear() === view.year &&
                      today.getMonth() === view.month &&
                      today.getDate() === day;
                    return (
                      <td
                        className={[isToday ? "is-today" : "", isSelected ? "is-selected" : ""]
                          .filter(Boolean)
                          .join(" ")}
                        data-day={day}
                        key={day}
                      >
                        <button
                          className="pika-button pika-day"
                          type="button"
                          data-pika-year={view.year}
                          data-pika-month={view.month}
                          data-pika-day={day}
                          onClick={() => onSelect(formatLegacyDate(view.year, view.month, day))}
                        >
                          {day}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
