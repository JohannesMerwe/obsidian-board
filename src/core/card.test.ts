import { describe, expect, it } from 'vitest';
import { columnOfPath, parseCard, parseHeaderFields } from './card';
import { DEFAULT_COLUMNS } from './manifest';
import { readFixture } from './test-helpers';

const [backlog, wip, done] = DEFAULT_COLUMNS;
if (!backlog || !wip || !done) throw new Error('defaults');

describe('card files in both shapes (§C3)', () => {
	it('reads the frontmatter shape', () => {
		const path = 'board-plugin/board/backlog/KB-1-read-a-board-directory-into-a-model.md';
		const card = parseCard(path, readFixture(path), backlog);
		expect(card).toMatchObject({
			id: 'KB-1',
			prefix: 'KB',
			number: 1,
			title: 'Read a board directory into a model',
			state: 'todo',
			column: 'backlog',
			type: 'feature',
			created: '2026-09-07',
			updated: '2026-09-07',
			links: [],
			shape: 'frontmatter',
		});
	});

	it('reads the Status/Repo/Area header shape', () => {
		const path = 'audiovisual/board/backlog/AV-4-async-transcription-jobs.md';
		const card = parseCard(path, readFixture(path), backlog);
		expect(card).toMatchObject({
			id: 'AV-4',
			title: 'Async transcription jobs',
			state: 'todo',
			type: null,
			created: null,
			updated: '2026-08-26',
			shape: 'header',
		});
	});

	it('reads the Type/Priority/Status/Created header shape', () => {
		const path = 'board/board/backlog/BOARD-1-adopt-the-board-directory-format.md';
		const card = parseCard(path, readFixture(path), backlog);
		expect(card?.title).toBe('Adopt the board directory format across the workspace');
		expect(card?.type).toBe('architecture / migration');
		expect(card?.created).toBe('2026-09-07');
		expect(card?.updated).toBe('2026-09-07');
		expect(card?.links).toEqual(['KEEL-11']);
	});

	it('reads the Updated header and takes state from the column, not the text', () => {
		const path = 'sync/board/done/2026/SYNC-1-decide-microsoft-access-route.md';
		const card = parseCard(path, readFixture(path), done);
		expect(card?.state).toBe('done');
		expect(card?.column).toBe('done/{year}');
		expect(card?.type).toBe('decision');
		expect(card?.updated).toBe('2026-08-28');
		const wrongColumn = parseCard(path, readFixture(path), backlog);
		expect(wrongColumn?.state).toBe('todo');
	});

	it('collects links from Depends on and dates from Status', () => {
		const path = 'keel/board/wip/KEEL-40-a-card-in-progress.md';
		const card = parseCard(path, readFixture(path), wip);
		expect(card?.links).toEqual(['KEEL-1', 'BOARD-1']);
		expect(card?.updated).toBe('2026-09-05');
		expect(card?.state).toBe('in_progress');
	});

	it('parses header fields split on the middle dot', () => {
		const fields = parseHeaderFields('# X-1 — T\n\n**Status:** Done — cut 2026-09-02 · **Depends on:** X-2\n**Repo:** `r` · **Milestone:** M0\n\nBody **bold:** not a field\n');
		expect(fields).toEqual({ status: 'Done — cut 2026-09-02', 'depends on': 'X-2', repo: '`r`', milestone: 'M0' });
	});

	it('falls back to the slug for a title and the file name for an id', () => {
		const card = parseCard('b/backlog/ZZ-9-some-slug-here.md', 'no heading at all\n', backlog);
		expect(card?.title).toBe('Some slug here');
		expect(card?.id).toBe('ZZ-9');
	});

	it('knows which paths are cards of a board', () => {
		expect(columnOfPath('audiovisual/board', DEFAULT_COLUMNS, 'audiovisual/board/backlog/AV-4-x.md')?.dir).toBe('backlog');
		expect(columnOfPath('audiovisual/board', DEFAULT_COLUMNS, 'audiovisual/board/done/2026/AV-4-x.md')?.dir).toBe('done/{year}');
		expect(columnOfPath('audiovisual/board', DEFAULT_COLUMNS, 'audiovisual/board/BOARD.md')).toBeNull();
		expect(columnOfPath('audiovisual/board', DEFAULT_COLUMNS, 'audiovisual/board/wip/notes.md')).toBeNull();
		expect(columnOfPath('audiovisual/board', DEFAULT_COLUMNS, 'other/board/wip/AV-4-x.md')).toBeNull();
		expect(columnOfPath('', DEFAULT_COLUMNS, 'wip/AV-4-x.md')?.dir).toBe('wip');
	});
});
