const EDGE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

// The words of what was selected, a chip each: split on spaces, and on the dashes that join words without
// one, with the punctuation around each word left off.
export const wordsOf = (text: string) =>
	text
		.split(/\s+|[—–]/)
		.map((word) => word.replace(EDGE, ""))
		.filter(Boolean);

// The picked words in the passage's order, words that sit together read as one phrase.
export function phrasesOf(words: string[], picked: number[]): string[] {
	const runs: number[][] = [];
	for (const i of [...picked].sort((a, b) => a - b)) {
		const run = runs.at(-1);
		if (run && run.at(-1) === i - 1) run.push(i);
		else runs.push([i]);
	}
	return runs.map((run) => run.map((i) => words[i]).join(" "));
}

// An answer's first line is its gist and the rest its detail, whatever markdown or numbering the model
// added despite being asked not to.
export function answerParts(text: string) {
	const clean = text
		.replace(/\*\*|__/g, "")
		.replace(/^[ \t]*(#+|\d+[.)])[ \t]*/gm, "")
		.trimStart();
	const at = clean.indexOf("\n");
	return at < 0
		? { gist: clean.trim(), detail: "" }
		: { gist: clean.slice(0, at).trim(), detail: clean.slice(at).trim() };
}
