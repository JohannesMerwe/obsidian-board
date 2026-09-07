/**
 * Moving a card between columns (§C3): move the file, update `column`, `state`,
 * `updated`. Nothing else. A header-shape card gains frontmatter on its first
 * move; its body, header lines included, is left untouched.
 */

import type { BoardRef } from './board';
import { baseName, type Card } from './card';
import { serializeFrontmatter, setEntry, splitFrontmatter, type FrontmatterEntry } from './frontmatter';
import { resolveColumnDir, type BoardColumn } from './manifest';

export interface MovePlan {
	fromPath: string;
	toPath: string;
	/** Apply to the file's current text; returns the text to write. */
	rewrite: (text: string) => string;
}

/** The canonical frontmatter for a card, in the documented key order. */
export function cardEntries(card: Card, column: BoardColumn, updated: string): FrontmatterEntry[] {
	const entries: FrontmatterEntry[] = [
		{ key: 'id', value: card.id },
		{ key: 'title', value: card.title },
		{ key: 'state', value: column.state },
		{ key: 'column', value: column.dir },
	];
	if (card.type) entries.push({ key: 'type', value: card.type });
	if (card.created) entries.push({ key: 'created', value: card.created });
	entries.push({ key: 'updated', value: updated });
	entries.push({ key: 'links', value: card.links });
	return entries;
}

export function planMove(board: BoardRef, card: Card, target: BoardColumn, today: string): MovePlan {
	const dir = resolveColumnDir(target, today);
	const toDir = board.dir === '' ? dir : `${board.dir}/${dir}`;
	const toPath = `${toDir}/${baseName(card.path)}`;
	const rewrite = (text: string): string => {
		const { entries, body } = splitFrontmatter(text);
		if (entries) {
			let next = setEntry(entries, 'column', target.dir);
			next = setEntry(next, 'state', target.state);
			next = setEntry(next, 'updated', today);
			return serializeFrontmatter(next) + body;
		}
		return serializeFrontmatter(cardEntries(card, target, today)) + text;
	};
	return { fromPath: card.path, toPath, rewrite };
}
