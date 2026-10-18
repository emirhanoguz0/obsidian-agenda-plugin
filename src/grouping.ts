import type { AgendaItem } from "./parser";

export type GroupId = "past" | "today" | "week" | "upcoming";

export interface AgendaGroup {
  id: GroupId;
  label: string;
  items: AgendaItem[];
}

const MS_PER_DAY = 86_400_000;
const WEEK_DAYS = 7;

/** Whole calendar days from `from` to `to`; negative if `to` is earlier. Immune to DST shifts. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

export function describeDays(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/**
 * Splits items into Today / This week (next 7 days) / Upcoming / Past.
 * Empty groups are left out. Completed items are dropped unless `showCompleted` is set.
 */
export function groupItems(items: AgendaItem[], today: Date, showCompleted: boolean): AgendaGroup[] {
  const buckets: Record<GroupId, AgendaItem[]> = { today: [], week: [], upcoming: [], past: [] };

  for (const item of items) {
    if (item.done && !showCompleted) continue;
    const days = daysBetween(today, item.date);
    if (days < 0) buckets.past.push(item);
    else if (days === 0) buckets.today.push(item);
    else if (days <= WEEK_DAYS) buckets.week.push(item);
    else buckets.upcoming.push(item);
  }

  const byDate = (a: AgendaItem, b: AgendaItem) => a.date.getTime() - b.date.getTime() || a.line - b.line;
  buckets.today.sort(byDate);
  buckets.week.sort(byDate);
  buckets.upcoming.sort(byDate);
  buckets.past.sort((a, b) => byDate(b, a));

  const labels: [GroupId, string][] = [
    ["today", "Today"],
    ["week", "This week"],
    ["upcoming", "Upcoming"],
    ["past", "Past"],
  ];
  return labels
    .filter(([id]) => buckets[id].length > 0)
    .map(([id, label]) => ({ id, label, items: buckets[id] }));
}
