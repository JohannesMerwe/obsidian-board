/**
 * SPEC-integration §C1 — workspace and project detection.
 * Workspace root of a note = nearest ancestor directory containing `keel.json`.
 * Project = first path segment below the root, if `keel.json` lists it.
 * No `keel.json` above the note ⇒ plain mode (returns null).
 */

export interface WorkspaceRef {
	/** Vault-relative directory holding `keel.json`; '' for the vault root. */
	root: string;
	name: string;
	projects: string[];
	/** The note's project, or null when the note is workspace-level. */
	project: string | null;
}

export interface WorkspaceManifests {
	/** Every `keel.json` in the vault, keyed by its directory ('' for the vault root). */
	[dir: string]: string;
}

export function parentDir(path: string): string {
	const index = path.lastIndexOf('/');
	return index < 0 ? '' : path.slice(0, index);
}

export function relativeTo(root: string, path: string): string {
	if (root === '') return path;
	return path.startsWith(root + '/') ? path.slice(root.length + 1) : path;
}

export function parseKeelJson(text: string): { name: string; projects: string[] } {
	try {
		const raw = JSON.parse(text) as { name?: unknown; projects?: unknown };
		const projects = Array.isArray(raw.projects)
			? raw.projects
					.map((p: unknown) => (p && typeof p === 'object' ? (p as { name?: unknown }).name : undefined))
					.filter((n): n is string => typeof n === 'string')
			: [];
		return { name: typeof raw.name === 'string' ? raw.name : '', projects };
	} catch {
		return { name: '', projects: [] };
	}
}

/** Detect the workspace of a vault path from the manifests found in the vault. */
export function detectWorkspace(path: string, manifests: WorkspaceManifests): WorkspaceRef | null {
	let dir = parentDir(path);
	for (;;) {
		const text = manifests[dir];
		if (text !== undefined) {
			const { name, projects } = parseKeelJson(text);
			const first = relativeTo(dir, path).split('/')[0] ?? '';
			const project = projects.includes(first) && relativeTo(dir, path).includes('/') ? first : null;
			return { root: dir, name, projects, project };
		}
		if (dir === '') return null;
		dir = parentDir(dir);
	}
}
