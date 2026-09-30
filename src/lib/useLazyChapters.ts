import type { Block } from "anquar-core";
import {
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import { getChaptersRange } from "./db.ts";

const BATCH_SIZE = 3;

export interface FeedChapter {
	index: number;
	title: string;
	frontMatter: boolean;
	blocks: Block[];
}

export function useLazyChapters(getBookId: () => string) {
	const bookId = createMemo(getBookId);
	const [chapters, setChapters] = createSignal<FeedChapter[]>([]);
	const [loading, setLoading] = createSignal(false);
	const [allLoaded, setAllLoaded] = createSignal(false);

	let observer: IntersectionObserver | undefined;
	let nextOrder = 0;
	let pending: Promise<void> | null = null;

	function loadNextBatch(size = BATCH_SIZE): Promise<void> {
		if (pending) return pending;
		pending = runBatch(size).finally(() => {
			pending = null;
		});
		return pending;
	}

	async function runBatch(size: number) {
		const id = bookId();
		if (!id || allLoaded()) return;

		setLoading(true);
		try {
			const batch = await getChaptersRange(id, nextOrder, size);
			const bookChanged = id !== bookId();
			if (bookChanged) return;
			if (batch.length === 0) {
				setAllLoaded(true);
				return;
			}

			nextOrder = batch[batch.length - 1].index + 1;
			if (batch.length < size) setAllLoaded(true);

			setChapters((prev) => [...prev, ...batch]);
		} finally {
			setLoading(false);
		}
	}

	// Everything up to the chapter comes in one batch, so the book is paged once rather than once per three
	// chapters on the way.
	async function loadUpTo(chapterIndex: number) {
		while (!allLoaded() && nextOrder <= chapterIndex) {
			const before = nextOrder;
			await loadNextBatch(Math.max(BATCH_SIZE, chapterIndex - nextOrder + 1));
			if (nextOrder === before) return;
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

	createEffect(
		on(bookId, (id) => {
			setChapters([]);
			setAllLoaded(false);
			nextOrder = 0;
			const previousBatch = pending ?? Promise.resolve();
			if (id) void previousBatch.then(() => loadNextBatch());
		}),
	);

	onCleanup(() => observer?.disconnect());

	return { chapters, loading, allLoaded, loadUpTo, observeSentinel };
}
