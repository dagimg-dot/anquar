import type { Block, HeadingBlock, ParsedBook, TextBlock } from "anquar-core";
import { BOOKS } from "../landing/sample.ts";
import { saveBook } from "./db.ts";
import { parseEpub } from "./epub.ts";
import { libraryChanged } from "./imports.ts";

// The book a new reader can start with: Meditations in George Long's translation (1862), as Project
// Gutenberg ships it (public/books, licence and all). It's fetched only when asked for.
const STARTER = "/books/meditations.epub";

const BOOK_NUMERALS = [
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
];
// Long's notes are their own paragraphs, "[A] Annius Verus was…", marked in the text as [A]. A note that runs
// on keeps going unmarked, so those paragraphs are named by how they open, checked by hand against this file;
// every other paragraph after a note is Marcus again.
const NOTE = /^\[[A-Z]\]/;
const MARKER = /\[[A-Z]\]/g;
const NOTES_RUNNING_ON = [
	"Antoninus says, ",
	"If these words are genuine",
	'"Si quaeras Helicen',
	'"Reddenda terrae',
	"We now come to the alternate",
	"If there is no error in the passage",
	'"For there in sooth',
	"It is certain that the writer of the Odyssey",
	"It was the fashion of the Stoics",
	"The wolfish friendship is an allusion",
	"Σφαῖρος κυκοτερὴς",
	"Gataker, whose notes",
];
// The edition's pictures are left out, so their captions go too, with the printer's "THE END.": nothing of
// Marcus's is set in capitals.
const CAPTION = /^(?=.*\p{Lu}{3})[^\p{Ll}]+$/u;
const notMarcus = (text: string) =>
	NOTE.test(text) ||
	CAPTION.test(text) ||
	NOTES_RUNNING_ON.some((opening) => text.startsWith(opening));

const unmark = (b: TextBlock): TextBlock => {
	const runs = b.runs.map((r) => ({ ...r, text: r.text.replace(MARKER, "") }));
	const content = b.content.replace(MARKER, "");
	return { ...b, content, runs, charCount: content.length };
};

/**
 * Gutenberg splits the file by size, so its chapters run across Long's books ("IV. V.") and open on his
 * essays, with his notes among the sections. Read as a starter it should be the twelve books and nothing
 * else: each its own chapter from its numeral, without the notes or their markers, the essays, the indexes
 * or Gutenberg's pages.
 */
export function shapeStarter(parsed: ParsedBook): ParsedBook {
	const blocks = parsed.chapters.flatMap((ch) => ch.blocks);
	// Gutenberg heads each of its chunks too ("VIII." partway through Book VII), a level above the books' own.
	const numeral = (b: HeadingBlock) =>
		b.level > 1
			? BOOK_NUMERALS.indexOf(b.content.trim().replace(/\.$/, ""))
			: -1;
	const start = blocks.findIndex(
		(b) => b.type === "heading" && numeral(b) === 0,
	);
	if (start < 0) return { ...parsed, author: "Marcus Aurelius" };
	const books: Block[][] = [];
	for (const b of blocks.slice(start)) {
		if (b.type === "text") {
			if (!notMarcus(b.content)) books.at(-1)?.push(unmark(b));
			continue;
		}
		if (b.type !== "heading" || b.level === 1) continue;
		if (/^index/i.test(b.content.trim())) break;
		const n = numeral(b);
		if (n < 0) continue;
		const content = `Book ${BOOK_NUMERALS[n]}`;
		books.push([
			{
				...b,
				content,
				runs: [{ text: content, bold: false, italic: false }],
				charCount: content.length,
			},
		]);
	}
	return {
		title: "Meditations",
		author: "Marcus Aurelius",
		chapters: books.map((chapter, index) => ({
			index,
			title:
				chapter[0].type === "heading"
					? chapter[0].content
					: `Book ${index + 1}`,
			role: "body",
			frontMatter: false,
			blocks: chapter.map((b, position) => ({
				...b,
				id: `c${index}-${position}`,
				chapterIndex: index,
				position,
			})),
		})),
		coverImage: null,
		omitted: [],
	};
}

// Gutenberg's cover is its own template, so the book gets the one the onboarding fan shows.
async function drawCover(): Promise<Uint8Array | null> {
	const { bg, ink } = BOOKS.meditations;
	const canvas = document.createElement("canvas");
	canvas.width = 600;
	canvas.height = 900;
	const g = canvas.getContext("2d");
	if (!g) return null;
	await Promise.all([
		document.fonts.load('500 84px "Source Serif 4"'),
		document.fonts.load('700 24px "Hanken Grotesk"'),
	]);
	g.fillStyle = bg;
	g.fillRect(0, 0, 600, 900);
	g.fillStyle = "rgba(0, 0, 0, 0.16)";
	g.fillRect(0, 0, 18, 900);
	g.fillStyle = ink;
	g.font = '500 84px "Source Serif 4"';
	g.fillText("Meditations", 62, 190, 480);
	g.globalAlpha = 0.75;
	g.font = '700 24px "Hanken Grotesk"';
	g.letterSpacing = "2.4px";
	g.fillText("MARCUS AURELIUS", 62, 820);
	const blob = await new Promise<Blob | null>((done) =>
		canvas.toBlob(done, "image/jpeg", 0.9),
	);
	return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

/** Adds Meditations to the library and gives its id. */
export async function addStarter(): Promise<string> {
	const res = await fetch(STARTER);
	if (!res.ok) throw new Error(`starter: ${res.status}`);
	const file = new File([await res.blob()], "meditations.epub", {
		type: "application/epub+zip",
	});
	const book = shapeStarter(await parseEpub(file));
	book.coverImage = await drawCover();
	const id = await saveBook(book);
	libraryChanged();
	return id;
}
