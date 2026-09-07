import { Notice, Plugin, TFolder, type WorkspaceLeaf } from 'obsidian';
import type { Board, BoardRef } from './core/board';
import { DEFAULT_SETTINGS, KeelBoardSettingTab, type KeelBoardSettings } from './settings';
import { AddCardModal } from './ui/add-card-modal';
import { BoardPicker } from './ui/board-picker';
import { BoardView, VIEW_TYPE_BOARD } from './ui/board-view';
import { BASES_VIEW_TYPE, KeelBoardBasesView } from './ui/bases-view';
import { VIEW_TYPE_WORKSPACE, WorkspaceBoardsView } from './ui/workspace-view';
import { findWorkspace, type Workspace } from './core/workspace';
import { parentDir } from './core/paths';
import { BoardStore } from './vault-board';

export default class KeelBoardPlugin extends Plugin {
	settings: KeelBoardSettings = { ...DEFAULT_SETTINGS };
	store: BoardStore = new BoardStore(this.app, { regenerateBoardMd: () => this.settings.regenerateBoardMd });

	async onload(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<KeelBoardSettings> | null) };
		this.addSettingTab(new KeelBoardSettingTab(this.app, this));

		this.registerView(VIEW_TYPE_BOARD, (leaf: WorkspaceLeaf) => new BoardView(leaf, this));
		this.registerView(VIEW_TYPE_WORKSPACE, (leaf: WorkspaceLeaf) => new WorkspaceBoardsView(leaf, this));
		this.registerBasesView(BASES_VIEW_TYPE, {
			name: 'Board',
			icon: 'kanban',
			factory: (controller, containerEl) => new KeelBoardBasesView(controller, containerEl, this.store),
		});

		this.addRibbonIcon('kanban', 'Open board', () => void this.openBoardCommand());
		this.addCommand({
			id: 'open-board',
			name: 'Open board',
			callback: () => void this.openBoardCommand(),
		});
		this.addCommand({
			id: 'open-workspace-boards',
			name: 'Open workspace boards',
			callback: () => void this.openWorkspaceBoards(),
		});
		this.addCommand({
			id: 'add-card',
			name: 'Add card',
			checkCallback: (checking) => {
				const ref = this.currentBoard();
				if (!ref) return false;
				if (!checking) void this.store.load(ref).then((board) => this.addCard(board));
				return true;
			},
		});
		this.addCommand({
			id: 'regenerate-board-md',
			name: 'Regenerate BOARD.md',
			checkCallback: (checking) => {
				const ref = this.currentBoard();
				if (!ref) return false;
				if (!checking) void this.regenerateBoardMd(ref, true);
				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (!(file instanceof TFolder)) return;
				const board = this.store.boards().find((b) => b.dir === file.path);
				if (!board) return;
				menu.addItem((item) =>
					item
						.setTitle('Open as board')
						.setIcon('kanban')
						.onClick(() => void this.openBoard(board)),
				);
			}),
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/** The board shown in the active board view, else the active file's board. */
	private currentBoard(): BoardRef | null {
		const view = this.app.workspace.getActiveViewOfType(BoardView);
		const shown = view?.getBoard();
		if (shown) return shown;
		const active = this.app.workspace.getActiveFile();
		return active ? this.store.boardOf(active.path) : null;
	}

	/** The board of the active file, else a picker over every board in the vault. */
	async openBoardCommand(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const current = active ? this.store.boardOf(active.path) : null;
		if (current) {
			await this.openBoard(current);
			return;
		}
		const boards = this.store.boards();
		if (boards.length === 0) {
			new Notice('No board found. A board is a folder with board.json, or with backlog, wip and done folders.');
			return;
		}
		if (boards.length === 1 && boards[0]) {
			await this.openBoard(boards[0]);
			return;
		}
		new BoardPicker(this.app, boards, (board) => void this.openBoard(board)).open();
	}

	/** §C1: the keel workspace of the active file, or null in plain mode. */
	async currentWorkspace(): Promise<Workspace | null> {
		const active = this.app.workspace.getActiveFile();
		if (!active) return null;
		const texts = new Map<string, string>();
		for (const path of this.store.snapshot().files) {
			if (path !== 'keel.json' && !path.endsWith('/keel.json')) continue;
			if (!active.path.startsWith(parentDir(path) === '' ? '' : parentDir(path) + '/')) continue;
			const file = this.app.vault.getFileByPath(path);
			if (file) texts.set(path, await this.app.vault.cachedRead(file));
		}
		return findWorkspace(active.path, { exists: (p) => texts.has(p), read: (p) => texts.get(p) ?? null });
	}

	async openWorkspaceBoards(): Promise<void> {
		const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_WORKSPACE)[0] ?? this.app.workspace.getLeaf('tab');
		await leaf.setViewState({ type: VIEW_TYPE_WORKSPACE, active: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	async openBoard(board: BoardRef): Promise<void> {
		const existing = this.app.workspace
			.getLeavesOfType(VIEW_TYPE_BOARD)
			.find((leaf) => (leaf.getViewState().state as { boardDir?: string } | undefined)?.boardDir === board.dir);
		const leaf = existing ?? this.app.workspace.getLeaf('tab');
		await leaf.setViewState({ type: VIEW_TYPE_BOARD, active: true, state: { boardDir: board.dir } });
		await this.app.workspace.revealLeaf(leaf);
	}

	addCard(board: Board): void {
		if (!board.writable) {
			new Notice(`This board is read-only (provider: ${board.manifest.provider}).`);
			return;
		}
		new AddCardModal(this.app, board, this.settings.defaultCardType, (request) => {
			void this.store
				.addCard(board, request)
				.then((file) => {
					new Notice(`Added ${file.basename.split('-').slice(0, 2).join('-')}.`);
					return this.app.workspace.getLeaf('tab').openFile(file);
				})
				.catch((error: unknown) => new Notice(error instanceof Error ? error.message : 'Could not add the card.'));
		}).open();
	}

	async regenerateBoardMd(ref: BoardRef, force = false): Promise<void> {
		try {
			const outcome = await this.store.regenerateBoardMd(ref, force);
			if (outcome === 'written') new Notice('BOARD.md regenerated.');
			else if (outcome === 'kept') new Notice('BOARD.md is hand-maintained; use the "Regenerate BOARD.md" command to replace it.');
			else new Notice('This board is read-only; BOARD.md was not written.');
		} catch (error) {
			new Notice(error instanceof Error ? error.message : 'Could not write BOARD.md.');
		}
	}
}
