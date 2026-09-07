import { Notice, Plugin } from 'obsidian';

export default class KeelBoardPlugin extends Plugin {
	onload(): void {
		this.addCommand({
			id: 'status',
			name: 'Show status',
			callback: () => {
				new Notice('Keel Board ' + this.manifest.version + ' is loaded. Nothing to show yet.');
			},
		});
	}
}
