import { dateRegexSource, parseDate } from "./dateFormat";

export interface AgendaItem {
  date: Date;
  /** Raw type label from the file, e.g. "task" or "event". */
  type: string;
  title: string;
  /** Link target of the source note (without brackets), or null if the line has none. */
  link: string | null;
  done: boolean;
  /** 0-based line number in the agenda file. */
  line: number;
}

const DONE = "✅\\uFE0F?";
const CALENDAR = "📅\\uFE0F?";

/**
 * Parses lines of the form `- 📅 <date> | type | title | [[source note]]`.
 * A leading ✅ (before or after the list marker) marks the item as completed.
 * Lines that do not match are ignored.
 */
export function parseAgenda(content: string, dateFormat: string): AgendaItem[] {
  const pattern = new RegExp(
    `^\\s*(${DONE}\\s*)?[-*]\\s+(${DONE}\\s*)?${CALENDAR}\\s*(${dateRegexSource(dateFormat)})` +
      `\\s*\\|\\s*([^|]*?)\\s*\\|\\s*([^|]+?)\\s*(?:\\|\\s*(.*?))?\\s*$`,
  );
  const dateGroup = 3;
  const typeGroup = dateGroup + (dateFormat.match(/YYYY|MM|DD/g)?.length ?? 0) + 1;

  const items: AgendaItem[] = [];
  content.split(/\r?\n/).forEach((text, line) => {
    const match = pattern.exec(text);
    if (!match) return;

    const date = parseDate(match[dateGroup], dateFormat);
    if (!date) return;

    items.push({
      date,
      type: match[typeGroup].toLowerCase(),
      title: match[typeGroup + 1],
      link: extractLink(match[typeGroup + 2]),
      done: Boolean(match[1] || match[2]),
      line,
    });
  });
  return items;
}

function extractLink(field: string | undefined): string | null {
  if (!field) return null;
  const inner = /\[\[([^\]]+?)\]\]/.exec(field)?.[1];
  if (!inner) return null;
  const target = inner.split("|")[0].trim();
  return target || null;
}
