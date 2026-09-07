import { Modal, Setting, type App } from 'obsidian';
import type { Board } from '../core/board';
import type { BoardColumn } from '../core/manifest';

export interface AddCardRequest {
	title: string;
	type: string;
	column: BoardColumn;
	/** Only asked for when the board has no manifest and no cards to take a prefix from. */
	prefix: string | null;
}

export class AddCardModal extends Modal {
	private title = '';
	private type: string;
	private column: BoardColumn;
	private prefix = '';

	constructor(
		app: App,
		private readonly board: Board,
		defaultType: string,
		private readonly onSubmit: (request: AddCardRequest) => void,
	) {
		super(app);
		this.type = defaultType;
		const first = board.manifest.columns.find((c) => c.state === 'todo') ?? board.manifest.columns[0];
		if (!first) throw new Error('The board has no columns.');
		this.column = first;
		this.setTitle('Add card');
	}

	onOpen(): void {
		const { contentEl } = this;
		const needsPrefix = !this.board.hasManifest && this.board.manifest.prefix === '';

		new Setting(contentEl).setName('Title').addText((text) => {
			text.setPlaceholder('What the card is about');
			text.onChange((value) => (this.title = value));
			text.inputEl.addClass('keel-board-input-wide');
			window.setTimeout(() => text.inputEl.focus(), 0);
			text.inputEl.addEventListener('keydown', (evt) => {
				if (evt.key === 'Enter' && !evt.isComposing) {
					evt.preventDefault();
					this.submit();
				}
			});
		});

		if (needsPrefix) {
			new Setting(contentEl)
				.setName('ID prefix')
				.setDesc('Upper-case letters and digits, 2 to 8 characters. The board has no cards yet, so nothing to take it from.')
				.addText((text) => {
					text.setPlaceholder('KB');
					text.onChange((value) => (this.prefix = value.trim().toUpperCase()));
				});
		}

		new Setting(contentEl).setName('Type').addText((text) => {
			text.setValue(this.type);
			text.onChange((value) => (this.type = value.trim().toLowerCase()));
		});

		new Setting(contentEl).setName('Column').addDropdown((dropdown) => {
			for (const column of this.board.manifest.columns) dropdown.addOption(column.dir, column.title);
			dropdown.setValue(this.column.dir);
			dropdown.onChange((value) => {
				const column = this.board.manifest.columns.find((c) => c.dir === value);
				if (column) this.column = column;
			});
		});

		new Setting(contentEl).addButton((button) =>
			button
				.setButtonText('Add card')
				.setCta()
				.onClick(() => this.submit()),
		);
	}

	private submit(): void {
		const title = this.title.trim();
		if (title === '') return;
		const type = this.type === '' ? 'task' : this.type;
		const needsPrefix = !this.board.hasManifest && this.board.manifest.prefix === '';
		if (needsPrefix && !/^[A-Z][A-Z0-9]{1,7}$/.test(this.prefix)) return;
		this.close();
		this.onSubmit({ title, type, column: this.column, prefix: needsPrefix ? this.prefix : null });
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
