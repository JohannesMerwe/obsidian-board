/**
 * Card ids (SPEC-integration §C4). Grammar: `^[A-Z][A-Z0-9]{1,7}-\d+$`.
 * A card file is `<PREFIX>-<N>-<slug>.md` inside its column directory.
 */

export const ID_PATTERN = /^[A-Z][A-Z0-9]{1,7}-\d+$/;
const ID_IN_TEXT = /\b([A-Z][A-Z0-9]{1,7})-(\d+)\b/g;
const CARD_FILE = /^([A-Z][A-Z0-9]{1,7})-(\d+)(?:-(.*))?\.md$/;

export interface ParsedId {
	id: string;
	prefix: string;
	number: number;
}

export function parseId(text: string): ParsedId | null {
	const trimmed = text.trim();
	if (!ID_PATTERN.test(trimmed)) return null;
	const dash = trimmed.indexOf('-');
	return { id: trimmed, prefix: trimmed.slice(0, dash), number: Number(trimmed.slice(dash + 1)) };
}

/** Every id mentioned in a piece of text, in order, deduplicated. */
export function idsInText(text: string): string[] {
	const found: string[] = [];
	for (const match of text.matchAll(ID_IN_TEXT)) {
		const id = `${match[1] ?? ''}-${match[2] ?? ''}`;
		if (!found.includes(id)) found.push(id);
	}
	return found;
}

export interface CardFileName extends ParsedId {
	slug: string;
}

/** Parse `<PREFIX>-<N>-<slug>.md` (the basename only). */
export function parseCardFileName(name: string): CardFileName | null {
	const match = CARD_FILE.exec(name);
	if (!match) return null;
	const prefix = match[1] ?? '';
	const number = Number(match[2]);
	return { id: `${prefix}-${number}`, prefix, number, slug: match[3] ?? '' };
}

/** Lower-case, ASCII, hyphen-separated; what the existing cards use. */
export function slugify(title: string): string {
	return title
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
		.replace(/-+$/g, '');
}

export function cardFileName(id: string, title: string): string {
	const slug = slugify(title);
	return slug ? `${id}-${slug}.md` : `${id}.md`;
}
