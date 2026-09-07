/**
 * Workspace-level summaries (KB-4): every board under a workspace root (§C1)
 * with counts per canonical state.
 */

import type { Board, BoardRef } from './board';
import type { CardState } from './manifest';

export type StateCounts = Record<CardState, number>;

export function countsByState(board: Board): StateCounts {
	const counts: StateCounts = { todo: 0, in_progress: 0, done: 0 };
	for (const card of board.cards) counts[card.state] += 1;
	return counts;
}

/** Boards inside a workspace root ('' means the whole vault). */
export function boardsUnderRoot<T extends BoardRef>(boards: readonly T[], root: string): T[] {
	if (root === '') return [...boards];
	return boards.filter((b) => b.dir === root || b.dir.startsWith(root + '/'));
}

/** The project (first segment below the root) a board belongs to, or null. */
export function projectOfBoard(root: string, projects: readonly string[], board: BoardRef): string | null {
	const relative = root === '' ? board.dir : board.dir.slice(root.length + 1);
	const first = relative.split('/')[0] ?? '';
	return projects.includes(first) ? first : null;
}
