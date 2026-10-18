import { ItemView, TFile, WorkspaceLeaf, normalizePath } from "obsidian";
import { CalendarDay, WEEKDAY_LABELS, buildCalendar } from "./calendar";
import { formatDate } from "./dateFormat";
import { describeDays, daysBetween, groupItems } from "./grouping";
import { AgendaItem, parseAgenda } from "./parser";
import { AgendaType, colorFor, findType } from "./types";
import type AgendaPanelPlugin from "./main";

export const VIEW_TYPE_AGENDA = "agenda-panel-view";

const MAX_DOTS_PER_DAY = 3;

export class AgendaView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private plugin: AgendaPanelPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_AGENDA;
  }

  getDisplayText(): string {
    return "Agenda";
  }

  getIcon(): string {
    return "calendar-days";
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async render(): Promise<void> {
    const { settings } = this.plugin;
    const root = this.contentEl;
    root.empty();
    root.addClass("agenda-panel");

    const file = this.app.vault.getAbstractFileByPath(normalizePath(settings.filePath));
    if (!(file instanceof TFile)) {
      root.createDiv({ cls: "agenda-empty", text: `Agenda file not found: ${settings.filePath}` });
      return;
    }

    const items = parseAgenda(await this.app.vault.cachedRead(file), settings.dateFormat);
    const today = new Date();

    this.renderCalendar(root, buildCalendar(items, today, settings.showCompleted));

    const groups = groupItems(items, today, settings.showCompleted);
    if (groups.length === 0) {
      root.createDiv({ cls: "agenda-empty", text: "No agenda items." });
      return;
    }

    for (const group of groups) {
      const section = root.createDiv({ cls: `agenda-group agenda-group-${group.id}` });
      section.createDiv({ cls: "agenda-group-title", text: group.label });
      for (const item of group.items) this.renderItem(section, item, file, today);
    }
  }

  private renderCalendar(root: HTMLElement, weeks: CalendarDay[][]): void {
    const { types } = this.plugin.settings;
    const calendar = root.createDiv({ cls: "agenda-calendar" });

    const header = calendar.createDiv({ cls: "agenda-cal-row agenda-cal-header" });
    for (const label of WEEKDAY_LABELS) header.createDiv({ cls: "agenda-cal-weekday", text: label });

    for (const week of weeks) {
      const row = calendar.createDiv({ cls: "agenda-cal-row" });
      for (const day of week) {
        const cell = row.createDiv({ cls: "agenda-cal-day" });
        if (day.isToday) cell.addClass("is-today");
        cell.createSpan({ cls: "agenda-cal-number", text: String(day.date.getDate()) });

        if (day.items.length === 0) continue;
        cell.setAttr("aria-label", day.items.map((i) => i.title).join("\n"));
        const dots = cell.createDiv({ cls: "agenda-cal-dots" });
        for (const type of distinctTypes(day.items).slice(0, MAX_DOTS_PER_DAY)) {
          dots.createSpan({ cls: "agenda-dot" }).style.setProperty("--agenda-color", colorFor(types, type));
        }
      }
    }
  }

  private renderItem(section: HTMLElement, item: AgendaItem, file: TFile, today: Date): void {
    const { settings } = this.plugin;
    const row = section.createDiv({ cls: "agenda-item" });
    if (item.done) row.addClass("is-done");

    const main = row.createDiv({ cls: "agenda-item-main" });
    main.createSpan({ cls: "agenda-item-title", text: item.title });
    if (item.type) {
      const badge = main.createSpan({ cls: "agenda-item-type" });
      badge.createSpan({ cls: "agenda-dot" }).style.setProperty("--agenda-color", colorFor(settings.types, item.type));
      badge.createSpan({ text: typeLabel(settings.types, item.type) });
    }

    const meta = row.createDiv({ cls: "agenda-item-meta" });
    meta.createSpan({ text: formatDate(item.date, settings.dateFormat) });
    meta.createSpan({ cls: "agenda-item-remaining", text: describeDays(daysBetween(today, item.date)) });

    if (item.link) {
      const target = item.link;
      row.addClass("is-clickable");
      row.setAttr("aria-label", `Open ${target}`);
      row.addEventListener("click", () => {
        void this.app.workspace.openLinkText(target, file.path, false);
      });
    }
  }
}

function distinctTypes(items: AgendaItem[]): string[] {
  return [...new Set(items.map((i) => i.type))];
}

function typeLabel(types: AgendaType[], type: string): string {
  return findType(types, type)?.name ?? type;
}
