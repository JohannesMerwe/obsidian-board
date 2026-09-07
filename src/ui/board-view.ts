import { debounce, ItemView, Keymap, Notice, type ViewStateResult, type WorkspaceLeaf } from 'obsidian';
import { cardsByColumn, type Board, type BoardRef } from '../core/board';
import type { Card } from '../core/card';
import type { BoardColumn } from '../core/manifest';
import type { BoardStore } from '../vault-board';
import type { KeelBoardSettings } from '../settings';

export const VIEW_TYPE_BOARD = 'keel-board';

export interface BoardViewState {
	boardDir: string;
}

export interface BoardViewHost {
	store: BoardStore;
	settings: KeelBoardSettings;
	addCard(board: Board): void;
	regenerateBoardMd(board: BoardRef): Promise<void>;
}

export class BoardView extends ItemView {
	navigation = true;
	private boardDir = '';
	private board: Board | null = null;
	private dragging: Card | null = null;
	private readonly refreshSoon = debounce(() => void this.refresh(), 150, true);

	constructor(
		leaf: WorkspaceLeaf,
		private readonly host: BoardViewHost,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_BOARD;
	}

	getDisplayText(): string {
		return this.board?.manifest.title ? `${this.board.manifest.title} board` : 'Board';
	}

	getIcon(): string {
		return 'kanban';
	}

	getState(): Record<string, unknown> {
		return { boardDir: this.boardDir };
	}

	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		if (state && typeof state === 'object' && 'boardDir' in state && typeof state.boardDir === 'string') {
			this.boardDir = state.boardDir;
		}
		await super.setState(state, result);
		await this.refresh();
	}

	onOpen(): Promise<void> {
		this.contentEl.addClass('keel-board');
		const onVaultChange = (path: string): void => {
			if (this.boardDir === '' || path === this.boardDir || path.startsWith(this.boardDir + '/')) this.refreshSoon();
		};
		this.registerEvent(this.app.vault.on('create', (f) => onVaultChange(f.path)));
		this.registerEvent(this.app.vault.on('modify', (f) => onVaultChange(f.path)));
		this.registerEvent(this.app.vault.on('delete', (f) => onVaultChange(f.path)));
		this.registerEvent(
			this.app.vault.on('rename', (f, oldPath) => {
				onVaultChange(f.path);
				onVaultChange(oldPath);
			}),
		);
		return Promise.resolve();
	}

	getBoard(): Board | null {
		return this.board;
	}

	async refresh(): Promise<void> {
		this.board = await this.host.store.load(this.host.store.boardAt(this.boardDir));
		this.render();
	}

	private render(): void {
		const root = this.contentEl;
		root.empty();
		const board = this.board;
		if (!board) return;

		const header = root.createDiv({ cls: 'keel-board-header' });
		header.createEl('h2', { cls: 'keel-board-title', text: board.manifest.title || board.dir || 'Board' });
		const meta = header.createDiv({ cls: 'keel-board-meta' });
		meta.createSpan({ text: `${board.cards.length} ${board.cards.length === 1 ? 'card' : 'cards'}` });
		if (!board.writable) meta.createSpan({ cls: 'keel-board-badge', text: `Read-only (${board.manifest.provider})` });
		else if (!board.hasManifest) meta.createSpan({ cls: 'keel-board-badge', text: 'Default columns' });
		this.renderActions(header.createDiv({ cls: 'keel-board-actions' }), board);

		const columns = root.createDiv({ cls: 'keel-board-columns' });
		const groups = cardsByColumn(board);
		for (const column of board.manifest.columns) {
			this.renderColumn(columns, board, column, groups.get(column.dir) ?? []);
		}
	}

	private renderActions(el: HTMLElement, board: Board): void {
		if (!board.writable) return;
		const add = el.createEl('button', { text: 'Add card', cls: 'mod-cta' });
		this.registerDomEvent(add, 'click', () => this.host.addCard(board));
		const regenerate = el.createEl('button', { text: 'Regenerate BOARD.md' });
		this.registerDomEvent(regenerate, 'click', () => void this.host.regenerateBoardMd(board));
	}

	private renderColumn(parent: HTMLElement, board: Board, column: BoardColumn, cards: Card[]): void {
		const el = parent.createDiv({ cls: 'keel-board-column' });
		el.dataset.state = column.state;
		const title = el.createDiv({ cls: 'keel-board-column-title' });
		title.createSpan({ text: column.title });
		title.createSpan({ cls: 'keel-board-count', text: String(cards.length) });
		const list = el.createDiv({ cls: 'keel-board-cards' });
		for (const card of cards) this.renderCard(list, board, card);

		if (!board.writable) return;
		this.registerDomEvent(el, 'dragover', (evt) => {
			if (!this.dragging) return;
			evt.preventDefault();
			if (evt.dataTransfer) evt.dataTransfer.dropEffect = 'move';
			el.addClass('is-drop-target');
		});
		this.registerDomEvent(el, 'dragleave', (evt) => {
			if (!el.contains(evt.relatedTarget instanceof Node ? evt.relatedTarget : null)) el.removeClass('is-drop-target');
		});
		this.registerDomEvent(el, 'drop', (evt) => {
			evt.preventDefault();
			el.removeClass('is-drop-target');
			const card = this.dragging;
			this.dragging = null;
			if (!card || card.column === column.dir) return;
			void this.move(board, card, column);
		});
	}

	private renderCard(parent: HTMLElement, board: Board, card: Card): void {
		const el = parent.createDiv({ cls: 'keel-board-card' });
		el.createDiv({ cls: 'keel-board-card-id', text: card.id });
		el.createDiv({ cls: 'keel-board-card-title', text: card.title });
		const meta = el.createDiv({ cls: 'keel-board-card-meta' });
		if (card.type) meta.createSpan({ cls: 'keel-board-card-type', text: card.type });
		if (this.host.settings.showDates && card.updated) meta.createSpan({ text: card.updated });
		if (card.links.length > 0) meta.createSpan({ text: card.links.join(', '), title: 'Linked cards' });

		this.registerDomEvent(el, 'click', (evt) => void this.open(card, evt));

		if (!board.writable) return;
		el.draggable = true;
		this.registerDomEvent(el, 'dragstart', (evt) => {
			this.dragging = card;
			el.addClass('is-dragging');
			if (evt.dataTransfer) {
				evt.dataTransfer.effectAllowed = 'move';
				evt.dataTransfer.setData('text/plain', card.path);
			}
		});
		this.registerDomEvent(el, 'dragend', () => {
			this.dragging = null;
			el.removeClass('is-dragging');
		});
	}

	private async open(card: Card, evt: MouseEvent): Promise<void> {
		const file = this.app.vault.getFileByPath(card.path);
		if (!file) {
			new Notice(`Card file not found: ${card.path}`);
			return;
		}
		const leaf = this.app.workspace.getLeaf(Keymap.isModEvent(evt) || 'tab');
		await leaf.openFile(file);
	}

	protected async move(board: Board, card: Card, column: BoardColumn): Promise<void> {
		try {
			await this.host.store.moveCard(board, card, column);
		} catch (error) {
			new Notice(error instanceof Error ? error.message : 'Could not move the card.');
			await this.refresh();
		}
	}
}
