/**
 * Minting (§C4): `next` in `board.json` is the only counter. Read the manifest
 * fresh, write `next + 1`, then create the file. Without a manifest, mint from
 * the highest existing number + 1 and create no manifest.
 */

import type { Board } from './board';
import { cardFileName } from './ids';
import { serializeFrontmatter, type FrontmatterEntry } from './frontmatter';
import { resolveColumnDir, withNext, type BoardColumn } from './manifest';
import { joinPath } from './paths';

export interface Mint {
	id: string;
	number: number;
	/** The manifest text to write back, or null when the board has no manifest. */
	manifestText: string | null;
}

export function highestNumber(board: Board, prefix: string): number {
	return board.cards.filter((c) => c.prefix === prefix).reduce((max, c) => Math.max(max, c.number), 0);
}

/**
 * Decide the next id. `manifestText` is the freshly read `board.json`, or null.
 * A stale `next` (lower than an existing card) is skipped past, never reused.
 */
export function mintId(board: Board, manifestText: string | null, prefix = board.manifest.prefix): Mint {
	const floor = highestNumber(board, prefix) + 1;
	if (manifestText === null || board.manifest.prefix !== prefix) {
		return { id: `${prefix}-${floor}`, number: floor, manifestText: null };
	}
	const number = Math.max(board.manifest.next, floor);
	return { id: `${prefix}-${number}`, number, manifestText: withNext(manifestText, number + 1) };
}

export interface NewCard {
	id: string;
	title: string;
	type: string;
	column: BoardColumn;
	today: string;
}

export function newCardPath(board: { dir: string }, card: NewCard): string {
	return joinPath(joinPath(board.dir, resolveColumnDir(card.column, card.today)), cardFileName(card.id, card.title));
}

export function newCardText(card: NewCard): string {
	const entries: FrontmatterEntry[] = [
		{ key: 'id', value: card.id },
		{ key: 'title', value: card.title },
		{ key: 'state', value: card.column.state },
		{ key: 'column', value: card.column.dir },
		{ key: 'type', value: card.type },
		{ key: 'created', value: card.today },
		{ key: 'updated', value: card.today },
		{ key: 'links', value: [] },
	];
	return `${serializeFrontmatter(entries)}\n# ${card.id} — ${card.title}\n\n## Context\n\n`;
}
