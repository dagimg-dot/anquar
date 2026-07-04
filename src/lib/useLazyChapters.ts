import { createSignal, onCleanup } from "solid-js";
import { getChaptersRange } from "../lib/db.ts";
import type { ChapterData } from "../lib/types.ts";

const BATCH_SIZE = 3;

export function useLazyChapters(getBookId: () => string) {
	const [chapters, setChapters] = createSignal<ChapterData[]>([]);
	const [loading, setLoading] = createSignal(false);
	const [allLoaded, setAllLoaded] = createSignal(false);

	let observer: IntersectionObserver | undefined;

	async function loadNextBatch() {
		const bookId = getBookId();
		if (!bookId || allLoaded()) return;

		setLoading(true);
		const offset = chapters().length;
		const batch = await getChaptersRange(bookId, offset, BATCH_SIZE);

		if (batch.length < BATCH_SIZE) {
			setAllLoaded(true);
		}
		if (batch.length > 0) {
			setChapters((prev) => [...prev, ...batch]);
		}
		setLoading(false);
	}

	function observeSentinel(el: HTMLDivElement | undefined) {
		if (!el) return;

		observer?.disconnect();

		observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && getBookId()) {
					loadNextBatch();
				}
			},
			{ rootMargin: "400px" },
		);

		observer.observe(el);
		onCleanup(() => observer?.disconnect());
	}

	void loadNextBatch();

	return {
		chapters,
		loading,
		allLoaded,
		observeSentinel,
	};
}
