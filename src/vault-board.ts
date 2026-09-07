/**
 * The Obsidian side of the board model: builds the snapshot the pure core
 * reads, and performs the file operations the core plans.
 */

import { moment, TFile, TFolder, type App } from 'obsidian';
import { boardForPath, discoverBoards, loadBoard, type Board, type BoardRef, type VaultSnapshot } from './core/board';
import type { Card } from './core/card';
import type { BoardColumn } from './core/manifest';
import { planMove } from './core/move';
import { parentDir } from './core/workspace';

export function today(): string {
	return moment().format('YYYY-MM-DD');
}

export class BoardStore {
	constructor(private readonly app: App) {}

	snapshot(): VaultSnapshot {
		const files: string[] = [];
		const folders: string[] = [];
		for (const entry of this.app.vault.getAllLoadedFiles()) {
			if (entry instanceof TFile) files.push(entry.path);
			else if (entry instanceof TFolder && !entry.isRoot()) folders.push(entry.path);
		}
		return { files, folders };
	}

	boards(): BoardRef[] {
		return discoverBoards(this.snapshot());
	}

	boardOf(path: string): BoardRef | null {
		return boardForPath(this.boards(), path);
	}

	/** The board at exactly this directory, discovered or not. */
	boardAt(dir: string): BoardRef {
		const known = this.boards().find((b) => b.dir === dir);
		if (known) return known;
		const manifestPath = dir === '' ? 'board.json' : `${dir}/board.json`;
		return { dir, manifestPath: this.app.vault.getFileByPath(manifestPath) ? manifestPath : null };
	}

	load(ref: BoardRef): Promise<Board> {
		return loadBoard(ref, this.snapshot(), (path) => {
			const file = this.app.vault.getFileByPath(path);
			return file ? this.app.vault.cachedRead(file) : Promise.resolve('');
		});
	}

	async ensureFolder(path: string): Promise<void> {
		if (path === '' || this.app.vault.getFolderByPath(path)) return;
		await this.ensureFolder(parentDir(path));
		await this.app.vault.createFolder(path);
	}

	async moveCard(board: Board, card: Card, target: BoardColumn): Promise<string> {
		if (!board.writable) throw new Error('This board is read-only.');
		const file = this.app.vault.getFileByPath(card.path);
		if (!file) throw new Error(`Card file not found: ${card.path}`);
		const plan = planMove(board, card, target, today());
		await this.app.vault.process(file, plan.rewrite);
		if (plan.toPath !== plan.fromPath) {
			await this.ensureFolder(parentDir(plan.toPath));
			await this.app.fileManager.renameFile(file, plan.toPath);
		}
		return plan.toPath;
	}
}
