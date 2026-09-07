/**
 * `BOARD.md`, generated in exactly the shape pinned in pangolin-board's
 * docs/BOARD_FORMAT.md §3 (2026-09-07), so the two writers are interchangeable.
 */

import type { Board } from './board';
import type { Card } from './card';
import { GENERATED_MARKER, type BoardColumn } from './manifest';
import { joinPath, parentDir, relativeTo } from './paths';

/** The scaffold's placeholder comment; treated as generated so the first run replaces it. */
export const PLACEHOLDER_MARKER = '<!-- hand-maintained until Keel Board or pangolin-board generates it -->';

export function boardMdPath(board: { dir: string }): string {
	return joinPath(board.dir, 'BOARD.md');
}

/** A missing file, or one whose first line is a known marker, may be overwritten. */
export function canOverwriteBoardMd(existing: string | null): boolean {
	if (existing === null) return true;
	const first = existing.split(/\r?\n/, 1)[0]?.trim() ?? '';
	return first === GENERATED_MARKER || first === PLACEHOLDER_MARKER;
}

function cell(text: string): string {
	return text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

/** Rows ordered by `updated` descending, then id number descending, then id string. */
export function sortForBoardMd(cards: readonly Card[]): Card[] {
	return [...cards].sort((a, b) => {
		const ua = a.updated ?? '';
		const ub = b.updated ?? '';
		if (ua !== ub) return ua < ub ? 1 : -1;
		if (a.number !== b.number) return b.number - a.number;
		return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
	});
}

function table(board: Board, cards: readonly Card[]): string[] {
	const lines = ['| Card | Summary | Updated |', '|---|---|---|'];
	if (cards.length === 0) {
		lines.push('| _none_ | — | — |');
		return lines;
	}
	for (const card of sortForBoardMd(cards)) {
		const path = relativeTo(board.dir, card.path);
		lines.push(`| [${card.id}](${path}) | ${cell(card.summary ?? card.title)} | ${card.updated ?? '—'} |`);
	}
	return lines;
}

/** The `{year}` a card sits under for a year column, from its directory. */
export function yearOf(board: { dir: string }, column: BoardColumn, card: Card): string | null {
	const template = column.dir.split('/');
	const index = template.indexOf('{year}');
	if (index < 0) return null;
	const actual = parentDir(relativeTo(board.dir, card.path)).split('/');
	const segment = actual[index] ?? '';
	return /^\d{4}$/.test(segment) ? segment : null;
}

export function renderBoardMd(board: Board): string {
	const { manifest } = board;
	const blocks: string[] = [
		`${GENERATED_MARKER}\n# ${manifest.title} — Board`,
		`> Card ids: \`${manifest.prefix}-N\`. Generated from \`board.json\` and the cards; edit those, not this file.`,
	];
	for (const column of manifest.columns) {
		const cards = board.cards.filter((c) => c.column === column.dir);
		const isYearColumn = column.dir.includes('{year}');
		if (!isYearColumn || cards.length === 0) {
			blocks.push(`## ${column.title}\n\n${table(board, cards).join('\n')}`);
			continue;
		}
		const byYear = new Map<string, Card[]>();
		for (const card of cards) {
			const year = yearOf(board, column, card) ?? '';
			byYear.set(year, [...(byYear.get(year) ?? []), card]);
		}
		const years = [...byYear.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
		blocks.push(`## ${column.title}`);
		for (const year of years) {
			blocks.push(`### ${year}\n\n${table(board, byYear.get(year) ?? []).join('\n')}`);
		}
	}
	return blocks.join('\n\n') + '\n';
}
