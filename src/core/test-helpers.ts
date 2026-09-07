// Test-only helpers: read the fixture vault from disk into the pure model's inputs.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Reader, VaultSnapshot } from './board';

export const FIXTURE_VAULT = fileURLToPath(new URL('__fixtures__/vault', import.meta.url));

export function snapshotOf(root: string): VaultSnapshot {
	const files: string[] = [];
	const folders: string[] = [];
	const walk = (dir: string, rel: string): void => {
		for (const name of readdirSync(dir)) {
			if (name.startsWith('.')) continue; // Obsidian hides dotfiles and dotfolders
			const abs = join(dir, name);
			const path = rel === '' ? name : `${rel}/${name}`;
			if (statSync(abs).isDirectory()) {
				folders.push(path);
				walk(abs, path);
			} else files.push(path);
		}
	};
	walk(root, '');
	return { files: files.sort(), folders: folders.sort() };
}

export function readerOf(root: string): Reader {
	return (path) => Promise.resolve(readFileSync(join(root, path), 'utf8'));
}

export function readFixture(path: string): string {
	return readFileSync(join(FIXTURE_VAULT, path), 'utf8');
}
