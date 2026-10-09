import type { Block } from "anquar-core";
import { PHONE_LAYOUT, paginate } from "anquar-core";
import { parseEpub } from "anquar-core/node";
import { describe, expect, it } from "vitest";
import {
	fold,
	indexBook,
	matchRanges,
	type SearchChapter,
	searchBook,
	snippetOf,
} from "./book-search.ts";
import { findCardHolding } from "./card-layout.ts";
import { shapeStarter } from "./starter.ts";

const text = (
	chapterIndex: number,
	position: number,
	content: string,
): Block => ({
	id: `c${chapterIndex}-${position}`,
	chapterIndex,
	position,
	charCount: content.length,
	type: "text",
	content,
	runs: [{ text: content, bold: false, italic: false }],
});

const book: SearchChapter[] = [
	{
		index: 0,
		title: "Loomings",
		blocks: [
			text(0, 0, "Call me Ishmael. Some years ago—never mind how long."),
			text(0, 1, "It is a way I have of driving off the spleen."),
		],
	},
	{
		index: 1,
		title: "The Carpet-Bag",
		blocks: [
			text(1, 0, "I stuffed a shirt or two into my old carpet-bag."),
			{
				id: "c1-1",
				chapterIndex: 1,
				position: 1,
				charCount: 20,
				type: "list",
				ordered: false,
				start: 1,
				items: [
					{ content: "a shirt", runs: [], depth: 0 },
					{ content: "the Café’s   bill", runs: [], depth: 0 },
				],
			},
		],
	},
];

describe("fold", () => {
	it("drops case and accents and straightens quotes", () => {
		expect(fold("Café’s “Naïve” — DON’T").text).toBe(`cafe's "naive" - don't`);
	});

	it("keeps each character's source where the two drift apart", () => {
		const { text, map } = fold("a  é");
		expect(text).toBe("a e");
		expect(map).toEqual([0, 1, 3]);
	});

	it("leaves plain text aligned", () => {
		expect(fold("Call me").map).toBeNull();
	});
});

describe("searchBook", () => {
	const index = indexBook(book);

	it("finds every match, in the book's order", () => {
		const { hits, total } = searchBook(index, "shirt");
		expect(total).toBe(2);
		expect(hits.map((h) => h.place)).toEqual(["c1-0@12", "c1-1#0"]);
	});

	it("matches across case, accents and quotes", () => {
		const [hit] = searchBook(index, "cafe's bill").hits;
		expect(hit.place).toBe("c1-1#1");
		expect(snippetOf(index, hit).match).toBe("Café’s bill");
	});

	it("never runs a match from one paragraph into the next", () => {
		expect(searchBook(index, "long. it").total).toBe(0);
	});

	it("asks for more than one Latin letter", () => {
		expect(searchBook(index, "a").total).toBe(0);
		expect(searchBook(index, " ").total).toBe(0);
	});

	it("counts past the hits it keeps", () => {
		const many = searchBook(index, "in", 1);
		expect(many.hits).toHaveLength(1);
		expect(many.total).toBeGreaterThan(1);
	});

	it("cuts a snippet at a word", () => {
		const [hit] = searchBook(index, "spleen").hits;
		expect(snippetOf(index, hit, 12)).toEqual({
			before: "…off the ",
			match: "spleen",
			after: ".",
		});
	});
});

describe("matchRanges", () => {
	it("finds a match across a styled run", () => {
		const root = document.createElement("section");
		root.innerHTML = "<p>Call me <em>Ishmael</em>. Then <b>Ish</b>mael</p>";
		const ranges = matchRanges(root, "me ishmael");
		expect(ranges.map((r) => r.toString())).toEqual(["me Ishmael"]);
		expect(matchRanges(root, "ishmael")).toHaveLength(2);
	});
});

// The real file: every match lands on a card that holds it, and a long book stays fast.
describe("searchBook on public/books/meditations.epub", async () => {
	const meditations = shapeStarter(
		await parseEpub("public/books/meditations.epub"),
	);
	const index = indexBook(meditations.chapters);
	const cards = paginate(meditations.chapters, PHONE_LAYOUT);
	const cardText = (i: number) =>
		fold(
			cards[i].blocks
				.map((b) =>
					b.type === "list"
						? b.items.map((it) => it.content).join(" ")
						: "content" in b
							? b.content
							: "",
				)
				.join(" "),
		).text;

	it("lands each match on a card holding it", () => {
		for (const word of ["providence", "reason", "nature of the universe"]) {
			const { hits } = searchBook(index, word);
			expect(hits.length).toBeGreaterThan(0);
			for (const hit of hits) {
				const i = findCardHolding(cards, hit.place);
				expect(cardText(i)).toContain(word);
			}
		}
	});

	it("searches the whole book in a few milliseconds", () => {
		const t = performance.now();
		for (let i = 0; i < 20; i++) searchBook(index, "the");
		expect((performance.now() - t) / 20).toBeLessThan(20);
	});
});
