import type { Block, EpubCssMeta } from "../epub-renderer/types";

export interface BookMetadata {
	author: string;
	description?: string;
	language: string;
	publisher?: string;
	title: string;
}

export interface SpineItem {
	href: string;
	id: string;
	linear?: string;
	mediaType: string;
}

export interface TocEntry {
	children?: TocEntry[];
	href: string;
	id?: string;
	label: string;
}

export interface ChapterData {
	css: Array<{ id: string; href: string }>;
	blocks?: Block[];
	html?: string;
	id: string;
	order: number;
}

export interface ParsedBook {
	chapters: ChapterData[];
	coverImage: string | null;
	metadata: BookMetadata;
	spine: SpineItem[];
	toc: TocEntry[];
	allCssTexts?: string[];
	firstHtml?: string;
	cssMeta?: EpubCssMeta;
}

export type WorkerMessage = { type: "PARSE"; file: File } | { type: "ABORT" };

export type WorkerResponse =
	| { type: "COMPLETE"; payload: ParsedBook }
	| { type: "ERROR"; error: string };
