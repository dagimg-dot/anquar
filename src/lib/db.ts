import type { Block, ParsedBook } from "anquar-core";
import Dexie, { type EntityTable, type Table } from "dexie";
import { releaseCoverUrl } from "./covers.ts";
import { sameBook } from "./import-check.ts";
import type { ReaderSettings } from "./reader-settings.tsx";

interface BookRecord {
	addedAt: string;
	author: string;
	chapterCount: number;
	id: string;
	lastOpenedAt?: string;
	title: string;
	coverImage?: Blob;
}

interface ChapterRecord {
	bookId: string;
	blocks: string;
	frontMatter: boolean;
	id: string;
	order: number;
	title: string;
}

interface ProgressRecord {
	bookId: string;
	cardId: string;
	chapterIndex: number;
	lastReadAt: string;
	progressPercent: number;
}

interface BookmarkRecord {
	bookId: string;
	cardId?: string;
	cardIndex?: number;
	chapterIndex: number;
	createdAt: string;
	id?: number;
	label: string;
	textSnippet: string;
	wordOffset: number;
}

interface ReaderSettingsRecord {
	bgColor: string;
	bookId: string;
	fontSize: number;
	hPadding: number;
	lineHeight: number;
	railRest?: string;
	textColor: string;
	themeId: string;
	verticalAlign?: string;
}

interface ImageRecord {
	bookId: string;
	data: Blob;
	id: string;
}

interface ReadingRecord {
	anquars: number;
	bookId: string;
	cards: string[];
	date: string;
	seconds: number;
	sessions: number;
}

class AnquarDB extends Dexie {
	books!: EntityTable<BookRecord, "id">;
	chapters!: EntityTable<ChapterRecord, "id">;
	progress!: EntityTable<ProgressRecord, "bookId">;
	bookmarks!: EntityTable<BookmarkRecord, "id">;
	readerSettings!: EntityTable<ReaderSettingsRecord, "bookId">;
	reading!: Table<ReadingRecord, [string, string]>;
	images!: EntityTable<ImageRecord, "id">;

	constructor() {
		super("anquar");
		this.version(1).stores({
			books: "id, title, author, addedAt, lastOpenedAt",
			chapters: "id, bookId, order, [bookId+order]",
			progress: "bookId, lastReadAt",
			bookmarks: "++id, bookId, chapterIndex, createdAt",
			readerSettings: "bookId",
			dailyRollups: "++id, bookId, date",
			images: "id, bookId",
		});
		// Nothing ever wrote a daily rollup, so the table goes without a migration.
		this.version(2).stores({
			dailyRollups: null,
			reading: "[date+bookId], date, bookId",
		});
	}
}

const db = new AnquarDB();

function withoutImageBytes(key: string, value: unknown): unknown {
	return key === "data" ? undefined : value;
}

export function imageKey(bookId: string, blockId: string): string {
	return `${bookId}::${blockId}`;
}

export async function saveBook(book: ParsedBook): Promise<string> {
	const id =
		self.crypto?.randomUUID?.() ??
		`${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

	const images: ImageRecord[] = [];
	for (const chapter of book.chapters) {
		for (const block of chapter.blocks) {
			if (block.type !== "image" || !block.data) continue;
			images.push({
				id: imageKey(id, block.id),
				bookId: id,
				data: new Blob([block.data.slice()]),
			});
		}
	}

	await db.transaction("rw", db.books, db.chapters, db.images, async () => {
		await db.books.put({
			id,
			title: book.title,
			author: book.author,
			chapterCount: book.chapters.length,
			addedAt: new Date().toISOString(),
			coverImage: book.coverImage
				? new Blob([book.coverImage.slice()])
				: undefined,
		});

		await db.chapters.bulkPut(
			book.chapters.map((ch) => ({
				id: `${id}-${ch.index}`,
				bookId: id,
				order: ch.index,
				title: ch.title,
				frontMatter: ch.frontMatter,
				blocks: JSON.stringify(ch.blocks, withoutImageBytes),
			})),
		);

		await db.images.bulkPut(images);
	});

	return id;
}

export function getBookMeta(id: string) {
	return db.books.get(id);
}

export async function getImageBlob(imageId: string) {
	return (await db.images.get(imageId))?.data;
}

export function listBooks() {
	return db.books.orderBy("addedAt").reverse().toArray();
}

// Books never opened have no lastOpenedAt and so aren't in its index.
export function lastOpenedBook() {
	return db.books.orderBy("lastOpenedAt").last();
}

export async function getChaptersRange(
	bookId: string,
	fromOrder: number,
	limit: number,
) {
	const chapters = await db.chapters
		.where("[bookId+order]")
		.between([bookId, fromOrder], [bookId, Number.POSITIVE_INFINITY])
		.limit(limit)
		.toArray();

	return chapters.map((ch) => ({
		index: ch.order,
		title: ch.title,
		frontMatter: ch.frontMatter ?? false,
		blocks: JSON.parse(ch.blocks) as Block[],
	}));
}

export async function listChapterTitles(bookId: string) {
	const rows = await db.chapters.where("bookId").equals(bookId).sortBy("order");
	return rows.map((ch) => ({
		frontMatter: ch.frontMatter ?? false,
		index: ch.order,
		title: ch.title,
	}));
}

export async function saveProgress(
	bookId: string,
	place: { cardId: string; chapterIndex: number; percent: number },
) {
	await db.progress.put({
		bookId,
		cardId: place.cardId,
		chapterIndex: place.chapterIndex,
		progressPercent: place.percent,
		lastReadAt: new Date().toISOString(),
	});
	await db.books.update(bookId, { lastOpenedAt: new Date().toISOString() });
}

export async function findBook(match: { title: string; author: string }) {
	return (await db.books.toArray()).find((book) => sameBook(book, match));
}

export function getProgress(bookId: string) {
	return db.progress.get(bookId);
}

// One row per book per reading day. A card counts once a day however often it's read, which is why the
// row keeps the ids it has counted. Deleting a book keeps its rows: the streak is yours, not the book's.
export function recordReading(
	bookId: string,
	date: string,
	add: { cardId?: string; seconds?: number; session?: boolean },
): Promise<boolean> {
	return db.transaction("rw", db.reading, async () => {
		const row = (await db.reading.get([date, bookId])) ?? {
			anquars: 0,
			bookId,
			cards: [],
			date,
			seconds: 0,
			sessions: 0,
		};
		const counted = add.cardId !== undefined && !row.cards.includes(add.cardId);
		if (counted && add.cardId) {
			row.cards.push(add.cardId);
			row.anquars += 1;
		}
		row.seconds += add.seconds ?? 0;
		if (add.session) row.sessions += 1;
		await db.reading.put(row);
		return counted;
	});
}

export function listReading() {
	return db.reading.toArray();
}

export async function deleteBook(bookId: string) {
	releaseCoverUrl(bookId);
	const tables = [
		db.books,
		db.chapters,
		db.progress,
		db.bookmarks,
		db.readerSettings,
		db.images,
	] as const;
	await db.transaction("rw", tables, async () => {
		await db.books.delete(bookId);
		await db.chapters.where("bookId").equals(bookId).delete();
		await db.progress.delete(bookId);
		await db.bookmarks.where("bookId").equals(bookId).delete();
		await db.readerSettings.where("bookId").equals(bookId).delete();
		await db.images.where("bookId").equals(bookId).delete();
	});
}

export function listBookmarks(bookId: string) {
	return db.bookmarks.where("bookId").equals(bookId).toArray();
}

export function addBookmark(entry: {
	bookId: string;
	cardId: string;
	cardIndex: number;
	chapterIndex: number;
	label: string;
	textSnippet: string;
}) {
	return db.bookmarks.add({
		...entry,
		wordOffset: 0,
		createdAt: new Date().toISOString(),
	});
}

export function removeBookmark(id: number) {
	return db.bookmarks.delete(id);
}

export function saveReaderSettings(bookId: string, settings: ReaderSettings) {
	return db.readerSettings.put({ bookId, ...settings });
}

export function loadReaderSettings(bookId: string) {
	return db.readerSettings.get(bookId);
}

export { db };
