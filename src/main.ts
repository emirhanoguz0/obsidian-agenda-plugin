import { Plugin, TAbstractFile, debounce, normalizePath } from "obsidian";
import { splitFormat } from "./dateFormat";
import { AgendaSettingTab, AgendaSettings, createDefaultSettings } from "./settings";
import { AgendaView, VIEW_TYPE_AGENDA } from "./view";

const DAY_CHECK_INTERVAL_MS = 60_000;

export default class AgendaPanelPlugin extends Plugin {
  settings: AgendaSettings = createDefaultSettings();
  private lastRenderedDay = "";

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_AGENDA, (leaf) => new AgendaView(leaf, this));
    this.addRibbonIcon("calendar-days", "Open agenda panel", () => void this.activateView());
    this.addCommand({
      id: "open-agenda-panel",
      name: "Open agenda panel",
      callback: () => void this.activateView(),
    });
    this.addSettingTab(new AgendaSettingTab(this.app, this));

    const refreshIfAgendaFile = (file: TAbstractFile) => {
      if (file.path === normalizePath(this.settings.filePath)) this.refreshViews();
    };
    const debouncedRefresh = debounce(refreshIfAgendaFile, 300, true);
    this.registerEvent(this.app.vault.on("modify", debouncedRefresh));
    this.registerEvent(this.app.vault.on("create", refreshIfAgendaFile));
    this.registerEvent(this.app.vault.on("delete", refreshIfAgendaFile));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (oldPath === normalizePath(this.settings.filePath)) this.refreshViews();
      else refreshIfAgendaFile(file);
    }));

    // "Today", "This week" etc. shift at midnight even if the file is untouched.
    this.lastRenderedDay = new Date().toDateString();
    this.registerInterval(
      window.setInterval(() => {
        const day = new Date().toDateString();
        if (day === this.lastRenderedDay) return;
        this.lastRenderedDay = day;
        this.refreshViews();
      }, DAY_CHECK_INTERVAL_MS),
    );
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_AGENDA)[0];
    if (!leaf) {
      const right = workspace.getRightLeaf(false);
      if (!right) return;
      await right.setViewState({ type: VIEW_TYPE_AGENDA, active: true });
      leaf = right;
    }
    await workspace.revealLeaf(leaf);
  }

  refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_AGENDA)) {
      if (leaf.view instanceof AgendaView) void leaf.view.render();
    }
  }

  async loadSettings(): Promise<void> {
    const settings: AgendaSettings = Object.assign(createDefaultSettings(), await this.loadData());
    const defaults = createDefaultSettings();
    if (!Array.isArray(settings.types)) settings.types = defaults.types;
    if (!splitFormat(settings.dateFormat)) settings.dateFormat = defaults.dateFormat;
    this.settings = settings;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.refreshViews();
  }
}
