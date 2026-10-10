import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
	freshBookmarks,
	freshWords,
	type LibraryDump,
	mergeReading,
	newerProgress,
	packLibrary,
	pickSettings,
	unpackLibrary,
} from "./library-file.ts";

const blob = (...values: number[]) => new Blob([new Uint8Array(values)]);
const bytesOf = async (data?: Blob) =>
	data ? [...new Uint8Array(await data.arrayBuffer())] : undefined;

function library(): LibraryDump {
	return {
		books: [
			{
				id: "b1",
				title: "Walden",
				author: "Henry David Thoreau",
				addedAt: "2026-09-01T10:00:00.000Z",
				chapterCount: 2,
				lastOpenedAt: "2026-10-01T21:00:00.000Z",
				coverImage: blob(1, 2, 3),
			},
			{
				id: "b2",
				title: "Candide",
				author: "Voltaire",
				addedAt: "2026-09-02T10:00:00.000Z",
				chapterCount: 1,
			},
		],
		chapters: [
			{
				id: "b1-0",
				bookId: "b1",
				order: 0,
				title: "Economy",
				frontMatter: false,
				blocks: '[{"type":"text","text":"When I wrote the following pages"}]',
			},
			{
				id: "b1-1",
				bookId: "b1",
				order: 1,
				title: "Where I Lived",
				frontMatter: false,
				blocks: "[]",
			},
			{
				id: "b2-0",
				bookId: "b2",
				order: 0,
				title: "Chapter I",
				frontMatter: true,
				blocks: "[]",
			},
		],
		images: [{ id: "b1::c0-3", bookId: "b1", data: blob(9, 8, 7, 255) }],
		progress: [
			{
				bookId: "b1",
				cardId: "c1-4",
				chapterIndex: 1,
				lastReadAt: "2026-10-01T21:00:00.000Z",
				progressPercent: 12,
			},
		],
		bookmarks: [
			{
				id: 7,
				bookId: "b1",
				cardId: "c0-2",
				chapterIndex: 0,
				createdAt: "2026-09-20T08:00:00.000Z",
				label: "Economy",
				passage: true,
				textSnippet: "The mass of men lead lives of quiet desperation.",
				wordOffset: 0,
			},
		],
		readerSettings: [
			{
				bookId: "global",
				bgColor: "",
				fontSize: 130,
				hPadding: 1.5,
				lineHeight: 1.7,
				textColor: "",
				themeId: "sepia",
			},
		],
		reading: [
			{
				date: "2026-10-01",
				bookId: "b1",
				anquars: 2,
				cards: ["c1-3", "c1-4"],
				seconds: 140,
				sessions: 1,
			},
		],
		words: [WORD],
		settings: { anquar_goal: "50", theme: "dark" },
	};
}

const WORD = {
	askedAt: "2026-10-01T09:00:00.000Z",
	bookId: "b1",
	cardId: "c1-3",
	chapterIndex: 1,
	context: "Our life is frittered away by detail.",
	detail: "Wasted bit by bit on small things.",
	dueOn: "2026-10-02",
	focus: ["frittered"],
	gist: "wasted little by little",
	id: 4,
	step: 0,
	term: "frittered",
};

const zipOf = (files: Record<string, string>) => {
	const zip = new JSZip();
	for (const [name, text] of Object.entries(files)) zip.file(name, text);
	return zip.generateAsync({ type: "uint8array" });
};

describe("library file", () => {
	it("restores every table, and covers and pictures byte for byte", async () => {
		const saved = library();
		const back = await unpackLibrary(await packLibrary(saved));

		const withoutCover = ({
			coverImage: _,
			...book
		}: LibraryDump["books"][0]) => book;
		expect(back.books.map(withoutCover)).toEqual(saved.books.map(withoutCover));
		expect(await bytesOf(back.books[0].coverImage)).toEqual([1, 2, 3]);
		expect(back.books[1].coverImage).toBeUndefined();

		expect(back.chapters).toHaveLength(saved.chapters.length);
		expect(back.chapters).toEqual(expect.arrayContaining(saved.chapters));
		expect(back.images.map(({ id, bookId }) => [id, bookId])).toEqual([
			["b1::c0-3", "b1"],
		]);
		expect(await bytesOf(back.images[0].data)).toEqual([9, 8, 7, 255]);

		expect(back.progress).toEqual(saved.progress);
		expect(back.bookmarks).toEqual(saved.bookmarks);
		expect(back.readerSettings).toEqual(saved.readerSettings);
		expect(back.reading).toEqual(saved.reading);
		expect(back.words).toEqual(saved.words);
		expect(back.settings).toEqual(saved.settings);
	});

	it("turns away an EPUB, and bytes that aren't a zip at all", async () => {
		const epub = await zipOf({ mimetype: "application/epub+zip" });
		await expect(unpackLibrary(epub)).rejects.toMatchObject({
			kind: "not-library",
		});
		await expect(
			unpackLibrary(new TextEncoder().encode("%PDF-1.7")),
		).rejects.toMatchObject({ kind: "not-library" });
	});

	it("asks for an update rather than misreading a newer format", async () => {
		const newer = await zipOf({
			"anquar-library.json": JSON.stringify({
				format: "anquar-library",
				version: 2,
			}),
		});
		await expect(unpackLibrary(newer)).rejects.toMatchObject({
			kind: "newer",
		});
	});
});

describe("pickSettings", () => {
	it("keeps the settings and the Pulse's bookkeeping, never the Gemini key", () => {
		expect(
			pickSettings([
				["anquar_goal", "50"],
				["anquar_rail", "dim"],
				["anquar_api_key", "AIza-secret"],
				["theme", "dark"],
				["something_else", "x"],
			]),
		).toEqual({ anquar_goal: "50", anquar_rail: "dim", theme: "dark" });
	});
});

describe("mergeReading", () => {
	const day = {
		date: "2026-10-01",
		bookId: "b1",
		anquars: 2,
		cards: ["c1-3", "c1-4"],
		seconds: 140,
		sessions: 1,
	};

	it("takes the restored day when this phone has none", () => {
		expect(mergeReading(undefined, day)).toEqual(day);
	});

	it("counts a card read on both phones once and keeps the longer time", () => {
		const here = {
			...day,
			anquars: 2,
			cards: ["c1-4", "c1-5"],
			seconds: 90,
			sessions: 2,
		};
		expect(mergeReading(here, day)).toEqual({
			...day,
			anquars: 3,
			cards: ["c1-4", "c1-5", "c1-3"],
			seconds: 140,
			sessions: 2,
		});
	});

	it("changes nothing when the same day is restored twice", () => {
		expect(mergeReading(day, day)).toEqual(day);
	});
});

describe("newerProgress", () => {
	const at = (lastReadAt: string, cardId: string) => ({
		bookId: "b1",
		cardId,
		chapterIndex: 0,
		lastReadAt,
		progressPercent: 10,
	});

	it("keeps whichever place in the book was read last", () => {
		const morning = at("2026-10-01T08:00:00.000Z", "c0-1");
		const night = at("2026-10-01T22:00:00.000Z", "c0-9");
		expect(newerProgress(morning, night)).toBe(night);
		expect(newerProgress(night, morning)).toBe(night);
		expect(newerProgress(undefined, morning)).toBe(morning);
	});
});

describe("freshBookmarks", () => {
	const save = (id: number, textSnippet: string) => ({
		id,
		bookId: "b1",
		chapterIndex: 0,
		createdAt: "2026-09-20T08:00:00.000Z",
		label: "Economy",
		textSnippet,
		wordOffset: 0,
	});

	it("skips saves already here and lets the rest take new numbers", () => {
		const here = [save(1, "quiet desperation")];
		const incoming = [
			save(7, "quiet desperation"),
			save(8, "Simplify, simplify."),
			save(9, "Simplify, simplify."),
		];
		const { id: _, ...simplify } = save(8, "Simplify, simplify.");
		expect(freshBookmarks(here, incoming)).toEqual([simplify]);
	});
});

describe("freshWords", () => {
	it("skips words already here and lets the rest take new numbers", () => {
		const later = { ...WORD, id: 9, askedAt: "2026-10-05T09:00:00.000Z" };
		const { id: _, ...fresh } = later;
		expect(freshWords([WORD], [{ ...WORD, id: 7 }, later])).toEqual([fresh]);
	});

	it("reads a file from before words were kept as having none", async () => {
		const zip = await JSZip.loadAsync(await packLibrary(library()));
		zip.remove("words.json");
		const back = await unpackLibrary(
			await zip.generateAsync({ type: "uint8array" }),
		);
		expect(back.words).toEqual([]);
	});
});
