/** Vault path helpers: `/`-separated, no leading slash, '' is the vault root. */

export function parentDir(path: string): string {
	const index = path.lastIndexOf('/');
	return index < 0 ? '' : path.slice(0, index);
}

export function relativeTo(root: string, path: string): string {
	if (root === '') return path;
	return path.startsWith(root + '/') ? path.slice(root.length + 1) : path;
}

export function joinPath(dir: string, name: string): string {
	return dir === '' ? name : `${dir}/${name}`;
}
