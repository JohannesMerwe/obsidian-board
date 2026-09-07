import { describe, expect, it } from 'vitest';
import { cardFileName, idsInText, parseCardFileName, parseId, slugify } from './ids';

describe('ids (§C4)', () => {
	it('accepts the grammar and rejects near misses', () => {
		expect(parseId('KB-3')).toEqual({ id: 'KB-3', prefix: 'KB', number: 3 });
		expect(parseId('BOARD-12')).toEqual({ id: 'BOARD-12', prefix: 'BOARD', number: 12 });
		expect(parseId('kb-3')).toBeNull();
		expect(parseId('K-3')).toBeNull();
		expect(parseId('TOOLONGPRE-1')).toBeNull();
		expect(parseId('KB-')).toBeNull();
	});

	it('parses card file names and tolerates a missing slug', () => {
		expect(parseCardFileName('KB-1-read-a-board-directory-into-a-model.md')).toEqual({
			id: 'KB-1',
			prefix: 'KB',
			number: 1,
			slug: 'read-a-board-directory-into-a-model',
		});
		expect(parseCardFileName('AV-13.md')?.slug).toBe('');
		expect(parseCardFileName('BOARD.md')).toBeNull();
		expect(parseCardFileName('notes.md')).toBeNull();
	});

	it('finds ids in prose, once each', () => {
		expect(idsInText('KEEL-9 (the model stays KEEL-9), ~~OQ-10~~ and BOARD-1')).toEqual(['KEEL-9', 'OQ-10', 'BOARD-1']);
	});

	it('slugifies titles the way the existing cards do', () => {
		expect(slugify('Add card with minted id, regenerate BOARD.md')).toBe('add-card-with-minted-id-regenerate-board-md');
		expect(slugify('  Résumé — v2!  ')).toBe('resume-v2');
		expect(cardFileName('KB-6', 'Hello world')).toBe('KB-6-hello-world.md');
		expect(cardFileName('KB-6', '???')).toBe('KB-6.md');
	});
});
