import { SuggestModal, type App } from 'obsidian';
import type { BoardRef } from '../core/board';

export class BoardPicker extends SuggestModal<BoardRef> {
	constructor(
		app: App,
		private readonly boards: BoardRef[],
		private readonly onPick: (board: BoardRef) => void,
	) {
		super(app);
		this.setPlaceholder('Pick a board');
	}

	getSuggestions(query: string): BoardRef[] {
		const q = query.toLowerCase();
		return this.boards.filter((b) => (b.dir === '' ? '/' : b.dir).toLowerCase().includes(q));
	}

	renderSuggestion(board: BoardRef, el: HTMLElement): void {
		el.createDiv({ text: board.dir === '' ? '/' : board.dir });
		el.createDiv({ cls: 'keel-board-picker-note', text: board.manifestPath ? 'board.json' : 'default columns' });
	}

	onChooseSuggestion(board: BoardRef): void {
		this.onPick(board);
	}
}
