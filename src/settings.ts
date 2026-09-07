import { PluginSettingTab, type SettingDefinitionItem } from 'obsidian';

export interface KeelBoardSettings {
	showDates: boolean;
}

export const DEFAULT_SETTINGS: KeelBoardSettings = {
	showDates: true,
};

export class KeelBoardSettingTab extends PluginSettingTab {
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Show dates on cards',
				desc: 'Show each card’s last updated date under its title.',
				control: { type: 'toggle', key: 'showDates', defaultValue: DEFAULT_SETTINGS.showDates },
			},
		];
	}
}
