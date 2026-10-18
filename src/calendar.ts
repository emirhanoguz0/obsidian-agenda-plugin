import { daysBetween } from "./grouping";
import type { AgendaItem } from "./parser";

export interface CalendarDay {
  date: Date;
  isToday: boolean;
  items: AgendaItem[];
}

export const CALENDAR_WEEKS = 4;
export const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Monday of the week containing `date`. */
function startOfWeek(date: Date): Date {
  const sinceMonday = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - sinceMonday);
}

/**
 * Four weeks starting a week before the current one: last week, this week and the next two.
 * Weeks start on Monday. Completed items are skipped unless `showCompleted` is set.
 */
export function buildCalendar(items: AgendaItem[], today: Date, showCompleted: boolean): CalendarDay[][] {
  const start = startOfWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7));
  const days: CalendarDay[] = [];
  for (let i = 0; i < CALENDAR_WEEKS * 7; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({ date, isToday: daysBetween(today, date) === 0, items: [] });
  }

  for (const item of items) {
    if (item.done && !showCompleted) continue;
    const index = daysBetween(start, item.date);
    if (index >= 0 && index < days.length) days[index].items.push(item);
  }

  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < CALENDAR_WEEKS; w++) weeks.push(days.slice(w * 7, w * 7 + 7));
  return weeks;
}
