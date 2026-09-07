import { debounce, ItemView, type WorkspaceLeaf } from 'obsidian';
import type { Board, BoardRef } from '../core/board';
import { boardsUnderRoot, countsByState, projectOfBoard } from '../core/summary';
import type { Workspace } from '../core/workspace';
import type { BoardStore } from '../vault-board';

export const VIEW_TYPE_WORKSPACE = 'keel-board-workspace';

export interface WorkspaceViewHost {
	store: BoardStore;
	/** The keel workspace of the active file, or null in plain mode (§C1). */
	currentWorkspace(): Promise<Workspace | null>;
	openBoard(board: BoardRef): Promise<void>;
}

/** Every board under the workspace root, with counts per state. */
export class WorkspaceBoardsView extends ItemView {
	navigation = true;
	private readonly refreshSoon = debounce(() => void this.refresh(), 300, true);

	constructor(
		leaf: WorkspaceLeaf,
		private readonly host: WorkspaceViewHost,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_WORKSPACE;
	}

	getDisplayText(): string {
		return 'Boards';
	}

	getIcon(): string {
		return 'layout-grid';
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass('keel-board', 'keel-board-workspace');
		this.registerEvent(this.app.vault.on('create', () => this.refreshSoon()));
		this.registerEvent(this.app.vault.on('modify', () => this.refreshSoon()));
		this.registerEvent(this.app.vault.on('delete', () => this.refreshSoon()));
		this.registerEvent(this.app.vault.on('rename', () => this.refreshSoon()));
		await this.refresh();
	}

	async refresh(): Promise<void> {
		const workspace = await this.host.currentWorkspace();
		const root = workspace?.root ?? '';
		const refs = boardsUnderRoot(this.host.store.boards(), root);
		const boards: Board[] = [];
		for (const ref of refs) boards.push(await this.host.store.load(ref));
		this.render(workspace, boards);
	}

	private render(workspace: Workspace | null, boards: Board[]): void {
		const root = this.contentEl;
		root.empty();
		const header = root.createDiv({ cls: 'keel-board-header' });
		header.createEl('h2', { cls: 'keel-board-title', text: workspace ? `${workspace.name} boards` : 'Boards' });
		header.createDiv({
			cls: 'keel-board-meta',
			text: workspace ? `Workspace root: ${workspace.root || '/'}` : 'Every board in the vault',
		});

		if (boards.length === 0) {
			root.createDiv({ cls: 'keel-board-empty', text: 'No boards found.' });
			return;
		}

		const table = root.createEl('table', { cls: 'keel-board-table' });
		const head = table.createEl('thead').createEl('tr');
		for (const label of ['Board', 'Project', 'To do', 'In progress', 'Done']) head.createEl('th', { text: label });
		const body = table.createEl('tbody');
		for (const board of boards) {
			const counts = countsByState(board);
			const row = body.createEl('tr', { cls: 'keel-board-row' });
			const name = row.createEl('td');
			name.createSpan({ cls: 'keel-board-row-title', text: board.manifest.title || board.dir || '/' });
			name.createSpan({ cls: 'keel-board-row-dir', text: board.dir || '/' });
			if (!board.writable) name.createSpan({ cls: 'keel-board-badge', text: board.manifest.provider });
			row.createEl('td', { text: workspace ? (projectOfBoard(workspace.root, workspace.projects, board) ?? '—') : '—' });
			row.createEl('td', { cls: 'keel-board-num', text: String(counts.todo) });
			row.createEl('td', { cls: 'keel-board-num', text: String(counts.in_progress) });
			row.createEl('td', { cls: 'keel-board-num', text: String(counts.done) });
			this.registerDomEvent(row, 'click', () => void this.host.openBoard(board));
		}
	}
}
