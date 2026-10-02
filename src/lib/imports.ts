import { type ParsedBook, wordCount } from "anquar-core";
import { createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { coverUrl } from "./covers.ts";
import { findBook, getProgress, saveBook } from "./db.ts";
import { ImportError, parseEpub } from "./epub.ts";
import type { ImportFailure } from "./import-check.ts";

export type JobState =
	| "waiting"
	| "opening"
	| "reading"
	| "saving"
	| "added"
	| "already"
	| "failed"
	| "cancelled";

export interface ImportJob {
	key: number;
	fileName: string;
	state: JobState;
	slow: boolean;
	bookId?: string;
	title?: string;
	author?: string;
	cover?: string;
	chapters?: number;
	words?: number;
	percent?: number;
	failure?: ImportFailure;
}

const SLOW_AFTER = 10_000;
const WORDS_PER_MINUTE = 238;

export function readingTime(words: number): string {
	const minutes = words / WORDS_PER_MINUTE;
	if (minutes < 55)
		return `about ${Math.max(5, Math.round(minutes / 5) * 5)} min`;
	return `about ${Math.round(minutes / 60)} h`;
}

export const busy = (job: ImportJob) =>
	job.state === "waiting" ||
	job.state === "opening" ||
	job.state === "reading" ||
	job.state === "saving";

const [jobs, setJobs] = createStore<ImportJob[]>([]);
const [open, setOpen] = createSignal(false);
// Bumped whenever a book lands, so the Feed and Library tabs can load again.
const [libraryVersion, setLibraryVersion] = createSignal(0);

export { jobs, libraryVersion, open as importsOpen };

// For a book changed or deleted outside an import.
export const libraryChanged = () => setLibraryVersion((v) => v + 1);

const files = new Map<number, File>();
// A book that turned out to be in the library already is held until you say whether to add a copy.
const held = new Map<number, ParsedBook>();
const madeUrls: string[] = [];
let nextKey = 1;
let running = false;
let current: AbortController | undefined;

const update = (key: number, patch: Partial<ImportJob>) =>
	setJobs((job) => job.key === key, patch);

let picker: HTMLInputElement | undefined;
export function registerPicker(input: HTMLInputElement) {
	picker = input;
}
export function pickBooks() {
	picker?.click();
}

export function importFiles(chosen: File[]) {
	if (chosen.length === 0) return;
	if (!running) reset();
	const added = chosen.map((file) => {
		const key = nextKey++;
		files.set(key, file);
		return { key, fileName: file.name, state: "waiting" as const, slow: false };
	});
	setJobs((list) => [...list, ...added]);
	setOpen(true);
	void run();
}

// One book at a time, so a phone never holds two parsed books at once.
async function run() {
	if (running) return;
	running = true;
	for (let job = next(); job; job = next()) await importOne(job.key);
	running = false;
}

const next = () => jobs.find((job) => job.state === "waiting");

async function importOne(key: number) {
	const file = files.get(key);
	files.delete(key);
	if (!file) return;
	current = new AbortController();
	update(key, { state: "opening" });
	const slow = setTimeout(() => update(key, { slow: true }), SLOW_AFTER);
	try {
		const book = await parseEpub(file, {
			onReading: () => update(key, { state: "reading" }),
			signal: current.signal,
		});
		const details = {
			title: book.title,
			author: book.author,
			chapters: book.chapters.length,
			words: book.chapters.reduce((sum, ch) => sum + wordCount(ch.blocks), 0),
			cover: book.coverImage
				? keepUrl(new Blob([book.coverImage.slice()]))
				: undefined,
		};
		const existing = await findBook(book);
		if (existing) {
			held.set(key, book);
			update(key, {
				...details,
				state: "already",
				bookId: existing.id,
				cover: coverUrl(existing.id, existing.coverImage) ?? details.cover,
				percent: (await getProgress(existing.id))?.progressPercent ?? 0,
			});
			return;
		}
		update(key, { ...details, state: "saving" });
		update(key, { state: "added", bookId: await saveBook(book) });
		setLibraryVersion((v) => v + 1);
	} catch (err) {
		if (err instanceof DOMException && err.name === "AbortError")
			update(key, { state: "cancelled" });
		else
			update(key, {
				state: "failed",
				failure: err instanceof ImportError ? err.reason : "damaged",
			});
	} finally {
		clearTimeout(slow);
		current = undefined;
	}
}

function keepUrl(blob: Blob) {
	const url = URL.createObjectURL(blob);
	madeUrls.push(url);
	return url;
}

export function cancelImports() {
	for (const job of jobs)
		if (job.state === "waiting") update(job.key, { state: "cancelled" });
	current?.abort();
}

export async function addCopy(key: number) {
	const book = held.get(key);
	if (!book) return;
	held.delete(key);
	update(key, { state: "saving", percent: undefined });
	update(key, { state: "added", bookId: await saveBook(book) });
	setLibraryVersion((v) => v + 1);
}

export function closeImports() {
	if (jobs.some(busy)) return;
	setOpen(false);
	held.clear();
}

function reset() {
	for (const url of madeUrls.splice(0)) URL.revokeObjectURL(url);
	held.clear();
	setJobs(reconcile([]));
}

// Where the service worker leaves books shared to Anquar (public/share-target.js).
const SHARED_CACHE = "anquar-shared";

export async function importShared() {
	const cache = await caches.open(SHARED_CACHE);
	const shared: File[] = [];
	for (const request of await cache.keys()) {
		const response = await cache.match(request);
		await cache.delete(request);
		if (!response) continue;
		const name = decodeURIComponent(
			response.headers.get("x-file-name") ?? "book.epub",
		);
		shared.push(
			new File([await response.blob()], name, {
				type: response.headers.get("content-type") ?? "",
			}),
		);
	}
	importFiles(shared);
}
