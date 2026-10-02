import { describe, expect, it } from "vitest";
import { answerParts, phrasesOf, wordsOf } from "./explain-words";

describe("wordsOf", () => {
	it("splits on spaces and leaves the punctuation off", () => {
		expect(wordsOf("“Call me Ishmael.”  Some years ago,")).toEqual([
			"Call",
			"me",
			"Ishmael",
			"Some",
			"years",
			"ago",
		]);
	});

	it("splits on dashes that join words, not on hyphens or apostrophes", () => {
		expect(wordsOf("hats off—then, a well-known people’s")).toEqual([
			"hats",
			"off",
			"then",
			"a",
			"well-known",
			"people’s",
		]);
	});

	it("drops what is only punctuation", () => {
		expect(wordsOf("so — … “ ”")).toEqual(["so"]);
	});
});

describe("phrasesOf", () => {
	const words = ["my", "hypos", "get", "such", "an", "upper", "hand"];

	it("joins words that sit together into one phrase", () => {
		expect(phrasesOf(words, [6, 5])).toEqual(["upper hand"]);
	});

	it("keeps words apart that are apart, in the passage's order", () => {
		expect(phrasesOf(words, [5, 1, 6])).toEqual(["hypos", "upper hand"]);
	});
});

describe("answerParts", () => {
	it("takes the first line as the gist", () => {
		expect(answerParts("Low spirits.\n\nShort for hypochondria.")).toEqual({
			gist: "Low spirits.",
			detail: "Short for hypochondria.",
		});
	});

	it("is all gist until the first line ends", () => {
		expect(answerParts("Low spir")).toEqual({ gist: "Low spir", detail: "" });
	});

	it("strips markdown and numbering", () => {
		expect(answerParts("1. **Low spirits.**\n2. Short for it.")).toEqual({
			gist: "Low spirits.",
			detail: "Short for it.",
		});
	});
});
