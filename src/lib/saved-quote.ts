// A whole card is saved as its first 280 characters, which can stop mid-word; shared, it ends at its last
// whole sentence instead, or its last whole word and an ellipsis when no sentence ends early enough.
export const SNIPPET_CHARS = 280;
export function savedQuote(snippet: string, wholeCard: boolean): string {
	const text = snippet.trim();
	if (!wholeCard || snippet.length < SNIPPET_CHARS) return text;
	const ends = [...text.matchAll(/[.!?…]["”’)]?(?=\s)/g)];
	const last = ends.at(-1);
	if (last?.index !== undefined && last.index > text.length / 3)
		return text.slice(0, last.index + last[0].length);
	return `${text.slice(0, text.lastIndexOf(" ")).replace(/[\s,;:—–-]+$/, "")}…`;
}
