import type { Block } from "anquar-core";

export interface SearchChapter {
	blocks: readonly Block[];
	index: number;
	title: string;
}

interface Entry {
	chapterIndex: number;
	/** Where a match in it is in the book: a block's id, taking the match's offset, or a list item's place. */
	id: string;
	list: boolean;
	/** For each folded character, the source character it came from; null where the two line up. */
	map: number[] | null;
	source: string;
}

export interface BookIndex {
	entries: Entry[];
	/** Every entry's folded text, end to end, so one indexOf runs over the whole book. */
	hay: string;
	starts: Int32Array;
	titles: Map<number, string>;
}

export interface SearchHit {
	chapterIndex: number;
	end: number;
	entry: number;
	/** A card id findCardHolding takes to the card holding the match. */
	place: string;
	start: number;
}

export interface SearchResult {
	hits: SearchHit[];
	/** Every match, past the hits kept. */
	total: number;
}

// Between entries, so no match runs from one paragraph into the next.
const SEP = "\u0000";

const LIKE: Record<string, string> = {
	"‘": "'",
	"’": "'",
	ʼ: "'",
	"“": '"',
	"”": '"',
	"‐": "-",
	"‑": "-",
	"–": "-",
	"—": "-",
	"­": "",
};

const MARKS = /\p{M}/gu;
const SPACE = /\s/;

const folded = new Map<string, string>();
function foldChar(c: string): string {
	let f = folded.get(c);
	if (f === undefined) {
		f = LIKE[c] ?? c.toLowerCase().normalize("NFKD").replace(MARKS, "");
		if (f.length === 1 && SPACE.test(f)) f = " ";
		folded.set(c, f);
	}
	return f;
}

const identity = (length: number) => Array.from({ length }, (_, i) => i);

// Printable ASCII with single spaces folds by lowercasing alone.
const PLAIN = /[^\x20-\x7E]| {2}/;

/** Text as search compares it: no case, no accents, straight quotes and dashes, one space for any run of them. */
export function fold(text: string): { text: string; map: number[] | null } {
	if (!PLAIN.test(text)) return { text: text.toLowerCase(), map: null };
	let out = "";
	// Made only once the folded text drifts from the source.
	let map: number[] | null = null;
	let space = false;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		const f =
			code >= 128 || code < 32
				? foldChar(text[i])
				: code >= 65 && code <= 90
					? String.fromCharCode(code + 32)
					: text[i];
		if (f === " ") {
			if (space) {
				map ??= identity(out.length);
				continue;
			}
			space = true;
		} else space = false;
		if (f.length !== 1) map ??= identity(out.length);
		if (map) for (let k = 0; k < f.length; k++) map.push(i);
		out += f;
	}
	return { text: out, map };
}

export function indexBook(chapters: readonly SearchChapter[]): BookIndex {
	const entries: Entry[] = [];
	const parts: string[] = [];
	const starts: number[] = [];
	const titles = new Map<number, string>();
	let at = 0;
	const add = (
		chapterIndex: number,
		id: string,
		source: string,
		list: boolean,
	) => {
		const { text, map } = fold(source);
		entries.push({ chapterIndex, id, list, map, source });
		starts.push(at);
		parts.push(text, SEP);
		at += text.length + 1;
	};
	for (const chapter of chapters) {
		titles.set(chapter.index, chapter.title);
		for (const block of chapter.blocks) {
			if (block.type === "text" || block.type === "heading")
				add(chapter.index, block.id, block.content, false);
			else if (block.type === "list")
				block.items.forEach((item, i) => {
					add(chapter.index, `${block.id}#${i}`, item.content, true);
				});
		}
	}
	return {
		entries,
		hay: parts.join(""),
		starts: Int32Array.from(starts),
		titles,
	};
}

/** Folded, and too short to be worth a book full of matches: one Latin letter. */
export function searchTerm(query: string): string {
	const term = fold(query.trim()).text;
	return term.length >= 2 || /[^ -\u024F]/.test(term) ? term : "";
}

function entryAt(starts: Int32Array, pos: number): number {
	let lo = 0;
	let hi = starts.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (starts[mid] <= pos) lo = mid;
		else hi = mid - 1;
	}
	return lo;
}

export function searchBook(
	index: BookIndex,
	query: string,
	keep = 1000,
): SearchResult {
	const term = searchTerm(query);
	const hits: SearchHit[] = [];
	if (!term) return { hits, total: 0 };
	let total = 0;
	for (
		let pos = index.hay.indexOf(term);
		pos >= 0;
		pos = index.hay.indexOf(term, pos + term.length)
	) {
		total++;
		if (hits.length >= keep) continue;
		const e = entryAt(index.starts, pos);
		const entry = index.entries[e];
		const from = pos - index.starts[e];
		const to = from + term.length;
		const start = entry.map ? entry.map[from] : from;
		const end = !entry.map
			? to
			: to < entry.map.length
				? entry.map[to]
				: entry.source.length;
		hits.push({
			chapterIndex: entry.chapterIndex,
			end,
			entry: e,
			place: entry.list ? entry.id : `${entry.id}@${start}`,
			start,
		});
	}
	return { hits, total };
}

/** The match with a few words either side, cut at a word, for a result's line. */
export function snippetOf(
	index: BookIndex,
	hit: SearchHit,
	around = 60,
): { before: string; match: string; after: string } {
	const text = index.entries[hit.entry].source;
	let from = Math.max(0, hit.start - around);
	let to = Math.min(text.length, hit.end + around);
	if (from > 0) {
		const space = text.indexOf(" ", from);
		if (space >= 0 && space < hit.start) from = space + 1;
	}
	if (to < text.length) {
		const space = text.lastIndexOf(" ", to);
		if (space > hit.end) to = space;
	}
	const squash = (s: string) => s.replace(/\s+/g, " ");
	return {
		before:
			(from > 0 ? "…" : "") + squash(text.slice(from, hit.start)).trimStart(),
		match: squash(text.slice(hit.start, hit.end)),
		after:
			squash(text.slice(hit.end, to)).trimEnd() + (to < text.length ? "…" : ""),
	};
}

/** Every match of the query in a card on the page, for the highlight it lands with. */
export function matchRanges(root: Node, query: string): Range[] {
	const term = searchTerm(query);
	if (!term) return [];
	const nodes: Text[] = [];
	const offsets: number[] = [];
	let raw = "";
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		nodes.push(node as Text);
		offsets.push(raw.length);
		raw += (node as Text).data;
	}
	const { text, map } = fold(raw);
	const starts = Int32Array.from(offsets);
	const at = (i: number) => {
		const n = entryAt(starts, i);
		return [nodes[n], i - offsets[n]] as const;
	};
	const ranges: Range[] = [];
	for (
		let pos = text.indexOf(term);
		pos >= 0;
		pos = text.indexOf(term, pos + term.length)
	) {
		const first = map ? map[pos] : pos;
		const last = map ? map[pos + term.length - 1] : pos + term.length - 1;
		const [startNode, start] = at(first);
		const [endNode, end] = at(last);
		const range = document.createRange();
		range.setStart(startNode, start);
		range.setEnd(endNode, end + 1);
		ranges.push(range);
	}
	return ranges;
}
