/**
 * Board discovery and loading over a snapshot of vault paths. Pure: the shell
 * supplies the paths and a reader; nothing here touches Obsidian or the disk.
 */

import { parseCardFileName } from './ids';
import { DEFAULT_COLUMNS, defaultManifest, parseManifest, type BoardManifest } from './manifest';
import { columnOfPath, parseCard, type Card } from './card';
import { parentDir, relativeTo } from './workspace';

export interface VaultSnapshot {
	/** Every file path in the vault (vault-relative, `/`-separated). */
	files: string[];
	/** Every folder path in the vault. */
	folders: string[];
}

export interface BoardRef {
	/** Directory of the board (vault-relative). */
	dir: string;
	/** Path of `board.json`, or null when the board runs on default columns. */
	manifestPath: string | null;
}

export interface Board extends BoardRef {
	manifest: BoardManifest;
	/** True when the manifest came from a `board.json` file. */
	hasManifest: boolean;
	cards: Card[];
	/** Whether the plugin may write (§C3: `jira` ⇒ read-only). */
	writable: boolean;
}

const READ_ONLY_PROVIDERS = new Set(['jira']);

/** Provider ⇒ write access (§C3). */
export function isWritableProvider(provider: string): boolean {
	return !READ_ONLY_PROVIDERS.has(provider.toLowerCase());
}

/**
 * A directory is a board when it holds `board.json`, or when it has at least
 * two of the default column directories (`backlog`, `wip`, `done`).
 */
export function discoverBoards(snapshot: VaultSnapshot): BoardRef[] {
	const folders = new Set(snapshot.folders);
	const boards = new Map<string, BoardRef>();
	for (const file of snapshot.files) {
		if (file === 'board.json' || file.endsWith('/board.json')) {
			boards.set(parentDir(file), { dir: parentDir(file), manifestPath: file });
		}
	}
	const defaultDirs = DEFAULT_COLUMNS.map((c) => c.dir.split('/')[0] ?? c.dir);
	for (const folder of [...folders, '']) {
		if (boards.has(folder)) continue;
		const hits = defaultDirs.filter((d) => folders.has(folder === '' ? d : `${folder}/${d}`)).length;
		if (hits >= 2) boards.set(folder, { dir: folder, manifestPath: null });
	}
	return [...boards.values()].sort((a, b) => a.dir.localeCompare(b.dir));
}

/** The board a path belongs to: the deepest discovered board directory above it. */
export function boardForPath(boards: readonly BoardRef[], path: string): BoardRef | null {
	let best: BoardRef | null = null;
	for (const board of boards) {
		const inside = board.dir === '' || path === board.dir || path.startsWith(board.dir + '/');
		if (inside && (best === null || board.dir.length > best.dir.length)) best = board;
	}
	return best;
}

/** The prefix a manifest-less board uses: the most common one among its cards. */
export function dominantPrefix(cardFileNames: readonly string[]): string {
	const counts = new Map<string, number>();
	for (const name of cardFileNames) {
		const parsed = parseCardFileName(name);
		if (parsed) counts.set(parsed.prefix, (counts.get(parsed.prefix) ?? 0) + 1);
	}
	let best = '';
	let bestCount = 0;
	for (const [prefix, count] of counts) {
		if (count > bestCount || (count === bestCount && prefix < best)) {
			best = prefix;
			bestCount = count;
		}
	}
	return best;
}

export type Reader = (path: string) => Promise<string>;

/** Card file paths of a board, given the vault snapshot (before reading contents). */
export function cardPaths(board: BoardRef, manifest: BoardManifest, snapshot: VaultSnapshot): string[] {
	return snapshot.files.filter((f) => columnOfPath(board.dir, manifest.columns, f) !== null);
}

export async function loadBoard(ref: BoardRef, snapshot: VaultSnapshot, read: Reader): Promise<Board> {
	let manifest: BoardManifest | null = null;
	if (ref.manifestPath) manifest = parseManifest(await read(ref.manifestPath));
	const hasManifest = manifest !== null;
	if (!manifest) {
		const names = snapshot.files
			.filter((f) => ref.dir === '' || f.startsWith(ref.dir + '/'))
			.map((f) => f.slice(f.lastIndexOf('/') + 1));
		manifest = defaultManifest(ref.dir, dominantPrefix(names));
	}
	const cards: Card[] = [];
	for (const path of cardPaths(ref, manifest, snapshot)) {
		const column = columnOfPath(ref.dir, manifest.columns, path);
		if (!column) continue;
		const card = parseCard(path, await read(path), column);
		if (card) cards.push(card);
	}
	cards.sort((a, b) => a.prefix.localeCompare(b.prefix) || a.number - b.number);
	return { ...ref, manifest, hasManifest, cards, writable: isWritableProvider(manifest.provider) };
}

/** Group a board's cards by column, in manifest order. */
export function cardsByColumn(board: Board): Map<string, Card[]> {
	const groups = new Map<string, Card[]>();
	for (const column of board.manifest.columns) groups.set(column.dir, []);
	for (const card of board.cards) {
		const group = groups.get(card.column);
		if (group) group.push(card);
		else groups.set(card.column, [card]);
	}
	return groups;
}

/** Relative directory of a card inside its board. */
export function cardRelativeDir(board: BoardRef, card: Card): string {
	return parentDir(relativeTo(board.dir, card.path));
}
