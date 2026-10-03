import type { Block, ParsedBook, ParsedChapter } from "anquar-core";
import { parseEpub } from "anquar-core/node";
import { describe, expect, it } from "vitest";
import { shapeStarter } from "./starter";

const text = (content: string): Block => ({
	id: "",
	chapterIndex: 0,
	position: 0,
	charCount: content.length,
	type: "text",
	content,
	runs: [{ text: content, bold: false, italic: false }],
});
const heading = (content: string, level: 1 | 2 = 2): Block => ({
	id: "",
	chapterIndex: 0,
	position: 0,
	charCount: content.length,
	type: "heading",
	level,
	content,
	runs: [{ text: content, bold: false, italic: false }],
});
const chapter = (
	index: number,
	title: string,
	blocks: Block[],
): ParsedChapter => ({
	index,
	title,
	role: "body",
	blocks: blocks.map((b, position) => ({
		...b,
		id: `c${index}-${position}`,
		chapterIndex: index,
		position,
	})),
	frontMatter: false,
});

// Gutenberg's Long (pg15877) as anquar-core reads it: chapters cut by size, essays first, notes among the
// sections, books sharing chapters, indexes and the licence at the end.
const parsed: ParsedBook = {
	title: "Thoughts of Marcus Aurelius Antoninus",
	author: "Emperor of Rome Marcus Aurelius",
	chapters: [
		chapter(0, "The Project Gutenberg eBook of Thoughts", [
			heading("BIOGRAPHICAL SKETCH"),
			text("Marcus was born…"),
		]),
		chapter(1, "THE THOUGHTS", [
			heading("THE THOUGHTS", 1),
			text("[A] See Plinius H.N. ii."),
			heading("THE THOUGHTS"),
			heading("I."),
			text("From my grandfather Verus[A] [I learned] good morals."),
			text("[A] Annius Verus was his grandfather's name."),
			text(
				"If these words are genuine, Antoninus may have written this first book…",
			),
			heading("II."),
			text("Begin the morning by saying to thyself…"),
		]),
		chapter(2, "III. IV.", [
			heading("III. IV.", 1),
			text("2. Thou hast not leisure…"),
			heading("III."),
			text("We ought to consider…"),
			text("[A] The words which follow are corrupt."),
			text("Soon will the earth cover us all…"),
			heading("INDEXES."),
			text("Abstinence, 4."),
		]),
		chapter(3, "THE FULL PROJECT GUTENBERG™ LICENSE", [text("Section 1.")]),
	],
	omitted: [],
};

describe("shapeStarter", () => {
	const book = shapeStarter(parsed);

	it("makes each book its own chapter, from its numeral to the next", () => {
		expect(book.chapters.map((ch) => ch.title)).toEqual([
			"Book I",
			"Book II",
			"Book III",
		]);
		expect(
			book.chapters[1].blocks.at(-1)?.type === "text" &&
				book.chapters[1].blocks.at(-1),
		).toMatchObject({
			content: "2. Thou hast not leisure…",
		});
		expect(
			book.chapters[2].blocks.map((b) =>
				b.type === "text" || b.type === "heading" ? b.content : "",
			),
		).toEqual([
			"Book III",
			"We ought to consider…",
			"Soon will the earth cover us all…",
		]);
	});

	it("leaves out the essays, the notes, the indexes and Gutenberg's pages", () => {
		const all = book.chapters
			.flatMap((ch) => ch.blocks)
			.map((b) => (b.type === "text" ? b.content : ""));
		expect(
			all.some((t) =>
				/Marcus was born|\[A\] |If these words|Abstinence|Section 1/.test(t),
			),
		).toBe(false);
	});

	it("takes the note markers out of the text but keeps Long's own brackets", () => {
		const first = book.chapters[0].blocks[1];
		expect(first.type === "text" && first.content).toBe(
			"From my grandfather Verus [I learned] good morals.",
		);
		expect(
			first.type === "text" && first.runs.map((r) => r.text).join(""),
		).toBe(first.type === "text" && first.content);
	});

	it("numbers the blocks afresh, chapter by chapter", () => {
		expect(
			book.chapters[1].blocks.map((b) => [b.id, b.chapterIndex, b.position]),
		).toEqual([
			["c1-0", 1, 0],
			["c1-1", 1, 1],
			["c1-2", 1, 2],
		]);
	});

	it("names it as a reader would", () => {
		expect([book.title, book.author]).toEqual([
			"Meditations",
			"Marcus Aurelius",
		]);
	});
});

// The file itself, so a note left in or a section of Marcus's taken out shows up here.
describe("shapeStarter on public/books/meditations.epub", async () => {
	const book = shapeStarter(await parseEpub("public/books/meditations.epub"));
	const paragraphs = book.chapters
		.flatMap((ch) => ch.blocks)
		.flatMap((b) => (b.type === "text" ? [b.content] : []));

	it("is Book I to Book XII", () => {
		expect(book.chapters.map((ch) => ch.title)).toEqual(
			[
				"I",
				"II",
				"III",
				"IV",
				"V",
				"VI",
				"VII",
				"VIII",
				"IX",
				"X",
				"XI",
				"XII",
			].map((n) => `Book ${n}`),
		);
	});

	it("keeps none of Long's notes", () => {
		const notes =
			/\[[A-Z]\]|^(If these words are genuine|Gataker, whose notes|It was the fashion of the Stoics|Antoninus says)/;
		expect(paragraphs.filter((p) => notes.test(p))).toEqual([]);
	});

	it("keeps Marcus where his text runs on past a note", () => {
		for (const opening of [
			"Soon will the earth",
			"But as to the middle comedy",
			"Remember these nine rules",
			"But if thou wilt, receive also a tenth",
		])
			expect(paragraphs.some((p) => p.startsWith(opening))).toBe(true);
	});
});
