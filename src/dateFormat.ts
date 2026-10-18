export const DEFAULT_DATE_FORMAT = "DD.MM.YYYY";

const TOKENS = ["YYYY", "MM", "DD"] as const;
const TOKEN_PATTERN = /YYYY|MM|DD/g;

const TOKEN_REGEX: Record<(typeof TOKENS)[number], string> = {
  YYYY: "(\\d{4})",
  MM: "(\\d{1,2})",
  DD: "(\\d{1,2})",
};

export type DateToken = (typeof TOKENS)[number];

export const SEPARATORS = [".", "/", "-"] as const;

export const DATE_ORDERS: DateToken[][] = [
  ["DD", "MM", "YYYY"],
  ["MM", "DD", "YYYY"],
  ["YYYY", "MM", "DD"],
  ["YYYY", "DD", "MM"],
  ["DD", "YYYY", "MM"],
  ["MM", "YYYY", "DD"],
];

export function buildFormat(order: DateToken[], separator: string): string {
  return order.join(separator);
}

/** Splits a format made of one of DATE_ORDERS joined by one of SEPARATORS; null for anything else. */
export function splitFormat(format: string): { order: DateToken[]; separator: string } | null {
  for (const separator of SEPARATORS) {
    const order = DATE_ORDERS.find((o) => buildFormat(o, separator) === format);
    if (order) return { order, separator };
  }
  return null;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
}

/** A usable format contains DD, MM and YYYY exactly once each, in any order, with any separators. */
export function isValidDateFormat(format: string): boolean {
  const found = format.match(TOKEN_PATTERN) ?? [];
  return found.length === 3 && new Set(found).size === 3;
}

/** Builds a regex source that matches a date in `format` and captures its parts in token order. */
export function dateRegexSource(format: string): string {
  let source = "";
  let last = 0;
  for (const match of format.matchAll(TOKEN_PATTERN)) {
    source += escapeRegex(format.slice(last, match.index));
    source += TOKEN_REGEX[match[0] as (typeof TOKENS)[number]];
    last = match.index! + match[0].length;
  }
  return source + escapeRegex(format.slice(last));
}

/** Parses `text` as a local calendar date using `format`; returns null if it does not match or is not a real date. */
export function parseDate(text: string, format: string): Date | null {
  if (!isValidDateFormat(format)) return null;
  const match = new RegExp(`^${dateRegexSource(format)}$`).exec(text.trim());
  if (!match) return null;

  const order = format.match(TOKEN_PATTERN) as string[];
  const parts: Record<string, number> = {};
  order.forEach((token, i) => (parts[token] = Number(match[i + 1])));

  const date = new Date(parts.YYYY, parts.MM - 1, parts.DD);
  const real =
    date.getFullYear() === parts.YYYY &&
    date.getMonth() === parts.MM - 1 &&
    date.getDate() === parts.DD;
  return real ? date : null;
}

export function formatDate(date: Date, format: string): string {
  const pad = (n: number, width: number) => String(n).padStart(width, "0");
  return format.replace(TOKEN_PATTERN, (token) => {
    if (token === "YYYY") return pad(date.getFullYear(), 4);
    if (token === "MM") return pad(date.getMonth() + 1, 2);
    return pad(date.getDate(), 2);
  });
}
