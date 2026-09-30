import type { Block, ParsedBook } from "anquar-core";
import Dexie, { type EntityTable } from "dexie";
import { releaseCoverUrl } from "./covers.ts";
import type { ReaderSettings } from "./reader-settings.tsx";
import type { ReadingStats, WeeklyHeatmapEntry } from "./types.ts";

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
	chapterIndex: number;
	lastReadAt: string;
	progressPercent: number;
	wordOffset: number;
}

interface BookmarkRecord {
	bookId: string;
	/** Index of the card in the feed — the unit the reader actually saves. */
	cardIndex?: number;
	chapterIndex: number;
	createdAt: string;
	id?: number;
	label: string;
	textSnippet: string;
	/** Left from the word-based reader; cards superseded it. */
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

interface DailyRollupRecord {
	anquarCount: number;
	date: string;
	id?: number;
	bookId: string;
	sessionCount: number;
}

class AnquarDB extends Dexie {
	books!: EntityTable<BookRecord, "id">;
	chapters!: EntityTable<ChapterRecord, "id">;
	progress!: EntityTable<ProgressRecord, "bookId">;
	bookmarks!: EntityTable<BookmarkRecord, "id">;
	readerSettings!: EntityTable<ReaderSettingsRecord, "bookId">;
	dailyRollups!: EntityTable<DailyRollupRecord, "id">;
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
	}

	async upsertDailyRollup(
		bookId: string,
		date: string,
		anquarDelta: number,
		sessionDelta = 0,
	) {
		const existing = await this.dailyRollups
			.where("bookId")
			.equals(bookId)
			.and((r) => r.date === date)
			.first();
		if (existing?.id != null) {
			await this.dailyRollups.update(existing.id, {
				anquarCount: existing.anquarCount + anquarDelta,
				sessionCount: existing.sessionCount + sessionDelta,
			});
		} else {
			await this.dailyRollups.add({
				bookId,
				date,
				anquarCount: anquarDelta,
				sessionCount: sessionDelta,
			});
		}
	}

	async getReadingStats(periodDays = 30): Promise<ReadingStats> {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - periodDays);
		const cutoffStr = cutoff.toISOString().split("T")[0];
		const rollups = await this.dailyRollups
			.where("date")
			.aboveOrEqual(cutoffStr)
			.toArray();
		const total = rollups.reduce((sum, r) => sum + r.anquarCount, 0);
		return {
			total,
			avgPerDay: periodDays > 0 ? Math.round(total / periodDays) : 0,
			sessions: rollups.reduce((sum, r) => sum + r.sessionCount, 0),
			streak: await this.getStreak(),
			weekly: await this.getWeeklyHeatmap(rollups),
		};
	}

	private async getStreak(): Promise<number> {
		let streak = 0;
		const today = new Date();
		for (let i = 0; i < 365; i++) {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			const dateStr = d.toISOString().split("T")[0];
			const rollup = await this.dailyRollups
				.where("date")
				.equals(dateStr)
				.first();
			if (rollup && rollup.anquarCount > 0) streak++;
			else if (i > 0) break;
		}
		return streak;
	}

	private async getWeeklyHeatmap(
		rollups: DailyRollupRecord[],
	): Promise<WeeklyHeatmapEntry[]> {
		const weekly: WeeklyHeatmapEntry[] = [];
		const today = new Date();
		for (let i = 6; i >= 0; i--) {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			const dateStr = d.toISOString().split("T")[0];
			const dayRollup = rollups.find((r) => r.date === dateStr);
			weekly.push({
				day: d.toLocaleDateString("en", { weekday: "short" }),
				count: dayRollup?.anquarCount ?? 0,
			});
		}
		return weekly;
	}
}

const db = new AnquarDB();

/** Image bytes live in their own table; inline they would balloon the JSON. */
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
	await db.books.update(bookId, { lastOpenedAt: new Date().toISOString() });
}

export function getProgress(bookId: string) {
	return db.progress.get(bookId);
}

export async function deleteBook(bookId: string) {
	releaseCoverUrl(bookId);
	const tables = [
		db.books,
		db.chapters,
		db.progress,
		db.bookmarks,
		db.readerSettings,
		db.dailyRollups,
		db.images,
	] as const;
	await db.transaction("rw", tables, async () => {
		await db.books.delete(bookId);
		await db.chapters.where("bookId").equals(bookId).delete();
		await db.progress.delete(bookId);
		await db.bookmarks.where("bookId").equals(bookId).delete();
		await db.readerSettings.where("bookId").equals(bookId).delete();
		await db.dailyRollups.where("bookId").equals(bookId).delete();
		await db.images.where("bookId").equals(bookId).delete();
	});
}

export function listBookmarks(bookId: string) {
	return db.bookmarks.where("bookId").equals(bookId).toArray();
}

export function addBookmark(entry: {
	bookId: string;
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
