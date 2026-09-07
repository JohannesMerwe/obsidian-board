import { describe, expect, it } from 'vitest';
import { parseCard } from './card';
import { DEFAULT_COLUMNS } from './manifest';
import { planMove } from './move';
import { readFixture } from './test-helpers';

const [backlog, wip, done] = DEFAULT_COLUMNS;
if (!backlog || !wip || !done) throw new Error('defaults');
const board = { dir: 'board-plugin/board', manifestPath: 'board-plugin/board/board.json' };

describe('moving a card (§C3)', () => {
	it('moves a frontmatter card into a {year} column, touching only column, state, updated', () => {
		const path = 'board-plugin/board/backlog/KB-1-read-a-board-directory-into-a-model.md';
		const text = readFixture(path);
		const card = parseCard(path, text, backlog);
		if (!card) throw new Error('no card');
		const plan = planMove(board, card, done, '2026-09-08');
		expect(plan.toPath).toBe('board-plugin/board/done/2026/KB-1-read-a-board-directory-into-a-model.md');
		const out = plan.rewrite(text);
		expect(out).toBe(
			text
				.replace('state: todo', 'state: done')
				.replace('column: backlog', 'column: done/{year}')
				.replace('updated: 2026-09-07', 'updated: 2026-09-08'),
		);
	});

	it('gives a header-shape card frontmatter and leaves its body alone', () => {
		const path = 'audiovisual/board/backlog/AV-4-async-transcription-jobs.md';
		const text = readFixture(path);
		const card = parseCard(path, text, backlog);
		if (!card) throw new Error('no card');
		const plan = planMove({ dir: 'audiovisual/board', manifestPath: null }, card, wip, '2026-09-08');
		expect(plan.toPath).toBe('audiovisual/board/wip/AV-4-async-transcription-jobs.md');
		const out = plan.rewrite(text);
		expect(out).toBe(`---
id: AV-4
title: Async transcription jobs
state: in_progress
column: wip
updated: 2026-09-08
links: []
---
${text}`);
	});

	it('handles a board at the vault root', () => {
		const card = parseCard('backlog/XX-1-a.md', '# XX-1 — A\n', backlog);
		if (!card) throw new Error('no card');
		expect(planMove({ dir: '', manifestPath: null }, card, wip, '2026-09-08').toPath).toBe('wip/XX-1-a.md');
	});
});
