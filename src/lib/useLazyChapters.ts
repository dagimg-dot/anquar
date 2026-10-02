import { type Block, carriesIntoNext } from "anquar-core";
import {
	batch,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import { getChaptersRange } from "./db.ts";

const BATCH_SIZE = 3;

// How far from the edge of what's loaded, in screens, the next chapters start loading.
const LOAD_AHEAD = "200%";

export interface FeedChapter {
	index: number;
	title: string;
	frontMatter: boolean;
	blocks: Block[];
}

// The chapters around where you are reading. A book opens at your chapter, then loads forward as you read and
// back as you scroll up, so a deep place opens as quickly as the first page. The run always starts after a
// chapter that doesn't carry into the next, where paging it alone gives the cards the whole book would.
export function useLazyChapters(getBookId: () => string) {
	const bookId = createMemo(getBookId);
	const [chapters, setChapters] = createSignal<FeedChapter[]>([]);
	const [allLoaded, setAllLoaded] = createSignal(false);

	const first = () => chapters()[0]?.index ?? 0;
	const end = () => {
		const list = chapters();
		return list.length > 0 ? list[list.length - 1].index + 1 : 0;
	};
	const atStart = () => chapters()[0]?.index === 0;

	// Each open starts a new run, and a load still out for an earlier one is dropped when it lands.
	let run = 0;
	let loadingMore: { run: number; done: Promise<void> } | undefined;
	let loadingEarlierFor = -1;

	async function backToStart(id: string, list: FeedChapter[]) {
		let from = list;
		while (from[0].index > 0) {
			const [before] = await getChaptersRange(id, from[0].index - 1, 1);
			if (!before || !carriesIntoNext(before)) break;
			from = [before, ...from];
		}
		return from;
	}

	async function openAt(chapterIndex: number): Promise<void> {
		const id = bookId();
		const mine = ++run;
		const opening = await getChaptersRange(id, chapterIndex, BATCH_SIZE);
		if (mine !== run) return;
		if (opening.length === 0) {
			if (chapterIndex > 0) return openAt(0);
			setAllLoaded(true);
			return;
		}
		const list = await backToStart(id, opening);
		if (mine !== run) return;
		batch(() => {
			setChapters(list);
			setAllLoaded(opening.length < BATCH_SIZE);
		});
	}

	function loadMore(): Promise<void> {
		if (loadingMore?.run === run) return loadingMore.done;
		const mine = run;
		const done = (async () => {
			const id = bookId();
			if (!id || allLoaded() || chapters().length === 0) return;
			const next = await getChaptersRange(id, end(), BATCH_SIZE);
			if (mine !== run) return;
			batch(() => {
				if (next.length < BATCH_SIZE) setAllLoaded(true);
				if (next.length > 0) setChapters((prev) => [...prev, ...next]);
			});
		})().finally(() => {
			if (loadingMore?.done === done) loadingMore = undefined;
		});
		loadingMore = { run: mine, done };
		return done;
	}

	// The chapters before the run, handed back as a commit for the reader to make itself: it has to keep your
	// card on screen as they arrive above it.
	async function fetchEarlier(): Promise<(() => void) | undefined> {
		if (loadingEarlierFor === run || chapters().length === 0 || atStart())
			return;
		const mine = run;
		loadingEarlierFor = mine;
		try {
			const id = bookId();
			const until = first();
			const from = Math.max(0, until - BATCH_SIZE);
			const earlier = await getChaptersRange(id, from, until - from);
			if (earlier.length === 0) return;
			const list = await backToStart(id, earlier);
			if (mine !== run || first() !== until) return;
			return () => setChapters((prev) => [...list, ...prev]);
		} finally {
			if (loadingEarlierFor === mine) loadingEarlierFor = -1;
		}
	}

	// Loads through a chapter: along the run when it is just ahead, otherwise by opening the book there.
	async function reach(chapterIndex: number): Promise<"along" | "opened"> {
		if (chapterIndex >= first() && chapterIndex < end()) return "along";
		if (chapterIndex >= end() && chapterIndex < end() + BATCH_SIZE) {
			while (!allLoaded() && end() <= chapterIndex) {
				const before = end();
				await loadMore();
				if (end() === before) break;
			}
			return "along";
		}
		await openAt(chapterIndex);
		return "opened";
	}

	function watch(
		el: HTMLElement,
		margin: string,
		onNear: () => Promise<boolean>,
	): IntersectionObserver {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				void onNear().then((loaded) => {
					// Still within reach after a load, the observer wouldn't say so again on its own.
					if (!loaded || !el.isConnected) return;
					observer.unobserve(el);
					observer.observe(el);
				});
			},
			{ root: el.closest(".snap-container"), rootMargin: margin },
		);
		observer.observe(el);
		return observer;
	}

	let below: IntersectionObserver | undefined;
	function observeSentinel(el: HTMLDivElement | undefined) {
		below?.disconnect();
		if (!el) return;
		below = watch(el, `0px 0px ${LOAD_AHEAD} 0px`, async () => {
			const before = end();
			await loadMore();
			return end() !== before;
		});
	}

	let above: IntersectionObserver | undefined;
	function observeTop(
		el: HTMLDivElement | undefined,
		place: (commit: () => void) => Promise<void>,
	) {
		above?.disconnect();
		if (!el) return;
		above = watch(el, `${LOAD_AHEAD} 0px 0px 0px`, async () => {
			const commit = await fetchEarlier();
			if (!commit) return false;
			await place(commit);
			return true;
		});
	}

	createEffect(
		on(bookId, () => {
			run++;
			batch(() => {
				setChapters([]);
				setAllLoaded(false);
			});
		}),
	);

	onCleanup(() => {
		below?.disconnect();
		above?.disconnect();
	});

	return {
		chapters,
		allLoaded,
		atStart,
		openAt,
		reach,
		observeSentinel,
		observeTop,
	};
}
