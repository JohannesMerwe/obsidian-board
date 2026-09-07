import { BasesView, Keymap, Notice, type BasesEntry, type QueryController } from 'obsidian';
import type { Board } from '../core/board';
import type { Card } from '../core/card';
import { STATES, type BoardColumn, type CardState } from '../core/manifest';
import type { BoardStore } from '../vault-board';

export const BASES_VIEW_TYPE = 'keel-board';

const STATE_TITLES: Record<CardState, string> = { todo: 'To do', in_progress: 'In progress', done: 'Done' };

interface Placed {
	entry: BasesEntry;
	board: Board;
	card: Card;
}

/**
 * A Bases view over card files: the base's results, laid out by canonical
 * state. Each file's board and column come from its directory, so the view
 * agrees with the board view and with BOARD.md. Dragging moves the file.
 */
export class KeelBoardBasesView extends BasesView {
	type = BASES_VIEW_TYPE;
	private dragging: Placed | null = null;
	private token = 0;

	constructor(
		controller: QueryController,
		private readonly containerEl: HTMLElement,
		private readonly store: BoardStore,
	) {
		super(controller);
		this.containerEl.addClass('keel-board', 'keel-board-bases');
	}

	onDataUpdated(): void {
		void this.render();
	}

	private async place(): Promise<Placed[]> {
		const boards = new Map<string, Board>();
		const placed: Placed[] = [];
		for (const entry of this.data.data) {
			const ref = this.store.boardOf(entry.file.path);
			if (!ref) continue;
			let board = boards.get(ref.dir);
			if (!board) {
				board = await this.store.load(ref);
				boards.set(ref.dir, board);
			}
			const card = board.cards.find((c) => c.path === entry.file.path);
			if (card) placed.push({ entry, board, card });
		}
		return placed;
	}

	private async render(): Promise<void> {
		const token = ++this.token;
		const placed = await this.place();
		if (token !== this.token) return;
		const root = this.containerEl;
		root.empty();
		const skipped = this.data.data.length - placed.length;
		if (skipped > 0) {
			root.createDiv({ cls: 'keel-board-meta', text: `${skipped} ${skipped === 1 ? 'file is' : 'files are'} not on a board and ${skipped === 1 ? 'is' : 'are'} hidden.` });
		}
		const columns = root.createDiv({ cls: 'keel-board-columns' });
		for (const state of STATES) {
			const el = columns.createDiv({ cls: 'keel-board-column' });
			el.dataset.state = state;
			const items = placed.filter((p) => p.card.state === state);
			const title = el.createDiv({ cls: 'keel-board-column-title' });
			title.createSpan({ text: STATE_TITLES[state] });
			title.createSpan({ cls: 'keel-board-count', text: String(items.length) });
			const list = el.createDiv({ cls: 'keel-board-cards' });
			for (const item of items) this.renderCard(list, item);
			this.registerDropTarget(el, state);
		}
	}

	private renderCard(parent: HTMLElement, item: Placed): void {
		const { card, board } = item;
		const el = parent.createDiv({ cls: 'keel-board-card' });
		el.createDiv({ cls: 'keel-board-card-id', text: card.id });
		el.createDiv({ cls: 'keel-board-card-title', text: card.title });
		const meta = el.createDiv({ cls: 'keel-board-card-meta' });
		meta.createSpan({ text: board.manifest.title || board.dir });
		if (card.updated) meta.createSpan({ text: card.updated });
		el.addEventListener('click', (evt) => {
			void this.app.workspace.getLeaf(Keymap.isModEvent(evt) || 'tab').openFile(item.entry.file);
		});
		if (!board.writable) return;
		el.draggable = true;
		el.addEventListener('dragstart', (evt) => {
			this.dragging = item;
			el.addClass('is-dragging');
			evt.dataTransfer?.setData('text/plain', card.path);
		});
		el.addEventListener('dragend', () => {
			this.dragging = null;
			el.removeClass('is-dragging');
		});
	}

	private registerDropTarget(el: HTMLElement, state: CardState): void {
		el.addEventListener('dragover', (evt) => {
			if (!this.dragging) return;
			evt.preventDefault();
			el.addClass('is-drop-target');
		});
		el.addEventListener('dragleave', () => el.removeClass('is-drop-target'));
		el.addEventListener('drop', (evt) => {
			evt.preventDefault();
			el.removeClass('is-drop-target');
			const item = this.dragging;
			this.dragging = null;
			if (!item || item.card.state === state) return;
			const target = this.targetColumn(item.board, state);
			if (!target) {
				new Notice(`${item.board.manifest.title || item.board.dir} has no ${STATE_TITLES[state].toLowerCase()} column.`);
				return;
			}
			void this.store.moveCard(item.board, item.card, target).catch((error: unknown) => {
				new Notice(error instanceof Error ? error.message : 'Could not move the card.');
			});
		});
	}

	/** The first column of the card's own board that maps to the state. */
	private targetColumn(board: Board, state: CardState): BoardColumn | null {
		return board.manifest.columns.find((c) => c.state === state) ?? null;
	}
}
