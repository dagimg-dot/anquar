import { createEffect, onCleanup } from "solid-js";

const SETTLE_MS = 120;

/** A trackpad flick keeps emitting deltas long after the gesture is over. */
const COOLDOWN_MS = 260;

interface Metrics {
	origin: number;
	height: number;
	count: number;
}

export function useTikTokScroll(ref: () => HTMLElement | undefined) {
	// An effect, not onMount: the scroll container is behind a <Show> that
	// only resolves once the book has loaded from IndexedDB.
	createEffect(() => {
		const el = ref();
		if (!el) {
			return;
		}

		// Re-bound after the guard so the nested handlers see a non-null element.
		const container = el;
		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

		let isAnimating = false;
		let lockedUntil = 0;
		let settleTimer: ReturnType<typeof setTimeout> | undefined;

		/**
		 * window.innerHeight is not a substitute for a measured card: cards are
		 * sized in dvh, which holds the URL-bar-collapsed height while innerHeight
		 * tracks the bar as it slides. An index times the wrong one lands between
		 * two snap points, and mandatory snapping drags the feed the rest of the
		 * way on its own.
		 */
		function measure(): Metrics | undefined {
			const pages = container.querySelectorAll<HTMLElement>(".snap-page");
			const first = pages[0];
			if (!first) {
				return undefined;
			}

			const rect = first.getBoundingClientRect();
			if (rect.height < 1) {
				return undefined;
			}

			return {
				origin:
					rect.top -
					container.getBoundingClientRect().top +
					container.scrollTop,
				height: rect.height,
				// Counted rather than divided out of scrollHeight, which also spans
				// the lazy-load sentinel and would invent a page past the last card.
				count: pages.length,
			};
		}

		const indexAt = (m: Metrics) =>
			Math.round((container.scrollTop - m.origin) / m.height);

		const topOf = (m: Metrics, index: number) => m.origin + index * m.height;

		function armSettle() {
			clearTimeout(settleTimer);
			settleTimer = setTimeout(() => {
				isAnimating = false;
				lockedUntil = Date.now() + COOLDOWN_MS;
			}, SETTLE_MS);
		}

		/** Lands on an exact snap point, so the browser has nothing to correct. */
		function scrollToPage(m: Metrics, index: number) {
			const top = topOf(m, index);
			if (Math.abs(top - container.scrollTop) < 1) {
				return;
			}

			isAnimating = true;
			container.scrollTo({
				top,
				behavior: reduceMotion.matches ? "auto" : "smooth",
			});
			armSettle();
		}

		// Touch is left to the browser: scroll-snap-stop: always already gives one
		// card per swipe, and a handler only gets to react once that is under way.
		function onWheel(e: WheelEvent) {
			e.preventDefault();

			if (isAnimating || Date.now() < lockedUntil || Math.abs(e.deltaY) < 2) {
				return;
			}

			const m = measure();
			if (!m) {
				return;
			}

			const next = indexAt(m) + (e.deltaY > 0 ? 1 : -1);
			if (next < 0 || next > m.count - 1) {
				return;
			}

			scrollToPage(m, next);
		}

		function onScroll() {
			if (isAnimating) {
				armSettle();
			}
		}

		container.addEventListener("wheel", onWheel, { passive: false });
		container.addEventListener("scroll", onScroll, { passive: true });

		onCleanup(() => {
			clearTimeout(settleTimer);
			container.removeEventListener("wheel", onWheel);
			container.removeEventListener("scroll", onScroll);
		});
	});
}
