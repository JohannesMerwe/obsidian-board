import { describe, expect, it } from 'vitest';
import { loadBoard } from './board';
import { mintId, newCardPath, newCardText } from './mint';
import { FIXTURE_VAULT, readerOf, readFixture, snapshotOf } from './test-helpers';

const snapshot = snapshotOf(FIXTURE_VAULT);
const read = readerOf(FIXTURE_VAULT);

describe('minting (§C4)', () => {
	it('mints from next and writes next + 1 back into the manifest text', async () => {
		const board = await loadBoard({ dir: 'board-plugin/board', manifestPath: 'board-plugin/board/board.json' }, snapshot, read);
		const text = readFixture('board-plugin/board/board.json');
		const mint = mintId(board, text);
		expect(mint.id).toBe('KB-6');
		expect(mint.manifestText).toBe(text.replace('"next": 6', '"next": 7'));
	});

	it('skips past a stale next rather than reusing an id', async () => {
		const board = await loadBoard({ dir: 'board-plugin/board', manifestPath: 'board-plugin/board/board.json' }, snapshot, read);
		const text = readFixture('board-plugin/board/board.json').replace('"next": 6', '"next": 2');
		board.manifest.next = 2;
		const mint = mintId(board, text);
		expect(mint.id).toBe('KB-3');
		expect(mint.manifestText).toContain('"next": 4');
	});

	it('mints max + 1 without a manifest and creates none', async () => {
		const board = await loadBoard({ dir: 'keel/board', manifestPath: null }, snapshot, read);
		const mint = mintId(board, null);
		expect(mint).toEqual({ id: 'KEEL-41', number: 41, manifestText: null });
		expect(mintId(board, null, 'NEW')).toEqual({ id: 'NEW-1', number: 1, manifestText: null });
	});

	it('creates the file in the resolved column with the documented frontmatter', () => {
		const card = {
			id: 'KB-6',
			title: 'Hover preview: card title, state and column',
			type: 'feature',
			column: { dir: 'done/{year}', title: 'Done', state: 'done' as const },
			today: '2026-09-08',
		};
		expect(newCardPath({ dir: 'board-plugin/board' }, card)).toBe('board-plugin/board/done/2026/KB-6-hover-preview-card-title-state-and-column.md');
		expect(newCardText(card)).toBe(`---
id: KB-6
title: "Hover preview: card title, state and column"
state: done
column: done/{year}
type: feature
created: 2026-09-08
updated: 2026-09-08
links: []
---

# KB-6 — Hover preview: card title, state and column

## Context

`);
	});
});
