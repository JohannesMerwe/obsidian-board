import { describe, expect, it } from 'vitest';
import { columnForDir, defaultManifest, humanizeDir, parseManifest, resolveColumnDir, withNext } from './manifest';
import { readFixture } from './test-helpers';

describe('board.json', () => {
	it('parses the board-plugin manifest', () => {
		const manifest = parseManifest(readFixture('board-plugin/board/board.json'));
		expect(manifest).not.toBeNull();
		expect(manifest?.prefix).toBe('KB');
		expect(manifest?.next).toBe(6);
		expect(manifest?.provider).toBe('pangolin-board');
		expect(manifest?.columns.map((c) => [c.dir, c.state])).toEqual([
			['backlog', 'todo'],
			['wip', 'in_progress'],
			['done/{year}', 'done'],
		]);
	});

	it('falls back to defaults for a thin or broken manifest', () => {
		expect(parseManifest('not json')).toBeNull();
		const thin = parseManifest('{"prefix":"X"}');
		expect(thin?.columns.map((c) => c.title)).toEqual(['Backlog', 'WIP', 'Done']);
		expect(thin?.next).toBe(1);
	});

	it('names default columns after their directory and boards after their project', () => {
		expect(humanizeDir('wip')).toBe('WIP');
		expect(humanizeDir('done/{year}')).toBe('Done');
		expect(humanizeDir('in-review')).toBe('In review');
		expect(defaultManifest('audiovisual/board', 'AV').title).toBe('audiovisual');
		expect(defaultManifest('cards', 'AV').title).toBe('cards');
	});

	it('resolves {year} columns both ways', () => {
		const columns = defaultManifest('x', 'X').columns;
		expect(columnForDir(columns, 'done/2026')?.dir).toBe('done/{year}');
		expect(columnForDir(columns, 'done/{year}')?.dir).toBe('done/{year}');
		expect(columnForDir(columns, 'done')).toBeUndefined();
		expect(columnForDir(columns, 'wip')?.state).toBe('in_progress');
		const done = columns[2];
		if (!done) throw new Error('no done column');
		expect(resolveColumnDir(done, '2027-01-02')).toBe('done/2027');
	});

	it('bumps next in place without reformatting the file', () => {
		const text = readFixture('board-plugin/board/board.json');
		const bumped = withNext(text, 7);
		expect(bumped).toBe(text.replace('"next": 6', '"next": 7'));
		expect(withNext('{\n  "prefix": "AV"\n}', 14)).toBe('{\n  "prefix": "AV",\n  "next": 14\n}');
	});
});
