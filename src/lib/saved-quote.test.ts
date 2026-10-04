import { describe, expect, it } from "vitest";
import { SNIPPET_CHARS, savedQuote } from "./saved-quote";

const cut = (text: string) => text.slice(0, SNIPPET_CHARS);

describe("savedQuote", () => {
	it("keeps a picked passage whole", () => {
		const passage = "x".repeat(400);
		expect(savedQuote(passage, false)).toBe(passage);
	});

	it("keeps a card shorter than a snippet whole", () => {
		expect(savedQuote("A short card, ending mid", true)).toBe(
			"A short card, ending mid",
		);
	});

	it("ends a cut card at its last whole sentence", () => {
		const card = cut(
			`It rained all day. ${"She waited by the door. ".repeat(12)}`,
		);
		expect(savedQuote(card, true)).toMatch(/door\.$/);
	});

	it("ends at a whole word with an ellipsis when no sentence ends early enough", () => {
		const card = cut(
			`One long sentence, ${"and then another clause ".repeat(20)}`,
		);
		const quote = savedQuote(card, true);
		expect(quote.endsWith("…")).toBe(true);
		expect(card.startsWith(quote.slice(0, -1))).toBe(true);
		expect(quote.at(-2)).not.toBe(" ");
	});
});
