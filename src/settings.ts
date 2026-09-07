import { PluginSettingTab, type SettingDefinitionItem } from 'obsidian';

export interface KeelBoardSettings {
	showDates: boolean;
	regenerateBoardMd: boolean;
	defaultCardType: string;
}

export const DEFAULT_SETTINGS: KeelBoardSettings = {
	showDates: true,
	regenerateBoardMd: true,
	defaultCardType: 'feature',
};

export class KeelBoardSettingTab extends PluginSettingTab {
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Show dates on cards',
				desc: 'Show each card’s last updated date under its title.',
				control: { type: 'toggle', key: 'showDates', defaultValue: DEFAULT_SETTINGS.showDates },
			},
			{
				name: 'Keep BOARD.md up to date',
				desc: 'Regenerate the board’s BOARD.md after a card is added or moved. A hand-maintained BOARD.md is never overwritten this way.',
				control: { type: 'toggle', key: 'regenerateBoardMd', defaultValue: DEFAULT_SETTINGS.regenerateBoardMd },
			},
			{
				name: 'Default card type',
				desc: 'Pre-filled when adding a card: feature, bug, chore, task, decision, spike, or a word of your own.',
				control: {
					type: 'text',
					key: 'defaultCardType',
					defaultValue: DEFAULT_SETTINGS.defaultCardType,
					placeholder: 'feature',
					validate: (value) => (/^[a-z][a-z0-9-]*$/.test(value) ? undefined : 'Use a lower-case word.'),
				},
			},
		];
	}
}
