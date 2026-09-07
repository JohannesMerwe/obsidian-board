import { describe, expect, it } from 'vitest';
import { detectWorkspace, type WorkspaceManifests } from './workspace';
import { readFixture } from './test-helpers';

const manifests: WorkspaceManifests = {
	'': readFixture('keel.json'),
	'nested/inner': '{"name":"inner","projects":[{"name":"p"}]}',
};

describe('workspace detection (§C1)', () => {
	it('finds the nearest keel.json and the project below it', () => {
		const ref = detectWorkspace('audiovisual/board/backlog/AV-4-async-transcription-jobs.md', manifests);
		expect(ref?.root).toBe('');
		expect(ref?.name).toBe('fixture');
		expect(ref?.project).toBe('audiovisual');
	});

	it('treats notes outside a listed project as workspace-level', () => {
		expect(detectWorkspace('reference/notes.md', manifests)?.project).toBeNull();
		expect(detectWorkspace('INDEX.md', manifests)?.project).toBeNull();
	});

	it('prefers the nearer manifest', () => {
		const ref = detectWorkspace('nested/inner/p/card.md', manifests);
		expect(ref?.root).toBe('nested/inner');
		expect(ref?.project).toBe('p');
		expect(detectWorkspace('nested/inner/p', manifests)?.project).toBeNull();
	});

	it('is plain mode without any manifest above', () => {
		expect(detectWorkspace('plain/notes/README.md', { 'elsewhere': '{}' })).toBeNull();
	});
});
