import type { Block } from "anquar-core";
import { chunkBook, DEFAULT_CHUNK_CONFIG } from "anquar-core";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { getChaptersRange } from "./db.ts";

const BATCH_SIZE = 3;

export interface FeedChapter {
	index: number;
	title: string;
	blocks: Block[];
}

export function useLazyChapters(getBookId: () => string) {
	const [chapters, setChapters] = createSignal<FeedChapter[]>([]);
	const [loading, setLoading] = createSignal(false);
	const [allLoaded, setAllLoaded] = createSignal(false);

	let observer: IntersectionObserver | undefined;
	let nextOrder = 0;
	let inFlight = false;

	async function loadNextBatch() {
		const bookId = getBookId();
		if (!bookId || inFlight || allLoaded()) return;

		inFlight = true;
		setLoading(true);
		try {
			// Front matter yields no cards, so keep pulling batches until one
			// carries readable content — otherwise the sentinel never re-fires.
			let ready: FeedChapter[] = [];
			while (ready.length === 0) {
				const batch = await getChaptersRange(bookId, nextOrder, BATCH_SIZE);
				if (batch.length === 0) {
					setAllLoaded(true);
					return;
				}

				nextOrder = batch[batch.length - 1].index + 1;
				if (batch.length < BATCH_SIZE) setAllLoaded(true);

				ready = batch
					.filter((ch) => !ch.frontMatter)
					.map((ch) => ({
						index: ch.index,
						title: ch.title,
						// chunkBook, rather than chunkBlocks, so the chapter gets its
						// heading card under the same de-duplication rule as the CLI.
						blocks: chunkBook(
							{ title: "", author: "", chapters: [ch] },
							DEFAULT_CHUNK_CONFIG,
						),
					}));

				if (allLoaded()) break;
			}

			if (ready.length > 0) setChapters((prev) => [...prev, ...ready]);
		} finally {
			inFlight = false;
			setLoading(false);
		}
	}

	function observeSentinel(el: HTMLDivElement | undefined) {
		if (!el) return;
		observer?.disconnect();
		observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) void loadNextBatch();
			},
			{ rootMargin: "400px" },
		);
		observer.observe(el);
	}

	createEffect(() => {
		const bookId = getBookId();
		setChapters([]);
		setAllLoaded(false);
		nextOrder = 0;
		if (bookId) void loadNextBatch();
	});

	onCleanup(() => observer?.disconnect());

	return { chapters, loading, allLoaded, observeSentinel };
}
