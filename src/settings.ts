import { App, PluginSettingTab, Setting } from "obsidian";
import { DATE_ORDERS, DEFAULT_DATE_FORMAT, DateToken, SEPARATORS, buildFormat, formatDate, splitFormat } from "./dateFormat";
import type AgendaPanelPlugin from "./main";
import { AgendaType, DEFAULT_TYPES, NEW_TYPE_COLORS, cloneTypes } from "./types";

export interface AgendaSettings {
  filePath: string;
  dateFormat: string;
  showCompleted: boolean;
  types: AgendaType[];
}

export function createDefaultSettings(): AgendaSettings {
  return {
    filePath: "Agenda.md",
    dateFormat: DEFAULT_DATE_FORMAT,
    showCompleted: false,
    types: cloneTypes(DEFAULT_TYPES),
  };
}

export class AgendaSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: AgendaPanelPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const defaults = createDefaultSettings();

    new Setting(containerEl)
      .setName("Agenda file")
      .setDesc("Path of the Markdown file that holds your agenda lines, relative to the vault root.")
      .addText((text) =>
        text
          .setPlaceholder(defaults.filePath)
          .setValue(this.plugin.settings.filePath)
          .onChange(async (value) => {
            this.plugin.settings.filePath = value.trim() || defaults.filePath;
            await this.plugin.saveSettings();
          }),
      );

    const current = splitFormat(this.plugin.settings.dateFormat) ?? splitFormat(defaults.dateFormat)!;

    new Setting(containerEl)
      .setName("Date separator")
      .setDesc("Pick this first: the character between day, month and year.")
      .addDropdown((dropdown) => {
        for (const separator of SEPARATORS) dropdown.addOption(separator, separator);
        dropdown.setValue(current.separator).onChange(async (separator) => {
          this.plugin.settings.dateFormat = buildFormat(current.order, separator);
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("Date order")
      .setDesc(
        `Dates in your agenda file must be written in this format, for example ${formatDate(new Date(), buildFormat(current.order, current.separator))}. Lines with any other date format are ignored.`,
      )
      .addDropdown((dropdown) => {
        for (const order of DATE_ORDERS) dropdown.addOption(order.join(","), buildFormat(order, current.separator));
        dropdown.setValue(current.order.join(",")).onChange(async (key) => {
          this.plugin.settings.dateFormat = buildFormat(key.split(",") as DateToken[], current.separator);
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("Show completed items")
      .setDesc("Completed items are the ones marked with a leading ✅.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showCompleted).onChange(async (value) => {
          this.plugin.settings.showCompleted = value;
          await this.plugin.saveSettings();
        }),
      );

    this.displayTypes(containerEl);
  }

  private displayTypes(containerEl: HTMLElement): void {
    const { types } = this.plugin.settings;
    types.forEach((type, index) => {
      new Setting(containerEl)
        .setClass("agenda-type-row")
        .addText((text) =>
          text.setValue(type.name).onChange(async (value) => {
            const name = value.trim();
            if (!name) return;
            type.name = name;
            await this.plugin.saveSettings();
          }),
        )
        .addColorPicker((picker) =>
          picker.setValue(type.color).onChange(async (value) => {
            type.color = value;
            await this.plugin.saveSettings();
          }),
        )
        .addExtraButton((button) =>
          button
            .setIcon("trash")
            .setTooltip("Remove type")
            .onClick(async () => {
              types.splice(index, 1);
              await this.plugin.saveSettings();
              this.display();
            }),
        );
    });

    new Setting(containerEl).setClass("agenda-type-row").addButton((button) =>
      button.setButtonText("Add type").onClick(async () => {
        types.push({
          name: `type ${types.length + 1}`,
          color: NEW_TYPE_COLORS[types.length % NEW_TYPE_COLORS.length],
        });
        await this.plugin.saveSettings();
        this.display();
      }),
    );
  }
}
