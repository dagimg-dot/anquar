import type { ParsedBook } from "anquar-core";

export type { ParsedBook };

export interface DailyRollup {
	id?: number;
	bookId: string;
	buktokCount: number;
	date: string;
	sessionCount: number;
}

export interface WeeklyHeatmapEntry {
	count: number;
	day: string;
}

export interface ReadingStats {
	avgPerDay: number;
	sessions: number;
	streak: number;
	total: number;
	weekly: WeeklyHeatmapEntry[];
}

export type WorkerMessage = { type: "PARSE"; file: File } | { type: "ABORT" };

export type WorkerResponse =
	| { type: "COMPLETE"; payload: ParsedBook }
	| { type: "ERROR"; error: string };
