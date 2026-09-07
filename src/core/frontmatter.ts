/**
 * A deliberately small YAML subset: the flat frontmatter the board format uses
 * (`key: scalar`, `key: [a, b]`, `key:` followed by `- item` lines). Unknown keys
 * are kept verbatim and written back in their original order.
 */

export type FrontmatterValue = string | string[];

export interface FrontmatterEntry {
	key: string;
	value: FrontmatterValue;
}

export interface SplitDocument {
	/** Ordered entries; `null` when the document has no frontmatter block. */
	entries: FrontmatterEntry[] | null;
	/** Everything after the closing `---` (or the whole text without frontmatter). */
	body: string;
}

const FENCE = /^---[ \t]*\r?\n/;

export function splitFrontmatter(text: string): SplitDocument {
	if (!FENCE.test(text)) return { entries: null, body: text };
	const lines = text.split(/\r?\n/);
	let end = -1;
	for (let i = 1; i < lines.length; i++) {
		if (/^(---|\.\.\.)[ \t]*$/.test(lines[i] ?? '')) {
			end = i;
			break;
		}
	}
	if (end < 0) return { entries: null, body: text };
	const entries = parseEntries(lines.slice(1, end));
	const body = lines.slice(end + 1).join('\n');
	return { entries, body };
}

function parseEntries(lines: string[]): FrontmatterEntry[] {
	const entries: FrontmatterEntry[] = [];
	let current: FrontmatterEntry | null = null;
	for (const line of lines) {
		if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
		const item = /^\s*-\s+(.*)$/.exec(line);
		if (item && current) {
			const list = Array.isArray(current.value) ? current.value : [];
			list.push(unquote(item[1] ?? ''));
			current.value = list;
			continue;
		}
		const pair = /^([A-Za-z0-9_][\w.-]*)\s*:\s*(.*)$/.exec(line);
		if (!pair) continue;
		current = { key: pair[1] ?? '', value: parseScalar(pair[2] ?? '') };
		entries.push(current);
	}
	return entries;
}

function parseScalar(raw: string): FrontmatterValue {
	const trimmed = raw.trim();
	if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
		const inner = trimmed.slice(1, -1).trim();
		return inner === '' ? [] : inner.split(',').map((s) => unquote(s.trim())).filter((s) => s !== '');
	}
	return unquote(trimmed);
}

function unquote(value: string): string {
	if (value.length >= 2) {
		const first = value[0];
		if ((first === '"' || first === "'") && value.endsWith(first)) {
			const inner = value.slice(1, -1);
			return first === '"' ? inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\') : inner.replace(/''/g, "'");
		}
	}
	return value;
}

function quoteIfNeeded(value: string): string {
	if (value === '') return '""';
	const risky =
		/^[-?:,[\]{}#&*!|>'"%@`]/.test(value) ||
		/:\s|\s#/.test(value) ||
		/^\s|\s$/.test(value) ||
		/^(true|false|null|~|yes|no|on|off)$/i.test(value) ||
		/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(value) ||
		/^\d{4}-\d{2}-\d{2}T/.test(value);
	return risky ? JSON.stringify(value) : value;
}

export function serializeFrontmatter(entries: FrontmatterEntry[]): string {
	const lines = entries.map(({ key, value }) =>
		Array.isArray(value) ? `${key}: [${value.map(quoteIfNeeded).join(', ')}]` : `${key}: ${quoteIfNeeded(value)}`,
	);
	return `---\n${lines.join('\n')}\n---\n`;
}

export function getEntry(entries: FrontmatterEntry[], key: string): FrontmatterValue | undefined {
	return entries.find((e) => e.key === key)?.value;
}

export function getString(entries: FrontmatterEntry[], key: string): string | undefined {
	const value = getEntry(entries, key);
	return typeof value === 'string' ? value : undefined;
}

export function getList(entries: FrontmatterEntry[], key: string): string[] {
	const value = getEntry(entries, key);
	if (Array.isArray(value)) return value;
	if (typeof value === 'string' && value !== '') return value.split(',').map((s) => s.trim()).filter(Boolean);
	return [];
}

/** Set a key in place (keeping its position) or append it. Returns a new array. */
export function setEntry(entries: FrontmatterEntry[], key: string, value: FrontmatterValue): FrontmatterEntry[] {
	const index = entries.findIndex((e) => e.key === key);
	if (index < 0) return [...entries, { key, value }];
	return entries.map((e, i) => (i === index ? { key, value } : e));
}
