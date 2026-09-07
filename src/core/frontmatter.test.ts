import { describe, expect, it } from 'vitest';
import { getList, getString, serializeFrontmatter, setEntry, splitFrontmatter } from './frontmatter';

const doc = `---
id: KB-1
title: Read a board directory into a model
state: todo
column: backlog
type: feature
created: 2026-09-07
updated: 2026-09-07
links: [KB-2, KQ-1]
sprint: "S1: kickoff"
tags:
  - alpha
  - beta
---

# KB-1 — Read a board directory into a model
`;

describe('frontmatter subset', () => {
	it('splits and reads scalars, flow lists and block lists', () => {
		const { entries, body } = splitFrontmatter(doc);
		expect(entries).not.toBeNull();
		if (!entries) return;
		expect(getString(entries, 'id')).toBe('KB-1');
		expect(getList(entries, 'links')).toEqual(['KB-2', 'KQ-1']);
		expect(getString(entries, 'sprint')).toBe('S1: kickoff');
		expect(getList(entries, 'tags')).toEqual(['alpha', 'beta']);
		expect(body.startsWith('\n# KB-1')).toBe(true);
	});

	it('returns no entries for a document without frontmatter or with an unclosed block', () => {
		expect(splitFrontmatter('# Title\n').entries).toBeNull();
		expect(splitFrontmatter('---\nid: X\n').entries).toBeNull();
	});

	it('round-trips, keeps unknown keys in order and quotes only when needed', () => {
		const { entries } = splitFrontmatter(doc);
		if (!entries) throw new Error('no entries');
		const updated = setEntry(setEntry(entries, 'column', 'done/{year}'), 'updated', '2026-09-08');
		const text = serializeFrontmatter(updated);
		expect(text).toBe(`---
id: KB-1
title: Read a board directory into a model
state: todo
column: done/{year}
type: feature
created: 2026-09-07
updated: 2026-09-08
links: [KB-2, KQ-1]
sprint: "S1: kickoff"
tags: [alpha, beta]
---
`);
		expect(serializeFrontmatter([{ key: 'title', value: '' }, { key: 'n', value: '12' }, { key: 'x', value: 'no' }])).toBe(
			'---\ntitle: ""\nn: "12"\nx: "no"\n---\n',
		);
	});
});
