import { describe, expect, it } from 'vitest';
import { findWorkspace, type VaultFiles } from './workspace';
import { readFixture } from './test-helpers';

const texts: Record<string, string> = {
	'keel.json': readFixture('keel.json'),
	'nested/inner/keel.json': '{"name":"inner","projects":[{"name":"p"}]}',
};
const files: VaultFiles = {
	exists: (path) => path in texts,
	read: (path) => texts[path] ?? null,
};

describe('workspace detection (§C1, copied from obsidian-open-questions)', () => {
	it('finds the nearest keel.json and the project below it', () => {
		const ref = findWorkspace('audiovisual/board/backlog/AV-4-async-transcription-jobs.md', files);
		expect(ref?.root).toBe('');
		expect(ref?.name).toBe('fixture');
		expect(ref?.project).toBe('audiovisual');
	});

	it('treats notes outside a listed project as workspace-level', () => {
		expect(findWorkspace('reference/notes.md', files)?.project).toBeNull();
		expect(findWorkspace('INDEX.md', files)?.project).toBeNull();
	});

	it('prefers the nearer manifest', () => {
		const ref = findWorkspace('nested/inner/p/card.md', files);
		expect(ref?.root).toBe('nested/inner');
		expect(ref?.project).toBe('p');
		expect(findWorkspace('nested/inner/p', files)?.project).toBeNull();
	});

	it('is plain mode without any manifest above', () => {
		expect(findWorkspace('plain/notes/README.md', { exists: () => false, read: () => null })).toBeNull();
	});
});
