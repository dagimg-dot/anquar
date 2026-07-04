import Dexie, { type EntityTable } from "dexie";
import type { ReaderSettings } from "./reader-settings.tsx";
import type { BookMetadata, ChapterData, TocEntry } from "./types.ts";

interface BookRecord {
	addedAt: string;
	author: string;
	chapterCount: number;
	coverImage?: string;
	description?: string;
	id: string;
	language: string;
	lastOpenedAt?: string;
	publisher?: string;
	title: string;
}

interface ChapterRecord {
	bookId: string;
	css: string;
	html: string;
	id: string;
	order: number;
}

interface TocRecord {
	bookId: string;
	href: string;
	id: string;
	label: string;
	parentId?: string;
}

interface ProgressRecord {
	bookId: string;
	chapterIndex: number;
	lastReadAt: string;
	progressPercent: number;
	wordOffset: number;
}

interface BookmarkRecord {
	bookId: string;
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
	textColor: string;
	themeId: string;
}

class BukTokDB extends Dexie {
	books!: EntityTable<BookRecord, "id">;
	chapters!: EntityTable<ChapterRecord, "id">;
	toc!: EntityTable<TocRecord, "id">;
	progress!: EntityTable<ProgressRecord, "bookId">;
	bookmarks!: EntityTable<BookmarkRecord, "id">;
	readerSettings!: EntityTable<ReaderSettingsRecord, "bookId">;

	constructor() {
		super("buktok");
		this.version(1).stores({
			books: "id, title, author, addedAt, lastOpenedAt",
			chapters: "id, bookId, order",
			toc: "id, bookId, href",
			progress: "bookId, lastReadAt",
			bookmarks: "++id, bookId, chapterIndex, createdAt",
		});
		this.version(2).stores({
			readerSettings: "bookId",
		});
	}
}

const db = new BukTokDB();

export async function saveBook(
	metadata: BookMetadata,
	chapters: ChapterData[],
	toc: TocEntry[],
	coverImage?: string,
): Promise<string> {
	const id =
		self.crypto?.randomUUID?.() ??
		`${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

	await db.transaction("rw", db.books, db.chapters, db.toc, async () => {
		await db.books.put({
			id,
			title: metadata.title,
			author: metadata.author,
			language: metadata.language,
			description: metadata.description,
			publisher: metadata.publisher,
			coverImage,
			chapterCount: chapters.length,
			addedAt: new Date().toISOString(),
		});

		await db.chapters.bulkPut(
			chapters.map((ch) => ({
				id: `${id}-${ch.id}`,
				bookId: id,
				order: ch.order,
				html: ch.html,
				css: JSON.stringify(ch.css),
			})),
		);

		await db.toc.bulkPut(
			toc.map((entry) => ({
				id: `${id}-${entry.href}`,
				bookId: id,
				label: entry.label,
				href: entry.href,
			})),
		);
	});

	return id;
}

export async function getBook(id: string) {
	const book = await db.books.get(id);
	if (!book) {
		return null;
	}

	const chapters = await db.chapters.where("bookId").equals(id).sortBy("order");

	const toc = await db.toc.where("bookId").equals(id).toArray();

	const progress = await db.progress.get(id);

	return {
		...book,
		chapters: chapters.map((ch) => ({
			id: ch.id.replace(`${id}-`, ""),
			order: ch.order,
			html: ch.html,
			css: JSON.parse(ch.css) as Array<{ id: string; href: string }>,
		})),
		toc: toc.map((t) => ({
			label: t.label,
			href: t.href,
		})),
		progress,
	};
}

export function listBooks() {
	return db.books.orderBy("addedAt").reverse().toArray();
}

export async function saveProgress(
	bookId: string,
	chapterIndex: number,
	wordOffset: number,
	progressPercent: number,
) {
	await db.progress.put({
		bookId,
		chapterIndex,
		wordOffset,
		progressPercent,
		lastReadAt: new Date().toISOString(),
	});

	await db.books.update(bookId, {
		lastOpenedAt: new Date().toISOString(),
	});
}

export function getProgress(bookId: string) {
	return db.progress.get(bookId);
}

export async function deleteBook(bookId: string) {
	const tables = [
		db.books,
		db.chapters,
		db.toc,
		db.progress,
		db.bookmarks,
		db.readerSettings,
	] as const;
	await db.transaction("rw", tables, async () => {
		await db.books.delete(bookId);
		await db.chapters.where("bookId").equals(bookId).delete();
		await db.toc.where("bookId").equals(bookId).delete();
		await db.progress.delete(bookId);
		await db.bookmarks.where("bookId").equals(bookId).delete();
		await db.readerSettings.delete(bookId);
	});
}

export function saveReaderSettings(bookId: string, settings: ReaderSettings) {
	return db.readerSettings.put({ bookId, ...settings });
}

export function loadReaderSettings(bookId: string) {
	return db.readerSettings.get(bookId);
}

export { db };
