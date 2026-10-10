import { shiftDay } from "./reading.ts";

// What Explain told you, kept so it can come back. A kept word waits a day, then each right answer sends it
// further off; a wrong one brings it back tomorrow, and five right in a row and it's known.
export const INTERVALS = [1, 3, 7, 16, 35];
export const KNOWN = INTERVALS.length;
// A minute's review, never a pile.
export const PER_DAY = 5;
// The sentence a word is kept in, cut to about this when the sentence runs on.
const SENTENCE_MAX = 320;

export interface Kept {
	id?: number;
	askedAt: string;
	/** The words asked about, as phrases; none for a passage asked about whole. */
	focus: string[];
	gist: string;
	/** "" once it's known. */
	dueOn: string;
	step: number;
}

export const isPassage = (k: Pick<Kept, "focus">) => k.focus.length === 0;

export const termOf = (focus: readonly string[]) => focus.join(", ");

export function firstDue(today: string): { step: number; dueOn: string } {
	return { step: 0, dueOn: shiftDay(today, INTERVALS[0]) };
}

export function graded(
	kept: Pick<Kept, "step">,
	right: boolean,
	today: string,
): { step: number; dueOn: string } {
	if (!right) return firstDue(today);
	const step = kept.step + 1;
	return { step, dueOn: step >= KNOWN ? "" : shiftDay(today, INTERVALS[step]) };
}

export function dueWords<T extends Kept>(
	all: readonly T[],
	today: string,
	limit = PER_DAY,
): T[] {
	return all
		.filter((k) => k.dueOn !== "" && k.dueOn <= today)
		.sort(
			(a, b) =>
				a.dueOn.localeCompare(b.dueOn) || a.askedAt.localeCompare(b.askedAt),
		)
		.slice(0, limit);
}

const same = (a: string, b: string) =>
	a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Three meanings to choose from: the word's own and two other kept words' gists. A passage, or too few other
 * words to choose from, has none, and is asked as Show me / Knew it instead.
 */
export function choicesFor<T extends Kept>(
	kept: T,
	pool: readonly T[],
	random: () => number = Math.random,
): { options: string[]; answer: number } | undefined {
	if (isPassage(kept)) return;
	const others = pool.filter(
		(k) =>
			k !== kept &&
			!isPassage(k) &&
			!same(k.gist, kept.gist) &&
			!same(termOf(k.focus), termOf(kept.focus)),
	);
	const wrong = shuffle(
		[...new Map(others.map((k) => [k.gist.toLowerCase(), k.gist])).values()],
		random,
	).slice(0, 2);
	if (wrong.length < 2) return;
	const options = shuffle([kept.gist, ...wrong], random);
	return { options, answer: options.indexOf(kept.gist) };
}

function shuffle<T>(list: T[], random: () => number): T[] {
	const out = [...list];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** The sentence the words were asked in, out of the card or selection they were asked in. */
export function sentenceAround(text: string, focus: readonly string[]): string {
	const clean = text.replace(/\s+/g, " ").trim();
	const want = focus.map((f) => f.toLowerCase());
	if (want.length === 0) return clean;
	const sentences = [
		...new Intl.Segmenter("en", { granularity: "sentence" }).segment(clean),
	].map((s) => s.segment.trim());
	const has = (s: string, w: string) => s.toLowerCase().includes(w);
	const found =
		sentences.find((s) => want.every((w) => has(s, w))) ??
		sentences.find((s) => want.some((w) => has(s, w)));
	if (!found) return clip(clean, 0);
	return found.length <= SENTENCE_MAX
		? found
		: clip(
				found,
				found.toLowerCase().indexOf(want.find((w) => has(found, w)) ?? ""),
			);
}

// A long sentence cut to the part around the word, at word breaks.
function clip(text: string, at: number): string {
	if (text.length <= SENTENCE_MAX) return text;
	let from = Math.max(0, at - SENTENCE_MAX / 2);
	let to = Math.min(text.length, from + SENTENCE_MAX);
	from = Math.max(0, to - SENTENCE_MAX);
	if (from > 0) from = text.indexOf(" ", from) + 1;
	if (to < text.length) to = text.lastIndexOf(" ", to);
	return `${from > 0 ? "…" : ""}${text.slice(from, to).trim()}${to < text.length ? "…" : ""}`;
}

/** The sentence in pieces, with each place a phrase asked about marked, for setting it with the words lit. */
export function marked(
	sentence: string,
	focus: readonly string[],
): { text: string; mark: boolean }[] {
	const lower = sentence.toLowerCase();
	const spans: [number, number][] = [];
	for (const phrase of focus) {
		const want = phrase.toLowerCase();
		if (!want) continue;
		for (
			let at = lower.indexOf(want);
			at >= 0;
			at = lower.indexOf(want, at + want.length)
		)
			spans.push([at, at + want.length]);
	}
	spans.sort((a, b) => a[0] - b[0]);
	const pieces: { text: string; mark: boolean }[] = [];
	let at = 0;
	for (const [from, to] of spans) {
		if (from < at) continue;
		if (from > at) pieces.push({ text: sentence.slice(at, from), mark: false });
		pieces.push({ text: sentence.slice(from, to), mark: true });
		at = to;
	}
	if (at < sentence.length)
		pieces.push({ text: sentence.slice(at), mark: false });
	return pieces;
}
