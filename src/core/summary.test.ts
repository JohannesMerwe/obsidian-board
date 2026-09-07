import { describe, expect, it } from 'vitest';
import { discoverBoards, loadBoard } from './board';
import { boardsUnderRoot, countsByState, projectOfBoard } from './summary';
import { FIXTURE_VAULT, readerOf, snapshotOf } from './test-helpers';

const snapshot = snapshotOf(FIXTURE_VAULT);
const read = readerOf(FIXTURE_VAULT);

describe('workspace summary (KB-4)', () => {
	it('counts cards per state', async () => {
		const board = await loadBoard({ dir: 'keel/board', manifestPath: null }, snapshot, read);
		expect(countsByState(board)).toEqual({ todo: 0, in_progress: 1, done: 1 });
	});

	it('filters boards by workspace root and names their project', () => {
		const boards = discoverBoards(snapshot);
		expect(boardsUnderRoot(boards, '').length).toBe(3);
		expect(boardsUnderRoot(boards, 'keel').map((b) => b.dir)).toEqual(['keel/board']);
		expect(boardsUnderRoot(boards, 'nowhere')).toEqual([]);
		const keel = boards.find((b) => b.dir === 'keel/board');
		if (!keel) throw new Error('board');
		expect(projectOfBoard('', ['keel', 'sync'], keel)).toBe('keel');
		expect(projectOfBoard('', ['sync'], keel)).toBeNull();
		expect(projectOfBoard('keel', ['board'], keel)).toBe('board');
	});
});
