import JSZip from "jszip";
import type {
	BookmarkRecord,
	BookRecord,
	ChapterRecord,
	ImageRecord,
	ProgressRecord,
	ReaderSettingsRecord,
	ReadingRecord,
} from "./db.ts";

export interface LibraryDump {
	books: BookRecord[];
	chapters: ChapterRecord[];
	images: ImageRecord[];
	progress: ProgressRecord[];
	bookmarks: BookmarkRecord[];
	readerSettings: ReaderSettingsRecord[];
	reading: ReadingRecord[];
	settings: Record<string, string>;
}

// A library file is a zip that restores without the original EPUBs: anquar-library.json names the format,
// each table is JSON, and covers and pictures sit beside them byte for byte, stored rather than deflated
// because they are compressed already.
const FORMAT = "anquar-library";
const VERSION = 1;
const MANIFEST = "anquar-library.json";

export class LibraryFileError extends Error {
	kind: "not-library" | "newer";

	constructor(kind: "not-library" | "newer") {
		super(
			kind === "newer"
				? "This file comes from a newer anquar. Update the app, then try again."
				: "That isn't a library file exported from anquar.",
		);
		this.kind = kind;
	}
}

export const libraryFileName = (date: Date) =>
	`anquar-library-${date.toLocaleDateString("en-CA")}.zip`;

// The Gemini key stays on the phone it was typed into, and which release notes were seen is this phone's.
const PRIVATE = new Set(["anquar_api_key", "anquar_version"]);

export function pickSettings(
	entries: Iterable<[string, string]>,
): Record<string, string> {
	const settings: Record<string, string> = {};
	for (const [key, value] of entries) {
		if ((key.startsWith("anquar_") || key === "theme") && !PRIVATE.has(key))
			settings[key] = value;
	}
	return settings;
}

export function readSettings(): Record<string, string> {
	const entries: [string, string][] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		const value = key === null ? null : localStorage.getItem(key);
		if (key !== null && value !== null) entries.push([key, value]);
	}
	return pickSettings(entries);
}

export function writeSettings(settings: Record<string, string>) {
	for (const [key, value] of Object.entries(
		pickSettings(Object.entries(settings)),
	))
		localStorage.setItem(key, value);
}

export async function packLibrary(
	dump: LibraryDump,
	onProgress?: (percent: number) => void,
): Promise<Blob> {
	const zip = new JSZip();
	const stored = { binary: true, compression: "STORE" } as const;
	const json = (path: string, value: unknown) =>
		zip.file(path, JSON.stringify(value));

	json(MANIFEST, {
		format: FORMAT,
		version: VERSION,
		exportedAt: new Date().toISOString(),
	});
	json(
		"books.json",
		dump.books.map(({ coverImage, ...book }, i) => {
			if (!coverImage) return book;
			zip.file(`covers/${i}`, coverImage, stored);
			return { ...book, cover: `covers/${i}` };
		}),
	);
	dump.books.forEach((book, i) => {
		json(
			`chapters/${i}.json`,
			dump.chapters.filter((chapter) => chapter.bookId === book.id),
		);
	});
	json(
		"images.json",
		dump.images.map(({ data, ...image }, i) => {
			zip.file(`images/${i}`, data, stored);
			return { ...image, file: `images/${i}` };
		}),
	);
	json("progress.json", dump.progress);
	json("bookmarks.json", dump.bookmarks);
	json("reader-settings.json", dump.readerSettings);
	json("reading.json", dump.reading);
	json("settings.json", dump.settings);

	return zip.generateAsync(
		{ type: "blob", mimeType: "application/zip", compression: "DEFLATE" },
		(meta) => onProgress?.(meta.percent),
	);
}

export async function unpackLibrary(
	data: Blob | ArrayBuffer | Uint8Array,
): Promise<LibraryDump> {
	let zip: JSZip;
	try {
		zip = await JSZip.loadAsync(data);
	} catch {
		throw new LibraryFileError("not-library");
	}

	const manifest = (await readJson(zip, MANIFEST)) as
		| { format?: unknown; version?: unknown }
		| undefined;
	if (manifest?.format !== FORMAT) throw new LibraryFileError("not-library");
	if (typeof manifest.version !== "number" || manifest.version > VERSION)
		throw new LibraryFileError("newer");

	const bytes = (path: string) => {
		const file = zip.file(path);
		if (!file) throw new LibraryFileError("not-library");
		return file.async("blob");
	};
	const list = async <T>(path: string) => {
		const value = await readJson(zip, path);
		return (Array.isArray(value) ? value : []) as T[];
	};

	const books = await Promise.all(
		(await list<BookRecord & { cover?: string }>("books.json")).map(
			async ({ cover, ...book }) =>
				cover ? { ...book, coverImage: await bytes(cover) } : book,
		),
	);
	const chapters = (
		await Promise.all(
			zip
				.file(/^chapters\/\d+\.json$/)
				.map((file) => list<ChapterRecord>(file.name)),
		)
	).flat();
	const images = await Promise.all(
		(
			await list<{ id: string; bookId: string; file: string }>("images.json")
		).map(async ({ file, ...image }) => ({
			...image,
			data: await bytes(file),
		})),
	);
	const settings = await readJson(zip, "settings.json");

	return {
		books,
		chapters,
		images,
		progress: await list("progress.json"),
		bookmarks: await list("bookmarks.json"),
		readerSettings: await list("reader-settings.json"),
		reading: await list("reading.json"),
		settings:
			settings && typeof settings === "object"
				? pickSettings(Object.entries(settings))
				: {},
	};
}

async function readJson(zip: JSZip, path: string): Promise<unknown> {
	const file = zip.file(path);
	if (!file) return undefined;
	try {
		return JSON.parse(await file.async("string"));
	} catch {
		throw new LibraryFileError("not-library");
	}
}

// A day read on two phones counts each card once, and keeps the longer time and the more sessions, so
// restoring the same file twice changes nothing.
export function mergeReading(
	here: ReadingRecord | undefined,
	restored: ReadingRecord,
): ReadingRecord {
	if (!here) return restored;
	const cards = [...new Set([...here.cards, ...restored.cards])];
	return {
		...here,
		cards,
		anquars: Math.max(here.anquars, restored.anquars, cards.length),
		seconds: Math.max(here.seconds, restored.seconds),
		sessions: Math.max(here.sessions, restored.sessions),
	};
}

export const newerProgress = (
	here: ProgressRecord | undefined,
	restored: ProgressRecord,
) => (here && here.lastReadAt > restored.lastReadAt ? here : restored);

export const later = (a?: string, b?: string) =>
	a && b ? (a > b ? a : b) : (a ?? b);

const bookmarkKey = (save: BookmarkRecord) =>
	`${save.bookId}\n${save.createdAt}\n${save.textSnippet}`;

// Saves are numbered by the database they were made in, so they come in under new numbers, leaving out
// any already here.
export function freshBookmarks(
	here: BookmarkRecord[],
	restored: BookmarkRecord[],
): BookmarkRecord[] {
	const seen = new Set(here.map(bookmarkKey));
	const fresh: BookmarkRecord[] = [];
	for (const { id: _, ...save } of restored) {
		const key = bookmarkKey(save);
		if (seen.has(key)) continue;
		seen.add(key);
		fresh.push(save);
	}
	return fresh;
}
