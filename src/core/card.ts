/**
 * A card file, read in either shape (SPEC-integration §C3):
 *  - frontmatter: `id, title, state, column, type, created, updated, links`
 *  - header: pre-migration `# ID — Title` plus `**Key:** value · **Key:** value` lines
 * State always follows the column the file sits in; the file location is the truth.
 */

import type { BoardColumn, CardState } from './manifest';
import { columnForDir } from './manifest';
import { idsInText, parseCardFileName, parseId } from './ids';
import { getList, getString, splitFrontmatter, type FrontmatterEntry } from './frontmatter';
import { parentDir, relativeTo } from './workspace';

export type CardShape = 'frontmatter' | 'header';

export interface Card {
	id: string;
	prefix: string;
	number: number;
	title: string;
	state: CardState;
	/** The column's `dir` from the manifest (e.g. `done/{year}`). */
	column: string;
	type: string | null;
	created: string | null;
	updated: string | null;
	links: string[];
	/** Vault path of the file. */
	path: string;
	shape: CardShape;
	/** Frontmatter entries as read (frontmatter shape only). */
	entries: FrontmatterEntry[] | null;
}

export interface HeaderFields {
	[key: string]: string;
}

const DATE = /\d{4}-\d{2}-\d{2}/g;

/** Basename of a vault path. */
export function baseName(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}

/** Is this path a card file for the board? Returns its column when so. */
export function columnOfPath(boardDir: string, columns: readonly BoardColumn[], path: string): BoardColumn | null {
	if (!path.endsWith('.md')) return null;
	if (boardDir !== '' && !path.startsWith(boardDir + '/')) return null;
	const relative = relativeTo(boardDir, path);
	const dir = parentDir(relative);
	if (dir === '') return null;
	if (!parseCardFileName(baseName(path))) return null;
	return columnForDir(columns, dir) ?? null;
}

/** `**Key:** value · **Key:** value` lines directly after the H1, keys lower-cased. */
export function parseHeaderFields(body: string): HeaderFields {
	const fields: HeaderFields = {};
	const lines = body.split(/\r?\n/);
	let seenHeading = false;
	let inHeader = false;
	for (const line of lines) {
		if (!seenHeading) {
			if (/^#\s/.test(line)) seenHeading = true;
			continue;
		}
		if (line.trim() === '') {
			if (inHeader) break;
			continue;
		}
		if (!line.startsWith('**')) {
			if (inHeader) break;
			// Something else before any header line: no header block.
			break;
		}
		inHeader = true;
		for (const match of line.matchAll(/\*\*([^*]+?):\*\*\s*([^]*?)(?=\s*·\s*\*\*[^*]+?:\*\*|$)/g)) {
			const key = (match[1] ?? '').trim().toLowerCase();
			if (key && fields[key] === undefined) fields[key] = (match[2] ?? '').trim();
		}
	}
	return fields;
}

/** Title from `# ID — Title` (or `# Title`), else null. */
export function parseHeading(body: string, id: string): string | null {
	const match = /^#\s+(.+?)\s*$/m.exec(body);
	if (!match) return null;
	const heading = (match[1] ?? '').trim();
	const stripped = heading.replace(new RegExp(`^\`?${id}\`?\\s*(?:—|–|-|:)\\s*`), '');
	return stripped || heading;
}

function lastDate(text: string | undefined): string | null {
	if (!text) return null;
	const dates = text.match(DATE);
	return dates && dates.length > 0 ? (dates[dates.length - 1] ?? null) : null;
}

function firstDate(text: string | undefined): string | null {
	if (!text) return null;
	const dates = text.match(DATE);
	return dates && dates.length > 0 ? (dates[0] ?? null) : null;
}

function deslug(slug: string): string {
	const words = slug.replace(/-+/g, ' ').trim();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Parse a card. `column` is where the file sits; it decides `state` and `column`
 * regardless of what the text says.
 */
export function parseCard(path: string, text: string, column: BoardColumn): Card | null {
	const fileName = parseCardFileName(baseName(path));
	if (!fileName) return null;
	const { entries, body } = splitFrontmatter(text);
	const fmId = entries ? parseId(getString(entries, 'id') ?? '') : null;
	const id = fmId ?? fileName;
	const base = {
		id: id.id,
		prefix: id.prefix,
		number: id.number,
		state: column.state,
		column: column.dir,
		path,
	};

	if (entries) {
		const title = getString(entries, 'title') ?? parseHeading(body, id.id) ?? deslug(fileName.slug);
		const links = getList(entries, 'links').filter((l) => parseId(l) && l !== id.id);
		return {
			...base,
			title,
			type: getString(entries, 'type') || null,
			created: getString(entries, 'created') || null,
			updated: getString(entries, 'updated') || null,
			links,
			shape: 'frontmatter',
			entries,
		};
	}

	const fields = parseHeaderFields(body);
	const title = parseHeading(body, id.id) ?? deslug(fileName.slug);
	const created = firstDate(fields.created) ?? null;
	const updated = firstDate(fields.updated) ?? lastDate(fields.status) ?? created;
	const linkText = ['depends on', 'parent', 'gates', 'blocks', 'blocked by', 'links']
		.map((k) => fields[k] ?? '')
		.join(' ');
	const links = idsInText(linkText).filter((l) => l !== id.id);
	return {
		...base,
		title,
		type: fields.type ? fields.type.toLowerCase() : null,
		created,
		updated,
		links,
		shape: 'header',
		entries: null,
	};
}
