import { describe, expect, it } from 'vitest';
import { boardForPath, cardsByColumn, discoverBoards, dominantPrefix, isWritableProvider, loadBoard } from './board';
import { FIXTURE_VAULT, readerOf, snapshotOf } from './test-helpers';

const snapshot = snapshotOf(FIXTURE_VAULT);
const read = readerOf(FIXTURE_VAULT);

describe('board discovery', () => {
	it('finds boards by manifest or by default columns, and nothing else', () => {
		const boards = discoverBoards(snapshot);
		expect(boards).toEqual([
			{ dir: 'audiovisual/board', manifestPath: null },
			{ dir: 'board-plugin/board', manifestPath: 'board-plugin/board/board.json' },
			{ dir: 'keel/board', manifestPath: null },
		]);
	});

	it('maps a path to its board', () => {
		const boards = discoverBoards(snapshot);
		expect(boardForPath(boards, 'keel/board/wip/KEEL-40-a-card-in-progress.md')?.dir).toBe('keel/board');
		expect(boardForPath(boards, 'keel/board')?.dir).toBe('keel/board');
		expect(boardForPath(boards, 'keel/INDEX.md')).toBeNull();
	});

	it('picks the dominant prefix for a manifest-less board', () => {
		expect(dominantPrefix(['AV-1-a.md', 'AV-2-b.md', 'X-9-c.md', 'BOARD.md'])).toBe('AV');
		expect(dominantPrefix([])).toBe('');
	});

	it('write access follows the provider', () => {
		expect(isWritableProvider('pangolin-board')).toBe(true);
		expect(isWritableProvider('jira')).toBe(false);
	});
});

describe('board loading', () => {
	it('loads a manifest board with its cards', async () => {
		const board = await loadBoard({ dir: 'board-plugin/board', manifestPath: 'board-plugin/board/board.json' }, snapshot, read);
		expect(board.hasManifest).toBe(true);
		expect(board.writable).toBe(true);
		expect(board.manifest.prefix).toBe('KB');
		expect(board.cards.map((c) => c.id)).toEqual(['KB-1', 'KB-2']);
		const groups = cardsByColumn(board);
		expect([...groups.keys()]).toEqual(['backlog', 'wip', 'done/{year}']);
		expect(groups.get('backlog')?.length).toBe(2);
	});

	it('loads a default-column board in the header shape', async () => {
		const board = await loadBoard({ dir: 'keel/board', manifestPath: null }, snapshot, read);
		expect(board.hasManifest).toBe(false);
		expect(board.manifest.prefix).toBe('KEEL');
		expect(board.manifest.title).toBe('keel');
		expect(board.cards.map((c) => [c.id, c.state])).toEqual([
			['KEEL-1', 'done'],
			['KEEL-40', 'in_progress'],
		]);
	});

	it('reads the audiovisual board and ignores BOARD.md', async () => {
		const board = await loadBoard({ dir: 'audiovisual/board', manifestPath: null }, snapshot, read);
		expect(board.cards.map((c) => c.id)).toEqual(['AV-4', 'AV-10']);
		expect(board.cards.every((c) => c.shape === 'header')).toBe(true);
	});
});
