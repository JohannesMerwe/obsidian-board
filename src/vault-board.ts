/**
 * The Obsidian side of the board model: builds the snapshot the pure core
 * reads, and performs the file operations the core plans.
 */

import { moment, TFile, TFolder, type App } from 'obsidian';
import { boardForPath, discoverBoards, loadBoard, type Board, type BoardRef, type VaultSnapshot } from './core/board';
import { boardMdPath, canOverwriteBoardMd, renderBoardMd } from './core/boardmd';
import type { Card } from './core/card';
import type { BoardColumn } from './core/manifest';
import { mintId, newCardPath, newCardText } from './core/mint';
import { planMove } from './core/move';
import { parentDir } from './core/paths';

export function today(): string {
	return moment().format('YYYY-MM-DD');
}

export type BoardMdOutcome = 'written' | 'kept' | 'skipped';

export class BoardStore {
	constructor(
		private readonly app: App,
		private readonly options: { regenerateBoardMd: () => boolean },
	) {}

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

	private assertWritable(board: Board): void {
		if (!board.writable) throw new Error(`This board is read-only (provider: ${board.manifest.provider}).`);
	}

	async moveCard(board: Board, card: Card, target: BoardColumn): Promise<string> {
		this.assertWritable(board);
		const file = this.app.vault.getFileByPath(card.path);
		if (!file) throw new Error(`Card file not found: ${card.path}`);
		const plan = planMove(board, card, target, today());
		await this.app.vault.process(file, plan.rewrite);
		if (plan.toPath !== plan.fromPath) {
			await this.ensureFolder(parentDir(plan.toPath));
			await this.app.fileManager.renameFile(file, plan.toPath);
		}
		await this.afterChange(board);
		return plan.toPath;
	}

	/**
	 * Mint an id (§C4: read the manifest fresh, write `next + 1`, then create the
	 * file) and create the card. Returns the new file.
	 */
	async addCard(board: Board, request: { title: string; type: string; column: BoardColumn; prefix: string | null }): Promise<TFile> {
		this.assertWritable(board);
		const fresh = await this.load(board);
		const manifestFile = fresh.manifestPath ? this.app.vault.getFileByPath(fresh.manifestPath) : null;
		const manifestText = manifestFile ? await this.app.vault.read(manifestFile) : null;
		const prefix = request.prefix ?? fresh.manifest.prefix;
		if (prefix === '') throw new Error('The board has no id prefix yet.');
		const mint = mintId(fresh, manifestText, prefix);
		if (manifestFile && mint.manifestText !== null) {
			const text = mint.manifestText;
			await this.app.vault.process(manifestFile, () => text);
		}
		const card = { id: mint.id, title: request.title, type: request.type, column: request.column, today: today() };
		const path = newCardPath(fresh, card);
		await this.ensureFolder(parentDir(path));
		const file = await this.app.vault.create(path, newCardText(card));
		await this.afterChange(board);
		return file;
	}

	/**
	 * Write `BOARD.md` in the pinned shape. Without `force`, a file that is not
	 * marked as generated is kept as it is.
	 */
	async regenerateBoardMd(ref: BoardRef, force = false): Promise<BoardMdOutcome> {
		const board = await this.load(ref);
		if (!board.writable) return 'skipped';
		const path = boardMdPath(board);
		const existing = this.app.vault.getFileByPath(path);
		const text = existing ? await this.app.vault.read(existing) : null;
		if (!force && !canOverwriteBoardMd(text)) return 'kept';
		const rendered = renderBoardMd(board);
		if (existing) {
			if (text !== rendered) await this.app.vault.process(existing, () => rendered);
		} else {
			await this.app.vault.create(path, rendered);
		}
		return 'written';
	}

	private async afterChange(board: BoardRef): Promise<void> {
		if (this.options.regenerateBoardMd()) await this.regenerateBoardMd(board);
	}
}
