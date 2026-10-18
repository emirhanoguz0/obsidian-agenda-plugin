import { describe, expect, it } from "vitest";
import { buildFormat, formatDate, isValidDateFormat, parseDate, splitFormat } from "../src/dateFormat";
import { buildCalendar } from "../src/calendar";
import { daysBetween, describeDays, groupItems } from "../src/grouping";
import { DEFAULT_TYPES, UNKNOWN_TYPE_COLOR, colorFor } from "../src/types";
import { parseAgenda } from "../src/parser";

const FORMAT = "DD.MM.YYYY";

describe("dateFormat", () => {
  it("validates formats", () => {
    expect(isValidDateFormat("DD.MM.YYYY")).toBe(true);
    expect(isValidDateFormat("YYYY-MM-DD")).toBe(true);
    expect(isValidDateFormat("MM/DD/YYYY")).toBe(true);
    expect(isValidDateFormat("DD.MM")).toBe(false);
    expect(isValidDateFormat("DD.DD.YYYY")).toBe(false);
  });

  it("parses in any token order", () => {
    expect(parseDate("20.10.2026", "DD.MM.YYYY")).toEqual(new Date(2026, 9, 20));
    expect(parseDate("10/20/2026", "MM/DD/YYYY")).toEqual(new Date(2026, 9, 20));
    expect(parseDate("2026-10-20", "YYYY-MM-DD")).toEqual(new Date(2026, 9, 20));
  });

  it("rejects impossible dates", () => {
    expect(parseDate("31.02.2026", FORMAT)).toBeNull();
    expect(parseDate("20.13.2026", FORMAT)).toBeNull();
    expect(parseDate("20-10-2026", FORMAT)).toBeNull();
  });

  it("splits and rebuilds supported formats", () => {
    expect(splitFormat("MM/DD/YYYY")).toEqual({ order: ["MM", "DD", "YYYY"], separator: "/" });
    expect(splitFormat("DD MM YYYY")).toBeNull();
    expect(buildFormat(["YYYY", "MM", "DD"], "-")).toBe("YYYY-MM-DD");
  });

  it("formats dates", () => {
    expect(formatDate(new Date(2026, 0, 5), "DD.MM.YYYY")).toBe("05.01.2026");
    expect(formatDate(new Date(2026, 0, 5), "MM/DD/YYYY")).toBe("01/05/2026");
  });
});

describe("parseAgenda", () => {
  const content = [
    "# Agenda",
    "",
    "- 📅 20.10.2026 | task | Exams | [[Threads]]",
    "- 📅 31.10.2026 | event | Contest ends | [[note|alias]]",
    "- ✅ 📅 01.10.2026 | task | Done thing | [[Old]]",
    "✅ - 📅 02.10.2026 | task | Also done",
    "- 📅 99.99.2026 | task | Bad date | [[X]]",
    "- just a note",
  ].join("\n");

  const items = parseAgenda(content, FORMAT);

  it("reads valid lines and skips the rest", () => {
    expect(items.map((i) => i.title)).toEqual(["Exams", "Contest ends", "Done thing", "Also done"]);
  });

  it("extracts type, link, line and done flag", () => {
    expect(items[0]).toMatchObject({ type: "task", link: "Threads", done: false, line: 2 });
    expect(items[1].link).toBe("note");
    expect(items[2].done).toBe(true);
    expect(items[3]).toMatchObject({ done: true, link: null });
  });

  it("follows a custom date format", () => {
    const parsed = parseAgenda("- 📅 2026-10-20 | task | Iso | [[A]]", "YYYY-MM-DD");
    expect(parsed).toHaveLength(1);
    expect(parsed[0].date).toEqual(new Date(2026, 9, 20));
  });

  it("handles CRLF line endings", () => {
    expect(parseAgenda("- 📅 20.10.2026 | task | A | [[B]]\r\n", FORMAT)).toHaveLength(1);
  });
});

describe("types", () => {
  it("matches names case-insensitively and falls back to gray", () => {
    expect(colorFor(DEFAULT_TYPES, "TASK")).toBe("#4c8bf5");
    expect(colorFor(DEFAULT_TYPES, "görev")).toBe(UNKNOWN_TYPE_COLOR);
    expect(colorFor([{ name: "Görev", color: "#111111" }], "görev")).toBe("#111111");
  });
});

describe("buildCalendar", () => {
  // 18.10.2026 is a Sunday: its week starts 12.10, so the grid starts 05.10 and ends 01.11.
  const today = new Date(2026, 9, 18);
  const item = (date: Date, done = false) => ({ date, type: "task", title: "t", link: null, done, line: 0 });

  it("covers last week, this week and the next two, Monday first", () => {
    const weeks = buildCalendar([], today, false);
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].date).toEqual(new Date(2026, 9, 5));
    expect(weeks[3][6].date).toEqual(new Date(2026, 10, 1));
    expect(weeks[1][6].isToday).toBe(true);
  });

  it("places items on their day and ignores those outside the range", () => {
    const weeks = buildCalendar([item(new Date(2026, 9, 20)), item(new Date(2026, 9, 4)), item(new Date(2026, 10, 2))], today, false);
    expect(weeks[2][1].items).toHaveLength(1);
    expect(weeks.flat().reduce((n, d) => n + d.items.length, 0)).toBe(1);
  });

  it("skips completed items unless asked", () => {
    const done = item(new Date(2026, 9, 20), true);
    expect(buildCalendar([done], today, false)[2][1].items).toHaveLength(0);
    expect(buildCalendar([done], today, true)[2][1].items).toHaveLength(1);
  });
});

describe("grouping", () => {
  const today = new Date(2026, 9, 18);
  const at = (day: number, month = 10) => new Date(2026, month - 1, day);
  const item = (date: Date, title: string, done = false) => ({
    date, type: "task", title, link: null, done, line: 0,
  });

  it("counts calendar days across DST changes", () => {
    expect(daysBetween(new Date(2026, 2, 28), new Date(2026, 2, 30))).toBe(2);
    expect(daysBetween(new Date(2026, 9, 24), new Date(2026, 9, 26))).toBe(2);
  });

  it("buckets items and orders them", () => {
    const groups = groupItems(
      [item(at(31), "far"), item(at(10), "old"), item(at(18), "now"), item(at(20), "soon"), item(at(25), "edge"), item(at(26), "later"), item(at(12), "older")],
      today,
      true,
    );
    expect(groups.map((g) => g.id)).toEqual(["today", "week", "upcoming", "past"]);
    expect(groups[1].items.map((i) => i.title)).toEqual(["soon", "edge"]);
    expect(groups[2].items.map((i) => i.title)).toEqual(["later", "far"]);
    expect(groups[3].items.map((i) => i.title)).toEqual(["older", "old"]);
  });

  it("hides completed items unless asked", () => {
    const items = [item(at(18), "open"), item(at(18), "finished", true)];
    expect(groupItems(items, today, false)[0].items).toHaveLength(1);
    expect(groupItems(items, today, true)[0].items).toHaveLength(2);
  });

  it("omits empty groups", () => {
    expect(groupItems([], today, false)).toEqual([]);
  });

  it("describes day distances", () => {
    expect(describeDays(0)).toBe("Today");
    expect(describeDays(1)).toBe("Tomorrow");
    expect(describeDays(5)).toBe("in 5 days");
    expect(describeDays(-1)).toBe("Yesterday");
    expect(describeDays(-3)).toBe("3 days ago");
  });
});
