import Dexie, { type EntityTable } from "dexie";
import type { EpubCssMeta } from "../epub-renderer/types.ts";
import type { ReaderSettings } from "./reader-settings.tsx";
import type {
	BookMetadata,
	ChapterData,
	ReadingStats,
	TocEntry,
	WeeklyHeatmapEntry,
} from "./types.ts";

interface BookRecord {
	addedAt: string;
	author: string;
	chapterCount: number;
	coverImage?: string;
	cssMeta?: string;
	description?: string;
	id: string;
	language: string;
	lastOpenedAt?: string;
	publisher?: string;
	title: string;
}

interface ChapterRecord {
	bookId: string;
	blocks: string;
	css: string;
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
	epubCssEnabled?: boolean;
	fontSize: number;
	hPadding: number;
	lineHeight: number;
	textColor: string;
	themeId: string;
	verticalAlign?: string;
}

interface DailyRollupRecord {
	buktokCount: number;
	date: string;
	id?: number;
	bookId: string;
	sessionCount: number;
}

class BukTokDB extends Dexie {
	books!: EntityTable<BookRecord, "id">;
	chapters!: EntityTable<ChapterRecord, "id">;
	toc!: EntityTable<TocRecord, "id">;
	progress!: EntityTable<ProgressRecord, "bookId">;
	bookmarks!: EntityTable<BookmarkRecord, "id">;
	readerSettings!: EntityTable<ReaderSettingsRecord, "bookId">;
	dailyRollups!: EntityTable<DailyRollupRecord, "id">;

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
		this.version(3).stores({
			dailyRollups: "++id, bookId, date",
		});
	}

	async upsertDailyRollup(
		bookId: string,
		date: string,
		buktokDelta: number,
		sessionDelta = 0,
	) {
		const existing = await this.dailyRollups
			.where("bookId")
			.equals(bookId)
			.and((r) => r.date === date)
			.first();
		if (existing?.id != null) {
			await this.dailyRollups.update(existing.id, {
				buktokCount: existing.buktokCount + buktokDelta,
				sessionCount: existing.sessionCount + sessionDelta,
			});
		} else {
			await this.dailyRollups.add({
				bookId,
				date,
				buktokCount: buktokDelta,
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

		const total = rollups.reduce((sum, r) => sum + r.buktokCount, 0);
		const avgPerDay = periodDays > 0 ? Math.round(total / periodDays) : 0;
		const sessions = rollups.reduce((sum, r) => sum + r.sessionCount, 0);

		const weekly: WeeklyHeatmapEntry[] = [];
		const today = new Date();
		for (let i = 6; i >= 0; i--) {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			const dateStr = d.toISOString().split("T")[0];
			const dayRollup = rollups.find((r) => r.date === dateStr);
			weekly.push({
				day: d.toLocaleDateString("en", { weekday: "short" }),
				count: dayRollup?.buktokCount ?? 0,
			});
		}

		return {
			total,
			avgPerDay,
			streak: await this.getStreak(),
			sessions,
			weekly,
		};
	}

	async getStreak(): Promise<number> {
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
			if (rollup && rollup.buktokCount > 0) {
				streak++;
			} else if (i > 0) {
				break;
			}
		}
		return streak;
	}

	async getWeeklyHeatmap(): Promise<WeeklyHeatmapEntry[]> {
		const stats = await this.getReadingStats(7);
		return stats.weekly;
	}
}

const db = new BukTokDB();

export async function saveBook(
	metadata: BookMetadata,
	chapters: (ChapterData & {
		blocks: import("../epub-renderer/types.ts").Block[];
	})[],
	toc: TocEntry[],
	coverImage?: string,
	cssMeta?: EpubCssMeta,
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
			cssMeta: cssMeta ? JSON.stringify(cssMeta) : undefined,
			chapterCount: chapters.length,
			addedAt: new Date().toISOString(),
		});

		await db.chapters.bulkPut(
			chapters.map((ch) => ({
				id: `${id}-${ch.id}`,
				bookId: id,
				order: ch.order,
				blocks: JSON.stringify(ch.blocks),
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
		cssMeta: book.cssMeta
			? (JSON.parse(
					book.cssMeta,
				) as import("../epub-renderer/types.ts").EpubCssMeta)
			: undefined,
		chapters: chapters.map((ch) => ({
			id: ch.id.replace(`${id}-`, ""),
			order: ch.order,
			blocks: JSON.parse(
				ch.blocks,
			) as import("../epub-renderer/types.ts").Block[],
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

export async function getChaptersRange(
	bookId: string,
	offset: number,
	limit: number,
) {
	const chapters = await db.chapters
		.where("bookId")
		.equals(bookId)
		.sortBy("order");

	const slice = chapters.slice(offset, offset + limit);
	return slice.map((ch) => ({
		id: ch.id.replace(`${bookId}-`, ""),
		order: ch.order,
		blocks: JSON.parse(
			ch.blocks,
		) as import("../epub-renderer/types.ts").Block[],
		css: JSON.parse(ch.css) as Array<{ id: string; href: string }>,
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
		db.dailyRollups,
	] as const;
	await db.transaction("rw", tables, async () => {
		await db.books.delete(bookId);
		await db.chapters.where("bookId").equals(bookId).delete();
		await db.toc.where("bookId").equals(bookId).delete();
		await db.progress.delete(bookId);
		await db.bookmarks.where("bookId").equals(bookId).delete();
		await db.readerSettings.where("bookId").equals(bookId).delete();
		await db.dailyRollups.where("bookId").equals(bookId).delete();
	});
}

export function saveReaderSettings(bookId: string, settings: ReaderSettings) {
	return db.readerSettings.put({ bookId, ...settings });
}

export function loadReaderSettings(bookId: string) {
	return db.readerSettings.get(bookId);
}

export { db };
