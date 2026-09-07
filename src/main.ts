import { Notice, Plugin, TFolder, type WorkspaceLeaf } from 'obsidian';
import type { BoardRef } from './core/board';
import { DEFAULT_SETTINGS, KeelBoardSettingTab, type KeelBoardSettings } from './settings';
import { BoardPicker } from './ui/board-picker';
import { BoardView, VIEW_TYPE_BOARD } from './ui/board-view';
import { BoardStore } from './vault-board';

export default class KeelBoardPlugin extends Plugin {
	settings: KeelBoardSettings = { ...DEFAULT_SETTINGS };
	store: BoardStore = new BoardStore(this.app);

	async onload(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<KeelBoardSettings> | null) };
		this.addSettingTab(new KeelBoardSettingTab(this.app, this));

		this.registerView(VIEW_TYPE_BOARD, (leaf: WorkspaceLeaf) => new BoardView(leaf, this));

		this.addRibbonIcon('kanban', 'Open board', () => void this.openBoardCommand());
		this.addCommand({
			id: 'open-board',
			name: 'Open board',
			callback: () => void this.openBoardCommand(),
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

	async openBoard(board: BoardRef): Promise<void> {
		const existing = this.app.workspace
			.getLeavesOfType(VIEW_TYPE_BOARD)
			.find((leaf) => (leaf.getViewState().state as { boardDir?: string } | undefined)?.boardDir === board.dir);
		const leaf = existing ?? this.app.workspace.getLeaf('tab');
		await leaf.setViewState({ type: VIEW_TYPE_BOARD, active: true, state: { boardDir: board.dir } });
		await this.app.workspace.revealLeaf(leaf);
	}
}
